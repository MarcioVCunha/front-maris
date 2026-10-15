import {
  archivePayload,
  buildAddProductPayload,
  buildProductUpdatePayload,
  componentUpdatePayload,
  dashboardView,
  defaultsFor,
  fieldPlaceholder,
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
  renderStockList,
  renderStockPage,
  renderVendas,
  renderVendedoras,
  sellersFromDirectory,
  shouldShowDashboard,
  stockNavHtml,
  STOCK_PAGE_SIZE,
  validateAddProduct,
  validateProductUpdate,
  visibleStock
} from "./painel.logic.js"
import {
  ADMIN_SALE_EDIT_ENABLED,
  renderSaleCards,
  renderSaleEditDialog,
  shouldShowSaleEdit
} from "./venda-edicao.logic.js"
import {
  ADMIN_CONJUNTOS_ENABLED,
  readDivisionRows,
  renderConjuntoCreatePicker,
  renderConjuntoEditDialog,
  renderConjuntosPage,
  saveDivisionsPayload,
  shouldShowConjuntos,
  validateDivisionsPayload
} from "./conjuntos.logic.js"
import {
  addProduct,
  archiveProduct,
  fetchCategoryDefaults,
  fetchMonthOverview,
  fetchRecentSales,
  fetchSellersMonth,
  importProducts,
  listProducts,
  saveProductDivisions,
  updateComponentSku,
  updateProduct
} from "./painel.api.js"
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
  estoque: "Estoque",
  vendas: "Vendas",
  vendedoras: "Vendedoras",
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
const conjuntoDialog = document.getElementById("conjunto-dialog")

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
  conjuntoQuery: ""
}

function showMessage(text, kind) {
  messageEl.hidden = !text
  messageEl.textContent = text || ""
  messageEl.className = kind ? `note ${kind}` : "note"
}

function paintChrome(view) {
  const top = ["peca", "conjuntos", "adicionar", "importar"].includes(view) ? "estoque" : view
  dashNav.innerHTML = navHtml(top)
  const sub = ["estoque", "peca", "conjuntos", "adicionar", "importar"].includes(view)
  stockNav.hidden = !sub
  if (sub) {
    const subActive = view === "peca" ? "estoque" : view
    stockNav.innerHTML = stockNavHtml(subActive)
  }
  titleEl.textContent = TITLES[view] || "Painel"
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

function bindPieceForm() {
  document.getElementById("categoria").addEventListener("change", (event) => {
    refreshPlaceholders(event.target.value)
  })
  document.getElementById("piece-form").addEventListener("submit", async (event) => {
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
    if (result.ok) state.productsLoaded = false
  })
  document.getElementById("archive-open").addEventListener("click", () => {
    dialog.innerHTML = renderArchiveDialog(state.piece)
    dialog.showModal()
    dialog.querySelector("#archive-cancel").addEventListener("click", () => dialog.close())
    dialog.querySelector("#archive-confirm").addEventListener("click", async () => {
      const result = await archiveProduct(archivePayload(state.piece.code))
      if (!result.ok) {
        showMessage(result.error, "error")
        return
      }
      dialog.close()
      state.productsLoaded = false
      navigate("/admin/estoque")
    })
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

function paintStock() {
  const { rows, total } = visibleStock(state.products, state.stockQuery, state.stockLimit)
  const empty = state.stockQuery.trim() ? "Nenhuma peça com esse nome." : "Nenhuma peça no estoque."
  const listHtml = rows.length ? renderStockList(rows) : `<p class="empty">${empty}</p>`
  const list = document.getElementById("stock-list")
  if (!list) {
    viewEl.innerHTML = renderStockPage({ rows, total, query: state.stockQuery })
    const fresh = document.getElementById("stock-list")
    if (fresh) fresh.innerHTML = listHtml
    return
  }
  list.innerHTML = listHtml
  const meta = document.getElementById("stock-meta")
  if (meta) meta.textContent = total ? `${rows.length} de ${total}` : ""
  const more = document.getElementById("stock-more")
  if (total > rows.length) {
    if (!more) {
      const button = document.createElement("button")
      button.id = "stock-more"
      button.type = "button"
      button.className = "btn-ghost"
      button.textContent = "Mais peças"
      viewEl.appendChild(button)
    }
  } else if (more) {
    more.remove()
  }
}

function bindStockOnce() {
  if (viewEl.dataset.stockBound === "1") return
  viewEl.dataset.stockBound = "1"
  viewEl.addEventListener("input", (event) => {
    if (event.target.id !== "stock-query") return
    state.stockQuery = event.target.value
    state.stockLimit = STOCK_PAGE_SIZE
    paintStock()
  })
  viewEl.addEventListener("click", (event) => {
    if (event.target.id !== "stock-more") return
    state.stockLimit += STOCK_PAGE_SIZE
    paintStock()
  })
  viewEl.addEventListener("submit", (event) => {
    if (event.target.id === "stock-search") event.preventDefault()
  })
}

async function loadOverview() {
  if (state.overview !== undefined) return state.overview
  const result = await fetchMonthOverview({ month: currentMonthKey() })
  state.overview = result.ok ? normalizeOverview(result.data) : null
  return state.overview
}

async function loadRecent() {
  if (state.recent !== undefined) return state.recent
  const result = await fetchRecentSales({ limit: 50 })
  state.recent = result.ok ? normalizeRecentSales(result.data) : null
  return state.recent
}

function openSaleDialog(sale) {
  if (!saleDialog || !sale) return
  saleDialog.innerHTML = renderSaleEditDialog(sale, formatPrice, { enabled: ADMIN_SALE_EDIT_ENABLED })
  saleDialog.showModal()
  saleDialog.querySelector("#sale-edit-close")?.addEventListener("click", () => saleDialog.close())
  if (!shouldShowSaleEdit()) return
  // Ações reais ficam para quando as RPCs existirem e a flag ligar.
  saleDialog.querySelector("#sale-edit-save")?.addEventListener("click", () => {
    showMessage("Salvar venda ainda depende do back (ver contrato de edição).", "error")
  })
  saleDialog.querySelector("#sale-edit-paid")?.addEventListener("click", () => {
    showMessage("Marcar como paga no painel ainda depende do back unificado.", "error")
  })
  saleDialog.querySelector("#sale-edit-cancel")?.addEventListener("click", () => {
    showMessage("Cancelar venda no painel ainda depende do back unificado.", "error")
  })
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

function bindInicio() {
  viewEl.querySelectorAll("[data-origin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const channel = btn.getAttribute("data-origin")
      state.selectedChannel = state.selectedChannel === channel ? null : channel
      paintInicio()
    })
  })
  viewEl.querySelectorAll(".sale-card[data-sale-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-sale-id")
      const sale = (state.recent || []).find((row) => String(row.id) === String(id))
      openSaleDialog(sale)
    })
  })
}

