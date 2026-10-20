// InfinitePay no carrinho: cria link via Edge Function e interpreta o retorno.

export const PAYMENT_CREATE_LINK_FUNCTION = "payment-create-link"
export const ORDER_STATUS_FUNCTION = "order-status"
export const OBRIGADO_PATH = "/catalog/obrigado"
export const PAYMENT_METHODS = Object.freeze(["pix", "card"])

const STATUS_LABELS = {
  a_confirmar: "A confirmar",
  a_receber: "A receber",
  pago: "Pago",
  cancelado: "Cancelado"
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function statusLabel(status) {
  const key = String(status || "").trim()
  return STATUS_LABELS[key] || (key ? key : "Aguardando")
}

export function buildObrigadoUrl(origin, orderId) {
  const base = String(origin || "").replace(/\/$/, "")
  const id = numberOrNull(orderId)
  if (!base || id == null || id <= 0) return ""
  return `${base}${OBRIGADO_PATH}?order_id=${encodeURIComponent(String(id))}`
}

export function normalizePaymentMethod(value) {
  const key = String(value || "").trim().toLowerCase()
  if (key === "pix") return "pix"
  if (key === "card" || key === "cartao" || key === "cartão") return "card"
  return null
}

export function paymentMethodLabel(method) {
  const key = normalizePaymentMethod(method)
  if (key === "pix") return "Pix"
  if (key === "card") return "Cartão"
  return ""
}

export function buildPaymentCreateLinkBody(input = {}) {
  const orderId = numberOrNull(input.orderId)
  return {
    order_id: orderId != null && orderId > 0 ? orderId : null,
    redirect_url: String(input.redirectUrl || "").trim(),
    payment_method: normalizePaymentMethod(input.paymentMethod)
  }
}

export function validatePaymentCreateLinkBody(body) {
  const orderId = numberOrNull(body?.order_id)
  if (orderId == null || orderId <= 0 || !Number.isInteger(orderId)) {
    return { ok: false, error: "Pedido inválido para pagamento." }
  }
  const method = normalizePaymentMethod(body?.payment_method)
  if (!method) {
    return { ok: false, error: "Escolha Pix ou Cartão para pagar." }
  }
  const redirect = String(body?.redirect_url || "").trim()
  if (!redirect) return { ok: false, error: "Falta a página de retorno do pagamento." }
  try {
    const url = new URL(redirect)
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
      return { ok: false, error: "A página de retorno do pagamento é inválida." }
    }
  } catch {
    return { ok: false, error: "A página de retorno do pagamento é inválida." }
  }
  const forbiddenPriceKeys = ["cos" + "to", "cost", "unit_price", "line_total"]
  for (const key of forbiddenPriceKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      return { ok: false, error: "O preço do pagamento não sai da tela." }
    }
  }
  return { ok: true }
}

