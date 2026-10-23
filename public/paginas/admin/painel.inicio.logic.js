// Início, vendas, vendedoras e compras do painel.
// Preço de marketplace (ceilMarketplacePrice) fica em painel.logic.js — regra do #74.
import { shouldShowHomeChannels } from "./painel.logic.js"
import { copyDeliveryFields } from "./venda-edicao.logic.js"
import { escapeHtml, formatPrice } from "./painel.texto.logic.js"

export const NO_DATA = "sem dados ainda"

export const HOME_CHANNEL_ORDER = ["site", "equipe", "shopee", "mercado_livre", "tiktok"]

export function currentMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit"
  }).format(now)
  return parts.slice(0, 7)
}

const CHANNEL_LABELS = {
  site: "Site",
  equipe: "Equipe",
  marketplace: "Marketplace",
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  tiktok: "TikTok Shop"
}

export function channelLabel(channel) {
  const key = String(channel || "").trim().toLowerCase()
  return CHANNEL_LABELS[key] || String(channel || "")
}

export function moneyDelta(current, previous) {
  const a = Number(current)
  const b = Number(previous)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return Math.round((a - b) * 100) / 100
}

export function formatMoneyDelta(delta, formatMoney) {
  if (delta == null || !Number.isFinite(delta)) return ""
  if (delta === 0) return "igual ao mês anterior"
  const amount = formatMoney(Math.abs(delta))
  return delta > 0 ? `+${amount} vs mês anterior` : `−${amount} vs mês anterior`
}

