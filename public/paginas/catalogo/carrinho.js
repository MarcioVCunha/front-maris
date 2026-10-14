;(function () {
const { formatMoneyBRL, onlyDigits } = window.MarisUtils
const sbClient = window.MarisUtils.createSupabaseClient()

const cartLinesEl = document.getElementById("cart-lines")
const cartTotalEl = document.getElementById("cart-total")
const cartPixEl = document.getElementById("cart-pix")
const buyerNameEl = document.getElementById("buyer-name")
const buyerWhatsappEl = document.getElementById("buyer-whatsapp")
const sellerSelectEl = document.getElementById("seller-select")
const checkStockBtn = document.getElementById("check-stock-btn")
const placeOrderBtn = document.getElementById("place-order-btn")
const stockIssuesEl = document.getElementById("stock-issues")
const messageEl = document.getElementById("cart-page-message")
const stepEls = Array.from(document.querySelectorAll(".cart-step"))
const orderConfirmationEl = document.getElementById("order-confirmation")
const websiteEl = document.getElementById("buyer-website")
let pendingRequestId = null
let orderConfirmed = false

function setMessage(text, type = "") {
  window.MarisUI.setFeedback(messageEl, text, type, { baseClass: "cart-page-message" })
}

function setActiveStep(stepNumber) {
  stepEls.forEach((el, idx) => {
    const active = idx === stepNumber - 1
    el.classList.toggle("cart-step--active", active)
    if (active) el.setAttribute("aria-current", "step")
    else el.removeAttribute("aria-current")
  })
}

function getBuyerPayload() {
  const name = String(buyerNameEl?.value || "").trim()
  const whatsapp = onlyDigits(buyerWhatsappEl?.value || "")
  if (!name || whatsapp.length < 10) return null
  return { name, whatsapp, email: "" }
}

function saveBuyer() {
  const payload = getBuyerPayload()
  if (!payload) return false
  window.MarisCatalogCart.saveBuyerProfile(payload)
  return true
}

function formatWhatsappMask(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function renderCart() {
  if (orderConfirmed) return
  const lines = window.MarisCatalogCart.getLineDetails()
  if (!lines.length) {
    cartLinesEl.innerHTML = "<p class=\"cart-help\">Sua cesta est\u00e1 vazia. Volte ao cat\u00e1logo para adicionar produtos.</p>"
    cartTotalEl.textContent = formatMoneyBRL(0)
    if (cartPixEl) cartPixEl.textContent = formatMoneyBRL(0)
    if (placeOrderBtn) placeOrderBtn.disabled = true
    if (checkStockBtn) checkStockBtn.disabled = true
    setActiveStep(1)
    return
  }

  if (placeOrderBtn) placeOrderBtn.disabled = false
  if (checkStockBtn) checkStockBtn.disabled = false
  setActiveStep(2)
  let total = 0
  cartLinesEl.innerHTML = lines.map((line) => {
    total += line.total
    const stockLabel = line.available > 0 ? `${line.available} em estoque` : "Sem estoque"
    const priceLabel = line.onSale
      ? window.MarisUI.renderPricePair(line.originalPrice * line.quantity, line.total)
      : formatMoneyBRL(line.total)
    return `
      <article class="cart-line" data-key="${line.key}">
        <div class="cart-line-main">
          <img class="cart-line-image" src="${window.MarisUI.escapeHtml(line.image_url || "")}" alt="${window.MarisUI.escapeHtml(line.name)}">
          <div>
            <p class="cart-line-name">${window.MarisUI.escapeHtml(line.name)}</p>
            <p class="cart-line-code">${window.MarisUI.escapeHtml(line.code)} \u2014 ${priceLabel}</p>
            <p class="cart-line-stock">${stockLabel}</p>
          </div>
        </div>
        <div class="cart-line-actions">
          <button type="button" data-action="minus">-</button>
          <span>${line.quantity}</span>
          <button type="button" data-action="plus">+</button>
          <button type="button" data-action="remove" class="remove">Remover</button>
        </div>
      </article>
    `
  }).join("")
  const totals = window.MarisCatalogLogic?.cartMoneyTotals?.(window.MarisCatalogCart.getItems()) || { total, pixTotal: 0 }
  cartTotalEl.textContent = formatMoneyBRL(totals.total)
  if (cartPixEl) cartPixEl.textContent = formatMoneyBRL(totals.pixTotal)
}

async function loadCatalogData() {
  const [productsRes, componentsRes, imagesRes] = await Promise.all([
    window.MarisCatalogRead.selectProducts(sbClient),
    window.MarisCatalogRead.selectPricedComponents(sbClient),
    window.MarisCatalogRead.selectImages(sbClient).order("sort_order", { ascending: true })
  ])
  if (productsRes.error || componentsRes.error || imagesRes.error) {
    console.error(productsRes.error || componentsRes.error || imagesRes.error)
    throw new Error("Falha ao carregar o cat\u00e1logo.")
  }
  const imagesByCode = Object.create(null)
  const products = productsRes.data || []
  const images = imagesRes.data || []
  const codeById = Object.create(null)
  for (const product of products) {
    if (product?.id && product?.code) codeById[Number(product.id)] = String(product.code)
  }
  for (const row of images) {
    const code = codeById[Number(row.product_id)]
    const imageUrl = String(row.image_url || "").trim()
    if (code && imageUrl && !imagesByCode[code]) imagesByCode[code] = imageUrl
  }
  window.MarisCatalogCart.setCatalogData({
    products,
    components: window.MarisUtils.mapPricedComponents(componentsRes.data || []),
    imagesByCode
  })
}

async function loadSellers() {
  if (!sellerSelectEl) return
  const { data } = await window.MarisCatalogRead.selectActiveSellers(sbClient)
  sellerSelectEl.innerHTML = '<option value="">Sem vendedora</option>' + (data || []).map((s) => `<option value="${window.MarisUI.escapeHtml(s.id)}">${window.MarisUI.escapeHtml(s.name)}</option>`).join("")
}

function callCreateOrder(functionName, body) {
  return window.MarisApi.callFunction(window.ENV.fn(functionName), { body })
}

function renderOrderConfirmation(order) {
  orderConfirmed = true
  const itemsCard = document.querySelector(".cart-card--items")
  const checkout = document.querySelector(".cart-checkout-column")
  if (itemsCard) itemsCard.hidden = true
  if (checkout) checkout.hidden = true
  if (!orderConfirmationEl) return
  orderConfirmationEl.hidden = false
  const title = document.getElementById("order-title")
  const reservation = document.getElementById("order-reservation")
  const linesEl = document.getElementById("order-lines")
  const totalEl = document.getElementById("order-total")
  const pixEl = document.getElementById("order-pix")
  if (title) title.textContent = order.orderId ? `Pedido #${order.orderId}` : "Pedido"
  if (reservation) reservation.textContent = window.MarisPedido.reservationText(order.reservedUntil)
  if (linesEl) {
    linesEl.innerHTML = (order.items || []).map((item) => {
      const unit = item.unitPrice == null ? "—" : formatMoneyBRL(item.unitPrice)
      const line = item.lineTotal == null ? "—" : formatMoneyBRL(item.lineTotal)
      return `
        <article class="cart-line">
          <div>
            <p class="cart-line-name">${window.MarisUI.escapeHtml(item.name)}</p>
            <p class="cart-line-code">${window.MarisUI.escapeHtml(item.code)} · ${item.quantity} un. · ${unit}</p>
          </div>
          <div class="order-line-prices">
            <p class="cart-line-name">${line}</p>
          </div>
        </article>`
    }).join("")
  }
  if (totalEl) totalEl.textContent = order.total == null ? "—" : formatMoneyBRL(order.total)
  if (pixEl) pixEl.textContent = order.totalPix == null ? "—" : formatMoneyBRL(order.totalPix)
  setActiveStep(3)
}

function showStockIssues(result) {
  const lines = window.MarisCatalogCart.getLineDetails()
  const keys = window.MarisPedido.cartKeysForStockIssues(lines, result.stockIssues)
  for (const key of keys) window.MarisCatalogCart.removeByKey(key)
  pendingRequestId = null
  if (stockIssuesEl) {
    stockIssuesEl.hidden = false
    stockIssuesEl.innerHTML = (result.stockIssues || []).map((issue) => {
      return `<li>${window.MarisUI.escapeHtml(window.MarisPedido.stockIssueText(issue))}</li>`
    }).join("")
  }
  setMessage(result.error || "Algumas peças acabaram de esgotar.", "error")
  renderCart()
}

async function placeOrder(dryRun) {
  setMessage("")
  if (!pendingRequestId) pendingRequestId = window.MarisPedido.newClientRequestId()
  const button = dryRun ? checkStockBtn : placeOrderBtn
  if (button) button.disabled = true
  try {
    const result = await window.MarisPedido.submitCreateOrder(callCreateOrder, {
      clientRequestId: pendingRequestId,
      name: buyerNameEl?.value || "",
      whatsapp: buyerWhatsappEl?.value || "",
      sellerId: sellerSelectEl?.value || "",
      items: window.MarisCatalogCart.getItems(),
      dryRun,
      website: websiteEl?.value || ""
    })
    if (result.kind === "disabled") return
    if (result.kind === "error") {
      setMessage(result.error, "error")
      return
    }
    if (result.kind === "stock") {
      showStockIssues(result)
      return
    }
    if (result.kind === "available") {
      if (stockIssuesEl) {
        stockIssuesEl.hidden = true
        stockIssuesEl.innerHTML = ""
      }
      saveBuyer()
      setMessage("As peças ainda estão disponíveis.", "success")
      return
    }
    if (result.kind === "confirmed") {
      saveBuyer()
      pendingRequestId = null
      renderOrderConfirmation(result.order)
      window.MarisCatalogCart.clear()
      setMessage("")
    }
  } finally {
    if (!button || orderConfirmed) return
    button.disabled = !window.MarisCatalogCart.getItems().length
  }
}

function checkStock() {
  return placeOrder(true)
}

function submitOrder() {
  return placeOrder(false)
}

cartLinesEl.addEventListener("click", (event) => {
  const row = event.target.closest("[data-key]")
  if (!row) return
  const key = row.getAttribute("data-key")
  const action = event.target.getAttribute("data-action")
  const line = window.MarisCatalogCart.getLineDetails().find((item) => item.key === key)
  if (!line) return
  if (action === "remove") window.MarisCatalogCart.removeByKey(key)
  if (action === "plus") {
    const update = window.MarisCatalogCart.setQuantityByKey(key, line.quantity + 1)
    if (update?.clamped) setMessage(`Limite de estoque para esse item: ${update.available}.`, "error")
  }
  if (action === "minus") window.MarisCatalogCart.setQuantityByKey(key, line.quantity - 1)
  pendingRequestId = null
  renderCart()
})

if (buyerNameEl) buyerNameEl.addEventListener("blur", saveBuyer)
if (buyerWhatsappEl) {
  buyerWhatsappEl.addEventListener("input", () => {
    buyerWhatsappEl.value = formatWhatsappMask(buyerWhatsappEl.value)
  })
  buyerWhatsappEl.addEventListener("blur", saveBuyer)
}
if (checkStockBtn) checkStockBtn.addEventListener("click", checkStock)
if (placeOrderBtn) placeOrderBtn.addEventListener("click", submitOrder)

window.addEventListener("maris-cart-updated", renderCart)

;(async () => {
  try {
    await window.MarisCatalogCart.init()
    await loadCatalogData()
    await loadSellers()
    const buyer = window.MarisCatalogCart.getBuyerProfile()
    if (buyer && buyerNameEl) {
      buyerNameEl.value = buyer.name || ""
      buyerWhatsappEl.value = formatWhatsappMask(buyer.whatsapp || "")
    }
    renderCart()
  } catch (error) {
    console.error(error)
    renderCart()
    setMessage("N\u00e3o foi poss\u00edvel carregar a cesta. Atualize a p\u00e1gina.", "error")
  }
})()
})()
