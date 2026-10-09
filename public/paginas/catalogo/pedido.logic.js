// Chamada pública de criação do pedido (proposta create-order).
// A flag fica desligada até o Backend existir. Com ela desligada, a cesta não chama nada daqui.

export const CREATE_ORDER_FUNCTION = "create-order"
export const RESERVE_DAYS = 7
export const MAX_ORDER_ITEMS = 30
export const MAX_UNITS_PER_LINE = 10
export const MAX_CUSTOMER_NAME = 80

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "")
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function normalizeWhatsapp(value) {
  return digitsOnly(value)
}

// Mesma regra de normalizeBrazilWhatsapp: 10 ou 11 dígitos, ou 55 seguido deles.
export function isBrazilWhatsapp(value) {
  const digits = normalizeWhatsapp(value)
  return /^55\d{10,11}$/.test(digits) || /^\d{10,11}$/.test(digits)
}

export function newClientRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === "x" ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function orderItemsFromCart(lines) {
  return (Array.isArray(lines) ? lines : []).map((line) => {
    const quantity = Number(line?.quantity) || 0
    if (line?.component_id) return { component_id: Number(line.component_id), quantity }
    return { product_code: String(line?.product_code || ""), quantity }
  })
}

export function buildCreateOrderBody(input = {}) {
  const seller = Number(input.sellerId)
  return {
    client_request_id: String(input.clientRequestId || ""),
    customer: {
      name: String(input.name || "").trim(),
      whatsapp: normalizeWhatsapp(input.whatsapp)
    },
    seller_id: Number.isInteger(seller) && seller > 0 ? seller : null,
    items: orderItemsFromCart(input.items),
    dry_run: Boolean(input.dryRun),
    website: String(input.website || "")
  }
}

export function validateCreateOrderBody(body) {
  const name = String(body?.customer?.name || "").trim()
  if (!name) return { ok: false, error: "Informe o nome." }
  if (name.length > MAX_CUSTOMER_NAME) return { ok: false, error: "O nome pode ter no máximo 80 caracteres." }
  if (!isBrazilWhatsapp(body?.customer?.whatsapp)) {
    return { ok: false, error: "Informe um WhatsApp do Brasil, com DDD." }
  }
  if (String(body?.website || "").trim()) return { ok: false, error: "Não foi possível enviar o pedido." }
  const items = Array.isArray(body?.items) ? body.items : []
  if (!items.length) return { ok: false, error: "Sua cesta está vazia." }
  if (items.length > MAX_ORDER_ITEMS) return { ok: false, error: "A cesta pode ter no máximo 30 peças." }
  for (const item of items) {
    const quantity = Number(item?.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_UNITS_PER_LINE) {
      return { ok: false, error: "Cada peça pode ter no máximo 10 unidades." }
    }
    const hasProduct = Boolean(String(item?.product_code || "").trim())
    const hasComponent = item?.component_id != null && item.component_id !== ""
    if (hasProduct === hasComponent) return { ok: false, error: "Há um item inválido na cesta." }
    if (Object.prototype.hasOwnProperty.call(item, "unit_price")) {
      return { ok: false, error: "O preço do pedido não sai da tela." }
    }
  }
  if (!String(body?.client_request_id || "").trim()) return { ok: false, error: "Não foi possível identificar o envio." }
  return { ok: true }
}

export function orderFromResponse(data) {
  const items = (Array.isArray(data?.items) ? data.items : []).map((item) => ({
    code: String(item?.code ?? item?.product_code ?? ""),
    name: String(item?.name ?? item?.product_name ?? ""),
    quantity: Number(item?.quantity) || 0,
    unitPrice: numberOrNull(item?.unit_price),
    lineTotal: numberOrNull(item?.line_total)
  }))
  const subtotal = numberOrNull(data?.subtotal)
  const total = numberOrNull(data?.total)
  return {
    orderId: data?.order_id ?? null,
    status: String(data?.status || ""),
    subtotal,
    total: total != null ? total : subtotal,
    totalPix: numberOrNull(data?.total_pix),
    reservedUntil: data?.reserved_until || null,
    items
  }
}

