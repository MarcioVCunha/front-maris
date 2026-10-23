import {
  archivePayload,
  buildAddProductPayload,
  buildProductUpdatePayload,
  componentUpdatePayload,
  dashboardView,
  defaultsFor,
  downloadCsvFile,
  fieldPlaceholder,
  generateSalesCsv,
  isComponentSku,
  currentMonthKey,
  isDashboardAdmin,
  isPanelLink,
  navHtml,
  nextPackagingValues,
  formatPrice,
  normalizeOverview,
  normalizeRecentSales,
  normalizeSellersMonth,
  packagingValues,
  renderAddForm,
  renderArchiveDialog,
  renderImportHelp,
  renderInicio,
  renderPieceForm,
  inStockProducts,
  outOfStockProducts,
  renderStockList,
  renderStockPage,
  renderStockBatchBar,
  renderBatchArchiveDialog,
  renderBatchQuantityDialog,
  renderBatchPriceDialog,
  renderProductHistoryDialog,
  renderVendas,
  renderVendedoras,
  renderCompras,
  sellersFromDirectory,
  shouldShowDashboard,
  shouldShowFab,
  stepMonth,
  stockNavHtml,
  STOCK_PAGE_SIZE,
  validateAddProduct,
  validateProductUpdate,
  renderShortcutsDialog,
  resolveKeyboardShortcut,
  visibleStock
} from "./painel.logic.js"
import {
  ADMIN_SALE_EDIT_ENABLED,
  filterSalesBySeller,
  filterSalesByStatus,
  normalizeAdminSale,
  readSaleEditForm,
  renderSaleCards,
  renderSaleEditDialog,
  saleCancelPayload,
  saleMarkPaidPayload,
  saleUpdatePayload,
  confirmOrderPayload,
  returnOrderItemsPayload,
  normalizeExpiringOrders,
  renderExpiringOrderCards,
  renderShippingToggle,
  shouldShowSaleEdit
} from "./venda-edicao.logic.js"
import {
  ADMIN_CONJUNTOS_ENABLED,
  readDivisionRows,
  renderConjuntoCreatePicker,
  renderConjuntoEditDialog,
  renderConjuntosPage,
  renderStockByType,
  saveDivisionsPayload,
  shouldShowConjuntos,
  validateDivisionsPayload
} from "./conjuntos.logic.js"
import {
  addProduct,
  archiveProduct,
  cancelAdminSale,
  fetchAdminSale,
  fetchCategoryDefaults,
  fetchMonthOverview,
  fetchRecentSales,
  fetchExpiringOrders,
  confirmOrder,
  returnOrderItems,
  fetchShippingSettings,
  saveShippingSettings,
  fetchSellersMonth,
  importProducts,
  listProducts,
  markAdminSalePaid,
  saveProductDivisions,
  updateAdminSale,
  updateComponentSku,
  updateProduct,
  fetchCollectionList,
  saveCollection,
  deleteCollection,
  fetchPromotions,
  savePromotion,
  endPromotion,
  setMonthlyGoal,
  triggerWeeklySummaryEmail,
  fetchPurchasesOverview,
  batchProducts,
  fetchProductHistory,
  fetchCoupons,
  saveCoupon,
  toggleCoupon,
  createReferralCode,
  fetchReferrals,
  fetchCustomerReviews,
  resolveCustomerReview
} from "./painel.api.js"
import {
  renderCouponsPage,
  renderCouponDialogContent,
  renderReferralCodeDialogContent,
  validateCouponPayload,
  validateReferralCodePayload
} from "./cupons.logic.js"
import {
  normalizeReviewList,
  renderReviewDialog,
  renderReviewError,
  renderReviewPage,
  resolveReviewBody
} from "./painel.cadastros.logic.js"
import {
  filterCollections,
  filterProductsForPicker,
  renderCollectionEditDialog,
  renderCollectionsPage,
  renderCollectionPieceSuggestions,
  renderSelectedPieceChips,
  slugify,
  validateCollectionPayload
} from "./colecoes.logic.js"
import {
  PROMO_CATEGORIES,
  computePromotionStatus,
  filterPromotions,
  renderPromoCard,
  renderPromotionsPage,
  promoPriceExample,
  renderPromoDialogContent,
  validatePromotionPayload as validatePromoPayload
} from "../estoque/promocoes/promocoes.logic.js"
import { loadingHtml, skeletonAdminDashboardHtml } from "../../compartilhado/loading.js"
import {
  formatImageFailuresWarning,
  formatImportErrorMessage,
  formatImportSuccessMessage,
  parseImportJsonText,
  parseImportFileContent,
  validatePreviewItems,
  updatePreviewItem,
  removePreviewItem,
  filterPreviewItems,
  buildImportPayloadFromPreview,
  renderImportPreviewView,
  renderImportUploadBlock,
  renderImportResultView,
  escapeHtml
} from "../estoque/importar/importar.logic.js"

