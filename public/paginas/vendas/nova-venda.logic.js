// Regras da tela de venda. A flag está ligada: /vendas/nova é a tela da equipe.
// Marketplace (Shopee / ML / TikTok) fica atrás de MARKETPLACE_SALE_ENABLED.
import { newClientRequestId, stockIssueText } from "../catalogo/pedido.logic.js"

export const NEW_SALE_ENABLED = true
/** Liga o fluxo de venda marketplace. Off até o front ligar após o contrato no ar. */
export const MARKETPLACE_SALE_ENABLED = false
export const COMMISSION_RATE = 0.3
export const PIX_DISCOUNT_RATE = 0.05
export { newClientRequestId }

export const MARKETPLACE_PLATFORMS = [
  { id: "shopee", label: "Shopee" },
  { id: "mercado_livre", label: "Mercado Livre" },
  { id: "tiktok", label: "TikTok" }
]

export function shouldShowMarketplaceSale(enabled = MARKETPLACE_SALE_ENABLED) {
  return enabled === true
}

export function marketplaceLabel(id) {
  const found = MARKETPLACE_PLATFORMS.find((item) => item.id === id)
  return found?.label || ""
}

export function isMarketplacePlatform(id) {
  return MARKETPLACE_PLATFORMS.some((item) => item.id === id)
}

const ZERO_COMMISSION_NAMES = ["marcio", "marineide"]

export function shouldShowNewSale(enabled = NEW_SALE_ENABLED) {
  return enabled === true
}

export function roundMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 100) / 100
}

export function foldName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function commissionRateFor(seller) {
  const name = foldName(seller?.name)
  const first = name.split(/\s+/)[0] || ""
  if (ZERO_COMMISSION_NAMES.includes(name) || ZERO_COMMISSION_NAMES.includes(first)) return 0
  return COMMISSION_RATE
}

export function monthCard({ chargedTotal, seller }) {
  const rate = commissionRateFor(seller)
  const total = roundMoney(chargedTotal)
  return {
    chargedTotal: total,
    commission: roundMoney(total * rate),
    rate,
    zeroCommission: rate === 0,
    note: rate === 0
      ? "Sem comissão nesta conta."
      : "30% do valor cobrado nas vendas pagas."
  }
}

export function paidPiecesLabel(pieces, orders) {
  const pieceCount = Number.isInteger(pieces) && pieces >= 0 ? pieces : 0
  const orderCount = Number.isInteger(orders) && orders >= 0 ? orders : 0
  const piecesText = pieceCount === 1 ? "1 peça paga" : `${pieceCount} peças pagas`
  const ordersText = orderCount === 1 ? "1 venda" : `${orderCount} vendas`
  return `${piecesText} em ${ordersText}`
}

function saoPauloYearMonth(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(date)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  return year && month ? `${year}-${month}` : ""
}

export function isPaidSale(sale) {
  if (!sale || typeof sale !== "object") return false
  if (sale.payment_status === "paid" || sale.is_paid === true) return true
  return false
}

// Soma o valor cobrado das vendas pagas cuja data de pagamento cai no mês
// (calendário de São Paulo). Venda a receber não entra.
export function sumPaidChargesInMonth(sales, year, month) {
  const key = `${year}-${String(month).padStart(2, "0")}`
  return roundMoney((sales || []).reduce((sum, sale) => {
    if (!isPaidSale(sale)) return sum
    if (saoPauloYearMonth(sale.paid_at) !== key) return sum
    return sum + (Number(sale.total) || 0)
  }, 0))
}

export function chargedTotalFromSummary(data, { year, month }) {
  if (data && typeof data.charged_total === "number" && Number.isFinite(data.charged_total)) {
    return roundMoney(data.charged_total)
  }
  if (Array.isArray(data?.sales)) return sumPaidChargesInMonth(data.sales, year, month)
  return 0
}

export function currentYearMonth(now = new Date()) {
  const key = saoPauloYearMonth(now.toISOString())
  const [year, month] = key.split("-")
  return { year: Number(year), month: Number(month), key }
}

export function piecesInStock(pieces) {
  return (pieces || []).filter((piece) => (Number(piece?.quantity) || 0) > 0)
}

export function filterPieces(pieces, term) {
  const query = foldName(term)
  return piecesInStock(pieces).filter((piece) => {
    if (!query) return true
    return foldName(piece.name).includes(query) || foldName(piece.code).includes(query)
  })
}

function sameId(left, right) {
  return String(left) === String(right)
}

