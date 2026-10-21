import { installGradeUi } from "./catalogo.grade.ui.js"
import { installModalUi } from "./catalogo.modal.ui.js"
import { installPecaUi } from "./catalogo.peca.ui.js"
import { installDadosUi } from "./catalogo.dados.ui.js"
import { installFiltrosUi } from "./catalogo.filtros.ui.js"
import { installGestosUi } from "./catalogo.gestos.ui.js"

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
  renderCategoryFilterButtons,
  renderCatalogIdentityHtml,
  renderCatalogPhotoStrip,
  renderSearchSuggestionsHtml,
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
  if (window.MarisLoading?.skeletonCatalogGrid) {
    catalogEl.innerHTML = window.MarisLoading.skeletonCatalogGrid(8)
  } else {
    catalogEl.innerHTML = loadingMarkup({ size: "md", block: true })
  }
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

const estado = {
  pieceImageUrls: [],
  pieceImageLabels: [],
  currentPieceImageIndex: 0,
  zoomScale: 1,
  zoomTranslate: { x: 0, y: 0 },
  isZoomDragging: false,
  zoomDragStart: { x: 0, y: 0 },
  selectedCategory: "Todos",
  categoryFilterSignature: "",
  colorId: "",
  minPrice: null,
  maxPrice: null,
  onlyAvailable: false,
  onSaleOnly: false,
  bestsellerTotals: null,
  pieceGroupKey: "",
  ignoreNextCardClick: false,
  linkUtm: { utmSource: "", utmMedium: "", utmCampaign: "" },
  allComponents: [],
  currentModalGroup: null,
  allGroups: [],
  activeCollections: [],
  selectedCollectionSlug: "",
  selectedCodeByGroup: Object.create(null),
  componentsByProductCode: Object.create(null),
  imageUrlsByProductId: Object.create(null),
  modalImageUrls: [],
  modalImageIndex: 0,
  touchStartX: 0,
  touchStartY: 0,
  userFavorites: typeof loadStoredFavorites === "function" ? loadStoredFavorites(localStorage) : [],
  onlyFavorites: false,
  pendingWaitlistItem: null,
}

let handleCatalogGridClick
let toggleFavorite
let chooseGroupColor
let notifyCartAdd
let joinWaitlist
let closeProductModal
let openZoomModal
let setPieceGalleryIndex
let closeZoomModal
let zoomIn
let zoomOut
let zoomReset
let updateZoomView
let setModalImageIndex
let syncSearchClearButton
let renderCatalogGrids
let renderSearchSuggestions
let closeSearchSuggestions
let syncCollectionPressed
let refreshAfterFilterChange
let findGroupByKey
let openPiecePage
let getSortMode
let setDrawerOpen
let readDrawerFilters
let clearAllFilters
let syncDrawerInputs
let renderColorFilters
let closePiecePage
let bindPhotoSwipe
let applyCatalogLink
let bindStoreWhatsappLinks
let bindShareButton
let selectedVariant
let submitWaitlist
let closeWaitlistModal
let loadCatalogData
















const BESTSELLER_SORT = "bestsellers"











































// Com tipos: ignora estoque do pai; disponível se algum tipo tiver quantidade > 0.
// Sem tipos: usa apenas `product.quantity`.
// `components` opcional evita segundo lookup no mesmo render.
































const waitlistModal = document.getElementById("waitlist-modal")
const waitlistForm = document.getElementById("waitlist-form")
const waitlistNameInput = document.getElementById("waitlist-name")
const waitlistWhatsappInput = document.getElementById("waitlist-whatsapp")
const waitlistEmailInput = document.getElementById("waitlist-email")
const waitlistFeedbackEl = document.getElementById("waitlist-feedback")
const waitlistSubmitBtn = document.getElementById("waitlist-submit")













































