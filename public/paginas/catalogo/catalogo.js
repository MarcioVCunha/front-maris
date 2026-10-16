const { createSupabaseClient, formatMoneyBRL, effectivePrice, hasPromo } = window.MarisUtils
const {
  loadStoredFavorites,
  saveStoredFavorites,
  isProductFavorite,
  toggleFavoriteItem,
  countFavorites,
  isGroupFavorite,
  validateEmail,
  formatRestockAlertPayload,
} = window.MarisFavoritesLogic || {}
const {
  visibleCategories,
  whatsappLink,
  productWhatsappMessage,
  CATALOG_WHATSAPP_MESSAGE,
  groupProductsByColor,
  selectVariantByCode,
  groupDisplayVariant,
  sortGroupsForCatalog,
  offerFromProduct,
  pixPrice,
  COLOR_FILTERS,
  PRICE_RANGE_PRESETS,
  variantMatchesColor,
  getActiveFilterPills,
  countActiveFilters,
  parsePriceBound,
  displayVariantForFilters,
  filterAndPartitionCatalog,
  relatedGroups,
  readCatalogLink,
  buildCatalogQuery,
  resolvePieceLink,
  normalizeCategoryParam,
  showLastUnitBadge,
  showNewBadge,
  pieceCareText,
  detectPieceMaterial,
  getPiecePhotoLabels,
  getCategorySpecifications,
  getMaterialCareGuide,
  resolveProductCategory,
  totalsByProductCode,
  sortGroupsByBestsellers,
  buildProductShareText,
  buildWhatsappShareLink,
  buildProductOgMetadata,
  combinaGroups,
  renderCombinaComponentCard,
  getSearchSuggestions,
  updateOpenGraphTags,
} = window.MarisCatalogLogic
const escapeHtml = (text) => window.MarisUI.escapeHtml(text)

function loadingMarkup(options = {}) {
  if (window.MarisLoading?.html) return window.MarisLoading.html(options)
  return `<div class="maris-loading${options.size ? ` maris-loading--${options.size}` : ""}${options.block ? " maris-loading--block" : ""}" role="status" aria-label="Carregando"></div>`
}

const supabaseClient = createSupabaseClient()

const catalogEl = document.getElementById("catalog")
const productSearchContainer = document.getElementById("product-search-container")
const catalogSearchInput = document.getElementById("catalog-search")
const catalogSearchClearBtn = document.getElementById("catalog-search-clear")
const catalogSearchSuggestionsEl = document.getElementById("catalog-search-suggestions")
const catalogSortSelect = document.getElementById("catalog-sort")
const unavailableProductsSection = document.getElementById("unavailable-products-section")
const unavailableProductsGrid = document.getElementById("unavailable-products-grid")

function showCatalogLoading() {
  if (!catalogEl) return
  catalogEl.classList.add("catalog--loading")
  catalogEl.hidden = false
  catalogEl.innerHTML = loadingMarkup({ size: "md", block: true })
}

function clearCatalogLoading() {
  catalogEl?.classList.remove("catalog--loading")
}
const productModal = document.getElementById("product-modal")
const productModalCarousel = document.querySelector(".product-modal-carousel")
const productModalPrevBtn = document.getElementById("product-modal-prev")
const productModalNextBtn = document.getElementById("product-modal-next")
const productModalCloseBtn = document.getElementById("product-modal-close")
const productModalImage = document.getElementById("product-modal-image")
const productModalDots = document.getElementById("product-modal-dots")
const productModalTitle = document.getElementById("product-modal-title")
const productModalCode = document.getElementById("product-modal-code")
const productModalPrice = document.getElementById("product-modal-price")
const productModalStock = document.getElementById("product-modal-stock")
const productModalStatus = document.getElementById("product-modal-status")
const productModalComponentsList = document.getElementById("product-modal-components-list")
const productModalActions = document.getElementById("product-modal-actions")
const catalogFeedbackEl = document.getElementById("catalog-feedback")
const catalogFiltersEl = document.getElementById("catalog-filters")
const catalogFiltersOpenBtn = document.getElementById("catalog-filters-open")
const catalogFiltersCountEl = document.getElementById("catalog-filters-count")
const catalogActiveFiltersBar = document.getElementById("catalog-active-filters-bar")
const catalogActivePills = document.getElementById("catalog-active-pills")
const catalogActiveClearAllBtn = document.getElementById("catalog-active-clear-all")
const catalogDrawer = document.getElementById("catalog-drawer")
const colorFiltersEl = document.getElementById("catalog-color-filters")
const priceRangePresetsEl = document.getElementById("price-range-presets")
const minPriceInput = document.getElementById("filter-min-price")
const maxPriceInput = document.getElementById("filter-max-price")
const filterOnSaleInput = document.getElementById("filter-on-sale")
const onlyAvailableInput = document.getElementById("filter-only-available")
const filterOnlyFavoritesInput = document.getElementById("filter-only-favorites")
const catalogFiltersClearBtn = document.getElementById("catalog-filters-clear")
const piecePage = document.getElementById("piece-page")
const pieceGalleryContainer = document.getElementById("piece-gallery-container")
const pieceGallery = document.getElementById("piece-gallery")
const pieceGalleryThumbs = document.getElementById("piece-gallery-thumbs")
const pieceGalleryBadge = document.getElementById("piece-gallery-badge")
const pieceGalleryPrev = document.getElementById("piece-gallery-prev")
const pieceGalleryNext = document.getElementById("piece-gallery-next")
const pieceZoomTrigger = document.getElementById("piece-zoom-trigger")
const pieceTitle = document.getElementById("piece-title")
const pieceBadges = document.getElementById("piece-badges")
const pieceCode = document.getElementById("piece-code")
const pieceColors = document.getElementById("piece-colors")
const piecePrices = document.getElementById("piece-prices")
const pieceDescription = document.getElementById("piece-description")
const pieceSpecs = document.getElementById("piece-specs")
const pieceSpecsGrid = document.getElementById("piece-specs-grid")
const pieceCare = document.getElementById("piece-care")
const pieceCareBadge = document.getElementById("piece-care-badge")
const pieceCareTextEl = document.getElementById("piece-care-text")
const pieceCareCards = document.getElementById("piece-care-cards")
const pieceActions = document.getElementById("piece-actions")
const pieceWhatsapp = document.getElementById("piece-whatsapp")
const pieceShareWhatsapp = document.getElementById("piece-share-whatsapp")
const pieceCombinaWrap = document.getElementById("piece-combina-wrap")
const pieceCombinaTitle = document.getElementById("piece-combina-title")
const pieceCombinaContent = document.getElementById("piece-combina-content")
const pieceRelated = document.getElementById("piece-related")
const pieceBack = document.getElementById("piece-back")
const collectionsEl = document.querySelector(".catalog-collections")
const collectionBannerEl = document.getElementById("catalog-collection-banner")
const collectionBadgeEl = document.getElementById("catalog-collection-badge")
const collectionTitleEl = document.getElementById("catalog-collection-title")
const collectionDescEl = document.getElementById("catalog-collection-desc")
const headerFavBtn = document.getElementById("header-fav-btn")
const headerFavCount = document.getElementById("header-fav-count")
const colFavBtn = document.getElementById("col-filter-favoritos")
const colFavCount = document.getElementById("col-fav-count")
const catalogFavoritesBanner = document.getElementById("catalog-favorites-banner")
const productModalWhatsapp = document.getElementById("product-modal-whatsapp")
const productModalShareWhatsapp = document.getElementById("product-modal-share-whatsapp")
const productModalColors = document.getElementById("product-modal-colors")

// Zoom Modal Elements
const pieceZoomModal = document.getElementById("piece-zoom-modal")
const zoomImage = document.getElementById("zoom-image")
const zoomCloseBtn = document.getElementById("zoom-close-btn")
const zoomPrevBtn = document.getElementById("zoom-prev-btn")
const zoomNextBtn = document.getElementById("zoom-next-btn")
const zoomInBtn = document.getElementById("zoom-in-btn")
const zoomOutBtn = document.getElementById("zoom-out-btn")
const zoomResetBtn = document.getElementById("zoom-reset-btn")
const zoomLevelText = document.getElementById("zoom-level-text")
const zoomPhotoChip = document.getElementById("zoom-photo-chip")
const zoomCounter = document.getElementById("zoom-counter")
const zoomViewport = document.getElementById("zoom-viewport")