export function togglePiece(selected, piece) {
  const stock = Number(piece?.quantity) || 0
  if (stock <= 0) return selected || []
  const current = selected || []
  if (current.some((item) => sameId(item.id, piece.id))) {
    return current.filter((item) => !sameId(item.id, piece.id))
  }
  const pix = Number(piece.preco_pix)
  return [...current, {
    id: piece.id,
    code: piece.code,
    name: piece.name,
    image_url: piece.image_url || "",
    unit_price: roundMoney(piece.unit_price),
    preco_pix: Number.isFinite(pix) ? roundMoney(pix) : null,
    item_type: piece.item_type || "",
    component_id: piece.component_id ?? null,
    quantity: 1,
    stock
  }]
}

export function setPieceQuantity(selected, id, rawQuantity) {
  return (selected || []).map((item) => {
    if (!sameId(item.id, id)) return item
    let quantity = Math.floor(Number(rawQuantity))
    if (!Number.isInteger(quantity) || quantity < 1) quantity = 1
    quantity = Math.min(quantity, Number(item.stock) || 1)
    return { ...item, quantity }
  })
}

export function normalizeWhatsapp(value) {
  let digits = String(value || "").replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2)
  return digits.slice(0, 11)
}

export function formatWhatsapp(value) {
  const digits = normalizeWhatsapp(value)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function filterCustomers(customers, term) {
  const query = foldName(term)
  const digits = normalizeWhatsapp(term)
  if (!query) return customers || []
  return (customers || []).filter((customer) => {
    if (foldName(customer?.name).includes(query)) return true
    return digits.length > 0 && normalizeWhatsapp(customer?.whatsapp).includes(digits)
  })
}

export function customerPayload({ id, name, whatsapp } = {}) {
  if (id != null && String(id).trim() !== "") return { ok: true, customer: { id } }
  const cleanName = String(name || "").trim()
  const digits = normalizeWhatsapp(whatsapp)
  if (!cleanName) return { ok: false, error: "Informe o nome." }
  if (digits.length < 10) return { ok: false, error: "Informe o WhatsApp com DDD." }
  return { ok: true, customer: { name: cleanName, whatsapp: formatWhatsapp(digits) } }
}

export function saleTotals(pieces, paymentMethod) {
  const rows = pieces || []
  const subtotal = roundMoney(rows.reduce((sum, piece) => {
    return sum + roundMoney(piece.unit_price) * (Number(piece.quantity) || 0)
  }, 0))
  if (paymentMethod !== "pix") return { subtotal, discount: 0, total: subtotal }
  const anyPix = rows.some((piece) => Number.isFinite(Number(piece.preco_pix)))
  if (!anyPix) {
    const discount = roundMoney(subtotal * PIX_DISCOUNT_RATE)
    return { subtotal, discount, total: roundMoney(subtotal - discount) }
  }
  const total = roundMoney(rows.reduce((sum, piece) => {
    const qty = Number(piece.quantity) || 0
    const pix = Number(piece.preco_pix)
    const unit = Number.isFinite(pix)
      ? roundMoney(pix)
      : roundMoney(roundMoney(piece.unit_price) * (1 - PIX_DISCOUNT_RATE))
    return sum + unit * qty
  }, 0))
  return { subtotal, discount: roundMoney(Math.max(0, subtotal - total)), total }
}

function saleLine(piece) {
  const quantity = Number(piece.quantity) || 0
  const raw = piece?.id
  const asText = String(raw ?? "").trim()
  const asNumber = Number(raw)
  let pieceId = raw
  if (typeof raw === "number" && Number.isInteger(raw)) pieceId = raw
  else if (/^c:\d+$/.test(asText)) pieceId = asText
  else if (asText && Number.isInteger(asNumber) && String(asNumber) === asText) pieceId = asNumber
  else pieceId = String(piece?.code || asText).trim()
  return { piece_id: pieceId, quantity }
}

/** Item no formato create-order / register-marketplace-order. */
export function marketplaceLine(piece) {
  const quantity = Number(piece.quantity) || 0
  const fromField = Number(piece?.component_id)
  const fromId = String(piece?.id ?? "").trim()
  const fromPrefixed = /^c:(\d+)$/.exec(fromId)
  const componentId = Number.isInteger(fromField) && fromField > 0
    ? fromField
    : (fromPrefixed ? Number(fromPrefixed[1]) : NaN)
  const asComponent = piece?.item_type === "component"
    || (Number.isInteger(componentId) && componentId > 0)
  if (asComponent && Number.isInteger(componentId) && componentId > 0) {
    return { component_id: componentId, quantity }
  }
  return { product_code: String(piece?.code || "").trim(), quantity }
}

export function buildCreateSaleBody({ sellerId, customer, paymentStatus, paymentMethod, pieces, clientRequestId }) {
  const seller = Number(sellerId)
  if (!Number.isInteger(seller) || seller <= 0) {
    return { ok: false, error: "Esta conta não está ligada a uma vendedora." }
  }
  if (!pieces?.length) return { ok: false, error: "Escolha pelo menos uma peça." }
  const who = customerPayload(customer || {})
  if (!who.ok) return who
  if (paymentStatus !== "paid" && paymentStatus !== "receivable") {
    return { ok: false, error: "Informe se está pago ou a receber." }
  }
  if (!["pix", "dinheiro", "cartao"].includes(paymentMethod)) {
    return { ok: false, error: "Escolha Pix, dinheiro ou cartão." }
  }
  const body = {
    seller_id: seller,
    customer: who.customer,
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    items: pieces.map(saleLine)
  }
  const requestId = String(clientRequestId || "").trim()
  if (requestId) body.client_request_id = requestId
  return { ok: true, body }
}

/**
 * Corpo de register-marketplace-order (back-maris PR #15).
 * Sem seller, cliente, pagamento ou comissão. Ver docs/contratos/venda-marketplace.md.
 */
export function buildMarketplaceSaleBody({ channel, pieces, clientRequestId, notes }) {
  const platform = String(channel || "").trim()
  if (!isMarketplacePlatform(platform)) {
    return { ok: false, error: "Escolha Shopee, Mercado Livre ou TikTok." }
  }
  if (!pieces?.length) return { ok: false, error: "Escolha pelo menos uma peça." }
  const items = pieces.map(marketplaceLine)
  if (items.some((item) => !item.product_code && !item.component_id)) {
    return { ok: false, error: "Cada peça precisa do código ou do componente." }
  }
  const body = { channel: platform, items }
  const requestId = String(clientRequestId || "").trim()
  if (requestId) body.client_request_id = requestId
  const note = String(notes || "").trim()
  if (note) {
    if (note.length > 500) return { ok: false, error: "Observação longa demais." }
    body.notes = note
  }
  return { ok: true, body }
}

/** Payload de cancel-marketplace-order: { order_id, reason? }. */
export function cancelMarketplaceOrderPayload(orderId, reason) {
  const id = Number(orderId)
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Pedido inválido." }
  const body = { order_id: id }
  const text = String(reason || "").trim()
  if (text) {
    if (text.length > 500) return { ok: false, error: "Motivo longo demais." }
    body.reason = text
  }
  return { ok: true, body }
}

export function marketplacePlatformOf(sale) {
  if (isMarketplacePlatform(sale?.channel)) return sale.channel
  if (isMarketplacePlatform(sale?.marketplace)) return sale.marketplace
  return ""
}

export function isMarketplaceSale(sale) {
  if (!sale || typeof sale !== "object") return false
  if (sale.source === "marketplace") return true
  if (sale.channel === "marketplace") return true
  return Boolean(marketplacePlatformOf(sale))
}

function countOrZero(value) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 0 ? number : 0
}

