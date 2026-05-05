const { createSupabaseClient, formatMoneyBRL, debounce } = window.MarisUtils

const supabaseClient = createSupabaseClient()

const catalogEl = document.getElementById("catalog")
const catalogSearchInput = document.getElementById("catalog-search")
const catalogSortSelect = document.getElementById("catalog-sort")
const unavailableProductsSection = document.getElementById("unavailable-products-section")
const unavailableProductsGrid = document.getElementById("unavailable-products-grid")
const productModal = document.getElementById("product-modal")
const productModalCarousel = document.querySelector(".product-modal-carousel")
const productModalPrevBtn = document.getElementById("product-modal-prev")
const productModalNextBtn = document.getElementById("product-modal-next")
const productModalImage = document.getElementById("product-modal-image")
const productModalDots = document.getElementById("product-modal-dots")
const productModalTitle = document.getElementById("product-modal-title")
const productModalCode = document.getElementById("product-modal-code")
const productModalPrice = document.getElementById("product-modal-price")
const productModalStock = document.getElementById("product-modal-stock")
const productModalStatus = document.getElementById("product-modal-status")
const productModalComponentsList = document.getElementById("product-modal-components-list")

let productsByCode = Object.create(null)
let componentsByProductCode = Object.create(null)
let imageUrlsByProductId = Object.create(null)
/** Listas após carregar (antes do filtro de busca). */
let availableProducts = []
let unavailableProducts = []
let modalImageUrls = []
let modalImageIndex = 0
let touchStartX = 0
let touchStartY = 0

function getSearchTerm() {
  return (catalogSearchInput?.value || "").trim().toLowerCase()
}

function doesProductMatchSearch(product, term) {
  if (!term) return true
  const name = String(product?.name || "").toLowerCase()
  const code = String(product?.code || "").toLowerCase()
  return name.includes(term) || code.includes(term)
}

function getSortMode() {
  return catalogSortSelect?.value || "name_asc"
}

function sortProductsForCatalog(products, mode) {
  return [...products].sort((a, b) => {
    if (mode === "price_asc" || mode === "price_desc") {
      const pa = Number(a?.unit_price) || 0
      const pb = Number(b?.unit_price) || 0
      if (pa !== pb) return mode === "price_asc" ? pa - pb : pb - pa
    } else if (mode === "created_asc" || mode === "created_desc") {
      const ta = Date.parse(String(a?.created_at || "")) || 0
      const tb = Date.parse(String(b?.created_at || "")) || 0
      if (ta !== tb) return mode === "created_asc" ? ta - tb : tb - ta
    }
    return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR")
  })
}

function getProductComponents(productCode) {
  return componentsByProductCode[productCode] || []
}

function getProductImageUrls(product) {
  const productId = Number(product?.id)
  const urlsFromTable = Number.isInteger(productId) ? (imageUrlsByProductId[productId] || []) : []
  if (urlsFromTable.length) return urlsFromTable
  const fallback = String(product?.image_url || "").trim()
  return fallback ? [fallback] : []
}