import { installConjuntosUi } from "./painel.conjuntos.ui.js"
import { installColecoesUi } from "./painel.colecoes.ui.js"
import { installPromocoesUi } from "./painel.promocoes.ui.js"
import { installCuponsUi } from "./painel.cupons.ui.js"
import { installImportarUi } from "./painel.importar.ui.js"
import { installEstoqueUi } from "./painel.estoque.ui.js"
import { installHomeUi } from "./painel.home.ui.js"

function viewLoading(view = state?.view) {
  if (typeof skeletonAdminDashboardHtml === "function") {
    return skeletonAdminDashboardHtml(view)
  }
  return loadingHtml({ block: true, size: "md" })
}

const TITLES = {
  inicio: "Início",
  estoque: "Peças",
  esgotadas: "Esgotadas",
  vendas: "Vendas",
  vendedoras: "Vendedoras",
  compras: "Compras",
  colecoes: "Coleções",
  promocoes: "Promoções",
  cupons: "Cupons & Indicação",
  cadastros: "Revisar cadastros",
  peca: "Editar peça",
  conjuntos: "Conjuntos",
  adicionar: "Adicionar peça",
  importar: "Importar"
}

const PLACEHOLDER_IDS = [
  ["descricao", "descricao"],
  ["peso", "peso_g"],
  ["largura", "largura_cm"],
  ["altura", "altura_cm"],
  ["comprimento", "comprimento_cm"]
]

const PACKAGING_IDS = [
  ["peso", "peso_g"],
  ["largura", "largura_cm"],
  ["altura", "altura_cm"],
  ["comprimento", "comprimento_cm"]
]

let addPackagingSuggested = packagingValues({})

const viewEl = document.getElementById("view")
const messageEl = document.getElementById("message")
const stockNav = document.getElementById("stock-nav")
const dashNav = document.getElementById("dash-nav")
const titleEl = document.getElementById("view-title")
const dialog = document.getElementById("archive-dialog")
const saleDialog = document.getElementById("sale-dialog")
const pieceDialog = document.getElementById("piece-dialog")
const fabRoot = document.getElementById("fab-root")
const fabToggle = document.getElementById("fab-toggle")
const fabMenu = document.getElementById("fab-menu")

let undoTimer = null
let undoAction = null
const conjuntoDialog = document.getElementById("conjunto-dialog")
const collectionDialog = document.getElementById("collection-dialog")
const promoDialog = document.getElementById("promo-dialog")
const batchDialog = document.getElementById("batch-dialog")
const historyDialog = document.getElementById("history-dialog")
const couponDialog = document.getElementById("coupon-dialog")
const referralCodeDialog = document.getElementById("referral-code-dialog")
const reviewDialog = document.getElementById("review-dialog")

const state = {
  products: [],
  productsLoaded: false,
  defaults: {},
  defaultsLoaded: false,
  piece: null,
  stockQuery: "",
  stockLimit: STOCK_PAGE_SIZE,
  selectedStockCodes: new Set(),
  overview: undefined,
  recent: undefined,
  sellers: undefined,
  selectedChannel: null,
  selectedSellerId: null,
  selectedSaleStatus: "all",
  loadedStatus: "all",
  conjuntoQuery: "",
  collections: undefined,
  collectionQuery: "",
  collectionEditing: null,
  collectionSelectedCodes: [],
  promotions: undefined,
  promoQuery: "",
  promoStatusFilter: "all",
  promoEditing: null,
  coupons: undefined,
  referrals: undefined,
  reviews: undefined,
  reviewPending: 0,
  reviewCountKnown: false,
  reviewNotice: "",
  couponTab: "coupons",
  couponQuery: "",
  couponStatus: "all",
  referralQuery: "",
  referralStatus: "all",
  selectedMonth: null,
  staleOnly: false,
  purchases: undefined,
  purchasesMonth: undefined,
  importItems: null,
  importQuery: "",
  importIsSubmitting: false,
  importResult: null
}

const saleCancelBox = { pending: null }

