import { escapeHtml, renderWaitlistCards } from "./lista-espera.logic.js"

const statusFilter = document.getElementById("status-filter")
const wrap = document.getElementById("waitlist-table-wrap")
const feedbackEl = document.getElementById("waitlist-feedback")
const countEl = document.getElementById("waitlist-count")

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

  wrap.innerHTML = renderWaitlistCards(entries)
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