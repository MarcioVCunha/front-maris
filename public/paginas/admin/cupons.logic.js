// Lógica da tela de gerenciamento de cupons e programa de indicação no painel admin.

export function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function formatDateTimeBR(isoString) {
  if (!isoString) return ""
  const d = new Date(isoString)
  if (!Number.isFinite(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, "0")
  const mins = String(d.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${year} às ${hours}:${mins}`
}

export function formatDateBR(isoString) {
  if (!isoString) return ""
  const d = new Date(isoString)
  if (!Number.isFinite(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function computeCouponStatus(coupon, now = Date.now()) {
  if (!coupon) return { label: "Desconhecido", tone: "inactive" }
  if (coupon.is_active === false) {
    return { label: "Inativo", tone: "inactive" }
  }

  const maxUses = Number(coupon.max_uses)
  const currentUses = Number(coupon.current_uses ?? coupon.uses_count) || 0
  if (Number.isFinite(maxUses) && maxUses > 0 && currentUses >= maxUses) {
    return { label: "Esgotado", tone: "expired" }
  }

  const startMs = Date.parse(String(coupon.starts_at || ""))
  const endMs = Date.parse(String(coupon.expires_at || coupon.ends_at || ""))

  if (Number.isFinite(startMs) && startMs > now) {
    return { label: "Agendado", tone: "scheduled" }
  }

  if (Number.isFinite(endMs) && endMs < now) {
    return { label: "Expirado", tone: "expired" }
  }

  return { label: "Ativo", tone: "active" }
}

export function formatCouponDiscount(coupon) {
  if (!coupon) return ""
  const val = Number(coupon.discount_value ?? coupon.value) || 0
  if (coupon.discount_type === "percent") {
    return `${val}% OFF`
  }
  return `R$ ${val.toFixed(2).replace(".", ",")} OFF`
}

export function formatCouponRules(coupon, formatMoney = (v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`) {
  if (!coupon) return ""
  const parts = []
  const minVal = Number(coupon.min_order_value ?? coupon.min_order_subtotal)
  if (Number.isFinite(minVal) && minVal > 0) {
    parts.push(`Mínimo ${formatMoney(minVal)}`)
  }
  if (coupon.first_purchase_only || coupon.is_first_purchase_only) {
    parts.push("1ª compra")
  }
  const maxUses = Number(coupon.max_uses)
  const currentUses = Number(coupon.current_uses ?? coupon.uses_count) || 0
  if (Number.isFinite(maxUses) && maxUses > 0) {
    parts.push(`${currentUses}/${maxUses} usos`)
  } else if (currentUses > 0) {
    parts.push(`${currentUses} usos`)
  }
  if (coupon.is_referral || coupon.referrer_whatsapp) {
    parts.push(`Indicação (${coupon.referrer_name || "cliente"})`)
  }
  return parts.length ? parts.join(" · ") : "Sem restrições adicionais"
}

export function computeReferralStatus(ref) {
  const status = String(ref?.status || "").toLowerCase()
  if (status === "confirmado") {
    return { label: "Confirmado", tone: "confirmed" }
  }
  if (status === "cancelado") {
    return { label: "Cancelado", tone: "cancelled" }
  }
  return { label: "Pendente", tone: "pending" }
}

export function filterCoupons(coupons, { query = "", status = "all" } = {}) {
  const list = Array.isArray(coupons) ? coupons : []
  const q = String(query || "").trim().toLowerCase()
  const now = Date.now()

  return list.filter((c) => {
    if (status !== "all") {
      const computed = computeCouponStatus(c, now)
      if (status === "active" && computed.tone !== "active") return false
      if (status === "inactive" && computed.tone === "active") return false
      if (status === "referral" && !c.is_referral && !c.referrer_whatsapp) return false
    }

    if (q) {
      const code = String(c.code || "").toLowerCase()
      const desc = String(c.description || "").toLowerCase()
      const ref = String(c.referrer_name || "").toLowerCase()
      if (!code.includes(q) && !desc.includes(q) && !ref.includes(q)) {
        return false
      }
    }

    return true
  })
}

export function filterReferrals(referrals, { query = "", status = "all" } = {}) {
  const list = Array.isArray(referrals) ? referrals : []
  const q = String(query || "").trim().toLowerCase()

  return list.filter((r) => {
    if (status !== "all") {
      const currentStatus = String(r.status || "pendente").toLowerCase()
      if (currentStatus !== status.toLowerCase()) return false
    }

    if (q) {
      const refName = String(r.referrer_name || "").toLowerCase()
      const refPhone = String(r.referrer_whatsapp || "").toLowerCase()
      const refeeName = String(r.referee_name || "").toLowerCase()
      const refeePhone = String(r.referee_whatsapp || "").toLowerCase()
      const reward = String(r.reward_coupon_code || "").toLowerCase()
      if (
        !refName.includes(q) &&
        !refPhone.includes(q) &&
        !refeeName.includes(q) &&
        !refeePhone.includes(q) &&
        !reward.includes(q)
      ) {
        return false
      }
    }

    return true
  })
}

export function validateCouponPayload(payload = {}) {
  const code = String(payload.code || "").trim().toUpperCase()
  if (!code || code.length < 3 || code.length > 30) {
    return { ok: false, error: "O código do cupom deve ter entre 3 e 30 caracteres." }
  }
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return { ok: false, error: "O código só pode conter letras, números e traço." }
  }

  const discountType = String(payload.discount_type || "").toLowerCase()
  if (discountType !== "percent" && discountType !== "fixed") {
    return { ok: false, error: "Tipo de desconto inválido (escolha porcentagem ou valor fixo)." }
  }

  const discountValue = Number(payload.discount_value)
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { ok: false, error: "Informe um valor de desconto maior que zero." }
  }
  if (discountType === "percent" && discountValue > 100) {
    return { ok: false, error: "Desconto em porcentagem não pode ser maior que 100%." }
  }

  let minOrder = null
  if (payload.min_order_value !== undefined && payload.min_order_value !== null && payload.min_order_value !== "") {
    minOrder = Number(payload.min_order_value)
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      return { ok: false, error: "Valor mínimo do pedido inválido." }
    }
  }

  let maxUses = null
  if (payload.max_uses !== undefined && payload.max_uses !== null && payload.max_uses !== "") {
    maxUses = parseInt(String(payload.max_uses), 10)
    if (!Number.isFinite(maxUses) || maxUses <= 0) {
      return { ok: false, error: "Limite de usos deve ser um número inteiro positivo." }
    }
  }

  return {
    ok: true,
    data: {
      action: "save",
      code,
      description: String(payload.description || "").trim(),
      discount_type: discountType,
      discount_value: discountValue,
      min_order_value: minOrder,
      max_uses: maxUses,
      first_purchase_only: Boolean(payload.first_purchase_only),
      starts_at: payload.starts_at || null,
      expires_at: payload.expires_at || null,
      is_active: payload.is_active !== false
    }
  }
}