let pieceImageUrls = []
let pieceImageLabels = []
let currentPieceImageIndex = 0
let zoomScale = 1
let zoomTranslate = { x: 0, y: 0 }
let isZoomDragging = false
let zoomDragStart = { x: 0, y: 0 }

let selectedCategory = "Todos"
let categoryFilterSignature = ""
let colorId = ""
let minPrice = null
let maxPrice = null
let onlyAvailable = false
let onSaleOnly = false
let bestsellerTotals = null
const BESTSELLER_SORT = "bestsellers"
let pieceGroupKey = ""
let ignoreNextCardClick = false
let linkUtm = { utmSource: "", utmMedium: "", utmCampaign: "" }

let allComponents = []
let currentModalGroup = null

let allGroups = []
let activeCollections = []
let selectedCollectionSlug = ""
let selectedCodeByGroup = Object.create(null)
let componentsByProductCode = Object.create(null)
let imageUrlsByProductId = Object.create(null)
let modalImageUrls = []
let modalImageIndex = 0
let touchStartX = 0
let touchStartY = 0

let userFavorites = typeof loadStoredFavorites === "function" ? loadStoredFavorites(localStorage) : []
let onlyFavorites = false

function syncFavoritesUi() {
  const count = typeof countFavorites === "function" ? countFavorites(userFavorites) : userFavorites.length
  if (headerFavCount) {
    headerFavCount.textContent = String(count)
    headerFavCount.hidden = count === 0
  }
  if (headerFavBtn) {
    headerFavBtn.classList.toggle("is-active", onlyFavorites)
    headerFavBtn.setAttribute("aria-pressed", onlyFavorites ? "true" : "false")
  }
  if (colFavCount) {
    colFavCount.textContent = String(count)
  }

  document.querySelectorAll("[data-fav-code]").forEach((btn) => {
    const code = btn.getAttribute("data-fav-code")
    const isFav = typeof isProductFavorite === "function"
      ? isProductFavorite(code, userFavorites)
      : userFavorites.includes(code)
    btn.classList.toggle("is-favorited", isFav)
    btn.setAttribute("aria-label", isFav ? "Remover dos favoritos" : "Salvar nos favoritos")
    btn.setAttribute("title", isFav ? "Remover dos favoritos" : "Salvar nos favoritos")
    const icon = btn.querySelector(".fav-icon")
    if (icon) icon.textContent = isFav ? "♥" : "♡"
    const textSpan = btn.querySelector(".fav-text")
    if (textSpan) textSpan.textContent = isFav ? "Favoritado" : "Favoritar"
  })

  if (catalogFavoritesBanner) {
    catalogFavoritesBanner.hidden = !onlyFavorites
  }
}

function toggleFavorite(code) {
  if (!code) return
  if (typeof toggleFavoriteItem === "function") {
    const res = toggleFavoriteItem(code, userFavorites)
    userFavorites = res.favorites
    if (typeof saveStoredFavorites === "function") {
      saveStoredFavorites(userFavorites, localStorage)
    }
  } else {
    const idx = userFavorites.indexOf(code)
    if (idx >= 0) userFavorites.splice(idx, 1)
    else userFavorites.push(code)
    try { localStorage.setItem("maris_favoritos", JSON.stringify(userFavorites)) } catch {}
  }
  syncFavoritesUi()
  if (onlyFavorites) {
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
  const href = whatsappLink(CATALOG_WHATSAPP_MESSAGE)
  for (const id of ["catalog-whatsapp", "footer-whatsapp"]) {
    const link = document.getElementById(id)
    if (link) link.href = href
  }
}

function renderCategoryFilters() {
  const representatives = allGroups
    .map((group) => groupDisplayVariant(group, isCatalogProductAvailable)?.product)
    .filter(Boolean)
  const categories = visibleCategories(representatives)
  if (selectedCategory !== "Todos" && !categories.includes(selectedCategory)) {
    selectedCategory = "Todos"
  }
  const signature = ["Todos", ...categories].join("|")
  if (signature !== categoryFilterSignature) {
    categoryFilterSignature = signature
    const buttons = ["Todos", ...categories]
    catalogFiltersEl.innerHTML = buttons.map((name) => {
      const selected = name === selectedCategory
      return `<button type="button" class="catalog-filter${selected ? " is-selected" : ""}" data-category="${name}" aria-pressed="${selected ? "true" : "false"}">${name}</button>`
    }).join("")
    return
  }
  catalogFiltersEl.querySelectorAll("[data-category]").forEach((button) => {
    const selected = button.getAttribute("data-category") === selectedCategory
    button.classList.toggle("is-selected", selected)
    button.setAttribute("aria-pressed", selected ? "true" : "false")
  })
}

function getProductComponents(productCode) {
  return componentsByProductCode[productCode] || []
}

function getProductImageUrls(product) {
  const productId = Number(product?.id)
  const urlsFromTable = Number.isInteger(productId) ? (imageUrlsByProductId[productId] || []) : []
  if (urlsFromTable.length) return urlsFromTable
  const fallback = String(product?.image_url || "").trim()
  return fallback ? [fallback] : []
}

function setModalImageIndex(index) {
  if (!modalImageUrls.length) {
    productModalImage.src = ""
    productModalImage.alt = "Produto"
    productModalPrevBtn.disabled = true
    productModalNextBtn.disabled = true
    productModalDots.innerHTML = ""
    return
  }

  modalImageIndex = (index + modalImageUrls.length) % modalImageUrls.length
  productModalImage.src = modalImageUrls[modalImageIndex]
  productModalImage.alt = `${productModalTitle.textContent || "Produto"} (${modalImageIndex + 1}/${modalImageUrls.length})`
  productModalPrevBtn.disabled = modalImageUrls.length <= 1
  productModalNextBtn.disabled = modalImageUrls.length <= 1
  productModalDots.innerHTML = modalImageUrls
    .map((_, dotIndex) => `<button class="carousel-dot ${dotIndex === modalImageIndex ? "active" : ""}" data-index="${dotIndex}" type="button" aria-label="Ir para imagem ${dotIndex + 1}"></button>`)
    .join("")
}

// Com tipos: ignora estoque do pai; disponível se algum tipo tiver quantidade > 0.
// Sem tipos: usa apenas `product.quantity`.
// `components` opcional evita segundo lookup no mesmo render.
function isCatalogProductAvailable(product, components = null) {
  const list = components ?? getProductComponents(product.code)
  if (list.length > 0) {
    return list.some((c) => (Number(c.quantity) || 0) > 0)
  }
  return (Number(product.quantity) || 0) > 0
}

function findGroupByKey(key) {
  return allGroups.find((group) => group.key === key) || null
}

function colorSuffixes(id) {
  return COLOR_FILTERS.find((item) => item.id === id)?.suffixes || []
}

function selectedVariant(group) {
  const preferred = selectedCodeByGroup[group?.key]
  if (preferred) {
    const chosen = selectVariantByCode(group, isCatalogProductAvailable, preferred)
    const suffixes = colorSuffixes(colorId)
    if (!suffixes.length || suffixes.includes(chosen?.suffix)) return chosen
  }
  return displayVariantForFilters(group, { colorId }, isCatalogProductAvailable) || groupDisplayVariant(group, isCatalogProductAvailable)
}

function activeFilters() {
  const collection = selectedCollectionSlug
    ? (activeCollections || []).find((c) => c.slug === selectedCollectionSlug) || null
    : null
  return {
    term: getSearchTerm(),
    category: selectedCategory,
    minPrice,
    maxPrice,
    colorId,
    onlyAvailable,
    onSaleOnly,
    collection,
    favoritos: onlyFavorites,
    favoritesList: userFavorites,
  }
}

function currentPieceBase() {
  if (!pieceGroupKey) return ""
  return findGroupByKey(pieceGroupKey)?.base || ""
}

function syncCatalogUrl() {
  const next = buildCatalogQuery({
    categoria: selectedCategory,
    peca: currentPieceBase(),
    cor: colorId,
    ordem: getSortMode(),
    onSaleOnly,
    onlyAvailable,
    favoritos: onlyFavorites,
    colecao: selectedCollectionSlug,
    minPrice,
    maxPrice,
    busca: getSearchTerm(),
    utmSource: linkUtm.utmSource,
    utmMedium: linkUtm.utmMedium,
    utmCampaign: linkUtm.utmCampaign,
  })
  if ((location.search || "") === next) return
  history.replaceState(null, "", `${location.pathname}${next}`)
}

function renderCollectionBanner() {
  if (!collectionBannerEl) return
  const collection = selectedCollectionSlug
    ? (activeCollections || []).find((c) => c.slug === selectedCollectionSlug) || null
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
  const shown = (urls || []).filter(Boolean).slice(0, 2)
  if (!shown.length) return `<div class="product-media"><div class="product-photos product-photos-empty"></div></div>`
  const dots = shown.length > 1 ? `<div class="product-photo-dots" aria-hidden="true"><span></span><span></span></div>` : ""
  return `<div class="product-media"><div class="product-photos">${shown.map((url) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy">`).join("")}</div>${dots}</div>`
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
    ? isProductFavorite(product.code, userFavorites)
    : userFavorites.includes(product.code)

  const favBtnHtml = `
    <button type="button" class="product-favorite-btn${isFav ? " is-favorited" : ""}" data-fav-code="${escapeHtml(product.code)}" aria-label="${isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}" title="${isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}">
      <span class="fav-icon" aria-hidden="true">${isFav ? "♥" : "♡"}</span>
    </button>
  `

  // Com tipos: só abre o modal (estoque/venda são por tipo, não pelo pai).
  const actionHtml = soldOut
    ? `<button type="button" class="waitlist-card-btn" data-waitlist-code="${escapeHtml(product.code)}">Lista de espera</button>`
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
        <h3>${escapeHtml(product.name)}</h3>
        <div class="code">${escapeHtml(product.code)}</div>
        ${colorHtml ? `<div class="color-options" role="group" aria-label="Cor">${colorHtml}</div>` : ""}
        ${splitInfo}
        ${priceHtml}
        ${actionHtml}
      </div>
    </article>
  `
}

