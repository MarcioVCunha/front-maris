import {
  NEW_SALE_ENABLED,
  MARKETPLACE_SALE_ENABLED,
  KNOWN_CATEGORIES,
  addPiece,
  addComponents,
  applyStockIssues,
  buildCreateSaleBody,
  buildMarketplaceSaleBody,
  cancelMarketplaceOrderPayload,
  currentYearMonth,
  customerPayload,
  escapeHtml,
  filterCustomers,
  filterPieces,
  formatWhatsapp,
  renderCategoryChipsHtml,
  renderCustomerHitHtml,
  renderPieceIdentityHtml,
  isMarketplaceSale,
  monthCardFromSummary,
  newClientRequestId,
  removePiece,
  renderRecentSales,
  renderSaleDetail,
  resolvePieceCategory,
  saleTotals,
  setPieceQuantity,
  shouldShowMarketplaceSale,
  shouldShowNewSale,
  togglePiece,
  totalPiecesCount
} from "./nova-venda.logic.js"
import {
  cancelMarketplaceOrder as cancelMarketplaceOrderApi,
  createSale,
  fetchMonthSummary,
  fetchRecentSales,
  registerMarketplaceOrder,
  saveCustomer,
  searchCustomers,
  searchPieces
} from "./nova-venda.api.js"

const money = (value) => window.MarisUtils.formatMoneyBRL(value)

const homeEl = document.getElementById("sale-home")
const flowEl = document.getElementById("sale-flow")
const sellerNameEl = document.getElementById("seller-name")
const monthTotalEl = document.getElementById("month-total")
const monthLabelEl = document.getElementById("month-heading")
const monthCommissionEl = document.getElementById("month-commission")
const commissionNoteEl = document.getElementById("commission-note")
const recentEl = document.getElementById("recent-sales")
const saleModalEl = document.getElementById("sale-modal")
const saleModalBodyEl = document.getElementById("sale-modal-body")
const newSaleBtn = document.getElementById("new-sale-btn")
const marketplaceSaleBtn = document.getElementById("marketplace-sale-btn")
const homeMessageEl = document.getElementById("home-message")
const pieceSearchEl = document.getElementById("piece-search")
const pieceSearchClearEl = document.getElementById("piece-search-clear")
const pieceCategoriesEl = document.getElementById("piece-categories")
const catalogCountEl = document.getElementById("catalog-count")
const selectedEl = document.getElementById("selected-pieces")
const pieceResultsEl = document.getElementById("piece-results")
const customerSearchEl = document.getElementById("customer-search")
const customerResultsEl = document.getElementById("customer-results")
const customerNameEl = document.getElementById("customer-name")
const customerWhatsappEl = document.getElementById("customer-whatsapp")
const customerHelpEl = document.getElementById("customer-help")
const marketplaceNotesEl = document.getElementById("marketplace-notes")
const flowMessageEl = document.getElementById("flow-message")
const flowNextEl = document.getElementById("flow-next")
const flowBackEl = document.getElementById("flow-back")
const paySubtotalEl = document.getElementById("pay-subtotal")
const payDiscountRowEl = document.getElementById("pay-discount-row")
const payDiscountEl = document.getElementById("pay-discount")
const payTotalEl = document.getElementById("pay-total")

const marketplaceReady = shouldShowMarketplaceSale(MARKETPLACE_SALE_ENABLED)

const state = {
  seller: null,
  step: 1,
  channel: "equipe",
  marketplace: "",
  recentSales: [],
  allPieces: [],
  catalogLoaded: false,
  catalogLoading: false,
  activeCategory: "Todas",
  pieceHits: [],
  selected: [],
  customerHits: [],
  pickedCustomer: null,
  paymentStatus: "",
  paymentMethod: "",
  clientRequestId: "",
  saleFingerprint: ""
}

function flowSteps() {
  // Marketplace: canal + peças → confirma (sempre pago, sem cliente/pagamento).
  return state.channel === "marketplace"
    ? ["channel", "pieces"]
    : ["pieces", "customer", "payment"]
}

function resetFlowState(channel = "equipe") {
  state.channel = channel
  state.marketplace = ""
  state.selected = []
  state.pickedCustomer = null
  state.paymentStatus = ""
  state.paymentMethod = ""
  state.clientRequestId = ""
  state.saleFingerprint = ""
  state.activeCategory = "Todas"
  if (customerNameEl) customerNameEl.value = ""
  if (customerWhatsappEl) customerWhatsappEl.value = ""
  if (pieceSearchEl) pieceSearchEl.value = ""
  if (pieceSearchClearEl) pieceSearchClearEl.hidden = true
  if (marketplaceNotesEl) marketplaceNotesEl.value = ""
}

function setNote(el, text, type) {
  if (!el) return
  el.hidden = !text
  el.textContent = text || ""
  el.className = type ? `step-message ${type}` : "step-message"
}

function showHome() {
  homeEl.hidden = false
  flowEl.hidden = true
}

function findPieceById(id) {
  const targetId = String(id || "")
  for (const piece of state.allPieces) {
    if (String(piece.id) === targetId) return piece
    if (Array.isArray(piece.components)) {
      const found = piece.components.find((c) => String(c.id) === targetId)
      if (found) return found
    }
  }
  for (const piece of state.pieceHits) {
    if (String(piece.id) === targetId) return piece
    if (Array.isArray(piece.components)) {
      const found = piece.components.find((c) => String(c.id) === targetId)
      if (found) return found
    }
  }
  return state.selected.find((item) => String(item.id) === targetId) || null
}

