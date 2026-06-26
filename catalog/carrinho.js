;(function () {
const { formatMoneyBRL } = window.MarisUtils
const sbClient = window.MarisUtils.createSupabaseClient()

const cartLinesEl = document.getElementById("cart-lines")
const cartTotalEl = document.getElementById("cart-total")
const generateLinkBtn = document.getElementById("generate-link-btn")
const shareResultEl = document.getElementById("share-result")
const shareLinkInput = document.getElementById("share-link-input")
const copyLinkBtn = document.getElementById("copy-link-btn")
const shareWhatsappBtn = document.getElementById("share-whatsapp-btn")
const messageEl = document.getElementById("cart-page-message")
const stepEls = Array.from(document.querySelectorAll(".cart-step"))

function setMessage(text, type = "") {
  messageEl.hidden = !text
  messageEl.textContent = text || ""
  messageEl.className = `cart-page-message ${type}`.trim()
}

function setActiveStep(stepNumber) {
  stepEls.forEach((el, idx) => {
    if (idx === stepNumber - 1) el.classList.add("cart-step--active")
    else el.classList.remove("cart-step--active")
  })
}

function renderCart() {
  const lines = window.MarisCatalogCart.getLineDetails()
  if (!lines.length) {
    cartLinesEl.innerHTML = "<p class=\"cart-help\">Sua cesta está vazia. Volte ao catálogo para adicionar produtos.</p>"
    cartTotalEl.textContent = formatMoneyBRL(0)
    generateLinkBtn.disabled = true
    setActiveStep(1)
    return
  }

  generateLinkBtn.disabled = false
  setActiveStep(2)
  let total = 0
  cartLinesEl.innerHTML = lines.map((line) => {
    total += line.total
    const stockLabel = line.available > 0 ? `${line.available} em estoque` : "Sem estoque"
    const priceLabel = line.onSale
      ? `<span class="price-old">${formatMoneyBRL(line.originalPrice * line.quantity)}</span> <span class="price-now">${formatMoneyBRL(line.total)}</span>`
      : formatMoneyBRL(line.total)
    return `
      <article class="cart-line" data-key="${line.key}">
        <div class="cart-line-main">
          <img class="cart-line-image" src="${line.image_url || ""}" alt="${line.name}">
          <div>
            <p class="cart-line-name">${line.name}</p>
            <p class="cart-line-code">${line.code} · ${priceLabel}</p>
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

function hideShareResult() {
  shareResultEl.hidden = true
  shareLinkInput.value = ""
}

function showShareResult(url) {
  shareLinkInput.value = url
  shareResultEl.hidden = false
  const text = `Olá! Separei algumas peças da Maris Semijoias, dá uma olhada: ${url}`
  shareWhatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(text)}`
}

async function generateLink() {
  setMessage("")
  const items = window.MarisCatalogCart.getItems().map((line) => ({
    product_code: line.product_code || null,
    component_id: line.component_id || null,
    quantity: Number(line.quantity) || 0
  }))
  if (!items.length) {
    setMessage("Sua cesta está vazia.", "error")
    return
  }

  generateLinkBtn.disabled = true
  generateLinkBtn.textContent = "Gerando…"
  try {
    const res = await fetch(window.ENV.SUPABASE_CREATE_SHARED_BASKET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.id) {
      setMessage(data.error || "Não foi possível gerar o link.", "error")
      return
    }
    const url = `${window.location.origin}/catalog/cesta?id=${encodeURIComponent(data.id)}`
    showShareResult(url)
    setMessage("Link gerado! Copie ou envie no WhatsApp.", "success")
    setActiveStep(3)
  } catch {
    setMessage("Erro de conexão ao gerar o link.", "error")
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

generateLinkBtn.addEventListener("click", generateLink)
copyLinkBtn.addEventListener("click", copyLink)

window.addEventListener("maris-cart-updated", renderCart)

;(async () => {
  await window.MarisCatalogCart.init()
  await loadCatalogData()
  renderCart()
})()
})()
