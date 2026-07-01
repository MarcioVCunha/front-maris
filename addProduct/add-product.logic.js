export function parseImageUrlLines(raw) {
  return String(raw || "")
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

export function buildAddProductPayload({ code, name, unitPrice, quantity, imageUrlsRaw }) {
  const imageUrls = parseImageUrlLines(imageUrlsRaw)
  return {
    code: String(code || "").trim(),
    name: String(name || "").trim(),
    unit_price: Number(unitPrice),
    quantity: Number(quantity),
    image_url: imageUrls[0] || "",
    image_urls: imageUrls,
  }
}

export function validateAddProductPayload(payload) {
  if (!payload.code) return "Informe o código da peça."
  if (!payload.name) return "Informe o nome da peça."
  if (!Number.isFinite(payload.unit_price) || payload.unit_price < 0) {
    return "Informe um preço válido."
  }
  if (!Number.isInteger(payload.quantity) || payload.quantity < 0) {
    return "Informe uma quantidade inteira válida."
  }
  return ""
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisAddProductLogic = {
    parseImageUrlLines,
    buildAddProductPayload,
    validateAddProductPayload,
  }
}