async function loadCatalogPieces() {
  if (state.catalogLoaded || state.catalogLoading) return state.allPieces
  state.catalogLoading = true
  if (catalogCountEl) catalogCountEl.textContent = "Carregando catálogo..."

  try {
    const sb = window.MarisUtils?.createSupabaseClient ? window.MarisUtils.createSupabaseClient() : null
    if (!sb || !window.MarisCatalogRead) {
      state.catalogLoading = false
      return []
    }
    const [productsRes, componentsRes, imagesRes] = await Promise.all([
      window.MarisCatalogRead.selectProducts(sb)
        .order("quantity", { ascending: false })
        .order("name"),
      window.MarisCatalogRead.selectPricedComponents(sb).order("name"),
      window.MarisCatalogRead.selectImages(sb).order("sort_order", { ascending: true })
    ])

    const products = Array.isArray(productsRes?.data) ? productsRes.data : []
    const components = Array.isArray(componentsRes?.data) ? componentsRes.data : []
    const images = Array.isArray(imagesRes?.data) ? imagesRes.data : []

    const imagesByProductId = Object.create(null)
    const codeById = Object.create(null)

    for (const p of products) {
      if (p?.id && p?.code) {
        codeById[Number(p.id)] = String(p.code)
      }
    }

    const imagesByCode = Object.create(null)
    for (const row of images) {
      const pid = Number(row?.product_id)
      const url = String(row?.image_url || "").trim()
      if (!pid || !url) continue
      if (!imagesByProductId[pid]) imagesByProductId[pid] = url
      const code = codeById[pid]
      if (code && !imagesByCode[code]) imagesByCode[code] = url
    }

    const componentsByProductCode = Object.create(null)
    for (const c of components) {
      if (!c || c.is_active === false) continue
      const pCode = String(c.product_code || "").trim()
      if (!pCode) continue
      if (!componentsByProductCode[pCode]) componentsByProductCode[pCode] = []
      componentsByProductCode[pCode].push(c)
    }

    const pieces = []
    for (const p of products) {
      const pCode = String(p.code || "").trim()
      const pComponents = componentsByProductCode[pCode] || []
      const pStock = Number(p.quantity) || 0
      const hasComponents = pComponents.length > 0
      const img = String(p.image_url || "").trim() || imagesByProductId[Number(p.id)] || imagesByCode[pCode] || ""

      const compPiecesList = pComponents.map((c) => {
        const cStock = Number(c.quantity) || 0
        const cUnit = Number(c.computed_unit_price) || 0
        const cEfetivo = Number.isFinite(Number(c.preco_efetivo)) ? Number(c.preco_efetivo) : cUnit
        const cPix = Number.isFinite(Number(c.preco_pix)) ? Number(c.preco_pix) : null
        return {
          id: `c:${c.id}`,
          raw_id: c.id,
          code: pCode,
          name: `${p.name} · ${c.name}`,
          component_name: c.name,
          parent_name: p.name,
          categoria: p.categoria || "Conjunto",
          quantity: cStock,
          stock: cStock,
          image_url: img,
          item_type: "component",
          component_id: c.id,
          unit_price: cUnit,
          preco_efetivo: cEfetivo,
          preco_pix: cPix,
          is_on_sale: Boolean(c.parent_is_on_sale),
          discount_percent: Number(c.parent_discount_percent) || 0
        }
      })

      const componentsInStock = compPiecesList.filter((c) => c.stock > 0)
      const isAvailable = hasComponents ? (componentsInStock.length > 0 || pStock > 0) : pStock > 0
      if (!isAvailable) continue

      const unitPrice = Number(p.unit_price) || 0
      const precoEfetivo = Number.isFinite(Number(p.preco_efetivo)) ? Number(p.preco_efetivo) : unitPrice
      const precoPix = Number.isFinite(Number(p.preco_pix)) ? Number(p.preco_pix) : null

      pieces.push({
        id: p.id,
        code: pCode,
        name: p.name,
        parent_name: p.name,
        component_name: "",
        categoria: resolvePieceCategory(p),
        quantity: pStock,
        stock: pStock,
        image_url: img,
        item_type: "product",
        component_id: null,
        unit_price: unitPrice,
        preco_efetivo: precoEfetivo,
        preco_pix: precoPix,
        is_on_sale: Boolean(p.is_on_sale),
        discount_percent: Number(p.discount_percent) || 0,
        has_components: hasComponents,
        components: compPiecesList
      })
    }

    const processedCodes = new Set(products.map((p) => String(p?.code || "").trim()))
    for (const [code, compList] of Object.entries(componentsByProductCode)) {
      if (processedCodes.has(code)) continue
      for (const c of compList) {
        const cStock = Number(c.quantity) || 0
        if (cStock <= 0) continue
        const cUnit = Number(c.computed_unit_price) || 0
        const cEfetivo = Number.isFinite(Number(c.preco_efetivo)) ? Number(c.preco_efetivo) : cUnit
        const cPix = Number.isFinite(Number(c.preco_pix)) ? Number(c.preco_pix) : null
        pieces.push({
          id: `c:${c.id}`,
          code,
          name: c.name,
          parent_name: "",
          component_name: c.name,
          categoria: "Partes",
          quantity: cStock,
          stock: cStock,
          image_url: imagesByCode[code] || "",
          item_type: "component",
          component_id: c.id,
          unit_price: cUnit,
          preco_efetivo: cEfetivo,
          preco_pix: cPix,
          is_on_sale: Boolean(c.parent_is_on_sale),
          discount_percent: Number(c.parent_discount_percent) || 0,
          has_components: false,
          components: []
        })
      }
    }

    state.allPieces = pieces
    state.catalogLoaded = true
    state.catalogLoading = false
    renderCategoryChips()
    renderPieces()
    return pieces
  } catch (err) {
    console.error("Falha ao carregar catálogo completo:", err)
    state.catalogLoading = false
    return []
  }
}

