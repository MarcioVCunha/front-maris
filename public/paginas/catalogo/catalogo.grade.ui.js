// Grade, favoritos e cartões do catálogo.
export function installGradeUi(deps) {
  const {
    countFavorites,
    estado,
    headerFavCount,
    headerFavBtn,
    colFavCount,
    isProductFavorite,
    catalogFavoritesBanner,
    toggleFavoriteItem,
    saveStoredFavorites,
    catalogFeedbackEl,
    catalogSearchInput,
    catalogSortSelect,
    whatsappLink,
    CATALOG_WHATSAPP_MESSAGE,
    groupDisplayVariant,
    visibleCategories,
    catalogFiltersEl,
    renderCategoryFilterButtons,
    COLOR_FILTERS,
    selectVariantByCode,
    displayVariantForFilters,
    buildCatalogQuery,
    collectionBannerEl,
    collectionTitleEl,
    collectionBadgeEl,
    collectionDescEl,
    offerFromProduct,
    formatMoneyBRL,
    renderCatalogPhotoStrip,
    showLastUnitBadge,
    showNewBadge,
    escapeHtml,
    hasPromo,
    effectivePrice,
    pixPrice,
    renderCatalogIdentityHtml,
    clearCatalogLoading,
    filterAndPartitionCatalog,
    BESTSELLER_SORT,
    sortGroupsByBestsellers,
    sortGroupsForCatalog,
    piecePage,
    catalogEl,
    unavailableProductsSection,
    unavailableProductsGrid,
  } = deps

  function syncFavoritesUi() {
    const count = typeof countFavorites === "function" ? countFavorites(estado.userFavorites) : estado.userFavorites.length
    if (headerFavCount) {
      headerFavCount.textContent = String(count)
      headerFavCount.hidden = count === 0
    }
    if (headerFavBtn) {
      headerFavBtn.classList.toggle("is-active", estado.onlyFavorites)
      headerFavBtn.setAttribute("aria-pressed", estado.onlyFavorites ? "true" : "false")
    }
    if (colFavCount) {
      colFavCount.textContent = String(count)
    }

    document.querySelectorAll("[data-fav-code]").forEach((btn) => {
      const code = btn.getAttribute("data-fav-code")
      const isFav = typeof isProductFavorite === "function"
        ? isProductFavorite(code, estado.userFavorites)
        : estado.userFavorites.includes(code)
      btn.classList.toggle("is-favorited", isFav)
      btn.setAttribute("aria-label", isFav ? "Remover dos favoritos" : "Salvar nos favoritos")
      btn.setAttribute("title", isFav ? "Remover dos favoritos" : "Salvar nos favoritos")
      const icon = btn.querySelector(".fav-icon")
      if (icon) icon.textContent = isFav ? "♥" : "♡"
      const textSpan = btn.querySelector(".fav-text")
      if (textSpan) textSpan.textContent = isFav ? "Favoritado" : "Favoritar"
    })

    if (catalogFavoritesBanner) {
      catalogFavoritesBanner.hidden = !estado.onlyFavorites
    }
  }

  function toggleFavorite(code) {
    if (!code) return
    if (typeof toggleFavoriteItem === "function") {
      const res = toggleFavoriteItem(code, estado.userFavorites)
      estado.userFavorites = res.favorites
      if (typeof saveStoredFavorites === "function") {
        saveStoredFavorites(estado.userFavorites, localStorage)
      }
    } else {
      const idx = estado.userFavorites.indexOf(code)
      if (idx >= 0) estado.userFavorites.splice(idx, 1)
      else estado.userFavorites.push(code)
      try { localStorage.setItem("maris_favoritos", JSON.stringify(estado.userFavorites)) } catch {}
    }
    syncFavoritesUi()
    if (estado.onlyFavorites) {
      renderCatalogGrids()
    }
  }

  function setCatalogFeedback(text, type = "") {
    window.MarisUI.setFeedback(catalogFeedbackEl, text, type, { baseClass: "catalog-feedback" })
  }

  function notifyCartAdd(result, itemLabel = "Item") {
    if (!result?.ok) {
      if (result?.reason === "out_of_stock") {
        setCatalogFeedback(`${itemLabel} indisponível no momento.`, "error")
        return
      }
      setCatalogFeedback(`Não foi possível adicionar ${itemLabel.toLowerCase()} na cesta.`, "error")
      return
    }
    if (result.clamped) {
      setCatalogFeedback(`Estoque limitado: você tem ${result.available} unidade(s) desse item na cesta.`, "error")
      return
    }
    setCatalogFeedback(`${itemLabel} adicionado na sua cesta.`, "success")
  }

  function getSearchTerm() {
    return (catalogSearchInput?.value || "").trim().toLowerCase()
  }

  function getSortMode() {
    return catalogSortSelect?.value || "name_asc"
  }

  function bindStoreWhatsappLinks() {
    window.MarisLojaInfo?.fillContactLinks?.(document)
    const href = whatsappLink(CATALOG_WHATSAPP_MESSAGE)
    for (const id of ["catalog-whatsapp", "footer-whatsapp"]) {
      const link = document.getElementById(id)
      if (link) link.href = href
    }
  }

  function renderCategoryFilters() {
    const representatives = estado.allGroups
      .map((group) => groupDisplayVariant(group, isCatalogProductAvailable)?.product)
      .filter(Boolean)
    const categories = visibleCategories(representatives)
    if (estado.selectedCategory !== "Todos" && !categories.includes(estado.selectedCategory)) {
      estado.selectedCategory = "Todos"
    }
    const signature = ["Todos", ...categories].join("|")
    if (signature !== estado.categoryFilterSignature) {
      estado.categoryFilterSignature = signature
      const buttons = ["Todos", ...categories]
      catalogFiltersEl.innerHTML = renderCategoryFilterButtons(buttons, estado.selectedCategory)
      return
    }
    catalogFiltersEl.querySelectorAll("[data-category]").forEach((button) => {
      const selected = button.getAttribute("data-category") === estado.selectedCategory
      button.classList.toggle("is-selected", selected)
      button.setAttribute("aria-pressed", selected ? "true" : "false")
    })
  }

  function getProductComponents(productCode) {
    return estado.componentsByProductCode[productCode] || []
  }

  function getProductImageUrls(product) {
    const productId = Number(product?.id)
    const urlsFromTable = Number.isInteger(productId) ? (estado.imageUrlsByProductId[productId] || []) : []
    if (urlsFromTable.length) return urlsFromTable
    const fallback = String(product?.image_url || "").trim()
    return fallback ? [fallback] : []
  }

  function isCatalogProductAvailable(product, components = null) {
    const list = components ?? getProductComponents(product.code)
    if (list.length > 0) {
      return list.some((c) => (Number(c.quantity) || 0) > 0)
    }
    return (Number(product.quantity) || 0) > 0
  }

  function findGroupByKey(key) {
    return estado.allGroups.find((group) => group.key === key) || null
  }

  function colorSuffixes(id) {
    return COLOR_FILTERS.find((item) => item.id === id)?.suffixes || []
  }

  function selectedVariant(group) {
    const preferred = estado.selectedCodeByGroup[group?.key]
    if (preferred) {
      const chosen = selectVariantByCode(group, isCatalogProductAvailable, preferred)
      const suffixes = colorSuffixes(estado.colorId)
      if (!suffixes.length || suffixes.includes(chosen?.suffix)) return chosen
    }
    return displayVariantForFilters(group, { colorId: estado.colorId }, isCatalogProductAvailable) || groupDisplayVariant(group, isCatalogProductAvailable)
  }

  function activeFilters() {
    const collection = estado.selectedCollectionSlug
      ? (estado.activeCollections || []).find((c) => c.slug === estado.selectedCollectionSlug) || null
      : null
    return {
      term: getSearchTerm(),
      category: estado.selectedCategory,
      minPrice: estado.minPrice,
      maxPrice: estado.maxPrice,
      colorId: estado.colorId,
      onlyAvailable: estado.onlyAvailable,
      onSaleOnly: estado.onSaleOnly,
      collection,
      favoritos: estado.onlyFavorites,
      favoritesList: estado.userFavorites,
    }
  }

  function currentPieceBase() {
    if (!estado.pieceGroupKey) return ""
    return findGroupByKey(estado.pieceGroupKey)?.base || ""
  }

  function syncCatalogUrl() {
    const next = buildCatalogQuery({
      categoria: estado.selectedCategory,
      peca: currentPieceBase(),
      cor: estado.colorId,
      ordem: getSortMode(),
      onSaleOnly: estado.onSaleOnly,
      onlyAvailable: estado.onlyAvailable,
      favoritos: estado.onlyFavorites,
      colecao: estado.selectedCollectionSlug,
      minPrice: estado.minPrice,
      maxPrice: estado.maxPrice,
      busca: getSearchTerm(),
      utmSource: estado.linkUtm.utmSource,
      utmMedium: estado.linkUtm.utmMedium,
      utmCampaign: estado.linkUtm.utmCampaign,
    })
    if ((location.search || "") === next) return
    history.replaceState(null, "", `${location.pathname}${next}`)
  }

  function renderCollectionBanner() {
    if (!collectionBannerEl) return
    const collection = estado.selectedCollectionSlug
      ? (estado.activeCollections || []).find((c) => c.slug === estado.selectedCollectionSlug) || null
      : null
    if (!collection) {
      collectionBannerEl.hidden = true
      return
    }
    collectionBannerEl.hidden = false
    if (collectionTitleEl) collectionTitleEl.textContent = collection.name
    if (collectionBadgeEl) {
      if (collection.badge_text) {
        collectionBadgeEl.textContent = collection.badge_text
        collectionBadgeEl.hidden = false
      } else {
        collectionBadgeEl.hidden = true
      }
    }
    if (collectionDescEl) {
      if (collection.description) {
        collectionDescEl.textContent = collection.description
        collectionDescEl.hidden = false
      } else {
        collectionDescEl.hidden = true
      }
    }
  }

  function renderOfferHtml(product) {
    const offer = offerFromProduct(product)
    const main = offer.onSale
      ? `<span class="price-old">de ${formatMoneyBRL(offer.listPrice)}</span> <span class="price-now">por ${formatMoneyBRL(offer.finalPrice)}</span> <span class="price-off">${offer.percentOff}% OFF</span>`
      : `<span class="price-now">${formatMoneyBRL(offer.finalPrice)}</span>`
    return `<div class="price${offer.onSale ? " on-sale" : ""}">${main}</div><div class="price-pix">${formatMoneyBRL(offer.pixPrice)} no Pix</div>`
  }

  function renderPhotoStrip(urls, alt) {
    return renderCatalogPhotoStrip(urls, alt)
  }

  function renderNoteBadges(product, soldOut) {
    const notes = []
    if (!soldOut && showLastUnitBadge(product)) notes.push("Última unidade")
    if (showNewBadge(product)) notes.push("Novidade")
    if (!notes.length) return ""
    return `<div class="product-notes">${notes.map((label) => `<span class="product-note-badge">${label}</span>`).join("")}</div>`
  }

  function productDescriptionText(product) {
    return String(product?.description || product?.descricao || "").trim()
  }

  function renderColorOptions(group, selectedCode) {
    if (!group || group.variants.length < 2) return ""
    return group.variants.map((variant) => {
      const code = variant.product?.code || ""
      const selected = code === selectedCode
      const unavailable = !isCatalogProductAvailable(variant.product)
      return `<button type="button" class="color-option${selected ? " is-selected" : ""}${unavailable ? " is-unavailable" : ""}" data-color-code="${escapeHtml(code)}" aria-pressed="${selected ? "true" : "false"}">${escapeHtml(variant.label || code)}</button>`
    }).join("")
  }

  function renderCatalogGroup(group) {
    const variant = selectedVariant(group)
    const product = variant?.product
    if (!product) return ""
    const components = getProductComponents(product.code)
    const available = isCatalogProductAvailable(product, components)
    const soldOut = !available
    const showPrice = !soldOut
    const productOnSale = hasPromo(product)
    const imageUrls = getProductImageUrls(product)
    const colorHtml = renderColorOptions(group, product.code)

    let splitInfo = ""
    if (components.length) {
      let lowest = Infinity
      for (const c of components) {
        const componentQty = Number(c.quantity) || 0
        if (componentQty <= 0) continue
        const p = effectivePrice(c)
        if (p < lowest) lowest = p
      }
      if (lowest !== Infinity) {
        splitInfo = `<div class="split-info">Pode ser comprado separado a partir de ${formatMoneyBRL(lowest)} · ${formatMoneyBRL(pixPrice(lowest))} no Pix</div>`
      }
    }

    let priceHtml = ""
    if (!components.length) {
      priceHtml = showPrice
        ? renderOfferHtml(product)
        : `<div class="price unavailable">Em falta</div>`
    }

    const saleBadge = productOnSale && !soldOut
      ? `<span class="product-sale-badge">${offerFromProduct(product).percentOff}% OFF</span>`
      : ""

    const isFav = typeof isProductFavorite === "function"
      ? isProductFavorite(product.code, estado.userFavorites)
      : estado.userFavorites.includes(product.code)

    const favBtnHtml = `
      <button type="button" class="product-favorite-btn${isFav ? " is-favorited" : ""}" data-fav-code="${escapeHtml(product.code)}" aria-label="${isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}" title="${isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}">
        <span class="fav-icon" aria-hidden="true">${isFav ? "♥" : "♡"}</span>
      </button>
    `

    // Com tipos: só abre o modal (estoque/venda são por tipo, não pelo pai).
    const actionHtml = soldOut
      ? `<button type="button" class="waitlist-card-btn" data-waitlist-code="${escapeHtml(product.code)}">💖 Quero essa peça</button>`
      : components.length
        ? `<button type="button" class="view-types-card-btn" data-view-code="${escapeHtml(product.code)}">Ver tipos</button>`
        : `<button type="button" class="add-cart-card-btn" data-add-code="${escapeHtml(product.code)}">Adicionar à cesta</button>`

    return `
      <article class="product ${soldOut ? "sold-out" : ""}" data-group-key="${escapeHtml(group.key)}" data-product-code="${escapeHtml(product.code)}" role="button" tabindex="0">
        ${favBtnHtml}
        ${saleBadge}
        ${renderNoteBadges(product, soldOut)}
        ${renderPhotoStrip(imageUrls, product.name || "Peça")}
        <div class="product-body">
          ${renderCatalogIdentityHtml(product.name, product.code)}
          ${colorHtml ? `<div class="color-options" role="group" aria-label="Cor">${colorHtml}</div>` : ""}
          ${splitInfo}
          ${priceHtml}
          ${actionHtml}
        </div>
      </article>
    `
  }

  function renderCatalogGrids() {
    clearCatalogLoading()
    const term = getSearchTerm()
    const sortMode = getSortMode()

    renderCategoryFilters()
    deps.renderActiveFilters()
    deps.syncDrawerInputs()
    renderCollectionBanner()
    syncFavoritesUi()

    const filters = activeFilters()
    const partitioned = filterAndPartitionCatalog(estado.allGroups, filters, isCatalogProductAvailable)
    const sortList = (groups) => sortMode === BESTSELLER_SORT && estado.bestsellerTotals
      ? sortGroupsByBestsellers(groups, estado.bestsellerTotals)
      : sortGroupsForCatalog(groups, sortMode, isCatalogProductAvailable, filters)
    const availFiltered = sortList(partitioned.available)
    const unavailFiltered = sortList(partitioned.soldOut)
    if (estado.pieceGroupKey && piecePage && !piecePage.hidden) {
      catalogEl.hidden = true
      unavailableProductsSection.hidden = true
      if (collectionBannerEl) collectionBannerEl.hidden = true
      return
    }

    if (!availFiltered.length && !unavailFiltered.length) {
      catalogEl.hidden = false
      catalogEl.innerHTML = term
        ? "Nenhum produto encontrado para a busca"
        : filters.favoritos
          ? `<div class="catalog-empty-favorites">
               <div class="empty-fav-icon" aria-hidden="true">♡</div>
               <h3>Você ainda não tem favoritos salvos</h3>
               <p>Toque no coração das peças que você mais gostar para guardar aqui no seu aparelho e não perder de vista.</p>
               <button type="button" class="btn-primary" id="empty-fav-see-all">Ver todas as peças</button>
             </div>`
          : estado.selectedCategory !== "Todos"
            ? "Nenhum produto nessa categoria"
            : "Nenhum produto encontrado"
    } else if (!availFiltered.length) {
      catalogEl.hidden = true
      catalogEl.innerHTML = ""
    } else {
      catalogEl.hidden = false
      catalogEl.innerHTML = availFiltered.map(renderCatalogGroup).join("")
    }

    if (!unavailFiltered.length) {
      unavailableProductsSection.hidden = true
      unavailableProductsGrid.innerHTML = ""
      return
    }

    unavailableProductsSection.hidden = false
    unavailableProductsGrid.innerHTML = unavailFiltered.map(renderCatalogGroup).join("")
  }

  return {
    syncFavoritesUi,
    toggleFavorite,
    setCatalogFeedback,
    notifyCartAdd,
    getSearchTerm,
    getSortMode,
    bindStoreWhatsappLinks,
    renderCategoryFilters,
    getProductComponents,
    getProductImageUrls,
    isCatalogProductAvailable,
    findGroupByKey,
    colorSuffixes,
    selectedVariant,
    activeFilters,
    currentPieceBase,
    syncCatalogUrl,
    renderCollectionBanner,
    renderOfferHtml,
    renderPhotoStrip,
    renderNoteBadges,
    productDescriptionText,
    renderColorOptions,
    renderCatalogGroup,
    renderCatalogGrids,
  }
}