function renderModalComponentsRows(components) {
  if (!components.length) {
    productModalComponentsList.innerHTML = '<div class="component-col">Este produto não tem tipos cadastrados.</div>'
    return
  }

  productModalComponentsList.innerHTML = components.map((component) => {
    const componentQty = Number(component.quantity) || 0
    const isAvailable = componentQty > 0
    const actionBtn = isAvailable
      ? `<button type="button" class="modal-add-btn" data-add-component="${escapeHtml(component.id)}">+ Cesta</button>`
      : `<button type="button" class="modal-waitlist-btn" data-waitlist-component="${escapeHtml(component.id)}">Lista de espera</button>`
    const componentOnSale = hasPromo(component)
    const priceLabel = componentOnSale
      ? `Valor: ${window.MarisUI.renderPricePair(component.unit_price, effectivePrice(component))}`
      : `Valor: ${formatMoneyBRL(component.unit_price)}`
    return `
      <div class="component-row ${isAvailable ? "" : "is-unavailable"}">
        <div class="component-col">
          <strong>${escapeHtml(component.name)}</strong>
        </div>
        <div class="component-col ${isAvailable ? "" : "component-status-unavailable"}">${isAvailable ? priceLabel : "Indisponível"}</div>
        <div class="component-col component-actions">${actionBtn}</div>
      </div>
    `
  }).join("")
}

function renderModalActions(product, components, soldOut) {
  if (!productModalActions) return
  if (components.length) {
    productModalActions.innerHTML = ""
    return
  }
  if (soldOut) {
    productModalActions.innerHTML = `<button type="button" class="btn-primary modal-waitlist-btn" data-waitlist-code="${escapeHtml(product.code)}">Entrar na lista de espera</button>`
  } else {
    productModalActions.innerHTML = `<button type="button" class="btn-primary modal-add-btn" data-add-code="${escapeHtml(product.code)}">Adicionar à cesta</button>`
  }
}

const waitlistModal = document.getElementById("waitlist-modal")
const waitlistForm = document.getElementById("waitlist-form")
const waitlistNameInput = document.getElementById("waitlist-name")
const waitlistWhatsappInput = document.getElementById("waitlist-whatsapp")
const waitlistEmailInput = document.getElementById("waitlist-email")
const waitlistFeedbackEl = document.getElementById("waitlist-feedback")
const waitlistSubmitBtn = document.getElementById("waitlist-submit")

let pendingWaitlistItem = null

function setWaitlistFeedback(text, type = "") {
  window.MarisUI.setFeedback(waitlistFeedbackEl, text, type, { baseClass: "waitlist-feedback" })
}

function openWaitlistModal({ productCode = null, componentId = null }) {
  pendingWaitlistItem = { productCode, componentId }
  setWaitlistFeedback("")
  const buyer = window.MarisCatalogCart?.getBuyerProfile?.()
  if (buyer) {
    if (waitlistNameInput) waitlistNameInput.value = buyer.name || ""
    if (waitlistWhatsappInput) waitlistWhatsappInput.value = buyer.whatsapp || ""
    if (waitlistEmailInput) waitlistEmailInput.value = buyer.email || ""
  }
  waitlistModal.hidden = false
  if (waitlistEmailInput) waitlistEmailInput.focus()
  else if (waitlistNameInput) waitlistNameInput.focus()
}

function closeWaitlistModal() {
  waitlistModal.hidden = true
  pendingWaitlistItem = null
}

function joinWaitlist({ productCode = null, componentId = null }) {
  openWaitlistModal({ productCode, componentId })
}

async function submitWaitlist() {
  if (!pendingWaitlistItem) return
  const email = (waitlistEmailInput?.value || "").trim().toLowerCase()
  const name = (waitlistNameInput?.value || "").trim()
  const rawWhatsapp = (waitlistWhatsappInput?.value || "").trim()
  const whatsapp = window.MarisUtils.onlyDigits(rawWhatsapp)

  if (!email && !whatsapp) {
    setWaitlistFeedback("Informe seu e-mail para receber o aviso de reposição.", "error")
    return
  }

  if (email) {
    const isEmailValid = typeof validateEmail === "function"
      ? validateEmail(email)
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!isEmailValid) {
      setWaitlistFeedback("Informe um e-mail válido (ex.: seu@email.com).", "error")
      return
    }
  }

  if (whatsapp && whatsapp.length < 10) {
    setWaitlistFeedback("WhatsApp incompleto. Digite com DDD (ex.: 11 99999-9999).", "error")
    return
  }

  window.MarisCatalogCart?.saveBuyerProfile?.({ name, whatsapp, email })

  const payload = typeof formatRestockAlertPayload === "function"
    ? formatRestockAlertPayload({
        email,
        name,
        whatsapp,
        productCode: pendingWaitlistItem.productCode,
        componentId: pendingWaitlistItem.componentId,
      })
    : {
        buyer_email: email,
        buyer_name: name || (email ? "Cliente" : ""),
        buyer_whatsapp: whatsapp,
        product_code: pendingWaitlistItem.productCode,
        component_id: pendingWaitlistItem.componentId,
      }

  waitlistSubmitBtn.disabled = true
  waitlistSubmitBtn.textContent = "Cadastrando aviso…"
  try {
    const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("customer-waitlist-add"), {
      body: payload
    })
    if (!ok) {
      setWaitlistFeedback(data.error || "Não foi possível cadastrar seu aviso.", "error")
      return
    }
    closeWaitlistModal()
    setCatalogFeedback("Aviso cadastrado! Enviaremos uma notificação assim que a peça voltar ao estoque.", "success")
  } catch {
    setWaitlistFeedback("Erro de conexão. Tente novamente.", "error")
  } finally {
    waitlistSubmitBtn.disabled = false
    waitlistSubmitBtn.textContent = "Cadastrar aviso"
  }
}

