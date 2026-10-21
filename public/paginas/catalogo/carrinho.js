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
const cartSubtotalEl = document.getElementById("cart-subtotal")
const cartCouponRowEl = document.getElementById("cart-coupon-row")
const cartCouponLabelEl = document.getElementById("cart-coupon-label")
const cartCouponDiscountEl = document.getElementById("cart-coupon-discount")
const couponCodeInputEl = document.getElementById("coupon-code-input")
const applyCouponBtn = document.getElementById("apply-coupon-btn")
const couponFeedbackEl = document.getElementById("coupon-feedback")
const websiteEl = document.getElementById("buyer-website")
const payInfinitePayBtn = document.getElementById("pay-infinitepay-btn")
const orderPayMessageEl = document.getElementById("order-pay-message")
const checkoutPayMessageEl = document.getElementById("checkout-pay-message")
let pendingRequestId = null
let orderConfirmed = false
let appliedCoupon = null
let confirmedOrder = null
let payingInProgress = false

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
  const remember = Boolean(document.getElementById("buyer-remember")?.checked)
  window.MarisCatalogCart.saveBuyerProfile(payload, { remember })
  return true
}

function forgetBuyer() {
  window.MarisCatalogCart.forgetBuyerProfile?.()
  if (buyerNameEl) buyerNameEl.value = ""
  if (buyerWhatsappEl) buyerWhatsappEl.value = ""
  const rememberEl = document.getElementById("buyer-remember")
  if (rememberEl) rememberEl.checked = false
}

