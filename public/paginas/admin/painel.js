import {
  archivePayload,
  buildAddProductPayload,
  buildProductUpdatePayload,
  componentUpdatePayload,
  dashboardView,
  defaultsFor,
  fieldPlaceholder,
  isComponentSku,
  isDashboardAdmin,
  navHtml,
  renderAddForm,
  renderArchiveDialog,
  renderImportHelp,
  renderPieceForm,
  renderStockList,
  renderTipos,
  shouldShowDashboard,
  stockNavHtml,
  validateAddProduct,
  validateProductUpdate
} from "./painel.logic.js"
import {
  addProduct,
  archiveProduct,
  fetchCategoryDefaults,
  importProducts,
  listProducts,
  updateComponentSku,
  updateProduct
} from "./painel.api.js"
import {
  formatImageFailuresWarning,
  formatImportErrorMessage,
  formatImportSuccessMessage,
  parseImportJsonText
} from "../estoque/importar/importar.logic.js"

const TITLES = {
  inicio: "Início",
  estoque: "Estoque",
  vendas: "Vendas",
  vendedoras: "Vendedoras",
  peca: "Editar peça",
  tipos: "Tipos",
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

const viewEl = document.getElementById("view")
const messageEl = document.getElementById("message")
const stockNav = document.getElementById("stock-nav")
const dashNav = document.getElementById("dash-nav")
const titleEl = document.getElementById("view-title")
const dialog = document.getElementById("archive-dialog")

const state = {
  products: [],
  productsLoaded: false,
  defaults: {},
  defaultsLoaded: false,
  piece: null
}

function showMessage(text, kind) {
  messageEl.hidden = !text
  messageEl.textContent = text || ""
  messageEl.className = kind ? `note ${kind}` : "note"
}

function paintChrome(view) {
  const top = ["peca", "tipos", "adicionar", "importar"].includes(view) ? "estoque" : view
  dashNav.innerHTML = navHtml(top)
  const sub = ["estoque", "peca", "tipos", "adicionar", "importar"].includes(view)
  stockNav.hidden = !sub
  if (sub) stockNav.innerHTML = stockNavHtml(view === "peca" ? "estoque" : view)
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
      location.assign("/admin/estoque")
    })
  })
}

function bindAddForm() {
  document.getElementById("categoria").addEventListener("change", (event) => {
    refreshPlaceholders(event.target.value)
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
    showMessage(result.ok ? "Peça adicionada." : result.error, result.ok ? "" : "error")
  })
}

function bindTipos() {
  const form = document.getElementById("tipos-form")
  if (!form) return
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const inputs = [...form.querySelectorAll("input[data-component-id]")]
    for (const input of inputs) {
      if (isComponentSku(input.value, input.dataset.productCode)) continue
      showMessage(`O SKU precisa seguir ${input.dataset.productCode}-TIPO.`, "error")
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

async function render(view) {
  showMessage("")
  if (view === "inicio") {
    viewEl.innerHTML = `<p class="empty">O resumo do dia entra aqui.</p>`
    return
  }
  if (view === "vendas") {
    viewEl.innerHTML = `<p class="empty">As vendas da loja entram aqui.</p>`
    return
  }
  if (view === "vendedoras") {
    viewEl.innerHTML = `<p class="empty">A equipe entra aqui.</p>`
    return
  }
  if (view === "estoque") {
    await loadProducts()
    viewEl.innerHTML = renderStockList(state.products)
    return
  }
  if (view === "peca") {
    const code = new URLSearchParams(location.search).get("code")
    await Promise.all([loadProducts(), loadDefaults()])
    state.piece = state.products.find((item) => item.code === code) || null
    if (!state.piece) {
      viewEl.innerHTML = `<p class="empty">Peça não encontrada.</p>`
      return
    }
    viewEl.innerHTML = renderPieceForm(state.piece, categoryBag(state.piece.categoria))
    bindPieceForm()
    return
  }
  if (view === "tipos") {
    await loadProducts()
    viewEl.innerHTML = renderTipos(state.products)
    bindTipos()
    return
  }
  if (view === "adicionar") {
    await loadDefaults()
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

async function boot() {
  const profile = await window.MarisStaffAuth.loadProfile()
  if (!profile?.ok || !isDashboardAdmin(profile.user)) {
    viewEl.innerHTML = `<p class="empty">Só o administrador entra neste painel.</p>`
    document.body.hidden = false
    return
  }
  const view = dashboardView(location.pathname, location.search)
  paintChrome(view)
  document.body.hidden = false
  await render(view)
}

if (!shouldShowDashboard()) {
  location.replace("/admin")
} else {
  boot()
}
