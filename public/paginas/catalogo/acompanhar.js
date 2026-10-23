function tokenFromPath(pathname) {
  const parts = String(pathname || "").split("/").filter(Boolean)
  if (parts[0] !== "pedido" || !parts[1]) return ""
  try {
    return decodeURIComponent(parts[1])
  } catch {
    return parts[1]
  }
}

function showTracking(slot, data) {
  if (!slot || !window.MarisPagamento?.trackingNotice) return
  const notice = window.MarisPagamento.trackingNotice(data)
  slot.replaceChildren()
  if (!notice) {
    slot.hidden = true
    return
  }
  const link = document.createElement("a")
  link.className = "track-link"
  link.href = notice.url
  link.target = "_blank"
  link.rel = "noopener"
  link.textContent = notice.text
  slot.hidden = false
  slot.append(link)
}

function renderItems(items) {
  const slot = document.getElementById("track-items")
  if (!slot) return
  const rows = Array.isArray(items) ? items : []
  if (!rows.length) {
    slot.innerHTML = ""
    return
  }
  slot.innerHTML = rows.map((item) => `
    <article class="cart-line">
      <div>
        <p class="cart-line-name">${window.MarisUI.escapeHtml(item.name || item.code || "Peça")}</p>
        <p class="cart-line-code">${window.MarisUI.escapeHtml(item.code || "")} · ${Number(item.quantity) || 0} un.</p>
      </div>
      <p class="cart-line-name">${window.MarisUI.escapeHtml(item.status || "")}</p>
    </article>
  `).join("")
}

async function load() {
  const statusEl = document.getElementById("track-status")
  const messageEl = document.getElementById("track-message")
  const token = tokenFromPath(window.location.pathname)
  const setMessage = (text, type) => {
    window.MarisUI.setFeedback(messageEl, text, type, { baseClass: "cart-page-message" })
  }
  if (!token || !window.MarisPagamento) {
    if (statusEl) statusEl.textContent = "Pedido não encontrado."
    setMessage("Pedido não encontrado.", "error")
    return
  }
  try {
    const url = `${window.ENV.fn("order-status")}?token=${encodeURIComponent(token)}`
    const result = await window.MarisApi.callFunction(url, { method: "GET" })
    const page = window.MarisPagamento.interpretTrackingResponse(result)
    if (page.kind !== "ok") {
      if (statusEl) statusEl.textContent = page.error || "Pedido não encontrado."
      setMessage(page.error || "Pedido não encontrado.", "error")
      renderItems([])
      showTracking(document.getElementById("track-shipping"), null)
      return
    }
    if (statusEl) statusEl.textContent = page.statusLabel || page.status
    setMessage("")
    showTracking(document.getElementById("track-shipping"), page)
    renderItems(page.items)
  } catch {
    if (statusEl) statusEl.textContent = "Não foi possível consultar o pedido."
    setMessage("Não foi possível consultar o pedido.", "error")
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load)
else load()
