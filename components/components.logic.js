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

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisComponentsLogic = { resolvePercentForRow }
}
