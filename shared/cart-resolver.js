// Lógica pura de resolução de linhas de carrinho/cesta, reutilizada por
// `catalog-cart.js` (carrinho local) e `cesta-compartilhada.js` (cesta vinda
// de link). Mantida sem DOM para ser testável no Deno.

window.MarisCart = {
  /** Chave estável de uma linha (componente tem prioridade sobre produto). */
  itemKey(item) {
    return item.component_id ? `c-${item.component_id}` : `p-${item.product_code}`
  },

  /**
   * Resolve nome, código, preços e disponibilidade de uma linha.
   * @param {{product_code: string|null, component_id: number|null}} item
   * @param {{productsByCode: object, componentsById: object, productImagesByCode: object}} maps
   * @param {"cart"|"shared"} [variant] Diferenças de rótulo entre carrinho e cesta.
   */
  resolveLine(item, maps, variant = "cart") {
    const { productsByCode, componentsById, productImagesByCode } = maps
    const effectivePrice = window.MarisUtils.effectivePrice
    const hasPromo = window.MarisUtils.hasPromo
    const locked = Number(item?.unit_price)
    const hasLockedPrice = Number.isFinite(locked) && locked > 0

    if (item.component_id) {
      const component = componentsById[item.component_id]
      const parentCode = component?.product_code || ""
      const original = Number(component?.unit_price) || 0
      const final = hasLockedPrice ? locked : effectivePrice(component)
      const name = variant === "shared"
        ? component?.name || `Tipo ${item.component_id}`
        : component?.name || "Tipo"
      const code = variant === "shared"
        ? parentCode ? `${parentCode} / ${component?.name || ""}` : `COMP-${item.component_id}`
        : component?.product_code || `COMP-${item.component_id}`
      const onSale = variant === "shared"
        ? hasPromo(component) && final < original
        : final < original
      return {
        name,
        code,
        unitPrice: final,
        originalPrice: original,
        onSale,
        available: Math.max(0, Number(component?.quantity) || 0),
        imageUrl: productImagesByCode[parentCode] || ""
      }
    }

    const product = productsByCode[item.product_code]
    const original = Number(product?.unit_price) || 0
    const final = hasLockedPrice ? locked : effectivePrice(product)
    const onSale = variant === "shared"
      ? hasPromo(product) && final < original
      : final < original
    return {
      name: product?.name || item.product_code || "Produto",
      code: item.product_code || "",
      unitPrice: final,
      originalPrice: original,
      onSale,
      available: Math.max(0, Number(product?.quantity) || 0),
      imageUrl: productImagesByCode[item.product_code || ""] || String(product?.image_url || "")
    }
  }
}