let openHistoryDialog
let loadOverview
let loadRecent
let paintInicio
let paintVendas
let loadSellers
let paintVendedoras
let loadPurchases
let paintCompras
let paintStock
let bindStockOnce
let bindConjuntos
let loadCollections
let paintColecoes
let loadPromotions
let paintPromocoes
let openPromoEditDialog
let loadCoupons
let loadReferrals
let paintCupons
let paintImportar

function clearUndo() {
  if (undoTimer) clearTimeout(undoTimer)
  undoTimer = null
  undoAction = null
  if (saleCancelBox.pending) {
    void commitPendingSaleCancel()
  }
}

function showMessage(text, kind, options = {}) {
  clearUndo()
  messageEl.hidden = !text
  messageEl.className = kind ? `note ${kind}` : "note"
  messageEl.replaceChildren()
  if (!text) return
  const span = document.createElement("span")
  span.textContent = text
  messageEl.appendChild(span)
  if (typeof options.undo?.run === "function") {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "note__undo"
    btn.textContent = options.undo.label || "Desfazer"
    undoAction = options.undo.run
    btn.addEventListener("click", async () => {
      const run = undoAction
      undoAction = null
      if (run) await run()
      clearUndo()
      messageEl.hidden = true
      messageEl.replaceChildren()
    })
    messageEl.appendChild(btn)
    const ms = options.undo.ms == null ? 8000 : Number(options.undo.ms)
    if (ms > 0) {
      undoTimer = setTimeout(() => {
        clearUndo()
        messageEl.hidden = true
        messageEl.replaceChildren()
      }, ms)
    }
  }
}

function closeFabMenu() {
  if (!fabMenu || !fabToggle) return
  fabMenu.hidden = true
  fabToggle.setAttribute("aria-expanded", "false")
}

function paintFab(view) {
  if (!fabRoot) return
  fabRoot.hidden = !shouldShowFab(view)
  if (fabRoot.hidden) closeFabMenu()
}

function bindFabOnce() {
  if (!fabToggle || fabToggle.dataset.bound === "1") return
  fabToggle.dataset.bound = "1"
  fabToggle.addEventListener("click", () => {
    const open = fabMenu.hidden
    fabMenu.hidden = !open
    fabToggle.setAttribute("aria-expanded", open ? "true" : "false")
  })
  fabMenu?.addEventListener("click", (event) => {
    const link = event.target.closest?.("[data-fab]")
    if (!link) return
    closeFabMenu()
    if (link.getAttribute("data-fab") === "peca") {
      event.preventDefault()
      navigate("/admin/adicionar")
    }
  })
  document.addEventListener("click", (event) => {
    if (!fabRoot || fabRoot.hidden || fabMenu.hidden) return
    if (fabRoot.contains(event.target)) return
    closeFabMenu()
  })
}

function bindShortcutsOnce() {
  const dialog = document.getElementById("shortcuts-dialog")
  if (dialog && !dialog.dataset.bound) {
    dialog.dataset.bound = "1"
    dialog.innerHTML = renderShortcutsDialog()
    dialog.querySelector("#shortcuts-dialog-close")?.addEventListener("click", () => {
      dialog.close()
    })
  }

  const helpBtn = document.getElementById("shortcuts-help-btn")
  if (helpBtn && !helpBtn.dataset.bound) {
    helpBtn.dataset.bound = "1"
    helpBtn.addEventListener("click", () => {
      if (dialog) dialog.showModal()
    })
  }

  if (document.body.dataset.shortcutsBound === "1") return
  document.body.dataset.shortcutsBound = "1"

  document.addEventListener("keydown", (event) => {
    const dialogs = Array.from(document.querySelectorAll("dialog[open]"))
    const isModalOpen = dialogs.length > 0
    const view = dashboardView(location.pathname, location.search)

    const result = resolveKeyboardShortcut(event, { isModalOpen, currentView: view })
    if (result.action === "none") return

    if (result.action === "escape") {
      if (isModalOpen) {
        event.preventDefault()
        dialogs.forEach((d) => d.close())
        return
      }
      const active = document.activeElement
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        if (active.value) {
          active.value = ""
          active.dispatchEvent(new Event("input", { bubbles: true }))
        }
        active.blur()
      }
      return
    }

    if (result.action === "focus-search") {
      event.preventDefault()
      const searchInput = document.getElementById("stock-query")
      if (searchInput && (view === "estoque" || view === "esgotadas")) {
        searchInput.focus()
        searchInput.select()
      } else {
        navigate("/admin/estoque")
        setTimeout(() => {
          const input = document.getElementById("stock-query")
          if (input) {
            input.focus()
            input.select()
          }
        }, 100)
      }
      return
    }

    if (result.action === "new-piece") {
      event.preventDefault()
      navigate("/admin/adicionar")
      return
    }

    if (result.action === "new-sale") {
      event.preventDefault()
      window.location.href = "/vendas/nova"
      return
    }

    if (result.action === "toggle-shortcuts-help") {
      event.preventDefault()
      if (dialog) {
        if (dialog.open) {
          dialog.close()
        } else {
          dialog.showModal()
        }
      }
      return
    }
  })
}

