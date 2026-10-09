const { createSupabaseClient, formatMoneyBRL, effectivePrice, hasPromo } = window.MarisUtils
const {
  visibleCategories,
  whatsappLink,
  productWhatsappMessage,
  CATALOG_WHATSAPP_MESSAGE,
  groupProductsByColor,
  selectVariantByCode,
  groupDisplayVariant,
  sortGroupsForCatalog,
  offerFromProduct,
  pixPrice,
  COLOR_FILTERS,
  parsePriceBound,
  displayVariantForFilters,
  filterAndPartitionCatalog,
  relatedGroups,
  readCatalogLink,
  buildCatalogQuery,
  resolvePieceLink,
  normalizeCategoryParam,
  showLowStockBadge,
  showNewBadge,
  pieceCareText,
  totalsByProductCode,
  sortGroupsByBestsellers,
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
const catalogDrawer = document.getElementById("catalog-drawer")
const colorFiltersEl = document.getElementById("catalog-color-filters")
const minPriceInput = document.getElementById("filter-min-price")
const maxPriceInput = document.getElementById("filter-max-price")
const onlyAvailableInput = document.getElementById("filter-only-available")
const piecePage = document.getElementById("piece-page")
const pieceGallery = document.getElementById("piece-gallery")
const pieceTitle = document.getElementById("piece-title")
const pieceCode = document.getElementById("piece-code")
const pieceColors = document.getElementById("piece-colors")
const piecePrices = document.getElementById("piece-prices")
const pieceDescription = document.getElementById("piece-description")
const pieceCare = document.getElementById("piece-care")
const pieceCareTextEl = document.getElementById("piece-care-text")
const pieceActions = document.getElementById("piece-actions")
const pieceWhatsapp = document.getElementById("piece-whatsapp")
const pieceRelated = document.getElementById("piece-related")
const pieceBack = document.getElementById("piece-back")
const collectionsEl = document.querySelector(".catalog-collections")
const productModalWhatsapp = document.getElementById("product-modal-whatsapp")
const productModalColors = document.getElementById("product-modal-colors")

let selectedCategory = "Todos"
let categoryFilterSignature = ""
let colorId = ""
let minPrice = null
let maxPrice = null
let onlyAvailable = false
let onSaleOnly = false
let bestsellerTotals = null
let bestsellerSort = false
let pieceGroupKey = ""
let ignoreNextCardClick = false
let linkUtm = { utmSource: "", utmMedium: "", utmCampaign: "" }

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

function colorSuffixes(id) {
  return COLOR_FILTERS.find((item) => item.id === id)?.suffixes || []
}

function selectedVariant(group) {
  const preferred = selectedCodeByGroup[group?.key]
  if (preferred) {
    const chosen = selectVariantByCode(group, isCatalogProductAvailable, preferred)
    const suffixes = colorSuffixes(colorId)
    if (!suffixes.length || suffixes.includes(chosen?.suffix)) return chosen
  }
  return displayVariantForFilters(group, { colorId }, isCatalogProductAvailable) || groupDisplayVariant(group, isCatalogProductAvailable)
}

function activeFilters() {
  return {
    term: getSearchTerm(),
    category: selectedCategory,
    minPrice,
    maxPrice,
    colorId,
    onlyAvailable,
    onSaleOnly,
  }
}

function currentPieceBase() {
  if (!pieceGroupKey) return ""
  return findGroupByKey(pieceGroupKey)?.base || ""
}

function syncCatalogUrl() {
  const next = buildCatalogQuery({
    categoria: selectedCategory,
    peca: currentPieceBase(),
    utmSource: linkUtm.utmSource,
    utmMedium: linkUtm.utmMedium,
    utmCampaign: linkUtm.utmCampaign,
  })
  if ((location.search || "") === next) return
  history.replaceState(null, "", `${location.pathname}${next}`)
}

function renderOfferHtml(product) {
  const offer = offerFromProduct(product)
  const main = offer.onSale
    ? `<span class="price-old">de ${formatMoneyBRL(offer.listPrice)}</span> <span class="price-now">por ${formatMoneyBRL(offer.finalPrice)}</span> <span class="price-off">${offer.percentOff}% OFF</span>`
    : `<span class="price-now">${formatMoneyBRL(offer.finalPrice)}</span>`
  return `<div class="price${offer.onSale ? " on-sale" : ""}">${main}</div><div class="price-pix">${formatMoneyBRL(offer.pixPrice)} no Pix</div>`
}

function renderPhotoStrip(urls, alt) {
  const shown = (urls || []).filter(Boolean).slice(0, 2)
  if (!shown.length) return `<div class="product-media"><div class="product-photos product-photos-empty"></div></div>`
  const dots = shown.length > 1 ? `<div class="product-photo-dots" aria-hidden="true"><span></span><span></span></div>` : ""
  return `<div class="product-media"><div class="product-photos">${shown.map((url) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy">`).join("")}</div>${dots}</div>`
}

function renderNoteBadges(product) {
  const notes = []
  if (showLowStockBadge(product)) notes.push("Últimas unidades")
  if (showNewBadge(product)) notes.push("Novo")
  return notes.map((label) => `<span class="product-note-badge">${label}</span>`).join("")
}

function productDescriptionText(product) {
  return String(product?.description || product?.descricao || "").trim()
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
  const productOnSale = hasPromo(product)
  const imageUrls = getProductImageUrls(product)
  const colorHtml = renderColorOptions(group, product.code)

  let splitInfo = ""
  if (components.length) {
    let lowest = Infinity
    for (const c of components) {
      const componentQty = Number(c.quantity) || 0
      if (componentQty <= 0) continue
      const p = effectivePrice(c)
      if (p < lowest) lowest = p
    }
    if (lowest !== Infinity) {
      splitInfo = `<div class="split-info">Pode ser comprado separado a partir de ${formatMoneyBRL(lowest)} · ${formatMoneyBRL(pixPrice(lowest))} no Pix</div>`
    }
  }

  let priceHtml = ""
  if (!components.length) {
    priceHtml = showPrice
      ? renderOfferHtml(product)
      : `<div class="price unavailable">Em falta</div>`
  }

  const saleBadge = productOnSale && !soldOut
    ? `<span class="product-sale-badge">${offerFromProduct(product).percentOff}% OFF</span>`
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
      ${renderNoteBadges(product)}
      ${renderPhotoStrip(imageUrls, product.name || "Peça")}
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
  } else {
    productModalPrice.innerHTML = renderOfferHtml(product)
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
  if (pieceGroupKey === groupKey && group) openPiecePage(group)
  else renderCatalogGrids()
  if (group && currentModalGroup?.key === groupKey) openProductModal(group)
}

function renderPieceActions(product, components, soldOut) {
  if (soldOut) {
    return `<button type="button" class="waitlist-card-btn" data-waitlist-code="${escapeHtml(product.code)}">Lista de espera</button>`
  }
  if (components.length) {
    return `<button type="button" class="view-types-card-btn" data-view-code="${escapeHtml(product.code)}">Ver tipos</button>`
  }
  return `<button type="button" class="add-cart-card-btn" data-add-code="${escapeHtml(product.code)}">Adicionar à cesta</button>`
}

function openPiecePage(group) {
  if (!group || !piecePage) return
  pieceGroupKey = group.key
  const variant = selectedVariant(group)
  const product = variant?.product
  if (!product) return
  const components = getProductComponents(product.code)
  const soldOut = !isCatalogProductAvailable(product, components)
  const urls = getProductImageUrls(product)
  pieceGallery.innerHTML = urls.length
    ? urls.map((url) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(product.name || "Peça")}">`).join("")
    : ""
  pieceTitle.textContent = product.name || "Peça"
  pieceCode.textContent = product.code || ""
  pieceColors.innerHTML = renderColorOptions(group, product.code)
  piecePrices.innerHTML = components.length
    ? ""
    : soldOut
      ? `<div class="price unavailable">Em falta</div>`
      : renderOfferHtml(product)
  const description = productDescriptionText(product)
  pieceDescription.hidden = !description
  pieceDescription.textContent = description
  const care = pieceCareText(product)
  pieceCare.hidden = !care
  pieceCareTextEl.textContent = care
  pieceActions.innerHTML = renderPieceActions(product, components, soldOut)
  if (pieceWhatsapp) pieceWhatsapp.href = whatsappLink(productWhatsappMessage(product.name))
  const related = relatedGroups(allGroups, group, isCatalogProductAvailable, 4)
  pieceRelated.innerHTML = related.length
    ? related.map(renderCatalogGroup).join("")
    : `<p class="piece-related-empty">Nenhuma outra peça desta categoria agora.</p>`
  if (pieceBack) {
    const backQuery = buildCatalogQuery({
      categoria: selectedCategory,
      utmSource: linkUtm.utmSource,
      utmMedium: linkUtm.utmMedium,
      utmCampaign: linkUtm.utmCampaign,
    })
    pieceBack.href = `${location.pathname}${backQuery}`
  }
  piecePage.hidden = false
  catalogEl.hidden = true
  unavailableProductsSection.hidden = true
  syncCatalogUrl()
  window.scrollTo(0, 0)
}

