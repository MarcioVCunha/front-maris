export function parseImageUrlLines(raw) {
  return String(raw || "")
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

/** Aceita "89,90", "1.234,56", "89.90" ou número. */
export function parseMoneyBRL(raw) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : NaN
  }
  let text = String(raw ?? "").trim()
  if (!text) return NaN
  text = text.replace(/[R$\s]/gi, "")
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".")
  }
  const value = Number(text)
  return Number.isFinite(value) ? value : NaN
}

// Valores exatos que add-product aceita. Primeira letra maiúscula, sem acento.
export const ADD_PRODUCT_CATEGORIES = [
  "Brinco",
  "Colar",
  "Pulseira",
  "Choker",
  "Anel",
  "Pingente",
  "Conjunto",
  "Tornozeleira",
  "Piercing",
  "Outros",
]

export function buildAddProductPayload({ code, name, unitPrice, quantity, imageUrlsRaw, categoria }) {
  const imageUrls = parseImageUrlLines(imageUrlsRaw)
  const payload = {
    code: String(code || "").trim(),
    name: String(name || "").trim(),
    unit_price: parseMoneyBRL(unitPrice),
    quantity: Number(quantity),
    image_url: imageUrls[0] || "",
    image_urls: imageUrls,
  }
  const category = String(categoria ?? "").trim()
  if (ADD_PRODUCT_CATEGORIES.includes(category)) payload.categoria = category
  return payload
}

export function validateAddProductPayload(payload) {
  if (!payload.code) return "Informe o código da peça."
  if (!payload.name) return "Informe o nome da peça."
  if (!Number.isFinite(payload.unit_price) || payload.unit_price < 0) {
    return "Informe um preço válido (ex.: 89,90)."
  }
  if (!Number.isInteger(payload.quantity) || payload.quantity < 0) {
    return "Informe uma quantidade inteira válida."
  }
  return ""
}

export function formatAddProductSuccessMessage(payload, data) {
  const code = payload?.code || data?.code || ""
  const name = payload?.name || data?.name || ""
  if (code && name) return `Produto ${code} (${name}) cadastrado com sucesso.`
  if (code) return `Produto ${code} cadastrado com sucesso.`
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim()
  return "Produto cadastrado com sucesso."
}

export function formatAddProductErrorMessage(data, status) {
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data?.error && typeof data.error === "string") return data.error
  if (data?.message && typeof data.message === "string") return data.message
  if (Number.isFinite(status) && status > 0) return `Não foi possível cadastrar (erro HTTP ${status}).`
  return "Não foi possível cadastrar o produto."
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisAddProductLogic = {
    ADD_PRODUCT_CATEGORIES,
    parseImageUrlLines,
    parseMoneyBRL,
    buildAddProductPayload,
    validateAddProductPayload,
    formatAddProductSuccessMessage,
    formatAddProductErrorMessage,
  }
}