async function undoArchive(code) {
  showMessage("Desfazendo…")
  const result = await archiveProduct(archivePayload(code, false))
  if (!result.ok) {
    showMessage(result.error, "error")
    return
  }
  state.productsLoaded = false
  showMessage("Arquivo desfeito. A peça voltou ao estoque.")
  await loadProducts()
  showView()
}

async function commitPendingSaleCancel() {
  if (!saleCancelBox.pending) return
  const current = saleCancelBox.pending
  saleCancelBox.pending = null
  const result = await cancelAdminSale(saleCancelPayload(current.orderId))
  if (!result.ok) {
    showMessage(result.error, "error")
  }
  state.recent = undefined
  state.overview = undefined
}

function undoCancelSale() {
  if (!saleCancelBox.pending) return
  const previousRecent = saleCancelBox.pending.previousRecent
  saleCancelBox.pending = null
  state.recent = previousRecent
  showMessage("Cancelamento desfeito.")
  showView()
}

window.addEventListener("beforeunload", () => {
  void commitPendingSaleCancel()
})

function paintChrome(view) {
  const top = ["peca", "esgotadas", "conjuntos", "adicionar", "importar"].includes(view) ? "estoque" : view
  const counts = state.reviewCountKnown ? { cadastros: state.reviewPending } : undefined
  dashNav.innerHTML = navHtml(top, counts)
  const sub = ["estoque", "esgotadas", "peca", "conjuntos", "adicionar", "importar"].includes(view)
  stockNav.hidden = !sub
  if (sub) {
    const subActive = view === "peca" ? "estoque" : view
    stockNav.innerHTML = stockNavHtml(subActive)
  }
  titleEl.textContent = TITLES[view] || "Painel"
  paintFab(view)
}

function categoryBag(categoria) {
  return defaultsFor({ defaults: state.defaults }, categoria)
}

function refreshPlaceholders(categoria) {
  const defaults = categoryBag(categoria)
  for (const [id, field] of PLACEHOLDER_IDS) {
    const input = document.getElementById(id)
    if (input) input.placeholder = fieldPlaceholder(field, defaults)
  }
}

function readPackagingFields() {
  return Object.fromEntries(PACKAGING_IDS.map(([id, field]) => [field, document.getElementById(id)?.value ?? ""]))
}

function writePackagingFields(values) {
  for (const [id, field] of PACKAGING_IDS) {
    const input = document.getElementById(id)
    if (input) input.value = values[field] ?? ""
  }
}

function applyAddPackagingForCategory(categoria) {
  const nextSuggested = packagingValues(categoryBag(categoria))
  const next = nextPackagingValues({
    current: readPackagingFields(),
    previousSuggested: addPackagingSuggested,
    nextSuggested
  })
  writePackagingFields(next)
  addPackagingSuggested = nextSuggested
}

function readFields(code, name) {
  return {
    code,
    name,
    unitPrice: document.getElementById("unit-price").value,
    quantity: document.getElementById("quantity").value,
    categoria: document.getElementById("categoria").value,
    photos: document.getElementById("photos").value,
    descricao: document.getElementById("descricao").value,
    peso_g: document.getElementById("peso").value,
    largura_cm: document.getElementById("largura").value,
    altura_cm: document.getElementById("altura").value,
    comprimento_cm: document.getElementById("comprimento").value,
    ncm: document.getElementById("ncm").value,
    origem: document.getElementById("origem").value,
    gtin: document.getElementById("gtin").value
  }
}

async function loadProducts() {
  if (state.productsLoaded) return
  const result = await listProducts()
  state.productsLoaded = true
  if (!result.ok) {
    showMessage(result.error, "error")
    state.products = []
    return
  }
  state.products = result.products
}

async function loadDefaults() {
  if (state.defaultsLoaded) return
  const result = await fetchCategoryDefaults()
  state.defaultsLoaded = true
  state.defaults = result.ok ? result.defaults : {}
}