async function loadSellers() {
  if (state.sellers !== undefined) return state.sellers
  const result = await fetchSellersMonth({ month: currentMonthKey() })
  if (result.ok) {
    state.sellers = normalizeSellersMonth(result.data)
    return state.sellers
  }
  const listed = await window.MarisStaffData?.listActiveSellers?.()
  state.sellers = listed && !listed.error ? sellersFromDirectory(listed.data) : null
  return state.sellers
}

function navigate(href) {
  const url = new URL(href, location.origin)
  const next = `${url.pathname}${url.search}`
  if (next !== `${location.pathname}${location.search}`) history.pushState(null, "", next)
  showView()
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
  showMessage("")
  const stale = () => token !== renderToken
  if (view === "inicio") {
    viewEl.classList.add("view--inicio")
    if (state.overview === undefined || state.recent === undefined) viewEl.innerHTML = viewLoading()
    await Promise.all([loadOverview(), loadRecent()])
    if (stale()) return
    paintInicio()
    return
  }
  viewEl.classList.remove("view--inicio")
  if (view === "vendas") {
    if (state.recent === undefined) viewEl.innerHTML = viewLoading()
    const sales = await loadRecent()
    if (stale()) return
    viewEl.innerHTML = renderVendas(sales)
    viewEl.querySelectorAll(".sale-row").forEach((row) => {
      // Vendas ainda é lista; a edição reutilizável entra quando a flag ligar.
      row.classList.add("sale-row--static")
    })
    return
  }
  if (view === "vendedoras") {
    if (state.sellers === undefined) viewEl.innerHTML = viewLoading()
    const sellers = await loadSellers()
    if (stale()) return
    viewEl.innerHTML = renderVendedoras(sellers)
    return
  }
  if (view === "estoque") {
    if (!document.getElementById("stock-search")) viewEl.innerHTML = viewLoading()
    await loadProducts()
    if (stale()) return
    paintStock()
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
    bindPieceForm()
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
  reveal()
  await showView()
}

if (!shouldShowDashboard()) {
  location.replace("/paginas/admin/admin.html")
} else {
  boot()
}
