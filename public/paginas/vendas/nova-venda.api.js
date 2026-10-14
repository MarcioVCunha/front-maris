// Chamadas da tela nova de venda, no formato do back-maris (PR #11).
// NEW_SALE_ENABLED continua desligada até essas funções estarem publicadas.

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

export const RECENT_SALES_LIMIT = 20
export const RECENT_SALES_MAX = 50

export function recentSalesLimit(limit = RECENT_SALES_LIMIT) {
  const value = Math.floor(Number(limit))
  if (!Number.isInteger(value) || value < 1) return RECENT_SALES_LIMIT
  return Math.min(value, RECENT_SALES_MAX)
}

function failed(result, fallback) {
  return {
    ok: false,
    error: result?.data?.error || fallback,
    status: result?.status || 0,
    stockIssues: Array.isArray(result?.data?.stock_issues) ? result.data.stock_issues : []
  }
}

/**
 * GET seller-month-summary?seller_id=&month=YYYY-MM
 * Resposta: { ok, month, paid_count, paid_orders_count, charged_total,
 *   commission_percent, commission_amount, sem_comissao }
 * paid_count é o número de peças pagas no mês.
 * paid_orders_count é o número de pedidos com alguma peça paga nesse mês.
 * commission_amount já vem por peça, com o desconto do Pix dividido entre elas.
 * A tela mostra esse valor e não recalcula.
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
 * GET seller-recent-sales?seller_id=&limit=20
 * Cada venda: { id, items, total, paid_at, created_at, customer_name,
 *   customer_whatsapp, payment_method: pix|dinheiro|cartao,
 *   payment_status: paid|partial|receivable,
 *   paid_items_count, items_count }
 * items: { code, name, image_url, quantity, unit_price, paid_at }
 * paid_at do item é null quando a peça ainda está a receber.
 * A lista inclui pedido ainda a receber quando alguma peça dele já foi paga
 * (payment_status partial).
 * limit padrão 20, máximo 50. A tela só lê.
 */
export async function fetchRecentSales({ sellerId, limit = RECENT_SALES_LIMIT }, client) {
  const result = await call(NEW_SALE_API.recentSales, {
    method: "GET",
    query: { seller_id: sellerId, limit: recentSalesLimit(limit) }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar as vendas.")
  const sales = Array.isArray(result.data?.sales) ? result.data.sales : []
  return { ok: true, sales }
}

/**
 * GET sale-piece-search?q=&seller_id=
 * pieces[]: { id, code, name, image_url, quantity, unit_price, preco_pix,
 *   item_type, component_id }
 * id de componente é "c:N". unit_price é o preço efetivo. A tela descarta quantity <= 0.
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
 * GET sale-customer-search?q=
 * customers[]: { id, name, whatsapp }
 * whatsapp é nacional, sem o 55. O link wa.me é que coloca o 55.
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
 * POST sale-customer-save
 * Corpo e resposta: { id, name, whatsapp } com WhatsApp nacional, sem 55.
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
 * POST sale-create
 * Corpo: { seller_id, customer, payment_status, payment_method,
 *   client_request_id, items: [{ piece_id, quantity, product_code|component_id }] }
 * O preço da tela é ignorado. payment_method: pix | dinheiro | cartao.
 * Resposta: { ok, order_id, total, stock_updated, duplicate }
 * 409: { ok: false, error, stock_issues } no mesmo formato da etapa 2.
 */
export async function createSale(body, client) {
  const result = await call(NEW_SALE_API.createSale, {
    method: "POST",
    body
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível registrar a venda.")
  const data = result.data || {}
  return {
    ok: true,
    order: {
      order_id: data.order_id ?? null,
      total: data.total,
      stock_updated: data.stock_updated === true,
      duplicate: data.duplicate === true
    }
  }
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisNovaVendaApi = {
    NEW_SALE_API,
    fetchMonthSummary,
    fetchRecentSales,
    searchPieces,
    searchCustomers,
    saveCustomer,
    createSale,
    recentSalesLimit
  }
}