function renderCategoryChips() {
  if (!pieceCategoriesEl) return
  if (!state.allPieces.length) {
    pieceCategoriesEl.innerHTML = ""
    return
  }

  const counts = Object.create(null)
  let totalCount = 0
  for (const piece of state.allPieces) {
    const cat = resolvePieceCategory(piece)
    counts[cat] = (counts[cat] || 0) + 1
    totalCount++
    if (Array.isArray(piece.components)) {
      const addedCats = new Set([cat])
      for (const c of piece.components) {
        if (c.stock > 0) {
          const cCat = resolvePieceCategory(c)
          if (!addedCats.has(cCat)) {
            counts[cCat] = (counts[cCat] || 0) + 1
            addedCats.add(cCat)
          }
        }
      }
    }
  }

  const categories = ["Todas"]
  for (const cat of KNOWN_CATEGORIES) {
    if (counts[cat]) categories.push(cat)
  }
  for (const cat of Object.keys(counts)) {
    if (!categories.includes(cat) && counts[cat]) categories.push(cat)
  }

  pieceCategoriesEl.innerHTML = renderCategoryChipsHtml(
    categories.map((cat) => ({
      name: cat,
      count: cat === "Todas" ? totalCount : (counts[cat] || 0)
    })),
    state.activeCategory || "Todas"
  )
}

function showFlow(step) {
  const steps = flowSteps()
  const index = Math.max(0, Math.min(step - 1, steps.length - 1))
  state.step = index + 1
  const current = steps[index]
  homeEl.hidden = true
  flowEl.hidden = false
  const channelEl = document.getElementById("step-channel")
  if (channelEl) channelEl.hidden = current !== "channel"
  document.getElementById("step-pieces").hidden = current !== "pieces"
  document.getElementById("step-customer").hidden = current !== "customer"
  document.getElementById("step-payment").hidden = current !== "payment"
  document.querySelectorAll("[data-step-pill]").forEach((pill) => {
    const n = Number(pill.getAttribute("data-step-pill"))
    const mapped = state.channel === "marketplace" ? n + 1 : n
    const on = mapped === state.step || (current === "channel" && n === 1)
    if (on) pill.setAttribute("aria-current", "step")
    else pill.removeAttribute("aria-current")
  })
  if (customerHelpEl) {
    customerHelpEl.textContent = "Escolha uma cliente ou cadastre nome e WhatsApp."
  }
  document.querySelectorAll("[data-marketplace]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      button.getAttribute("data-marketplace") === state.marketplace ? "true" : "false"
    )
  })
  const confirmStep = current === "payment" || (state.channel === "marketplace" && current === "pieces")
  flowNextEl.textContent = confirmStep ? "Confirmar venda" : "Continuar"
  setNote(flowMessageEl, "")
  if (current === "payment") renderPayment()
  if (current === "pieces") {
    renderCategoryChips()
    if (!state.catalogLoaded && !state.catalogLoading) {
      loadCatalogPieces()
    } else {
      renderPieces()
    }
  }
}

function piecePhoto(piece) {
  const url = String(piece.image_url || "").trim()
  if (!url) {
    const letters = String(piece.code || piece.name || "?").slice(0, 2)
    return `<span class="piece-photo piece-photo--empty">${escapeHtml(letters)}</span>`
  }
  return `<img class="piece-photo" src="${escapeHtml(url)}" alt="" loading="lazy">`
}