const catalogoDeps = {
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
  productModalImage,
  productModalPrevBtn,
  productModalNextBtn,
  productModalDots,
  productModalTitle,
  productModalComponentsList,
  productModalActions,
  waitlistFeedbackEl,
  waitlistNameInput,
  waitlistWhatsappInput,
  waitlistEmailInput,
  waitlistModal,
  validateEmail,
  formatRestockAlertPayload,
  waitlistSubmitBtn,
  productModalColors,
  productModalWhatsapp,
  productWhatsappMessage,
  productModalShareWhatsapp,
  buildProductShareText,
  buildWhatsappShareLink,
  buildProductOgMetadata,
  updateOpenGraphTags,
  productModalCode,
  productModalPrice,
  productModalStock,
  productModalStatus,
  productModal,
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
  pieceShareWhatsapp,
  pieceCombinaWrap,
  pieceCombinaTitle,
  pieceCombinaContent,
  renderCombinaComponentCard,
  combinaGroups,
  relatedGroups,
  pieceRelated,
  pieceBack,
  zoomImage,
  zoomLevelText,
  zoomPhotoChip,
  zoomCounter,
  pieceZoomModal,
  zoomPrevBtn,
  zoomNextBtn,
  readCatalogLink,
  resolvePieceLink,
  normalizeCategoryParam,
  showCatalogLoading,
  supabaseClient,
  groupProductsByColor,
  collectionsEl,
  totalsByProductCode,
  catalogSearchSuggestionsEl,
  getSearchSuggestions,
  renderSearchSuggestionsHtml,
  catalogSearchClearBtn,
  colorFiltersEl,
  parsePriceBound,
  minPriceInput,
  maxPriceInput,
  onlyAvailableInput,
  filterOnlyFavoritesInput,
  filterOnSaleInput,
  priceRangePresetsEl,
  countActiveFilters,
  catalogFiltersCountEl,
  catalogActiveFiltersBar,
  catalogActivePills,
  getActiveFilterPills,
  catalogDrawer,
}
Object.assign(catalogoDeps,
  installGradeUi(catalogoDeps),
  installModalUi(catalogoDeps),
  installPecaUi(catalogoDeps),
  installDadosUi(catalogoDeps),
  installFiltrosUi(catalogoDeps),
  installGestosUi(catalogoDeps))
handleCatalogGridClick = catalogoDeps.handleCatalogGridClick
toggleFavorite = catalogoDeps.toggleFavorite
chooseGroupColor = catalogoDeps.chooseGroupColor
notifyCartAdd = catalogoDeps.notifyCartAdd
joinWaitlist = catalogoDeps.joinWaitlist
closeProductModal = catalogoDeps.closeProductModal
openZoomModal = catalogoDeps.openZoomModal
setPieceGalleryIndex = catalogoDeps.setPieceGalleryIndex
closeZoomModal = catalogoDeps.closeZoomModal
zoomIn = catalogoDeps.zoomIn
zoomOut = catalogoDeps.zoomOut
zoomReset = catalogoDeps.zoomReset
updateZoomView = catalogoDeps.updateZoomView
setModalImageIndex = catalogoDeps.setModalImageIndex
syncSearchClearButton = catalogoDeps.syncSearchClearButton
renderCatalogGrids = catalogoDeps.renderCatalogGrids
renderSearchSuggestions = catalogoDeps.renderSearchSuggestions
closeSearchSuggestions = catalogoDeps.closeSearchSuggestions
syncCollectionPressed = catalogoDeps.syncCollectionPressed
refreshAfterFilterChange = catalogoDeps.refreshAfterFilterChange
findGroupByKey = catalogoDeps.findGroupByKey
openPiecePage = catalogoDeps.openPiecePage
getSortMode = catalogoDeps.getSortMode
setDrawerOpen = catalogoDeps.setDrawerOpen
readDrawerFilters = catalogoDeps.readDrawerFilters
clearAllFilters = catalogoDeps.clearAllFilters
syncDrawerInputs = catalogoDeps.syncDrawerInputs
renderColorFilters = catalogoDeps.renderColorFilters
closePiecePage = catalogoDeps.closePiecePage
bindPhotoSwipe = catalogoDeps.bindPhotoSwipe
applyCatalogLink = catalogoDeps.applyCatalogLink
bindStoreWhatsappLinks = catalogoDeps.bindStoreWhatsappLinks
bindShareButton = catalogoDeps.bindShareButton
selectedVariant = catalogoDeps.selectedVariant
submitWaitlist = catalogoDeps.submitWaitlist
closeWaitlistModal = catalogoDeps.closeWaitlistModal
loadCatalogData = catalogoDeps.loadCatalogData

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
  if (colorBtn && estado.currentModalGroup) {
    chooseGroupColor(estado.currentModalGroup.key, colorBtn.getAttribute("data-color-code"))
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















// Listeners da galeria na página da peça
if (pieceGallery) {
  let scrollTimeout = null
  pieceGallery.addEventListener("scroll", () => {
    if (scrollTimeout) clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      const width = pieceGallery.clientWidth
      if (!width) return
      const idx = Math.round(pieceGallery.scrollLeft / width)
      if (idx !== estado.currentPieceImageIndex && idx >= 0 && idx < estado.pieceImageUrls.length) {
        estado.currentPieceImageIndex = idx
        if (pieceGalleryThumbs) {
          pieceGalleryThumbs.querySelectorAll(".piece-gallery-thumb").forEach((thumb, i) => {
            thumb.classList.toggle("is-active", i === idx)
          })
        }
        if (pieceGalleryBadge) {
          pieceGalleryBadge.textContent = estado.pieceImageLabels[idx]?.label || "Foto"
        }
      }
    }, 60)
  }, { passive: true })

  pieceGallery.addEventListener("click", (event) => {
    const img = event.target.closest("img")
    if (img) openZoomModal(estado.currentPieceImageIndex)
  })
}

