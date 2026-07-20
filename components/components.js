const {
  createSupabaseClient,
  formatMoneyBRL,
  groupByKey,
  computeComponentPrice,
  percentFromSavedPrice,
  parseComponentRows,
  debounce
} = window.MarisUtils
const { resolvePercentForRow, doesProductMatchSearch } = window.MarisComponentsLogic

const supabaseClient = createSupabaseClient()

const productSearchInput = document.getElementById("product-search")
const productsGrid = document.getElementById("products-grid")
const unavailableProductsSection = document.getElementById("unavailable-products-section")
const unavailableProductsGrid = document.getElementById("unavailable-products-grid")
const productModal = document.getElementById("product-modal")
const productModalCloseBtn = document.getElementById("product-modal-close")
const productModalImage = document.getElementById("product-modal-image")
const productModalTitle = document.getElementById("product-modal-title")
const productModalCode = document.getElementById("product-modal-code")
const productModalPrice = document.getElementById("product-modal-price")
const productModalStock = document.getElementById("product-modal-stock")
const componentsList = document.getElementById("components-list")
const addComponentBtn = document.getElementById("add-component-btn")
const saveComponentsBtn = document.getElementById("save-components-btn")
const messageEl = document.getElementById("components-message")

let products = []
let componentsByProductCode = Object.create(null)
let currentProductCode = ""
let currentProductUnitPrice = 0

function getSearchTerm() {
  return (productSearchInput?.value || "").trim().toLowerCase()
}

function setMessage(text, type = "") {
  window.MarisUI.setFeedback(messageEl, text, type, { baseClass: "message", toggleHidden: false })
}

function resolvePercentForComponentRow(component, parentPrice) {
  return resolvePercentForRow(component, parentPrice, percentFromSavedPrice)
}

function updateRowPricePreview(row) {
  if (!row) return
  const previewEl = row.querySelector('[data-field="price_preview"]')
  const percentInput = row.querySelector('input[data-field="price_percent"]')
  if (!previewEl || !percentInput) return

  const result = computeComponentPrice(currentProductUnitPrice, percentInput.value)
  previewEl.textContent = result.ok ? formatMoneyBRL(result.value) : "—"
}

function createComponentRow(component = null, parentPrice = 0) {
  const id = component?.id ? String(component.id) : ""
  const name = component?.name || ""
  const percent = component ? resolvePercentForComponentRow(component, parentPrice) : ""
  const quantity = component?.quantity != null ? String(component.quantity) : "0"

  const result = percent ? computeComponentPrice(parentPrice, percent) : { ok: false }
  const previewText = result.ok ? formatMoneyBRL(result.value) : "—"

  return `
    <div class="component-row" data-component-id="${id}">
      <input data-field="name" type="text" placeholder="Nome (ex.: Brinco)" value="${name}">
      <input data-field="price_percent" type="number" min="0" step="0.01" placeholder="%" value="${percent}" aria-label="Percentual do preço">
      <span class="component-price-preview" data-field="price_preview">${previewText}</span>
      <input data-field="quantity" type="number" min="0" step="1" placeholder="Estoque" value="${quantity}">
      <button type="button" class="component-remove-btn">Remover</button>
    </div>
  `
}

function renderProductCard(product) {
  const quantity = Number(product.quantity) || 0
  const soldOut = quantity <= 0
  const components = componentsByProductCode[product.code] || []
  const splitInfo = components.length
    ? `<div class="split-info">Tipos cadastrados: ${components.length}</div>`
    : '<div class="split-info">Sem tipos cadastrados</div>'

  return `
    <div class="product" data-product-code="${product.code}" role="button" tabindex="0">
      <img src="${product.image_url}" alt="${product.name}">
      <h3>${product.name}</h3>
      <div class="code">Código: ${product.code}</div>
      ${splitInfo}
      <div class="price">${soldOut ? "Em falta" : formatMoneyBRL(product.unit_price)}</div>
      <div class="stock ${soldOut ? "zero" : ""}">Estoque: ${quantity}</div>
    </div>
  `
}

function renderComponentRows(productCode) {
  const product = products.find((item) => item.code === productCode)
  const parentPrice = Number(product?.unit_price) || currentProductUnitPrice || 0
  const components = componentsByProductCode[productCode] || []

  if (!components.length) {
    componentsList.innerHTML = createComponentRow(null, parentPrice)
    return
  }

  componentsList.innerHTML = components
    .map((component) => createComponentRow(component, parentPrice))
    .join("")
}

async function loadComponents() {
  const { data, error } = await supabaseClient
    .from("product_components")
    .select("id, product_code, name, unit_price, price_percent, quantity, is_active")
    .order("name")

  if (error) {
    setMessage("Erro ao carregar tipos cadastrados.", "error")
    return
  }

  componentsByProductCode = groupByKey(data || [], (c) => c.product_code)
}

function openProductModal(product) {
  if (!product) return
  currentProductCode = product.code
  currentProductUnitPrice = Number(product.unit_price) || 0
  setMessage("")
  productModalImage.src = product.image_url || ""
  productModalImage.alt = product.name || "Produto"
  productModalTitle.textContent = product.name || "Produto"
  productModalCode.textContent = `Código: ${product.code || "-"}`
  productModalPrice.textContent = `Preço atual do produto: ${formatMoneyBRL(product.unit_price)}`
  productModalStock.textContent = `Estoque do produto: ${Number(product.quantity) || 0}`
  renderComponentRows(product.code)
  productModal.hidden = false
}

function closeProductModal() {
  productModal.hidden = true
  currentProductCode = ""
  currentProductUnitPrice = 0
}