function renderSelected() {
  if (!selectedEl) return
  const count = totalPiecesCount(state.selected)
  if (!count) {
    selectedEl.innerHTML = `
      <div class="selected-summary-empty">
        <p>Nenhuma peça adicionada ainda. Navegue pelo catálogo abaixo ou use a busca para ir colocando as peças na venda.</p>
      </div>
    `
    return
  }

  const totals = saleTotals(state.selected, "pix")
  const subtotalFormatted = money(totals.subtotal)
  const pixFormatted = money(totals.total)

  selectedEl.innerHTML = `
    <div class="selected-summary-card">
      <div class="selected-summary-top">
        <div class="selected-summary-info">
          <span class="selected-count-badge">${count} ${count === 1 ? "peça selecionada" : "peças selecionadas"}</span>
          <strong class="selected-total-val">${subtotalFormatted}</strong>
          <small class="selected-pix-val">ou ${pixFormatted} no Pix (5% off)</small>
        </div>
        <button type="button" class="btn-summary-advance" id="btn-advance-summary">
          Avançar para finalizar (${count}) →
        </button>
      </div>
      <div class="selected-items-list">
        ${state.selected.map((item) => {
          const itemSubtotal = money((Number(item.unit_price) || 0) * (Number(item.quantity) || 1))
          const isMax = Number(item.quantity) >= Number(item.stock)
          return `
            <div class="selected-item-row" data-selected-id="${escapeHtml(item.id)}">
              ${piecePhoto(item)}
              <div class="selected-item-meta">
                <strong>${escapeHtml(item.name)}</strong>
                <small>${escapeHtml(item.code)} · ${money(item.unit_price)} un.</small>
              </div>
              <div class="selected-item-controls">
                <span class="qty-control">
                  <button type="button" class="qty-btn" data-qty="${escapeHtml(item.id)}" data-dir="-1" aria-label="Diminuir">−</button>
                  <strong class="qty-val">${item.quantity}</strong>
                  <button type="button" class="qty-btn" data-qty="${escapeHtml(item.id)}" data-dir="1" aria-label="Aumentar" ${isMax ? "disabled" : ""}>+</button>
                </span>
                <span class="selected-item-subtotal">${itemSubtotal}</span>
                <button type="button" class="btn-remove-selected" data-remove="${escapeHtml(item.id)}" aria-label="Remover">×</button>
              </div>
            </div>
          `
        }).join("")}
      </div>
    </div>
  `
}

