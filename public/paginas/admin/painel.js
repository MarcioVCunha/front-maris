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
  fetchPurchasesOverview
} from "./painel.api.js"
import {
  filterCollections,
  filterProductsForPicker,
  renderCollectionEditDialog,
  renderCollectionsPage,
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
  renderPromoDialogContent,
  validatePromotionPayload as validatePromoPayload
} from "../estoque/promocoes/promocoes.logic.js"
import { loadingHtml } from "../../compartilhado/loading.js"
import {
  formatImageFailuresWarning,
  formatImportErrorMessage,
  formatImportSuccessMessage,
  parseImportJsonText
} from "../estoque/importar/importar.logic.js"

function viewLoading() {
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

const state = {
  products: [],
  productsLoaded: false,
  defaults: {},
  defaultsLoaded: false,
  piece: null,
  stockQuery: "",
  stockLimit: STOCK_PAGE_SIZE,
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
  selectedMonth: null,
  staleOnly: false,
  purchases: undefined,
  purchasesMonth: undefined
}

let pendingSaleCancel = null

function clearUndo() {
  if (undoTimer) clearTimeout(undoTimer)
  undoTimer = null
  undoAction = null
  if (pendingSaleCancel) {
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
  if (!pendingSaleCancel) return
  const current = pendingSaleCancel
  pendingSaleCancel = null
  const result = await cancelAdminSale(saleCancelPayload(current.orderId))
  if (!result.ok) {
    showMessage(result.error, "error")
  }
  state.recent = undefined
  state.overview = undefined
}

function undoCancelSale() {
  if (!pendingSaleCancel) return
  const previousRecent = pendingSaleCancel.previousRecent
  pendingSaleCancel = null
  state.recent = previousRecent
  showMessage("Cancelamento desfeito.")
  showView()
}

window.addEventListener("beforeunload", () => {
  void commitPendingSaleCancel()
})

function paintChrome(view) {
  const top = ["peca", "esgotadas", "conjuntos", "adicionar", "importar"].includes(view) ? "estoque" : view
  dashNav.innerHTML = navHtml(top)
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

function bindLegacyConjuntos() {
  const form = document.getElementById("tipos-form")
  if (!form) return
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const inputs = [...form.querySelectorAll("input[data-component-id]")]
    for (const input of inputs) {
      if (isComponentSku(input.value, input.dataset.productCode)) continue
      showMessage(`O SKU precisa seguir ${input.dataset.productCode}-DIVISAO.`, "error")
      return
    }
    showMessage("Salvando…")
    for (const input of inputs) {
      const result = await updateComponentSku(componentUpdatePayload({
        componentId: input.dataset.componentId,
        productCode: input.dataset.productCode,
        sku: input.value.trim()
      }))
      if (!result.ok) {
        showMessage(result.error, "error")
        return
      }
    }
    showMessage("SKUs salvos.")
    state.productsLoaded = false
  })
}

function bindConjuntoEditDialog(piece) {
  if (!conjuntoDialog || !piece) return
  conjuntoDialog.querySelector("#conjunto-edit-close")?.addEventListener("click", () => conjuntoDialog.close())
  conjuntoDialog.querySelector("#division-add")?.addEventListener("click", () => {
    const current = readDivisionRows(conjuntoDialog.querySelector("#division-rows"))
    current.push({ name: "", quantity: 0, price_percent: "" })
    conjuntoDialog.innerHTML = renderConjuntoEditDialog(piece, { divisions: current })
    bindConjuntoEditDialog(piece)
  })
  conjuntoDialog.querySelectorAll("[data-remove-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-remove-index"))
      const current = readDivisionRows(conjuntoDialog.querySelector("#division-rows"))
        .filter((_, i) => i !== idx)
      conjuntoDialog.innerHTML = renderConjuntoEditDialog(piece, {
        divisions: current.length ? current : [{ name: "", quantity: 0, price_percent: "" }]
      })
      bindConjuntoEditDialog(piece)
    })
  })
  conjuntoDialog.querySelector("#conjunto-edit-save")?.addEventListener("click", async () => {
    if (!shouldShowConjuntos(ADMIN_CONJUNTOS_ENABLED)) {
      showMessage("Salvar divisões completa depende do back-maris PR #17.", "error")
      return
    }
    const payload = saveDivisionsPayload(
      piece.code,
      readDivisionRows(conjuntoDialog.querySelector("#division-rows"))
    )
    const problem = validateDivisionsPayload(payload)
    if (problem) {
      showMessage(problem, "error")
      return
    }
    showMessage("Salvando…")
    const result = await saveProductDivisions(payload)
    if (!result.ok) {
      showMessage(result.error, "error")
      return
    }
    conjuntoDialog.close()
    state.productsLoaded = false
    showMessage("Divisões salvas.")
    showView()
  })
}

function openConjuntoEdit(piece, divisions) {
  if (!conjuntoDialog || !piece) return
  conjuntoDialog.innerHTML = renderConjuntoEditDialog(piece, { divisions })
  if (!conjuntoDialog.open) conjuntoDialog.showModal()
  bindConjuntoEditDialog(piece)
}

