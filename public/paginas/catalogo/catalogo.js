const { createSupabaseClient, formatMoneyBRL, effectivePrice, hasPromo } = window.MarisUtils
const {
  visibleCategories,
  whatsappLink,
  productWhatsappMessage,
  CATALOG_WHATSAPP_MESSAGE,
  groupProductsByColor,
  selectVariantByCode,
  groupDisplayVariant,
  partitionCatalogGroups,
  sortGroupsForCatalog,
} = window.MarisCatalogLogic
const escapeHtml = (text) => window.MarisUI.escapeHtml(text)

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
const productModalCloseBtn = document.getElementById("product-modal-close")
const productModalImage = document.getElementById("product-modal-image")
const productModalDots = document.getElementById("product-modal-dots")
const productModalTitle = document.getElementById("product-modal-title")
const productModalCode = document.getElementById("product-modal-code")
const productModalPrice = document.getElementById("product-modal-price")
const productModalStock = document.getElementById("product-modal-stock")
const productModalStatus = document.getElementById("product-modal-status")
const productModalComponentsList = document.getElementById("product-modal-components-list")
const productModalActions = document.getElementById("product-modal-actions")
const catalogFeedbackEl = document.getElementById("catalog-feedback")
const catalogFiltersEl = document.getElementById("catalog-filters")
const productModalWhatsapp = document.getElementById("product-modal-whatsapp")
const productModalColors = document.getElementById("product-modal-colors")

let selectedCategory = "Todos"
let categoryFilterSignature = ""

let allComponents = []
let currentModalGroup = null

let allGroups = []
let selectedCodeByGroup = Object.create(null)
let componentsByProductCode = Object.create(null)
let imageUrlsByProductId = Object.create(null)
let modalImageUrls = []
let modalImageIndex = 0
let touchStartX = 0
let touchStartY = 0

function setCatalogFeedback(text, type = "") {
  window.MarisUI.setFeedback(catalogFeedbackEl, text, type, { baseClass: "catalog-feedback" })
}

function notifyCartAdd(result, itemLabel = "Item") {
  if (!result?.ok) {
    if (result?.reason === "out_of_stock") {
      setCatalogFeedback(`${itemLabel} indisponível no momento.`, "error")
      return
    }
    setCatalogFeedback(`Não foi possível adicionar ${itemLabel.toLowerCase()} na cesta.`, "error")
    return
  }
  if (result.clamped) {
    setCatalogFeedback(`Estoque limitado: você tem ${result.available} unidade(s) desse item na cesta.`, "error")
    return
  }
  setCatalogFeedback(`${itemLabel} adicionado na sua cesta.`, "success")
}

function getSearchTerm() {
  return (catalogSearchInput?.value || "").trim().toLowerCase()
}

function getSortMode() {
  return catalogSortSelect?.value || "name_asc"
}

function bindStoreWhatsappLinks() {
  const href = whatsappLink(CATALOG_WHATSAPP_MESSAGE)
  for (const id of ["catalog-whatsapp", "footer-whatsapp"]) {
    const link = document.getElementById(id)
    if (link) link.href = href
  }
}

