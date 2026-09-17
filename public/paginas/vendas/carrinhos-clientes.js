const { createSupabaseClient, formatMoneyBRL } = window.MarisUtils
const { sellerLabel, buildCartsListUrl } = window.MarisCustomerCartsLogic
const sbClient = createSupabaseClient()
const escapeHtml = (text) => window.MarisUI.escapeHtml(text)

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
    (data || []).map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join("")

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

async function loadCarts() {
  const selected = sellerFilter.value || "all"
  localStorage.setItem("maris_seller_filter", selected)
  cartsListEl.innerHTML = "Carregando…"

  const url = buildCartsListUrl(window.ENV.fn("list-shared-carts"), selected)

  const res = await fetch(url, { headers: staffHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    cartsListEl.innerHTML = `<p class="message error">${escapeHtml(data.error || "Erro ao carregar.")}</p>`
    return
  }

  const carts = data.carts || []
  if (!carts.length) {
    cartsListEl.innerHTML = "<p>Nenhum carrinho compartilhado no momento.</p>"
    return
  }

  cartsListEl.innerHTML = carts
    .map((cart) => `
      <article class="cart-card" data-cart-id="${escapeHtml(cart.id)}">
        <div class="cart-card-body">
          <h3>${escapeHtml(cart.buyer.full_name || "Cliente")}</h3>
          <p>${escapeHtml(cart.piece_count)} peça(s) · ${formatMoneyBRL(cart.estimated_total)}</p>
          <p class="cart-seller">Vendedora: <strong>${escapeHtml(sellerLabel(cart))}</strong></p>
          <p class="cart-date">${escapeHtml(new Date(cart.shared_at).toLocaleString("pt-BR"))}</p>
        </div>
        <div class="cart-card-actions">
          <button type="button" class="btn-discard-cart" data-discard-cart-id="${escapeHtml(cart.id)}">Excluir</button>
        </div>
      </article>
    `)
    .join("")
}

async function discardCart(cartId, triggerBtn) {
  if (!cartId) return
  const ok = window.confirm("Excluir este carrinho da lista? Essa ação não pode ser desfeita.")
  if (!ok) return

  if (triggerBtn) triggerBtn.disabled = true
  try {
    const res = await fetch(window.ENV.fn("discard-shared-cart"), {
      method: "POST",
      headers: staffHeaders(),
      body: JSON.stringify({ cart_id: cartId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      window.alert(data.error || "Não foi possível excluir o carrinho.")
      return
    }
    await loadCarts()
  } catch {
    window.alert("Não foi possível excluir o carrinho.")
  } finally {
    if (triggerBtn) triggerBtn.disabled = false
  }
}

cartsListEl.addEventListener("click", (event) => {
  const discardBtn = event.target instanceof Element
    ? event.target.closest(".btn-discard-cart")
    : null
  if (discardBtn) {
    event.preventDefault()
    event.stopPropagation()
    discardCart(discardBtn.getAttribute("data-discard-cart-id"), discardBtn)
    return
  }

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