function openConjuntoCreate() {
  if (!conjuntoDialog) return
  const paint = () => {
    conjuntoDialog.innerHTML = renderConjuntoCreatePicker(state.products, state.conjuntoQuery)
    conjuntoDialog.querySelector("#conjunto-create-close")?.addEventListener("click", () => conjuntoDialog.close())
    conjuntoDialog.querySelector("#conjunto-search")?.addEventListener("submit", (event) => {
      event.preventDefault()
      state.conjuntoQuery = conjuntoDialog.querySelector("#conjunto-query")?.value || ""
      paint()
    })
    conjuntoDialog.querySelectorAll("[data-create-code]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-create-code")
        const piece = state.products.find((item) => item.code === code)
        openConjuntoEdit(piece, [{ name: "", quantity: 0, price_percent: "" }])
      })
    })
  }
  if (!conjuntoDialog.open) conjuntoDialog.showModal()
  paint()
}

function bindConjuntos() {
  if (!shouldShowConjuntos()) {
    bindLegacyConjuntos()
    return
  }
  document.getElementById("conjunto-create-open")?.addEventListener("click", () => openConjuntoCreate())
  viewEl.querySelectorAll(".entity-card[data-product-code]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-product-code")
      const piece = state.products.find((item) => item.code === code)
      openConjuntoEdit(piece)
    })
  })
}

async function loadCollections() {
  const result = await fetchCollectionList()
  if (result.ok && Array.isArray(result.data?.collections)) {
    state.collections = result.data.collections
  } else {
    state.collections = []
  }
}

function openCollectionEditDialog(collection) {
  if (!collectionDialog) return
  state.collectionEditing = collection
  state.collectionSelectedCodes = Array.isArray(collection?.product_codes)
    ? [...collection.product_codes]
    : []

  function bindDialogForm() {
    collectionDialog.innerHTML = renderCollectionEditDialog(
      state.collectionEditing,
      state.products || [],
      { selectedCodes: state.collectionSelectedCodes }
    )

    const form = collectionDialog.querySelector("#collection-form")
    const nameInput = collectionDialog.querySelector("#collection-name-input")
    const slugInput = collectionDialog.querySelector("#collection-slug-input")
    const pieceSearch = collectionDialog.querySelector("#collection-piece-search")
    const suggestionsEl = collectionDialog.querySelector("#collection-piece-suggestions")
    const chipsContainer = collectionDialog.querySelector("#collection-selected-pieces")
    const errorEl = collectionDialog.querySelector("#collection-form-error")
    const cancelBtn = collectionDialog.querySelector("#collection-cancel-btn")
    const closeX = collectionDialog.querySelector("#collection-close-x")

    const closeDialog = () => collectionDialog.close()
    cancelBtn?.addEventListener("click", closeDialog)
    closeX?.addEventListener("click", closeDialog)

    // Live slug generation se for criação nova
    if (!state.collectionEditing?.id) {
      nameInput?.addEventListener("input", () => {
        if (!slugInput?.dataset.manual) {
          slugInput.value = slugify(nameInput.value)
        }
      })
      slugInput?.addEventListener("input", () => {
        slugInput.dataset.manual = "true"
      })
    }

    // Busca de peças no seletor
    pieceSearch?.addEventListener("input", () => {
      const term = pieceSearch.value.trim()
      if (!term) {
        if (suggestionsEl) {
          suggestionsEl.innerHTML = ""
          suggestionsEl.hidden = true
        }
        return
      }
      const matches = filterProductsForPicker(state.products || [], term, state.collectionSelectedCodes, 6)
      if (!matches.length) {
        if (suggestionsEl) {
          suggestionsEl.innerHTML = `<div class="collection-piece-suggestion-item"><span>Nenhuma peça encontrada</span></div>`
          suggestionsEl.hidden = false
        }
        return
      }
      suggestionsEl.innerHTML = matches
        .map(
          (p) => `
          <div class="collection-piece-suggestion-item">
            <span><strong>${p.code}</strong> — ${p.name}</span>
            <button type="button" class="btn-secondary btn-sm" data-add-piece="${p.code}">+ Adicionar</button>
          </div>
        `
        )
        .join("")
      suggestionsEl.hidden = false
    })

    // Adicionar peça das sugestões
    suggestionsEl?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add-piece]")
      if (!btn) return
      const code = btn.getAttribute("data-add-piece")
      if (code && !state.collectionSelectedCodes.includes(code)) {
        state.collectionSelectedCodes.push(code)
        if (chipsContainer) {
          chipsContainer.innerHTML = renderSelectedPieceChips(state.collectionSelectedCodes, state.products || [])
        }
        pieceSearch.value = ""
        suggestionsEl.innerHTML = ""
        suggestionsEl.hidden = true
      }
    })

    // Remover peça dos chips selecionados
    chipsContainer?.addEventListener("click", (e) => {
      const removeBtn = e.target.closest("[data-remove-code]")
      if (!removeBtn) return
      const code = removeBtn.getAttribute("data-remove-code")
      state.collectionSelectedCodes = state.collectionSelectedCodes.filter((c) => c !== code)
      chipsContainer.innerHTML = renderSelectedPieceChips(state.collectionSelectedCodes, state.products || [])
    })

    // Submit
    form?.addEventListener("submit", async (e) => {
      e.preventDefault()
      if (errorEl) errorEl.hidden = true
      const fd = new FormData(form)
      const rawPayload = {
        id: fd.get("id") || null,
        name: fd.get("name"),
        slug: fd.get("slug"),
        description: fd.get("description"),
        badge_text: fd.get("badge_text"),
        max_price: fd.get("max_price"),
        sort_order: fd.get("sort_order"),
        starts_at: fd.get("starts_at"),
        ends_at: fd.get("ends_at"),
        is_active: fd.get("is_active") === "on",
        product_codes: state.collectionSelectedCodes,
      }
      const validated = validateCollectionPayload(rawPayload)
      if (!validated.ok) {
        if (errorEl) {
          errorEl.textContent = validated.error
          errorEl.hidden = false
        }
        return
      }

      const saveBtn = form.querySelector("#collection-save-btn")
      if (saveBtn) {
        saveBtn.disabled = true
        saveBtn.textContent = "Salvando..."
      }

      const res = await saveCollection(validated.data)
      if (!res.ok) {
        if (saveBtn) {
          saveBtn.disabled = false
          saveBtn.textContent = "Salvar Coleção"
        }
        if (errorEl) {
          errorEl.textContent = res.error || "Erro ao salvar coleção."
          errorEl.hidden = false
        }
        return
      }

      collectionDialog.close()
      showMessage(state.collectionEditing?.id ? "Coleção atualizada." : "Coleção criada com sucesso.")
      await loadCollections()
      paintColecoes()
    })
  }

  bindDialogForm()
  if (!collectionDialog.open) collectionDialog.showModal()
}

