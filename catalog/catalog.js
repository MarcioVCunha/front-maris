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

let productsByCode = Object.create(null)

function renderCatalogProduct(product) {
  const quantity = Number(product.quantity) || 0
  const soldOut = quantity <= 0
  const showPrice = quantity > 0
  const unitPrice = Number(product.unit_price) || 0

  return `
    <div class="product ${soldOut ? "sold-out" : ""}" data-product-code="${product.code}" role="button" tabindex="0">
      <img src="${product.image_url}" alt="${product.name}">
      <h3>${product.name}</h3>
      <div class="code">Código: ${product.code}</div>
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

  productModalImage.src = product.image_url || ""
  productModalImage.alt = product.name || "Produto"
  productModalTitle.textContent = product.name || "Produto"
  productModalCode.textContent = `Código: ${product.code || "-"}`
  productModalPrice.textContent = soldOut ? "Preço: Em falta" : `Preço: R$ ${unitPrice.toFixed(2)}`
  productModalStock.textContent = `Estoque: ${quantity}`
  productModalStatus.textContent = soldOut ? "Encomende com o vendedor" : "Disponível para pronta entrega"

  productModal.hidden = false
}

function closeProductModal() {
  productModal.hidden = true
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("quantity", { ascending: false })
    .order("name")

  if (error) {
    catalogEl.innerHTML = "Erro ao carregar produtos"
    console.log(error)
    return
  }

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

loadProducts()