function closePiecePage() {
  pieceGroupKey = ""
  if (piecePage) piecePage.hidden = true
  syncCatalogUrl()
  renderCatalogGrids()
}

function applyCatalogLink() {
  const link = readCatalogLink(location.search)
  linkUtm = {
    utmSource: link.utmSource,
    utmMedium: link.utmMedium,
    utmCampaign: link.utmCampaign,
  }
  selectedCategory = link.categoria
  if (!link.peca) {
    pieceGroupKey = ""
    if (piecePage) piecePage.hidden = true
    syncCatalogUrl()
    renderCatalogGrids()
    return
  }
  const resolved = resolvePieceLink(allGroups, link.peca, isCatalogProductAvailable)
  if (resolved.kind === "piece") {
    selectedCodeByGroup[resolved.group.key] = resolved.variant.product.code
    openPiecePage(resolved.group)
    return
  }
  pieceGroupKey = ""
  if (piecePage) piecePage.hidden = true
  if (resolved.kind === "soldout") selectedCategory = normalizeCategoryParam(resolved.category)
  syncCatalogUrl()
  renderCatalogGrids()
}

function renderCatalogGrids() {
  const term = getSearchTerm()
  const sortMode = getSortMode()

  renderCategoryFilters()

  const filters = activeFilters()
  const partitioned = filterAndPartitionCatalog(allGroups, filters, isCatalogProductAvailable)
  const sortList = (groups) => bestsellerSort && bestsellerTotals
    ? sortGroupsByBestsellers(groups, bestsellerTotals)
    : sortGroupsForCatalog(groups, sortMode, isCatalogProductAvailable, filters)
  const availFiltered = sortList(partitioned.available)
  const unavailFiltered = sortList(partitioned.soldOut)
  if (pieceGroupKey && piecePage && !piecePage.hidden) {
    catalogEl.hidden = true
    unavailableProductsSection.hidden = true
    return
  }

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
  renderColorFilters()

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
  await loadBestsellerTotals()
  applyCatalogLink()
}