export function monthCardFromSummary(data, seller) {
  const chargedTotal = chargedTotalFromSummary(data, currentYearMonth())
  const paidCount = countOrZero(data?.paid_count)
  const paidOrdersCount = countOrZero(data?.paid_orders_count)
  const piecesLabel = paidPiecesLabel(paidCount, paidOrdersCount)
  const base = monthCard({ chargedTotal, seller })
  const hasAmount = data != null && Object.prototype.hasOwnProperty.call(data, "commission_amount")
  if (!hasAmount) {
    return { ...base, month: data?.month || "", paidCount, paidOrdersCount, piecesLabel }
  }
  const amount = Number(data.commission_amount)
  const commission = Number.isFinite(amount) ? roundMoney(amount) : 0
  const percent = Number(data.commission_percent)
  const sem = data.sem_comissao === true || percent === 0
  const shown = Number.isFinite(percent) ? percent : Math.round((base.rate || 0) * 100)
  return {
    month: data?.month || "",
    paidCount,
    paidOrdersCount,
    piecesLabel,
    chargedTotal,
    commission,
    rate: sem ? 0 : (Number.isFinite(percent) ? percent / 100 : base.rate),
    zeroCommission: sem,
    note: sem ? "Sem comissão nesta conta." : `${shown}% de cada peça paga.`
  }
}

