// Utilidades globais usadas pelas telas da pasta `front/`.
// Config pública do Supabase (anon key é exposta no browser por design — proteção via RLS).
// Preferir window.__MARIS_ENV__ (env.js gerado no build); fallback = prod para local/dev.
const FALLBACK_SUPABASE_URL = "https://epuvfjdyyzccsuafwopr.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdXZmamR5eXpjY3N1YWZ3b3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTgwMzUsImV4cCI6MjA4OTIzNDAzNX0.DOpM6CRRH54_oLMTghCnGMLq_1aH_5YRGSXNKn_LdB4"

window.ENV = {
  ...(window.__MARIS_ENV__ || {}),
  SUPABASE_URL: (window.__MARIS_ENV__ && window.__MARIS_ENV__.SUPABASE_URL) || FALLBACK_SUPABASE_URL,
  SUPABASE_ANON_KEY:
    (window.__MARIS_ENV__ && window.__MARIS_ENV__.SUPABASE_ANON_KEY) || FALLBACK_SUPABASE_ANON_KEY,
  APP_ENV: (window.__MARIS_ENV__ && window.__MARIS_ENV__.APP_ENV) || "production",
  fn(name) {
    const base = String(this.SUPABASE_URL || "").replace(/\/$/, "")
    return `${base}/functions/v1/${name}`
  },
}

let supabaseClientSingleton = null

window.MarisUtils = {
  // Cliente Supabase memoizado: evita abrir múltiplas conexões/realtime quando
  // a mesma página chama createSupabaseClient mais de uma vez.
  createSupabaseClient() {
    if (supabaseClientSingleton) return supabaseClientSingleton
    supabaseClientSingleton = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
    return supabaseClientSingleton
  },

  onlyDigits(value) {
    return String(value || "").replace(/\D/g, "")
  },

  roundMoney(value) {
    return Math.round(value * 100) / 100
  },

  // Preço final considerando promoção. Aplica desconto somente quando
  // is_on_sale = true E discount_percent > 0; caso contrário, preço cheio.
  // Componente com parent_unit_price + price_percent: um único round (igual à view).
  effectivePrice(row) {
    const parent = Number(row?.parent_unit_price)
    const pricePercent = Number(row?.price_percent)
    if (Number.isFinite(parent) && parent > 0 && Number.isFinite(pricePercent) && pricePercent > 0) {
      const disc = row?.is_on_sale ? Number(row?.discount_percent) || 0 : 0
      const factor = disc > 0 ? 1 - disc / 100 : 1
      return window.MarisUtils.roundMoney((parent * pricePercent) / 100 * factor)
    }
    const base = Number(row?.unit_price) || 0
    const pct = row?.is_on_sale ? Number(row?.discount_percent) || 0 : 0
    if (pct <= 0) return base
    return Math.round(base * (1 - pct / 100) * 100) / 100
  },

  // True quando a linha tem promoção ativa com desconto efetivo.
  hasPromo(row) {
    return Boolean(row?.is_on_sale) && (Number(row?.discount_percent) || 0) > 0
  },

  formatMoneyBRL(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })
  },

  // Preço do componente: % do preço cheio do pai, round 2 casas (igual à view product_components_priced).
  computeComponentPrice(parentPrice, percent) {
    const base = Number(parentPrice)
    const pct = Number(percent)

    if (!Number.isFinite(base) || base <= 0) {
      return { ok: false, error: "Produto sem preço válido para calcular o tipo." }
    }
    if (percent === "" || percent == null || !Number.isFinite(pct)) {
      return { ok: false, error: "Informe a % do preço." }
    }
    if (pct <= 0) {
      return { ok: false, error: "A % deve ser maior que zero." }
    }
    return { ok: true, value: window.MarisUtils.roundMoney((base * pct) / 100) }
  },

  /**
   * Normaliza linha de `product_components_priced` para o shape usado por effectivePrice/hasPromo.
   * Promo sempre do PAI; unit_price = computed_unit_price.
   */
  normalizePricedComponent(row) {
    if (!row) return null
    return {
      id: row.id,
      product_code: row.product_code,
      name: row.name,
      quantity: row.quantity,
      is_active: row.is_active,
      price_percent: Number(row.price_percent) || 0,
      parent_unit_price: Number(row.parent_unit_price) || 0,
      unit_price: Number(row.computed_unit_price) || 0,
      is_on_sale: Boolean(row.parent_is_on_sale),
      discount_percent: Number(row.parent_discount_percent) || 0
    }
  },

  mapPricedComponents(rows) {
    return (rows || []).map((row) => window.MarisUtils.normalizePricedComponent(row)).filter(Boolean)
  },

  // Fallback para linhas antigas sem price_percent (só preenchimento do input ao editar).
  percentFromSavedPrice(parentPrice, unitPrice) {
    const base = Number(parentPrice)
    const saved = Number(unitPrice)
    if (!Number.isFinite(base) || base <= 0) {
      return { ok: false, error: "Produto sem preço válido para calcular o tipo." }
    }
    if (!Number.isFinite(saved) || saved < 0) {
      return { ok: false, error: "Valor salvo inválido." }
    }
    const pct = (saved / base) * 100
    return { ok: true, value: Math.round(pct * 100) / 100 }
  },

  // Parse linhas do formulário de tipos (testável sem DOM).
  parseComponentRows(rawRows, parentPrice) {
    const parsedRows = []

    for (const raw of rawRows || []) {
      const name = String(raw?.name || "").trim()
      if (!name) continue

      const quantity = Number(raw?.quantity)
      if (!Number.isInteger(quantity) || quantity < 0) {
        return { ok: false, error: "Preencha o estoque corretamente (inteiro e >= 0)." }
      }

      const priceResult = window.MarisUtils.computeComponentPrice(parentPrice, raw?.price_percent)
      if (!priceResult.ok) {
        return { ok: false, error: `${name}: ${priceResult.error}` }
      }

      const id = Number(raw?.id)
      parsedRows.push({
        id: Number.isInteger(id) && id > 0 ? id : null,
        name,
        price_percent: Number(raw.price_percent),
        quantity,
        is_active: true
      })
    }

    return { ok: true, rows: parsedRows }
  },

  // Agrupa linhas por uma chave string (ex.: product_code) sem lodash.
  groupByKey(rows, keyFn) {
    const out = Object.create(null)
    for (const row of rows) {
      const key = keyFn(row)
      if (!out[key]) out[key] = []
      out[key].push(row)
    }
    return out
  },

  // Atrasa execução (ex.: busca em tempo real sem re-render a cada tecla).
  debounce(fn, ms) {
    let timer = null
    return (...args) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        fn(...args)
      }, ms)
    }
  }
}

