;(function () {
const { formatMoneyBRL, onlyDigits } = window.MarisUtils
const sbClient = window.MarisUtils.createSupabaseClient()

const cartLinesEl = document.getElementById("cart-lines")
const cartTotalEl = document.getElementById("cart-total")
const buyerNameEl = document.getElementById("buyer-name")
const buyerWhatsappEl = document.getElementById("buyer-whatsapp")
const buyerEmailEl = document.getElementById("buyer-email")
const sellerSelectEl = document.getElementById("seller-select")
const checkStockBtn = document.getElementById("check-stock-btn")
const shareCartBtn = document.getElementById("share-cart-btn")
const stockIssuesEl = document.getElementById("stock-issues")
const generateLinkBtn = document.getElementById("generate-link-btn")
const shareResultEl = document.getElementById("share-result")
const shareLinkInput = document.getElementById("share-link-input")
const copyLinkBtn = document.getElementById("copy-link-btn")
const shareWhatsappBtn = document.getElementById("share-whatsapp-btn")
const messageEl = document.getElementById("cart-page-message")
const stepEls = Array.from(document.querySelectorAll(".cart-step"))

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
  const email = String(buyerEmailEl?.value || "").trim()
  if (!name || whatsapp.length < 10) return null
  return { name, whatsapp, email }
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
  const lines = window.MarisCatalogCart.getLineDetails()
  if (!lines.length) {
    cartLinesEl.innerHTML = "<p class=\"cart-help\">Sua cesta est\u00e1 vazia. Volte ao cat\u00e1logo para adicionar produtos.</p>"
    cartTotalEl.textContent = formatMoneyBRL(0)
    if (generateLinkBtn) generateLinkBtn.disabled = true
    if (shareCartBtn) shareCartBtn.disabled = true
    if (checkStockBtn) checkStockBtn.disabled = true
    setActiveStep(1)
    return
  }

  if (generateLinkBtn) generateLinkBtn.disabled = false
  if (shareCartBtn) shareCartBtn.disabled = false
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
  cartTotalEl.textContent = formatMoneyBRL(total)
}

async function loadCatalogData() {
  const [productsRes, componentsRes, imagesRes] = await Promise.all([
    sbClient.from("products").select("id, code, name, unit_price, quantity, image_url, is_on_sale, discount_percent"),
    sbClient.from("product_components").select("id, product_code, name, unit_price, quantity, is_on_sale, discount_percent").eq("is_active", true),
    sbClient.from("product_images").select("product_id, image_url, sort_order").order("sort_order", { ascending: true })
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
    components: componentsRes.data || [],
    imagesByCode
  })
}

async function loadSellers() {
  if (!sellerSelectEl) return
  const { data } = await sbClient.from("sellers").select("id, name").eq("is_active", true).order("name")
  sellerSelectEl.innerHTML = '<option value="">Selecione</option>' + (data || []).map((s) => `<option value="${window.MarisUI.escapeHtml(s.id)}">${window.MarisUI.escapeHtml(s.name)}</option>`).join("")
}

function getSharePayload() {
  const buyer = getBuyerPayload()
  if (!buyer) return { error: "Preencha nome e WhatsApp v\u00e1lidos." }
  const sellerId = Number(sellerSelectEl?.value)
  if (!sellerId) return { error: "Selecione uma vendedora." }
  const lines = window.MarisCatalogCart.getItems().map((line) => ({
    product_code: line.product_code || null,
    component_id: line.component_id || null,
    quantity: Number(line.quantity) || 0,
    unit_price: Number(line.unit_price) || undefined
  }))
  if (!lines.length) return { error: "Sua cesta est\u00e1 vazia." }
  return {
    payload: {
      buyer_name: buyer.name,
      buyer_whatsapp: buyer.whatsapp,
      buyer_email: buyer.email,
      seller_id: sellerId,
      lines
    }
  }
}

async function checkStock() {
  setMessage("")
  const parsed = getSharePayload()
  if (parsed.error) {
    setMessage(parsed.error, "error")
    return
  }
  saveBuyer()
  const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("customer-cart-share"), {
    body: { ...parsed.payload, dry_run: true }
  })
  if (!ok) {
    setMessage(data.error || "N\u00e3o foi poss\u00edvel validar o estoque.", "error")
    return
  }
  const issues = data.stock_issues || []
  if (!issues.length) {
    stockIssuesEl.hidden = true
    stockIssuesEl.innerHTML = ""
    setMessage("Estoque validado. Voc\u00ea j\u00e1 pode compartilhar.", "success")
    setActiveStep(3)
    return
  }
  stockIssuesEl.hidden = false
  stockIssuesEl.innerHTML = issues.map((issue) => {
    if (issue.reason === "out_of_stock") {
      return `<li><strong>${issue.product_name}</strong> (${issue.product_code}) \u2014 sem estoque</li>`
    }
    return `<li><strong>${issue.product_name}</strong> \u2014 pedido ${issue.requested}, dispon\u00edvel ${issue.available}</li>`
  }).join("")
  setMessage("Alguns itens t\u00eam estoque limitado. Voc\u00ea ainda pode compartilhar para a vendedora ajustar.", "error")
}