async function loadBestsellerTotals() {
  bestsellerTotals = null
  bestsellerSort = false
  const button = collectionsEl?.querySelector("[data-collection='mais-vendidas']")
  if (button) button.disabled = true
  const relation = String(window.MarisCatalogRead?.BESTSELLERS_RELATION || "").trim()
  if (!relation) return
  try {
    const query = window.MarisCatalogRead.selectBestsellers(supabaseClient)
    if (!query) return
    const { data, error } = await query
    if (error || !Array.isArray(data)) return
    bestsellerTotals = totalsByProductCode(data)
    if (button) button.disabled = false
  } catch (error) {
    console.warn("Mais vendidas indisponível", error)
  }
}

function handleProductClick(target) {
  const productCard = target.closest(".product[data-group-key]")
  if (!productCard) return
  openPiecePage(findGroupByKey(productCard.getAttribute("data-group-key")))
}

function handleCatalogGridClick(event) {
  if (ignoreNextCardClick) {
    ignoreNextCardClick = false
    return
  }
  const colorBtn = event.target.closest("[data-color-code]")
  if (colorBtn) {
    event.stopPropagation()
    const card = colorBtn.closest("[data-group-key]")
    chooseGroupColor(card?.getAttribute("data-group-key") || pieceGroupKey, colorBtn.getAttribute("data-color-code"))
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
    openProductModal(findGroupByKey(card?.getAttribute("data-group-key") || pieceGroupKey))
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

function renderColorFilters() {
  if (!colorFiltersEl) return
  const options = [{ id: "", label: "Todas as cores" }, ...COLOR_FILTERS]
  colorFiltersEl.innerHTML = options.map((item) => {
    const selected = item.id === colorId
    return `<button type="button" class="catalog-filter${selected ? " is-selected" : ""}" data-color-filter="${item.id}" aria-pressed="${selected ? "true" : "false"}">${item.label}</button>`
  }).join("")
}

function readDrawerFilters() {
  minPrice = parsePriceBound(minPriceInput?.value)
  maxPrice = parsePriceBound(maxPriceInput?.value)
  onlyAvailable = Boolean(onlyAvailableInput?.checked)
}

function setDrawerOpen(open) {
  catalogDrawer?.classList.toggle("is-open", Boolean(open))
}

function refreshAfterFilterChange() {
  if (pieceGroupKey) closePiecePage()
  else {
    syncCatalogUrl()
    renderCatalogGrids()
  }
}

function bindPhotoSwipe(root) {
  if (!root) return
  root.addEventListener("pointerdown", (event) => {
    const photos = event.target.closest(".product-photos")
    if (!photos) return
    photos.dataset.scrollStart = String(photos.scrollLeft)
  })
  root.addEventListener("pointerup", (event) => {
    const photos = event.target.closest(".product-photos")
    if (!photos) return
    const start = Number(photos.dataset.scrollStart || 0)
    if (Math.abs(photos.scrollLeft - start) > 6) ignoreNextCardClick = true
  })
}

if (catalogFiltersEl) {
  catalogFiltersEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]")
    if (!button) return
    selectedCategory = button.getAttribute("data-category") || "Todos"
    refreshAfterFilterChange()
  })
}

