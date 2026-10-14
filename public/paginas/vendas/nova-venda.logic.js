// Regras da tela nova de venda. A flag nasce desligada: /vendas segue a tela atual.
export const NEW_SALE_ENABLED = false
export const COMMISSION_RATE = 0.3
export const PIX_DISCOUNT_RATE = 0.05

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
  return [...current, {
    id: piece.id,
    code: piece.code,
    name: piece.name,
    image_url: piece.image_url || "",
    unit_price: roundMoney(piece.unit_price),
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
  return String(value || "").replace(/\D/g, "").slice(0, 11)
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
  return { ok: true, customer: { name: cleanName, whatsapp: digits } }
}

export function saleTotals(pieces, paymentMethod) {
  const subtotal = roundMoney((pieces || []).reduce((sum, piece) => {
    return sum + roundMoney(piece.unit_price) * (Number(piece.quantity) || 0)
  }, 0))
  const discount = paymentMethod === "pix" ? roundMoney(subtotal * PIX_DISCOUNT_RATE) : 0
  return { subtotal, discount, total: roundMoney(subtotal - discount) }
}

export function buildCreateSaleBody({ sellerId, customer, paymentStatus, paymentMethod, pieces }) {
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
  return {
    ok: true,
    body: {
      seller_id: seller,
      customer: who.customer,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      items: pieces.map((piece) => ({ piece_id: piece.id, quantity: piece.quantity }))
    }
  }
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
  const priced = saleTotals(items, sale?.payment_method)
  const charged = Number.isFinite(Number(sale?.total)) ? roundMoney(sale.total) : priced.total
  const pix = sale?.payment_method === "pix"
  return {
    subtotal: priced.subtotal,
    discount: pix ? priced.discount : 0,
    total: charged,
    pix
  }
}

export function renderRecentSales(sales, formatMoney) {
  const rows = sales || []
  if (!rows.length) return `<p class="recent-empty">Nenhuma venda recente.</p>`
  return rows.map((sale) => {
    const paid = isPaidSale(sale)
    const status = paid ? "Pago" : "A receber"
    const method = METHOD_LABEL[sale.payment_method] || ""
    const when = formatSaleWhen(sale.created_at)
    const label = `Ver venda de ${sale.customer_name || "cliente"}`
    return `<button type="button" class="recent-sale" data-sale-id="${escapeHtml(sale.id)}" aria-label="${escapeHtml(label)}">
      <div class="recent-sale-main">
        <strong>${escapeHtml(sale.customer_name || "Cliente")}</strong>
        <span>${escapeHtml(when)}</span>
      </div>
      <div class="recent-sale-side">
        <b>${escapeHtml(formatMoney(sale.total))}</b>
        <span>${escapeHtml(method)} · ${status}</span>
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

export function renderSaleDetail(sale, formatMoney) {
  const paid = isPaidSale(sale)
  const status = paid ? "Pago" : "A receber"
  const method = METHOD_LABEL[sale?.payment_method] || ""
  const totals = saleDetailTotals(sale)
  const link = whatsappLink(sale?.customer_whatsapp)
  const whatsapp = formatWhatsapp(sale?.customer_whatsapp)
  const contact = link
    ? `<a class="whatsapp-link" href="${escapeHtml(link)}">${escapeHtml(whatsapp)}</a>`
    : `<span>Sem WhatsApp</span>`
  const pieces = (sale?.items || []).map((item) => {
    const line = roundMoney((Number(item.unit_price) || 0) * (Number(item.quantity) || 0))
    return `<article class="detail-piece">
      ${detailPhoto(item)}
      <span class="piece-copy">
        <strong>${escapeHtml(item.name || "Peça")}</strong>
        <small>${escapeHtml(item.code || "")} · Qtd ${Number(item.quantity) || 0}</small>
      </span>
      <b>${escapeHtml(formatMoney(line))}</b>
    </article>`
  }).join("")
  const discount = totals.pix
    ? `<div><span>Desconto Pix (5%)</span><strong>${escapeHtml(formatMoney(totals.discount))}</strong></div>`
    : ""
  return `<p class="flow-kicker">Venda</p>
    <h2 id="sale-modal-title">${escapeHtml(formatSaleDate(sale?.created_at))}</h2>
    <div class="detail-pieces">${pieces || `<p class="recent-empty">Sem peças nesta venda.</p>`}</div>
    <div class="detail-customer">
      <strong>${escapeHtml(sale?.customer_name || "Cliente")}</strong>
      ${contact}
    </div>
    <p class="detail-pay">${escapeHtml(method)} · ${status}</p>
    <div class="pay-summary">
      <div><span>Subtotal</span><strong>${escapeHtml(formatMoney(totals.subtotal))}</strong></div>
      ${discount}
      <div><span>Total</span><strong>${escapeHtml(formatMoney(totals.total))}</strong></div>
    </div>`
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisNovaVenda = {
    NEW_SALE_ENABLED,
    shouldShowNewSale,
    roundMoney,
    commissionRateFor,
    monthCard,
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
    escapeHtml,
    renderRecentSales,
    renderSaleDetail,
    whatsappLink,
    saleDetailTotals
  }
}