function paintColecoes() {
  viewEl.innerHTML = renderCollectionsPage(state.collections, {
    query: state.collectionQuery,
    formatMoney: formatPrice,
  })

  // Botões de nova coleção
  viewEl.querySelector("#btn-nova-colecao")?.addEventListener("click", () => openCollectionEditDialog(null))
  viewEl.querySelector("#btn-nova-colecao-empty")?.addEventListener("click", () => openCollectionEditDialog(null))

  // Busca de coleções
  const searchInput = viewEl.querySelector("#collection-search-input")
  searchInput?.addEventListener("input", () => {
    state.collectionQuery = searchInput.value
    paintColecoes()
    const newInput = viewEl.querySelector("#collection-search-input")
    if (newInput) {
      newInput.focus()
      newInput.setSelectionRange(newInput.value.length, newInput.value.length)
    }
  })

  // Editar coleção
  viewEl.querySelectorAll("[data-edit-collection]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-edit-collection"))
      const collection = (state.collections || []).find((c) => Number(c.id) === id)
      if (collection) openCollectionEditDialog(collection)
    })
  })

  // Excluir coleção
  viewEl.querySelectorAll("[data-delete-collection]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.getAttribute("data-delete-collection"))
      const collection = (state.collections || []).find((c) => Number(c.id) === id)
      if (!collection) return
      const ok = confirm(`Tem certeza que deseja excluir a coleção "${collection.name}"?`)
      if (!ok) return
      const res = await deleteCollection(id)
      if (res.ok) {
        showMessage(`Coleção "${collection.name}" excluída.`)
        await loadCollections()
        paintColecoes()
      } else {
        showMessage(res.error || "Erro ao excluir coleção.", "error")
      }
    })
  })
}

async function loadPromotions() {
  const result = await fetchPromotions()
  state.promotions = result.ok ? (result.data?.promotions || []) : []
  if (!result.ok) showMessage(result.error || "Não foi possível carregar as promoções.", "error")
  return state.promotions
}

