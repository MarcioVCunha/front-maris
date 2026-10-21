// Telas Início, Vendas, Vendedoras e Compras.
import { entityPhotoHtml } from "./painel-entity.logic.js"
import { shouldShowHomeChannels } from "./painel.logic.js"
import { escapeHtml, formatPrice } from "./painel.texto.logic.js"
import {
  NO_DATA,
  currentMonthKey,
  channelLabel,
  formatWhen,
  money,
  moneyDelta,
  formatMoneyDelta,
  orderedHomeChannels,
  overviewHasDetailedChannels,
  normalizeOverview,
  normalizeRecentSales,
  paymentLabel,
  statusLabel,
  renderOriginStrip,
  renderOverdueAlert,
  renderGoalBar,
  renderPeriodFilter,
  renderBestSellersBlock,
  renderConversionCard,
  renderCategoryRanking,
  renderTicketCard,
  renderDailySalesChart,
  renderChannelShareChart,
  normalizeSellersMonth,
  sellersFromDirectory
} from "./painel.inicio.logic.js"

/**
 * Início: totais do mês + origem em faixa horizontal.
 * options.selectedChannel: filtra vendas no lugar de Mais vendidas.
 * options.sales: lista de admin-recent-sales (já normalizada).
 * options.renderSales: renderer de cards (injetável; padrão vem de venda-edicao).
 */
