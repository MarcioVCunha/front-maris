const { createSupabaseClient, formatMoneyBRL, roundMoney } = window.MarisUtils
const sbClient = createSupabaseClient()

const sellerFilter = document.getElementById("seller-filter")
const cartsListEl = document.getElementById("carts-list")
const cartDetailEl = document.getElementById("cart-detail")
const buyerInfoEl = document.getElementById("buyer-info")
const cartItemsDetailEl = document.getElementById("cart-items-detail")
const paymentMethodSelect = document.getElementById("payment-method")
const saleTotalEl = document.getElementById("sale-total")
const submitSaleBtn = document.getElementById("submit-sale")
const saleMessageEl = document.getElementById("sale-message")

let carts = []
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

async function loadSellers() {
  const { data } = await sbClient.from("sellers").select("id, name").eq("is_active", true).order("name")
  const saved = localStorage.getItem("maris_seller_filter")
  sellerFilter.innerHTML =
    '<option value="all">Todas as vendedoras</option>' +
    '<option value="none">Sem vendedora</option>' +
    (data || [])
    .map((s) => `<option value="${s.id}" ${String(s.id) === saved ? "selected" : ""}>${s.name}</option>`)
    .join("")
  if (saved) {
    const hasSaved =
      saved === "all" ||
      saved === "none" ||
      (data || []).some((s) => String(s.id) === saved)
    sellerFilter.value = hasSaved ? saved : "all"
  } else {
    sellerFilter.value = "all"
  }
}

async function loadCarts() {
  const selected = sellerFilter.value || "all"
  localStorage.setItem("maris_seller_filter", selected)
  cartsListEl.innerHTML = "Carregando…"
  cartDetailEl.hidden = true

  const url = selected === "all"
    ? window.ENV.SUPABASE_LIST_SHARED_CARTS_URL
    : `${window.ENV.SUPABASE_LIST_SHARED_CARTS_URL}?seller_id=${encodeURIComponent(selected)}`
  const res = await fetch(url, { headers: staffHeaders() })
  const data = await res.json()

  if (!res.ok) {
    cartsListEl.innerHTML = `<p class="message error">${data.error || "Erro ao carregar."}</p>`
    return
  }

  carts = data.carts || []
  if (!carts.length) {
    cartsListEl.innerHTML = "<p>Nenhum carrinho compartilhado no momento.</p>"
    return
  }

  cartsListEl.innerHTML = carts
    .map(
      (cart) => `
    <article class="cart-card" data-cart-id="${cart.id}">
      <h3>${cart.buyer.full_name || "Cliente"}</h3>
      <p>${cart.piece_count} peça(s) · ${formatMoneyBRL(cart.estimated_total)}</p>
      <p class="cart-date">${new Date(cart.shared_at).toLocaleString("pt-BR")}</p>
    </article>
  `
    )
    .join("")
}

function openCartDetail(cartId) {
  activeCart = carts.find((c) => c.id === cartId)
  if (!activeCart) return

  const b = activeCart.buyer
  const wa = b.whatsapp ? b.whatsapp.replace(/\D/g, "") : ""
  buyerInfoEl.innerHTML = `
    <p><strong>${b.full_name || "—"}</strong></p>
    <p>E-mail: ${b.email || "—"}</p>
    <p>WhatsApp: ${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">${b.whatsapp}</a>` : "—"}</p>
  `

  selectedLines = activeCart.items.map((item) => ({ ...item, checked: true }))
  renderCartItemsDetail()
  cartDetailEl.hidden = false
  updateSaleTotal()
}

function renderCartItemsDetail() {
  cartItemsDetailEl.innerHTML = selectedLines
    .map(
      (line, idx) => `
    <div class="cart-item-row">
      <input type="checkbox" data-idx="${idx}" ${line.checked ? "checked" : ""}>
      <div>
        <strong>${line.product_name}</strong><br>
        <span>${line.display_code || line.product_code || ""} · x${line.quantity} · ${formatMoneyBRL(line.total_value)}</span>
      </div>
    </div>
  `
    )
    .join("")
}

cartItemsDetailEl.addEventListener("change", (e) => {
  const input = e.target.closest('input[type="checkbox"]')
  if (!input) return
  const idx = Number(input.dataset.idx)
  selectedLines[idx].checked = input.checked
  updateSaleTotal()
})

paymentMethodSelect.addEventListener("change", updateSaleTotal)

cartsListEl.addEventListener("click", (e) => {
  const card = e.target.closest("[data-cart-id]")
  if (!card) return
  openCartDetail(card.getAttribute("data-cart-id"))
})

submitSaleBtn.addEventListener("click", async () => {
  if (!activeCart) return
  const selectedSeller = sellerFilter.value
  let sellerId = Number(selectedSeller)
  if (!Number.isFinite(sellerId) || sellerId <= 0) {
    sellerId = Number(activeCart.seller_id) || 0
  }
  if (sellerId <= 0) {
    setSaleMessage("Selecione uma vendedora específica para registrar a venda.", "error")
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
    if (line.component_id) {
      component_items.push({ component_id: line.component_id, quantity: line.quantity })
    } else if (line.product_code) {
      items.push({ code: line.product_code, quantity: line.quantity })
    }
  }

  if (!items.length && !component_items.length) {
    setSaleMessage("Marque pelo menos um item.", "error")
    return
  }

  submitSaleBtn.disabled = true
  setSaleMessage("Registrando…")

  try {
    const res = await fetch(window.ENV.SUPABASE_SALES_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_id: sellerId, payment_method: payment, items, component_items })
    })
    const data = await res.json()
    if (!res.ok) {
      setSaleMessage(data.error || "Erro ao registrar venda.", "error")
      return
    }

    await fetch(window.ENV.SUPABASE_MARK_CART_CONVERTED_URL, {
      method: "POST",
      headers: staffHeaders(),
      body: JSON.stringify({ cart_id: activeCart.id })
    })

    setSaleMessage("Venda registrada com sucesso!", "success")
    activeCart = null
    cartDetailEl.hidden = true
    loadCarts()
  } catch {
    setSaleMessage("Erro de conexão.", "error")
  } finally {
    submitSaleBtn.disabled = false
  }
})

document.getElementById("reload-carts").addEventListener("click", loadCarts)
sellerFilter.addEventListener("change", loadCarts)

;(async () => {
  await loadSellers()
  await loadCarts()
})()