export function formatWhen(iso) {
  const date = new Date(iso || "")
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export function money(value, formatMoney) {
  const number = Number(value)
  if (!Number.isFinite(number)) return formatMoney(0)
  return formatMoney(number)
}

function normalizeChannelRow(item) {
  return {
    channel: String(item?.channel || ""),
    orders: Number(item?.orders) || 0,
    charged_total: Number(item?.charged_total) || 0,
    profit_total: item?.profit_total == null ? null : Number(item.profit_total) || 0,
    previous_orders: item?.previous_orders == null ? null : Number(item.previous_orders) || 0,
    previous_charged_total: item?.previous_charged_total == null
      ? null
      : Number(item.previous_charged_total) || 0,
    previous_profit_total: item?.previous_profit_total == null
      ? null
      : Number(item.previous_profit_total) || 0
  }
}

function normalizeBestSeller(item) {
  const channels = Array.isArray(item?.channels)
    ? item.channels.map((row) => ({
      channel: String(row?.channel || ""),
      quantity: Number(row?.quantity) || 0,
      charged_total: Number(row?.charged_total) || 0
    }))
    : []
  return {
    code: item?.code || "",
    name: item?.name || "",
    quantity: Number(item?.quantity) || 0,
    charged_total: Number(item?.charged_total) || 0,
    channels
  }
}

export function normalizeOverview(data) {
  if (!data || data.ok === false || typeof data !== "object") return null
  const previousChannels = Array.isArray(data.previous?.channels)
    ? data.previous.channels.map(normalizeChannelRow)
    : []
  const previous = data.previous && typeof data.previous === "object"
    ? {
      month: String(data.previous.month || ""),
      charged_total: Number(data.previous.charged_total) || 0,
      profit_total: data.previous.profit_total == null ? null : Number(data.previous.profit_total) || 0,
      paid_count: Number(data.previous.paid_count) || 0,
      paid_orders_count: Number(data.previous.paid_orders_count) || 0,
      conversion: data.previous.conversion && typeof data.previous.conversion === "object"
        ? {
          orders_created: Number(data.previous.conversion.orders_created) || 0,
          orders_paid: Number(data.previous.conversion.orders_paid) || 0,
          conversion_rate: Number(data.previous.conversion.conversion_rate) || 0
        }
        : null,
      channels: previousChannels
    }
    : null
  const prevMap = new Map(previousChannels.map((row) => [row.channel, row]))
  const channels = (Array.isArray(data.channels) ? data.channels.map(normalizeChannelRow) : []).map((row) => {
    if (row.previous_charged_total != null || row.previous_orders != null) return row
    const prev = prevMap.get(row.channel)
    if (!prev) return row
    return {
      ...row,
      previous_orders: prev.orders,
      previous_charged_total: prev.charged_total,
      previous_profit_total: prev.profit_total
    }
  })
  return {
    month: String(data.month || ""),
    charged_total: Number(data.charged_total) || 0,
    profit_total: data.profit_total == null ? null : Number(data.profit_total) || 0,
    sales_goal: data.sales_goal == null ? 10000 : Number(data.sales_goal) || 10000,
    conversion: data.conversion && typeof data.conversion === "object"
      ? {
        orders_created: Number(data.conversion.orders_created) || 0,
        orders_paid: Number(data.conversion.orders_paid) || 0,
        conversion_rate: Number(data.conversion.conversion_rate) || 0,
        site_orders_created: Number(data.conversion.site_orders_created) || 0,
        site_orders_paid: Number(data.conversion.site_orders_paid) || 0,
        site_conversion_rate: Number(data.conversion.site_conversion_rate) || 0
      }
      : null,
    category_ranking: Array.isArray(data.category_ranking)
      ? data.category_ranking.map((row) => ({
        category: String(row?.category || "Outros"),
        profit_total: Number(row?.profit_total) || 0,
        charged_total: Number(row?.charged_total) || 0,
        quantity: Number(row?.quantity) || 0,
        margin_percent: Number(row?.margin_percent) || 0
      }))
      : [],
    receivables_overdue: data.receivables_overdue && typeof data.receivables_overdue === "object"
      ? {
        count: Number(data.receivables_overdue.count) || 0,
        total: Number(data.receivables_overdue.total) || 0
      }
      : null,
    paid_count: Number(data.paid_count) || 0,
    paid_orders_count: Number(data.paid_orders_count) || 0,
    daily_sales: Array.isArray(data.daily_sales)
      ? data.daily_sales.map((row) => ({
        date: String(row?.date || ""),
        day: Number(row?.day) || 0,
        total: Number(row?.total) || 0,
        orders_count: Number(row?.orders_count) || 0
      }))
      : [],
    previous,
    channels,
    best_sellers: Array.isArray(data.best_sellers) ? data.best_sellers.map(normalizeBestSeller) : []
  }
}

export function overviewHasDetailedChannels(overview) {
  const channels = overview?.channels || []
  return channels.some((item) =>
    item.channel === "shopee" || item.channel === "mercado_livre" || item.channel === "tiktok"
  )
}

export function orderedHomeChannels(channels) {
  const map = new Map((channels || []).map((item) => [item.channel, item]))
  return HOME_CHANNEL_ORDER.map((channel) => map.get(channel) || {
    channel,
    orders: 0,
    charged_total: 0,
    profit_total: 0,
    previous_orders: 0,
    previous_charged_total: 0,
    previous_profit_total: 0
  })
}

function bestSellerChannelHint(item) {
  const parts = (item?.channels || [])
    .filter((row) => (Number(row.quantity) || 0) > 0)
    .map((row) => `${channelLabel(row.channel)} ${Number(row.quantity) || 0}`)
  return parts.join(" · ")
}

export function normalizeRecentSales(data) {
  if (!data || data.ok === false) return null
  const sales = Array.isArray(data.sales) ? data.sales : []
  return sales.map((sale) => {
    const items = Array.isArray(sale.items)
      ? sale.items.map((item) => ({
        id: item?.id ?? null,
        code: String(item?.code || item?.product_code || ""),
        name: String(item?.name || item?.product_name || ""),
        quantity: Number(item?.quantity) || 0,
        unit_price: item?.unit_price == null ? null : Number(item.unit_price),
        line_total: item?.line_total == null ? null : Number(item.line_total),
        image_url: String(item?.image_url || "").trim(),
        legacy_sale_id: item?.legacy_sale_id == null ? null : Number(item.legacy_sale_id)
      }))
      : []
    return {
      id: sale.id,
      created_at: sale.created_at || sale.paid_at || "",
      seller_id: sale.seller_id == null || sale.seller_id === "" ? null : Number(sale.seller_id),
      seller_name: sale.seller_name || "",
      channel: sale.channel || "",
      customer_name: sale.customer_name || "",
      total: sale.total,
      payment_status: sale.payment_status || "",
      payment_method: sale.payment_method || "",
      ...copyDeliveryFields(sale),
      items_count: Number(sale.items_count) || items.length || 0,
      image_url: String(sale.image_url || "").trim(),
      items
    }
  })
}

export function normalizeSellersMonth(data) {
  if (!data || data.ok === false || !Array.isArray(data.sellers)) return null
  const sellers = data.sellers.map((seller, idx) => ({
    seller_id: seller.seller_id,
    name: seller.name || "Vendedora",
    month_ready: true,
    paid_count: Number(seller.paid_count) || 0,
    paid_orders_count: Number(seller.paid_orders_count) || 0,
    charged_total: Number(seller.charged_total) || 0,
    commission_amount: Number(seller.commission_amount) || 0,
    commission_percent: seller.commission_percent == null ? null : Number(seller.commission_percent),
    balance: seller.balance == null || seller.balance === "" ? null : Number(seller.balance),
    average_ticket: Number(seller.average_ticket) || (Number(seller.paid_orders_count) > 0 ? Math.round((Number(seller.charged_total) / Number(seller.paid_orders_count)) * 100) / 100 : 0),
    rank: Number(seller.rank) || (idx + 1),
    sem_comissao: Boolean(seller.sem_comissao)
  }))

  const teamTotals = data.team_totals || {
    total_charged: sellers.reduce((acc, s) => acc + s.charged_total, 0),
    total_commission: sellers.reduce((acc, s) => acc + s.commission_amount, 0),
    paid_orders_count: sellers.reduce((acc, s) => acc + s.paid_orders_count, 0),
    paid_units_count: sellers.reduce((acc, s) => acc + s.paid_count, 0),
    total_balance: sellers.reduce((acc, s) => acc + (s.balance || 0), 0),
    active_sellers_count: sellers.length
  }

  sellers.team_totals = teamTotals
  sellers.month = data.month
  sellers.timezone = data.timezone
  return sellers
}

export function sellersFromDirectory(sellers) {
  if (!Array.isArray(sellers)) return null
  return sellers.map((seller) => ({
    seller_id: seller.id,
    name: seller.name || "Vendedora",
    month_ready: false,
    balance: null
  }))
}

export function paymentLabel(method) {
  if (method === "pix") return "Pix"
  if (method === "dinheiro") return "Dinheiro"
  if (method === "cartao") return "Cartão"
  return ""
}

export function statusLabel(status) {
  if (status === "paid") return "Paga"
  if (status === "partial") return "Parcial"
  if (status === "receivable") return "A receber"
  return ""
}

export function renderOriginStrip(channelRows, selectedChannel, formatMoney, detailed) {
  if (!channelRows.length) return `<p class="empty">${NO_DATA}</p>`
  return `<div class="origin-strip ui-card-grid" role="list">${channelRows.map((item) => {
    const active = selectedChannel && selectedChannel === item.channel
    const delta = detailed && item.previous_charged_total != null
      ? formatMoneyDelta(moneyDelta(item.charged_total, item.previous_charged_total), formatMoney)
      : ""
    const profitText = item.profit_total != null && Number.isFinite(item.profit_total)
      ? `<small class="origin-card__profit">Lucro: ${escapeHtml(money(item.profit_total, formatMoney))}</small>`
      : ""
    return `<button type="button" class="origin-card" role="listitem" data-origin="${escapeHtml(item.channel)}" aria-pressed="${active ? "true" : "false"}">
      <span class="origin-card__name">${escapeHtml(channelLabel(item.channel))}</span>
      <b class="origin-card__total">${escapeHtml(money(item.charged_total, formatMoney))}</b>
      <small class="origin-card__meta">${Number(item.orders) || 0} pedidos</small>
      ${profitText}
      ${delta ? `<small class="delta origin-card__delta">${escapeHtml(delta)}</small>` : ""}
    </button>`
  }).join("")}</div>`
}

export function computeSalesGoalProgress(chargedTotal, salesGoal) {
  const total = Math.max(0, Number(chargedTotal) || 0)
  const goal = Math.max(0, Number(salesGoal) || 0)
  if (goal <= 0) return { percent: 0, rawPercent: 0, remaining: 0, reached: true }
  const rawPercent = Math.round((total / goal) * 100)
  const percent = Math.min(100, rawPercent)
  const remaining = Math.max(0, goal - total)
  return {
    percent,
    rawPercent,
    remaining,
    reached: total >= goal
  }
}

export function renderGoalBar(chargedTotal, salesGoal, formatMoney = formatPrice) {
  const goal = Number(salesGoal) || 10000
  const progress = computeSalesGoalProgress(chargedTotal, goal)
  const goalFormatted = formatMoney(goal)
  const remainingFormatted = formatMoney(progress.remaining)
  const statusText = progress.reached
    ? `🎉 Meta atingida! (${progress.rawPercent}%)`
    : `${progress.percent}% da meta de ${goalFormatted} · Faltam ${remainingFormatted}`

  return `<div class="goal-widget" id="goal-widget">
    <div class="goal-widget__header">
      <span class="goal-widget__title"><strong>Meta do mês:</strong> ${escapeHtml(goalFormatted)}</span>
      <button type="button" class="btn-ghost btn-sm" id="btn-edit-goal" aria-label="Editar meta mensal">✏️ Editar meta</button>
    </div>
    <div class="goal-widget__bar-track" role="progressbar" aria-valuenow="${progress.percent}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso da meta">
      <div class="goal-widget__bar-fill${progress.reached ? " goal-widget__bar-fill--reached" : ""}" style="width: ${progress.percent}%"></div>
    </div>
    <div class="goal-widget__footer">
      <small class="goal-widget__hint">${escapeHtml(statusText)}</small>
    </div>
  </div>`
}

export function renderOverdueAlert(overdueData, formatMoney = formatPrice) {
  const count = Number(overdueData?.count) || 0
  const total = Number(overdueData?.total) || 0
  if (count <= 0) return ""
  const totalFormatted = formatMoney(total)
  return `<aside class="overdue-banner" role="alert">
    <div class="overdue-banner__content">
      <span class="overdue-banner__icon" aria-hidden="true">⚠️</span>
      <div class="overdue-banner__text">
        <strong>${count} ${count === 1 ? "venda a receber" : "vendas a receber"} há mais de 7 dias</strong>
        <p>Total em aberto: <b>${escapeHtml(totalFormatted)}</b>. Acompanhe a cobrança para não perder vendas.</p>
      </div>
    </div>
    <a href="/admin/vendas?status=receivable" class="btn-secondary btn-sm overdue-banner__action">Ver vendas a receber</a>
  </aside>`
}

export function generateSalesCsv(sales) {
  const rows = Array.isArray(sales) ? sales : []
  const headers = [
    "Data",
    "Pedido",
    "Canal",
    "Cliente",
    "Vendedora",
    "Status",
    "Forma de Pagamento",
    "Qtd Peças",
    "Itens",
    "Valor Total (R$)"
  ]

  const escapeCsv = (val) => {
    const text = String(val ?? "").trim()
    if (text.includes(";") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const lines = [headers.join(";")]

  for (const sale of rows) {
    const dateFormatted = formatWhen(sale.created_at)
    const orderId = sale.id != null ? `#${sale.id}` : ""
    const channel = channelLabel(sale.channel)
    const customer = sale.customer_name || "Cliente"
    const seller = sale.seller_name || ""
    const status = statusLabel(sale.payment_status) || sale.payment_status || ""
    const payment = paymentLabel(sale.payment_method) || sale.payment_method || ""
    const itemsCount = sale.items_count || (Array.isArray(sale.items) ? sale.items.length : 0)

    const itemsSummary = Array.isArray(sale.items) && sale.items.length > 0
      ? sale.items.map((i) => `${i.code || i.product_code || "Peça"} (${i.quantity || 1}x)`).join(", ")
      : ""

    const totalNumber = Number(sale.total) || 0
    const totalFormatted = totalNumber.toFixed(2).replace(".", ",")

    lines.push([
      escapeCsv(dateFormatted),
      escapeCsv(orderId),
      escapeCsv(channel),
      escapeCsv(customer),
      escapeCsv(seller),
      escapeCsv(status),
      escapeCsv(payment),
      escapeCsv(itemsCount),
      escapeCsv(itemsSummary),
      escapeCsv(totalFormatted)
    ].join(";"))
  }

  return "\uFEFF" + lines.join("\r\n")
}

export function downloadCsvFile(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename || `vendas-maris-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function renderBestSellersBlock(bestSellers, detailed) {
  if (!bestSellers.length) return `<p class="empty">${NO_DATA}</p>`
  return `<ul class="plain-list best-list">${bestSellers.map((item) => {
    const code = item.code || ""
    const split = detailed ? bestSellerChannelHint(item) : ""
    const meta = [code, split].filter(Boolean).join(" · ")
    return `<li class="best-row">
      <span><strong>${escapeHtml(item.name || item.code || "Peça")}</strong>
        <small>${escapeHtml(meta)}</small></span>
      <b>${Number(item.quantity) || 0} un.</b>
    </li>`
  }).join("")}</ul>`
}

export function renderConversionCard(conversion, previousConversion) {
  if (!conversion || typeof conversion !== "object") return ""
  const rate = Number(conversion.conversion_rate) || 0
  const total = Number(conversion.orders_created) || 0
  const paid = Number(conversion.orders_paid) || 0
  const detail = total > 0
    ? `${paid} de ${total} pedidos pagos`
    : "Nenhum pedido no mês"

  let deltaHtml = ""
  if (previousConversion && previousConversion.orders_created > 0 && previousConversion.conversion_rate != null) {
    const prevRate = Number(previousConversion.conversion_rate) || 0
    const diff = Math.round((rate - prevRate) * 10) / 10
    if (diff > 0) {
      deltaHtml = `<small class="delta hero-conversion-card__delta">+${diff}% vs mês anterior</small>`
    } else if (diff < 0) {
      deltaHtml = `<small class="delta hero-conversion-card__delta">−${Math.abs(diff)}% vs mês anterior</small>`
    } else {
      deltaHtml = `<small class="delta hero-conversion-card__delta">igual ao mês anterior</small>`
    }
  }

  let siteDetail = ""
  if (conversion.site_orders_created > 0) {
    const siteRate = Number(conversion.site_conversion_rate) || 0
    siteDetail = `<small class="hero-conversion-card__sub">Site: ${siteRate}% (${conversion.site_orders_paid}/${conversion.site_orders_created})</small>`
  }

  return `<div class="hero-conversion-card">
    <small class="hero-conversion-card__label">Conversão</small>
    <b class="hero-conversion-card__value">${rate}%</b>
    <small class="hero-conversion-card__detail">${escapeHtml(detail)}</small>
    ${siteDetail}
    ${deltaHtml}
  </div>`
}

export function renderCategoryRanking(categoryRanking, formatMoney = formatPrice) {
  const rows = Array.isArray(categoryRanking) ? categoryRanking : []
  if (!rows.length) return `<p class="empty">${NO_DATA}</p>`

  const maxProfit = Math.max(...rows.map((c) => Number(c.profit_total) || 0), 1)

  return `<ul class="plain-list category-rank-list">${rows.map((item, idx) => {
    const profit = Number(item.profit_total) || 0
    const charged = Number(item.charged_total) || 0
    const qty = Number(item.quantity) || 0
    const margin = item.margin_percent != null && Number.isFinite(Number(item.margin_percent))
      ? `${item.margin_percent}% margem`
      : ""
    const ratio = Math.max(0, Math.min(100, Math.round((profit / maxProfit) * 100)))

    return `<li class="category-rank-row">
      <div class="category-rank-row__header">
        <span class="category-rank-row__name">
          <span class="category-rank-row__badge">#${idx + 1}</span>
          <strong>${escapeHtml(item.category || "Outros")}</strong>
          <small>${qty} un. · Faturamento: ${escapeHtml(money(charged, formatMoney))}</small>
        </span>
        <span class="category-rank-row__values">
          <b class="category-rank-row__profit">Lucro: ${escapeHtml(money(profit, formatMoney))}</b>
          ${margin ? `<small class="category-rank-row__margin">${escapeHtml(margin)}</small>` : ""}
        </span>
      </div>
      <div class="category-rank-row__bar-track" aria-hidden="true">
        <div class="category-rank-row__bar-fill" style="width: ${ratio}%"></div>
      </div>
    </li>`
  }).join("")}</ul>`
}

export function computeAverageTicket(chargedTotal, ordersCount) {
  const total = Math.max(0, Number(chargedTotal) || 0)
  const orders = Math.max(0, Number(ordersCount) || 0)
  return orders > 0 ? Math.round((total / orders) * 100) / 100 : 0
}

export function stepMonth(monthKey, step = 1) {
  const key = String(monthKey || "").trim()
  if (!/^\d{4}-\d{2}$/.test(key)) return currentMonthKey()
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5, 7)) - 1
  const d = new Date(Date.UTC(year, month + step, 1))
  const nextYear = d.getUTCFullYear()
  const nextMonth = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${nextYear}-${nextMonth}`
}

export function formatTicketDelta(currentTicket, previousTicket, formatMoney = formatPrice) {
  if (previousTicket == null || !Number.isFinite(previousTicket) || previousTicket <= 0) return ""
  const delta = moneyDelta(currentTicket, previousTicket)
  if (delta == null || !Number.isFinite(delta)) return ""
  if (delta === 0) return "igual ao mês anterior"
  const amount = formatMoney(Math.abs(delta))
  return delta > 0 ? `+${amount} vs mês anterior` : `−${amount} vs mês anterior`
}

export function renderTicketCard(chargedTotal, paidOrdersCount, previousChargedTotal, previousPaidOrdersCount, formatMoney = formatPrice) {
  const ticket = computeAverageTicket(chargedTotal, paidOrdersCount)
  const prevTicket = previousPaidOrdersCount != null
    ? computeAverageTicket(previousChargedTotal, previousPaidOrdersCount)
    : null
  const deltaText = prevTicket != null && prevTicket > 0 ? formatTicketDelta(ticket, prevTicket, formatMoney) : ""

  return `<div class="hero-ticket-card">
    <small class="hero-ticket-card__label">Ticket médio</small>
    <b class="hero-ticket-card__value">${escapeHtml(money(ticket, formatMoney))}</b>
    <small class="hero-ticket-card__detail">por pedido pago</small>
    ${deltaText ? `<small class="delta hero-ticket-card__delta">${escapeHtml(deltaText)}</small>` : ""}
  </div>`
}

const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export function formatMonthLabel(yyyyMm) {
  const match = /^(\d{4})-(\d{2})/.exec(String(yyyyMm || "").trim())
  if (!match) return ""
  const name = MONTH_NAMES_PT[Number(match[2]) - 1]
  return name ? `${name} ${match[1]}` : ""
}

export function renderPeriodFilter(selectedMonth, currentMonth = currentMonthKey()) {
  const month = String(selectedMonth || currentMonth).trim()
  const isCurrent = month === currentMonth
  const label = formatMonthLabel(month) || month
  return `<div class="inicio-period-bar ui-period">
    <button type="button" id="btn-prev-month" class="ui-period__btn" aria-label="Mês anterior" title="Mês anterior">◀</button>
    <span class="ui-period__label" aria-live="polite">${escapeHtml(label)}</span>
    <button type="button" id="btn-next-month" class="ui-period__btn" aria-label="Próximo mês" title="Próximo mês">▶</button>
    <input type="month" id="inicio-month-input" value="${escapeHtml(month)}" class="inicio-month-input" aria-label="Selecionar mês" hidden>
    ${!isCurrent ? `<button type="button" id="btn-current-month" class="ui-period__today" title="Ir para o mês atual">Hoje</button>` : ""}
  </div>`
}

export const CHANNEL_COLORS = {
  site: { fill: "#7c3aed", label: "Site" },
  equipe: { fill: "#db2777", label: "Equipe" },
  shopee: { fill: "#ea580c", label: "Shopee" },
  mercado_livre: { fill: "#eab308", label: "Mercado Livre" },
  tiktok: { fill: "#0f172a", label: "TikTok Shop" }
}

export function renderDailySalesChart(dailySales = [], formatMoney = formatPrice, month = "") {
  const targetMonth = String(month || currentMonthKey()).slice(0, 7)
  const [yStr, mStr] = targetMonth.split("-")
  const year = Number(yStr) || new Date().getFullYear()
  const mon = Number(mStr) || (new Date().getMonth() + 1)
  const totalDays = new Date(year, mon, 0).getDate()

  const salesMap = new Map()
  if (Array.isArray(dailySales)) {
    for (const item of dailySales) {
      if (item && item.day != null) {
        salesMap.set(Number(item.day), item)
      }
    }
  }

  const days = []
  let maxTotal = 0
  let monthTotal = 0
  const todayStr = new Date().toISOString().slice(0, 10)

  for (let d = 1; d <= totalDays; d++) {
    const existing = salesMap.get(d)
    const total = existing ? Number(existing.total) || 0 : 0
    const orders_count = existing ? Number(existing.orders_count) || 0 : 0
    const date = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    if (total > maxTotal) maxTotal = total
    monthTotal += total
    days.push({ day: d, date, total, orders_count })
  }

  const chartCeil = maxTotal > 0 ? maxTotal : 100
  const svgWidth = 600
  const svgHeight = 160
  const chartTop = 25
  const chartBottom = 130
  const chartHeight = chartBottom - chartTop
  const chartLeft = 15
  const chartRight = 585
  const usableWidth = chartRight - chartLeft
  const step = usableWidth / totalDays
  const barWidth = Math.max(3, Math.min(14, step - 3))

  const midVal = chartCeil / 2
  const midY = chartTop + chartHeight / 2
  const gridlines = `
    <line x1="${chartLeft}" y1="${chartTop}" x2="${chartRight}" y2="${chartTop}" class="chart-gridline" />
    <line x1="${chartLeft}" y1="${midY}" x2="${chartRight}" y2="${midY}" class="chart-gridline" />
    <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" class="chart-baseline" />
    <text x="${chartRight}" y="${chartTop - 4}" class="chart-grid-label" text-anchor="end">${escapeHtml(money(chartCeil, formatMoney))}</text>
    <text x="${chartRight}" y="${midY - 4}" class="chart-grid-label" text-anchor="end">${escapeHtml(money(midVal, formatMoney))}</text>
  `

  const bars = days.map((d, index) => {
    const x = chartLeft + (index * step) + (step - barWidth) / 2
    const barH = d.total > 0 ? Math.max(4, Math.round((d.total / chartCeil) * chartHeight)) : 2
    const y = chartBottom - barH
    const isToday = d.date === todayStr
    const hasSales = d.total > 0
    const cls = ["chart-bar", hasSales ? "chart-bar--active" : "chart-bar--zero", isToday ? "chart-bar--today" : ""].filter(Boolean).join(" ")
    const titleText = `Dia ${d.day}: ${money(d.total, formatMoney)} (${d.orders_count} pedido${d.orders_count === 1 ? "" : "s"})${isToday ? " — Hoje" : ""}`
    
    const showLabel = d.day === 1 || d.day === 5 || d.day === 10 || d.day === 15 || d.day === 20 || d.day === 25 || d.day === totalDays
    const labelSvg = showLabel ? `<text x="${(x + barWidth / 2).toFixed(1)}" y="${chartBottom + 16}" class="chart-axis-label">${d.day}</text>` : ""

    return `<g class="chart-day-group">
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" ry="2" class="${cls}" tabindex="0" role="graphics-symbol" aria-label="${escapeHtml(titleText)}">
        <title>${escapeHtml(titleText)}</title>
      </rect>
      ${labelSvg}
    </g>`
  }).join("")

  return `<div class="chart-container chart-container--daily">
    <svg class="daily-sales-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="Gráfico de faturamento diário de ${escapeHtml(targetMonth)}">
      ${gridlines}
      ${bars}
    </svg>
    <div class="chart-daily-summary">
      <small class="chart-summary-stat">Pico: <b>${escapeHtml(money(maxTotal, formatMoney))}</b></small>
      <small class="chart-summary-stat">Média diária: <b>${escapeHtml(money(monthTotal / totalDays, formatMoney))}</b></small>
    </div>
  </div>`
}

export function renderChannelShareChart(channels = [], formatMoney = formatPrice) {
  const rows = Array.isArray(channels) ? channels : []
  const totalCharged = rows.reduce((acc, row) => acc + (Number(row?.charged_total) || 0), 0)

  if (totalCharged <= 0) {
    return `<div class="channel-share-empty">
      <div class="channel-bar-empty"></div>
      <p class="hint">Nenhuma venda registrada nos canais este mês.</p>
    </div>`
  }

  const segments = rows.map((row) => {
    const channel = String(row?.channel || "outros")
    const total = Number(row?.charged_total) || 0
    const orders = Number(row?.orders) || 0
    const pct = (total / totalCharged) * 100
    const meta = CHANNEL_COLORS[channel] || { fill: "#64748b", label: channelLabel(channel) }
    return {
      channel,
      label: meta.label,
      fill: meta.fill,
      total,
      orders,
      pct,
      pctFormatted: Math.round(pct)
    }
  }).filter((seg) => seg.total > 0)

  let cumulativePct = 0
  const barSegments = segments.map((seg) => {
    const x = cumulativePct
    const width = seg.pct
    cumulativePct += seg.pct
    const title = `${seg.label}: ${money(seg.total, formatMoney)} (${seg.pct.toFixed(1)}%) · ${seg.orders} pedido(s)`
    return `<rect x="${x.toFixed(2)}%" y="0" width="${width.toFixed(2)}%" height="24" fill="${seg.fill}" class="channel-segment" tabindex="0" role="graphics-symbol" aria-label="${escapeHtml(title)}">
      <title>${escapeHtml(title)}</title>
    </rect>`
  }).join("")

  const legendItems = segments.map((seg) => `
    <div class="channel-legend-item">
      <span class="channel-legend-dot" style="background-color: ${seg.fill};"></span>
      <span class="channel-legend-name">${escapeHtml(seg.label)}</span>
      <b class="channel-legend-pct">${seg.pct.toFixed(1)}%</b>
      <small class="channel-legend-val">${escapeHtml(money(seg.total, formatMoney))}</small>
    </div>
  `).join("")

  return `<div class="chart-container chart-container--channels">
    <svg class="channel-share-bar" viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="Divisão de vendas por canal">
      <clipPath id="channel-bar-clip">
        <rect x="0" y="0" width="100%" height="24" rx="6" ry="6" />
      </clipPath>
      <g clip-path="url(#channel-bar-clip)">
        ${barSegments}
      </g>
    </svg>
    <div class="channel-legend-grid">
      ${legendItems}
    </div>
  </div>`
}