function renderPieces() {
  renderSelected()

  const term = pieceSearchEl ? pieceSearchEl.value.trim() : ""
  if (pieceSearchClearEl) {
    pieceSearchClearEl.hidden = !term
  }

  const pool = state.allPieces.length ? state.allPieces : state.pieceHits
  const visible = filterPieces(pool, term, state.activeCategory)

  if (catalogCountEl) {
    if (state.catalogLoading) {
      catalogCountEl.textContent = "Carregando catálogo..."
    } else {
      const count = visible.length
      const catText = state.activeCategory && state.activeCategory !== "Todas" ? ` em ${state.activeCategory}` : ""
      catalogCountEl.textContent = `${count} ${count === 1 ? "peça disponível" : "peças disponíveis"}${catText}`
    }
  }

  if (state.catalogLoading && !state.allPieces.length) {
    if (window.MarisLoading?.skeletonNovaVendaGrid) {
      pieceResultsEl.innerHTML = window.MarisLoading.skeletonNovaVendaGrid(6)
    } else {
      pieceResultsEl.innerHTML = `<div class="catalog-loading-msg"><p>Carregando peças do catálogo...</p></div>`
    }
    return
  }

  if (!visible.length) {
    if (term) {
      pieceResultsEl.innerHTML = `<div class="catalog-empty-msg"><p class="recent-empty">Nenhuma peça em estoque para "<strong>${escapeHtml(term)}</strong>".</p></div>`
    } else {
      pieceResultsEl.innerHTML = `<div class="catalog-empty-msg"><p class="recent-empty">Nenhuma peça disponível nesta categoria.</p></div>`
    }
    return
  }

  pieceResultsEl.innerHTML = visible.map((piece) => {
    if (piece.has_components && piece.components.length > 0) {
      const components = piece.components
      const inStockComps = components.filter((c) => (Number(c.quantity) || 0) > 0)
      const selectedComps = components.filter((c) => state.selected.some((item) => String(item.id) === String(c.id)))
      const isAnyPicked = selectedComps.length > 0
      const isPromo = Boolean(piece.is_on_sale && piece.discount_percent > 0)

      let lowestPrice = Infinity
      let lowestPix = null
      for (const c of inStockComps) {
        const p = Number.isFinite(Number(c.preco_efetivo)) ? c.preco_efetivo : c.unit_price
        if (p < lowestPrice) {
          lowestPrice = p
          lowestPix = c.preco_pix
        }
      }
      if (lowestPrice === Infinity && components.length > 0) {
        lowestPrice = components[0].unit_price
        lowestPix = components[0].preco_pix
      }

      const parentInCart = state.selected.find((item) => String(item.id) === String(piece.id))
      const hasParentStock = Number(piece.quantity) > 0

      return `
        <article class="piece-card piece-card--set ${isAnyPicked || parentInCart ? "piece-card--selected" : ""}" data-piece-card="${escapeHtml(piece.id)}">
          <div class="piece-card-thumb-wrap">
            ${piecePhoto(piece)}
            ${isPromo ? `<span class="promo-tag">-${piece.discount_percent}%</span>` : ""}
            <span class="stock-tag stock-tag--set">${components.length} subtipos</span>
          </div>
          <div class="piece-card-info">
            <div class="piece-card-badge-row">
              <span class="piece-card-cat">${escapeHtml(resolvePieceCategory(piece))}</span>
              <span class="badge-subtipos">Peça com divisões</span>
            </div>
            ${renderPieceIdentityHtml(piece)}
            <div class="piece-card-prices">
              <span class="price-from-label">Subtipos a partir de:</span>
              <strong class="price-current">${money(lowestPrice)}</strong>
              ${Number.isFinite(Number(lowestPix)) ? `<span class="price-pix">${money(lowestPix)} no Pix</span>` : ""}
            </div>
          </div>

          <div class="piece-card-components-section">
            <p class="components-section-title">Escolha o que vender:</p>
            <div class="components-subitems-list">
              ${components.map((comp) => {
                const selectedItem = state.selected.find((item) => String(item.id) === String(comp.id))
                const isPicked = Boolean(selectedItem)
                const quantityInCart = selectedItem ? selectedItem.quantity : 0
                const price = Number.isFinite(Number(comp.preco_efetivo)) ? comp.preco_efetivo : comp.unit_price
                const stock = Number(comp.quantity) || 0
                const isMax = quantityInCart >= stock
                const isSoldOut = stock <= 0

                return `
                  <div class="subitem-row ${isPicked ? "subitem-row--selected" : ""} ${isSoldOut ? "subitem-row--soldout" : ""}">
                    <div class="subitem-meta">
                      <strong class="subitem-name">${escapeHtml(comp.component_name || comp.name)}</strong>
                      <span class="subitem-stock ${stock === 1 ? "stock-tag--last" : ""}">${isSoldOut ? "Esgotado" : `${stock} un.`}</span>
                    </div>
                    <div class="subitem-price">
                      <strong class="subitem-val">${money(price)}</strong>
                      ${Number.isFinite(Number(comp.preco_pix)) ? `<small class="subitem-pix">Pix ${money(comp.preco_pix)}</small>` : ""}
                    </div>
                    <div class="subitem-action">
                      ${!isPicked ? `
                        <button type="button" class="btn-subitem-add" data-card-add="${escapeHtml(comp.id)}" ${isSoldOut ? "disabled" : ""}>
                          + Adicionar
                        </button>
                      ` : `
                        <div class="card-stepper subitem-stepper">
                          <button type="button" class="card-stepper-btn" data-card-qty="${escapeHtml(comp.id)}" data-dir="-1" aria-label="Diminuir">−</button>
                          <strong class="card-stepper-qty">${quantityInCart}</strong>
                          <button type="button" class="card-stepper-btn" data-card-qty="${escapeHtml(comp.id)}" data-dir="1" aria-label="Aumentar" ${isMax ? "disabled" : ""}>+</button>
                        </div>
                      `}
                    </div>
                  </div>
                `
              }).join("")}

              ${hasParentStock ? `
                <div class="subitem-row ${parentInCart ? "subitem-row--selected" : ""}">
                  <div class="subitem-meta">
                    <strong class="subitem-name">Peça cheia montada</strong>
                    <span class="subitem-stock">${piece.quantity} un.</span>
                  </div>
                  <div class="subitem-price">
                    <strong class="subitem-val">${money(piece.unit_price)}</strong>
                    ${Number.isFinite(Number(piece.preco_pix)) ? `<small class="subitem-pix">Pix ${money(piece.preco_pix)}</small>` : ""}
                  </div>
                  <div class="subitem-action">
                    ${!parentInCart ? `
                      <button type="button" class="btn-subitem-add" data-card-add="${escapeHtml(piece.id)}">
                        + Adicionar
                      </button>
                    ` : `
                      <div class="card-stepper subitem-stepper">
                        <button type="button" class="card-stepper-btn" data-card-qty="${escapeHtml(piece.id)}" data-dir="-1">−</button>
                        <strong class="card-stepper-qty">${parentInCart.quantity}</strong>
                        <button type="button" class="card-stepper-btn" data-card-qty="${escapeHtml(piece.id)}" data-dir="1" ${parentInCart.quantity >= piece.quantity ? "disabled" : ""}>+</button>
                      </div>
                    `}
                  </div>
                </div>
              ` : ""}
            </div>

            ${inStockComps.length >= 2 ? `
              <button type="button" class="btn-add-all-set" data-add-all-components="${escapeHtml(piece.code)}">
                + Vender conjunto completo (${inStockComps.map((c) => escapeHtml(c.component_name || c.name)).join(" + ")})
              </button>
            ` : ""}
          </div>
        </article>
      `
    }

    const selectedItem = state.selected.find((item) => String(item.id) === String(piece.id))
    const isPicked = Boolean(selectedItem)
    const quantityInCart = selectedItem ? selectedItem.quantity : 0
    const price = Number.isFinite(Number(piece.preco_efetivo)) ? piece.preco_efetivo : piece.unit_price
    const isPromo = Boolean(piece.is_on_sale && piece.discount_percent > 0)
    const stock = Number(piece.quantity) || 0
    const isMax = quantityInCart >= stock

    return `
      <article class="piece-card ${isPicked ? "piece-card--selected" : ""}" data-piece-card="${escapeHtml(piece.id)}">
        <div class="piece-card-thumb-wrap">
          ${piecePhoto(piece)}
          ${isPromo ? `<span class="promo-tag">-${piece.discount_percent}%</span>` : ""}
          <span class="stock-tag ${stock === 1 ? "stock-tag--last" : ""}">${stock === 1 ? "Última un." : `${stock} un.`}</span>
        </div>
        <div class="piece-card-info">
          <span class="piece-card-cat">${escapeHtml(resolvePieceCategory(piece))}</span>
          ${renderPieceIdentityHtml(piece)}
          <div class="piece-card-prices">
            ${isPromo ? `<span class="price-original">${money(piece.unit_price)}</span>` : ""}
            <strong class="price-current">${money(price)}</strong>
            ${Number.isFinite(Number(piece.preco_pix)) ? `<span class="price-pix">${money(piece.preco_pix)} no Pix</span>` : ""}
          </div>
        </div>
        <div class="piece-card-actions">
          ${!isPicked ? `
            <button type="button" class="btn-card-add" data-card-add="${escapeHtml(piece.id)}">
              + Adicionar
            </button>
          ` : `
            <div class="card-stepper">
              <button type="button" class="card-stepper-btn" data-card-qty="${escapeHtml(piece.id)}" data-dir="-1" aria-label="Diminuir">−</button>
              <strong class="card-stepper-qty">${quantityInCart}</strong>
              <button type="button" class="card-stepper-btn" data-card-qty="${escapeHtml(piece.id)}" data-dir="1" aria-label="Aumentar" ${isMax ? "disabled" : ""}>+</button>
            </div>
          `}
        </div>
      </article>
    `
  }).join("")
}