function setModalImageIndex(index) {
  if (!modalImageUrls.length) {
    productModalImage.src = ""
    productModalImage.alt = "Produto"
    productModalPrevBtn.disabled = true
    productModalNextBtn.disabled = true
    productModalDots.innerHTML = ""
    return
  }

  modalImageIndex = (index + modalImageUrls.length) % modalImageUrls.length
  productModalImage.src = modalImageUrls[modalImageIndex]
  productModalImage.alt = `${productModalTitle.textContent || "Produto"} (${modalImageIndex + 1}/${modalImageUrls.length})`
  productModalPrevBtn.disabled = modalImageUrls.length <= 1
  productModalNextBtn.disabled = modalImageUrls.length <= 1
  productModalDots.innerHTML = modalImageUrls
    .map((_, dotIndex) => `<button class="carousel-dot ${dotIndex === modalImageIndex ? "active" : ""}" data-index="${dotIndex}" type="button" aria-label="Ir para imagem ${dotIndex + 1}"></button>`)
    .join("")
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
  const imageUrls = getProductImageUrls(product)
  const coverImage = imageUrls[0] || ""

  let splitInfo = ""
  if (components.length) {
    let minPrice = Infinity
    for (const c of components) {
      const componentQty = Number(c.quantity) || 0
      if (componentQty <= 0) continue
      const p = Number(c.unit_price) || 0
      if (p < minPrice) minPrice = p
    }
    if (minPrice !== Infinity) {
      splitInfo = `<div class="split-info">Pode ser comprado separado a partir de ${formatMoneyBRL(minPrice)}</div>`
    }
  }

  return `
    <div class="product ${soldOut ? "sold-out" : ""}" data-product-code="${product.code}" role="button" tabindex="0">
      <img src="${coverImage}" alt="${product.name}">
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
    const componentQty = Number(component.quantity) || 0
    const isAvailable = componentQty > 0
    return `
      <div class="component-row ${isAvailable ? "" : "is-unavailable"}">
        <div class="component-col">
          <strong>${component.name}</strong>
        </div>
        <div class="component-col ${isAvailable ? "" : "component-status-unavailable"}">${isAvailable ? `Valor: ${formatMoneyBRL(component.unit_price)}` : "Indisponível"}</div>
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
  modalImageUrls = getProductImageUrls(product)
  modalImageIndex = 0

  productModalTitle.textContent = product.name || "Produto"
  setModalImageIndex(0)
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

function renderCatalogGrids() {
  const term = getSearchTerm()
  const sortMode = getSortMode()

  const availFiltered = sortProductsForCatalog(
    availableProducts.filter((p) => doesProductMatchSearch(p, term)),
    sortMode
  )
  const unavailFiltered = sortProductsForCatalog(
    unavailableProducts.filter((p) => doesProductMatchSearch(p, term)),
    sortMode
  )

  if (!availableProducts.length) {
    catalogEl.innerHTML = "Nenhum produto disponível"
  } else if (!availFiltered.length) {
    catalogEl.innerHTML = term
      ? "Nenhum produto disponível encontrado para a busca"
      : "Nenhum produto disponível"
  } else {
    catalogEl.innerHTML = availFiltered.map(renderCatalogProduct).join("")
  }

  if (!unavailableProducts.length) {
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  if (!unavailFiltered.length) {
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  unavailableProductsSection.hidden = false
  unavailableProductsGrid.innerHTML = unavailFiltered.map(renderCatalogProduct).join("")
}

async function loadCatalogData() {
  const [productsResponse, componentsResponse, imagesResponse] = await Promise.all([
    supabaseClient
      .from("products")
      .select("*")
      .order("quantity", { ascending: false })
      .order("name"),
    supabaseClient
      .from("product_components")
      .select("id, product_code, name, unit_price, quantity, is_active")
      .eq("is_active", true)
      .order("name"),
    supabaseClient
      .from("product_images")
      .select("product_id, image_url, sort_order")
      .order("sort_order", { ascending: true })
  ])

  const { data, error } = productsResponse
  const { data: componentsData, error: componentsError } = componentsResponse
  const { data: imagesData, error: imagesError } = imagesResponse

  if (error || componentsError || imagesError) {
    availableProducts = []
    unavailableProducts = []
    catalogEl.innerHTML = "Erro ao carregar produtos"
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    console.log(error || componentsError || imagesError)
    return
  }

  componentsByProductCode = window.MarisUtils.groupByKey(componentsData || [], (c) => c.product_code)
  imageUrlsByProductId = Object.create(null)
  for (const row of imagesData || []) {
    const productId = Number(row.product_id)
    const imageUrl = String(row.image_url || "").trim()
    if (!Number.isInteger(productId) || !imageUrl) continue
    if (!Array.isArray(imageUrlsByProductId[productId])) imageUrlsByProductId[productId] = []
    imageUrlsByProductId[productId].push(imageUrl)
  }

  if (!data?.length) {
    availableProducts = []
    unavailableProducts = []
    catalogEl.innerHTML = "Nenhum produto encontrado"
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  const sortedProducts = sortCatalogByAvailabilityThenName(data)
  productsByCode = Object.create(null)
  sortedProducts.forEach((product) => {
    productsByCode[product.code] = product
  })

  availableProducts = []
  unavailableProducts = []
  for (const product of sortedProducts) {
    if (isCatalogProductAvailable(product)) availableProducts.push(product)
    else unavailableProducts.push(product)
  }

  renderCatalogGrids()
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

productModalPrevBtn.addEventListener("click", () => setModalImageIndex(modalImageIndex - 1))
productModalNextBtn.addEventListener("click", () => setModalImageIndex(modalImageIndex + 1))
productModalDots.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const index = Number(target.dataset.index)
  if (!Number.isInteger(index)) return
  setModalImageIndex(index)
})

if (productModalCarousel) {
  productModalCarousel.addEventListener("touchstart", (event) => {
    if (!event.touches.length) return
    touchStartX = event.touches[0].clientX
    touchStartY = event.touches[0].clientY
  }, { passive: true })

  productModalCarousel.addEventListener("touchend", (event) => {
    if (!event.changedTouches.length || modalImageUrls.length <= 1) return
    const endX = event.changedTouches[0].clientX
    const endY = event.changedTouches[0].clientY
    const deltaX = endX - touchStartX
    const deltaY = endY - touchStartY

    // Ignore vertical scroll gestures and very short horizontal drags.
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return
    if (deltaX < 0) setModalImageIndex(modalImageIndex + 1)
    else setModalImageIndex(modalImageIndex - 1)
  }, { passive: true })
}

if (catalogSearchInput) {
  const scheduleRender = debounce(() => renderCatalogGrids(), 120)
  catalogSearchInput.addEventListener("input", scheduleRender)
}

if (catalogSortSelect) {
  catalogSortSelect.addEventListener("change", () => renderCatalogGrids())
}

loadCatalogData()