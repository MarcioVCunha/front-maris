// Texto, preço e rótulos do painel. escapeHtml segue o contrato do #75.
export function displayQuantity(value) {
  if (value == null || String(value).trim() === "") return 0
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ""
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatActionDateTime(isoString) {
  if (!isoString) return "—"
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(d)
}

export function formatActionLabel(event) {
  const action = String(event?.action || "").trim()
  const detail = event?.detail || {}

  if (action === "admin-product-batch:quantity") {
    if (detail.old_quantity != null && detail.new_quantity != null) {
      const diff = detail.new_quantity - detail.old_quantity
      const signal = diff > 0 ? `+${diff}` : `${diff}`
      return `Estoque alterado de ${detail.old_quantity} para ${detail.new_quantity} un. (${signal})`
    }
    return "Estoque ajustado em lote"
  }
  if (action === "admin-product-batch:price") {
    if (detail.old_price != null && detail.new_price != null) {
      const pct = detail.delta_percent != null ? ` (${detail.delta_percent > 0 ? "+" : ""}${detail.delta_percent}%)` : ""
      return `Preço alterado de R$ ${Number(detail.old_price).toFixed(2).replace(".", ",")} para R$ ${Number(detail.new_price).toFixed(2).replace(".", ",")}${pct}`
    }
    return "Preço reajustado em lote"
  }
  if (action === "admin-product-batch:archive") {
    return "Peça arquivada em lote"
  }
  if (action === "admin-product-batch:unarchive") {
    return "Peça desarquivada em lote"
  }
  if (action === "admin-product-archive") {
    return "Peça arquivada"
  }
  if (action === "admin-product-unarchive") {
    return "Peça desarquivada"
  }
  if (action === "admin-product-update") {
    const fields = Array.isArray(detail.fields) ? detail.fields.join(", ") : ""
    return fields ? `Cadastro atualizado (${fields})` : "Cadastro da peça atualizado"
  }
  if (action === "add-product") {
    return "Peça cadastrada no sistema"
  }
  if (action === "set-product-promotion" || action === "admin-promotion-save") {
    return "Promoção vinculada"
  }
  return action || "Alteração registrada"
}