function formatWhatsappMask(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function showCartLoading() {
  if (!cartLinesEl) return
  cartLinesEl.classList.add("cart-lines--loading")
  if (window.MarisLoading?.skeletonCartLines) {
    cartLinesEl.innerHTML = window.MarisLoading.skeletonCartLines(3)
  } else if (window.MarisLoading?.html) {
    cartLinesEl.innerHTML = window.MarisLoading.html({ size: "md", block: true })
  } else {
    cartLinesEl.innerHTML = `<div class="maris-loading maris-loading--md" role="status" aria-label="Carregando"></div>`
  }
}

function setCouponFeedback(text, type = "") {
  if (!couponFeedbackEl) return
  if (!text) {
    couponFeedbackEl.hidden = true
    couponFeedbackEl.textContent = ""
    couponFeedbackEl.className = "coupon-feedback"
    return
  }
  couponFeedbackEl.hidden = false
  couponFeedbackEl.textContent = text
  couponFeedbackEl.className = `coupon-feedback ${type}`.trim()
}

function renderCart() {
  if (orderConfirmed) return
  cartLinesEl?.classList.remove("cart-lines--loading")
  const lines = window.MarisCatalogCart.getLineDetails()
  if (!lines.length) {
    cartLinesEl.innerHTML = "<p class=\"cart-help\">Sua cesta está vazia. Volte ao catálogo para adicionar produtos.</p>"
    if (cartSubtotalEl) cartSubtotalEl.textContent = formatMoneyBRL(0)
    if (cartCouponRowEl) cartCouponRowEl.hidden = true
    cartTotalEl.textContent = formatMoneyBRL(0)
    if (cartPixEl) cartPixEl.textContent = formatMoneyBRL(0)
    if (placeOrderBtn) placeOrderBtn.disabled = true
    if (checkStockBtn) checkStockBtn.disabled = true
    appliedCoupon = null
    setCouponFeedback("")
    setActiveStep(1)
    return
  }

  if (placeOrderBtn) placeOrderBtn.disabled = false
  if (checkStockBtn) checkStockBtn.disabled = false
  setActiveStep(2)
  let subtotal = 0
  let eligibleSubtotal = 0
  cartLinesEl.innerHTML = lines.map((line) => {
    subtotal += line.total
    if (!line.onSale) {
      eligibleSubtotal += line.total
    }
    const priceLabel = line.onSale
      ? window.MarisUI.renderPricePair(line.originalPrice * line.quantity, line.total)
      : formatMoneyBRL(line.total)
    return window.MarisPedido.renderCartLineHtml(line, priceLabel)
  }).join("")

  if (cartSubtotalEl) {
    cartSubtotalEl.textContent = formatMoneyBRL(subtotal)
  }

  let couponDiscount = 0
  if (appliedCoupon && appliedCoupon.details) {
    const coup = appliedCoupon.details
    if (coup.min_order_value > 0 && subtotal < coup.min_order_value) {
      setCouponFeedback(`Pedido mínimo de ${formatMoneyBRL(coup.min_order_value)} para este cupom.`, "error")
    } else if (eligibleSubtotal <= 0) {
      setCouponFeedback("O cupom não acumula com itens já em promoção.", "error")
    } else {
      if (coup.discount_type === "percent") {
        couponDiscount = Math.round((eligibleSubtotal * Number(coup.discount_value) / 100) * 100) / 100
      } else {
        couponDiscount = Math.min(eligibleSubtotal, Number(coup.discount_value))
      }
    }
  }

  if (couponDiscount > 0 && appliedCoupon) {
    if (cartCouponRowEl) cartCouponRowEl.hidden = false
    if (cartCouponLabelEl) cartCouponLabelEl.textContent = `Cupom (${appliedCoupon.code})`
    if (cartCouponDiscountEl) cartCouponDiscountEl.textContent = `-${formatMoneyBRL(couponDiscount)}`
  } else {
    if (cartCouponRowEl) cartCouponRowEl.hidden = true
  }

  const finalTotal = Math.max(0, subtotal - couponDiscount)
  const pixTotal = Math.round(finalTotal * 0.95 * 100) / 100
  cartTotalEl.textContent = formatMoneyBRL(finalTotal)
  if (cartPixEl) cartPixEl.textContent = formatMoneyBRL(pixTotal)
}

async function handleApplyCoupon() {
  const code = String(couponCodeInputEl?.value || "").trim().toUpperCase()
  if (!code) {
    appliedCoupon = null
    setCouponFeedback("")
    renderCart()
    return
  }
  if (applyCouponBtn) applyCouponBtn.disabled = true
  setCouponFeedback("Validando cupom...")
  try {
    const rawWhatsapp = buyerWhatsappEl?.value || ""
    const result = await window.MarisPedido.submitValidateCoupon(callCreateOrder, {
      code,
      whatsapp: rawWhatsapp,
      items: window.MarisCatalogCart.getItems()
    })
    if (!result.ok) {
      appliedCoupon = null
      setCouponFeedback(result.error, "error")
      renderCart()
      return
    }
    appliedCoupon = {
      code: result.data.code,
      details: {
        id: result.data.coupon_id,
        code: result.data.code,
        discount_type: result.data.discount_type,
        discount_value: result.data.value,
        discount_amount: result.data.discount_amount,
        is_referral: Boolean(result.data.is_referral),
        referrer_name: result.data.referrer_name,
        expires_at: result.data.expires_at || result.data.ends_at || null
      }
    }
    const discountFormatted = formatMoneyBRL(result.data.discount_amount)
    const referralMsg = result.data.is_referral && result.data.referrer_name
      ? ` Indicação de ${result.data.referrer_name}!`
      : ""
    const validityRaw = result.data.expires_at || result.data.ends_at
    const validityMsg = validityRaw && window.MarisLojaInfo?.formatValidityUntil
      ? ` Válido ${window.MarisLojaInfo.formatValidityUntil(validityRaw)}.`
      : ""
    setCouponFeedback(`Cupom ${appliedCoupon.code} aplicado! Economia de ${discountFormatted}.${referralMsg}${validityMsg}`, "success")
    renderCart()
  } catch (_err) {
    appliedCoupon = null
    setCouponFeedback("Erro ao validar cupom.", "error")
    renderCart()
  } finally {
    if (applyCouponBtn) applyCouponBtn.disabled = false
  }
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

function setPayMessage(text, type = "", target = orderPayMessageEl) {
  window.MarisUI.setFeedback(target, text, type, { baseClass: "cart-page-message" })
}

function renderOrderConfirmation(order) {
  orderConfirmed = true
  confirmedOrder = order
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
  const orderSubtotalRow = document.getElementById("order-subtotal-row")
  const orderSubtotalEl = document.getElementById("order-subtotal")
  const orderCouponRow = document.getElementById("order-coupon-row")
  const orderCouponLabel = document.getElementById("order-coupon-label")
  const orderCouponDiscount = document.getElementById("order-coupon-discount")
  if (order.couponDiscount && order.couponDiscount > 0) {
    if (orderSubtotalRow) {
      orderSubtotalRow.hidden = false
      if (orderSubtotalEl) orderSubtotalEl.textContent = formatMoneyBRL(order.subtotal)
    }
    if (orderCouponRow) {
      orderCouponRow.hidden = false
      if (orderCouponLabel) orderCouponLabel.textContent = order.couponCode ? `Cupom (${order.couponCode})` : "Cupom de desconto"
      if (orderCouponDiscount) orderCouponDiscount.textContent = `-${formatMoneyBRL(order.couponDiscount)}`
    }
  } else {
    if (orderSubtotalRow) orderSubtotalRow.hidden = true
    if (orderCouponRow) orderCouponRow.hidden = true
  }
  if (totalEl) totalEl.textContent = order.total == null ? "—" : formatMoneyBRL(order.total)
  if (pixEl) pixEl.textContent = order.totalPix == null ? "—" : formatMoneyBRL(order.totalPix)
  setPayMessage("")
  if (payInfinitePayBtn) payInfinitePayBtn.disabled = !order.orderId
  setActiveStep(3)
}

async function startInfinitePay(messageTarget = orderPayMessageEl) {
  setPayMessage("", "", messageTarget)
  if (!confirmedOrder?.orderId || !window.MarisPagamento) {
    setPayMessage("Pedido inválido para pagamento.", "error", messageTarget)
    return false
  }
  if (payInfinitePayBtn) payInfinitePayBtn.disabled = true
  if (placeOrderBtn) placeOrderBtn.disabled = true
  setPayMessage("Abrindo o pagamento…", "", messageTarget)
  try {
    const redirectUrl = window.MarisPagamento.buildObrigadoUrl(window.location.origin, confirmedOrder.orderId)
    const result = await window.MarisPagamento.submitPaymentCreateLink(callCreateOrder, {
      orderId: confirmedOrder.orderId,
      redirectUrl
    })
    if (result.kind !== "ready") {
      setPayMessage(result.error || "Não foi possível abrir o pagamento. Tente de novo.", "error", messageTarget)
      if (payInfinitePayBtn) payInfinitePayBtn.disabled = false
      return false
    }
    window.location.assign(result.checkoutUrl)
    return true
  } catch (_err) {
    setPayMessage("Não foi possível abrir o pagamento. Tente de novo.", "error", messageTarget)
    if (payInfinitePayBtn) payInfinitePayBtn.disabled = false
    return false
  }
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

async function placeOrder(dryRun, { afterConfirm = "none" } = {}) {
  setMessage("")
  setPayMessage("", "", checkoutPayMessageEl)
  if (!pendingRequestId) pendingRequestId = window.MarisPedido.newClientRequestId()
  const button = dryRun ? checkStockBtn : placeOrderBtn
  if (button) button.disabled = true
  try {
    const result = await window.MarisPedido.submitCreateOrder(callCreateOrder, {
      clientRequestId: pendingRequestId,
      name: buyerNameEl?.value || "",
      whatsapp: buyerWhatsappEl?.value || "",
      sellerId: sellerSelectEl?.value || "",
      couponCode: appliedCoupon?.code || "",
      items: window.MarisCatalogCart.getItems(),
      dryRun,
      website: websiteEl?.value || ""
    })
    if (result.kind === "disabled") return
    if (result.kind === "error") {
      setMessage(result.error, "error")
      setPayMessage(result.error, "error", checkoutPayMessageEl)
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
      appliedCoupon = null
      if (couponCodeInputEl) couponCodeInputEl.value = ""
      setCouponFeedback("")
      window.MarisCatalogCart.clear()
      setMessage("")
      if (afterConfirm === "pay") {
        confirmedOrder = result.order
        orderConfirmed = true
        payingInProgress = true
        const ok = await startInfinitePay(checkoutPayMessageEl)
        payingInProgress = false
        if (!ok) renderOrderConfirmation(result.order)
        return
      }
      renderOrderConfirmation(result.order)
    }
  } finally {
    if (payingInProgress) return
    if (!button || orderConfirmed) return
    const hasItems = Boolean(window.MarisCatalogCart.getItems().length)
    if (placeOrderBtn) placeOrderBtn.disabled = !hasItems
    if (checkStockBtn) checkStockBtn.disabled = !hasItems
  }
}

function checkStock() {
  return placeOrder(true)
}

function submitPay() {
  return placeOrder(false, { afterConfirm: "pay" })
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

if (applyCouponBtn) applyCouponBtn.addEventListener("click", handleApplyCoupon)
if (couponCodeInputEl) {
  couponCodeInputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleApplyCoupon()
    }
  })
}

if (buyerNameEl) buyerNameEl.addEventListener("blur", saveBuyer)
if (buyerWhatsappEl) {
  buyerWhatsappEl.addEventListener("input", () => {
    buyerWhatsappEl.value = formatWhatsappMask(buyerWhatsappEl.value)
  })
  buyerWhatsappEl.addEventListener("blur", saveBuyer)
}
if (checkStockBtn) checkStockBtn.addEventListener("click", checkStock)
if (placeOrderBtn) placeOrderBtn.addEventListener("click", submitPay)
if (payInfinitePayBtn) {
  payInfinitePayBtn.addEventListener("click", () => {
    void startInfinitePay(orderPayMessageEl)
  })
}

window.addEventListener("maris-cart-updated", renderCart)

const buyerRememberEl = document.getElementById("buyer-remember")
const buyerForgetEl = document.getElementById("buyer-forget")
if (buyerRememberEl) {
  buyerRememberEl.addEventListener("change", () => {
    if (!buyerRememberEl.checked) {
      window.MarisCatalogCart.forgetBuyerProfile?.()
      return
    }
    saveBuyer()
  })
}
if (buyerForgetEl) buyerForgetEl.addEventListener("click", forgetBuyer)

;(async () => {
  showCartLoading()
  try {
    window.MarisLojaInfo?.fillContactLinks?.(document)
    await window.MarisCatalogCart.init()
    await loadCatalogData()
    await loadSellers()
    if (buyerRememberEl) buyerRememberEl.checked = Boolean(window.MarisCatalogCart.isRememberEnabled?.())
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