function openPromoEditDialog(promo = null) {
  state.promoEditing = promo
  promoDialog.innerHTML = renderPromoDialogContent(promo)

  const form = promoDialog.querySelector("#promo-form")
  const closeBtn = promoDialog.querySelector("#promo-dialog-close-btn")
  const cancelBtn = promoDialog.querySelector("#promo-dialog-cancel")
  const scopeSelect = promoDialog.querySelector("#promo-form-scope")
  const groupCategory = promoDialog.querySelector("#promo-group-category")
  const groupProducts = promoDialog.querySelector("#promo-group-products")
  const discountTypeSelect = promoDialog.querySelector("#promo-form-discount-type")
  const valueLabel = promoDialog.querySelector("#promo-value-label")
  const valueInput = promoDialog.querySelector("#promo-form-value")
  const feedbackEl = promoDialog.querySelector("#promo-dialog-feedback")

  const syncScope = () => {
    const isCategory = scopeSelect?.value === "categoria"
    if (groupCategory) groupCategory.hidden = !isCategory
    if (groupProducts) groupProducts.hidden = isCategory
  }

  const syncDiscount = () => {
    const isPercent = discountTypeSelect?.value === "percent"
    if (valueLabel) valueLabel.textContent = isPercent ? "Desconto (% OFF) *" : "Desconto (R$ OFF) *"
    if (valueInput) {
      valueInput.placeholder = isPercent ? "Ex: 15" : "Ex: 25.00"
      if (isPercent) valueInput.max = "100"
      else valueInput.removeAttribute("max")
    }
  }

  scopeSelect?.addEventListener("change", syncScope)
  discountTypeSelect?.addEventListener("change", syncDiscount)
  closeBtn?.addEventListener("click", () => promoDialog.close())
  cancelBtn?.addEventListener("click", () => promoDialog.close())

  promoDialog.addEventListener("click", (e) => {
    if (e.target === promoDialog) promoDialog.close()
  })

  form?.addEventListener("submit", async (e) => {
    e.preventDefault()
    if (feedbackEl) feedbackEl.hidden = true

    const nameInput = promoDialog.querySelector("#promo-form-name")
    const categorySelect = promoDialog.querySelector("#promo-form-category")
    const codesInput = promoDialog.querySelector("#promo-form-codes")
    const startsAtInput = promoDialog.querySelector("#promo-form-starts-at")
    const endsAtInput = promoDialog.querySelector("#promo-form-ends-at")
    const maxUnitsInput = promoDialog.querySelector("#promo-form-max-units")
    const activeCheckbox = promoDialog.querySelector("#promo-form-active")
    const submitBtn = promoDialog.querySelector("#promo-dialog-submit")

    const formData = {
      id: promo?.id || null,
      name: nameInput?.value,
      scope: scopeSelect?.value,
      category: categorySelect?.value,
      product_codes: codesInput?.value,
      discount_type: discountTypeSelect?.value,
      value: Number(valueInput?.value),
      starts_at: startsAtInput?.value,
      ends_at: endsAtInput?.value,
      max_units: maxUnitsInput?.value,
      is_active: activeCheckbox ? activeCheckbox.checked : true,
    }

    const validation = validatePromoPayload(formData)
    if (!validation.ok) {
      if (feedbackEl) {
        feedbackEl.textContent = validation.error
        feedbackEl.className = "promo-feedback error"
        feedbackEl.hidden = false
      }
      return
    }

    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = "Salvando…"
    }

    const res = await savePromotion(validation.payload)
    if (!res.ok) {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = "Salvar promoção"
      }
      if (feedbackEl) {
        feedbackEl.textContent = res.error || "Erro ao salvar a promoção."
        feedbackEl.className = "promo-feedback error"
        feedbackEl.hidden = false
      }
      return
    }

    promoDialog.close()
    showMessage(promo?.id ? "Promoção atualizada." : "Promoção salva com sucesso!")
    await loadPromotions()
    paintPromocoes()
  })

  if (!promoDialog.open) promoDialog.showModal()
}

function paintPromocoes() {
  viewEl.innerHTML = renderPromotionsPage(state.promotions, {
    query: state.promoQuery,
    status: state.promoStatusFilter
  })

  // Botão nova promoção
  viewEl.querySelector("#promo-new-btn")?.addEventListener("click", () => openPromoEditDialog(null))

  // Busca de promoções
  const searchInput = viewEl.querySelector("#promo-search")
  searchInput?.addEventListener("input", () => {
    state.promoQuery = searchInput.value
    paintPromocoes()
    const newInput = viewEl.querySelector("#promo-search")
    if (newInput) {
      newInput.focus()
      newInput.setSelectionRange(newInput.value.length, newInput.value.length)
    }
  })

  // Filtro por status
  viewEl.querySelectorAll(".status-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.promoStatusFilter = btn.dataset.status || "all"
      paintPromocoes()
    })
  })

  // Ações nos cards (Editar / Encerrar)
  viewEl.querySelector("#promo-list")?.addEventListener("click", async (event) => {
    const actionBtn = event.target.closest("button[data-action]")
    if (!actionBtn) return
    const action = actionBtn.dataset.action
    const id = Number(actionBtn.dataset.id)
    const promo = (state.promotions || []).find((p) => Number(p.id) === id)
    if (!promo) return

    if (action === "edit") {
      openPromoEditDialog(promo)
      return
    }

    if (action === "end") {
      const ok = confirm(`Deseja realmente encerrar a promoção "${promo.name}"?`)
      if (!ok) return
      const res = await endPromotion(id)
      if (res.ok) {
        showMessage(res.data?.already_ended ? "Esta promoção já estava encerrada." : "Promoção encerrada com sucesso!")
        await loadPromotions()
        paintPromocoes()
      } else {
        showMessage(res.error || "Não foi possível encerrar a promoção.", "error")
      }
    }
  })
}

function bindImport() {
  document.getElementById("import-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    const file = document.getElementById("file").files?.[0]
    if (!file) {
      showMessage("Escolha um arquivo JSON.", "error")
      return
    }
    let json
    try {
      json = parseImportJsonText(await file.text())
    } catch {
      showMessage("Não foi possível ler o arquivo ou o JSON está inválido.", "error")
      return
    }
    if (!Array.isArray(json) || !json.length) {
      showMessage("O arquivo precisa ser uma lista de produtos.", "error")
      return
    }
    showMessage("Importando…")
    const result = await importProducts(json)
    if (!result.ok) {
      showMessage(formatImportErrorMessage(result.error, result.status), "error")
      return
    }
    const warning = formatImageFailuresWarning(result.data)
    showMessage([formatImportSuccessMessage(result.data), warning].filter(Boolean).join(" "))
  })
}

