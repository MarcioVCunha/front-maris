export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
  const raw = entry?.created_at || entry?.waiting_since
  if (!raw) return ""
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("pt-BR")
}

export function renderWaitlistEntryCard(entry) {
  const e = entry || {}
  const action =
    e.status === "waiting"
      ? `<button type="button" data-mark="${escapeHtml(e.id)}" class="btn-primary waitlist-mark-btn">Marcar como avisado</button>`
      : `<span class="waitlist-avisado">Avisado em ${e.contacted_at ? escapeHtml(new Date(e.contacted_at).toLocaleDateString("pt-BR")) : "—"}</span>`
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
        ${joined ? `<div><span class="waitlist-label">Entrou em</span>${escapeHtml(joined)}</div>` : ""}
      </div>
      <div class="waitlist-card-action">${action}</div>
    </article>
  `
}

export function renderWaitlistCards(entries) {
  return `<div class="waitlist-cards">${(entries || []).map(renderWaitlistEntryCard).join("")}</div>`
}
