const { createSupabaseClient, sortProductsByStockAndName } = window.MarisUtils

const supabaseClient = createSupabaseClient()

const catalogEl = document.getElementById("catalog")
const unavailableProductsSection = document.getElementById("unavailable-products-section")
const unavailableProductsGrid = document.getElementById("unavailable-products-grid")
const unavailableCountEl = document.getElementById("unavailable-count")

function renderCatalogProduct(product) {
  const quantity = Number(product.quantity) || 0
  const soldOut = quantity <= 0
  const showPrice = quantity > 0
  const unitPrice = Number(product.unit_price) || 0

  return `
    <div class="product ${soldOut ? "sold-out" : ""}">
      <img src="${product.image_url}" alt="${product.name}">
      <h3>${product.name}</h3>
      <div class="code">Código: ${product.code}</div>
      <div class="price ${showPrice ? "" : "unavailable"}">
        ${showPrice ? `R$ ${unitPrice.toFixed(2)}` : "Indisponível"}
      </div>
      <div class="stock ${quantity <= 0 ? "zero" : ""}">
        Quantidade: ${quantity}
      </div>
    </div>
  `
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
  const availableProducts = sortedProducts.filter((product) => (Number(product.quantity) || 0) > 0)
  const unavailableProducts = sortedProducts.filter((product) => (Number(product.quantity) || 0) <= 0)

  catalogEl.innerHTML = availableProducts.length
    ? availableProducts.map(renderCatalogProduct).join("")
    : "Nenhum produto disponível"

  unavailableCountEl.textContent = `(${unavailableProducts.length})`
  if (!unavailableProducts.length) {
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  unavailableProductsSection.hidden = false
  unavailableProductsGrid.innerHTML = unavailableProducts.map(renderCatalogProduct).join("")
}

loadProducts()