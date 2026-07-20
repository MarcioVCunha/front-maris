export function resolvePercentForRow(component, parentPrice, percentFromSavedPrice) {
  if (component?.price_percent != null && Number.isFinite(Number(component.price_percent))) {
    return String(component.price_percent)
  }
  if (component?.unit_price != null && Number(parentPrice) > 0) {
    const derived = percentFromSavedPrice(parentPrice, component.unit_price)
    if (derived.ok) return String(derived.value)
  }
  return ""
}

export function doesProductMatchSearch(product, term) {
  if (!term) return true
  const name = String(product?.name || "").toLowerCase()
  const code = String(product?.code || "").toLowerCase()
  return name.includes(term) || code.includes(term)
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisComponentsLogic = { resolvePercentForRow, doesProductMatchSearch }
}