export function validateReferralCodePayload(payload = {}) {
  const name = String(payload.referrer_name || "").trim()
  if (!name || name.length < 2) {
    return { ok: false, error: "Informe o nome da cliente indicadora." }
  }

  const rawPhone = String(payload.referrer_whatsapp || "").replace(/\D/g, "")
  let digits = rawPhone
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`
  }
  if (!/^55[0-9]{10,11}$/.test(digits)) {
    return { ok: false, error: "Informe um WhatsApp brasileiro válido com DDD." }
  }

  const percent = Number(payload.discount_percent) || 10
  if (percent <= 0 || percent > 100) {
    return { ok: false, error: "Porcentagem de desconto inválida." }
  }

  return {
    ok: true,
    data: {
      action: "create_referral",
      referrer_name: name,
      referrer_whatsapp: digits,
      discount_percent: percent
    }
  }
}

export function computeCouponsMetrics(coupons = []) {
  const list = Array.isArray(coupons) ? coupons : []
  const totalCoupons = list.length
  const now = Date.now()

  let activeCoupons = 0
  let totalUses = 0
  let totalOrders = 0
  let totalSales = 0
  let totalDiscount = 0
  let topCoupon = null
  let maxUses = -1

  for (const c of list) {
    const status = computeCouponStatus(c, now)
    if (status.tone === "active") {
      activeCoupons++
    }

    const uses = Number(c.uses_count ?? c.current_uses ?? 0) || 0
    const orders = Number(c.orders_count ?? 0) || 0
    const sales = Number(c.total_sales ?? 0) || 0
    const discount = Number(c.total_discount ?? 0) || 0

    totalUses += uses
    totalOrders += orders
    totalSales += sales
    totalDiscount += discount

    if (uses > maxUses && uses > 0) {
      maxUses = uses
      topCoupon = {
        code: c.code,
        uses,
        sales,
        discount
      }
    }
  }

  const averageTicket = totalUses > 0 ? totalSales / totalUses : 0

  return {
    totalCoupons,
    activeCoupons,
    totalUses,
    totalOrders,
    totalSales: Number(totalSales.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
    averageTicket: Number(averageTicket.toFixed(2)),
    topCoupon
  }
}

export function computeReferralsMetrics(referrals = []) {
  const list = Array.isArray(referrals) ? referrals : []
  const totalReferrals = list.length

  let pendingReferrals = 0
  let confirmedReferrals = 0
  let cancelledReferrals = 0
  let rewardsIssued = 0
  let rewardsUsed = 0

  const referrerCountMap = new Map()

  for (const r of list) {
    const status = String(r.status || "pendente").toLowerCase()
    if (status === "confirmado") {
      confirmedReferrals++
    } else if (status === "cancelado") {
      cancelledReferrals++
    } else {
      pendingReferrals++
    }

    if (r.reward_coupon_code) {
      rewardsIssued++
    }
    if (r.reward_coupon_used) {
      rewardsUsed++
    }

    const refKey = String(r.referrer_name || "").trim()
    if (refKey) {
      const prev = referrerCountMap.get(refKey) || { name: refKey, count: 0, confirmed: 0 }
      prev.count++
      if (status === "confirmado") prev.confirmed++
      referrerCountMap.set(refKey, prev)
    }
  }

  const conversionRate = totalReferrals > 0
    ? Number(((confirmedReferrals / totalReferrals) * 100).toFixed(1))
    : 0

  let topReferrer = null
  let maxCount = 0
  for (const entry of referrerCountMap.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count
      topReferrer = entry
    }
  }

  return {
    totalReferrals,
    pendingReferrals,
    confirmedReferrals,
    cancelledReferrals,
    conversionRate,
    rewardsIssued,
    rewardsUsed,
    topReferrer
  }
}

export function renderCouponCard(coupon, formatMoney = (v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`) {
  const status = computeCouponStatus(coupon)
  const discountText = formatCouponDiscount(coupon)
  const rulesText = formatCouponRules(coupon, formatMoney)
  const isActive = coupon.is_active !== false
  const isReferral = Boolean(coupon.is_referral || coupon.referrer_whatsapp)

  const uses = Number(coupon.uses_count ?? coupon.current_uses ?? 0) || 0
  const sales = Number(coupon.total_sales ?? 0) || 0
  const discount = Number(coupon.total_discount ?? 0) || 0

  return `
    <article class="coupon-card ${isActive ? "" : "coupon-card--inactive"}" data-coupon-id="${escapeHtml(coupon.id)}">
      <div class="coupon-card__header">
        <div class="coupon-card__badge-group">
          <strong class="coupon-card__code">${escapeHtml(coupon.code)}</strong>
          <span class="coupon-status-badge status--${status.tone}">${status.label}</span>
          ${isReferral ? `<span class="coupon-referral-tag">Indicação</span>` : ""}
        </div>
        <span class="coupon-card__discount">${discountText}</span>
      </div>

      ${coupon.description ? `<p class="coupon-card__desc">${escapeHtml(coupon.description)}</p>` : ""}

      <div class="coupon-card__details">
        <span class="coupon-card__rule-item">${escapeHtml(rulesText)}</span>
        ${coupon.expires_at || coupon.ends_at ? `<span class="coupon-card__date">Vence em: ${formatDateBR(coupon.expires_at || coupon.ends_at)}</span>` : `<span class="coupon-card__date">Sem expiração</span>`}
      </div>

      ${(uses > 0 || sales > 0) ? `
        <div class="coupon-card__perf" aria-label="Desempenho do cupom">
          <span class="coupon-perf-pill">⭐ ${uses} ${uses === 1 ? "uso" : "usos"}</span>
          ${sales > 0 ? `<span class="coupon-perf-pill coupon-perf-pill--sales">${formatMoney(sales)} em vendas</span>` : ""}
          ${discount > 0 ? `<span class="coupon-perf-pill coupon-perf-pill--discount">-${formatMoney(discount)}</span>` : ""}
        </div>
      ` : ""}

      <div class="coupon-card__actions">
        <button type="button" class="btn-coupon-toggle ${isActive ? "btn-coupon-toggle--on" : "btn-coupon-toggle--off"}" data-action="toggle" data-id="${escapeHtml(coupon.id)}" data-active="${isActive}">
          ${isActive ? "Desativar" : "Ativar"}
        </button>
      </div>
    </article>
  `
}