let renderToken = 0

function stockPool(mode) {
  return mode === "esgotadas" ? outOfStockProducts(state.products) : inStockProducts(state.products)
}

function paintStock(mode = "estoque") {
  const pool = stockPool(mode)
  const isStaleFilter = mode !== "esgotadas" && state.staleOnly
  const { rows, total } = visibleStock(pool, state.stockQuery, state.stockLimit, { staleOnly: isStaleFilter })
  const empty = mode === "esgotadas"
    ? (state.stockQuery.trim() ? "Nenhuma esgotada com esse nome." : "Nenhuma peça esgotada.")
    : (isStaleFilter
      ? (state.stockQuery.trim() ? "Nenhuma peça parada (+60d) com esse nome." : "Nenhuma peça parada (+60d) no estoque.")
      : (state.stockQuery.trim() ? "Nenhuma peça com esse nome." : "Nenhuma peça no estoque."))
  const listHtml = rows.length
    ? renderStockList(rows, formatPrice, { empty })
    : `<p class="empty">${empty}</p>`
  const list = document.getElementById("stock-list")
  if (!list || viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") !== mode) {
    viewEl.innerHTML = renderStockPage({
      rows,
      total,
      query: state.stockQuery,
      mode,
      typeBlock: mode === "esgotadas" ? "" : renderStockByType(state.products),
      staleOnly: state.staleOnly
    })
    const fresh = document.getElementById("stock-list")
    if (fresh) fresh.innerHTML = listHtml
    bindStockCards()
    return
  }
  list.innerHTML = listHtml
  bindStockCards()
  const meta = document.getElementById("stock-meta")
  if (meta) meta.textContent = total ? `${rows.length} de ${total}` : ""
  const more = document.getElementById("stock-more")
  if (total > rows.length) {
    if (!more) {
      const button = document.createElement("button")
      button.id = "stock-more"
      button.type = "button"
      button.className = "btn-ghost"
      button.textContent = mode === "esgotadas" ? "Mais esgotadas" : "Mais peças"
      viewEl.appendChild(button)
    }
  } else if (more) {
    more.remove()
  }
}

function bindStockCards() {
  viewEl.querySelectorAll(".entity-card[data-product-code]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      if (event.target.closest("[data-promo-shortcut]")) return
      const code = btn.getAttribute("data-product-code")
      const piece = (state.products || []).find((row) => String(row.code) === String(code))
      openPieceDialog(piece)
    })
  })
}

function bindStockOnce() {
  if (viewEl.dataset.stockBound === "1") return
  viewEl.dataset.stockBound = "1"
  viewEl.addEventListener("input", (event) => {
    if (event.target.id !== "stock-query") return
    state.stockQuery = event.target.value
    state.stockLimit = STOCK_PAGE_SIZE
    const mode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
    paintStock(mode)
  })
  viewEl.addEventListener("click", (event) => {
    const filterBtn = event.target.closest("[data-stock-filter]")
    if (filterBtn) {
      const filter = filterBtn.getAttribute("data-stock-filter")
      state.staleOnly = filter === "stale"
      state.stockLimit = STOCK_PAGE_SIZE
      const mode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
      paintStock(mode)
      return
    }
    if (event.target.id !== "stock-more") return
    state.stockLimit += STOCK_PAGE_SIZE
    const mode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
    paintStock(mode)
  })
  viewEl.addEventListener("submit", (event) => {
    if (event.target.id === "stock-search") event.preventDefault()
  })
}

async function loadOverview() {
  const currentMonth = currentMonthKey()
  const targetMonth = state.selectedMonth || new URLSearchParams(location.search).get("month") || currentMonth
  if (state.overview !== undefined && state.overview?.month === targetMonth) return state.overview
  const result = await fetchMonthOverview({ month: targetMonth })
  state.overview = result.ok ? normalizeOverview(result.data) : null
  state.selectedMonth = targetMonth
  return state.overview
}

async function changeInicioMonth(nextMonth) {
  const currentMonth = currentMonthKey()
  const target = (nextMonth || currentMonth).trim()
  state.selectedMonth = target
  state.overview = undefined
  const url = new URL(location.href)
  if (target === currentMonth) {
    url.searchParams.delete("month")
  } else {
    url.searchParams.set("month", target)
  }
  const next = `${url.pathname}${url.search}`
  if (next !== `${location.pathname}${location.search}`) {
    history.pushState(null, "", next)
  }
  viewEl.innerHTML = viewLoading()
  await loadOverview()
  paintInicio()
}

async function loadRecent(status = "all") {
  const normalized = status || "all"
  if (state.recent !== undefined && state.loadedStatus === normalized) return state.recent
  const queryStatus = normalized === "all" ? undefined : normalized
  const result = await fetchRecentSales({ limit: 50, status: queryStatus })
  state.recent = result.ok ? normalizeRecentSales(result.data) : null
  state.loadedStatus = normalized
  return state.recent
}