function renderCustomers() {
  const term = customerSearchEl.value.trim()
  const visible = term ? filterCustomers(state.customerHits, term) : []
  if (!term) {
    customerResultsEl.innerHTML = ""
    return
  }
  if (!visible.length) {
    customerResultsEl.innerHTML = `<p class="recent-empty">Nenhuma cliente encontrada. Cadastre abaixo.</p>`
    return
  }
  customerResultsEl.innerHTML = visible.map((customer) => {
    const picked = state.pickedCustomer && String(state.pickedCustomer.id) === String(customer.id)
    return renderCustomerHitHtml(customer, picked)
  }).join("")
}

function renderPayment() {
  document.querySelectorAll("[data-status]").forEach((button) => {
    button.setAttribute("aria-pressed", button.getAttribute("data-status") === state.paymentStatus ? "true" : "false")
  })
  document.querySelectorAll("[data-method]").forEach((button) => {
    button.setAttribute("aria-pressed", button.getAttribute("data-method") === state.paymentMethod ? "true" : "false")
  })
  const totals = saleTotals(state.selected, state.paymentMethod)
  paySubtotalEl.textContent = money(totals.subtotal)
  payDiscountEl.textContent = money(totals.discount)
  payDiscountRowEl.hidden = state.paymentMethod !== "pix"
  payTotalEl.textContent = money(totals.total)
}

function chosenCustomer() {
  if (state.pickedCustomer?.id != null) return { id: state.pickedCustomer.id }
  return {
    name: customerNameEl.value,
    whatsapp: customerWhatsappEl.value
  }
}

async function loadHome() {
  const month = currentYearMonth().key
  const sellerId = state.seller?.seller_id
  if (!sellerId) {
    monthTotalEl.textContent = money(0)
    if (monthLabelEl) monthLabelEl.textContent = "0 peças pagas em 0 vendas"
    monthCommissionEl.textContent = money(0)
    commissionNoteEl.textContent = "Sem comissão nesta conta."
    state.recentSales = []
    recentEl.innerHTML = renderRecentSales([], money)
    newSaleBtn.disabled = true
    if (marketplaceSaleBtn && marketplaceReady) marketplaceSaleBtn.disabled = false
    return
  }
  const [summary, recent] = await Promise.all([
    fetchMonthSummary({ sellerId, month }),
    fetchRecentSales({ sellerId })
  ])
  const card = summary.ok
    ? monthCardFromSummary(summary.data, state.seller)
    : monthCardFromSummary({ charged_total: 0 }, state.seller)
  monthTotalEl.textContent = money(card.chargedTotal)
  if (monthLabelEl) monthLabelEl.textContent = card.piecesLabel
  monthCommissionEl.textContent = money(card.commission)
  commissionNoteEl.textContent = card.note
  if (!summary.ok) setNote(homeMessageEl, summary.error, "error")
  state.recentSales = recent.ok ? recent.sales : []
  recentEl.innerHTML = renderRecentSales(state.recentSales, money)
  if (!recent.ok) setNote(homeMessageEl, recent.error, "error")
}

async function onPieceSearch() {
  const query = pieceSearchEl ? pieceSearchEl.value.trim() : ""
  if (pieceSearchClearEl) pieceSearchClearEl.hidden = !query

  if (state.allPieces.length) {
    renderPieces()
    return
  }

  if (!query || !state.seller?.seller_id) {
    state.pieceHits = []
    renderPieces()
    return
  }
  const result = await searchPieces({ query })
  state.pieceHits = result.ok ? result.pieces : []
  if (!result.ok) setNote(flowMessageEl, result.error, "error")
  renderPieces()
}

async function onCustomerSearch() {
  const query = customerSearchEl.value.trim()
  if (!query) {
    state.customerHits = []
    renderCustomers()
    return
  }
  const result = await searchCustomers({ query })
  state.customerHits = result.ok ? result.customers : []
  if (!result.ok) setNote(flowMessageEl, result.error, "error")
  renderCustomers()
}

function saleRequestId(body) {
  const fingerprint = JSON.stringify(body)
  if (state.saleFingerprint !== fingerprint || !state.clientRequestId) {
    state.saleFingerprint = fingerprint
    state.clientRequestId = newClientRequestId()
  }
  return state.clientRequestId
}

