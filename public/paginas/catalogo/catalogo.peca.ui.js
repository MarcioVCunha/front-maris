// Página da peça, galeria e zoom.
export function installPecaUi(deps) {
  const {
    estado,
    isProductFavorite,
    escapeHtml,
    piecePage,
    getPiecePhotoLabels,
    pieceGallery,
    pieceGalleryThumbs,
    pieceGalleryBadge,
    pieceGalleryPrev,
    pieceGalleryNext,
    pieceTitle,
    pieceBadges,
    pieceCode,
    pieceColors,
    piecePrices,
    pieceDescription,
    pieceSpecs,
    pieceSpecsGrid,
    resolveProductCategory,
    getCategorySpecifications,
    detectPieceMaterial,
    pieceCare,
    getMaterialCareGuide,
    pieceCareBadge,
    pieceCareTextEl,
    pieceCareCards,
    pieceActions,
    pieceWhatsapp,
    whatsappLink,
    productWhatsappMessage,
    pieceShareWhatsapp,
    buildProductShareText,
    buildWhatsappShareLink,
    buildProductOgMetadata,
    updateOpenGraphTags,
    pieceCombinaWrap,
    pieceCombinaTitle,
    pieceCombinaContent,
    renderCombinaComponentCard,
    effectivePrice,
    hasPromo,
    pixPrice,
    formatMoneyBRL,
    combinaGroups,
    relatedGroups,
    pieceRelated,
    pieceBack,
    buildCatalogQuery,
    catalogEl,
    unavailableProductsSection,
    zoomImage,
    zoomLevelText,
    zoomPhotoChip,
    zoomCounter,
    pieceZoomModal,
    zoomPrevBtn,
    zoomNextBtn,
  } = deps

  function chooseGroupColor(groupKey, code) {
    if (!groupKey || !code) return
    estado.selectedCodeByGroup[groupKey] = code
    const group = deps.findGroupByKey(groupKey)
    if (estado.pieceGroupKey === groupKey && group) openPiecePage(group)
    else deps.renderCatalogGrids()
    if (group && estado.currentModalGroup?.key === groupKey) deps.openProductModal(group)
  }

  function renderPieceActions(product, components, soldOut) {
    const isFav = typeof isProductFavorite === "function"
      ? isProductFavorite(product?.code, estado.userFavorites)
      : estado.userFavorites.includes(product?.code)

    const favBtnHtml = `
      <button type="button" class="piece-fav-btn${isFav ? " is-favorited" : ""}" data-fav-code="${escapeHtml(product?.code)}" aria-label="${isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}" title="${isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}">
        <span class="fav-icon" aria-hidden="true">${isFav ? "♥" : "♡"}</span>
        <span class="fav-text">${isFav ? "Favoritado" : "Favoritar"}</span>
      </button>
    `

    let primaryActionHtml = ""
    if (soldOut) {
      primaryActionHtml = `<button type="button" class="waitlist-card-btn" data-waitlist-code="${escapeHtml(product.code)}">💖 Quero essa peça</button>`
    } else if (components.length) {
      primaryActionHtml = `<button type="button" class="view-types-card-btn" data-view-code="${escapeHtml(product.code)}">Ver tipos</button>`
    } else {
      primaryActionHtml = `<button type="button" class="add-cart-card-btn" data-add-code="${escapeHtml(product.code)}">Adicionar à cesta</button>`
    }

    return `
      <div class="piece-actions-row">
        ${primaryActionHtml}
        ${favBtnHtml}
      </div>
    `
  }

  function openPiecePage(group) {
    if (!group || !piecePage) return
    estado.pieceGroupKey = group.key
    const variant = deps.selectedVariant(group)
    const product = variant?.product
    if (!product) return
    const components = deps.getProductComponents(product.code)
    const soldOut = !deps.isCatalogProductAvailable(product, components)
    estado.pieceImageUrls = deps.getProductImageUrls(product)
    estado.pieceImageLabels = getPiecePhotoLabels(estado.pieceImageUrls)
    estado.currentPieceImageIndex = 0

    pieceGallery.innerHTML = estado.pieceImageUrls.length
      ? estado.pieceImageUrls.map((url, i) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(product.name || "Peça")}" data-index="${i}" loading="${i === 0 ? "eager" : "lazy"}">`).join("")
      : ""

    if (estado.pieceImageUrls.length > 1) {
      if (pieceGalleryThumbs) {
        pieceGalleryThumbs.hidden = false
        pieceGalleryThumbs.innerHTML = estado.pieceImageUrls.map((url, i) => `
          <button type="button" class="piece-gallery-thumb${i === 0 ? " is-active" : ""}" data-thumb-index="${i}" aria-label="Ver foto ${i + 1}: ${escapeHtml(estado.pieceImageLabels[i]?.label || "")}">
            <img src="${escapeHtml(url)}" alt="Miniatura ${i + 1}">
          </button>
        `).join("")
      }
      if (pieceGalleryBadge) {
        pieceGalleryBadge.hidden = false
        pieceGalleryBadge.textContent = estado.pieceImageLabels[0]?.label || "Principal"
      }
      if (pieceGalleryPrev) pieceGalleryPrev.hidden = false
      if (pieceGalleryNext) pieceGalleryNext.hidden = false
    } else {
      if (pieceGalleryThumbs) pieceGalleryThumbs.hidden = true
      if (pieceGalleryBadge) pieceGalleryBadge.hidden = true
      if (pieceGalleryPrev) pieceGalleryPrev.hidden = true
      if (pieceGalleryNext) pieceGalleryNext.hidden = true
    }

    pieceTitle.textContent = product.name || "Peça"
    if (pieceBadges) pieceBadges.innerHTML = deps.renderNoteBadges(product, soldOut)
    pieceCode.textContent = product.code || ""
    pieceColors.innerHTML = deps.renderColorOptions(group, product.code)
    piecePrices.innerHTML = components.length
      ? ""
      : soldOut
        ? `<div class="price unavailable">Em falta</div>`
        : deps.renderOfferHtml(product)
    const description = deps.productDescriptionText(product)
    pieceDescription.hidden = !description
    pieceDescription.textContent = description

    if (pieceSpecs && pieceSpecsGrid) {
      const cat = resolveProductCategory(product)
      const specs = getCategorySpecifications(cat)
      const mat = detectPieceMaterial(product)
      const specItems = [
        { label: "Categoria", value: specs.categoria },
        { label: "Material & Banho", value: mat.finishing },
        { label: "Comprimento / Medidas", value: specs.comprimento },
        { label: "Fecho & Ajuste", value: specs.fecho },
        { label: "Hipoalergênico", value: mat.hypoallergenic },
        { label: "Destaque", value: specs.tamanho },
      ]
      pieceSpecsGrid.innerHTML = specItems.map((item) => `
        <div class="piece-spec-item">
          <span class="piece-spec-label">${escapeHtml(item.label)}</span>
          <span class="piece-spec-value">${escapeHtml(item.value)}</span>
        </div>
      `).join("")
      pieceSpecs.hidden = false
    }

    if (pieceCare) {
      const careGuide = getMaterialCareGuide(product)
      if (pieceCareBadge) pieceCareBadge.textContent = careGuide.material.badge
      if (pieceCareTextEl) pieceCareTextEl.textContent = careGuide.material.description
      if (pieceCareCards) {
        const iconMap = {
          cosmetics: "🧴",
          water: "🌊",
          storage: "💎",
          clean: "✨",
        }
        pieceCareCards.innerHTML = careGuide.cards.map((c) => `
          <div class="piece-care-card">
            <span class="piece-care-card-icon" aria-hidden="true">${iconMap[c.icon] || "✨"}</span>
            <h3 class="piece-care-card-title">${escapeHtml(c.title)}</h3>
            <p class="piece-care-card-text">${escapeHtml(c.text)}</p>
          </div>
        `).join("")
      }
      pieceCare.hidden = false
    }
    pieceActions.innerHTML = renderPieceActions(product, components, soldOut)
    if (pieceWhatsapp) pieceWhatsapp.href = whatsappLink(productWhatsappMessage(product.name))
    if (pieceShareWhatsapp) {
      const shareText = buildProductShareText(product, { code: product.code, origin: window.location.origin })
      pieceShareWhatsapp.href = buildWhatsappShareLink(shareText)
    }
    const ogMeta = buildProductOgMetadata(product, {
      code: product.code,
      origin: window.location.origin,
      image: estado.pieceImageUrls[0]
    })
    updateOpenGraphTags(ogMeta)
    if (pieceCombinaWrap) {
      if (components.length > 0) {
        if (pieceCombinaTitle) pieceCombinaTitle.textContent = "Combina com · Peças deste conjunto"
        if (pieceCombinaContent) {
          pieceCombinaContent.className = "combina-components-grid"
          pieceCombinaContent.innerHTML = components
            .map((c) => renderCombinaComponentCard(c, { effectivePrice, hasPromo, pixPrice, formatMoneyBRL }))
            .join("")
        }
        pieceCombinaWrap.hidden = false
      } else {
        const matching = combinaGroups(estado.allGroups, group, deps.isCatalogProductAvailable, 4)
        if (matching.length > 0) {
          if (pieceCombinaTitle) pieceCombinaTitle.textContent = "Combina com"
          if (pieceCombinaContent) {
            pieceCombinaContent.className = "catalog"
            pieceCombinaContent.innerHTML = matching.map(deps.renderCatalogGroup).join("")
          }
          pieceCombinaWrap.hidden = false
        } else {
          pieceCombinaWrap.hidden = true
          if (pieceCombinaContent) pieceCombinaContent.innerHTML = ""
        }
      }
    }
    const related = relatedGroups(estado.allGroups, group, deps.isCatalogProductAvailable, 4)
    pieceRelated.innerHTML = related.length
      ? related.map(deps.renderCatalogGroup).join("")
      : `<p class="piece-related-empty">Nenhuma outra peça desta categoria agora.</p>`
    if (pieceBack) {
      const backQuery = buildCatalogQuery({
        categoria: estado.selectedCategory,
        utmSource: estado.linkUtm.utmSource,
        utmMedium: estado.linkUtm.utmMedium,
        utmCampaign: estado.linkUtm.utmCampaign,
      })
      pieceBack.href = `${location.pathname}${backQuery}`
    }
    piecePage.hidden = false
    catalogEl.hidden = true
    unavailableProductsSection.hidden = true
    deps.syncCatalogUrl()
    window.scrollTo(0, 0)
  }

  function closePiecePage() {
    closeZoomModal()
    estado.pieceGroupKey = ""
    if (piecePage) piecePage.hidden = true
    if (pieceCombinaWrap) pieceCombinaWrap.hidden = true
    updateOpenGraphTags(buildProductOgMetadata(null, { origin: window.location.origin }))
    deps.syncCatalogUrl()
    deps.renderCatalogGrids()
  }

  function setPieceGalleryIndex(index) {
    if (!estado.pieceImageUrls.length) return
    const max = estado.pieceImageUrls.length - 1
    estado.currentPieceImageIndex = Math.max(0, Math.min(max, index))
    const width = pieceGallery?.clientWidth || 300
    pieceGallery?.scrollTo({ left: estado.currentPieceImageIndex * width, behavior: "smooth" })

    if (pieceGalleryThumbs) {
      pieceGalleryThumbs.querySelectorAll(".piece-gallery-thumb").forEach((thumb, i) => {
        thumb.classList.toggle("is-active", i === estado.currentPieceImageIndex)
      })
    }
    if (pieceGalleryBadge) {
      pieceGalleryBadge.textContent = estado.pieceImageLabels[estado.currentPieceImageIndex]?.label || "Foto"
    }
  }

  function updateZoomView() {
    if (!zoomImage) return
    zoomImage.style.transform = `translate(${estado.zoomTranslate.x}px, ${estado.zoomTranslate.y}px) scale(${estado.zoomScale})`
    if (zoomLevelText) zoomLevelText.textContent = `${Math.round(estado.zoomScale * 100)}%`
    if (zoomPhotoChip) {
      zoomPhotoChip.textContent = estado.pieceImageLabels[estado.currentPieceImageIndex]?.label || "Principal"
    }
    if (zoomCounter) {
      zoomCounter.textContent = `${estado.currentPieceImageIndex + 1} / ${estado.pieceImageUrls.length}`
    }
  }

  function openZoomModal(index = estado.currentPieceImageIndex) {
    if (!pieceZoomModal || !estado.pieceImageUrls.length) return
    estado.currentPieceImageIndex = Math.max(0, Math.min(estado.pieceImageUrls.length - 1, index))
    estado.zoomScale = 1
    estado.zoomTranslate = { x: 0, y: 0 }
    if (zoomImage) zoomImage.src = estado.pieceImageUrls[estado.currentPieceImageIndex]
    updateZoomView()
    if (zoomPrevBtn) zoomPrevBtn.hidden = estado.pieceImageUrls.length <= 1
    if (zoomNextBtn) zoomNextBtn.hidden = estado.pieceImageUrls.length <= 1
    pieceZoomModal.hidden = false
    document.body.style.overflow = "hidden"
  }

  function closeZoomModal() {
    if (!pieceZoomModal) return
    pieceZoomModal.hidden = true
    document.body.style.overflow = ""
  }

  function zoomIn() {
    estado.zoomScale = Math.min(3, estado.zoomScale + 0.5)
    updateZoomView()
  }

  function zoomOut() {
    estado.zoomScale = Math.max(1, estado.zoomScale - 0.5)
    if (estado.zoomScale <= 1) estado.zoomTranslate = { x: 0, y: 0 }
    updateZoomView()
  }

  function zoomReset() {
    estado.zoomScale = 1
    estado.zoomTranslate = { x: 0, y: 0 }
    updateZoomView()
  }

  function bindShareButton(button, getProduct) {
    if (!button) return
    button.addEventListener("click", async (event) => {
      const product = getProduct()
      if (!product) return
      const shareText = buildProductShareText(product, {
        code: product.code,
        origin: window.location.origin
      })
      const shareUrl = `${window.location.origin}/catalog?peca=${encodeURIComponent(product.code)}`
      if (typeof navigator !== "undefined" && navigator.share) {
        event.preventDefault()
        try {
          await navigator.share({
            title: `${product.name} — Maris Semijoias`,
            text: shareText,
            url: shareUrl
          })
        } catch (err) {
          if (err.name !== "AbortError") {
            window.open(buildWhatsappShareLink(shareText), "_blank", "noopener,noreferrer")
          }
        }
      }
    })
  }

  return {
    chooseGroupColor,
    renderPieceActions,
    openPiecePage,
    closePiecePage,
    setPieceGalleryIndex,
    updateZoomView,
    openZoomModal,
    closeZoomModal,
    zoomIn,
    zoomOut,
    zoomReset,
    bindShareButton,
  }
}
