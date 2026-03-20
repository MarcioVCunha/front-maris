// Utilidades globais usadas pelas telas da pasta `front/`.
// Mantemos em arquivo único para reduzir duplicidade entre `sales.js` e `catalog.js`.

window.MarisUtils = {
  createSupabaseClient() {
    return window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY)
  },

  // Ordena: produtos com estoque > 0 primeiro; sem estoque no final; e nome em pt-BR.
  sortProductsByStockAndName(products) {
    return [...products].sort((a, b) => {
      const stockA = Number(a.quantity) || 0
      const stockB = Number(b.quantity) || 0

      const outOfStockA = stockA <= 0 ? 1 : 0
      const outOfStockB = stockB <= 0 ? 1 : 0

      if (outOfStockA !== outOfStockB) return outOfStockA - outOfStockB
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")
    })
  },

  roundMoney(value) {
    return Math.round(value * 100) / 100
  },

  formatMoneyBRL(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    })
  }
}