function openProductModal(group) {
  if (!group) return
  currentModalGroup = group
  const variant = selectedVariant(group)
  const product = variant?.product
  if (!product) return

  const components = getProductComponents(product.code)
  const available = isCatalogProductAvailable(product, components)
  const soldOut = !available
  modalImageUrls = getProductImageUrls(product)
  modalImageIndex = 0

  productModalTitle.textContent = product.name || "Produto"
  if (productModalColors) productModalColors.innerHTML = renderColorOptions(group, product.code)
  if (productModalWhatsapp) {
    productModalWhatsapp.href = whatsappLink(productWhatsappMessage(product.name))
  }
  if (productModalShareWhatsapp) {
    const shareText = buildProductShareText(product, { code: product.code, origin: window.location.origin })
    productModalShareWhatsapp.href = buildWhatsappShareLink(shareText)
  }
  const modalOgMeta = buildProductOgMetadata(product, {
    code: product.code,
    origin: window.location.origin,
    image: modalImageUrls[0]
  })
  updateOpenGraphTags(modalOgMeta)
  setModalImageIndex(0)
  productModalCode.textContent = ""
  if (components.length) {
    productModalPrice.innerHTML = "Preço: consulte os valores dos tipos"
  } else if (soldOut) {
    productModalPrice.innerHTML = "Preço: Em falta"
  } else {
    productModalPrice.innerHTML = renderOfferHtml(product)
  }
  productModalStock.textContent = ""
  productModalStatus.textContent = ""
  if (!available) {
    productModalStatus.textContent = "Encomende com o vendedor"
  } else if (components.length) {
    productModalStatus.textContent = "Pode ser comprado separado."
  }

  renderModalComponentsRows(components)
  renderModalActions(product, components, soldOut)

  productModal.hidden = false
}

function closeProductModal() {
  productModal.hidden = true
  currentModalGroup = null
  if (!piecePage || piecePage.hidden) {
    updateOpenGraphTags(buildProductOgMetadata(null, { origin: window.location.origin }))
  }
}

function chooseGroupColor(groupKey, code) {
  if (!groupKey || !code) return
  selectedCodeByGroup[groupKey] = code
  const group = findGroupByKey(groupKey)
  if (pieceGroupKey === groupKey && group) openPiecePage(group)
  else renderCatalogGrids()
  if (group && currentModalGroup?.key === groupKey) openProductModal(group)
}

