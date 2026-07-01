// Utilidades globais usadas pelas telas da pasta `front/`.
// Mantemos em arquivo único para reduzir duplicidade entre `sales.js` e `catalog.js`.

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
  effectivePrice(row) {
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

  // Preço do componente: % do preço cheio do produto pai, arredondado para cima (reais inteiros).
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
    return { ok: true, value: Math.ceil((base * pct) / 100) }
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
        unit_price: priceResult.value,
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