function stockIssueMatches(piece, issue) {
  const componentId = Number(issue?.component_id)
  if (Number.isInteger(componentId) && componentId > 0) {
    return Number(piece.component_id) === componentId || String(piece.id) === `c:${componentId}`
  }
  const code = String(issue?.code || issue?.product_code || "").trim()
  if (!code || String(piece.code) !== code) return false
  return !(Number(piece.component_id) > 0)
}

export function applyStockIssues(pieces, issues) {
  const list = Array.isArray(issues) ? issues : []
  let next = (pieces || []).map((piece) => ({ ...piece }))
  for (const issue of list) {
    const available = Number(issue?.available)
    const stock = Number.isFinite(available) ? available : 0
    next = next.flatMap((piece) => {
      if (!stockIssueMatches(piece, issue)) return [piece]
      if (stock <= 0) return []
      const quantity = Math.min(Number(piece.quantity) || 1, stock)
      return [{ ...piece, stock, quantity: Math.max(1, Math.floor(quantity)) }]
    })
  }
  const message = list.map((issue) => stockIssueText(issue)).filter(Boolean).join(" ")
  return { pieces: next, message: message || "Algumas peças esgotaram." }
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const METHOD_LABEL = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão" }

export function formatSaleWhen(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit"
  }).format(date)
}

