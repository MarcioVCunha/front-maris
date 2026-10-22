// Fila de cadastros duplicados. Contrato do back-maris PR #52:
// GET staff-merge-review-list e POST staff-merge-review-resolve.

const MATCH_LABELS = {
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

function positiveInt(value) {
  const number = Number(value)
  if (!Number.isInteger(number) || number <= 0) return null
  return number
}

function normalizeAccount(raw) {
  const orderCount = Number(raw?.order_count ?? raw?.orders_count ?? raw?.pedidos ?? 0)
  const id = positiveInt(raw?.id)
  let hasLogin = false
  if (raw?.has_login === true || raw?.hasLogin === true) hasLogin = true
  else if (raw?.has_login === false || raw?.hasLogin === false) hasLogin = false
  else if (raw && "auth_user_id" in raw) hasLogin = raw.auth_user_id != null && raw.auth_user_id !== ""
  return {
    id: id == null ? "" : String(id),
    name: clean(raw?.name || raw?.nome),
    email: clean(raw?.email),
    whatsapp: clean(raw?.whatsapp),
    cpf: clean(raw?.cpf),
    orderCount: Number.isFinite(orderCount) && orderCount > 0 ? Math.trunc(orderCount) : 0,
    hasLogin
  }
}

export function normalizeReview(raw) {
  const pair = [raw?.customer_a ?? raw?.customerA, raw?.customer_b ?? raw?.customerB]
  const accounts = pair.filter((item) => item && typeof item === "object").map(normalizeAccount)
  return {
    id: positiveInt(raw?.id) == null ? "" : String(positiveInt(raw?.id)),
    matchedField: clean(raw?.field),
    pendingValue: clean(raw?.pending_value ?? raw?.pendingValue),
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

function pendingLabel(field, value) {
  if (!value) return ""
  return field === "cpf" ? maskCpf(value) : value
}

export function renderReviewCard(input) {
  const review = normalizeReview(input)
  const sides = review.accounts.map((account, index) => {
    const title = account.name || `Cadastro ${index + 1}`
    return `<section class="review-side"><h3>${escapeHtml(title)}</h3><dl>${accountFields(account, review.matchedField)}</dl></section>`
  }).join("")
  const match = MATCH_LABELS[review.matchedField]
  const pending = pendingLabel(review.matchedField, review.pendingValue)
  const detail = pending ? ` · ${escapeHtml(pending)}` : ""
  const kicker = match ? `<p class="review-kicker">Bateu em ${escapeHtml(match)}${detail}</p>` : ""
  return `<article class="review-card" data-review-id="${escapeHtml(review.id)}">${kicker}<div class="review-pair">${sides}</div><div class="review-actions"><button type="button" class="btn-primary" data-review-action="juntar">Juntar</button><button type="button" class="btn-ghost" data-review-action="separado">Manter separado</button><button type="button" class="btn-danger" data-review-action="excluir">Excluir</button></div></article>`
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
  const wire = action === "excluir" || action === "delete" ? "excluir" : action === "separado" || action === "keep" ? "separado" : "juntar"
  if (wire === "separado") {
    return `<form id="review-form" data-action="separado" data-review-id="${id}"><h2>Manter separado</h2><p>Os dois cadastros continuam como estão. Esta pendência sai da fila.</p><div class="dialog-actions"><button type="button" class="btn-ghost" data-review-cancel>Cancelar</button><button type="submit" class="btn-primary">Manter separado</button></div></form>`
  }
  const removing = wire === "excluir"
  const title = removing ? "Excluir cadastro" : "Juntar cadastros"
  const copy = removing
    ? "Qual cadastro sai? Esta ação não volta."
    : "Qual cadastro fica? Os dados do outro entram nele."
  const submitClass = removing ? "btn-danger" : "btn-primary"
  const submitLabel = removing ? "Excluir" : "Juntar"
  return `<form id="review-form" data-action="${wire}" data-review-id="${id}"><h2>${title}</h2><p>${copy}</p><div class="review-choices">${choiceList(review.accounts, "customer_id")}</div><div class="dialog-actions"><button type="button" class="btn-ghost" data-review-cancel>Cancelar</button><button type="submit" class="${submitClass}">${submitLabel}</button></div></form>`
}

export function resolveReviewBody(input = {}) {
  const rawAction = clean(input.action)
  const action = rawAction === "juntar" || rawAction === "merge"
    ? "juntar"
    : rawAction === "separado" || rawAction === "keep"
    ? "separado"
    : rawAction === "excluir" || rawAction === "delete"
    ? "excluir"
    : ""
  const reviewId = positiveInt(input.reviewId ?? input.review_id ?? input.id)
  if (reviewId == null || !action) {
    return { ok: false, error: "Não foi possível concluir a revisão." }
  }
  const body = { id: reviewId, review_id: reviewId, action }
  if (action === "separado") return { ok: true, body }
  const customerId = positiveInt(input.customerId ?? input.customer_id ?? input.keepId ?? input.deleteId)
  if (customerId == null) {
    return {
      ok: false,
      error: action === "juntar" ? "Escolha qual cadastro fica." : "Escolha qual cadastro excluir."
    }
  }
  body.customer_id = customerId
  return { ok: true, body }
}
