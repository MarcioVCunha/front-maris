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

let productsByCode = Object.create(null)
let componentsByProductCode = Object.create(null)

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function getProductComponents(productCode) {
  return componentsByProductCode[productCode] || []
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
    splitInfo = `<div class="split-info">Pode ser comprado separado a partir de ${formatMoney(minPrice)}</div>`
  }

  return `
    <div class="product ${soldOut ? "sold-out" : ""}" data-product-code="${product.code}" role="button" tabindex="0">
      <img src="${product.image_url}" alt="${product.name}">
      <h3>${product.name}</h3>
      ${splitInfo}
      ${components.length
        ? ""
        : `
          <div class="price ${showPrice ? "" : "unavailable"}">
            ${showPrice ? `R$ ${unitPrice.toFixed(2)}` : "Em falta"}
          </div>
        `}
      ${soldOut ? '<div class="backorder-note">Encomende com o vendedor</div>' : ""}
    </div>
  `
}

function renderModalComponentsRows(components) {
  if (!components.length) {
    productModalComponentsList.innerHTML = '<div class="component-col">Este produto não tem divisão cadastrada.</div>'
    return
  }

  productModalComponentsList.innerHTML = components.map((component) => {
    return `
      <div class="component-row">
        <div class="component-col">
          <strong>${component.name}</strong>
        </div>
        <div class="component-col">Valor: ${formatMoney(component.unit_price)}</div>
      </div>
    `
  }).join("")
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
  productModalCode.textContent = ""
  productModalPrice.textContent = components.length
    ? "Preço: consulte os valores das subdivisões"
    : soldOut
      ? "Preço: Em falta"
      : `Preço: ${formatMoney(unitPrice)}`
  productModalStock.textContent = ""
  productModalStatus.textContent = soldOut ? "Encomende com o vendedor" : ""
  if (components.length) {
    productModalStatus.textContent = `Pode ser comprado separado.`
  }

  renderModalComponentsRows(components)

  productModal.hidden = false
}

function closeProductModal() {
  productModal.hidden = true
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

loadCatalogData()