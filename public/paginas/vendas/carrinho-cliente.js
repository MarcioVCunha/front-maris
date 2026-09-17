const { createSupabaseClient, formatMoneyBRL, roundMoney } = window.MarisUtils
const { computeCartSaleTotals, buildWhatsappSummary } = window.MarisCartDetailLogic
const sbClient = createSupabaseClient()
const escapeHtml = (text) => window.MarisUI.escapeHtml(text)

const cartMetaEl = document.getElementById("cart-meta")
const buyerInfoEl = document.getElementById("buyer-info")
const cartItemsDetailEl = document.getElementById("cart-items-detail")
const paymentMethodSelect = document.getElementById("payment-method")
const saleSubtotalEl = document.getElementById("sale-subtotal")
const saleDiscountRowEl = document.getElementById("sale-discount-row")
const saleDiscountEl = document.getElementById("sale-discount")
const saleTotalEl = document.getElementById("sale-total")
const submitSaleBtn = document.getElementById("submit-sale")
const saleMessageEl = document.getElementById("sale-message")

const params = new URLSearchParams(window.location.search)
const cartId = String(params.get("cart_id") || "").trim()

let activeCart = null
let selectedLines = []
let saleCompleted = false

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

function getSaleTotals() {
  return computeCartSaleTotals(selectedLines, paymentMethodSelect.value, roundMoney)
}

function updateSaleTotal() {
  const { subtotal, discount, total } = getSaleTotals()
  if (saleSubtotalEl) saleSubtotalEl.textContent = formatMoneyBRL(subtotal)
  if (saleDiscountEl) saleDiscountEl.textContent = formatMoneyBRL(discount)
  if (saleDiscountRowEl) {
    const isPix = paymentMethodSelect.value === "pix"
    saleDiscountRowEl.hidden = !isPix
  }
  saleTotalEl.textContent = formatMoneyBRL(total)
}

function renderItems() {
  cartItemsDetailEl.innerHTML = selectedLines
    .map((line, idx) => `
      <div class="cart-item-row">
        <input type="checkbox" data-idx="${idx}" ${line.checked ? "checked" : ""} ${saleCompleted ? "disabled" : ""}>
        ${line.image_url ? `<img src="${escapeHtml(line.image_url)}" alt="${escapeHtml(line.product_name)}" class="cart-item-thumb">` : '<div class="cart-item-thumb"></div>'}
        <div class="cart-item-info">
          <strong>${escapeHtml(line.product_name)}</strong><br>
          <span>${escapeHtml(line.display_code || line.product_code || "")} · x${escapeHtml(line.quantity)} · ${formatMoneyBRL(line.total_value)}</span>
        </div>
      </div>
    `)
    .join("")
}

function lockSaleUi() {
  saleCompleted = true
  submitSaleBtn.disabled = true
  paymentMethodSelect.disabled = true
  renderItems()
}