function renderPieceActions(product, components, soldOut) {
  const isFav = typeof isProductFavorite === "function"
    ? isProductFavorite(product?.code, userFavorites)
    : userFavorites.includes(product?.code)

  const favBtnHtml = `
    <button type="button" class="piece-fav-btn${isFav ? " is-favorited" : ""}" data-fav-code="${escapeHtml(product?.code)}" aria-label="${isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}" title="${isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}">
      <span class="fav-icon" aria-hidden="true">${isFav ? "♥" : "♡"}</span>
      <span class="fav-text">${isFav ? "Favoritado" : "Favoritar"}</span>
    </button>
  `

  let primaryActionHtml = ""
  if (soldOut) {
    primaryActionHtml = `<button type="button" class="waitlist-card-btn" data-waitlist-code="${escapeHtml(product.code)}">Lista de espera</button>`
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
  pieceGroupKey = group.key
  const variant = selectedVariant(group)
  const product = variant?.product
  if (!product) return
  const components = getProductComponents(product.code)
  const soldOut = !isCatalogProductAvailable(product, components)
  pieceImageUrls = getProductImageUrls(product)
  pieceImageLabels = getPiecePhotoLabels(pieceImageUrls)
  currentPieceImageIndex = 0

  pieceGallery.innerHTML = pieceImageUrls.length
    ? pieceImageUrls.map((url, i) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(product.name || "Peça")}" data-index="${i}" loading="${i === 0 ? "eager" : "lazy"}">`).join("")
    : ""

  if (pieceImageUrls.length > 1) {
    if (pieceGalleryThumbs) {
      pieceGalleryThumbs.hidden = false
      pieceGalleryThumbs.innerHTML = pieceImageUrls.map((url, i) => `
        <button type="button" class="piece-gallery-thumb${i === 0 ? " is-active" : ""}" data-thumb-index="${i}" aria-label="Ver foto ${i + 1}: ${escapeHtml(pieceImageLabels[i]?.label || "")}">
          <img src="${escapeHtml(url)}" alt="Miniatura ${i + 1}">
        </button>
      `).join("")
    }
    if (pieceGalleryBadge) {
      pieceGalleryBadge.hidden = false
      pieceGalleryBadge.textContent = pieceImageLabels[0]?.label || "Principal"
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
  if (pieceBadges) pieceBadges.innerHTML = renderNoteBadges(product, soldOut)
  pieceCode.textContent = product.code || ""
  pieceColors.innerHTML = renderColorOptions(group, product.code)
  piecePrices.innerHTML = components.length
    ? ""
    : soldOut
      ? `<div class="price unavailable">Em falta</div>`
      : renderOfferHtml(product)
  const description = productDescriptionText(product)
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
    image: pieceImageUrls[0]
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
      const matching = combinaGroups(allGroups, group, isCatalogProductAvailable, 4)
      if (matching.length > 0) {
        if (pieceCombinaTitle) pieceCombinaTitle.textContent = "Combina com"
        if (pieceCombinaContent) {
          pieceCombinaContent.className = "catalog"
          pieceCombinaContent.innerHTML = matching.map(renderCatalogGroup).join("")
        }
        pieceCombinaWrap.hidden = false
      } else {
        pieceCombinaWrap.hidden = true
        if (pieceCombinaContent) pieceCombinaContent.innerHTML = ""
      }
    }
  }
  const related = relatedGroups(allGroups, group, isCatalogProductAvailable, 4)
  pieceRelated.innerHTML = related.length
    ? related.map(renderCatalogGroup).join("")
    : `<p class="piece-related-empty">Nenhuma outra peça desta categoria agora.</p>`
  if (pieceBack) {
    const backQuery = buildCatalogQuery({
      categoria: selectedCategory,
      utmSource: linkUtm.utmSource,
      utmMedium: linkUtm.utmMedium,
      utmCampaign: linkUtm.utmCampaign,
    })
    pieceBack.href = `${location.pathname}${backQuery}`
  }
  piecePage.hidden = false
  catalogEl.hidden = true
  unavailableProductsSection.hidden = true
  syncCatalogUrl()
  window.scrollTo(0, 0)
}

function closePiecePage() {
  closeZoomModal()
  pieceGroupKey = ""
  if (piecePage) piecePage.hidden = true
  if (pieceCombinaWrap) pieceCombinaWrap.hidden = true
  updateOpenGraphTags(buildProductOgMetadata(null, { origin: window.location.origin }))
  syncCatalogUrl()
  renderCatalogGrids()
}

function applyCatalogLink() {
  const link = readCatalogLink(location.search)
  linkUtm = {
    utmSource: link.utmSource,
    utmMedium: link.utmMedium,
    utmCampaign: link.utmCampaign,
  }
  selectedCategory = link.categoria
  selectedCollectionSlug = link.colecao || ""
  colorId = link.cor || ""
  if (link.ordem && catalogSortSelect) {
    catalogSortSelect.value = link.ordem
  }
  onSaleOnly = Boolean(link.onSaleOnly)
  onlyAvailable = Boolean(link.onlyAvailable)
  onlyFavorites = Boolean(link.favoritos)
  minPrice = link.minPrice
  maxPrice = link.maxPrice
  if (link.busca && catalogSearchInput) {
    catalogSearchInput.value = link.busca
    syncSearchClearButton()
  }
  syncDrawerInputs()
  renderColorFilters()
  syncCollectionPressed()

  if (!link.peca) {
    pieceGroupKey = ""
    if (piecePage) piecePage.hidden = true
    if (pieceCombinaWrap) pieceCombinaWrap.hidden = true
    syncCatalogUrl()
    renderCatalogGrids()
    return
  }
  const resolved = resolvePieceLink(allGroups, link.peca, isCatalogProductAvailable)
  if (resolved.kind === "piece") {
    selectedCodeByGroup[resolved.group.key] = resolved.variant.product.code
    openPiecePage(resolved.group)
    return
  }
  pieceGroupKey = ""
  if (piecePage) piecePage.hidden = true
  if (pieceCombinaWrap) pieceCombinaWrap.hidden = true
  if (resolved.kind === "soldout") selectedCategory = normalizeCategoryParam(resolved.category)
  syncCatalogUrl()
  renderCatalogGrids()
}

function renderCatalogGrids() {
  clearCatalogLoading()
  const term = getSearchTerm()
  const sortMode = getSortMode()

  renderCategoryFilters()
  renderActiveFilters()
  syncDrawerInputs()
  renderCollectionBanner()
  syncFavoritesUi()

  const filters = activeFilters()
  const partitioned = filterAndPartitionCatalog(allGroups, filters, isCatalogProductAvailable)
  const sortList = (groups) => sortMode === BESTSELLER_SORT && bestsellerTotals
    ? sortGroupsByBestsellers(groups, bestsellerTotals)
    : sortGroupsForCatalog(groups, sortMode, isCatalogProductAvailable, filters)
  const availFiltered = sortList(partitioned.available)
  const unavailFiltered = sortList(partitioned.soldOut)
  if (pieceGroupKey && piecePage && !piecePage.hidden) {
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
        : selectedCategory !== "Todos"
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

async function loadCatalogData() {
  showCatalogLoading()
  const [productsResponse, componentsResponse, imagesResponse, collectionsResponse] = await Promise.all([
    window.MarisCatalogRead.selectProducts(supabaseClient)
      .order("quantity", { ascending: false })
      .order("name"),
    window.MarisCatalogRead.selectPricedComponents(supabaseClient).order("name"),
    window.MarisCatalogRead.selectImages(supabaseClient).order("sort_order", { ascending: true }),
    window.MarisCatalogRead.selectCollections
      ? window.MarisCatalogRead.selectCollections(supabaseClient).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
  ])

  const { data, error } = productsResponse
  const { data: componentsData, error: componentsError } = componentsResponse
  const { data: imagesData, error: imagesError } = imagesResponse
  activeCollections = Array.isArray(collectionsResponse?.data) ? collectionsResponse.data : []

  if (error || componentsError || imagesError) {
    allGroups = []
    clearCatalogLoading()
    catalogEl.hidden = false
    catalogEl.innerHTML = "Erro ao carregar produtos"
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    console.log(error || componentsError || imagesError)
    return
  }

  componentsByProductCode = window.MarisUtils.groupByKey(
    window.MarisUtils.mapPricedComponents(componentsData || []),
    (c) => c.product_code
  )
  imageUrlsByProductId = Object.create(null)
  for (const row of imagesData || []) {
    const productId = Number(row.product_id)
    const imageUrl = String(row.image_url || "").trim()
    if (!Number.isInteger(productId) || !imageUrl) continue
    if (!Array.isArray(imageUrlsByProductId[productId])) imageUrlsByProductId[productId] = []
    imageUrlsByProductId[productId].push(imageUrl)
  }

  if (!data?.length) {
    allGroups = []
    clearCatalogLoading()
    catalogEl.hidden = false
    catalogEl.innerHTML = "Nenhum produto encontrado"
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    renderCollectionChips()
    return
  }

  allGroups = groupProductsByColor(data)
  selectedCodeByGroup = Object.create(null)
  renderColorFilters()
  renderCollectionChips()

  allComponents = componentsData || []
  if (window.MarisCatalogCart) {
    const imagesByCode = Object.create(null)
    for (const product of data || []) {
      const code = String(product?.code || "")
      if (!code) continue
      const urls = getProductImageUrls(product)
      if (urls.length) imagesByCode[code] = urls[0]
    }
    window.MarisCatalogCart.setCatalogData({ products: data, components: allComponents, imagesByCode })
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
  const sort = getSortMode()
  collectionsEl?.querySelectorAll("[data-collection]").forEach((el) => {
    const name = el.getAttribute("data-collection")
    const selected = (name === "promocoes" && onSaleOnly)
      || (name === "novidades" && !onSaleOnly && sort === "created_desc")
      || (name === "mais-vendidas" && sort === BESTSELLER_SORT)
      || (name === "favoritos" && onlyFavorites)
    el.classList.toggle("is-selected", selected)
    el.setAttribute("aria-pressed", selected ? "true" : "false")
  })
  collectionsEl?.querySelectorAll("[data-collection-slug]").forEach((el) => {
    const slug = el.getAttribute("data-collection-slug")
    const selected = Boolean(selectedCollectionSlug && slug === selectedCollectionSlug)
    el.classList.toggle("is-selected", selected)
    el.setAttribute("aria-pressed", selected ? "true" : "false")
  })
}

function renderCollectionChips() {
  if (!collectionsEl) return
  collectionsEl.querySelectorAll("[data-collection-slug]").forEach((el) => el.remove())
  for (const c of activeCollections || []) {
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
  bestsellerTotals = null
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
    bestsellerTotals = totals
    setBestsellersVisible(true)
  } catch (error) {
    bestsellerTotals = null
    setBestsellersVisible(false)
    console.warn("Mais vendidas indisponível", error)
  }
}

function handleProductClick(target) {
  const productCard = target.closest(".product[data-group-key]")
  if (!productCard) return
  openPiecePage(findGroupByKey(productCard.getAttribute("data-group-key")))
}

async function handleCatalogGridClick(event) {
  if (ignoreNextCardClick) {
    ignoreNextCardClick = false
    return
  }
  const favBtn = event.target.closest("[data-fav-code]")
  if (favBtn) {
    event.stopPropagation()
    const code = favBtn.getAttribute("data-fav-code")
    toggleFavorite(code)
    return
  }
  const emptySeeAll = event.target.closest("#empty-fav-see-all")
  if (emptySeeAll) {
    event.stopPropagation()
    onlyFavorites = false
    syncCollectionPressed()
    refreshAfterFilterChange()
    return
  }
  const colorBtn = event.target.closest("[data-color-code]")
  if (colorBtn) {
    event.stopPropagation()
    const card = colorBtn.closest("[data-group-key]")
    chooseGroupColor(card?.getAttribute("data-group-key") || pieceGroupKey, colorBtn.getAttribute("data-color-code"))
    return
  }
  const waitlistBtn = event.target.closest("[data-waitlist-code]")
  if (waitlistBtn) {
    event.stopPropagation()
    joinWaitlist({ productCode: waitlistBtn.getAttribute("data-waitlist-code") })
    return
  }
  const waitComp = event.target.closest("[data-waitlist-component]")
  if (waitComp) {
    event.stopPropagation()
    joinWaitlist({ componentId: Number(waitComp.getAttribute("data-waitlist-component")) })
    return
  }
  const viewTypesBtn = event.target.closest("[data-view-code]")
  if (viewTypesBtn) {
    event.stopPropagation()
    const card = viewTypesBtn.closest("[data-group-key]")
    openProductModal(findGroupByKey(card?.getAttribute("data-group-key") || pieceGroupKey))
    return
  }
  const addComp = event.target.closest("[data-add-component]")
  if (addComp) {
    event.stopPropagation()
    const compId = Number(addComp.getAttribute("data-add-component"))
    const result = await window.MarisCatalogCart?.addComponent(compId, 1)
    notifyCartAdd(result, "Peça")
    return
  }
  const addBtn = event.target.closest("[data-add-code]")
  if (addBtn) {
    event.stopPropagation()
    const code = addBtn.getAttribute("data-add-code")
    // Produtos com tipos não devem ir para a cesta pelo pai.
    if (getProductComponents(code).length) {
      const card = addBtn.closest("[data-group-key]")
      openProductModal(findGroupByKey(card?.getAttribute("data-group-key")))
      return
    }
    const result = await window.MarisCatalogCart?.addProduct(code, 1)
    notifyCartAdd(result, "Produto")
    return
  }
  handleProductClick(event.target)
}

catalogEl.addEventListener("click", handleCatalogGridClick)
unavailableProductsGrid.addEventListener("click", handleCatalogGridClick)

productModal.addEventListener("click", async (event) => {
  const favBtn = event.target.closest("[data-fav-code]")
  if (favBtn) {
    const code = favBtn.getAttribute("data-fav-code")
    toggleFavorite(code)
    return
  }
  const colorBtn = event.target.closest("[data-color-code]")
  if (colorBtn && currentModalGroup) {
    chooseGroupColor(currentModalGroup.key, colorBtn.getAttribute("data-color-code"))
    return
  }
  const addCode = event.target.closest("[data-add-code]")
  if (addCode) {
    const result = await window.MarisCatalogCart?.addProduct(addCode.getAttribute("data-add-code"), 1)
    notifyCartAdd(result, "Produto")
    return
  }
  const addComp = event.target.closest("[data-add-component]")
  if (addComp) {
    const result = await window.MarisCatalogCart?.addComponent(Number(addComp.getAttribute("data-add-component")), 1)
    notifyCartAdd(result, "Tipo")
    return
  }
  const waitCode = event.target.closest("[data-waitlist-code]")
  if (waitCode) {
    joinWaitlist({ productCode: waitCode.getAttribute("data-waitlist-code") })
    return
  }
  const waitComp = event.target.closest("[data-waitlist-component]")
  if (waitComp) {
    joinWaitlist({ componentId: Number(waitComp.getAttribute("data-waitlist-component")) })
    return
  }
  const closeBtn = event.target.closest("#product-modal-close")
  if (closeBtn) {
    closeProductModal()
    return
  }
  const target = event.target
  if (target instanceof HTMLElement && target.dataset.closeModal === "true") {
    closeProductModal()
  }
})

function setPieceGalleryIndex(index) {
  if (!pieceImageUrls.length) return
  const max = pieceImageUrls.length - 1
  currentPieceImageIndex = Math.max(0, Math.min(max, index))
  const width = pieceGallery?.clientWidth || 300
  pieceGallery?.scrollTo({ left: currentPieceImageIndex * width, behavior: "smooth" })

  if (pieceGalleryThumbs) {
    pieceGalleryThumbs.querySelectorAll(".piece-gallery-thumb").forEach((thumb, i) => {
      thumb.classList.toggle("is-active", i === currentPieceImageIndex)
    })
  }
  if (pieceGalleryBadge) {
    pieceGalleryBadge.textContent = pieceImageLabels[currentPieceImageIndex]?.label || "Foto"
  }
}

function updateZoomView() {
  if (!zoomImage) return
  zoomImage.style.transform = `translate(${zoomTranslate.x}px, ${zoomTranslate.y}px) scale(${zoomScale})`
  if (zoomLevelText) zoomLevelText.textContent = `${Math.round(zoomScale * 100)}%`
  if (zoomPhotoChip) {
    zoomPhotoChip.textContent = pieceImageLabels[currentPieceImageIndex]?.label || "Principal"
  }
  if (zoomCounter) {
    zoomCounter.textContent = `${currentPieceImageIndex + 1} / ${pieceImageUrls.length}`
  }
}

function openZoomModal(index = currentPieceImageIndex) {
  if (!pieceZoomModal || !pieceImageUrls.length) return
  currentPieceImageIndex = Math.max(0, Math.min(pieceImageUrls.length - 1, index))
  zoomScale = 1
  zoomTranslate = { x: 0, y: 0 }
  if (zoomImage) zoomImage.src = pieceImageUrls[currentPieceImageIndex]
  updateZoomView()
  if (zoomPrevBtn) zoomPrevBtn.hidden = pieceImageUrls.length <= 1
  if (zoomNextBtn) zoomNextBtn.hidden = pieceImageUrls.length <= 1
  pieceZoomModal.hidden = false
  document.body.style.overflow = "hidden"
}

function closeZoomModal() {
  if (!pieceZoomModal) return
  pieceZoomModal.hidden = true
  document.body.style.overflow = ""
}

function zoomIn() {
  zoomScale = Math.min(3, zoomScale + 0.5)
  updateZoomView()
}

function zoomOut() {
  zoomScale = Math.max(1, zoomScale - 0.5)
  if (zoomScale <= 1) zoomTranslate = { x: 0, y: 0 }
  updateZoomView()
}

function zoomReset() {
  zoomScale = 1
  zoomTranslate = { x: 0, y: 0 }
  updateZoomView()
}

// Listeners da galeria na página da peça
if (pieceGallery) {
  let scrollTimeout = null
  pieceGallery.addEventListener("scroll", () => {
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      const width = pieceGallery.clientWidth
      if (!width) return
      const idx = Math.round(pieceGallery.scrollLeft / width)
      if (idx !== currentPieceImageIndex && idx >= 0 && idx < pieceImageUrls.length) {
        currentPieceImageIndex = idx
        if (pieceGalleryThumbs) {
          pieceGalleryThumbs.querySelectorAll(".piece-gallery-thumb").forEach((thumb, i) => {
            thumb.classList.toggle("is-active", i === idx)
          })
        }
        if (pieceGalleryBadge) {
          pieceGalleryBadge.textContent = pieceImageLabels[idx]?.label || "Foto"
        }
      }
    }, 60)
  }, { passive: true })

  pieceGallery.addEventListener("click", (event) => {
    const img = event.target.closest("img")
    if (img) openZoomModal(currentPieceImageIndex)
  })
}

if (pieceGalleryPrev) {
  pieceGalleryPrev.addEventListener("click", () => setPieceGalleryIndex(currentPieceImageIndex - 1))
}
if (pieceGalleryNext) {
  pieceGalleryNext.addEventListener("click", () => setPieceGalleryIndex(currentPieceImageIndex + 1))
}
if (pieceZoomTrigger) {
  pieceZoomTrigger.addEventListener("click", () => openZoomModal(currentPieceImageIndex))
}
if (pieceGalleryThumbs) {
  pieceGalleryThumbs.addEventListener("click", (event) => {
    const thumb = event.target.closest("[data-thumb-index]")
    if (thumb) {
      setPieceGalleryIndex(Number(thumb.dataset.thumbIndex))
    }
  })
}

// Listeners do modal de Zoom Lightbox
if (zoomCloseBtn) zoomCloseBtn.addEventListener("click", closeZoomModal)
if (pieceZoomModal) {
  pieceZoomModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeZoom === "true") closeZoomModal()
  })
}
if (zoomInBtn) zoomInBtn.addEventListener("click", zoomIn)
if (zoomOutBtn) zoomOutBtn.addEventListener("click", zoomOut)
if (zoomResetBtn) zoomResetBtn.addEventListener("click", zoomReset)