function handleProductCardClick(target) {
  const card = target.closest(".product[data-product-code]")
  if (!card) return
  const code = card.dataset.productCode
  const product = products.find((item) => item.code === code)
  openProductModal(product)
}

async function loadCatalogProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("code, name, unit_price, quantity, image_url")
    .order("name")

  if (error) {
    productsGrid.innerHTML = "Erro ao carregar produtos."
    unavailableProductsSection.hidden = true
    return
  }

  products = data || []
  renderProductGrids()
}

function renderProductGrids() {
  const term = getSearchTerm()
  const available = products.filter((product) => (Number(product.quantity) || 0) > 0)
  const unavailable = products.filter((product) => (Number(product.quantity) || 0) <= 0)
  const availableFiltered = available.filter((product) => doesProductMatchSearch(product, term))
  const unavailableFiltered = unavailable.filter((product) => doesProductMatchSearch(product, term))

  if (!available.length) {
    productsGrid.innerHTML = "Nenhum produto disponível."
  } else if (!availableFiltered.length) {
    productsGrid.innerHTML = term
      ? "Nenhum produto disponível encontrado para a busca"
      : "Nenhum produto disponível."
  } else {
    productsGrid.innerHTML = availableFiltered.map((product) => renderProductCard(product)).join("")
  }

  if (!unavailable.length || !unavailableFiltered.length) {
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  unavailableProductsSection.hidden = false
  unavailableProductsGrid.innerHTML = unavailableFiltered.map((product) => renderProductCard(product)).join("")
}

async function saveCurrentProductComponents() {
  const productCode = currentProductCode
  if (!productCode) {
    setMessage("Selecione um produto para salvar.", "error")
    return
  }

  const rows = Array.from(componentsList.querySelectorAll(".component-row"))
  const rawRows = rows.map((row) => {
    const idAttr = row.getAttribute("data-component-id")
    const parsedId = idAttr && String(idAttr).trim() !== "" ? Number(idAttr) : null
    return {
      id: Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null,
      name: row.querySelector('input[data-field="name"]')?.value,
      price_percent: row.querySelector('input[data-field="price_percent"]')?.value,
      quantity: row.querySelector('input[data-field="quantity"]')?.value
    }
  })

  const parsed = parseComponentRows(rawRows, currentProductUnitPrice)
  if (!parsed.ok) {
    setMessage(parsed.error, "error")
    return
  }

  const parsedRows = parsed.rows.map((row) => ({
    ...row,
    product_code: productCode
  }))

  const { data: existingRows, error: existingError } = await supabaseClient
    .from("product_components")
    .select("id")
    .eq("product_code", productCode)

  if (existingError) {
    setMessage("Erro ao ler subdivisões atuais.", "error")
    return
  }

  const existingIds = new Set((existingRows || []).map((r) => r.id))
  const keptIds = new Set(parsedRows.filter((r) => r.id).map((r) => r.id))

  for (const row of parsedRows) {
    if (row.id && !existingIds.has(row.id)) {
      setMessage("Subdivisão inválida: atualize a página e tente de novo.", "error")
      return
    }
  }

  for (const id of existingIds) {
    if (!keptIds.has(id)) {
      const { error: deleteOneError } = await supabaseClient
        .from("product_components")
        .delete()
        .eq("id", id)
        .eq("product_code", productCode)

      if (deleteOneError) {
        setMessage("Erro ao remover subdivisão retirada.", "error")
        return
      }
    }
  }

  for (const row of parsedRows) {
    const payload = {
      name: row.name,
      price_percent: row.price_percent,
      unit_price: row.unit_price,
      quantity: row.quantity,
      is_active: true
    }

    if (row.id) {
      const { error: updateError } = await supabaseClient
        .from("product_components")
        .update(payload)
        .eq("id", row.id)
        .eq("product_code", productCode)

      if (updateError) {
        setMessage("Erro ao atualizar subdivisão.", "error")
        return
      }
    } else {
      const { error: insertError } = await supabaseClient
        .from("product_components")
        .insert({
          product_code: row.product_code,
          ...payload
        })

      if (insertError) {
        setMessage("Erro ao criar subdivisão.", "error")
        return
      }
    }
  }

  await loadComponents()
  renderComponentRows(productCode)
  await loadCatalogProducts()
  setMessage("Tipos salvos com sucesso.", "success")
}

componentsList.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!target.classList.contains("component-remove-btn")) return

  const row = target.closest(".component-row")
  if (row) row.remove()

  if (!componentsList.querySelector(".component-row")) {
    componentsList.innerHTML = createComponentRow(null, currentProductUnitPrice)
  }
})

componentsList.addEventListener("input", (event) => {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  if (target.dataset.field !== "price_percent") return
  const row = target.closest(".component-row")
  updateRowPricePreview(row)
})

addComponentBtn.addEventListener("click", () => {
  componentsList.insertAdjacentHTML("beforeend", createComponentRow(null, currentProductUnitPrice))
})

saveComponentsBtn.addEventListener("click", () => {
  saveCurrentProductComponents()
})

productsGrid.addEventListener("click", (event) => {
  handleProductCardClick(event.target)
})

unavailableProductsGrid.addEventListener("click", (event) => {
  handleProductCardClick(event.target)
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !productModal.hidden) {
    closeProductModal()
  }
})

productModal.addEventListener("click", (event) => {
  const target = event.target
  if (target instanceof HTMLElement && target.dataset.closeModal === "true") {
    closeProductModal()
  }
})

productModalCloseBtn.addEventListener("click", closeProductModal)

if (productSearchInput) {
  const scheduleRender = debounce(() => renderProductGrids(), 120)
  productSearchInput.addEventListener("input", scheduleRender)
}

Promise.all([loadComponents(), loadCatalogProducts()])
