// Fila de cadastros duplicados. O back (admin-customer-review-*) ainda vem em paralelo.

const MATCH_LABELS = {
  name: "nome",
  email: "e-mail",
  whatsapp: "WhatsApp",
  cpf: "CPF"
}

const REVIEW_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "cpf", label: "CPF" },
  { key: "order_count", label: "Pedidos" },
  { key: "has_login", label: "Login" }
]

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function clean(value) {
  return String(value ?? "").trim()
}

export function maskCpf(value) {
  const text = clean(value)
  if (!text) return "—"
  if (text.includes("*")) return text
  const digits = text.replace(/\D/g, "")
  if (digits.length < 2) return "—"
  return `***.***.***-${digits.slice(-2)}`
}

function normalizeAccount(raw) {
  const orderCount = Number(raw?.order_count ?? raw?.orderCount ?? 0)
  return {
    id: clean(raw?.id),
    name: clean(raw?.name),
    email: clean(raw?.email),
    whatsapp: clean(raw?.whatsapp),
    cpf: clean(raw?.cpf),
    orderCount: Number.isFinite(orderCount) && orderCount > 0 ? Math.trunc(orderCount) : 0,
    hasLogin: raw?.has_login === true || raw?.hasLogin === true
  }
}

export function normalizeReview(raw) {
  const accounts = Array.isArray(raw?.accounts) ? raw.accounts.slice(0, 2).map(normalizeAccount) : []
  return {
    id: clean(raw?.id),
    matchedField: clean(raw?.matched_field || raw?.matchedField),
    accounts
  }
}

export function normalizeReviewList(data) {
  const reviews = Array.isArray(data?.reviews) ? data.reviews.map(normalizeReview) : []
  const pending = Number(data?.pending_count ?? data?.pendingCount)
  return {
    pendingCount: Number.isFinite(pending) && pending >= 0 ? Math.trunc(pending) : reviews.length,
    reviews
  }
}

function fieldValue(account, key) {
  if (key === "name") return account.name || "—"
  if (key === "email") return account.email || "—"
  if (key === "whatsapp") return account.whatsapp || "—"
  if (key === "cpf") return maskCpf(account.cpf)
  if (key === "order_count") return String(account.orderCount)
  if (key === "has_login") return account.hasLogin ? "Tem login" : "Sem login"
  return "—"
}

function accountFields(account, matchedField) {
  return REVIEW_FIELDS.map((field) => {
    const match = field.key === matchedField ? " is-match" : ""
    return `<div class="review-field${match}"><dt>${field.label}</dt><dd>${escapeHtml(fieldValue(account, field.key))}</dd></div>`
  }).join("")
}

export function renderReviewCard(input) {
  const review = normalizeReview(input)
  const sides = review.accounts.map((account, index) => {
    const title = account.name || `Cadastro ${index + 1}`
    return `<section class="review-side"><h3>${escapeHtml(title)}</h3><dl>${accountFields(account, review.matchedField)}</dl></section>`
  }).join("")
  const match = MATCH_LABELS[review.matchedField]
  const kicker = match ? `<p class="review-kicker">Bateu em ${escapeHtml(match)}</p>` : ""
  return `<article class="review-card" data-review-id="${escapeHtml(review.id)}">${kicker}<div class="review-pair">${sides}</div><div class="review-actions"><button type="button" class="btn-primary" data-review-action="merge">Juntar</button><button type="button" class="btn-ghost" data-review-action="keep">Manter separado</button><button type="button" class="btn-danger" data-review-action="delete">Excluir</button></div></article>`
}

export function renderReviewPage(reviews) {
  const list = Array.isArray(reviews) ? reviews : []
  if (!list.length) return `<p class="empty">Nenhum cadastro para revisar.</p>`
  const cards = list.map(renderReviewCard).join("")
  return `<p class="review-lead">Dois cadastros parecem ser a mesma pessoa. O campo em destaque é o que bateu.</p><div class="review-list">${cards}</div>`
}

export function renderReviewError(message) {
  const text = clean(message) || "Não foi possível carregar os cadastros para revisão."
  return `<p class="empty">${escapeHtml(text)}</p>`
}

function choiceList(accounts, name) {
  return accounts.map((account, index) => {
    const label = account.name || account.email || `Cadastro ${index + 1}`
    const checked = index === 0 ? " checked" : ""
    return `<label class="review-choice"><input type="radio" name="${name}" value="${escapeHtml(account.id)}"${checked}><span>${escapeHtml(label)}</span></label>`
  }).join("")
}

export function renderReviewDialog(input, action) {
  const review = normalizeReview(input)
  const id = escapeHtml(review.id)
  if (action === "keep") {
    return `<form id="review-form" data-action="keep" data-review-id="${id}"><h2>Manter separado</h2><p>Os dois cadastros continuam como estão. Esta pendência sai da fila.</p><div class="dialog-actions"><button type="button" class="btn-ghost" data-review-cancel>Cancelar</button><button type="submit" class="btn-primary">Manter separado</button></div></form>`
  }
  const removing = action === "delete"
  const title = removing ? "Excluir cadastro" : "Juntar cadastros"
  const copy = removing
    ? "Qual cadastro sai? Esta ação não volta."
    : "Qual cadastro fica? Os dados do outro entram nele."
  const field = removing ? "delete_id" : "keep_id"
  const submitClass = removing ? "btn-danger" : "btn-primary"
  const submitLabel = removing ? "Excluir" : "Juntar"
  return `<form id="review-form" data-action="${removing ? "delete" : "merge"}" data-review-id="${id}"><h2>${title}</h2><p>${copy}</p><div class="review-choices">${choiceList(review?.accounts || [], field)}</div><div class="dialog-actions"><button type="button" class="btn-ghost" data-review-cancel>Cancelar</button><button type="submit" class="${submitClass}">${submitLabel}</button></div></form>`
}

export function resolveReviewBody(input = {}) {
  const action = clean(input.action)
  const reviewId = clean(input.reviewId || input.review_id)
  if (!reviewId || !["merge", "keep", "delete"].includes(action)) {
    return { ok: false, error: "Não foi possível concluir a revisão." }
  }
  const body = { review_id: reviewId, action }
  if (action === "merge") {
    const keepId = clean(input.keepId || input.keep_id)
    if (!keepId) return { ok: false, error: "Escolha qual cadastro fica." }
    body.keep_id = keepId
  }
  if (action === "delete") {
    const deleteId = clean(input.deleteId || input.delete_id)
    if (!deleteId) return { ok: false, error: "Escolha qual cadastro excluir." }
    body.delete_id = deleteId
  }
  return { ok: true, body }
}