if (zoomPrevBtn) {
  zoomPrevBtn.addEventListener("click", () => {
    if (currentPieceImageIndex > 0) {
      currentPieceImageIndex--
      if (zoomImage) zoomImage.src = pieceImageUrls[currentPieceImageIndex]
      zoomScale = 1
      zoomTranslate = { x: 0, y: 0 }
      updateZoomView()
      setPieceGalleryIndex(currentPieceImageIndex)
    }
  })
}
if (zoomNextBtn) {
  zoomNextBtn.addEventListener("click", () => {
    if (currentPieceImageIndex < pieceImageUrls.length - 1) {
      currentPieceImageIndex++
      if (zoomImage) zoomImage.src = pieceImageUrls[currentPieceImageIndex]
      zoomScale = 1
      zoomTranslate = { x: 0, y: 0 }
      updateZoomView()
      setPieceGalleryIndex(currentPieceImageIndex)
    }
  })
}

if (zoomViewport) {
  zoomViewport.addEventListener("wheel", (event) => {
    event.preventDefault()
    if (event.deltaY < 0) zoomIn()
    else zoomOut()
  }, { passive: false })

  const startDrag = (x, y) => {
    if (zoomScale <= 1) return
    isZoomDragging = true
    zoomDragStart = { x: x - zoomTranslate.x, y: y - zoomTranslate.y }
    zoomViewport.classList.add("is-dragging")
  }

  const moveDrag = (x, y) => {
    if (!isZoomDragging) return
    zoomTranslate = { x: x - zoomDragStart.x, y: y - zoomDragStart.y }
    updateZoomView()
  }

  const endDrag = () => {
    isZoomDragging = false
    zoomViewport.classList.remove("is-dragging")
  }

  zoomViewport.addEventListener("mousedown", (e) => startDrag(e.clientX, e.clientY))
  window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY))
  window.addEventListener("mouseup", endDrag)

  zoomViewport.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY)
  }, { passive: true })
  zoomViewport.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY)
  }, { passive: true })
  zoomViewport.addEventListener("touchend", endDrag)
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (pieceZoomModal && !pieceZoomModal.hidden) {
      closeZoomModal()
      return
    }
    if (!productModal.hidden) {
      closeProductModal()
    }
  } else if (event.key === "ArrowLeft" && pieceZoomModal && !pieceZoomModal.hidden) {
    if (currentPieceImageIndex > 0) {
      currentPieceImageIndex--
      if (zoomImage) zoomImage.src = pieceImageUrls[currentPieceImageIndex]
      zoomScale = 1
      zoomTranslate = { x: 0, y: 0 }
      updateZoomView()
      setPieceGalleryIndex(currentPieceImageIndex)
    }
  } else if (event.key === "ArrowRight" && pieceZoomModal && !pieceZoomModal.hidden) {
    if (currentPieceImageIndex < pieceImageUrls.length - 1) {
      currentPieceImageIndex++
      if (zoomImage) zoomImage.src = pieceImageUrls[currentPieceImageIndex]
      zoomScale = 1
      zoomTranslate = { x: 0, y: 0 }
      updateZoomView()
      setPieceGalleryIndex(currentPieceImageIndex)
    }
  }
})