async function shareCart() {
  setMessage("")
  const parsed = getSharePayload()
  if (parsed.error) {
    setMessage(parsed.error, "error")
    return
  }
  shareCartBtn.disabled = true
  try {
    saveBuyer()
    const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("customer-cart-share"), {
      body: parsed.payload
    })
    if (!ok) {
      setMessage(data.error || "N\u00e3o foi poss\u00edvel enviar a cesta.", "error")
      return
    }
    window.MarisCatalogCart.clear()
    renderCart()
    stockIssuesEl.hidden = true
    stockIssuesEl.innerHTML = ""
    hideShareResult()
    setMessage("Cesta enviada \u00e0 vendedora. Ela entrar\u00e1 em contato pelo WhatsApp.", "success")
    setActiveStep(3)
  } finally {
    shareCartBtn.disabled = false
  }
}

function hideShareResult() {
  if (!shareResultEl) return
  shareResultEl.hidden = true
  shareLinkInput.value = ""
}

function showShareResult(url) {
  shareLinkInput.value = url
  shareResultEl.hidden = false
  const text = `Ol\u00e1! Separei algumas pe\u00e7as da Maris Semijoias, d\u00ea uma olhada: ${url}`
  shareWhatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(text)}`
}

async function generateLink() {
  setMessage("")
  const items = window.MarisCatalogCart.getItems().map((line) => ({
    product_code: line.product_code || null,
    component_id: line.component_id || null,
    quantity: Number(line.quantity) || 0,
    unit_price: Number(line.unit_price) || undefined
  }))
  if (!items.length) {
    setMessage("Sua cesta est\u00e1 vazia.", "error")
    return
  }

  generateLinkBtn.disabled = true
  generateLinkBtn.textContent = "Gerando\u2026"
  try {
    const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("create-shared-basket"), {
      body: { items }
    })
    if (!ok || !data.id) {
      setMessage(data.error || "N\u00e3o foi poss\u00edvel gerar o link.", "error")
      return
    }
    const url = `${window.location.origin}/catalog/cesta?id=${encodeURIComponent(data.id)}`
    showShareResult(url)
    setMessage("Link gerado! Copie ou envie no WhatsApp.", "success")
    setActiveStep(3)
  } catch {
    setMessage("Erro de conex\u00e3o ao gerar o link.", "error")
  } finally {
    generateLinkBtn.disabled = false
    generateLinkBtn.textContent = "Gerar link para compartilhar"
  }
}

async function copyLink() {
  const url = shareLinkInput.value
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    setMessage("Link copiado!", "success")
  } catch {
    shareLinkInput.focus()
    shareLinkInput.select()
    setMessage("Selecione e copie o link manualmente.", "")
  }
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
  hideShareResult()
  renderCart()
})

if (buyerNameEl) buyerNameEl.addEventListener("blur", saveBuyer)
if (buyerWhatsappEl) {
  buyerWhatsappEl.addEventListener("input", () => {
    buyerWhatsappEl.value = formatWhatsappMask(buyerWhatsappEl.value)
  })
  buyerWhatsappEl.addEventListener("blur", saveBuyer)
}
if (buyerEmailEl) buyerEmailEl.addEventListener("blur", saveBuyer)
if (checkStockBtn) checkStockBtn.addEventListener("click", checkStock)
if (shareCartBtn) shareCartBtn.addEventListener("click", shareCart)
if (generateLinkBtn) generateLinkBtn.addEventListener("click", generateLink)
if (copyLinkBtn) copyLinkBtn.addEventListener("click", copyLink)

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
      buyerEmailEl.value = buyer.email || ""
    }
    renderCart()
  } catch (error) {
    console.error(error)
    renderCart()
    setMessage("N\u00e3o foi poss\u00edvel carregar a cesta. Atualize a p\u00e1gina.", "error")
  }
})()
})()