export function checkoutUrlFromData(data) {
  const raw = data?.checkout_url || data?.payment_url || data?.url || ""
  const url = String(raw || "").trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function interpretPaymentCreateLinkResponse(result) {
  const data = result?.data && typeof result.data === "object" ? result.data : {}
  if (!result?.ok || data.ok === false) {
    return { kind: "error", error: data.error || "Não foi possível abrir o pagamento." }
  }
  const checkoutUrl = checkoutUrlFromData(data)
  if (!checkoutUrl) return { kind: "error", error: "O link de pagamento não voltou." }
  return {
    kind: "ready",
    checkoutUrl,
    orderId: numberOrNull(data.order_id)
  }
}

export async function submitPaymentCreateLink(callFunction, input = {}) {
  const body = buildPaymentCreateLinkBody(input)
  const validation = validatePaymentCreateLinkBody(body)
  if (!validation.ok) return { kind: "error", error: validation.error }
  if (typeof callFunction !== "function") {
    return { kind: "error", error: "Não foi possível abrir o pagamento." }
  }
  const payload = {
    order_id: body.order_id,
    redirect_url: body.redirect_url,
    payment_method: normalizePaymentMethod(body.payment_method)
  }
  const result = await callFunction(PAYMENT_CREATE_LINK_FUNCTION, payload)
  return interpretPaymentCreateLinkResponse(result)
}

export function parseObrigadoQuery(search) {
  const params = new URLSearchParams(typeof search === "string" ? search : "")
  const orderId = numberOrNull(params.get("order_id") || params.get("order_nsu"))
  const receiptUrl = String(params.get("receipt_url") || "").trim() || null
  const slug = String(params.get("slug") || "").trim() || null
  const captureMethod = String(params.get("capture_method") || "").trim() || null
  const transactionNsu = String(params.get("transaction_nsu") || "").trim() || null
  return { orderId, receiptUrl, slug, captureMethod, transactionNsu }
}

export function inferStatusFromReturn(query) {
  if (query?.transactionNsu) return "pago"
  if (query?.orderId) return "a_confirmar"
  return ""
}

export function interpretOrderStatusResponse(result) {
  const data = result?.data && typeof result.data === "object" ? result.data : {}
  if (!result?.ok || data.ok === false) {
    return { kind: "error", error: data.error || "Não foi possível consultar o pedido." }
  }
  const orderId = numberOrNull(data.order_id)
  const status = String(data.status || "").trim()
  if (orderId == null && !status) {
    return { kind: "error", error: "O status do pedido não voltou." }
  }
  return {
    kind: "ok",
    orderId,
    status,
    statusLabel: statusLabel(status),
    total: numberOrNull(data.total),
    totalPix: numberOrNull(data.total_pix),
    reservedUntil: data.reserved_until || null
  }
}

export async function submitOrderStatus(callFunction, orderId) {
  const id = numberOrNull(orderId)
  if (id == null || id <= 0 || !Number.isInteger(id)) {
    return { kind: "error", error: "Pedido inválido." }
  }
  if (typeof callFunction !== "function") {
    return { kind: "error", error: "Não foi possível consultar o pedido." }
  }
  const result = await callFunction(ORDER_STATUS_FUNCTION, { order_id: id })
  return interpretOrderStatusResponse(result)
}

export function buildOrderWhatsappMessage(order) {
  const id = order?.orderId != null ? `#${order.orderId}` : ""
  const total = order?.total != null
    ? `Total: R$ ${Number(order.total).toFixed(2).replace(".", ",")}`
    : ""
  const pix = order?.totalPix != null
    ? `Pix: R$ ${Number(order.totalPix).toFixed(2).replace(".", ",")}`
    : ""
  const lines = (Array.isArray(order?.items) ? order.items : [])
    .slice(0, 12)
    .map((item) => {
      const name = String(item?.name || item?.code || "Peça").trim()
      const qty = Number(item?.quantity) || 0
      return `• ${name} x${qty}`
    })
  return [
    `Oi! Fiz o pedido ${id} no site e quero combinar o pagamento.`.trim(),
    total,
    pix,
    lines.length ? "Itens:" : "",
    ...lines
  ].filter(Boolean).join("\n")
}

export const MarisPagamento = {
  PAYMENT_CREATE_LINK_FUNCTION,
  ORDER_STATUS_FUNCTION,
  OBRIGADO_PATH,
  PAYMENT_METHODS,
  statusLabel,
  buildObrigadoUrl,
  normalizePaymentMethod,
  paymentMethodLabel,
  buildPaymentCreateLinkBody,
  validatePaymentCreateLinkBody,
  checkoutUrlFromData,
  interpretPaymentCreateLinkResponse,
  submitPaymentCreateLink,
  parseObrigadoQuery,
  inferStatusFromReturn,
  interpretOrderStatusResponse,
  submitOrderStatus,
  buildOrderWhatsappMessage
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisPagamento = MarisPagamento
}