if (productModalCloseBtn) {
  productModalCloseBtn.addEventListener("click", closeProductModal)
}
productModalPrevBtn.addEventListener("click", () => setModalImageIndex(modalImageIndex - 1))
productModalNextBtn.addEventListener("click", () => setModalImageIndex(modalImageIndex + 1))
productModalDots.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const index = Number(target.dataset.index)
  if (!Number.isInteger(index)) return
  setModalImageIndex(index)
})

if (productModalCarousel) {
  productModalCarousel.addEventListener("touchstart", (event) => {
    if (!event.touches.length) return
    touchStartX = event.touches[0].clientX
    touchStartY = event.touches[0].clientY
  }, { passive: true })

  productModalCarousel.addEventListener("touchend", (event) => {
    if (!event.changedTouches.length || modalImageUrls.length <= 1) return
    const endX = event.changedTouches[0].clientX
    const endY = event.changedTouches[0].clientY
    const deltaX = endX - touchStartX
    const deltaY = endY - touchStartY

    // Ignore vertical scroll gestures and very short horizontal drags.
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return
    if (deltaX < 0) setModalImageIndex(modalImageIndex + 1)
    else setModalImageIndex(modalImageIndex - 1)
  }, { passive: true })
}

function renderSearchSuggestions() {
  if (!catalogSearchSuggestionsEl) return
  const query = getSearchTerm()
  const suggestions = getSearchSuggestions(allGroups, query, 6)
  if (!suggestions.length) {
    catalogSearchSuggestionsEl.hidden = true
    catalogSearchSuggestionsEl.innerHTML = ""
    return
  }

  if (!query) {
    catalogSearchSuggestionsEl.innerHTML = `
      <div class="catalog-suggestion-header">Sugestões rápidas</div>
      <div class="catalog-suggestion-chips">
        ${suggestions.map((s) => `
          <button type="button" class="catalog-suggestion-chip" data-suggestion-kind="${escapeHtml(s.kind)}" data-suggestion-value="${escapeHtml(s.value)}">
            ${escapeHtml(s.text)}
          </button>
        `).join("")}
      </div>
    `
  } else {
    catalogSearchSuggestionsEl.innerHTML = `
      <div class="catalog-suggestion-header">Sugestões</div>
      <div class="catalog-suggestion-list">
        ${suggestions.map((s) => {
          const badge = s.kind === "category" ? "Categoria" : s.kind === "collection" ? "Coleção" : "Peça"
          return `
            <button type="button" class="catalog-suggestion-item" data-suggestion-kind="${escapeHtml(s.kind)}" data-suggestion-value="${escapeHtml(s.value)}" ${s.groupKey ? `data-group-key="${escapeHtml(s.groupKey)}"` : ""}>
              <span class="catalog-suggestion-text">${escapeHtml(s.text)}</span>
              <span class="catalog-suggestion-badge">${badge}</span>
            </button>
          `
        }).join("")}
      </div>
    `
  }
  catalogSearchSuggestionsEl.hidden = false
}

function closeSearchSuggestions() {
  if (catalogSearchSuggestionsEl) catalogSearchSuggestionsEl.hidden = true
}

function syncSearchClearButton() {
  if (catalogSearchClearBtn) catalogSearchClearBtn.hidden = !catalogSearchInput?.value
}

if (catalogSearchInput) {
  window.MarisUI.bindDebouncedSearch(catalogSearchInput, () => {
    syncSearchClearButton()
    renderCatalogGrids()
  }, { debounceMs: 120 })

  catalogSearchInput.addEventListener("input", () => {
    syncSearchClearButton()
    renderSearchSuggestions()
  })

  catalogSearchInput.addEventListener("focus", () => {
    renderSearchSuggestions()
  })

  catalogSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSearchSuggestions()
    }
  })
}

catalogSearchClearBtn?.addEventListener("click", () => {
  if (catalogSearchInput) {
    catalogSearchInput.value = ""
    syncSearchClearButton()
    closeSearchSuggestions()
    renderCatalogGrids()
    catalogSearchInput.focus()
  }
})

catalogSearchSuggestionsEl?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-suggestion-kind]")
  if (!btn) return
  const kind = btn.getAttribute("data-suggestion-kind")
  const val = btn.getAttribute("data-suggestion-value")
  const groupKey = btn.getAttribute("data-group-key")

  closeSearchSuggestions()

  if (kind === "collection") {
    if (catalogSearchInput) catalogSearchInput.value = ""
    syncSearchClearButton()
    if (val === "novidades" && catalogSortSelect) {
      catalogSortSelect.value = "created_desc"
      onSaleOnly = false
    } else if (val === "promocoes") {
      onSaleOnly = true
    }
    syncCollectionPressed()
    refreshAfterFilterChange()
    return
  }

  if (kind === "category") {
    if (catalogSearchInput) catalogSearchInput.value = ""
    syncSearchClearButton()
    selectedCategory = val
    refreshAfterFilterChange()
    return
  }

  if (kind === "product") {
    const group = findGroupByKey(groupKey)
    if (group) {
      openPiecePage(group)
      return
    }
    const txt = btn.querySelector(".catalog-suggestion-text")?.textContent || val
    if (catalogSearchInput) {
      catalogSearchInput.value = txt
      syncSearchClearButton()
      renderCatalogGrids()
    }
  }
})

document.addEventListener("click", (event) => {
  if (!productSearchContainer?.contains(event.target)) {
    closeSearchSuggestions()
  }
})

if (catalogSortSelect) {
  catalogSortSelect.addEventListener("change", () => {
    if (getSortMode() === BESTSELLER_SORT) onSaleOnly = false
    syncCollectionPressed()
    renderCatalogGrids()
  })
}

function renderColorFilters() {
  if (!colorFiltersEl) return
  const options = [{ id: "", label: "Todas as cores" }, ...COLOR_FILTERS]
  colorFiltersEl.innerHTML = options.map((item) => {
    const selected = item.id === colorId
    return `<button type="button" class="catalog-filter${selected ? " is-selected" : ""}" data-color-filter="${item.id}" aria-pressed="${selected ? "true" : "false"}">${item.label}</button>`
  }).join("")
}

function readDrawerFilters() {
  minPrice = parsePriceBound(minPriceInput?.value)
  maxPrice = parsePriceBound(maxPriceInput?.value)
  onlyAvailable = Boolean(onlyAvailableInput?.checked)
  onlyFavorites = Boolean(filterOnlyFavoritesInput?.checked)
  onSaleOnly = Boolean(filterOnSaleInput?.checked)
}

