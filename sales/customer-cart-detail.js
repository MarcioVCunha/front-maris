const { formatMoneyBRL, roundMoney } = window.MarisUtils

const cartMetaEl = document.getElementById("cart-meta")
const buyerInfoEl = document.getElementById("buyer-info")
const cartItemsDetailEl = document.getElementById("cart-items-detail")
const paymentMethodSelect = document.getElementById("payment-method")
const saleTotalEl = document.getElementById("sale-total")
const submitSaleBtn = document.getElementById("submit-sale")
const saleMessageEl = document.getElementById("sale-message")

const params = new URLSearchParams(window.location.search)
const cartId = String(params.get("cart_id") || "").trim()

let activeCart = null
let selectedLines = []

function staffHeaders() {
  return {
    "Content-Type": "application/json",
    ...window.MarisStaffAuth.authHeaders()
  }
}

function setSaleMessage(text, type = "") {
  saleMessageEl.textContent = text
  saleMessageEl.className = `message ${type}`.trim()
}

function updateSaleTotal() {
  const payment = paymentMethodSelect.value
  let subtotal = 0
  for (const line of selectedLines) {
    if (!line.checked) continue
    subtotal += line.total_value
  }
  const rounded = roundMoney(subtotal)
  const discount = payment === "pix" ? roundMoney(rounded * 0.05) : 0
  saleTotalEl.textContent = formatMoneyBRL(roundMoney(rounded - discount))
}

function renderItems() {
  cartItemsDetailEl.innerHTML = selectedLines
    .map((line, idx) => `
      <div class="cart-item-row">
        <input type="checkbox" data-idx="${idx}" ${line.checked ? "checked" : ""}>
        ${line.image_url ? `<img src="${line.image_url}" alt="${line.product_name}" class="cart-item-thumb">` : '<div class="cart-item-thumb"></div>'}
        <div class="cart-item-info">
          <strong>${line.product_name}</strong><br>
          <span>${line.display_code || line.product_code || ""} · x${line.quantity} · ${formatMoneyBRL(line.total_value)}</span>
        </div>
      </div>
    `)
    .join("")
}

async function loadCartDetail() {
  if (!cartId) {
    cartMetaEl.textContent = "Carrinho inválido."
    return
  }
  const url = `${window.ENV.SUPABASE_LIST_SHARED_CARTS_URL}?cart_id=${encodeURIComponent(cartId)}`
  const res = await fetch(url, { headers: staffHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.carts?.length) {
    cartMetaEl.textContent = data.error || "Carrinho não encontrado."
    return
  }

  activeCart = data.carts[0]
  cartMetaEl.textContent = `Compartilhado em ${new Date(activeCart.shared_at).toLocaleString("pt-BR")} · Vendedora: ${activeCart?.seller?.name || "Sem vendedora"}`
  const b = activeCart.buyer || {}
  const wa = b.whatsapp ? String(b.whatsapp).replace(/\D/g, "") : ""
  buyerInfoEl.innerHTML = `
    <p><strong>${b.full_name || "—"}</strong></p>
    <p>E-mail: ${b.email || "—"}</p>
    <p>WhatsApp: ${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">${b.whatsapp}</a>` : "—"}</p>
  `
  selectedLines = (activeCart.items || []).map((item) => ({ ...item, checked: true }))
  renderItems()
  updateSaleTotal()
}

cartItemsDetailEl.addEventListener("change", (event) => {
  const input = event.target.closest('input[type="checkbox"]')
  if (!input) return
  const idx = Number(input.dataset.idx)
  if (!Number.isInteger(idx) || !selectedLines[idx]) return
  selectedLines[idx].checked = input.checked
  updateSaleTotal()
})

paymentMethodSelect.addEventListener("change", updateSaleTotal)

submitSaleBtn.addEventListener("click", async () => {
  if (!activeCart) return
  const sellerId = Number(activeCart.seller_id) || 0
  if (sellerId <= 0) {
    setSaleMessage("Carrinho sem vendedora definida.", "error")
    return
  }
  const payment = paymentMethodSelect.value
  if (!payment) {
    setSaleMessage("Selecione o pagamento.", "error")
    return
  }

  const items = []
  const component_items = []
  for (const line of selectedLines) {
    if (!line.checked) continue
    if (line.component_id) component_items.push({ component_id: line.component_id, quantity: line.quantity })
    else if (line.product_code) items.push({ code: line.product_code, quantity: line.quantity })
  }
  if (!items.length && !component_items.length) {
    setSaleMessage("Marque pelo menos um item.", "error")
    return
  }

  submitSaleBtn.disabled = true
  setSaleMessage("Registrando…")
  try {
    const saleRes = await fetch(window.ENV.SUPABASE_SALES_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_id: sellerId, payment_method: payment, items, component_items })
    })
    const saleData = await saleRes.json().catch(() => ({}))
    if (!saleRes.ok) {
      setSaleMessage(saleData.error || "Erro ao registrar venda.", "error")
      return
    }

    await fetch(window.ENV.SUPABASE_MARK_CART_CONVERTED_URL, {
      method: "POST",
      headers: staffHeaders(),
      body: JSON.stringify({ cart_id: activeCart.id })
    })

    setSaleMessage("Venda registrada com sucesso!", "success")
  } catch {
    setSaleMessage("Erro de conexão.", "error")
  } finally {
    submitSaleBtn.disabled = false
  }
})

loadCartDetail()