function bindSaleEditActions(sale) {
  saleDialog.querySelector("#sale-edit-close")?.addEventListener("click", () => saleDialog.close())
  if (!shouldShowSaleEdit(ADMIN_SALE_EDIT_ENABLED)) return

  saleDialog.querySelector("#sale-edit-save")?.addEventListener("click", async () => {
    const form = readSaleEditForm(saleDialog.querySelector(".sale-edit"))
    const body = saleUpdatePayload(sale.id, form)
    showMessage("Salvando…")
    const result = await updateAdminSale(body)
    if (!result.ok) {
      showMessage(result.error, "error")
      return
    }
    state.recent = undefined
    state.overview = undefined
    saleDialog.close()
    showMessage("Venda salva.")
    showView()
  })

  saleDialog.querySelector("#sale-edit-paid")?.addEventListener("click", async () => {
    showMessage("Marcando como paga…")
    const result = await markAdminSalePaid(saleMarkPaidPayload(sale.id))
    if (!result.ok) {
      showMessage(result.error, "error")
      return
    }
    state.recent = undefined
    state.overview = undefined
    saleDialog.close()
    showMessage("Venda marcada como paga.")
    showView()
  })

  saleDialog.querySelector("#sale-edit-cancel")?.addEventListener("click", async () => {
    if (!window.confirm("Cancelar esta venda e devolver o estoque?")) return
    await commitPendingSaleCancel()
    const orderId = sale.id
    const previousRecent = state.recent
    pendingSaleCancel = { orderId, previousRecent }
    saleDialog.close()
    if (Array.isArray(state.recent)) {
      state.recent = state.recent.filter((s) => s.id !== orderId)
    }
    showView()
    showMessage("Venda cancelada.", "", {
      undo: {
        label: "Desfazer",
        ms: 8000,
        run: () => undoCancelSale()
      }
    })
  })
}

async function openSaleDialog(sale) {
  if (!saleDialog || !sale) return
  let detail = sale
  saleDialog.innerHTML = renderSaleEditDialog(detail, formatPrice, { enabled: ADMIN_SALE_EDIT_ENABLED })
  if (!saleDialog.open) saleDialog.showModal()
  bindSaleEditActions(detail)

  if (shouldShowSaleEdit(ADMIN_SALE_EDIT_ENABLED)) {
    const loaded = await fetchAdminSale({ orderId: sale.id })
    if (loaded.ok) {
      const normalized = normalizeAdminSale(loaded.data)
      if (normalized) {
        detail = normalized
        saleDialog.innerHTML = renderSaleEditDialog(detail, formatPrice, { enabled: true })
        bindSaleEditActions(detail)
      }
    }
  }
}

function paintInicio() {
  viewEl.classList.add("view--inicio")
  viewEl.innerHTML = renderInicio(state.overview, formatPrice, {
    selectedChannel: state.selectedChannel,
    sales: state.recent || [],
    renderSales: (rows, formatMoney) => renderSaleCards(rows, formatMoney, { clickable: true })
  })
  bindInicio()
}

function bindSaleCards() {
  viewEl.querySelectorAll(".sale-card[data-sale-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-sale-id")
      const sale = (state.recent || []).find((row) => String(row.id) === String(id))
      openSaleDialog(sale)
    })
  })
}

function bindInicio() {
  const monthInput = viewEl.querySelector("#inicio-month-input")
  const currentMonthVal = state.overview?.month || state.selectedMonth || currentMonthKey()

  viewEl.querySelector("#btn-prev-month")?.addEventListener("click", () => {
    changeInicioMonth(stepMonth(currentMonthVal, -1))
  })
  viewEl.querySelector("#btn-next-month")?.addEventListener("click", () => {
    changeInicioMonth(stepMonth(currentMonthVal, 1))
  })
  viewEl.querySelector("#btn-current-month")?.addEventListener("click", () => {
    changeInicioMonth(currentMonthKey())
  })
  monthInput?.addEventListener("change", (e) => {
    const val = e.target.value
    if (val && /^\d{4}-\d{2}$/.test(val)) {
      changeInicioMonth(val)
    }
  })

  viewEl.querySelectorAll("[data-origin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const channel = btn.getAttribute("data-origin")
      state.selectedChannel = state.selectedChannel === channel ? null : channel
      paintInicio()
    })
  })
  viewEl.querySelector("#btn-edit-goal")?.addEventListener("click", async () => {
    const currentGoal = state.overview?.sales_goal || 10000
    const input = window.prompt("Defina a meta de vendas do mês (R$):", String(currentGoal))
    if (!input) return
    const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
    const newGoal = Number(cleaned)
    if (!Number.isFinite(newGoal) || newGoal <= 0) {
      showMessage("Valor inválido para a meta.", "error")
      return
    }
    showMessage("Salvando nova meta…")
    const res = await setMonthlyGoal(newGoal)
    if (state.overview) state.overview.sales_goal = res.ok && res.sales_goal ? res.sales_goal : newGoal
    showMessage(res.ok ? "Meta mensal atualizada!" : "Meta atualizada no painel.")
    paintInicio()
  })
  viewEl.querySelector("#btn-send-weekly-summary")?.addEventListener("click", async () => {
    showMessage("Enviando resumo semanal para seu e-mail…")
    const res = await triggerWeeklySummaryEmail({ days: 7 })
    if (res.ok) {
      showMessage(res.data?.message || "Resumo semanal enviado por e-mail com sucesso!")
    } else {
      showMessage(res.error || "Não foi possível enviar o resumo.", "error")
    }
  })
  viewEl.querySelector("#btn-export-sales-csv")?.addEventListener("click", () => {
    const csv = generateSalesCsv(state.recent || [])
    const month = state.overview?.month || new Date().toISOString().slice(0, 7)
    downloadCsvFile(csv, `vendas-maris-${month}.csv`)
    showMessage("Planilha de vendas exportada com sucesso.")
  })
  bindSaleCards()
}

