// Carga do catálogo, link e mais vendidos.
export function installDadosUi(deps) {
  const {
    readCatalogLink,
    estado,
    catalogSortSelect,
    catalogSearchInput,
    piecePage,
    pieceCombinaWrap,
    resolvePieceLink,
    normalizeCategoryParam,
    showCatalogLoading,
    supabaseClient,
    clearCatalogLoading,
    catalogEl,
    unavailableProductsSection,
    unavailableProductsGrid,
    groupProductsByColor,
    collectionsEl,
    BESTSELLER_SORT,
    totalsByProductCode,
  } = deps

  function applyCatalogLink() {
    const link = readCatalogLink(location.search)
    estado.linkUtm = {
      utmSource: link.utmSource,
      utmMedium: link.utmMedium,
      utmCampaign: link.utmCampaign,
    }
    estado.selectedCategory = link.categoria
    estado.selectedCollectionSlug = link.colecao || ""
    estado.colorId = link.cor || ""
    if (link.ordem && catalogSortSelect) {
      catalogSortSelect.value = link.ordem
    }
    estado.onSaleOnly = Boolean(link.onSaleOnly)
    estado.onlyAvailable = Boolean(link.onlyAvailable)
    estado.onlyFavorites = Boolean(link.favoritos)
    estado.minPrice = link.minPrice
    estado.maxPrice = link.maxPrice
    if (link.busca && catalogSearchInput) {
      catalogSearchInput.value = link.busca
      deps.syncSearchClearButton()
    }
    deps.syncDrawerInputs()
    deps.renderColorFilters()
    syncCollectionPressed()

    if (!link.peca) {
      estado.pieceGroupKey = ""
      if (piecePage) piecePage.hidden = true
      if (pieceCombinaWrap) pieceCombinaWrap.hidden = true
      deps.syncCatalogUrl()
      deps.renderCatalogGrids()
      return
    }
    const resolved = resolvePieceLink(estado.allGroups, link.peca, deps.isCatalogProductAvailable)
    if (resolved.kind === "piece") {
      estado.selectedCodeByGroup[resolved.group.key] = resolved.variant.product.code
      deps.openPiecePage(resolved.group)
      return
    }
    estado.pieceGroupKey = ""
    if (piecePage) piecePage.hidden = true
    if (pieceCombinaWrap) pieceCombinaWrap.hidden = true
    if (resolved.kind === "soldout") estado.selectedCategory = normalizeCategoryParam(resolved.category)
    deps.syncCatalogUrl()
    deps.renderCatalogGrids()
  }

  async function loadCatalogData() {
    showCatalogLoading()
    const [productsResponse, componentsResponse, imagesResponse, collectionsResponse] = await Promise.all([
      window.MarisCatalogRead.selectProducts(supabaseClient)
        .order("quantity", { ascending: false })
        .order("name"),
      window.MarisCatalogRead.selectPricedComponents(supabaseClient).order("name"),
      window.MarisCatalogRead.selectImages(supabaseClient).order("sort_order", { ascending: true }),
      window.MarisCatalogRead.selectCollections
        ? Promise.resolve(window.MarisCatalogRead.selectCollections(supabaseClient)).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ])

    const { data, error } = productsResponse
    const { data: componentsData, error: componentsError } = componentsResponse
    const { data: imagesData, error: imagesError } = imagesResponse
    estado.activeCollections = Array.isArray(collectionsResponse?.data) ? collectionsResponse.data : []

    if (error || componentsError || imagesError) {
      estado.allGroups = []
      clearCatalogLoading()
      catalogEl.hidden = false
      catalogEl.innerHTML = "Erro ao carregar produtos"
      unavailableProductsSection.hidden = true
      unavailableProductsGrid.innerHTML = ""
      console.log(error || componentsError || imagesError)
      return
    }

    estado.componentsByProductCode = window.MarisUtils.groupByKey(
      window.MarisUtils.mapPricedComponents(componentsData || []),
      (c) => c.product_code
    )
    estado.imageUrlsByProductId = Object.create(null)
    for (const row of imagesData || []) {
      const productId = Number(row.product_id)
      const imageUrl = String(row.image_url || "").trim()
      if (!Number.isInteger(productId) || !imageUrl) continue
      if (!Array.isArray(estado.imageUrlsByProductId[productId])) estado.imageUrlsByProductId[productId] = []
      estado.imageUrlsByProductId[productId].push(imageUrl)
    }

    if (!data?.length) {
      estado.allGroups = []
      clearCatalogLoading()
      catalogEl.hidden = false
      catalogEl.innerHTML = "Nenhum produto encontrado"
      unavailableProductsSection.hidden = true
      unavailableProductsGrid.innerHTML = ""
      renderCollectionChips()
      return
    }

    estado.allGroups = groupProductsByColor(data)
    estado.selectedCodeByGroup = Object.create(null)
    deps.renderColorFilters()
    renderCollectionChips()

    estado.allComponents = componentsData || []
    if (window.MarisCatalogCart) {
      const imagesByCode = Object.create(null)
      for (const product of data || []) {
        const code = String(product?.code || "")
        if (!code) continue
        const urls = deps.getProductImageUrls(product)
        if (urls.length) imagesByCode[code] = urls[0]
      }
      window.MarisCatalogCart.setCatalogData({ products: data, components: estado.allComponents, imagesByCode })
      try {
        await window.MarisCatalogCart.init()
      } catch (error) {
        console.warn("Falha ao inicializar carrinho sem bloquear catalogo", error)
      }
    }
    await loadBestsellerTotals()
    applyCatalogLink()
  }

  function bestsellerControls() {
    return {
      option: catalogSortSelect?.querySelector("option[value='bestsellers']") || null,
      button: collectionsEl?.querySelector("[data-collection='mais-vendidas']") || null
    }
  }

  function setBestsellersVisible(visible) {
    const { option, button } = bestsellerControls()
    if (!visible) {
      if (catalogSortSelect?.value === BESTSELLER_SORT) catalogSortSelect.value = "name_asc"
      if (option) {
        option.hidden = true
        option.disabled = true
      }
      if (button) {
        button.hidden = true
        button.disabled = true
        button.classList.remove("is-selected")
        button.setAttribute("aria-pressed", "false")
      }
      return
    }
    if (option) {
      option.hidden = false
      option.disabled = false
    }
    if (button) {
      button.hidden = false
      button.disabled = false
    }
  }

  function syncCollectionPressed() {
    const sort = deps.getSortMode()
    collectionsEl?.querySelectorAll("[data-collection]").forEach((el) => {
      const name = el.getAttribute("data-collection")
      const selected = (name === "promocoes" && estado.onSaleOnly)
        || (name === "novidades" && !estado.onSaleOnly && sort === "created_desc")
        || (name === "mais-vendidas" && sort === BESTSELLER_SORT)
        || (name === "favoritos" && estado.onlyFavorites)
      el.classList.toggle("is-selected", selected)
      el.setAttribute("aria-pressed", selected ? "true" : "false")
    })
    collectionsEl?.querySelectorAll("[data-collection-slug]").forEach((el) => {
      const slug = el.getAttribute("data-collection-slug")
      const selected = Boolean(estado.selectedCollectionSlug && slug === estado.selectedCollectionSlug)
      el.classList.toggle("is-selected", selected)
      el.setAttribute("aria-pressed", selected ? "true" : "false")
    })
  }

  function renderCollectionChips() {
    if (!collectionsEl) return
    collectionsEl.querySelectorAll("[data-collection-slug]").forEach((el) => el.remove())
    for (const c of estado.activeCollections || []) {
      const btn = document.createElement("button")
      btn.type = "button"
      btn.className = "catalog-filter"
      btn.setAttribute("data-collection-slug", c.slug)
      btn.textContent = c.name
      collectionsEl.appendChild(btn)
    }
    syncCollectionPressed()
  }

  async function loadBestsellerTotals() {
    estado.bestsellerTotals = null
    setBestsellersVisible(false)
    const read = window.MarisCatalogRead
    if (!read?.BESTSELLERS_ENABLED) return
    try {
      const query = read.selectBestsellers(supabaseClient)
      if (!query) return
      const { data, error } = await query
      if (error || !Array.isArray(data)) return
      const totals = totalsByProductCode(data)
      if (!totals.size) return
      estado.bestsellerTotals = totals
      setBestsellersVisible(true)
    } catch (error) {
      estado.bestsellerTotals = null
      setBestsellersVisible(false)
      console.warn("Mais vendidas indisponível", error)
    }
  }

  return {
    applyCatalogLink,
    loadCatalogData,
    bestsellerControls,
    setBestsellersVisible,
    syncCollectionPressed,
    renderCollectionChips,
    loadBestsellerTotals,
  }
}