async function loadCartDetail() {
  if (!cartId) {
    cartMetaEl.textContent = "Carrinho inválido."
    submitSaleBtn.disabled = true
    return
  }
  const url = `${window.ENV.fn("list-shared-carts")}?cart_id=${encodeURIComponent(cartId)}`
  const res = await fetch(url, { headers: staffHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.carts?.length) {
    cartMetaEl.textContent = data.error || "Carrinho não encontrado."
    submitSaleBtn.disabled = true
    return
  }

  activeCart = data.carts[0]
  cartMetaEl.textContent = `Compartilhado em ${new Date(activeCart.shared_at).toLocaleString("pt-BR")} · Vendedora: ${activeCart?.seller?.name || "Sem vendedora"}`
  const b = activeCart.buyer || {}
  const wa = b.whatsapp ? String(b.whatsapp).replace(/\D/g, "") : ""
  buyerInfoEl.innerHTML = `
    <p><strong>${escapeHtml(b.full_name || "—")}</strong></p>
    <p>E-mail: ${escapeHtml(b.email || "—")}</p>
    <p>WhatsApp: ${wa ? `<a href="https://wa.me/${escapeHtml(wa)}" target="_blank" rel="noopener">${escapeHtml(b.whatsapp)}</a>` : "—"}</p>
  `
  selectedLines = (activeCart.items || []).map((item) => ({ ...item, checked: true }))
  renderItems()
  updateSaleTotal()
}

cartItemsDetailEl.addEventListener("change", (event) => {
  if (saleCompleted) return
  const input = event.target.closest('input[type="checkbox"]')
  if (!input) return
  const idx = Number(input.dataset.idx)
  if (!Number.isInteger(idx) || !selectedLines[idx]) return
  selectedLines[idx].checked = input.checked
  updateSaleTotal()
})

paymentMethodSelect.addEventListener("change", updateSaleTotal)

submitSaleBtn.addEventListener("click", async () => {
  if (!activeCart || saleCompleted) return
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
  let uncheckedCount = 0
  for (const line of selectedLines) {
    if (!line.checked) {
      uncheckedCount += 1
      continue
    }
    if (line.component_id) {
      component_items.push({
        component_id: line.component_id,
        quantity: line.quantity,
        unit_price: line.unit_price
      })
    } else if (line.product_code) {
      items.push({
        code: line.product_code,
        quantity: line.quantity,
        unit_price: line.unit_price
      })
    }
  }
  if (!items.length && !component_items.length) {
    setSaleMessage("Marque pelo menos um item.", "error")
    return
  }

  const totals = getSaleTotals()
  const soldCount = items.length + component_items.length
  const pixNote = payment === "pix" ? `\nDesconto Pix: ${formatMoneyBRL(totals.discount)}` : ""
  let confirmMsg =
    `Registrar venda de ${soldCount} item(ns)?\n` +
    `Subtotal: ${formatMoneyBRL(totals.subtotal)}${pixNote}\n` +
    `Total: ${formatMoneyBRL(totals.total)}`

  if (uncheckedCount > 0) {
    confirmMsg +=
      `\n\n${uncheckedCount} item(ns) desmarcado(s) NÃO serão vendidos agora ` +
      `e o carrinho permanecerá na lista para esses itens.`
  } else {
    confirmMsg += "\n\nO carrinho sairá da lista de compartilhados."
  }

  if (!window.confirm(confirmMsg)) return

  submitSaleBtn.disabled = true
  setSaleMessage("Registrando…")
  try {
    const saleRes = await fetch(window.ENV.fn("register-sale"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_id: sellerId, payment_method: payment, items, component_items })
    })
    const saleData = await saleRes.json().catch(() => ({}))
    if (!saleRes.ok) {
      setSaleMessage(saleData.error || "Erro ao registrar venda.", "error")
      submitSaleBtn.disabled = false
      return
    }

    // Só marca o carrinho inteiro como convertido quando todos os itens foram vendidos.
    if (uncheckedCount === 0) {
      const markRes = await fetch(window.ENV.fn("mark-cart-converted"), {
        method: "POST",
        headers: staffHeaders(),
        body: JSON.stringify({ cart_id: activeCart.id })
      })
      if (!markRes.ok) {
        const markData = await markRes.json().catch(() => ({}))
        setSaleMessage(
          markData.error ||
            "Venda registrada, mas o carrinho não saiu da lista. Atualize e confira.",
          "error"
        )
        lockSaleUi()
        return
      }
    }

    lockSaleUi()

    const checkedLines = selectedLines.filter((line) => line.checked)
    const phoneDigits = String(activeCart?.buyer?.whatsapp || "").replace(/\D/g, "")
    const whatsappText = buildWhatsappSummary({
      paymentMethod: payment,
      buyerName: activeCart?.buyer?.full_name || "",
      lines: checkedLines,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      formatMoneyBRL,
    })
    if (phoneDigits) {
      const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(whatsappText)}`
      window.open(waUrl, "_blank", "noopener")
      setSaleMessage(
        uncheckedCount > 0
          ? "Venda parcial registrada. Carrinho permanece na lista com os itens restantes. WhatsApp aberto."
          : "Venda registrada e conversa com a cliente aberta no WhatsApp!",
        "success"
      )
    } else {
      setSaleMessage(
        uncheckedCount > 0
          ? "Venda parcial registrada. Carrinho permanece na lista com os itens restantes."
          : "Venda registrada com sucesso! Não encontrei o WhatsApp da cliente para abrir conversa automática.",
        "success"
      )
    }
  } catch {
    setSaleMessage("Erro de conexão.", "error")
    submitSaleBtn.disabled = false
  }
})

loadCartDetail()