function bindPieceForm(root = document, options = {}) {
  const scope = root.querySelector?.("#piece-form") ? root : document
  const form = scope.querySelector("#piece-form") || document.getElementById("piece-form")
  if (!form) return
  form.querySelector("#categoria")?.addEventListener("change", (event) => {
    refreshPlaceholders(event.target.value)
  })
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const payload = buildProductUpdatePayload(readFields(state.piece.code))
    const problem = validateProductUpdate(payload)
    if (problem) {
      showMessage(problem, "error")
      return
    }
    showMessage("Salvando…")
    const result = await updateProduct(payload)
    showMessage(result.ok ? "Peça salva." : result.error, result.ok ? "" : "error")
    if (result.ok) {
      state.productsLoaded = false
      if (options.onSaved) options.onSaved()
    }
  })
  form.querySelector("#archive-open")?.addEventListener("click", () => {
    dialog.innerHTML = renderArchiveDialog(state.piece)
    dialog.showModal()
    dialog.querySelector("#archive-cancel").addEventListener("click", () => dialog.close())
    dialog.querySelector("#archive-confirm").addEventListener("click", async () => {
      const code = state.piece.code
      const result = await archiveProduct(archivePayload(code))
      if (!result.ok) {
        showMessage(result.error, "error")
        return
      }
      dialog.close()
      state.productsLoaded = false
      if (options.onArchived) await options.onArchived()
      else await navigate("/admin/estoque")
      showMessage("Peça arquivada.", "", {
        undo: {
          label: "Desfazer",
          run: () => undoArchive(code)
        }
      })
    })
  })
  form.querySelector("#piece-history-open")?.addEventListener("click", () => {
    openHistoryDialog(state.piece?.code)
  })
  form.querySelector("#piece-edit-close")?.addEventListener("click", () => {
    if (options.onClose) options.onClose()
  })
}

async function openPieceDialog(piece) {
  if (!pieceDialog || !piece) return
  state.piece = piece
  await loadDefaults()
  const formHtml = renderPieceForm(piece, categoryBag(piece.categoria), {
    enabled: true,
    dialog: true
  })
  pieceDialog.innerHTML = `${formHtml}
    <div class="dialog-actions">
      <button type="button" class="btn-ghost" id="piece-edit-close">Fechar</button>
    </div>`
  // Move close into the form actions area visually via bind
  const form = pieceDialog.querySelector("#piece-form")
  const closeBtn = pieceDialog.querySelector("#piece-edit-close")
  if (form && closeBtn) form.appendChild(closeBtn)
  if (!pieceDialog.open) pieceDialog.showModal()
  bindPieceForm(pieceDialog, {
    onSaved: async () => {
      pieceDialog.close()
      state.productsLoaded = false
      await loadProducts()
      showView()
    },
    onArchived: async () => {
      pieceDialog.close()
      await navigate("/admin/estoque")
    },
    onClose: () => pieceDialog.close()
  })
}

function bindAddForm() {
  addPackagingSuggested = packagingValues(categoryBag(document.getElementById("categoria")?.value))
  document.getElementById("categoria").addEventListener("change", (event) => {
    refreshPlaceholders(event.target.value)
    applyAddPackagingForCategory(event.target.value)
  })
  document.getElementById("add-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    const payload = buildAddProductPayload(readFields(
      document.getElementById("code").value,
      document.getElementById("name").value
    ))
    const problem = validateAddProduct(payload)
    if (problem) {
      showMessage(problem, "error")
      return
    }
    showMessage("Salvando…")
    const result = await addProduct(payload)
    if (result.ok) state.productsLoaded = false
    showMessage(result.ok ? "Peça adicionada." : result.error, result.ok ? "" : "error")
  })
}



































let renderToken = 0





















































function navigate(href) {
  const url = new URL(href, location.origin)
  const next = `${url.pathname}${url.search}`
  if (next !== `${location.pathname}${location.search}`) history.pushState(null, "", next)
  return showView()
}

function onPanelClick(event) {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.target.closest?.("a[href]")
  if (!link || link.target || link.hasAttribute("download")) return
  const url = new URL(link.href, location.origin)
  if (url.origin !== location.origin || !isPanelLink(url.pathname)) return
  event.preventDefault()
  navigate(`${url.pathname}${url.search}`)
}

function applyReviewCount(data) {
  const parsed = normalizeReviewList(data)
  state.reviews = parsed.reviews
  state.reviewPending = parsed.pendingCount
  state.reviewCountKnown = true
  return parsed
}

async function loadReviewQueue() {
  const result = await fetchCustomerReviews()
  if (!result.ok) return result
  return { ok: true, ...applyReviewCount(result.data) }
}

