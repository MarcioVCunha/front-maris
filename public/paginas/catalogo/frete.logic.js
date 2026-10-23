// Cotação pública shipping-quote e o trecho de entrega do create-order.
// Com shipping_enabled false, ou se a função ainda não existe, a cesta não envia delivery_type.

export const SHIPPING_QUOTE_FUNCTION = "shipping-quote"
export const TERMS_VERSION = "2026-10"
export const FREE_SHIPPING_MIN = 199
export const SHIPPING_UNAVAILABLE_WARNING = "frete indisponível agora"

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "")
}

function roundMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 100) / 100
}

export function formatBrl(value) {
  const number = roundMoney(value)
  const negative = number < 0
  const [whole, cents] = Math.abs(number).toFixed(2).split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${negative ? "-" : ""}R$ ${grouped},${cents}`
}

export function formatCep(value) {
  const digits = digitsOnly(value).slice(0, 8)
  if (digits.length < 6) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function isValidCep(value) {
  return digitsOnly(value).length === 8
}

export function quoteItemsFromCart(lines) {
  return (Array.isArray(lines) ? lines : []).map((line) => {
    const quantity = Number(line?.quantity) || 0
    if (line?.component_id) return { component_id: Number(line.component_id), quantity }
    return { product_code: String(line?.product_code || ""), quantity }
  }).filter((item) => item.quantity > 0 && (item.product_code || item.component_id))
}

export function buildShippingQuoteBody({ cep, items } = {}) {
  return {
    cep: formatCep(cep),
    items: quoteItemsFromCart(items)
  }
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeShippingOption(raw) {
  const deliveryType = String(raw?.delivery_type || "").trim()
  return {
    delivery_type: deliveryType === "retirada" || deliveryType === "envio" ? deliveryType : "",
    service_id: raw?.service_id ?? null,
    service: String(raw?.service || "").trim(),
    price: roundMoney(raw?.price),
    deadline_days: numberOrNull(raw?.deadline_days),
    label: String(raw?.label || "").trim()
  }
}

export function optionKey(option) {
  return `${option?.delivery_type || ""}:${option?.service_id ?? ""}`
}

export function interpretShippingQuote(result) {
  const data = result?.data && typeof result.data === "object" ? result.data : {}
  const status = Number(result?.status) || 0
  if (!result || status === 404 || status === 0) {
    return { kind: "off", shippingEnabled: false, options: [], warning: "" }
  }
  if (status === 400) return { kind: "error", error: data.error || "Informe um CEP válido." }
  if (status === 429) return { kind: "error", error: data.error || "Muitas consultas de frete. Tente de novo." }
  if (!result.ok || data.ok === false) {
    return { kind: "error", error: data.error || "Não foi possível calcular o frete." }
  }
  let options = (Array.isArray(data.options) ? data.options : []).map(normalizeShippingOption)
    .filter((item) => item.delivery_type)
  const warning = String(data.warning || "").trim()
  if (warning.toLowerCase().includes(SHIPPING_UNAVAILABLE_WARNING)) {
    options = options.filter((item) => item.delivery_type === "retirada")
  }
  if (data.shipping_enabled === false) {
    return { kind: "off", shippingEnabled: false, options, warning, merchandiseTotal: numberOrNull(data.merchandise_total) }
  }
  return {
    kind: "ok",
    shippingEnabled: true,
    merchandiseTotal: numberOrNull(data.merchandise_total),
    options,
    warning
  }
}

export function freeShippingHint(merchandise) {
  const value = roundMoney(merchandise)
  const base = "Frete grátis acima de R$199 (opção mais barata)."
  if (value >= FREE_SHIPPING_MIN) return base
  const missing = roundMoney(FREE_SHIPPING_MIN - value)
  return `${base} Faltam ${formatBrl(missing)}.`
}

export function checkoutTotals({ merchandise, freight = 0 } = {}) {
  const goods = roundMoney(merchandise)
  const ship = roundMoney(freight)
  const total = roundMoney(goods + ship)
  return {
    merchandise: goods,
    freight: ship,
    total,
    pix: roundMoney(total * 0.95)
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function optionTitle(option) {
  if (option?.label) return option.label
  if (option?.delivery_type === "retirada") return "Retirada"
  return option?.service || "Envio"
}

export function optionMeta(option) {
  const days = Number(option?.deadline_days)
  const prazo = option?.delivery_type === "retirada"
    ? "Na loja"
    : (Number.isFinite(days) && days > 0 ? `${days} dias` : "")
  const price = Number(option?.price) === 0 ? "Grátis" : formatBrl(option?.price)
  return [prazo, price].filter(Boolean).join(" · ")
}

export function renderShippingOptions(options, selectedKey = "") {
  const rows = Array.isArray(options) ? options : []
  if (!rows.length) return `<p class="cart-help">Informe o CEP para ver o frete.</p>`
  return rows.map((option) => {
    const key = optionKey(option)
    const checked = key === selectedKey ? "checked" : ""
    return `<label class="ship-option">
      <input type="radio" name="ship-option" value="${escapeHtml(key)}" ${checked}>
      <span><strong>${escapeHtml(optionTitle(option))}</strong><small>${escapeHtml(optionMeta(option))}</small></span>
    </label>`
  }).join("")
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim())
}

export function normalizeShipTo(input = {}) {
  const cep = formatCep(input.cep)
  if (!isValidCep(cep)) return { ok: false, error: "Informe um CEP válido." }
  const uf = String(input.uf || "").trim().toUpperCase()
  const rua = String(input.rua || "").trim()
  const numero = String(input.numero || "").trim()
  const bairro = String(input.bairro || "").trim()
  const cidade = String(input.cidade || "").trim()
  const complemento = String(input.complemento || "").trim()
  if (!rua || !numero || !bairro || !cidade) return { ok: false, error: "Complete o endereço de entrega." }
  if (!/^[A-Z]{2}$/.test(uf)) return { ok: false, error: "Informe a UF." }
  const shipTo = { cep, uf, rua, numero, bairro, cidade }
  if (complemento) shipTo.complemento = complemento
  return { ok: true, shipTo }
}

export function buildShippingOrderInput(state = {}) {
  if (!state.enabled) return { ok: true, fields: {} }
  const deliveryType = String(state.deliveryType || "").trim()
  if (deliveryType !== "retirada" && deliveryType !== "envio") {
    return { ok: false, error: "Escolha a entrega." }
  }
  if (state.termsAccepted !== true) return { ok: false, error: "Aceite os termos para continuar." }
  if (deliveryType === "retirada") {
    if (!isEmail(state.email)) return { ok: false, error: "Informe o e-mail." }
    return {
      ok: true,
      fields: {
        deliveryType: "retirada",
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        email: String(state.email || "").trim(),
        shippingPriceSeen: 0
      }
    }
  }
  if (!state.hasLogin) return { ok: false, error: "Envio pede login de cliente.", code: "login" }
  if (digitsOnly(state.cpf).length !== 11) return { ok: false, error: "Cadastre o CPF para enviar.", code: "cpf" }
  if (!digitsOnly(state.whatsapp)) return { ok: false, error: "Cadastre o WhatsApp na sua conta.", code: "whatsapp" }
  const address = normalizeShipTo(state.shipTo || {})
  if (!address.ok) return address
  if (state.serviceId == null || state.serviceId === "") return { ok: false, error: "Escolha o envio." }
  const price = Number(state.priceSeen)
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Confira o frete." }
  return {
    ok: true,
    fields: {
      deliveryType: "envio",
      termsAccepted: true,
      termsVersion: TERMS_VERSION,
      shipTo: address.shipTo,
      shippingServiceId: state.serviceId,
      shippingPriceSeen: roundMoney(price)
    }
  }
}

export function trackingPath(token) {
  const value = String(token || "").trim()
  if (!value) return ""
  return `/pedido/${encodeURIComponent(value)}`
}

export const MarisFrete = {
  SHIPPING_QUOTE_FUNCTION,
  TERMS_VERSION,
  FREE_SHIPPING_MIN,
  formatBrl,
  formatCep,
  isValidCep,
  quoteItemsFromCart,
  buildShippingQuoteBody,
  normalizeShippingOption,
  optionKey,
  interpretShippingQuote,
  freeShippingHint,
  checkoutTotals,
  optionTitle,
  optionMeta,
  renderShippingOptions,
  normalizeShipTo,
  buildShippingOrderInput,
  trackingPath
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisFrete = MarisFrete
}
