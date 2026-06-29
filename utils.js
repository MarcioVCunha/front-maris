// Utilidades globais usadas pelas telas da pasta `front/`.
// Mantemos em arquivo único para reduzir duplicidade entre `sales.js` e `catalog.js`.

window.MarisUtils = {
  createSupabaseClient() {
    return window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
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