function openReviewDialog(review, action) {
  if (!reviewDialog) return
  reviewDialog.innerHTML = renderReviewDialog(review, action)
  if (reviewDialog.open) reviewDialog.close()
  reviewDialog.showModal()
}

async function onReviewSubmit(event) {
  const form = event.target
  if (form?.id !== "review-form") return
  event.preventDefault()
  const built = resolveReviewBody({
    reviewId: form.dataset.reviewId,
    action: form.dataset.action,
    customerId: form.querySelector('input[name="customer_id"]:checked')?.value
  })
  if (!built.ok) {
    showMessage(built.error, "error")
    return
  }
  const submit = form.querySelector("[type=submit]")
  if (submit) submit.disabled = true
  const result = await resolveCustomerReview(built.body)
  if (submit) submit.disabled = false
  if (!result.ok) {
    showMessage(result.error, "error")
    return
  }
  if (reviewDialog?.open) reviewDialog.close()
  if (Number.isFinite(result.pendingCount)) {
    state.reviewPending = result.pendingCount
    state.reviewCountKnown = true
  }
  state.reviews = undefined
  state.reviewNotice = "Revisão concluída."
  showView()
}

function bindReviewOnce() {
  if (!reviewDialog || reviewDialog.dataset.bound === "1") return
  reviewDialog.dataset.bound = "1"
  reviewDialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-review-cancel]")) reviewDialog.close()
  })
  reviewDialog.addEventListener("submit", (event) => { void onReviewSubmit(event) })
  viewEl.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-review-action]")
    if (!button || !viewEl.contains(button)) return
    const reviewId = button.closest("[data-review-id]")?.dataset.reviewId
    const review = (state.reviews || []).find((item) => item.id === reviewId)
    if (!review) return
    openReviewDialog(review, button.dataset.reviewAction)
  })
}

async function refreshReviewCount() {
  const result = await fetchCustomerReviews()
  if (!result.ok) return
  if (dashboardView(location.pathname, location.search) === "cadastros") return
  const parsed = normalizeReviewList(result.data)
  state.reviewPending = parsed.pendingCount
  state.reviewCountKnown = true
  paintChrome(dashboardView(location.pathname, location.search))
}

