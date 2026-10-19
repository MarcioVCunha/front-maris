// Regras da lista de contas. Cada linha é uma peça (uma venda).
// Marcar como paga mexe só nos ids escolhidos.

export function isPaidRow(row) {
  return row?.is_paid === true
}

export function rowsForUnpaidView(rows) {
  return (rows || []).filter((row) => {
    if (String(row?.status || "active") === "cancelled") return false
    return !isPaidRow(row)
  })
}

export function toggleSaleSelection(selected, saleId) {
  const next = new Set(selected || [])
  const key = String(saleId ?? "")
  if (!key) return next
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

export function paidIdsToRemove(requestedIds, data) {
  const requested = [...new Set(
    (requestedIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )]
  if (Array.isArray(data?.ids)) {
    const updated = new Set(data.ids.map((id) => Number(id)))
    return requested.filter((id) => updated.has(id))
  }
  const count = Number(data?.count)
  if (Number.isInteger(count) && count === requested.length) return requested
  return []
}

export function withoutPaidIds(rows, paidIds) {
  const gone = new Set((paidIds || []).map((id) => String(id)))
  return (rows || []).filter((row) => !gone.has(String(row?.id ?? "")))
}

// Só aparece se a linha já trouxer o pedido e as contagens. A listagem atual não manda isso.
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function accountPhotoHtml(url, name) {
  if (!url) {
    return `<div class="sale-card-photo sale-card-photo--empty" aria-hidden="true"><span>Sem foto</span></div>`
  }
  return `<img class="sale-card-photo" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'sale-card-photo sale-card-photo--empty',innerHTML:'<span>Sem foto</span>'}))">`
}

export function renderAccountsSaleCards(rows, options = {}) {
  const formatMoney = options.formatMoney || ((value) => String(value ?? ""))
  const formatDate = options.formatDate || ((value) => String(value ?? ""))
  const paymentLabel = options.paymentLabel || ((value) => String(value || "—"))
  const imageUrlFor = options.imageUrlFor || (() => "")
  const isPaid = options.isPaid || ((row) => row?.is_paid === true)
  const selected = options.selectedIds || new Set()

  return (rows || []).map((row) => {
    const cancelled = String(row.status || "active") === "cancelled"
    const paid = isPaid(row)
    const type = String(row.sale_item_type || "product") === "component" ? "Tipo" : "Produto"
    const id = String(row.id ?? "")
    const dateLabel = paid && row.paid_at ? "Paga em" : "Data"
    const dateValue = paid && row.paid_at ? row.paid_at : row.created_at
    const hintFor = options.orderPaidHint || orderPaidHint
    const hint = hintFor(row)
    const name = row.product_name || "—"

    let badgeClass = paid ? "badge-paid" : "badge-unpaid"
    let badgeText = paid ? "Paga" : "A receber"
    if (cancelled) {
      badgeClass = "badge-cancelled"
      badgeText = "Cancelada"
    }

    const meta = `
        ${accountPhotoHtml(imageUrlFor(row), String(row.product_name || "Produto"))}
        <h3 class="sale-card-title">${escapeHtml(name)}</h3>
        <p class="sale-card-code">${type} · ${escapeHtml(row.product_code || "")}</p>
        ${hint ? `<p class="sale-order-hint">${escapeHtml(hint)}</p>` : ""}
        <dl class="sale-card-meta">
          <div><dt>${dateLabel}</dt><dd>${escapeHtml(formatDate(dateValue))}</dd></div>
          <div><dt>Quantidade</dt><dd>${Number(row.quantity) || 0}</dd></div>
          <div><dt>Vendedora</dt><dd>${escapeHtml(row.seller_name || "—")}</dd></div>
          <div><dt>Pagamento</dt><dd>${escapeHtml(paymentLabel(row.payment_method))}</dd></div>
        </dl>
        <div class="sale-card-footer">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <span class="sale-card-value">${escapeHtml(formatMoney(row.total_value))}</span>
        </div>
      `

    if (cancelled) {
      return `
          <div class="sale-card sale-card--cancelled" role="listitem" data-sale-id="${escapeHtml(id)}">
            ${meta}
          </div>
        `
    }

    const checked = id && selected.has(id) ? "checked" : ""
    const selectedClass = checked ? "sale-card--selected" : ""
    const cancelBtn = paid
      ? `<button type="button" class="btn-return-sale" data-return-sale-id="${escapeHtml(id)}">Devolver venda</button>`
      : `<button type="button" class="btn-cancel-sale" data-cancel-sale-id="${escapeHtml(id)}">Cancelar venda</button>`

    return `
        <label class="sale-card ${selectedClass}" role="listitem" data-sale-id="${escapeHtml(id)}">
          <input type="checkbox" class="row-select sale-card-checkbox" data-sale-id="${escapeHtml(id)}" ${checked} aria-label="Selecionar venda de ${escapeHtml(row.product_name || "produto")}">
          ${meta}
          ${cancelBtn ? `<div class="sale-card-actions">${cancelBtn}</div>` : ""}
        </label>
      `
  }).join("")
}

export function orderPaidHint(row) {
  if (!row || typeof row !== "object") return ""
  const orderId = row.order_id ?? row.pedido_id
  if (orderId == null || String(orderId).trim() === "") return ""
  const total = Number(row.order_piece_count)
  const paid = Number(row.order_paid_count)
  if (!Number.isInteger(total) || total < 2) return ""
  if (!Number.isInteger(paid) || paid < 0 || paid > total) return ""
  return `pedido #${orderId}: ${paid} de ${total} peças pagas`
}
