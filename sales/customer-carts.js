const { createSupabaseClient, formatMoneyBRL } = window.MarisUtils
const sbClient = createSupabaseClient()

const sellerFilter = document.getElementById("seller-filter")
const cartsListEl = document.getElementById("carts-list")

function staffHeaders() {
  return {
    "Content-Type": "application/json",
    ...window.MarisStaffAuth.authHeaders()
  }
}

async function loadSellers() {
  const { data } = await sbClient.from("sellers").select("id, name").eq("is_active", true).order("name")
  const saved = localStorage.getItem("maris_seller_filter")
  sellerFilter.innerHTML =
    '<option value="all">Todas as vendedoras</option>' +
    '<option value="none">Sem vendedora</option>' +
    (data || []).map((s) => `<option value="${s.id}">${s.name}</option>`).join("")

  if (saved) {
    const valid =
      saved === "all" ||
      saved === "none" ||
      (data || []).some((s) => String(s.id) === saved)
    sellerFilter.value = valid ? saved : "all"
  } else {
    sellerFilter.value = "all"
  }
}

function sellerLabel(cart) {
  if (cart?.seller?.name) return cart.seller.name
  if (Number(cart?.seller_id) > 0) return `Vendedora #${cart.seller_id}`
  return "Sem vendedora"
}

async function loadCarts() {
  const selected = sellerFilter.value || "all"
  localStorage.setItem("maris_seller_filter", selected)
  cartsListEl.innerHTML = "Carregando…"

  const url = selected === "all"
    ? window.ENV.SUPABASE_LIST_SHARED_CARTS_URL
    : `${window.ENV.SUPABASE_LIST_SHARED_CARTS_URL}?seller_id=${encodeURIComponent(selected)}`

  const res = await fetch(url, { headers: staffHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    cartsListEl.innerHTML = `<p class="message error">${data.error || "Erro ao carregar."}</p>`
    return
  }

  const carts = data.carts || []
  if (!carts.length) {
    cartsListEl.innerHTML = "<p>Nenhum carrinho compartilhado no momento.</p>"
    return
  }

  cartsListEl.innerHTML = carts
    .map((cart) => `
      <article class="cart-card" data-cart-id="${cart.id}">
        <h3>${cart.buyer.full_name || "Cliente"}</h3>
        <p>${cart.piece_count} peça(s) · ${formatMoneyBRL(cart.estimated_total)}</p>
        <p class="cart-seller">Vendedora: <strong>${sellerLabel(cart)}</strong></p>
        <p class="cart-date">${new Date(cart.shared_at).toLocaleString("pt-BR")}</p>
      </article>
    `)
    .join("")
}

cartsListEl.addEventListener("click", (event) => {
  const card = event.target.closest("[data-cart-id]")
  if (!card) return
  const cartId = card.getAttribute("data-cart-id")
  if (!cartId) return
  window.location.href = `/carrinho-cliente?cart_id=${encodeURIComponent(cartId)}`
})

document.getElementById("reload-carts").addEventListener("click", loadCarts)
sellerFilter.addEventListener("change", loadCarts)

;(async () => {
  await loadSellers()
  await loadCarts()
})()
