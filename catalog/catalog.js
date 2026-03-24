const { createSupabaseClient, sortProductsByStockAndName } = window.MarisUtils

const supabaseClient = createSupabaseClient()

const catalogEl = document.getElementById("catalog")
const unavailableProductsSection = document.getElementById("unavailable-products-section")
const unavailableProductsGrid = document.getElementById("unavailable-products-grid")
const productModal = document.getElementById("product-modal")
const productModalCloseBtn = document.getElementById("product-modal-close")
const productModalImage = document.getElementById("product-modal-image")
const productModalTitle = document.getElementById("product-modal-title")
const productModalCode = document.getElementById("product-modal-code")
const productModalPrice = document.getElementById("product-modal-price")
const productModalStock = document.getElementById("product-modal-stock")
const productModalStatus = document.getElementById("product-modal-status")
const productModalComponentsList = document.getElementById("product-modal-components-list")
const productModalAddComponentBtn = document.getElementById("product-modal-add-component")
const productModalSaveComponentsBtn = document.getElementById("product-modal-save-components")
const productModalComponentsMessage = document.getElementById("product-modal-components-message")

let productsByCode = Object.create(null)
let componentsByProductCode = Object.create(null)
let currentModalProductCode = null

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function getProductComponents(productCode) {
  return componentsByProductCode[productCode] || []
}

function setComponentsMessage(text, type = "success") {
  productModalComponentsMessage.textContent = text
  productModalComponentsMessage.style.color = type === "error" ? "#a94442" : "#2f7a4a"
}

function renderCatalogProduct(product) {
  const quantity = Number(product.quantity) || 0
  const soldOut = quantity <= 0
  const showPrice = quantity > 0
  const unitPrice = Number(product.unit_price) || 0
  const components = getProductComponents(product.code)

  let splitInfo = ""
  if (components.length) {
    const sortedPrices = components
      .map((component) => Number(component.unit_price) || 0)
      .sort((a, b) => a - b)
    const minPrice = sortedPrices[0] || 0
    splitInfo = `<div class="split-info">Divisível a partir de ${formatMoney(minPrice)}</div>`
  }

  return `
    <div class="product ${soldOut ? "sold-out" : ""}" data-product-code="${product.code}" role="button" tabindex="0">
      <img src="${product.image_url}" alt="${product.name}">
      <h3>${product.name}</h3>
      <div class="code">Código: ${product.code}</div>
      ${splitInfo}
      <div class="price ${showPrice ? "" : "unavailable"}">
        ${showPrice ? `R$ ${unitPrice.toFixed(2)}` : "Em falta"}
      </div>
      ${soldOut ? '<div class="backorder-note">Encomende com o vendedor</div>' : ""}
      <div class="stock ${quantity <= 0 ? "zero" : ""}">
        Quantidade: ${quantity}
      </div>
    </div>
  `
}

function openProductModal(product) {
  if (!product) return

  const quantity = Number(product.quantity) || 0
  const soldOut = quantity <= 0
  const unitPrice = Number(product.unit_price) || 0
  const components = getProductComponents(product.code)

  productModalImage.src = product.image_url || ""
  productModalImage.alt = product.name || "Produto"
  productModalTitle.textContent = product.name || "Produto"
  productModalCode.textContent = `Código: ${product.code || "-"}`
  productModalPrice.textContent = soldOut ? "Preço: Em falta" : `Preço: ${formatMoney(unitPrice)}`
  productModalStock.textContent = `Estoque: ${quantity}`
  productModalStatus.textContent = soldOut ? "Encomende com o vendedor" : "Disponível para pronta entrega"
  if (components.length) {
    const soldOutCount = components.filter((component) => (Number(component.quantity) || 0) <= 0).length
    productModalStatus.textContent += ` | Componentes cadastrados: ${components.length} (${soldOutCount} em falta)`
  }

  currentModalProductCode = product.code
  renderModalComponentsRows(components)
  setComponentsMessage("")

  productModal.hidden = false
}