async function confirmSale() {
  const market = state.channel === "marketplace"
  if (market && !marketplaceReady) {
    setNote(flowMessageEl, "Venda marketplace ainda não está ligada.", "error")
    return
  }
  let built
  if (market) {
    built = buildMarketplaceSaleBody({
      channel: state.marketplace,
      pieces: state.selected,
      notes: marketplaceNotesEl?.value || ""
    })
  } else {
    built = buildCreateSaleBody({
      sellerId: state.seller?.seller_id,
      customer: chosenCustomer(),
      paymentStatus: state.paymentStatus,
      paymentMethod: state.paymentMethod,
      pieces: state.selected
    })
  }
  if (!built.ok) {
    setNote(flowMessageEl, built.error, "error")
    return
  }
  let body = built.body
  if (!market && body.customer && !body.customer.id) {
    const saved = await saveCustomer(body.customer)
    if (!saved.ok) {
      setNote(flowMessageEl, saved.error, "error")
      return
    }
    body = { ...body, customer: { id: saved.customer.id } }
  }
  body = { ...body, client_request_id: saleRequestId(body) }
  flowNextEl.disabled = true
  const result = market ? await registerMarketplaceOrder(body) : await createSale(body)
  flowNextEl.disabled = false
  if (!result.ok) {
    if (result.status === 409 && result.stockIssues?.length) {
      const adjusted = applyStockIssues(state.selected, result.stockIssues)
      state.selected = adjusted.pieces
      renderPieces()
      if (!market) renderPayment()
      setNote(flowMessageEl, adjusted.message, "error")
      return
    }
    setNote(flowMessageEl, result.error, "error")
    return
  }
  const charged = Number(result.order?.total)
  const totalText = Number.isFinite(charged) ? ` Total ${money(charged)}.` : ""
  const lead = result.order?.duplicate
    ? "Esta venda já estava registrada."
    : "Venda registrada."
  resetFlowState("equipe")
  showHome()
  setNote(homeMessageEl, `${lead}${totalText}`, "success")
  await loadHome()
}

function onNext() {
  const steps = flowSteps()
  const current = steps[state.step - 1]
  if (current === "channel") {
    if (!state.marketplace) {
      setNote(flowMessageEl, "Escolha Shopee, Mercado Livre ou TikTok Shop.", "error")
      return
    }
    showFlow(state.step + 1)
    return
  }
  if (current === "pieces") {
    if (!state.selected.length) {
      setNote(flowMessageEl, "Escolha pelo menos uma peça.", "error")
      return
    }
    if (state.channel === "marketplace") {
      confirmSale()
      return
    }
    showFlow(state.step + 1)
    return
  }
  if (current === "customer") {
    const who = customerPayload(chosenCustomer())
    if (!who.ok) {
      setNote(flowMessageEl, who.error, "error")
      return
    }
    showFlow(state.step + 1)
    return
  }
  confirmSale()
}

newSaleBtn.addEventListener("click", () => {
  setNote(homeMessageEl, "")
  resetFlowState("equipe")
  showFlow(1)
})
marketplaceSaleBtn?.addEventListener("click", () => {
  if (!marketplaceReady) return
  setNote(homeMessageEl, "")
  resetFlowState("marketplace")
  showFlow(1)
})
flowNextEl.addEventListener("click", onNext)
flowBackEl.addEventListener("click", () => {
  if (state.step === 1) {
    resetFlowState("equipe")
    showHome()
  } else showFlow(state.step - 1)
})

document.querySelectorAll("[data-marketplace]").forEach((button) => {
  button.addEventListener("click", () => {
    state.marketplace = button.getAttribute("data-marketplace") || ""
    document.querySelectorAll("[data-marketplace]").forEach((el) => {
      el.setAttribute(
        "aria-pressed",
        el.getAttribute("data-marketplace") === state.marketplace ? "true" : "false"
      )
    })
  })
})

pieceCategoriesEl?.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-category]")
  if (!chip) return
  const cat = chip.getAttribute("data-category") || "Todas"
  state.activeCategory = cat
  renderCategoryChips()
  renderPieces()
})

pieceSearchClearEl?.addEventListener("click", () => {
  if (pieceSearchEl) pieceSearchEl.value = ""
  onPieceSearch()
  pieceSearchEl?.focus()
})

pieceResultsEl.addEventListener("click", (event) => {
  const addAllBtn = event.target.closest("[data-add-all-components]")
  if (addAllBtn) {
    const code = addAllBtn.getAttribute("data-add-all-components")
    const product = state.allPieces.find((p) => p.code === code)
      || state.pieceHits.find((p) => p.code === code)
    if (product && Array.isArray(product.components)) {
      state.selected = addComponents(state.selected, product.components, 1)
      renderPieces()
      return
    }
  }

  const addBtn = event.target.closest("[data-card-add]")
  if (addBtn) {
    const id = addBtn.getAttribute("data-card-add")
    const piece = findPieceById(id)
    if (!piece) return
    state.selected = addPiece(state.selected, piece, 1)
    renderPieces()
    return
  }

  const stepBtn = event.target.closest("[data-card-qty]")
  if (stepBtn) {
    const id = stepBtn.getAttribute("data-card-qty")
    const dir = Number(stepBtn.getAttribute("data-dir")) || 0
    const current = state.selected.find((item) => String(item.id) === String(id))
    if (!current) return
    const next = current.quantity + dir
    if (next < 1) state.selected = removePiece(state.selected, id)
    else state.selected = setPieceQuantity(state.selected, id, next)
    renderPieces()
    return
  }

  const button = event.target.closest("[data-piece]")
  if (!button) return
  const piece = findPieceById(button.getAttribute("data-piece"))
  if (!piece) return
  state.selected = togglePiece(state.selected, piece)
  renderPieces()
})