export function formatSaleDate(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

export function whatsappLink(value) {
  const digits = normalizeWhatsapp(value)
  if (digits.length < 10) return ""
  return `https://wa.me/55${digits}`
}

export function saleDetailTotals(sale) {
  const items = Array.isArray(sale?.items) ? sale.items : []
  const subtotal = roundMoney(items.reduce((sum, item) => {
    return sum + roundMoney(item?.unit_price) * (Number(item?.quantity) || 0)
  }, 0))
  const total = Number.isFinite(Number(sale?.total)) ? roundMoney(sale.total) : subtotal
  const pix = sale?.payment_method === "pix"
  const discount = pix ? roundMoney(Math.max(0, subtotal - total)) : 0
  return { subtotal, discount, total, pix }
}

const STATUS_LABEL = { paid: "Pago", partial: "Parcial", receivable: "A receber" }

export function salePaymentView(sale) {
  const known = sale?.payment_status
  const status = known === "paid" || known === "partial" || known === "receivable"
    ? known
    : (isPaidSale(sale) ? "paid" : "receivable")
  const paid = Number(sale?.paid_items_count)
  const total = Number(sale?.items_count)
  const pieces = Number.isInteger(paid) && Number.isInteger(total) && total > 0 && paid >= 0 && paid <= total
    ? `${paid} de ${total} peças pagas`
    : ""
  return { status, label: STATUS_LABEL[status], pieces }
}

function statusBadge(status, label) {
  return `<span class="pay-badge pay-badge--${status}">${escapeHtml(label)}</span>`
}

function itemPayView(item, saleStatus) {
  if (item && Object.prototype.hasOwnProperty.call(item, "paid_at")) {
    const raw = item.paid_at
    if (raw == null || String(raw).trim() === "") return { kind: "open", text: "A receber" }
    const when = formatSaleDate(raw)
    return { kind: "paid", text: when ? `Paga em ${when}` : "Paga" }
  }
  if (saleStatus === "paid") return { kind: "paid", text: "Paga" }
  return { kind: "open", text: "A receber" }
}

export function renderRecentSales(sales, formatMoney) {
  const rows = sales || []
  if (!rows.length) return `<p class="recent-empty">Nenhuma venda recente.</p>`
  return rows.map((sale) => {
    const view = salePaymentView(sale)
    const method = METHOD_LABEL[sale.payment_method] || ""
    const platform = marketplacePlatformOf(sale)
    const market = isMarketplaceSale(sale) ? marketplaceLabel(platform) || "Marketplace" : ""
    const title = market || sale.customer_name || "Cliente"
    const sideBits = view.pieces
      ? [method, view.pieces]
      : [method, view.label]
    if (market && sale.customer_name) sideBits.push(market)
    const side = sideBits.filter(Boolean).join(" · ")
    const when = formatSaleWhen(sale.created_at)
    const label = `Ver venda de ${title}`
    return `<button type="button" class="recent-sale" data-sale-id="${escapeHtml(sale.id)}" aria-label="${escapeHtml(label)}">
      <div class="recent-sale-main">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(when)}</span>
      </div>
      <div class="recent-sale-side">
        <b>${escapeHtml(formatMoney(sale.total))}</b>
        ${statusBadge(view.status, view.label)}
        <span>${escapeHtml(side)}</span>
      </div>
    </button>`
  }).join("")
}

function detailPhoto(item) {
  const url = String(item?.image_url || "").trim()
  if (!url) {
    const letters = String(item?.code || item?.name || "?").slice(0, 2)
    return `<span class="piece-photo piece-photo--empty">${escapeHtml(letters)}</span>`
  }
  return `<img class="piece-photo" src="${escapeHtml(url)}" alt="">`
}

export function renderSaleDetail(sale, formatMoney, options = {}) {
  const view = salePaymentView(sale)
  const method = METHOD_LABEL[sale?.payment_method] || ""
  const totals = saleDetailTotals(sale)
  const market = isMarketplaceSale(sale)
  const marketName = marketplaceLabel(marketplacePlatformOf(sale)) || "Marketplace"
  const link = whatsappLink(sale?.customer_whatsapp)
  const whatsapp = formatWhatsapp(sale?.customer_whatsapp)
  const contact = link
    ? `<a class="whatsapp-link" href="${escapeHtml(link)}">${escapeHtml(whatsapp)}</a>`
    : `<span>Sem WhatsApp</span>`
  const pieces = (sale?.items || []).map((item) => {
    const line = roundMoney((Number(item.unit_price) || 0) * (Number(item.quantity) || 0))
    const pay = itemPayView(item, view.status)
    return `<article class="detail-piece">
      ${detailPhoto(item)}
      <span class="piece-copy">
        <strong>${escapeHtml(item.name || "Peça")}</strong>
        <small>${escapeHtml(item.code || "")} · Qtd ${Number(item.quantity) || 0}</small>
        <small class="piece-pay piece-pay--${pay.kind}">${escapeHtml(pay.text)}</small>
      </span>
      <b>${escapeHtml(formatMoney(line))}</b>
    </article>`
  }).join("")
  const discount = totals.pix
    ? `<div><span>Desconto Pix</span><strong>${escapeHtml(formatMoney(totals.discount))}</strong></div>`
    : ""
  const payLine = [method, view.pieces].filter(Boolean).join(" · ")
  const title = market
    ? `${marketName}${sale?.customer_name ? ` · ${sale.customer_name}` : ""}`
    : (sale?.customer_name || "Cliente")
  const canCancel = options.allowCancel === true && market && sale?.id != null
  const cancelBtn = canCancel
    ? `<button type="button" class="btn-cancel-market" data-cancel-order="${escapeHtml(sale.id)}">Cancelar e devolver ao estoque</button>`
    : ""
  const commissionNote = market
    ? `<p class="detail-commission">Marketplace · sem comissão de vendedora.</p>`
    : ""
  return `<p class="flow-kicker">Venda</p>
    <h2 id="sale-modal-title">${escapeHtml(formatSaleDate(sale?.created_at))}</h2>
    <div class="detail-pieces">${pieces || `<p class="recent-empty">Sem peças nesta venda.</p>`}</div>
    <div class="detail-customer">
      <strong>${escapeHtml(title)}</strong>
      ${market ? "" : contact}
    </div>
    ${commissionNote}
    <p class="detail-pay">${statusBadge(view.status, view.label)} <span>${escapeHtml(payLine)}</span></p>
    <div class="pay-summary">
      <div><span>Subtotal</span><strong>${escapeHtml(formatMoney(totals.subtotal))}</strong></div>
      ${discount}
      <div><span>Total</span><strong>${escapeHtml(formatMoney(totals.total))}</strong></div>
    </div>
    ${cancelBtn}`
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisNovaVenda = {
    NEW_SALE_ENABLED,
    MARKETPLACE_SALE_ENABLED,
    MARKETPLACE_PLATFORMS,
    shouldShowNewSale,
    shouldShowMarketplaceSale,
    marketplaceLabel,
    isMarketplacePlatform,
    marketplacePlatformOf,
    isMarketplaceSale,
    marketplaceLine,
    roundMoney,
    commissionRateFor,
    monthCard,
    monthCardFromSummary,
    applyStockIssues,
    sumPaidChargesInMonth,
    chargedTotalFromSummary,
    currentYearMonth,
    filterPieces,
    togglePiece,
    setPieceQuantity,
    normalizeWhatsapp,
    formatWhatsapp,
    filterCustomers,
    customerPayload,
    saleTotals,
    buildCreateSaleBody,
    buildMarketplaceSaleBody,
    cancelMarketplaceOrderPayload,
    escapeHtml,
    renderRecentSales,
    renderSaleDetail,
    whatsappLink,
    saleDetailTotals
  }
}
