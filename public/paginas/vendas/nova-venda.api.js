// Chamadas da tela de venda, no formato do back-maris (PR #11).

export const NEW_SALE_API = {
  monthSummary: "seller-month-summary",
  recentSales: "seller-recent-sales",
  searchPieces: "sale-piece-search",
  searchCustomers: "sale-customer-search",
  saveCustomer: "sale-customer-save",
  createSale: "sale-create",
  /** Contrato assumido em docs/contratos/venda-marketplace.md — ainda não no ar. */
  registerMarketplaceOrder: "register-marketplace-order",
  cancelMarketplaceOrder: "cancel-marketplace-order"
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

export function messageForSaleError(status, error) {
  const text = String(error || "").trim()
  if (status === 401) return "Entre de novo para ver suas vendas."
  if (status === 403) return text || "Você só vê as próprias vendas."
  if (status === 400 && (!text || /vendedora|seller/i.test(text))) {
    return "Esta conta não está ligada a uma vendedora."
  }
  return text
}

function failed(result, fallback) {
  const status = result?.status || 0
  const raw = result?.data?.error || ""
  return {
    ok: false,
    error: messageForSaleError(status, raw) || fallback,
    status,
    stockIssues: Array.isArray(result?.data?.stock_issues) ? result.data.stock_issues : []
  }
}

/**
 * GET seller-month-summary?seller_id=&month=YYYY-MM
 * Resposta: { ok, month, timezone, paid_count, paid_orders_count, sem_comissao,
 *   charged_total, commission_amount, commission_percent }
 * paid_count é o número de peças. paid_orders_count é o de pedidos com alguma
 * peça paga no mês. timezone é America/Sao_Paulo.
 * A tela mostra commission_amount e não recalcula.
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
 * GET sale-piece-search?q=
 * pieces[]: { id (número ou "c:N"), code, name, quantity, image_url,
 *   item_type: product|component, preco_pix, unit_price, component_id, preco_efetivo }
 * quantity é o estoque. unit_price e preco_efetivo são o preço efetivo.
 * A tela mostra o Pix de preco_pix e descarta quantity <= 0.
 */
export async function searchPieces({ query }, client) {
  const result = await call(NEW_SALE_API.searchPieces, {
    method: "GET",
    query: { q: query }
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
 * Corpo: { name, whatsapp } com WhatsApp formatado, como "(11) 98888-7777".
 * Resposta: { ok, customer: { id, name, whatsapp } }
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
 * Corpo: { seller_id, payment_status: paid|receivable, payment_method,
 *   customer: { id } ou { name, whatsapp },
 *   items: [{ piece_id, quantity }], client_request_id }
 * piece_id é número, "c:N" ou o código. Não manda preço.
 * client_request_id é um UUID por tentativa; a mesma tentativa reusa a chave.
 * Resposta: { ok, order_id, total, subtotal, total_pix, items, customer,
 *   paid_at, created_at, duplicate, stock_updated, payment_method, payment_status }
 * O total mostrado é o total do servidor. duplicate true é a mesma venda.
 * 401 sem login. 403 { error: "Você só vê as próprias vendas." }.
 * 400 sem vendedora vira um aviso. 400 de validação mostra o erro.
 * 409: { ok: false, error: "Algumas peças esgotaram.", stock_issues }
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
      subtotal: data.subtotal,
      total_pix: data.total_pix,
      items: Array.isArray(data.items) ? data.items : [],
      customer: data.customer ?? null,
      paid_at: data.paid_at ?? null,
      created_at: data.created_at ?? null,
      duplicate: data.duplicate === true,
      stock_updated: data.stock_updated === true,
      payment_method: data.payment_method ?? null,
      payment_status: data.payment_status ?? null
    }
  }
}

/**
 * POST register-marketplace-order (ainda não no ar)
 * Corpo: { marketplace, payment_status, payment_method, items, client_request_id?,
 *   external_order_id?, customer? } — sem seller_id. Ver contrato.
 */
export async function registerMarketplaceOrder(body, client) {
  const result = await call(NEW_SALE_API.registerMarketplaceOrder, {
    method: "POST",
    body
  }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível registrar a venda do marketplace.")
  }
  const data = result.data || {}
  return {
    ok: true,
    order: {
      order_id: data.order_id ?? null,
      sale_ids: Array.isArray(data.sale_ids) ? data.sale_ids : [],
      channel: "marketplace",
      marketplace: data.marketplace ?? body?.marketplace ?? null,
      total: data.total,
      subtotal: data.subtotal,
      total_pix: data.total_pix,
      items: Array.isArray(data.items) ? data.items : [],
      customer: data.customer ?? null,
      paid_at: data.paid_at ?? null,
      created_at: data.created_at ?? null,
      duplicate: data.duplicate === true,
      stock_updated: data.stock_updated === true,
      payment_method: data.payment_method ?? null,
      payment_status: data.payment_status ?? null,
      commission_amount: 0,
      sem_comissao: true
    }
  }
}

/**
 * POST cancel-marketplace-order (ainda não no ar)
 * Corpo preferido: { order_id }. Devolve peças ao estoque.
 */
export async function cancelMarketplaceOrder(body, client) {
  const result = await call(NEW_SALE_API.cancelMarketplaceOrder, {
    method: "POST",
    body
  }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível cancelar a venda.")
  }
  return { ok: true, stockRestored: result.data?.stock_restored !== false }
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
    registerMarketplaceOrder,
    cancelMarketplaceOrder,
    recentSalesLimit,
    messageForSaleError
  }
}