async function render(view, token) {
  // Não limpa toast com Desfazer pendente.
  if (!undoAction) showMessage("")
  viewEl.classList.toggle("view--cadastros", view === "cadastros")
  const stale = () => token !== renderToken
  if (view === "inicio") {
    viewEl.classList.add("view--inicio")
    const urlMonth = new URLSearchParams(location.search).get("month") || currentMonthKey()
    if (state.overview && state.overview.month !== urlMonth) {
      state.overview = undefined
    }
    state.selectedMonth = urlMonth
    if (state.overview === undefined || state.recent === undefined || state.loadedStatus !== "all") viewEl.innerHTML = viewLoading()
    await Promise.all([loadOverview(), loadRecent("all")])
    if (stale()) return
    paintInicio()
    return
  }
  viewEl.classList.remove("view--inicio")
  if (view === "vendas") {
    const status = state.selectedSaleStatus || "all"
    if (state.recent === undefined || state.loadedStatus !== status) viewEl.innerHTML = viewLoading()
    await loadRecent(status)
    if (stale()) return
    paintVendas()
    return
  }
  if (view === "vendedoras") {
    const urlMonth = new URLSearchParams(location.search).get("month") || currentMonthKey()
    if (state.sellers && state.sellersMonth !== urlMonth) {
      state.sellers = undefined
      state.sellersMonth = undefined
    }
    state.selectedMonth = urlMonth
    if (state.sellers === undefined || state.recent === undefined || state.loadedStatus !== "all") viewEl.innerHTML = viewLoading()
    await Promise.all([loadSellers(urlMonth), loadRecent("all")])
    if (stale()) return
    paintVendedoras()
    return
  }
  if (view === "compras") {
    const urlMonth = new URLSearchParams(location.search).get("month") || currentMonthKey()
    if (state.purchases && state.purchasesMonth !== urlMonth) {
      state.purchases = undefined
      state.purchasesMonth = undefined
    }
    state.selectedMonth = urlMonth
    if (state.purchases === undefined) viewEl.innerHTML = viewLoading()
    await loadPurchases(urlMonth)
    if (stale()) return
    paintCompras()
    return
  }
  if (view === "estoque" || view === "esgotadas") {
    if (!document.getElementById("stock-search")) viewEl.innerHTML = viewLoading()
    await loadProducts()
    if (stale()) return
    paintStock(view === "esgotadas" ? "esgotadas" : "estoque")
    bindStockOnce()
    return
  }
  if (view === "peca") {
    const code = new URLSearchParams(location.search).get("code")
    if (!state.productsLoaded || !state.defaultsLoaded) viewEl.innerHTML = viewLoading()
    await Promise.all([loadProducts(), loadDefaults()])
    if (stale()) return
    state.piece = state.products.find((item) => item.code === code) || null
    if (!state.piece) {
      viewEl.innerHTML = `<p class="empty">Peça não encontrada.</p>`
      return
    }
    viewEl.innerHTML = renderPieceForm(state.piece, categoryBag(state.piece.categoria))
    bindPieceForm(document)
    return
  }
  if (view === "conjuntos") {
    if (!state.productsLoaded) viewEl.innerHTML = viewLoading()
    await loadProducts()
    if (stale()) return
    viewEl.innerHTML = renderConjuntosPage(state.products, { enabled: ADMIN_CONJUNTOS_ENABLED })
    bindConjuntos()
    return
  }
  if (view === "colecoes") {
    if (state.collections === undefined) viewEl.innerHTML = viewLoading()
    await Promise.all([loadCollections(), loadProducts()])
    if (stale()) return
    paintColecoes()
    return
  }
  if (view === "promocoes") {
    if (state.promotions === undefined) viewEl.innerHTML = viewLoading()
    await loadPromotions()
    if (stale()) return
    paintPromocoes()
    const targetCode = new URLSearchParams(location.search).get("code")
    if (targetCode) {
      openPromoEditDialog({
        scope: "produto",
        product_codes: [targetCode],
        name: `Promoção ${targetCode}`
      })
    }
    return
  }
  if (view === "cupons") {
    if (state.coupons === undefined || state.referrals === undefined) viewEl.innerHTML = viewLoading()
    await Promise.all([loadCoupons(), loadReferrals()])
    if (stale()) return
    paintCupons()
    return
  }
  if (view === "cadastros") {
    if (state.reviews === undefined) viewEl.innerHTML = viewLoading()
    const loaded = await loadReviewQueue()
    if (stale()) return
    paintChrome(view)
    if (!loaded.ok) {
      viewEl.innerHTML = renderReviewError(loaded.error)
      return
    }
    viewEl.innerHTML = renderReviewPage(loaded.reviews)
    if (state.reviewNotice) {
      const notice = state.reviewNotice
      state.reviewNotice = ""
      showMessage(notice)
    }
    return
  }
  if (view === "adicionar") {
    if (!state.defaultsLoaded) viewEl.innerHTML = viewLoading()
    await loadDefaults()
    if (stale()) return
    viewEl.innerHTML = renderAddForm()
    bindAddForm()
    return
  }
  if (view === "importar") {
    paintImportar()
    return
  }
}

async function showView() {
  const token = ++renderToken
  const view = dashboardView(location.pathname, location.search)
  paintChrome(view)
  await render(view, token)
}

function reveal() {
  const loading = document.getElementById("staff-loading")
  if (loading) loading.hidden = true
  const panel = document.getElementById("panel")
  if (panel) panel.hidden = false
}

async function boot() {
  if (!window.MarisStaffAuth?.isValid?.()) {
    window.MarisStaffAuth?.requireStaffAccess?.()
    return
  }
  const profile = await window.MarisStaffAuth.loadProfile()
  if (profile?.aborted || window.MarisStaffAuth.settleAdminGate(profile) === "wait") return
  if (!profile?.ok || !isDashboardAdmin(profile.user)) {
    const loading = document.getElementById("staff-loading")
    if (loading) {
      loading.hidden = false
      loading.innerHTML = `<p class="empty">Só o administrador entra neste painel.</p>`
    }
    return
  }
  document.addEventListener("click", onPanelClick)
  window.addEventListener("popstate", () => { showView() })
  bindStockOnce()
  bindFabOnce()
  bindShortcutsOnce()
  reveal()
  bindReviewOnce()
  await showView()
  if (dashboardView(location.pathname, location.search) !== "cadastros") {
    void refreshReviewCount()
  }
}