export function renderInicio(overview, formatMoney = formatPrice, options = {}) {
  const data = overview && overview.month != null && overview.channels ? overview : normalizeOverview(overview)
  if (!data) return `<p class="empty">${NO_DATA}</p>`
  const detailed = shouldShowHomeChannels(options.enabled) && overviewHasDetailedChannels(data)
  const channelRows = detailed ? orderedHomeChannels(data.channels) : data.channels
  const selected = String(options.selectedChannel || "").trim()
  const monthDelta = detailed && data.previous
    ? formatMoneyDelta(moneyDelta(data.charged_total, data.previous.charged_total), formatMoney)
    : ""
  const origins = renderOriginStrip(channelRows, selected, formatMoney, detailed)
  const overdueBanner = renderOverdueAlert(data.receivables_overdue, formatMoney)
  const goalBar = renderGoalBar(data.charged_total, data.sales_goal, formatMoney)
  const periodBar = renderPeriodFilter(data.month, currentMonthKey())

  let profitHero = ""
  if (data.profit_total != null && Number.isFinite(data.profit_total)) {
    const margin = data.charged_total > 0
      ? Math.round((data.profit_total / data.charged_total) * 100)
      : 0
    profitHero = `<div class="hero-profit-card">
      <small class="hero-profit-card__label">Lucro do mês</small>
      <b class="hero-profit-card__value">${escapeHtml(money(data.profit_total, formatMoney))}</b>
      <small class="hero-profit-card__margin">${margin}% de margem bruta</small>
    </div>`
  }

  const ticketHero = renderTicketCard(
    data.charged_total,
    data.paid_orders_count,
    detailed ? data.previous?.charged_total : null,
    detailed ? data.previous?.paid_orders_count : null,
    formatMoney
  )

  const conversionHero = renderConversionCard(data.conversion, data.previous?.conversion)

  let secondaryTitle = "Mais vendidas"
  let secondaryBody = renderBestSellersBlock(data.best_sellers, detailed)
  let categoriesSection = ""
  if (selected) {
    secondaryTitle = `Vendas · ${channelLabel(selected)}`
    const sales = Array.isArray(options.sales) ? options.sales : []
    const filtered = sales.filter((sale) => String(sale?.channel || "") === selected)
    if (typeof options.renderSales === "function") {
      secondaryBody = options.renderSales(filtered, formatMoney)
    } else {
      secondaryBody = filtered.length
        ? `<ul class="sale-card-list ui-card-grid">${filtered.map((sale) => `<li><article class="sale-card sale-card--static">
            <span class="sale-card__copy"><strong>${escapeHtml(sale.customer_name || "Cliente")}</strong>
              <small>${escapeHtml([sale.seller_name, formatWhen(sale.created_at)].filter(Boolean).join(" · "))}</small></span>
            <span class="sale-card__side"><b>${escapeHtml(money(sale.total, formatMoney))}</b>
              <small>${escapeHtml(statusLabel(sale.payment_status))}</small></span>
          </article></li>`).join("")}</ul>`
        : `<p class="empty">Nenhuma venda neste canal.</p>`
    }
  } else {
    categoriesSection = `<div class="inicio-categories-section">
      <h2>Categorias por lucro</h2>
      <div id="inicio-category-ranking">${renderCategoryRanking(data.category_ranking, formatMoney)}</div>
    </div>`
  }

  const chartsSection = `<section class="inicio-charts-section" aria-label="Desempenho visual das vendas">
    <div class="inicio-charts-grid">
      <div class="inicio-chart-card">
        <div class="inicio-chart-card__header">
          <h3>Evolução diária</h3>
          <span class="chart-subtitle">Faturamento por dia</span>
        </div>
        ${renderDailySalesChart(data.daily_sales, formatMoney, data.month)}
      </div>
      <div class="inicio-chart-card">
        <div class="inicio-chart-card__header">
          <h3>Divisão por canal</h3>
          <span class="chart-subtitle">Participação percentual</span>
        </div>
        ${renderChannelShareChart(data.channels, formatMoney)}
      </div>
    </div>
  </section>`

  return `<section class="report report--inicio">
    ${overdueBanner}
    <header class="inicio-hero">
      ${periodBar}
      <div class="inicio-hero__header">
        <div class="inicio-hero__main">
          <h2>Vendas do mês</h2>
          <p class="stat">${escapeHtml(money(data.charged_total, formatMoney))}</p>
          <p class="hint">${data.paid_count} peças · ${data.paid_orders_count} pedidos${data.month ? ` · ${escapeHtml(data.month)}` : ""}</p>
          ${monthDelta ? `<p class="hint delta">${escapeHtml(monthDelta)}</p>` : ""}
        </div>
        <div class="inicio-hero__cards">
          ${profitHero}
          ${ticketHero}
          ${conversionHero}
        </div>
      </div>
      ${goalBar}
    </header>
    ${chartsSection}
    <div class="inicio-actions-bar">
      <h2>Origem</h2>
      <div class="inicio-actions-buttons">
        <button type="button" id="btn-send-weekly-summary" class="btn-ghost btn-sm" title="Enviar resumo semanal por e-mail para Marcio Cunha">📧 Resumo semanal por e-mail</button>
        <button type="button" id="btn-export-sales-csv" class="btn-ghost btn-sm" title="Baixar relatório de vendas do mês em CSV">📥 Exportar vendas (CSV)</button>
      </div>
    </div>
    <p class="hint origin-hint">Toque para filtrar as vendas.</p>
    ${origins}
    <section class="inicio-secondary-section">
      <h2 id="inicio-secondary-title">${escapeHtml(secondaryTitle)}</h2>
      <div id="inicio-secondary" class="inicio-secondary-body">${secondaryBody}</div>
    </section>
    ${categoriesSection}
  </section>`
}

export const SALE_STATUS_FILTERS = [
  { id: "all", label: "Todas" },
  { id: "receivable", label: "A receber" },
  { id: "paid", label: "Pagas" },
  { id: "cancelled", label: "Canceladas" }
]

export function renderSalesStatusFilter(selectedStatus = "all") {
  const active = String(selectedStatus || "all").trim().toLowerCase()
  return `<div class="sale-status-filter ui-pills" role="tablist" aria-label="Filtrar por status">${SALE_STATUS_FILTERS.map((item) => {
    const pressed = item.id === active
    return `<button type="button" class="status-filter-btn${pressed ? " status-filter-btn--active" : ""}" data-status="${escapeHtml(item.id)}" role="tab" aria-selected="${pressed ? "true" : "false"}">${escapeHtml(item.label)}</button>`
  }).join("")}</div>`
}