document.getElementById("catalog-filters-open")?.addEventListener("click", () => setDrawerOpen(true))
document.getElementById("catalog-filters-close")?.addEventListener("click", () => setDrawerOpen(false))
document.getElementById("catalog-filters-apply")?.addEventListener("click", () => {
  readDrawerFilters()
  setDrawerOpen(false)
  refreshAfterFilterChange()
})
catalogDrawer?.addEventListener("click", (event) => {
  const target = event.target
  if (target instanceof HTMLElement && target.dataset.closeDrawer === "true") setDrawerOpen(false)
})
minPriceInput?.addEventListener("change", () => {
  readDrawerFilters()
  refreshAfterFilterChange()
})
maxPriceInput?.addEventListener("change", () => {
  readDrawerFilters()
  refreshAfterFilterChange()
})
onlyAvailableInput?.addEventListener("change", () => {
  readDrawerFilters()
  refreshAfterFilterChange()
})
colorFiltersEl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-color-filter]")
  if (!button) return
  colorId = button.getAttribute("data-color-filter") || ""
  renderColorFilters()
  refreshAfterFilterChange()
})
collectionsEl?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-collection]")
  if (!button || button.disabled) return
  const kind = button.getAttribute("data-collection")
  if (kind === "mais-vendidas") {
    if (!bestsellerTotals) return
    bestsellerSort = !bestsellerSort
    onSaleOnly = false
  }
  if (kind === "novidades" && catalogSortSelect) {
    catalogSortSelect.value = "created_desc"
    onSaleOnly = false
    bestsellerSort = false
  }
  if (kind === "promocoes") {
    onSaleOnly = !onSaleOnly
    bestsellerSort = false
  }
  collectionsEl.querySelectorAll("[data-collection]").forEach((el) => {
    const name = el.getAttribute("data-collection")
    const selected = (name === "promocoes" && onSaleOnly)
      || (name === "novidades" && !onSaleOnly && !bestsellerSort && catalogSortSelect?.value === "created_desc")
      || (name === "mais-vendidas" && bestsellerSort)
    el.classList.toggle("is-selected", selected)
    el.setAttribute("aria-pressed", selected ? "true" : "false")
  })
  refreshAfterFilterChange()
})
pieceBack?.addEventListener("click", (event) => {
  event.preventDefault()
  closePiecePage()
})
piecePage?.addEventListener("click", handleCatalogGridClick)
bindPhotoSwipe(catalogEl)
bindPhotoSwipe(unavailableProductsGrid)
bindPhotoSwipe(pieceRelated)
window.addEventListener("popstate", () => applyCatalogLink())
renderColorFilters()

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