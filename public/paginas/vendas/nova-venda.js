import {
  NEW_SALE_ENABLED,
  MARKETPLACE_SALE_ENABLED,
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
  isMarketplaceSale,
  monthCardFromSummary,
  newClientRequestId,
  renderRecentSales,
  renderSaleDetail,
  saleTotals,
  setPieceQuantity,
  shouldShowMarketplaceSale,
  shouldShowNewSale,
  togglePiece
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
  if (customerNameEl) customerNameEl.value = ""
  if (customerWhatsappEl) customerWhatsappEl.value = ""
  if (pieceSearchEl) pieceSearchEl.value = ""
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
    // pills 1–3 map to pieces/customer/payment; channel is extra before them
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
  if (current === "pieces") renderPieces()
}

function piecePhoto(piece) {
  const url = String(piece.image_url || "").trim()
  if (!url) {
    const letters = String(piece.code || piece.name || "?").slice(0, 2)
    return `<span class="piece-photo piece-photo--empty">${escapeHtml(letters)}</span>`
  }
  return `<img class="piece-photo" src="${escapeHtml(url)}" alt="">`
}

function renderSelected() {
  if (!state.selected.length) {
    selectedEl.innerHTML = ""
    return
  }
  selectedEl.innerHTML = state.selected.map((piece) => `
    <div class="selected-row">
      <span>${escapeHtml(piece.name)} · ${escapeHtml(piece.code)}</span>
      <span class="qty-control">
        <button type="button" class="qty-btn" data-qty="${escapeHtml(piece.id)}" data-dir="-1" aria-label="Diminuir">−</button>
        <strong>${piece.quantity}</strong>
        <button type="button" class="qty-btn" data-qty="${escapeHtml(piece.id)}" data-dir="1" aria-label="Aumentar">+</button>
      </span>
    </div>
  `).join("")
}

function renderPieces() {
  renderSelected()
  const visible = filterPieces(state.pieceHits, pieceSearchEl.value)
  if (!pieceSearchEl.value.trim()) {
    pieceResultsEl.innerHTML = `<p class="recent-empty">Digite um código ou um nome.</p>`
    return
  }
  if (!visible.length) {
    pieceResultsEl.innerHTML = `<p class="recent-empty">Nenhuma peça em estoque para essa busca.</p>`
    return
  }
  pieceResultsEl.innerHTML = visible.map((piece) => {
    const picked = state.selected.some((item) => String(item.id) === String(piece.id))
    const price = Number.isFinite(Number(piece.preco_efetivo)) ? piece.preco_efetivo : piece.unit_price
    const pix = Number.isFinite(Number(piece.preco_pix)) ? ` · Pix ${money(piece.preco_pix)}` : ""
    return `<button type="button" class="piece" data-piece="${escapeHtml(piece.id)}" aria-pressed="${picked ? "true" : "false"}">
      ${piecePhoto(piece)}
      <span class="piece-copy">
        <strong>${escapeHtml(piece.name)}</strong>
        <small>${escapeHtml(piece.code)} · ${escapeHtml(money(price))}${escapeHtml(pix)} · ${Number(piece.quantity) || 0} em estoque</small>
      </span>
    </button>`
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
    return `<button type="button" class="customer-hit" data-customer="${escapeHtml(customer.id)}" aria-pressed="${picked ? "true" : "false"}">
      <span>
        <strong>${escapeHtml(customer.name)}</strong>
        <small>${escapeHtml(formatWhatsapp(customer.whatsapp))}</small>
      </span>
    </button>`
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
  const query = pieceSearchEl.value.trim()
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
      setNote(flowMessageEl, "Escolha Shopee, Mercado Livre ou TikTok.", "error")
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

pieceResultsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-piece]")
  if (!button) return
  const piece = state.pieceHits.find((item) => String(item.id) === button.getAttribute("data-piece"))
  if (!piece) return
  state.selected = togglePiece(state.selected, piece)
  renderPieces()
})

selectedEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-qty]")
  if (!button) return
  const id = button.getAttribute("data-qty")
  const current = state.selected.find((item) => String(item.id) === String(id))
  if (!current) return
  const next = current.quantity + Number(button.getAttribute("data-dir"))
  if (next < 1) state.selected = togglePiece(state.selected, current)
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
  await loadHome()
}