export function renderVendas(sales, formatMoney = formatPrice, options = {}) {
  const selectedStatus = options.selectedStatus || "all"
  const filterToolbar = renderSalesStatusFilter(selectedStatus)
  const exportBtn = `<button type="button" id="btn-export-sales-vendas" class="btn-ghost btn-sm" title="Exportar lista de vendas em CSV">📥 Exportar vendas (CSV)</button>`
  const rows = Array.isArray(sales) ? sales : normalizeRecentSales(sales)
  const toolbarHeader = `<div class="sales-toolbar-row">${filterToolbar}${exportBtn}</div>`
  if (!rows) return `<section class="report"><h2>Vendas recentes</h2>${toolbarHeader}<div id="sales-results"><p class="empty">${NO_DATA}</p></div></section>`
  const filtered = typeof options.filterSales === "function"
    ? options.filterSales(rows, selectedStatus)
    : rows
  const emptyMessage = selectedStatus === "receivable"
    ? "Nenhuma venda a receber."
    : selectedStatus === "paid"
    ? "Nenhuma venda paga."
    : selectedStatus === "cancelled"
    ? "Nenhuma venda cancelada."
    : "Nenhuma venda recente."
  const body = !filtered.length
    ? `<p class="empty">${emptyMessage}</p>`
    : typeof options.renderSales === "function"
    ? options.renderSales(filtered, formatMoney)
    : filtered.map((sale) => {
      const who = [sale.seller_name, channelLabel(sale.channel)].filter(Boolean).join(" · ")
      const pay = [statusLabel(sale.payment_status), paymentLabel(sale.payment_method)].filter(Boolean).join(" · ")
      return `<article class="sale-row">
        <span><strong>${escapeHtml(sale.customer_name || "Cliente")}</strong>
          <small>${escapeHtml(who)}</small></span>
        <span class="piece-side"><b>${escapeHtml(money(sale.total, formatMoney))}</b>
          <small>${escapeHtml([formatWhen(sale.created_at), pay].filter(Boolean).join(" · "))}</small></span>
      </article>`
    }).join("")
  return `<section class="report"><h2>Vendas recentes</h2>${toolbarHeader}<div id="sales-results">${body}</div></section>`
}