function syncDrawerInputs() {
  if (minPriceInput) minPriceInput.value = minPrice != null ? String(minPrice).replace(".", ",") : ""
  if (maxPriceInput) maxPriceInput.value = maxPrice != null ? String(maxPrice).replace(".", ",") : ""
  if (onlyAvailableInput) onlyAvailableInput.checked = Boolean(onlyAvailable)
  if (filterOnlyFavoritesInput) filterOnlyFavoritesInput.checked = Boolean(onlyFavorites)
  if (filterOnSaleInput) filterOnSaleInput.checked = Boolean(onSaleOnly)

  if (priceRangePresetsEl) {
    priceRangePresetsEl.querySelectorAll(".price-preset-chip").forEach((chip) => {
      const pMin = chip.getAttribute("data-min") ? Number(chip.getAttribute("data-min")) : null
      const pMax = chip.getAttribute("data-max") ? Number(chip.getAttribute("data-max")) : null
      const isActive = minPrice === pMin && maxPrice === pMax
      chip.classList.toggle("is-active", isActive)
      chip.setAttribute("aria-pressed", isActive ? "true" : "false")
    })
  }
}

function renderActiveFilters() {
  const filters = activeFilters()
  const count = countActiveFilters(filters)

  if (catalogFiltersCountEl) {
    catalogFiltersCountEl.textContent = String(count)
    catalogFiltersCountEl.hidden = count === 0
  }

  if (!catalogActiveFiltersBar || !catalogActivePills) return

  const pills = getActiveFilterPills(filters)
  if (!pills.length) {
    catalogActiveFiltersBar.hidden = true
    catalogActivePills.innerHTML = ""
    return
  }

  catalogActivePills.innerHTML = pills.map((p) => `
    <button type="button" class="catalog-active-pill" data-pill-type="${escapeHtml(p.type)}" aria-label="Remover filtro ${escapeHtml(p.label)}">
      <span>${escapeHtml(p.label)}</span>
      <span class="pill-remove" aria-hidden="true">×</span>
    </button>
  `).join("")
  catalogActiveFiltersBar.hidden = false
}

function clearAllFilters() {
  selectedCategory = "Todos"
  selectedCollectionSlug = ""
  colorId = ""
  minPrice = null
  maxPrice = null
  onlyAvailable = false
  onlyFavorites = false
  onSaleOnly = false
  if (catalogSearchInput) {
    catalogSearchInput.value = ""
    syncSearchClearButton()
  }
  syncDrawerInputs()
  renderColorFilters()
  syncCollectionPressed()
  refreshAfterFilterChange()
}

function setDrawerOpen(open) {
  catalogDrawer?.classList.toggle("is-open", Boolean(open))
}

function refreshAfterFilterChange() {
  if (pieceGroupKey) closePiecePage()
  else {
    syncCatalogUrl()
    renderCatalogGrids()
  }
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
    if (Math.abs(photos.scrollLeft - start) > 6) ignoreNextCardClick = true
  })
}

if (catalogFiltersEl) {
  catalogFiltersEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]")
    if (!button) return
    selectedCategory = button.getAttribute("data-category") || "Todos"
    refreshAfterFilterChange()
  })
}

document.getElementById("catalog-filters-open")?.addEventListener("click", () => setDrawerOpen(true))
document.getElementById("catalog-filters-close")?.addEventListener("click", () => setDrawerOpen(false))
document.getElementById("catalog-filters-apply")?.addEventListener("click", () => {
  readDrawerFilters()
  setDrawerOpen(false)
  refreshAfterFilterChange()
})
catalogFiltersClearBtn?.addEventListener("click", () => {
  clearAllFilters()
  setDrawerOpen(false)
})
catalogActiveClearAllBtn?.addEventListener("click", () => {
  clearAllFilters()
})
catalogActivePills?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-pill-type]")
  if (!btn) return
  const type = btn.getAttribute("data-pill-type")
  if (type === "category") selectedCategory = "Todos"
  else if (type === "collection") selectedCollectionSlug = ""
  else if (type === "color") colorId = ""
  else if (type === "price") {
    minPrice = null
    maxPrice = null
  } else if (type === "onSale") onSaleOnly = false
  else if (type === "onlyAvailable") onlyAvailable = false
  else if (type === "favoritos") onlyFavorites = false
  else if (type === "term") {
    if (catalogSearchInput) {
      catalogSearchInput.value = ""
      syncSearchClearButton()
    }
  }
  syncDrawerInputs()
  renderColorFilters()
  syncCollectionPressed()
  refreshAfterFilterChange()
})
priceRangePresetsEl?.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-preset-id]")
  if (!chip) return
  const pMin = chip.getAttribute("data-min") ? Number(chip.getAttribute("data-min")) : null
  const pMax = chip.getAttribute("data-max") ? Number(chip.getAttribute("data-max")) : null

  if (minPrice === pMin && maxPrice === pMax) {
    minPrice = null
    maxPrice = null
  } else {
    minPrice = pMin
    maxPrice = pMax
  }
  syncDrawerInputs()
  refreshAfterFilterChange()
})
catalogDrawer?.addEventListener("click", (event) => {
  const target = event.target
  if (target instanceof HTMLElement && target.dataset.closeDrawer === "true") setDrawerOpen(false)
})
minPriceInput?.addEventListener("change", () => {
  readDrawerFilters()
  refreshAfterFilterChange()
})
maxPriceInput?.addEventListener("change", () => {
  readDrawerFilters()
  refreshAfterFilterChange()
})
filterOnSaleInput?.addEventListener("change", () => {
  readDrawerFilters()
  syncCollectionPressed()
  refreshAfterFilterChange()
})
onlyAvailableInput?.addEventListener("change", () => {
  readDrawerFilters()
  refreshAfterFilterChange()
})
filterOnlyFavoritesInput?.addEventListener("change", () => {
  readDrawerFilters()
  syncCollectionPressed()
  refreshAfterFilterChange()
})
colorFiltersEl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-color-filter]")
  if (!button) return
  colorId = button.getAttribute("data-color-filter") || ""
  renderColorFilters()
  refreshAfterFilterChange()
})
collectionsEl?.addEventListener("click", (event) => {
  const dynamicBtn = event.target.closest("[data-collection-slug]")
  if (dynamicBtn) {
    const slug = dynamicBtn.getAttribute("data-collection-slug") || ""
    selectedCollectionSlug = selectedCollectionSlug === slug ? "" : slug
    syncCollectionPressed()
    refreshAfterFilterChange()
    return
  }
  const button = event.target.closest("[data-collection]")
  if (!button || button.disabled) return
  const kind = button.getAttribute("data-collection")
  if (kind === "favoritos") {
    onlyFavorites = !onlyFavorites
  }
  if (kind === "mais-vendidas" && catalogSortSelect) {
    if (!bestsellerTotals) return
    catalogSortSelect.value = catalogSortSelect.value === BESTSELLER_SORT ? "name_asc" : BESTSELLER_SORT
    onSaleOnly = false
  }
  if (kind === "novidades" && catalogSortSelect) {
    catalogSortSelect.value = "created_desc"
    onSaleOnly = false
  }
  if (kind === "promocoes") {
    onSaleOnly = !onSaleOnly
    if (onSaleOnly && catalogSortSelect?.value === BESTSELLER_SORT) catalogSortSelect.value = "name_asc"
  }
  syncCollectionPressed()
  refreshAfterFilterChange()
})
headerFavBtn?.addEventListener("click", () => {
  onlyFavorites = !onlyFavorites
  syncCollectionPressed()
  refreshAfterFilterChange()
})
pieceBack?.addEventListener("click", (event) => {
  event.preventDefault()
  closePiecePage()
})
piecePage?.addEventListener("click", handleCatalogGridClick)
bindPhotoSwipe(catalogEl)
bindPhotoSwipe(unavailableProductsGrid)
bindPhotoSwipe(pieceRelated)
bindPhotoSwipe(pieceCombinaContent)
window.addEventListener("popstate", () => applyCatalogLink())
renderColorFilters()

bindStoreWhatsappLinks()

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

bindShareButton(pieceShareWhatsapp, () => {
  const group = findGroupByKey(pieceGroupKey)
  return selectedVariant(group)?.product
})

bindShareButton(productModalShareWhatsapp, () => {
  return selectedVariant(currentModalGroup)?.product
})

waitlistForm.addEventListener("submit", (event) => {
  event.preventDefault()
  submitWaitlist()
})

waitlistModal.addEventListener("click", (event) => {
  const target = event.target
  if (target instanceof HTMLElement && target.dataset.closeWaitlist === "true") {
    closeWaitlistModal()
  }
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !waitlistModal.hidden) {
    closeWaitlistModal()
  }
})

loadCatalogData()