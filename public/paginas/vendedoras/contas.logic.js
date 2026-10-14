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