export function renderVendedoras(sellers, formatMoney = formatPrice, options = {}) {
  const normalized = Array.isArray(sellers) ? sellers : normalizeSellersMonth(sellers)
  if (!normalized) return `<p class="empty">${NO_DATA}</p>`
  const rows = Array.isArray(normalized) ? normalized : (normalized.sellers || [])
  if (!rows.length) return `<p class="empty">Nenhuma vendedora ativa.</p>`

  const selectedMonth = options.month || normalized.month || options.selectedMonth
  const periodBar = options.showPeriod !== false && selectedMonth
    ? renderPeriodFilter(selectedMonth, currentMonthKey())
    : ""

  const hasAnyMonthData = rows.some((s) => s.month_ready)
  let teamSummary = ""
  if (hasAnyMonthData) {
    const teamTotals = options.teamTotals || normalized.team_totals || {
      total_charged: rows.reduce((acc, s) => acc + (Number(s.charged_total) || 0), 0),
      total_commission: rows.reduce((acc, s) => acc + (Number(s.commission_amount) || 0), 0),
      paid_orders_count: rows.reduce((acc, s) => acc + (Number(s.paid_orders_count) || 0), 0),
      paid_units_count: rows.reduce((acc, s) => acc + (Number(s.paid_count) || 0), 0),
      total_balance: rows.reduce((acc, s) => acc + (Number(s.balance) || 0), 0),
    }

    teamSummary = `<section class="team-summary-banner">
      <div class="team-summary-card">
        <span class="team-summary-label">Vendas</span>
        <strong class="team-summary-val">${money(teamTotals.total_charged, formatMoney)}</strong>
        <small class="team-summary-sub">${teamTotals.paid_units_count} peças · ${teamTotals.paid_orders_count} pedidos</small>
      </div>
      <div class="team-summary-card">
        <span class="team-summary-label">Comissões</span>
        <strong class="team-summary-val team-summary-val--highlight">${money(teamTotals.total_commission, formatMoney)}</strong>
        <small class="team-summary-sub">no período</small>
      </div>
      <div class="team-summary-card">
        <span class="team-summary-label">A receber</span>
        <strong class="team-summary-val">${money(teamTotals.total_balance, formatMoney)}</strong>
        <small class="team-summary-sub">de clientes</small>
      </div>
    </section>`
  }

  const selectedId = options.selectedSellerId
  const maxCharged = Math.max(...rows.map((r) => Number(r.charged_total) || 0), 1)

  const cards = rows.map((seller, idx) => {
    const rank = Number(seller.rank) || (idx + 1)
    let rankBadge = ""
    if (seller.month_ready) {
      if (rank === 1) rankBadge = `<span class="seller-rank-badge seller-rank-badge--gold" title="1º lugar">#1 🥇</span>`
      else if (rank === 2) rankBadge = `<span class="seller-rank-badge seller-rank-badge--silver" title="2º lugar">#2 🥈</span>`
      else if (rank === 3) rankBadge = `<span class="seller-rank-badge seller-rank-badge--bronze" title="3º lugar">#3 🥉</span>`
      else rankBadge = `<span class="seller-rank-badge">#${rank}</span>`
    }

    const charged = Number(seller.charged_total) || 0
    const progressPercent = seller.month_ready
      ? Math.min(100, Math.max(0, Math.round((charged / maxCharged) * 100)))
      : 0

    const dash = "—"
    const ready = seller.month_ready
    const commissionPct = seller.commission_percent == null ? "" : `${seller.commission_percent}%`
    const balance = seller.balance == null || Number.isNaN(Number(seller.balance))
      ? dash
      : money(seller.balance, formatMoney)
    const avgTicket = ready && (seller.average_ticket || seller.paid_orders_count > 0)
      ? money(seller.average_ticket || (charged / seller.paid_orders_count), formatMoney)
      : dash
    const metrics = [
      { label: "Vendas", value: ready ? money(seller.charged_total, formatMoney) : dash },
      { label: "Peças", value: ready ? String(Number(seller.paid_count) || 0) : dash },
      { label: commissionPct ? `Comissão ${commissionPct}` : "Comissão", value: ready ? money(seller.commission_amount, formatMoney) : dash },
      { label: "Ticket", value: avgTicket },
      { label: "A receber", value: balance }
    ]

    const pressed = selectedId != null && String(seller.seller_id) === String(selectedId)

    return `<button type="button" class="seller-card${pressed ? " seller-card--active" : ""}" data-seller-id="${escapeHtml(seller.seller_id)}" aria-pressed="${pressed ? "true" : "false"}">
      <div class="seller-card-header">
        <div class="seller-card-title-group">
          ${rankBadge}
          <h2>${escapeHtml(seller.name || "Vendedora")}</h2>
        </div>
      </div>
      ${seller.month_ready ? `<div class="seller-progress-track" title="${progressPercent}% em relação ao líder">
        <div class="seller-progress-fill" style="width: ${progressPercent}%;"></div>
      </div>` : ""}
      ${ready ? "" : `<p class="hint">${NO_DATA}</p>`}
      <div class="seller-metrics">${metrics.map((m) => `<div class="seller-metric">
        <b class="seller-metric__value">${escapeHtml(m.value)}</b>
        <small class="seller-metric__label">${escapeHtml(m.label)}</small>
      </div>`).join("")}</div>
    </button>`
  }).join("")

  let salesBlock = ""
  if (selectedId != null && selectedId !== "") {
    const seller = rows.find((row) => String(row.seller_id) === String(selectedId))
    const name = seller?.name || "Vendedora"
    const sales = Array.isArray(options.sales) ? options.sales : []
    const filtered = typeof options.filterSales === "function"
      ? options.filterSales(sales, seller || { seller_id: selectedId })
      : sales.filter((sale) => String(sale?.seller_id) === String(selectedId)
        || (seller?.name && String(sale?.seller_name || "").trim() === String(seller.name).trim()))
    const body = typeof options.renderSales === "function"
      ? options.renderSales(filtered, formatMoney)
      : (filtered.length
        ? filtered.map((sale) => `<article class="sale-row"><strong>${escapeHtml(sale.customer_name || "Cliente")}</strong></article>`).join("")
        : `<p class="empty">Nenhuma venda desta vendedora.</p>`)
    salesBlock = `<section class="report report--seller-sales">
      <h2>Vendas · ${escapeHtml(name)}</h2>
      ${body}
    </section>`
  }

  const sectionHeader = hasAnyMonthData
    ? `<div class="vendedoras-section-header"><h2>Ranking</h2></div>`
    : ""

  return `${periodBar}${teamSummary}${sectionHeader}${cards}${salesBlock}`
}

