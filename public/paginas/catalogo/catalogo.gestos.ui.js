// Cliques e gesto das fotos do catálogo.
export function installGestosUi(deps) {
  const {
    estado,
  } = deps

  function handleProductClick(target) {
    const productCard = target.closest(".product[data-group-key]")
    if (!productCard) return
    deps.openPiecePage(deps.findGroupByKey(productCard.getAttribute("data-group-key")))
  }

  async function handleCatalogGridClick(event) {
    if (estado.ignoreNextCardClick) {
      estado.ignoreNextCardClick = false
      return
    }
    const photoNav = event.target.closest("[data-photo-nav]")
    if (photoNav) {
      event.stopPropagation()
      const photos = photoNav.closest(".product-media")?.querySelector(".product-photos")
      if (photos) photos.scrollBy({ left: Number(photoNav.getAttribute("data-photo-nav")) * photos.clientWidth, behavior: "smooth" })
      return
    }
    const favBtn = event.target.closest("[data-fav-code]")
    if (favBtn) {
      event.stopPropagation()
      const code = favBtn.getAttribute("data-fav-code")
      deps.toggleFavorite(code)
      return
    }
    const emptySeeAll = event.target.closest("#empty-fav-see-all")
    if (emptySeeAll) {
      event.stopPropagation()
      estado.onlyFavorites = false
      deps.syncCollectionPressed()
      deps.refreshAfterFilterChange()
      return
    }
    const colorBtn = event.target.closest("[data-color-code]")
    if (colorBtn) {
      event.stopPropagation()
      const card = colorBtn.closest("[data-group-key]")
      deps.chooseGroupColor(card?.getAttribute("data-group-key") || estado.pieceGroupKey, colorBtn.getAttribute("data-color-code"))
      return
    }
    const waitlistBtn = event.target.closest("[data-waitlist-code]")
    if (waitlistBtn) {
      event.stopPropagation()
      deps.joinWaitlist({ productCode: waitlistBtn.getAttribute("data-waitlist-code") })
      return
    }
    const waitComp = event.target.closest("[data-waitlist-component]")
    if (waitComp) {
      event.stopPropagation()
      deps.joinWaitlist({ componentId: Number(waitComp.getAttribute("data-waitlist-component")) })
      return
    }
    const viewTypesBtn = event.target.closest("[data-view-code]")
    if (viewTypesBtn) {
      event.stopPropagation()
      const card = viewTypesBtn.closest("[data-group-key]")
      deps.openProductModal(deps.findGroupByKey(card?.getAttribute("data-group-key") || estado.pieceGroupKey))
      return
    }
    const addComp = event.target.closest("[data-add-component]")
    if (addComp) {
      event.stopPropagation()
      const compId = Number(addComp.getAttribute("data-add-component"))
      const result = await window.MarisCatalogCart?.addComponent(compId, 1)
      deps.notifyCartAdd(result, "Peça")
      return
    }
    const addBtn = event.target.closest("[data-add-code]")
    if (addBtn) {
      event.stopPropagation()
      const code = addBtn.getAttribute("data-add-code")
      // Produtos com tipos não devem ir para a cesta pelo pai.
      if (deps.getProductComponents(code).length) {
        const card = addBtn.closest("[data-group-key]")
        deps.openProductModal(deps.findGroupByKey(card?.getAttribute("data-group-key")))
        return
      }
      const result = await window.MarisCatalogCart?.addProduct(code, 1)
      deps.notifyCartAdd(result, "Produto")
      return
    }
    handleProductClick(event.target)
  }

  function bindPhotoSwipe(root) {
    if (!root) return
    root.addEventListener("pointerdown", (event) => {
      const photos = event.target.closest(".product-photos")
      if (!photos) return
      photos.dataset.scrollStart = String(photos.scrollLeft)
    })
    root.addEventListener("pointerup", (event) => {
      const photos = event.target.closest(".product-photos")
      if (!photos) return
      const start = Number(photos.dataset.scrollStart || 0)
      if (Math.abs(photos.scrollLeft - start) > 6) estado.ignoreNextCardClick = true
    })
  }

  return {
    handleProductClick,
    handleCatalogGridClick,
    bindPhotoSwipe,
  }
}