function renderCategoryFilters() {
  const representatives = allGroups
    .map((group) => groupDisplayVariant(group, isCatalogProductAvailable)?.product)
    .filter(Boolean)
  const categories = visibleCategories(representatives)
  if (selectedCategory !== "Todos" && !categories.includes(selectedCategory)) {
    selectedCategory = "Todos"
  }
  const signature = ["Todos", ...categories].join("|")
  if (signature !== categoryFilterSignature) {
    categoryFilterSignature = signature
    const buttons = ["Todos", ...categories]
    catalogFiltersEl.innerHTML = buttons.map((name) => {
      const selected = name === selectedCategory
      return `<button type="button" class="catalog-filter${selected ? " is-selected" : ""}" data-category="${name}" aria-pressed="${selected ? "true" : "false"}">${name}</button>`
    }).join("")
    return
  }
  catalogFiltersEl.querySelectorAll("[data-category]").forEach((button) => {
    const selected = button.getAttribute("data-category") === selectedCategory
    button.classList.toggle("is-selected", selected)
    button.setAttribute("aria-pressed", selected ? "true" : "false")
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

// Com tipos: ignora estoque do pai; disponível se algum tipo tiver quantidade > 0.
// Sem tipos: usa apenas `product.quantity`.
// `components` opcional evita segundo lookup no mesmo render.
function isCatalogProductAvailable(product, components = null) {
  const list = components ?? getProductComponents(product.code)
  if (list.length > 0) {
    return list.some((c) => (Number(c.quantity) || 0) > 0)
  }
  return (Number(product.quantity) || 0) > 0
}

function findGroupByKey(key) {
  return allGroups.find((group) => group.key === key) || null
}

function selectedVariant(group) {
  return selectVariantByCode(group, isCatalogProductAvailable, selectedCodeByGroup[group?.key])
}

function renderColorOptions(group, selectedCode) {
  if (!group || group.variants.length < 2) return ""
  return group.variants.map((variant) => {
    const code = variant.product?.code || ""
    const selected = code === selectedCode
    const unavailable = !isCatalogProductAvailable(variant.product)
    return `<button type="button" class="color-option${selected ? " is-selected" : ""}${unavailable ? " is-unavailable" : ""}" data-color-code="${escapeHtml(code)}" aria-pressed="${selected ? "true" : "false"}">${escapeHtml(variant.label || code)}</button>`
  }).join("")
}

function renderCatalogGroup(group) {
  const variant = selectedVariant(group)
  const product = variant?.product
  if (!product) return ""
  const components = getProductComponents(product.code)
  const available = isCatalogProductAvailable(product, components)
  const soldOut = !available
  const showPrice = !soldOut
  const basePrice = Number(product.unit_price) || 0
  const finalPrice = effectivePrice(product)
  const productOnSale = hasPromo(product)
  const imageUrls = getProductImageUrls(product)
  const coverImage = imageUrls[0] || ""
  const colorHtml = renderColorOptions(group, product.code)

  let splitInfo = ""
  if (components.length) {
    let minPrice = Infinity
    for (const c of components) {
      const componentQty = Number(c.quantity) || 0
      if (componentQty <= 0) continue
      const p = effectivePrice(c)
      if (p < minPrice) minPrice = p
    }
    if (minPrice !== Infinity) {
      splitInfo = `<div class="split-info">Pode ser comprado separado a partir de ${formatMoneyBRL(minPrice)}</div>`
    }
  }

  let priceHtml = ""
  if (!components.length) {
    if (!showPrice) {
      priceHtml = `<div class="price unavailable">Em falta</div>`
    } else if (productOnSale) {
      priceHtml = `<div class="price on-sale">${window.MarisUI.renderPricePair(basePrice, finalPrice, "")}</div>`
    } else {
      priceHtml = `<div class="price">${formatMoneyBRL(basePrice)}</div>`
    }
  }

  const saleBadge = productOnSale && !soldOut
    ? `<span class="product-sale-badge">-${Number(product.discount_percent) || 0}%</span>`
    : ""

  // Com tipos: só abre o modal (estoque/venda são por tipo, não pelo pai).
  const actionHtml = soldOut
    ? `<button type="button" class="waitlist-card-btn" data-waitlist-code="${escapeHtml(product.code)}">Lista de espera</button>`
    : components.length
      ? `<button type="button" class="view-types-card-btn" data-view-code="${escapeHtml(product.code)}">Ver tipos</button>`
      : `<button type="button" class="add-cart-card-btn" data-add-code="${escapeHtml(product.code)}">Adicionar à cesta</button>`

  return `
    <article class="product ${soldOut ? "sold-out" : ""}" data-group-key="${escapeHtml(group.key)}" data-product-code="${escapeHtml(product.code)}" role="button" tabindex="0">
      ${saleBadge}
      <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-body">
        <h3>${escapeHtml(product.name)}</h3>
        <div class="code">${escapeHtml(product.code)}</div>
        ${colorHtml ? `<div class="color-options" role="group" aria-label="Cor">${colorHtml}</div>` : ""}
        ${splitInfo}
        ${priceHtml}
        ${actionHtml}
      </div>
    </article>
  `
}

function renderModalComponentsRows(components) {
  if (!components.length) {
    productModalComponentsList.innerHTML = '<div class="component-col">Este produto não tem tipos cadastrados.</div>'
    return
  }

  productModalComponentsList.innerHTML = components.map((component) => {
    const componentQty = Number(component.quantity) || 0
    const isAvailable = componentQty > 0
    const actionBtn = isAvailable
      ? `<button type="button" class="modal-add-btn" data-add-component="${escapeHtml(component.id)}">+ Cesta</button>`
      : `<button type="button" class="modal-waitlist-btn" data-waitlist-component="${escapeHtml(component.id)}">Lista de espera</button>`
    const componentOnSale = hasPromo(component)
    const priceLabel = componentOnSale
      ? `Valor: ${window.MarisUI.renderPricePair(component.unit_price, effectivePrice(component))}`
      : `Valor: ${formatMoneyBRL(component.unit_price)}`
    return `
      <div class="component-row ${isAvailable ? "" : "is-unavailable"}">
        <div class="component-col">
          <strong>${escapeHtml(component.name)}</strong>
        </div>
        <div class="component-col ${isAvailable ? "" : "component-status-unavailable"}">${isAvailable ? priceLabel : "Indisponível"}</div>
        <div class="component-col component-actions">${actionBtn}</div>
      </div>
    `
  }).join("")
}

function renderModalActions(product, components, soldOut) {
  if (!productModalActions) return
  if (components.length) {
    productModalActions.innerHTML = ""
    return
  }
  if (soldOut) {
    productModalActions.innerHTML = `<button type="button" class="btn-primary modal-waitlist-btn" data-waitlist-code="${escapeHtml(product.code)}">Entrar na lista de espera</button>`
  } else {
    productModalActions.innerHTML = `<button type="button" class="btn-primary modal-add-btn" data-add-code="${escapeHtml(product.code)}">Adicionar à cesta</button>`
  }
}

const waitlistModal = document.getElementById("waitlist-modal")
const waitlistForm = document.getElementById("waitlist-form")
const waitlistNameInput = document.getElementById("waitlist-name")
const waitlistWhatsappInput = document.getElementById("waitlist-whatsapp")
const waitlistEmailInput = document.getElementById("waitlist-email")
const waitlistFeedbackEl = document.getElementById("waitlist-feedback")
const waitlistSubmitBtn = document.getElementById("waitlist-submit")

let pendingWaitlistItem = null

function setWaitlistFeedback(text, type = "") {
  window.MarisUI.setFeedback(waitlistFeedbackEl, text, type, { baseClass: "waitlist-feedback" })
}

function openWaitlistModal({ productCode = null, componentId = null }) {
  pendingWaitlistItem = { productCode, componentId }
  setWaitlistFeedback("")
  const buyer = window.MarisCatalogCart?.getBuyerProfile?.()
  if (buyer) {
    waitlistNameInput.value = buyer.name || ""
    waitlistWhatsappInput.value = buyer.whatsapp || ""
    waitlistEmailInput.value = buyer.email || ""
  }
  waitlistModal.hidden = false
  waitlistNameInput.focus()
}

function closeWaitlistModal() {
  waitlistModal.hidden = true
  pendingWaitlistItem = null
}

function joinWaitlist({ productCode = null, componentId = null }) {
  openWaitlistModal({ productCode, componentId })
}

async function submitWaitlist() {
  if (!pendingWaitlistItem) return
  const name = waitlistNameInput.value.trim()
  const whatsapp = window.MarisUtils.onlyDigits(waitlistWhatsappInput.value)
  const email = waitlistEmailInput.value.trim()

  if (!name) {
    setWaitlistFeedback("Informe seu nome.", "error")
    return
  }
  if (whatsapp.length < 10) {
    setWaitlistFeedback("Informe um WhatsApp válido com DDD.", "error")
    return
  }

  window.MarisCatalogCart?.saveBuyerProfile?.({ name, whatsapp, email })

  waitlistSubmitBtn.disabled = true
  waitlistSubmitBtn.textContent = "Enviando…"
  try {
    const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("customer-waitlist-add"), {
      body: {
        buyer_name: name,
        buyer_whatsapp: whatsapp,
        buyer_email: email,
        product_code: pendingWaitlistItem.productCode,
        component_id: pendingWaitlistItem.componentId
      }
    })
    if (!ok) {
      setWaitlistFeedback(data.error || "Não foi possível entrar na lista de espera.", "error")
      return
    }
    closeWaitlistModal()
    setCatalogFeedback("Pronto! Você entrou na lista de espera.", "success")
  } catch {
    setWaitlistFeedback("Erro de conexão. Tente novamente.", "error")
  } finally {
    waitlistSubmitBtn.disabled = false
    waitlistSubmitBtn.textContent = "Entrar na lista"
  }
}

function openProductModal(group) {
  if (!group) return
  currentModalGroup = group
  const variant = selectedVariant(group)
  const product = variant?.product
  if (!product) return

  const components = getProductComponents(product.code)
  const available = isCatalogProductAvailable(product, components)
  const soldOut = !available
  const basePrice = Number(product.unit_price) || 0
  const finalPrice = effectivePrice(product)
  const productOnSale = hasPromo(product)
  modalImageUrls = getProductImageUrls(product)
  modalImageIndex = 0

  productModalTitle.textContent = product.name || "Produto"
  if (productModalColors) productModalColors.innerHTML = renderColorOptions(group, product.code)
  if (productModalWhatsapp) {
    productModalWhatsapp.href = whatsappLink(productWhatsappMessage(product.name))
  }
  setModalImageIndex(0)
  productModalCode.textContent = ""
  if (components.length) {
    productModalPrice.innerHTML = "Preço: consulte os valores dos tipos"
  } else if (soldOut) {
    productModalPrice.innerHTML = "Preço: Em falta"
  } else if (productOnSale) {
    productModalPrice.innerHTML = `Preço: ${window.MarisUI.renderPricePair(basePrice, finalPrice)}`
  } else {
    productModalPrice.innerHTML = `Preço: ${formatMoneyBRL(basePrice)}`
  }
  productModalStock.textContent = ""
  productModalStatus.textContent = ""
  if (!available) {
    productModalStatus.textContent = "Encomende com o vendedor"
  } else if (components.length) {
    productModalStatus.textContent = "Pode ser comprado separado."
  }

  renderModalComponentsRows(components)
  renderModalActions(product, components, soldOut)

  productModal.hidden = false
}

function closeProductModal() {
  productModal.hidden = true
  currentModalGroup = null
}

function chooseGroupColor(groupKey, code) {
  if (!groupKey || !code) return
  selectedCodeByGroup[groupKey] = code
  const group = findGroupByKey(groupKey)
  renderCatalogGrids()
  if (group && currentModalGroup?.key === groupKey) openProductModal(group)
}

function renderCatalogGrids() {
  const term = getSearchTerm()
  const sortMode = getSortMode()

  renderCategoryFilters()

  const partitioned = partitionCatalogGroups(allGroups, {
    term,
    category: selectedCategory,
    isAvailable: isCatalogProductAvailable,
  })
  const availFiltered = sortGroupsForCatalog(partitioned.available, sortMode, isCatalogProductAvailable)
  const unavailFiltered = sortGroupsForCatalog(partitioned.soldOut, sortMode, isCatalogProductAvailable)

  if (!availFiltered.length && !unavailFiltered.length) {
    catalogEl.hidden = false
    catalogEl.innerHTML = term
      ? "Nenhum produto encontrado para a busca"
      : selectedCategory !== "Todos"
        ? "Nenhum produto nessa categoria"
        : "Nenhum produto encontrado"
  } else if (!availFiltered.length) {
    catalogEl.hidden = true
    catalogEl.innerHTML = ""
  } else {
    catalogEl.hidden = false
    catalogEl.innerHTML = availFiltered.map(renderCatalogGroup).join("")
  }

  if (!unavailFiltered.length) {
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  unavailableProductsSection.hidden = false
  unavailableProductsGrid.innerHTML = unavailFiltered.map(renderCatalogGroup).join("")
}

async function loadCatalogData() {
  const [productsResponse, componentsResponse, imagesResponse] = await Promise.all([
    window.MarisCatalogRead.selectProducts(supabaseClient)
      .order("quantity", { ascending: false })
      .order("name"),
    window.MarisCatalogRead.selectPricedComponents(supabaseClient).order("name"),
    window.MarisCatalogRead.selectImages(supabaseClient).order("sort_order", { ascending: true })
  ])

  const { data, error } = productsResponse
  const { data: componentsData, error: componentsError } = componentsResponse
  const { data: imagesData, error: imagesError } = imagesResponse

  if (error || componentsError || imagesError) {
    allGroups = []
    catalogEl.hidden = false
    catalogEl.innerHTML = "Erro ao carregar produtos"
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    console.log(error || componentsError || imagesError)
    return
  }

  componentsByProductCode = window.MarisUtils.groupByKey(
    window.MarisUtils.mapPricedComponents(componentsData || []),
    (c) => c.product_code
  )
  imageUrlsByProductId = Object.create(null)
  for (const row of imagesData || []) {
    const productId = Number(row.product_id)
    const imageUrl = String(row.image_url || "").trim()
    if (!Number.isInteger(productId) || !imageUrl) continue
    if (!Array.isArray(imageUrlsByProductId[productId])) imageUrlsByProductId[productId] = []
    imageUrlsByProductId[productId].push(imageUrl)
  }

  if (!data?.length) {
    allGroups = []
    catalogEl.hidden = false
    catalogEl.innerHTML = "Nenhum produto encontrado"
    unavailableProductsSection.hidden = true
    unavailableProductsGrid.innerHTML = ""
    return
  }

  allGroups = groupProductsByColor(data)
  selectedCodeByGroup = Object.create(null)

  allComponents = componentsData || []
  if (window.MarisCatalogCart) {
    const imagesByCode = Object.create(null)
    for (const product of data || []) {
      const code = String(product?.code || "")
      if (!code) continue
      const urls = getProductImageUrls(product)
      if (urls.length) imagesByCode[code] = urls[0]
    }
    window.MarisCatalogCart.setCatalogData({ products: data, components: allComponents, imagesByCode })
    try {
      await window.MarisCatalogCart.init()
    } catch (error) {
      console.warn("Falha ao inicializar carrinho sem bloquear catalogo", error)
    }
  }
  renderCatalogGrids()
}

function handleProductClick(target) {
  const productCard = target.closest(".product[data-group-key]")
  if (!productCard) return
  openProductModal(findGroupByKey(productCard.getAttribute("data-group-key")))
}

function handleCatalogGridClick(event) {
  const colorBtn = event.target.closest("[data-color-code]")
  if (colorBtn) {
    event.stopPropagation()
    const card = colorBtn.closest("[data-group-key]")
    chooseGroupColor(card?.getAttribute("data-group-key"), colorBtn.getAttribute("data-color-code"))
    return
  }
  const waitlistBtn = event.target.closest("[data-waitlist-code]")
  if (waitlistBtn) {
    event.stopPropagation()
    joinWaitlist({ productCode: waitlistBtn.getAttribute("data-waitlist-code") })
    return
  }
  const viewTypesBtn = event.target.closest("[data-view-code]")
  if (viewTypesBtn) {
    event.stopPropagation()
    const card = viewTypesBtn.closest("[data-group-key]")
    openProductModal(findGroupByKey(card?.getAttribute("data-group-key")))
    return
  }
  const addBtn = event.target.closest("[data-add-code]")
  if (addBtn) {
    event.stopPropagation()
    const code = addBtn.getAttribute("data-add-code")
    // Produtos com tipos não devem ir para a cesta pelo pai.
    if (getProductComponents(code).length) {
      const card = addBtn.closest("[data-group-key]")
      openProductModal(findGroupByKey(card?.getAttribute("data-group-key")))
      return
    }
    const result = window.MarisCatalogCart?.addProduct(code, 1)
    notifyCartAdd(result, "Produto")
    return
  }
  handleProductClick(event.target)
}

catalogEl.addEventListener("click", handleCatalogGridClick)
unavailableProductsGrid.addEventListener("click", handleCatalogGridClick)

productModal.addEventListener("click", async (event) => {
  const colorBtn = event.target.closest("[data-color-code]")
  if (colorBtn && currentModalGroup) {
    chooseGroupColor(currentModalGroup.key, colorBtn.getAttribute("data-color-code"))
    return
  }
  const addCode = event.target.closest("[data-add-code]")
  if (addCode) {
    const result = await window.MarisCatalogCart?.addProduct(addCode.getAttribute("data-add-code"), 1)
    notifyCartAdd(result, "Produto")
    return
  }
  const addComp = event.target.closest("[data-add-component]")
  if (addComp) {
    const result = await window.MarisCatalogCart?.addComponent(Number(addComp.getAttribute("data-add-component")), 1)
    notifyCartAdd(result, "Tipo")
    return
  }
  const waitCode = event.target.closest("[data-waitlist-code]")
  if (waitCode) {
    joinWaitlist({ productCode: waitCode.getAttribute("data-waitlist-code") })
    return
  }
  const waitComp = event.target.closest("[data-waitlist-component]")
  if (waitComp) {
    joinWaitlist({ componentId: Number(waitComp.getAttribute("data-waitlist-component")) })
    return
  }
  const closeBtn = event.target.closest("#product-modal-close")
  if (closeBtn) {
    closeProductModal()
    return
  }
  const target = event.target
  if (target instanceof HTMLElement && target.dataset.closeModal === "true") {
    closeProductModal()
  }
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !productModal.hidden) {
    closeProductModal()
  }
})

if (productModalCloseBtn) {
  productModalCloseBtn.addEventListener("click", closeProductModal)
}
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
  window.MarisUI.bindDebouncedSearch(catalogSearchInput, () => renderCatalogGrids(), { debounceMs: 120 })
}

if (catalogSortSelect) {
  catalogSortSelect.addEventListener("change", () => renderCatalogGrids())
}

if (catalogFiltersEl) {
  catalogFiltersEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]")
    if (!button) return
    selectedCategory = button.getAttribute("data-category") || "Todos"
    renderCatalogGrids()
  })
}

bindStoreWhatsappLinks()

waitlistForm.addEventListener("submit", (event) => {
  event.preventDefault()
  submitWaitlist()
})

waitlistModal.addEventListener("click", (event) => {
  const target = event.target
  if (target instanceof HTMLElement && target.dataset.closeWaitlist === "true") {
    closeWaitlistModal()
  }
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !waitlistModal.hidden) {
    closeWaitlistModal()
  }
})

loadCatalogData()