export function renderCompras(purchases, formatMoney = formatPrice, options = {}) {
  const data = purchases || {}
  const month = String(options.month || data.month || currentMonthKey()).trim()
  const periodBar = renderPeriodFilter(month, currentMonthKey())

  const totalUnits = Number(data.total_units_sold) || 0
  const totalOrders = Number(data.total_orders_paid) || 0
  const topPieces = Array.isArray(data.top_pieces) ? data.top_pieces : []
  const restockRequests = Array.isArray(data.restock_requests) ? data.restock_requests : []

  const summaryBanner = `<section class="compras-summary-banner">
    <div class="compras-summary-card">
      <span class="compras-summary-label">Peças vendidas</span>
      <strong class="compras-summary-val">${totalUnits} <small>unidades</small></strong>
      <span class="compras-summary-sub">em ${totalOrders} pedidos</span>
    </div>
    <div class="compras-summary-card">
      <span class="compras-summary-label">Em espera</span>
      <strong class="compras-summary-val">${restockRequests.length} <small>peças</small></strong>
      <span class="compras-summary-sub">esgotadas com clientes</span>
    </div>
  </section>`

  let topPiecesHtml = ""
  if (topPieces.length === 0) {
    topPiecesHtml = `<p class="empty">Sem vendas no período.</p>`
  } else {
    topPiecesHtml = `<ul class="compras-piece-list">${topPieces.map((piece, idx) => {
      const photo = entityPhotoHtml({
        image_url: piece.image_url,
        code: piece.code,
        name: piece.name
      })
      const rank = idx + 1
      return `<li class="compras-piece-card">
        <span class="compras-rank-badge">#${rank}</span>
        <div class="compras-piece-photo">${photo}</div>
        <div class="compras-piece-info">
          <small class="compras-piece-meta">${escapeHtml(piece.code || "")} · ${escapeHtml(piece.categoria || "Outros")}</small>
          <strong class="compras-piece-title">${escapeHtml(piece.name || piece.code)}</strong>
        </div>
        <div class="compras-piece-stat">
          <b class="compras-piece-units">${Number(piece.quantity_sold) || 0} un.</b>
          <small>vendidas</small>
        </div>
      </li>`
    }).join("")}</ul>`
  }

  let restockHtml = ""
  if (restockRequests.length > 0) {
    restockHtml = `<ul class="compras-piece-list">${restockRequests.map((piece) => {
      const photo = entityPhotoHtml({
        image_url: piece.image_url,
        code: piece.code,
        name: piece.name
      })
      const waiting = Number(piece.waiting_count) || 0
      const contacts = Array.isArray(piece.contacts) ? piece.contacts : []
      const contactsCount = contacts.length || waiting
      return `<li class="compras-piece-card compras-piece-card--restock">
        <div class="compras-piece-photo">${photo}</div>
        <div class="compras-piece-info">
          <small class="compras-piece-meta">${escapeHtml(piece.code || "")} · ${escapeHtml(piece.categoria || "Outros")}</small>
          <strong class="compras-piece-title">${escapeHtml(piece.name || piece.code)}</strong>
          <span class="badge badge--waitlist">💖 ${waiting} ${waiting === 1 ? "cliente interessada" : "clientes interessadas"}</span>
        </div>
        <div class="compras-piece-action">
          <button type="button" class="btn-sm btn-outline btn-compras-contacts" data-view-contacts="${escapeHtml(piece.code || "")}">
            Ver contatos (${contactsCount})
          </button>
        </div>
      </li>`
    }).join("")}</ul>`
  }

  const restockSection = restockRequests.length === 0 ? "" : `<section class="compras-section">
      <div class="compras-section-header">
        <h3>Reposição</h3>
      </div>
      ${restockHtml}
    </section>`

  return `<section class="report report--compras">
    <div class="compras-header">
      <h2>Compras</h2>
    </div>
    ${periodBar}
    ${summaryBanner}
    ${restockSection}
    <section class="compras-section">
      <div class="compras-section-header">
        <h3>Top 10 do mês</h3>
      </div>
      ${topPiecesHtml}
    </section>
  </section>`
}