export function renderCouponsPage(coupons = [], referrals = [], options = {}) {
  const activeTab = options.tab || "coupons"
  const couponQuery = options.couponQuery || ""
  const couponStatus = options.couponStatus || "all"
  const referralQuery = options.referralQuery || ""
  const referralStatus = options.referralStatus || "all"
  const formatMoney = options.formatMoney || ((v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`)

  const filteredCoupons = filterCoupons(coupons, { query: couponQuery, status: couponStatus })
  const filteredReferrals = filterReferrals(referrals, { query: referralQuery, status: referralStatus })

  const couponMetrics = options.couponSummary || computeCouponsMetrics(coupons)
  const refMetrics = options.referralSummary || computeReferralsMetrics(referrals)

  return `
    <div class="coupons-view">
      <header class="coupons-view__head">
        <div class="coupons-tabs" role="tablist">
          <button type="button" class="coupons-tab ${activeTab === "coupons" ? "coupons-tab--active" : ""}" data-tab="coupons" role="tab" aria-selected="${activeTab === "coupons"}">
            Cupons (${coupons.length})
          </button>
          <button type="button" class="coupons-tab ${activeTab === "referrals" ? "coupons-tab--active" : ""}" data-tab="referrals" role="tab" aria-selected="${activeTab === "referrals"}">
            Indicações (${referrals.length})
          </button>
        </div>

        <div class="coupons-head-actions">
          <button type="button" id="btn-new-coupon" class="dash-btn dash-btn--primary">
            + Novo Cupom
          </button>
          <button type="button" id="btn-new-referral" class="dash-btn dash-btn--secondary">
            + Gerar Código de Indicação
          </button>
        </div>
      </header>

      ${activeTab === "coupons" ? `
        <div class="coupons-summary-bar">
          <div class="coupon-stat">
            <span class="coupon-stat__num">${couponMetrics.totalUses}</span>
            <span class="coupon-stat__label">Total de Usos</span>
            <small class="coupon-stat__sub">${couponMetrics.topCoupon ? `Top: <strong>${escapeHtml(couponMetrics.topCoupon.code)}</strong>` : "Nenhum uso registrado"}</small>
          </div>
          <div class="coupon-stat coupon-stat--sales">
            <span class="coupon-stat__num">${formatMoney(couponMetrics.totalSales)}</span>
            <span class="coupon-stat__label">Vendas com Cupom</span>
            <small class="coupon-stat__sub">${couponMetrics.totalOrders > 0 ? `${couponMetrics.totalOrders} pedidos pagos` : (couponMetrics.totalUses > 0 ? `Ticket médio ${formatMoney(couponMetrics.averageTicket)}` : "Aguardando pedidos")}</small>
          </div>
          <div class="coupon-stat coupon-stat--discount">
            <span class="coupon-stat__num">${formatMoney(couponMetrics.totalDiscount)}</span>
            <span class="coupon-stat__label">Descontos Concedidos</span>
            <small class="coupon-stat__sub">Economia para clientes</small>
          </div>
          <div class="coupon-stat coupon-stat--active">
            <span class="coupon-stat__num">${couponMetrics.activeCoupons} <small class="text-muted">/ ${couponMetrics.totalCoupons}</small></span>
            <span class="coupon-stat__label">Cupons Ativos</span>
            <small class="coupon-stat__sub">Disponíveis no catálogo</small>
          </div>
        </div>

        <div class="coupons-toolbar">
          <div class="coupons-search-field">
            <input id="coupon-search-input" type="search" placeholder="Buscar cupom por código ou descrição..." value="${escapeHtml(couponQuery)}" autocomplete="off">
          </div>
          <div class="coupons-filter-chips" role="group" aria-label="Filtrar cupons">
            <button type="button" class="coupon-chip ${couponStatus === "all" ? "coupon-chip--active" : ""}" data-status="all">Todos</button>
            <button type="button" class="coupon-chip ${couponStatus === "active" ? "coupon-chip--active" : ""}" data-status="active">Ativos</button>
            <button type="button" class="coupon-chip ${couponStatus === "inactive" ? "coupon-chip--active" : ""}" data-status="inactive">Inativos</button>
            <button type="button" class="coupon-chip ${couponStatus === "referral" ? "coupon-chip--active" : ""}" data-status="referral">Indicações</button>
          </div>
        </div>

        <div class="coupons-grid">
          ${filteredCoupons.length ? filteredCoupons.map((c) => renderCouponCard(c, formatMoney)).join("") : `
            <div class="coupons-empty">
              <p>Nenhum cupom encontrado.</p>
            </div>
          `}
        </div>
      ` : `
        <div class="referrals-summary-bar">
          <div class="ref-stat">
            <span class="ref-stat__num">${refMetrics.totalReferrals}</span>
            <span class="ref-stat__label">Amigas Indicadas</span>
            <small class="ref-stat__sub">${refMetrics.pendingReferrals} aguardando pedido</small>
          </div>
          <div class="ref-stat ref-stat--confirmed">
            <span class="ref-stat__num">${refMetrics.conversionRate.toFixed(1).replace(".", ",")}%</span>
            <span class="ref-stat__label">Taxa de Conversão</span>
            <small class="ref-stat__sub">${refMetrics.confirmedReferrals} pedidos confirmados</small>
          </div>
          <div class="ref-stat ref-stat--reward">
            <span class="ref-stat__num">${refMetrics.rewardsIssued}</span>
            <span class="ref-stat__label">Bônus Gerados (10%)</span>
            <small class="ref-stat__sub">${refMetrics.rewardsUsed > 0 ? `${refMetrics.rewardsUsed} já resgatados` : "Aguardando primeiro resgate"}</small>
          </div>
          <div class="ref-stat ref-stat--top">
            <span class="ref-stat__num ref-stat__num--small">${refMetrics.topReferrer ? escapeHtml(refMetrics.topReferrer.name) : "—"}</span>
            <span class="ref-stat__label">Indicadora Campeã</span>
            <small class="ref-stat__sub">${refMetrics.topReferrer ? `${refMetrics.topReferrer.count} indicações` : "Nenhuma ainda"}</small>
          </div>
        </div>

        <div class="referrals-rules-banner">
          <p><strong>Regras do Programa de Indicação:</strong> Máximo de 10 indicações por cliente · Cada número indicado só pode ser indicado 1 única vez · Ao confirmar o pagamento do pedido da indicada, a indicadora ganha automaticamente um cupom de 10% (OBRIGADA-XXXXXX).</p>
        </div>

        <div class="coupons-toolbar">
          <div class="coupons-search-field">
            <input id="referral-search-input" type="search" placeholder="Buscar por cliente, WhatsApp ou bônus..." value="${escapeHtml(referralQuery)}" autocomplete="off">
          </div>
          <div class="coupons-filter-chips" role="group" aria-label="Filtrar indicações">
            <button type="button" class="coupon-chip ${referralStatus === "all" ? "coupon-chip--active" : ""}" data-ref-status="all">Todas</button>
            <button type="button" class="coupon-chip ${referralStatus === "pendente" ? "coupon-chip--active" : ""}" data-ref-status="pendente">Pendentes</button>
            <button type="button" class="coupon-chip ${referralStatus === "confirmado" ? "coupon-chip--active" : ""}" data-ref-status="confirmado">Confirmadas</button>
            <button type="button" class="coupon-chip ${referralStatus === "cancelado" ? "coupon-chip--active" : ""}" data-ref-status="cancelado">Canceladas</button>
          </div>
        </div>

        <div class="referrals-table-wrapper">
          <table class="referrals-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Quem Indicou</th>
                <th>Quem foi Indicada</th>
                <th>Pedido</th>
                <th>Situação</th>
                <th>Cupom Bônus (10%)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredReferrals.length ? filteredReferrals.map((r) => {
                const status = computeReferralStatus(r)
                const orderText = r.order_id
                  ? `#${escapeHtml(r.order_id)}${r.order_total != null ? ` · ${escapeHtml(formatMoney(r.order_total))}` : ""}`
                  : "—"
                let bonusMarkup = `<span class="text-muted">Aguardando pagamento</span>`
                if (r.reward_coupon_code) {
                  const usedBadge = r.reward_coupon_used
                    ? `<span class="bonus-badge bonus-badge--used" title="A indicadora já utilizou este bônus em uma compra">Resgatado</span>`
                    : `<span class="bonus-badge bonus-badge--available" title="Disponível para a indicadora utilizar">Disponível</span>`
                  bonusMarkup = `
                    <div class="bonus-cell">
                      <strong class="reward-code-pill">${escapeHtml(r.reward_coupon_code)}</strong>
                      ${usedBadge}
                    </div>
                  `
                }
                return `
                  <tr>
                    <td>${formatDateBR(r.created_at)}</td>
                    <td>
                      <strong>${escapeHtml(r.referrer_name)}</strong><br>
                      <small class="text-muted">${escapeHtml(r.referrer_whatsapp)}</small>
                    </td>
                    <td>
                      <strong>${escapeHtml(r.referee_name)}</strong><br>
                      <small class="text-muted">${escapeHtml(r.referee_whatsapp)}</small>
                    </td>
                    <td>${orderText}</td>
                    <td><span class="coupon-status-badge status--${status.tone}">${status.label}</span></td>
                    <td>${bonusMarkup}</td>
                  </tr>
                `
              }).join("") : `
                <tr>
                  <td colspan="6" class="text-center py-4">Nenhuma indicação encontrada.</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `
}


export function renderCouponDialogContent() {
  return `
    <form id="coupon-form" method="dialog">
      <div class="dialog-header">
        <h2>Novo Cupom de Desconto</h2>
        <button type="button" class="dialog-close" data-dialog-close="coupon" aria-label="Fechar">×</button>
      </div>
      <div class="dialog-body">
        <div class="form-row">
          <div class="form-field">
            <label for="coupon-code">Código do Cupom *</label>
            <input id="coupon-code" type="text" placeholder="Ex: BEMVINDA10" required autocomplete="off" autocapitalize="characters" style="text-transform: uppercase;">
            <span class="field-hint">Letras, números e traço. Sem espaços.</span>
          </div>
          <div class="form-field">
            <label for="coupon-discount-type">Tipo de Desconto *</label>
            <select id="coupon-discount-type" required>
              <option value="percent">Porcentagem (% OFF)</option>
              <option value="fixed">Valor Fixo (R$ OFF)</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="coupon-discount-value">Valor do Desconto *</label>
            <input id="coupon-discount-value" type="number" step="0.01" min="0.01" placeholder="Ex: 10" required>
            <span class="field-hint" id="coupon-discount-hint">Digite 10 para 10% de desconto.</span>
          </div>
          <div class="form-field">
            <label for="coupon-min-order">Pedido Mínimo (R$)</label>
            <input id="coupon-min-order" type="number" step="0.01" min="0" placeholder="0,00">
            <span class="field-hint">Opcional. Valor mínimo em peças.</span>
          </div>
        </div>

        <div class="form-field">
          <label for="coupon-description">Descrição interna</label>
          <input id="coupon-description" type="text" placeholder="Ex: Cupom de boas-vindas para novas clientes">
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="coupon-max-uses">Limite de Usos Total</label>
            <input id="coupon-max-uses" type="number" min="1" step="1" placeholder="Ilimitado">
            <span class="field-hint">Deixe em branco para usos ilimitados.</span>
          </div>
          <div class="form-field">
            <label for="coupon-expires-at">Data de Expiração</label>
            <input id="coupon-expires-at" type="datetime-local">
            <span class="field-hint">Deixe em branco para não expirar.</span>
          </div>
        </div>

        <div class="form-row">
          <label class="form-field-checkbox">
            <input id="coupon-first-purchase" type="checkbox">
            <span>Válido apenas na primeira compra</span>
          </label>
          <label class="form-field-checkbox">
            <input id="coupon-is-active" type="checkbox" checked>
            <span>Cupom ativo imediatamente</span>
          </label>
        </div>

        <p class="field-hint" style="margin-top: 8px;"><strong>Importante:</strong> Cupons não acumulam com produtos que já estão com promoção ativa.</p>
      </div>

      <div class="dialog-actions">
        <button type="button" class="btn-secondary" data-dialog-close="coupon">Cancelar</button>
        <button type="submit" class="dash-btn dash-btn--primary">Salvar Cupom</button>
      </div>
    </form>
  `
}

export function renderReferralCodeDialogContent() {
  return `
    <form id="referral-code-form" method="dialog">
      <div class="dialog-header">
        <h2>Gerar Código de Indicação</h2>
        <button type="button" class="dialog-close" data-dialog-close="referral" aria-label="Fechar">×</button>
      </div>
      <div class="dialog-body">
        <p class="field-hint" style="line-height: 1.5; margin-bottom: 12px;">
          Gera um cupom exclusivo para uma cliente compartilhar com as amigas dela.
          As amigas ganham 10% de desconto na primeira compra. Quando o pedido for pago,
          a cliente indicadora ganha automaticamente um cupom de 10% de presente!
        </p>

        <div class="form-field">
          <label for="ref-name">Nome da Cliente Indicadora *</label>
          <input id="ref-name" type="text" placeholder="Ex: Mariana Silva" required autocomplete="name">
        </div>

        <div class="form-field">
          <label for="ref-whatsapp">WhatsApp da Indicadora *</label>
          <input id="ref-whatsapp" type="tel" placeholder="(19) 99999-9999" required autocomplete="tel">
          <span class="field-hint">Necessário para vincular os bônus automáticos.</span>
        </div>

        <div class="form-field">
          <label for="ref-percent">Desconto para as amigas (%)</label>
          <input id="ref-percent" type="number" min="1" max="100" value="10" required>
          <span class="field-hint">Padrão: 10% de desconto.</span>
        </div>

        <div class="referrals-rules-box" style="background: var(--maris-gold-light, #faf6f0); padding: 12px; border-radius: 8px; border: 1px solid var(--maris-border); margin-top: 8px;">
          <strong style="display: block; font-size: 0.85rem; margin-bottom: 4px;">Anti-fraude aplicado:</strong>
          <ul style="margin: 0; padding-left: 18px; font-size: 0.82rem; color: var(--maris-text-muted); line-height: 1.4;">
            <li>Máximo de 10 amigas indicadas no total.</li>
            <li>Cada WhatsApp só pode ser indicado uma única vez.</li>
            <li>Auto-indicação é bloqueada pelo sistema.</li>
          </ul>
        </div>
      </div>

      <div class="dialog-actions">
        <button type="button" class="btn-secondary" data-dialog-close="referral">Cancelar</button>
        <button type="submit" class="dash-btn dash-btn--primary">Criar Código de Indicação</button>
      </div>
    </form>
  `
}