if (pieceGalleryPrev) {
  pieceGalleryPrev.addEventListener("click", () => setPieceGalleryIndex(estado.currentPieceImageIndex - 1))
}
if (pieceGalleryNext) {
  pieceGalleryNext.addEventListener("click", () => setPieceGalleryIndex(estado.currentPieceImageIndex + 1))
}
if (pieceZoomTrigger) {
  pieceZoomTrigger.addEventListener("click", () => openZoomModal(estado.currentPieceImageIndex))
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
    if (estado.currentPieceImageIndex > 0) {
      estado.currentPieceImageIndex--
      if (zoomImage) zoomImage.src = estado.pieceImageUrls[estado.currentPieceImageIndex]
      estado.zoomScale = 1
      estado.zoomTranslate = { x: 0, y: 0 }
      updateZoomView()
      setPieceGalleryIndex(estado.currentPieceImageIndex)
    }
  })
}
if (zoomNextBtn) {
  zoomNextBtn.addEventListener("click", () => {
    if (estado.currentPieceImageIndex < estado.pieceImageUrls.length - 1) {
      estado.currentPieceImageIndex++
      if (zoomImage) zoomImage.src = estado.pieceImageUrls[estado.currentPieceImageIndex]
      estado.zoomScale = 1
      estado.zoomTranslate = { x: 0, y: 0 }
      updateZoomView()
      setPieceGalleryIndex(estado.currentPieceImageIndex)
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
    if (estado.zoomScale <= 1) return
    estado.isZoomDragging = true
    estado.zoomDragStart = { x: x - estado.zoomTranslate.x, y: y - estado.zoomTranslate.y }
    zoomViewport.classList.add("is-dragging")
  }

  const moveDrag = (x, y) => {
    if (!estado.isZoomDragging) return
    estado.zoomTranslate = { x: x - estado.zoomDragStart.x, y: y - estado.zoomDragStart.y }
    updateZoomView()
  }

  const endDrag = () => {
    estado.isZoomDragging = false
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
    if (estado.currentPieceImageIndex > 0) {
      estado.currentPieceImageIndex--
      if (zoomImage) zoomImage.src = estado.pieceImageUrls[estado.currentPieceImageIndex]
      estado.zoomScale = 1
      estado.zoomTranslate = { x: 0, y: 0 }
      updateZoomView()
      setPieceGalleryIndex(estado.currentPieceImageIndex)
    }
  } else if (event.key === "ArrowRight" && pieceZoomModal && !pieceZoomModal.hidden) {
    if (estado.currentPieceImageIndex < estado.pieceImageUrls.length - 1) {
      estado.currentPieceImageIndex++
      if (zoomImage) zoomImage.src = estado.pieceImageUrls[estado.currentPieceImageIndex]
      estado.zoomScale = 1
      estado.zoomTranslate = { x: 0, y: 0 }
      updateZoomView()
      setPieceGalleryIndex(estado.currentPieceImageIndex)
    }
  }
})

if (productModalCloseBtn) {
  productModalCloseBtn.addEventListener("click", closeProductModal)
}
productModalPrevBtn.addEventListener("click", () => setModalImageIndex(estado.modalImageIndex - 1))
productModalNextBtn.addEventListener("click", () => setModalImageIndex(estado.modalImageIndex + 1))
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
    estado.touchStartX = event.touches[0].clientX
    estado.touchStartY = event.touches[0].clientY
  }, { passive: true })

  productModalCarousel.addEventListener("touchend", (event) => {
    if (!event.changedTouches.length || estado.modalImageUrls.length <= 1) return
    const endX = event.changedTouches[0].clientX
    const endY = event.changedTouches[0].clientY
    const deltaX = endX - estado.touchStartX
    const deltaY = endY - estado.touchStartY

    // Ignore vertical scroll gestures and very short horizontal drags.
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return
    if (deltaX < 0) setModalImageIndex(estado.modalImageIndex + 1)
    else setModalImageIndex(estado.modalImageIndex - 1)
  }, { passive: true })
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
      estado.onSaleOnly = false
    } else if (val === "promocoes") {
      estado.onSaleOnly = true
    }
    syncCollectionPressed()
    refreshAfterFilterChange()
    return
  }

  if (kind === "category") {
    if (catalogSearchInput) catalogSearchInput.value = ""
    syncSearchClearButton()
    estado.selectedCategory = val
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
    if (getSortMode() === BESTSELLER_SORT) estado.onSaleOnly = false
    syncCollectionPressed()
    renderCatalogGrids()
  })
}

















