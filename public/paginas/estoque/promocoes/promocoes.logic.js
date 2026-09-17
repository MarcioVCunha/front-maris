export function filterProductsForPromo(products, componentsByProductCode, term) {
  const normalized = (term || "").trim().toLowerCase()
  if (!normalized) return products
  return products.filter((product) => {
    if (String(product.name || "").toLowerCase().includes(normalized)) return true
    if (String(product.code || "").toLowerCase().includes(normalized)) return true
    const components = componentsByProductCode[product.code] || []
    return components.some((c) => String(c.name || "").toLowerCase().includes(normalized))
  })
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisPromocoesLogic = { filterProductsForPromo }
}
