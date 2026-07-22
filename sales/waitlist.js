const statusFilter = document.getElementById("status-filter")
const wrap = document.getElementById("waitlist-table-wrap")
const feedbackEl = document.getElementById("waitlist-feedback")
const countEl = document.getElementById("waitlist-count")

function escapeHtml(value) {
  return window.MarisUI?.escapeHtml?.(value) ?? String(value ?? "")
}

function setFeedback(text, type = "") {
  if (!feedbackEl) return
  if (window.MarisUI?.setFeedback) {
    window.MarisUI.setFeedback(feedbackEl, text, type, { baseClass: "message", toggleHidden: true })
    return
  }
  feedbackEl.textContent = text
  feedbackEl.className = type ? `message ${type}` : "message"
  feedbackEl.hidden = !text
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    const aStock = a.in_stock ? 0 : 1
    const bStock = b.in_stock ? 0 : 1
    if (aStock !== bStock) return aStock - bStock
    const aDate = Date.parse(a.created_at || a.waiting_since || 0) || 0
    const bDate = Date.parse(b.created_at || b.waiting_since || 0) || 0
    return aDate - bDate
  })
}

function formatContact(buyer) {
  const email = String(buyer?.email || "").trim()
  const waRaw = String(buyer?.whatsapp || "").replace(/\D/g, "")
  const parts = []
  if (email) {
    parts.push(`<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`)
  }
  if (waRaw) {
    parts.push(`<a href="https://wa.me/${escapeHtml(waRaw)}" target="_blank" rel="noopener">${escapeHtml(waRaw)}</a>`)
  }
  return parts.length ? parts.join("<br>") : "—"
}

function formatJoinedAt(entry) {
  const raw = entry.created_at || entry.waiting_since
  if (!raw) return ""
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("pt-BR")
}

function renderEntryCard(e) {
  const action =
    e.status === "waiting"
      ? `<button type="button" data-mark="${e.id}" class="btn-primary waitlist-mark-btn">Marcar como avisado</button>`
      : `<span class="waitlist-avisado">Avisado em ${e.contacted_at ? new Date(e.contacted_at).toLocaleDateString("pt-BR") : "—"}</span>`
  const stockBadge = e.in_stock
    ? `<span class="waitlist-badge waitlist-badge--stock">Em estoque</span>`
    : `<span class="waitlist-badge">Sem estoque</span>`
  const joined = formatJoinedAt(e)
  return `
    <article class="waitlist-card ${e.in_stock ? "waitlist-card--ready" : ""}">
      <div class="waitlist-card-top">
        <div>
          <strong class="waitlist-piece">${escapeHtml(e.piece_name)}</strong>
          <div class="waitlist-code">${escapeHtml(e.piece_code)}</div>
        </div>
        ${stockBadge}
      </div>
      <div class="waitlist-card-body">
        <div><span class="waitlist-label">Cliente</span>${escapeHtml(e.buyer?.full_name || "—")}</div>
        <div><span class="waitlist-label">Contato</span>${formatContact(e.buyer || {})}</div>
        ${joined ? `<div><span class="waitlist-label">Entrou em</span>${joined}</div>` : ""}
      </div>
      <div class="waitlist-card-action">${action}</div>
    </article>
  `
}

async function loadWaitlist() {
  setFeedback("")
  const status = statusFilter.value
  wrap.innerHTML = "<p class=\"waitlist-loading\">Carregando lista de espera…</p>"
  if (countEl) countEl.textContent = ""

  const url = `${window.ENV.fn("list-waitlist")}?status=${encodeURIComponent(status)}`
  let result
  try {
    result = await window.MarisApi.callFunction(url, { method: "GET", auth: "staff" })
  } catch {
    wrap.innerHTML = `<p class="message error">Erro de conexão. Tente novamente.</p>`
    return
  }

  const { ok, data } = result
  if (!ok) {
    wrap.innerHTML = `<p class="message error">${escapeHtml(data?.error || "Erro ao carregar a lista.")}</p>`
    return
  }

  const entries = sortEntries(data.entries || [])
  if (!entries.length) {
    const emptyByStatus = {
      waiting: "Ninguém aguardando no momento.",
      contacted: "Nenhum cliente já avisado neste filtro.",
      all: "Nenhuma entrada na lista de espera.",
    }
    wrap.innerHTML = `<p class="waitlist-empty">${emptyByStatus[status] || "Nenhuma entrada."}</p>`
    return
  }

  const inStockCount = entries.filter((e) => e.in_stock && e.status === "waiting").length
  if (countEl) {
    countEl.textContent = inStockCount > 0
      ? `${entries.length} na lista · ${inStockCount} em estoque prontos para avisar`
      : `${entries.length} na lista`
  }

  wrap.innerHTML = `<div class="waitlist-cards">${entries.map(renderEntryCard).join("")}</div>`
}

wrap.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-mark]")
  if (!btn) return
  const entryId = Number(btn.getAttribute("data-mark"))
  btn.disabled = true
  try {
    const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("mark-waitlist-contacted"), {
      body: { entry_id: entryId },
      auth: "staff"
    })
    if (ok) {
      setFeedback("Cliente marcado como avisado.", "success")
      loadWaitlist()
    } else {
      setFeedback(data?.error || "Não foi possível marcar como avisado.", "error")
      btn.disabled = false
    }
  } catch {
    setFeedback("Erro de conexão ao marcar como avisado.", "error")
    btn.disabled = false
  }
})

document.getElementById("reload-waitlist").addEventListener("click", loadWaitlist)
statusFilter.addEventListener("change", loadWaitlist)
loadWaitlist()