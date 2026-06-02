const { createSupabaseClient, formatMoneyBRL, onlyDigits } = window.MarisUtils
const supabase = createSupabaseClient()

const cartLinesEl = document.getElementById("cart-lines")
const cartTotalEl = document.getElementById("cart-total")
const buyerNameEl = document.getElementById("buyer-name")
const buyerWhatsappEl = document.getElementById("buyer-whatsapp")
const buyerEmailEl = document.getElementById("buyer-email")
const sellerSelectEl = document.getElementById("seller-select")
const checkStockBtn = document.getElementById("check-stock-btn")
const shareCartBtn = document.getElementById("share-cart-btn")
const stockIssuesEl = document.getElementById("stock-issues")
const messageEl = document.getElementById("cart-page-message")

let sellers = []

function setMessage(text, type = "") {
  messageEl.hidden = !text
  messageEl.textContent = text || ""
  messageEl.className = `cart-page-message ${type}`.trim()
}

function getBuyerPayload() {
  const name = String(buyerNameEl.value || "").trim()
  const whatsapp = onlyDigits(buyerWhatsappEl.value || "")
  const email = String(buyerEmailEl.value || "").trim()
  if (!name || whatsapp.length < 10) return null
  return { name, whatsapp, email }
}

function saveBuyer() {
  const payload = getBuyerPayload()
  if (!payload) return false
  window.MarisCatalogCart.saveBuyerProfile(payload)
  return true
}

function renderCart() {
  const lines = window.MarisCatalogCart.getLineDetails()
  if (!lines.length) {
    cartLinesEl.innerHTML = "<p class=\"cart-help\">Sua cesta está vazia. Volte ao catálogo para adicionar produtos.</p>"
    cartTotalEl.textContent = formatMoneyBRL(0)
    shareCartBtn.disabled = true
    checkStockBtn.disabled = true
    return
  }

  shareCartBtn.disabled = false
  checkStockBtn.disabled = false
  let total = 0
  cartLinesEl.innerHTML = lines.map((line) => {
    total += line.total
    return `
      <article class="cart-line" data-key="${line.key}">
        <div>
          <p class="cart-line-name">${line.name}</p>
          <p class="cart-line-code">${line.code} · ${formatMoneyBRL(line.total)}</p>
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
  const [productsRes, componentsRes] = await Promise.all([
    supabase.from("products").select("code, name, unit_price"),
    supabase.from("product_components").select("id, product_code, name, unit_price").eq("is_active", true)
  ])
  window.MarisCatalogCart.setCatalogData({
    products: productsRes.data || [],
    components: componentsRes.data || []
  })
}

async function loadSellers() {
  const { data } = await supabase.from("sellers").select("id, name").eq("is_active", true).order("name")
  sellers = data || []
  sellerSelectEl.innerHTML = '<option value="">Selecione</option>' + sellers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")
}

function getSharePayload() {
  const buyer = getBuyerPayload()
  if (!buyer) return { error: "Preencha nome e WhatsApp válidos." }
  const sellerId = Number(sellerSelectEl.value)
  if (!sellerId) return { error: "Selecione uma vendedora." }
  const lines = window.MarisCatalogCart.getItems().map((line) => ({
    product_code: line.product_code || null,
    component_id: line.component_id || null,
    quantity: Number(line.quantity) || 0
  }))
  if (!lines.length) return { error: "Sua cesta está vazia." }
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
  const res = await fetch(window.ENV.SUPABASE_CART_SHARE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...parsed.payload, dry_run: true })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    setMessage(data.error || "Não foi possível validar o estoque.", "error")
    return
  }
  const issues = data.stock_issues || []
  if (!issues.length) {
    stockIssuesEl.hidden = true
    stockIssuesEl.innerHTML = ""
    setMessage("Estoque validado. Você já pode compartilhar.", "success")
    return
  }
  stockIssuesEl.hidden = false
  stockIssuesEl.innerHTML = issues.map((issue) => {
    if (issue.reason === "out_of_stock") {
      return `<li><strong>${issue.product_name}</strong> (${issue.product_code}) — sem estoque</li>`
    }
    return `<li><strong>${issue.product_name}</strong> — pedido ${issue.requested}, disponível ${issue.available}</li>`
  }).join("")
  setMessage("Alguns itens têm estoque limitado. Você ainda pode compartilhar para a vendedora ajustar.", "error")
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
    const res = await fetch(window.ENV.SUPABASE_CART_SHARE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.payload)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setMessage(data.error || "Não foi possível compartilhar o carrinho.", "error")
      return
    }
    window.MarisCatalogCart.clear()
    renderCart()
    stockIssuesEl.hidden = true
    stockIssuesEl.innerHTML = ""
    setMessage("Carrinho compartilhado com sucesso. A vendedora entrará em contato.", "success")
  } finally {
    shareCartBtn.disabled = false
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
  if (action === "plus") window.MarisCatalogCart.setQuantityByKey(key, line.quantity + 1)
  if (action === "minus") window.MarisCatalogCart.setQuantityByKey(key, line.quantity - 1)
  renderCart()
})

buyerNameEl.addEventListener("blur", saveBuyer)
buyerWhatsappEl.addEventListener("blur", saveBuyer)
buyerEmailEl.addEventListener("blur", saveBuyer)
checkStockBtn.addEventListener("click", checkStock)
shareCartBtn.addEventListener("click", shareCart)

window.addEventListener("maris-cart-updated", renderCart)

;(async () => {
  await window.MarisCatalogCart.init()
  await loadCatalogData()
  await loadSellers()
  const buyer = window.MarisCatalogCart.getBuyerProfile()
  if (buyer) {
    buyerNameEl.value = buyer.name || ""
    buyerWhatsappEl.value = buyer.whatsapp || ""
    buyerEmailEl.value = buyer.email || ""
  }
  renderCart()
})()