const painelDeps = {
  isComponentSku,
  showMessage,
  updateComponentSku,
  componentUpdatePayload,
  state,
  conjuntoDialog,
  readDivisionRows,
  renderConjuntoEditDialog,
  shouldShowConjuntos,
  ADMIN_CONJUNTOS_ENABLED,
  saveDivisionsPayload,
  validateDivisionsPayload,
  saveProductDivisions,
  showView,
  renderConjuntoCreatePicker,
  viewEl,
  fetchCollectionList,
  collectionDialog,
  renderCollectionEditDialog,
  slugify,
  filterProductsForPicker,
  renderCollectionPieceSuggestions,
  renderSelectedPieceChips,
  validateCollectionPayload,
  saveCollection,
  renderCollectionsPage,
  formatPrice,
  deleteCollection,
  fetchPromotions,
  promoDialog,
  renderPromoDialogContent,
  promoPriceExample,
  validatePromoPayload,
  savePromotion,
  renderPromotionsPage,
  endPromotion,
  fetchCoupons,
  fetchReferrals,
  couponDialog,
  renderCouponDialogContent,
  validateCouponPayload,
  saveCoupon,
  referralCodeDialog,
  renderReferralCodeDialogContent,
  validateReferralCodePayload,
  createReferralCode,
  renderCouponsPage,
  toggleCoupon,
  renderImportResultView,
  formatImportSuccessMessage,
  validatePreviewItems,
  renderImportPreviewView,
  updatePreviewItem,
  escapeHtml,
  removePreviewItem,
  buildImportPayloadFromPreview,
  importProducts,
  formatImportErrorMessage,
  formatImageFailuresWarning,
  renderImportUploadBlock,
  parseImportFileContent,
  outOfStockProducts,
  inStockProducts,
  visibleStock,
  renderStockBatchBar,
  historyDialog,
  loadingHtml,
  fetchProductHistory,
  renderProductHistoryDialog,
  batchDialog,
  renderBatchArchiveDialog,
  batchProducts,
  loadProducts,
  renderBatchQuantityDialog,
  renderBatchPriceDialog,
  renderStockList,
  renderStockPage,
  renderStockByType,
  openPieceDialog,
  STOCK_PAGE_SIZE,
  currentMonthKey,
  fetchMonthOverview,
  normalizeOverview,
  viewLoading,
  fetchRecentSales,
  fetchExpiringOrders,
  confirmOrder,
  returnOrderItems,
  normalizeRecentSales,
  normalizeExpiringOrders,
  renderExpiringOrderCards,
  confirmOrderPayload,
  returnOrderItemsPayload,
  fetchShippingSettings,
  saveShippingSettings,
  renderShippingToggle,
  saleDialog,
  shouldShowSaleEdit,
  ADMIN_SALE_EDIT_ENABLED,
  readSaleEditForm,
  saleUpdatePayload,
  updateAdminSale,
  markAdminSalePaid,
  saleMarkPaidPayload,
  commitPendingSaleCancel,
  saleCancelBox,
  undoCancelSale,
  renderSaleEditDialog,
  fetchAdminSale,
  normalizeAdminSale,
  renderInicio,
  renderSaleCards,
  stepMonth,
  setMonthlyGoal,
  triggerWeeklySummaryEmail,
  generateSalesCsv,
  downloadCsvFile,
  renderVendas,
  filterSalesByStatus,
  renderVendedoras,
  filterSalesBySeller,
  fetchSellersMonth,
  normalizeSellersMonth,
  sellersFromDirectory,
  renderCompras,
  fetchPurchasesOverview,
  dialog,
}
Object.assign(painelDeps,
  installConjuntosUi(painelDeps),
  installColecoesUi(painelDeps),
  installPromocoesUi(painelDeps),
  installCuponsUi(painelDeps),
  installImportarUi(painelDeps),
  installEstoqueUi(painelDeps),
  installHomeUi(painelDeps))
openHistoryDialog = painelDeps.openHistoryDialog
loadOverview = painelDeps.loadOverview
loadRecent = painelDeps.loadRecent
paintInicio = painelDeps.paintInicio
paintVendas = painelDeps.paintVendas
loadSellers = painelDeps.loadSellers
paintVendedoras = painelDeps.paintVendedoras
loadPurchases = painelDeps.loadPurchases
paintCompras = painelDeps.paintCompras
paintStock = painelDeps.paintStock
bindStockOnce = painelDeps.bindStockOnce
bindConjuntos = painelDeps.bindConjuntos
loadCollections = painelDeps.loadCollections
paintColecoes = painelDeps.paintColecoes
loadPromotions = painelDeps.loadPromotions
paintPromocoes = painelDeps.paintPromocoes
openPromoEditDialog = painelDeps.openPromoEditDialog
loadCoupons = painelDeps.loadCoupons
loadReferrals = painelDeps.loadReferrals
paintCupons = painelDeps.paintCupons
paintImportar = painelDeps.paintImportar

if (!shouldShowDashboard()) {
  location.replace("/paginas/admin/admin.html")
} else {
  boot()
}
