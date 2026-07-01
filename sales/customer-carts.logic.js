export function sellerLabel(cart) {
  if (cart?.seller?.name) return cart.seller.name
  if (Number(cart?.seller_id) > 0) return `Vendedora #${cart.seller_id}`
  return "Sem vendedora"
}

export function buildCartsListUrl(baseUrl, selected) {
  if (selected === "all") return baseUrl
  return `${baseUrl}?seller_id=${encodeURIComponent(selected)}`
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisCustomerCartsLogic = { sellerLabel, buildCartsListUrl }
}
