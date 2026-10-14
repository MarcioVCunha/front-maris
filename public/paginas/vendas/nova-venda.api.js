// Chamadas da tela nova de venda. O contrato do Backend ainda não está fechado.
// Os nomes e os corpos abaixo são o formato que a tela espera. Não ligar
// NEW_SALE_ENABLED antes de o Backend publicar essas funções.

export const NEW_SALE_API = {
  monthSummary: "seller-month-summary",
  recentSales: "seller-recent-sales",
  searchPieces: "sale-piece-search",
  searchCustomers: "sale-customer-search",
  saveCustomer: "sale-customer-save",
  createSale: "sale-create"
}

function withQuery(url, query) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `${url}?${text}` : url
}

async function defaultCall(name, options) {
  const base = window.ENV.fn(name)
  const url = options.query ? withQuery(base, options.query) : base
  return window.MarisApi.callFunction(url, {
    method: options.method || "GET",
    body: options.body,
    auth: "staff"
  })
}

async function call(name, options, client) {
  const transport = client?.call || defaultCall
  return transport(name, options)
}

function failed(result, fallback) {
  return { ok: false, error: result?.data?.error || fallback, status: result?.status || 0 }
}

/**
 * TODO(backend): GET seller-month-summary?seller_id=&month=YYYY-MM
 * Resposta: { ok: true, charged_total: number, paid_count: number }
 * charged_total soma só vendas pagas, pela data de pagamento (paid_at), no mês.
 * A comissão de 30% é desta tela. Marcio e Marineide ficam com comissão zero.
 * Se a função devolver { sales: [...] } em vez do total, a tela soma as pagas do mês.
 */
export async function fetchMonthSummary({ sellerId, month }, client) {
  const result = await call(NEW_SALE_API.monthSummary, {
    method: "GET",
    query: { seller_id: sellerId, month }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar o mês.")
  return { ok: true, data: result.data || {} }
}

/**
 * TODO(backend): GET seller-recent-sales?seller_id=&limit=20
 * Resposta: { ok: true, sales: [{ id, created_at, customer_name, total,
 *   payment_method, payment_status, paid_at }] }
 * Só as vendas dessa vendedora. A tela não oferece editar nem cancelar.
 */
export async function fetchRecentSales({ sellerId, limit = 20 }, client) {
  const result = await call(NEW_SALE_API.recentSales, {
    method: "GET",
    query: { seller_id: sellerId, limit }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar as vendas.")
  const sales = Array.isArray(result.data?.sales) ? result.data.sales : []
  return { ok: true, sales }
}

/**
 * TODO(backend): GET sale-piece-search?q=&seller_id=
 * Resposta: { ok: true, pieces: [{ id, code, name, image_url, unit_price, quantity }] }
 * Só peças com estoque. A tela descarta quantity <= 0 de novo.
 */
export async function searchPieces({ sellerId, query }, client) {
  const result = await call(NEW_SALE_API.searchPieces, {
    method: "GET",
    query: { seller_id: sellerId, q: query }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível buscar as peças.")
  const pieces = Array.isArray(result.data?.pieces) ? result.data.pieces : []
  return { ok: true, pieces }
}

/**
 * TODO(backend): GET sale-customer-search?q=
 * Resposta: { ok: true, customers: [{ id, name, whatsapp }] }
 */
export async function searchCustomers({ query }, client) {
  const result = await call(NEW_SALE_API.searchCustomers, {
    method: "GET",
    query: { q: query }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível buscar clientes.")
  const customers = Array.isArray(result.data?.customers) ? result.data.customers : []
  return { ok: true, customers }
}

/**
 * TODO(backend): POST sale-customer-save
 * Corpo: { name, whatsapp }
 * Resposta: { ok: true, customer: { id, name, whatsapp } }
 */
export async function saveCustomer({ name, whatsapp }, client) {
  const result = await call(NEW_SALE_API.saveCustomer, {
    method: "POST",
    body: { name, whatsapp }
  }, client)
  if (!result?.ok || result.data?.ok === false || !result.data?.customer) {
    return failed(result, "Não foi possível cadastrar a cliente.")
  }
  return { ok: true, customer: result.data.customer }
}

/**
 * TODO(backend): POST sale-create
 * Corpo: { seller_id, customer: { id } | { name, whatsapp },
 *   payment_status: "paid" | "receivable",
 *   payment_method: "pix" | "dinheiro" | "cartao",
 *   items: [{ piece_id, quantity }] }
 * Sem preço da tela. Uma venda vira um pedido. O estoque baixa no servidor.
 * Resposta: { ok: true, order_id, total, stock_updated: true }
 */
export async function createSale(body, client) {
  const result = await call(NEW_SALE_API.createSale, {
    method: "POST",
    body
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível registrar a venda.")
  return { ok: true, order: result.data || {} }
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisNovaVendaApi = {
    NEW_SALE_API,
    fetchMonthSummary,
    fetchRecentSales,
    searchPieces,
    searchCustomers,
    saveCustomer,
    createSale
  }
}
