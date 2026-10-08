// Único lugar que chama as Edge Functions da equipe para vendas, vendedoras
// e tipos de produto. Todas usam auth: "staff".
//
// Contrato das funções em back-maris/supabase/functions.
//
// list-sales
//   GET ?status=active|cancelled&paid=unpaid|paid|all
//   paid=unpaid inclui is_paid false e null.
//   200 { sales: [...] } com: id, created_at, paid_at, product_code, product_name,
//   quantity, payment_method, total_value, seller_name, sale_item_type,
//   parent_product_code, is_paid, status.
//
// mark-sales-paid
//   POST { sale_ids: number[] }
//   Equivale a update sales set is_paid = true where id in (...).
//   200 { ok: true }. Erro: status HTTP de erro ou { ok: false, error }.
//
// list-sellers
//   GET (vendedoras ativas)
//   200 { sellers: [{ id, name }] }
//
// list-product-components
//   GET
//   200 { components: [{ id, product_code, name, price_percent, quantity, is_active }] }
//
// save-product-components
//   POST { product_code, components: [{ id?, name, price_percent, quantity, is_active }] }
//   O conjunto enviado é o estado final daquele produto: atualiza os ids,
//   insere os sem id e remove os tipos do produto que ficaram de fora.
//   200 { ok: true }.

const FUNCTIONS = {
  listSales: "list-sales",
  markSalesPaid: "mark-sales-paid",
  listSellers: "list-sellers",
  listProductComponents: "list-product-components",
  saveProductComponents: "save-product-components"
}

function buildFunctionUrl(name, params) {
  const base = window.ENV.fn(name)
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${base}?${qs}` : base
}

function salesQuery(mode) {
  if (mode === "cancelled") return { status: "cancelled" }
  if (mode === "paid") return { status: "active", paid: "paid" }
  if (mode === "all") return { status: "active", paid: "all" }
  return { status: "active", paid: "unpaid" }
}

function rowsFrom(data, key) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data[key])) return data[key]
  return []
}

function timeMs(value) {
  const t = Date.parse(value || "")
  return Number.isNaN(t) ? 0 : t
}

function isCancelledSale(row) {
  return String(row?.status || "active") === "cancelled"
}

function isPaidSale(row) {
  return row?.is_paid === true
}

function filterSales(rows, mode) {
  return rows.filter((row) => {
    if (mode === "cancelled") return isCancelledSale(row)
    if (isCancelledSale(row)) return false
    if (mode === "paid") return isPaidSale(row)
    if (mode === "all") return true
    return !isPaidSale(row)
  })
}

function sortSales(rows, mode) {
  return [...rows].sort((a, b) => {
    if (mode === "paid") {
      const pa = a?.paid_at ? timeMs(a.paid_at) : -Infinity
      const pb = b?.paid_at ? timeMs(b.paid_at) : -Infinity
      if (pa !== pb) return pb - pa
    }
    return timeMs(b?.created_at) - timeMs(a?.created_at)
  })
}

function sortByName(rows) {
  return [...rows].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR")
  )
}

function errorResult(message, status) {
  return { data: null, error: { message: message || "Erro ao falar com o servidor.", status } }
}

async function staffCall(name, options) {
  const { method = "GET", body, query, write = false } = options || {}
  try {
    const url = query ? buildFunctionUrl(name, query) : window.ENV.fn(name)
    const { ok, status, data } = await window.MarisApi.callFunction(url, {
      method,
      body,
      auth: "staff"
    })
    if (!ok) return errorResult(data?.error || `Erro ${status}`, status)
    if (write && data && (data.ok === false || (data.error && data.ok !== true))) {
      return errorResult(data.error || `Erro ${status}`, status)
    }
    return { data: data || {}, error: null }
  } catch (e) {
    return errorResult(e?.message || "Erro de conexão.")
  }
}

window.MarisStaffData = {
  FUNCTIONS,

  async listSales(mode) {
    const result = await staffCall(FUNCTIONS.listSales, {
      method: "GET",
      query: salesQuery(mode)
    })
    if (result.error) return result
    const rows = sortSales(filterSales(rowsFrom(result.data, "sales"), mode), mode)
    return { data: rows, error: null }
  },

  async markSalesPaid(saleIds) {
    const ids = [...new Set((saleIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
    if (!ids.length) return errorResult("Nenhuma venda selecionada.")
    return staffCall(FUNCTIONS.markSalesPaid, {
      method: "POST",
      body: { sale_ids: ids },
      write: true
    })
  },

  async listActiveSellers() {
    const result = await staffCall(FUNCTIONS.listSellers, { method: "GET" })
    if (result.error) return result
    const sellers = rowsFrom(result.data, "sellers").filter((seller) => seller?.is_active !== false)
    return { data: sortByName(sellers), error: null }
  },

  async listProductComponents() {
    const result = await staffCall(FUNCTIONS.listProductComponents, { method: "GET" })
    if (result.error) return result
    return { data: sortByName(rowsFrom(result.data, "components")), error: null }
  },

  async saveProductComponents(productCode, components) {
    const code = String(productCode || "").trim()
    if (!code) return errorResult("Produto inválido.")
    const payload = (components || []).map((row) => {
      const item = {
        name: row.name,
        price_percent: row.price_percent,
        quantity: row.quantity,
        is_active: row.is_active !== false
      }
      const id = Number(row.id)
      if (Number.isInteger(id) && id > 0) item.id = id
      return item
    })
    return staffCall(FUNCTIONS.saveProductComponents, {
      method: "POST",
      body: { product_code: code, components: payload },
      write: true
    })
  }
}
