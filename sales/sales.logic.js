export function doesProductMatchSearch(product, term) {
  if (!term) return true
  const name = String(product?.name || "").toLowerCase()
  const code = String(product?.code || "").toLowerCase()
  return name.includes(term) || code.includes(term)
}

export function getClampedSelectedQuantity(raw, stockQuantity) {
  let selectedQty = Number(raw)
  if (!Number.isFinite(selectedQty) || selectedQty < 0) selectedQty = 0
  if (!Number.isInteger(selectedQty)) selectedQty = 0

  const stock = Number(stockQuantity) || 0
  if (stock <= 0) selectedQty = 0
  selectedQty = Math.min(selectedQty, stock)

  return selectedQty
}

export function buildQtyOptions(stockQuantity, selectedQty) {
  const quantity = Math.max(Number(stockQuantity) || 0, 0)
  const options = Array.from({ length: quantity + 1 }, (_, i) => i)
  return options
    .map((q) => {
      const label = q === 0 ? "0" : String(q)
      const isSelected = q === selectedQty
      return `<option value="${q}" ${isSelected ? "selected" : ""}>${label}</option>`
    })
    .join("")
}

export function isSalesProductShowable(product, components) {
  if (components.length > 0) {
    return components.some((c) => (Number(c.quantity) || 0) > 0)
  }
  return (Number(product.quantity) || 0) > 0
}

export function sortSalesProductsByName(products) {
  return [...products].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")
  )
}

export function computeSaleTotals({
  selectedItems,
  selectedComponentItems,
  productsByCode,
  componentsById,
  paymentMethod,
  effectivePrice,
  roundMoney,
}) {
  const productsSubtotal = selectedItems.reduce((acc, item) => {
    const product = productsByCode[item.code]
    const unitPrice = effectivePrice(product)
    return acc + unitPrice * item.quantity
  }, 0)
  const componentsSubtotal = selectedComponentItems.reduce((acc, item) => {
    const component = componentsById[item.component_id]
    const unitPrice = effectivePrice(component)
    return acc + unitPrice * item.quantity
  }, 0)
  const subtotal = productsSubtotal + componentsSubtotal

  const roundedSubtotal = roundMoney(subtotal)
  const discount = paymentMethod === "pix" ? roundMoney(roundedSubtotal * 0.05) : 0
  const total = roundMoney(roundedSubtotal - discount)

  return { subtotal: roundedSubtotal, discount, total }
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisSalesLogic = {
    doesProductMatchSearch,
    getClampedSelectedQuantity,
    buildQtyOptions,
    isSalesProductShowable,
    sortSalesProductsByName,
    computeSaleTotals,
  }
}
