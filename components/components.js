const { createSupabaseClient } = window.MarisUtils

const supabaseClient = createSupabaseClient()

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

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function setMessage(text, type = "") {
  messageEl.textContent = text
  messageEl.className = `message ${type}`.trim()
}

function createComponentRow(component = null) {
  const id = component?.id ? String(component.id) : ""
  const name = component?.name || ""
  const price = component?.unit_price != null ? String(component.unit_price) : ""
  const quantity = component?.quantity != null ? String(component.quantity) : "0"

  return `
    <div class="component-row" data-component-id="${id}">
      <input data-field="name" type="text" placeholder="Nome (ex.: Brinco)" value="${name}">
      <input data-field="unit_price" type="number" min="0" step="0.01" placeholder="Valor" value="${price}">
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
      <div class="price">${soldOut ? "Em falta" : formatMoney(product.unit_price)}</div>
      <div class="stock ${soldOut ? "zero" : ""}">Estoque: ${quantity}</div>
    </div>
  `
}

function renderComponentRows(productCode) {
  const components = componentsByProductCode[productCode] || []
  if (!components.length) {
    componentsList.innerHTML = createComponentRow()
    return
  }
  componentsList.innerHTML = components.map((component) => createComponentRow(component)).join("")
}

async function loadComponents() {
  const { data, error } = await supabaseClient
    .from("product_components")
    .select("id, product_code, name, unit_price, quantity, is_active")
    .eq("is_active", true)
    .order("name")

  if (error) {
    setMessage("Erro ao carregar tipos cadastrados.", "error")
    return
  }

  componentsByProductCode = Object.create(null)
  ;(data || []).forEach((component) => {
    if (!componentsByProductCode[component.product_code]) {
      componentsByProductCode[component.product_code] = []
    }
    componentsByProductCode[component.product_code].push(component)
  })
}

function openProductModal(product) {
  if (!product) return
  currentProductCode = product.code
  setMessage("")
  productModalImage.src = product.image_url || ""
  productModalImage.alt = product.name || "Produto"
  productModalTitle.textContent = product.name || "Produto"
  productModalCode.textContent = `Código: ${product.code || "-"}`
  productModalPrice.textContent = `Preço atual do produto: ${formatMoney(product.unit_price)}`
  productModalStock.textContent = `Estoque do produto: ${Number(product.quantity) || 0}`
  renderComponentRows(product.code)
  productModal.hidden = false
}

function closeProductModal() {
  productModal.hidden = true
  currentProductCode = ""
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
  const available = products.filter((product) => (Number(product.quantity) || 0) > 0)
  const unavailable = products.filter((product) => (Number(product.quantity) || 0) <= 0)

  productsGrid.innerHTML = available.length
    ? available.map((product) => renderProductCard(product)).join("")
    : "Nenhum produto disponível."

  if (!unavailable.length) {
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  unavailableProductsSection.hidden = false
  unavailableProductsGrid.innerHTML = unavailable.map((product) => renderProductCard(product)).join("")
}

async function saveCurrentProductComponents() {
  const productCode = currentProductCode
  if (!productCode) {
    setMessage("Selecione um produto para salvar.", "error")
    return
  }

  const rows = Array.from(componentsList.querySelectorAll(".component-row"))
  const parsedRows = []

  for (const row of rows) {
    const name = String(row.querySelector('input[data-field="name"]')?.value || "").trim()
    const unitPrice = Number(row.querySelector('input[data-field="unit_price"]')?.value)
    const quantity = Number(row.querySelector('input[data-field="quantity"]')?.value)

    if (!name) continue

    if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isInteger(quantity) || quantity < 0) {
      setMessage("Preencha valor e estoque corretamente (estoque inteiro e >= 0).", "error")
      return
    }

    parsedRows.push({
      product_code: productCode,
      name,
      unit_price: unitPrice,
      quantity,
      is_active: true
    })
  }

  const { error: deleteError } = await supabaseClient
    .from("product_components")
    .delete()
    .eq("product_code", productCode)

  if (deleteError) {
    setMessage("Erro ao atualizar tipos.", "error")
    return
  }

  if (parsedRows.length) {
    const { error: insertError } = await supabaseClient
      .from("product_components")
      .insert(parsedRows)

    if (insertError) {
      setMessage("Erro ao salvar tipos.", "error")
      return
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
    componentsList.innerHTML = createComponentRow()
  }
})

addComponentBtn.addEventListener("click", () => {
  componentsList.insertAdjacentHTML("beforeend", createComponentRow())
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

Promise.all([loadComponents(), loadCatalogProducts()])
