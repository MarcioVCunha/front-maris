const { createSupabaseClient, formatMoneyBRL } = window.MarisUtils

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

function getProductComponents(productCode) {
  return componentsByProductCode[productCode] || []
}

// Com subdivisões: ignora estoque do pai; disponível se algum componente tiver quantidade > 0.
// Sem subdivisões: usa apenas `product.quantity`.
// `components` opcional evita segundo lookup no mesmo render.
function isCatalogProductAvailable(product, components = null) {
  const list = components ?? getProductComponents(product.code)
  if (list.length > 0) {
    return list.some((c) => (Number(c.quantity) || 0) > 0)
  }
  return (Number(product.quantity) || 0) > 0
}

function sortCatalogByAvailabilityThenName(products) {
  return [...products].sort((a, b) => {
    const availA = isCatalogProductAvailable(a) ? 0 : 1
    const availB = isCatalogProductAvailable(b) ? 0 : 1
    if (availA !== availB) return availA - availB
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")
  })
}

function renderCatalogProduct(product) {
  const components = getProductComponents(product.code)
  const available = isCatalogProductAvailable(product, components)
  const soldOut = !available
  const showPrice = !soldOut
  const unitPrice = Number(product.unit_price) || 0

  let splitInfo = ""
  if (components.length) {
    let minPrice = Infinity
    for (const c of components) {
      const p = Number(c.unit_price) || 0
      if (p < minPrice) minPrice = p
    }
    if (minPrice !== Infinity) {
      splitInfo = `<div class="split-info">Pode ser comprado separado a partir de ${formatMoneyBRL(minPrice)}</div>`
    }
  }

  return `
    <div class="product ${soldOut ? "sold-out" : ""}" data-product-code="${product.code}" role="button" tabindex="0">
      <img src="${product.image_url}" alt="${product.name}">
      <h3>${product.name}</h3>
      <div class="code">Código: ${product.code}</div>
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
        <div class="component-col">Valor: ${formatMoneyBRL(component.unit_price)}</div>
      </div>
    `
  }).join("")
}

function openProductModal(product) {
  if (!product) return

  const components = getProductComponents(product.code)
  const available = isCatalogProductAvailable(product, components)
  const soldOut = !available
  const unitPrice = Number(product.unit_price) || 0

  productModalImage.src = product.image_url || ""
  productModalImage.alt = product.name || "Produto"
  productModalTitle.textContent = product.name || "Produto"
  productModalCode.textContent = ""
  productModalPrice.textContent = components.length
    ? "Preço: consulte os valores das subdivisões"
    : soldOut
      ? "Preço: Em falta"
      : `Preço: ${formatMoneyBRL(unitPrice)}`
  productModalStock.textContent = ""
  productModalStatus.textContent = ""
  if (!available) {
    productModalStatus.textContent = "Encomende com o vendedor"
  } else if (components.length) {
    productModalStatus.textContent = "Pode ser comprado separado."
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

  componentsByProductCode = window.MarisUtils.groupByKey(componentsData || [], (c) => c.product_code)

  if (!data?.length) {
    catalogEl.innerHTML = "Nenhum produto encontrado"
    unavailableProductsSection.hidden = true
    return
  }

  const sortedProducts = sortCatalogByAvailabilityThenName(data)
  productsByCode = Object.create(null)
  sortedProducts.forEach((product) => {
    productsByCode[product.code] = product
  })

  const availableProducts = []
  const unavailableProducts = []
  for (const product of sortedProducts) {
    if (isCatalogProductAvailable(product)) availableProducts.push(product)
    else unavailableProducts.push(product)
  }

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