if (catalogFiltersEl) {
  catalogFiltersEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]")
    if (!button) return
    estado.selectedCategory = button.getAttribute("data-category") || "Todos"
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
  if (type === "category") estado.selectedCategory = "Todos"
  else if (type === "collection") estado.selectedCollectionSlug = ""
  else if (type === "color") estado.colorId = ""
  else if (type === "price") {
    estado.minPrice = null
    estado.maxPrice = null
  } else if (type === "onSale") estado.onSaleOnly = false
  else if (type === "onlyAvailable") estado.onlyAvailable = false
  else if (type === "favoritos") estado.onlyFavorites = false
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

  if (estado.minPrice === pMin && estado.maxPrice === pMax) {
    estado.minPrice = null
    estado.maxPrice = null
  } else {
    estado.minPrice = pMin
    estado.maxPrice = pMax
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
  estado.colorId = button.getAttribute("data-color-filter") || ""
  renderColorFilters()
  refreshAfterFilterChange()
})
collectionsEl?.addEventListener("click", (event) => {
  const dynamicBtn = event.target.closest("[data-collection-slug]")
  if (dynamicBtn) {
    const slug = dynamicBtn.getAttribute("data-collection-slug") || ""
    estado.selectedCollectionSlug = estado.selectedCollectionSlug === slug ? "" : slug
    syncCollectionPressed()
    refreshAfterFilterChange()
    return
  }
  const button = event.target.closest("[data-collection]")
  if (!button || button.disabled) return
  const kind = button.getAttribute("data-collection")
  if (kind === "favoritos") {
    estado.onlyFavorites = !estado.onlyFavorites
  }
  if (kind === "mais-vendidas" && catalogSortSelect) {
    if (!estado.bestsellerTotals) return
    catalogSortSelect.value = catalogSortSelect.value === BESTSELLER_SORT ? "name_asc" : BESTSELLER_SORT
    estado.onSaleOnly = false
  }
  if (kind === "novidades" && catalogSortSelect) {
    catalogSortSelect.value = "created_desc"
    estado.onSaleOnly = false
  }
  if (kind === "promocoes") {
    estado.onSaleOnly = !estado.onSaleOnly
    if (estado.onSaleOnly && catalogSortSelect?.value === BESTSELLER_SORT) catalogSortSelect.value = "name_asc"
  }
  syncCollectionPressed()
  refreshAfterFilterChange()
})
headerFavBtn?.addEventListener("click", () => {
  estado.onlyFavorites = !estado.onlyFavorites
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



bindShareButton(pieceShareWhatsapp, () => {
  const group = findGroupByKey(estado.pieceGroupKey)
  return selectedVariant(group)?.product
})

bindShareButton(productModalShareWhatsapp, () => {
  return selectedVariant(estado.currentModalGroup)?.product
})

waitlistForm.addEventListener("submit", (event) => {
  event.preventDefault()
  submitWaitlist()
})

const waitlistForgetBtn = document.getElementById("waitlist-forget")
if (waitlistForgetBtn) {
  waitlistForgetBtn.addEventListener("click", () => {
    window.MarisCatalogCart?.forgetBuyerProfile?.()
    if (waitlistNameInput) waitlistNameInput.value = ""
    if (waitlistWhatsappInput) waitlistWhatsappInput.value = ""
    if (waitlistEmailInput) waitlistEmailInput.value = ""
    const rememberEl = document.getElementById("waitlist-remember")
    if (rememberEl) rememberEl.checked = false
  })
}

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