export function reservationText(reservedUntil) {
  if (!reservedUntil) return ""
  const date = new Date(reservedUntil)
  if (Number.isNaN(date.getTime())) return ""
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date)
  return `Sua peça fica reservada até ${formatted}`
}

export function stockIssueText(issue) {
  const name = String(issue?.name || issue?.product_name || issue?.code || issue?.product_code || "Peça")
  const available = Number(issue?.available)
  const availableLabel = Number.isFinite(available) ? String(available) : "0"
  if (issue?.reason === "insufficient") {
    return `${name} não tem essa quantidade. Disponível: ${availableLabel}.`
  }
  if (issue?.reason === "out_of_stock") {
    return `${name} acabou de esgotar. Disponível: ${availableLabel}.`
  }
  return `${name} não está mais disponível. Disponível: ${availableLabel}.`
}

export function cartKeysForStockIssues(lines, issues) {
  const wanted = new Set()
  for (const issue of issues || []) {
    const code = String(issue?.code || issue?.product_code || "").trim()
    if (code) wanted.add(code)
    const componentId = Number(issue?.component_id)
    if (Number.isInteger(componentId) && componentId > 0) wanted.add(`COMP-${componentId}`)
  }
  const keys = []
  for (const line of lines || []) {
    const key = line?.key || (line?.component_id ? `c-${line.component_id}` : `p-${line.product_code}`)
    const codes = []
    if (line?.product_code) codes.push(String(line.product_code))
    if (line?.code) codes.push(String(line.code))
    if (line?.component_id) codes.push(`COMP-${line.component_id}`)
    if (codes.some((code) => wanted.has(code))) keys.push(String(key))
  }
  return [...new Set(keys)]
}

export function interpretCreateOrderResponse(result, options = {}) {
  const data = result?.data && typeof result.data === "object" ? result.data : {}
  const issues = Array.isArray(data.stock_issues) ? data.stock_issues : []
  if (result?.status === 409 || issues.length) {
    return {
      kind: "stock",
      error: data.error || "Algumas peças esgotaram.",
      stockIssues: issues
    }
  }
  if (!result?.ok || data.ok === false) {
    return { kind: "error", error: data.error || "Não foi possível fazer o pedido." }
  }
  if (options.dryRun) return { kind: "available" }
  if (data.order_id == null) return { kind: "error", error: "O pedido não voltou com número." }
  return { kind: "confirmed", order: orderFromResponse(data) }
}

export async function submitCreateOrder(callFunction, input, options = {}) {
  const enabled = options.enabled ?? MarisPedido.ORDERS_ENABLED
  if (!enabled) return { kind: "disabled" }
  const body = buildCreateOrderBody(input || {})
  const validation = validateCreateOrderBody(body)
  if (!validation.ok) return { kind: "error", error: validation.error }
  if (typeof callFunction !== "function") return { kind: "error", error: "Não foi possível fazer o pedido." }
  const result = await callFunction(CREATE_ORDER_FUNCTION, body)
  return interpretCreateOrderResponse(result, { dryRun: body.dry_run })
}

export const MarisPedido = {
  ORDERS_ENABLED: false,
  CREATE_ORDER_FUNCTION,
  RESERVE_DAYS,
  MAX_ORDER_ITEMS,
  MAX_UNITS_PER_LINE,
  MAX_CUSTOMER_NAME,
  normalizeWhatsapp,
  isBrazilWhatsapp,
  newClientRequestId,
  orderItemsFromCart,
  buildCreateOrderBody,
  validateCreateOrderBody,
  orderFromResponse,
  reservationText,
  stockIssueText,
  cartKeysForStockIssues,
  interpretCreateOrderResponse,
  submitCreateOrder
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisPedido = MarisPedido
}