selectedEl.addEventListener("click", (event) => {
  if (event.target.closest("#btn-advance-summary")) {
    onNext()
    return
  }

  const removeBtn = event.target.closest("[data-remove]")
  if (removeBtn) {
    const id = removeBtn.getAttribute("data-remove")
    state.selected = removePiece(state.selected, id)
    renderPieces()
    return
  }

  const button = event.target.closest("[data-qty]")
  if (!button) return
  const id = button.getAttribute("data-qty")
  const current = state.selected.find((item) => String(item.id) === String(id))
  if (!current) return
  const next = current.quantity + Number(button.getAttribute("data-dir"))
  if (next < 1) state.selected = removePiece(state.selected, id)
  else state.selected = setPieceQuantity(state.selected, id, next)
  renderPieces()
})

customerResultsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-customer]")
  if (!button) return
  const customer = state.customerHits.find((item) => String(item.id) === button.getAttribute("data-customer"))
  state.pickedCustomer = customer || null
  if (customer) {
    customerNameEl.value = customer.name || ""
    customerWhatsappEl.value = formatWhatsapp(customer.whatsapp)
  }
  renderCustomers()
})

customerNameEl.addEventListener("input", () => {
  state.pickedCustomer = null
  renderCustomers()
})
customerWhatsappEl.addEventListener("input", () => {
  customerWhatsappEl.value = formatWhatsapp(customerWhatsappEl.value)
  state.pickedCustomer = null
  renderCustomers()
})

document.querySelectorAll("[data-status]").forEach((button) => {
  button.addEventListener("click", () => {
    state.paymentStatus = button.getAttribute("data-status")
    renderPayment()
  })
})
document.querySelectorAll("[data-method]").forEach((button) => {
  button.addEventListener("click", () => {
    state.paymentMethod = button.getAttribute("data-method")
    renderPayment()
  })
})

function openSale(sale) {
  if (!sale || !saleModalEl || !saleModalBodyEl) return
  saleModalBodyEl.innerHTML = renderSaleDetail(sale, money, {
    allowCancel: marketplaceReady && isMarketplaceSale(sale)
  })
  saleModalEl.hidden = false
  saleModalEl.querySelector(".sale-modal-close")?.focus()
}

function closeSale() {
  if (!saleModalEl) return
  saleModalEl.hidden = true
  saleModalBodyEl.innerHTML = ""
}

async function cancelMarketplaceOrder(orderId) {
  if (!marketplaceReady) return
  const built = cancelMarketplaceOrderPayload(orderId)
  if (!built.ok) {
    setNote(homeMessageEl, built.error, "error")
    return
  }
  const ok = window.confirm(
    "Cancelar esta venda de marketplace e devolver as peças ao estoque? Esta ação não pode ser desfeita."
  )
  if (!ok) return
  const result = await cancelMarketplaceOrderApi(built.body)
  if (!result.ok) {
    setNote(homeMessageEl, result.error, "error")
    return
  }
  closeSale()
  setNote(homeMessageEl, "Venda cancelada e peças devolvidas ao estoque.", "success")
  await loadHome()
}

recentEl.addEventListener("click", (event) => {
  const row = event.target.closest("[data-sale-id]")
  if (!row) return
  const sale = state.recentSales.find((item) => String(item.id) === row.getAttribute("data-sale-id"))
  openSale(sale)
})

saleModalEl?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-sale]")) closeSale()
  const cancelBtn = event.target.closest("[data-cancel-order]")
  if (cancelBtn) cancelMarketplaceOrder(cancelBtn.getAttribute("data-cancel-order"))
})

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && saleModalEl && !saleModalEl.hidden) closeSale()
})

window.MarisUI.bindDebouncedSearch(pieceSearchEl, onPieceSearch, { debounceMs: 200 })
window.MarisUI.bindDebouncedSearch(customerSearchEl, onCustomerSearch, { debounceMs: 200 })

if (!shouldShowNewSale(NEW_SALE_ENABLED)) {
  window.location.replace("/vendedoras")
} else {
  document.body.hidden = false
  if (marketplaceSaleBtn) marketplaceSaleBtn.hidden = !marketplaceReady
  const profile = await window.MarisStaffAuth.loadProfile()
  if (!profile.ok) {
    setNote(homeMessageEl, profile.error || "Não foi possível confirmar seu acesso.", "error")
  } else {
    state.seller = profile.user
    if (sellerNameEl) sellerNameEl.textContent = profile.user.name || "Sua conta"
    if (!profile.user.seller_id) {
      newSaleBtn.disabled = true
      if (!marketplaceReady) {
        setNote(homeMessageEl, "Esta conta não está ligada a uma vendedora.", "error")
      }
    }
  }
  recentEl.innerHTML = renderRecentSales([], money)
  await Promise.all([loadHome(), loadCatalogPieces()])
}