function closeProductModal() {
  productModal.hidden = true
  currentModalProductCode = null
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

function renderModalComponentsRows(components) {
  if (!components.length) {
    productModalComponentsList.innerHTML = createComponentRow()
    return
  }
  productModalComponentsList.innerHTML = components.map((component) => createComponentRow(component)).join("")
}

async function loadCatalogData() {
  const [productsResponse, componentsResponse] = await Promise.all([
    supabaseClient
      .from("products")
      .select("*")
      .order("quantity", { ascending: false })
      .order("name"),
    supabaseClient
      .from("product_components")
      .select("id, product_code, name, unit_price, quantity, is_active")
      .eq("is_active", true)
      .order("name")
  ])

  const { data, error } = productsResponse
  const { data: componentsData, error: componentsError } = componentsResponse

  if (error || componentsError) {
    catalogEl.innerHTML = "Erro ao carregar produtos"
    console.log(error || componentsError)
    return
  }

  componentsByProductCode = Object.create(null)
  ;(componentsData || []).forEach((component) => {
    const productCode = component.product_code
    if (!componentsByProductCode[productCode]) {
      componentsByProductCode[productCode] = []
    }
    componentsByProductCode[productCode].push(component)
  })

  if (!data?.length) {
    catalogEl.innerHTML = "Nenhum produto encontrado"
    unavailableProductsSection.hidden = true
    return
  }

  const sortedProducts = sortProductsByStockAndName(data)
  productsByCode = Object.create(null)
  sortedProducts.forEach((product) => {
    productsByCode[product.code] = product
  })

  const availableProducts = sortedProducts.filter((product) => (Number(product.quantity) || 0) > 0)
  const unavailableProducts = sortedProducts.filter((product) => (Number(product.quantity) || 0) <= 0)

  catalogEl.innerHTML = availableProducts.length
    ? availableProducts.map(renderCatalogProduct).join("")
    : "Nenhum produto disponível"

  if (!unavailableProducts.length) {
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  unavailableProductsSection.hidden = false
  unavailableProductsGrid.innerHTML = unavailableProducts.map(renderCatalogProduct).join("")
}

async function saveComponentsForCurrentProduct() {
  if (!currentModalProductCode) return

  const rows = Array.from(productModalComponentsList.querySelectorAll(".component-row"))
  const parsedRows = []

  for (const row of rows) {
    const nameInput = row.querySelector('input[data-field="name"]')
    const priceInput = row.querySelector('input[data-field="unit_price"]')
    const quantityInput = row.querySelector('input[data-field="quantity"]')
    const name = String(nameInput?.value || "").trim()
    const unitPrice = Number(priceInput?.value)
    const quantity = Number(quantityInput?.value)

    if (!name) continue
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      setComponentsMessage("Preencha valor e estoque corretamente (estoque inteiro e >= 0).", "error")
      return
    }

    parsedRows.push({
      product_code: currentModalProductCode,
      name,
      unit_price: unitPrice,
      quantity,
      is_active: true
    })
  }

  const { error: deleteError } = await supabaseClient
    .from("product_components")
    .delete()
    .eq("product_code", currentModalProductCode)

  if (deleteError) {
    setComponentsMessage("Erro ao atualizar componentes.", "error")
    console.log(deleteError)
    return
  }

  if (parsedRows.length) {
    const { error: insertError } = await supabaseClient
      .from("product_components")
      .insert(parsedRows)

    if (insertError) {
      setComponentsMessage("Erro ao salvar componentes.", "error")
      console.log(insertError)
      return
    }
  }

  setComponentsMessage("Divisão salva com sucesso!")
  await loadCatalogData()

  const currentProduct = productsByCode[currentModalProductCode]
  if (currentProduct) {
    openProductModal(currentProduct)
  }
}

function handleProductClick(target) {
  const productCard = target.closest(".product[data-product-code]")
  if (!productCard) return

  const code = productCard.dataset.productCode
  if (!code) return

  const product = productsByCode[code]
  openProductModal(product)
}

catalogEl.addEventListener("click", (event) => {
  handleProductClick(event.target)
})

unavailableProductsGrid.addEventListener("click", (event) => {
  handleProductClick(event.target)
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

productModalComponentsList.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!target.classList.contains("component-remove-btn")) return
  const row = target.closest(".component-row")
  if (row) row.remove()

  if (!productModalComponentsList.querySelector(".component-row")) {
    productModalComponentsList.innerHTML = createComponentRow()
  }
})

productModalAddComponentBtn.addEventListener("click", () => {
  productModalComponentsList.insertAdjacentHTML("beforeend", createComponentRow())
})

productModalSaveComponentsBtn.addEventListener("click", () => {
  saveComponentsForCurrentProduct()
})

loadCatalogData()