function paintVendas() {
  viewEl.classList.remove("view--inicio")
  viewEl.innerHTML = renderVendas(state.recent, formatPrice, {
    selectedStatus: state.selectedSaleStatus || "all",
    filterSales: filterSalesByStatus,
    renderSales: (rows, formatMoney) => renderSaleCards(rows, formatMoney, {
      clickable: true,
      empty: "Nenhuma venda recente."
    })
  })
  bindSaleCards()
  viewEl.querySelector("#btn-export-sales-vendas")?.addEventListener("click", () => {
    const csv = generateSalesCsv(state.recent || [])
    const month = state.overview?.month || new Date().toISOString().slice(0, 7)
    downloadCsvFile(csv, `vendas-maris-${month}.csv`)
    showMessage("Planilha de vendas exportada com sucesso.")
  })
  viewEl.querySelectorAll(".status-filter-btn[data-status]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetStatus = btn.getAttribute("data-status") || "all"
      if (state.selectedSaleStatus === targetStatus) return
      state.selectedSaleStatus = targetStatus
      await loadRecent(targetStatus)
      paintVendas()
    })
  })
}

function paintVendedoras() {
  viewEl.classList.remove("view--inicio")
  const currentMonth = currentMonthKey()
  const activeMonth = state.selectedMonth || (state.sellers && state.sellers.month) || currentMonth
  viewEl.innerHTML = renderVendedoras(state.sellers, formatPrice, {
    month: activeMonth,
    selectedSellerId: state.selectedSellerId,
    sales: state.recent || [],
    filterSales: filterSalesBySeller,
    renderSales: (rows, formatMoney) => renderSaleCards(rows, formatMoney, {
      clickable: true,
      empty: "Nenhuma venda desta vendedora."
    })
  })

  // Controles de navegação de período no topo de vendedoras
  const monthInput = viewEl.querySelector("#inicio-month-input")
  viewEl.querySelector("#btn-prev-month")?.addEventListener("click", () => {
    changeVendedorasMonth(stepMonth(activeMonth, -1))
  })
  viewEl.querySelector("#btn-next-month")?.addEventListener("click", () => {
    changeVendedorasMonth(stepMonth(activeMonth, 1))
  })
  viewEl.querySelector("#btn-current-month")?.addEventListener("click", () => {
    changeVendedorasMonth(currentMonthKey())
  })
  monthInput?.addEventListener("change", (e) => {
    const val = e.target.value
    if (val && /^\d{4}-\d{2}$/.test(val)) {
      changeVendedorasMonth(val)
    }
  })

  viewEl.querySelectorAll(".seller-card[data-seller-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-seller-id")
      state.selectedSellerId = state.selectedSellerId != null && String(state.selectedSellerId) === String(id)
        ? null
        : id
      paintVendedoras()
    })
  })
  bindSaleCards()
}

async function changeVendedorasMonth(nextMonth) {
  const currentMonth = currentMonthKey()
  const target = (nextMonth || currentMonth).trim()
  state.selectedMonth = target
  state.sellers = undefined
  state.sellersMonth = undefined
  const url = new URL(location.href)
  if (target === currentMonth) {
    url.searchParams.delete("month")
  } else {
    url.searchParams.set("month", target)
  }
  history.replaceState(null, "", url.toString())
  showMessage("Carregando vendedoras de " + formatMonthLabel(target) + "…")
  await loadSellers(target)
  paintVendedoras()
}

async function loadSellers(monthParam) {
  const urlParam = new URLSearchParams(location.search).get("month")
  const targetMonth = monthParam || state.selectedMonth || (urlParam && /^\d{4}-\d{2}$/.test(urlParam) ? urlParam : currentMonthKey())
  if (state.sellers !== undefined && state.sellersMonth === targetMonth) return state.sellers
  const result = await fetchSellersMonth({ month: targetMonth })
  if (result.ok) {
    state.sellers = normalizeSellersMonth(result.data)
    state.sellersMonth = targetMonth
    return state.sellers
  }
  const listed = await window.MarisStaffData?.listActiveSellers?.()
  state.sellers = listed && !listed.error ? sellersFromDirectory(listed.data) : null
  state.sellersMonth = targetMonth
  return state.sellers
}

function paintCompras() {
  viewEl.classList.remove("view--inicio")
  const currentMonth = currentMonthKey()
  const activeMonth = state.selectedMonth || (state.purchases && state.purchases.month) || currentMonth
  viewEl.innerHTML = renderCompras(state.purchases, formatPrice, {
    month: activeMonth
  })

  // Controles de navegação de período no topo de compras
  const monthInput = viewEl.querySelector("#inicio-month-input")
  viewEl.querySelector("#btn-prev-month")?.addEventListener("click", () => {
    changeComprasMonth(stepMonth(activeMonth, -1))
  })
  viewEl.querySelector("#btn-next-month")?.addEventListener("click", () => {
    changeComprasMonth(stepMonth(activeMonth, 1))
  })
  viewEl.querySelector("#btn-current-month")?.addEventListener("click", () => {
    changeComprasMonth(currentMonthKey())
  })
  monthInput?.addEventListener("change", (e) => {
    const val = e.target.value
    if (val && /^\d{4}-\d{2}$/.test(val)) {
      changeComprasMonth(val)
    }
  })

  // Diálogo de contatos da lista de espera
  viewEl.querySelectorAll("[data-view-contacts]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-view-contacts")
      const item = (state.purchases?.restock_requests || []).find((r) => String(r.code) === String(code))
      openComprasContactsDialog(item)
    })
  })
}

async function changeComprasMonth(nextMonth) {
  const currentMonth = currentMonthKey()
  const target = (nextMonth || currentMonth).trim()
  state.selectedMonth = target
  state.purchases = undefined
  state.purchasesMonth = undefined
  const url = new URL(location.href)
  if (target === currentMonth) {
    url.searchParams.delete("month")
  } else {
    url.searchParams.set("month", target)
  }
  history.replaceState(null, "", url.toString())
  showMessage("Carregando compras de " + formatMonthLabel(target) + "…")
  await loadPurchases(target)
  paintCompras()
}

async function loadPurchases(monthParam) {
  const urlParam = new URLSearchParams(location.search).get("month")
  const targetMonth = monthParam || state.selectedMonth || (urlParam && /^\d{4}-\d{2}$/.test(urlParam) ? urlParam : currentMonthKey())
  if (state.purchases !== undefined && state.purchasesMonth === targetMonth) return state.purchases
  const result = await fetchPurchasesOverview({ month: targetMonth })
  if (result.ok) {
    state.purchases = result.data || {}
    state.purchasesMonth = targetMonth
    return state.purchases
  }
  state.purchases = null
  state.purchasesMonth = targetMonth
  return null
}

function openComprasContactsDialog(item) {
  if (!item) return
  let dialog = document.getElementById("compras-contacts-dialog")
  if (!dialog) {
    dialog = document.createElement("dialog")
    dialog.id = "compras-contacts-dialog"
    dialog.className = "admin-dialog compras-contacts-dialog"
    document.body.appendChild(dialog)
  }
  const contacts = Array.isArray(item.contacts) ? item.contacts : []
  const contactsHtml = contacts.length === 0
    ? `<p class="empty">Nenhum dado de contato registrado para esta peça.</p>`
    : `<ul class="compras-contacts-list">${contacts.map((c) => {
        const telDigits = String(c.buyer_whatsapp || "").replace(/\D/g, "")
        const waLink = telDigits ? `<a href="https://wa.me/55${telDigits}" target="_blank" rel="noopener" class="btn-xs btn-whatsapp">💬 WhatsApp: ${escapeHtml(c.buyer_whatsapp)}</a>` : ""
        const emailLink = c.buyer_email ? `<a href="mailto:${escapeHtml(c.buyer_email)}" class="btn-xs btn-email">✉️ ${escapeHtml(c.buyer_email)}</a>` : ""
        const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : ""
        return `<li class="compras-contact-item">
          <div class="compras-contact-name"><strong>${escapeHtml(c.buyer_name || "Cliente")}</strong>${dateStr ? `<small class="hint">Pedido em ${dateStr}</small>` : ""}</div>
          <div class="compras-contact-links">${waLink}${emailLink}</div>
        </li>`
      }).join("")}</ul>`

  dialog.innerHTML = `<div class="dialog-content">
    <div class="dialog-header">
      <h2>Lista de Espera · ${escapeHtml(item.name || item.code)}</h2>
      <p class="hint">${escapeHtml(item.code)} · ${contacts.length} interessada(s)</p>
    </div>
    ${contactsHtml}
    <div class="dialog-actions">
      <button type="button" class="btn-ghost" id="compras-contacts-close">Fechar</button>
    </div>
  </div>`

  dialog.querySelector("#compras-contacts-close")?.addEventListener("click", () => dialog.close())
  if (!dialog.open) dialog.showModal()
}

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

async function render(view, token) {
  // Não limpa toast com Desfazer pendente.
  if (!undoAction) showMessage("")
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
  if (view === "adicionar") {
    if (!state.defaultsLoaded) viewEl.innerHTML = viewLoading()
    await loadDefaults()
    if (stale()) return
    viewEl.innerHTML = renderAddForm()
    bindAddForm()
    return
  }
  if (view === "importar") {
    viewEl.innerHTML = `<form id="import-form" class="stack">
      <h2>Importar</h2>
      ${renderImportHelp()}
      <label class="field"><span>Arquivo JSON</span><input id="file" type="file" accept=".json,.txt,application/json"></label>
      <button class="btn-primary" type="submit">Importar</button>
    </form>`
    bindImport()
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
  reveal()
  await showView()
}

if (!shouldShowDashboard()) {
  location.replace("/paginas/admin/admin.html")
} else {
  boot()
}
