export const PROMO_CATEGORIES = [
  "Anel",
  "Brinco",
  "Colar",
  "Pulseira",
  "Choker",
  "Pingente",
  "Conjunto",
  "Tornozeleira",
  "Piercing",
  "Outros",
]

export function computePromotionStatus(promo, now = Date.now()) {
  if (!promo) return { label: "Desconhecido", tone: "ended" }
  if (promo.is_active === false) {
    return { label: "Encerrada", tone: "ended" }
  }

  const startMs = Date.parse(String(promo.starts_at || ""))
  const endMs = Date.parse(String(promo.ends_at || ""))

  if (Number.isFinite(startMs) && startMs > now) {
    return { label: "Agendada", tone: "scheduled" }
  }

  if (Number.isFinite(endMs) && endMs < now) {
    return { label: "Encerrada", tone: "ended" }
  }

  const max = Number(promo.max_units)
  const sold = Number(promo.units_sold) || 0
  if (Number.isFinite(max) && max > 0 && sold >= max) {
    return { label: "Esgotada", tone: "depleted" }
  }

  return { label: "Ativa", tone: "active" }
}

export function formatDiscountDisplay(promo) {
  if (!promo) return ""
  const val = Number(promo.value) || 0
  if (promo.discount_type === "percent") {
    return `${val}% OFF`
  }
  return `R$ ${val.toFixed(2).replace(".", ",")} OFF`
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

export function toLocalDatetimeInput(isoOrDate) {
  if (!isoOrDate) return ""
  const d = typeof isoOrDate === "string" || typeof isoOrDate === "number" ? new Date(isoOrDate) : isoOrDate
  if (!Number.isFinite(d?.getTime?.())) return ""
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDateRange(startsAt, endsAt) {
  const startStr = formatDateTimeBR(startsAt)
  const endStr = formatDateTimeBR(endsAt)
  if (!startStr && !endStr) return "Sem período definido"
  if (!startStr) return `Até ${endStr}`
  if (!endStr) return `A partir de ${startStr}`
  return `${startStr} até ${endStr}`
}

export function formatUnitsLimit(unitsSold, maxUnits) {
  const sold = Number(unitsSold) || 0
  const max = Number(maxUnits)
  if (Number.isFinite(max) && max > 0) {
    return `${sold} de ${max} peças vendidas`
  }
  return `${sold} peça(s) vendida(s) (sem limite)`
}

export function parseProductCodes(input) {
  if (Array.isArray(input)) {
    return input.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean)
  }
  return String(input || "")
    .split(/[,;\s]+/)
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
}

export function validatePromotionPayload(form) {
  const name = String(form?.name || "").trim()
  if (!name || name.length > 120) {
    return { ok: false, error: "Informe o nome da promoção (até 120 caracteres)." }
  }

  const scope = String(form?.scope || "").trim()
  if (scope !== "categoria" && scope !== "produto") {
    return { ok: false, error: "Selecione o alcance: por categoria ou por produto." }
  }

  let category = null
  let productCodes = []

  if (scope === "categoria") {
    category = String(form?.category || "").trim()
    if (!PROMO_CATEGORIES.includes(category)) {
      return { ok: false, error: "Selecione uma categoria válida." }
    }
  } else {
    productCodes = parseProductCodes(form?.product_codes)
    if (!productCodes.length) {
      return { ok: false, error: "Informe ao menos um código de peça para a promoção." }
    }
  }

  const discountType = String(form?.discount_type || "").trim()
  if (discountType !== "percent" && discountType !== "fixed") {
    return { ok: false, error: "Selecione o tipo de desconto: porcentagem ou valor fixo." }
  }

  const value = Number(form?.value)
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, error: "Informe um valor de desconto maior que zero." }
  }
  if (discountType === "percent" && value > 100) {
    return { ok: false, error: "O percentual de desconto não pode ser maior que 100%." }
  }

  const startsAt = form?.starts_at ? new Date(form.starts_at).toISOString() : ""
  const endsAt = form?.ends_at ? new Date(form.ends_at).toISOString() : ""

  if (!startsAt || !endsAt) {
    return { ok: false, error: "Informe as datas de início e término da promoção." }
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    return { ok: false, error: "A data de término deve ser posterior à data de início." }
  }

  let maxUnits = null
  if (form?.max_units !== undefined && form?.max_units !== null && String(form.max_units).trim() !== "") {
    const parsed = Number(form.max_units)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { ok: false, error: "O limite de peças deve ser um número inteiro positivo." }
    }
    maxUnits = parsed
  }

  const isActive = form?.is_active !== undefined ? Boolean(form.is_active) : true
  const id = form?.id ? Number(form.id) : null

  return {
    ok: true,
    payload: {
      id,
      name,
      scope,
      category,
      product_codes: productCodes,
      discount_type: discountType,
      value: Math.round(value * 100) / 100,
      starts_at: startsAt,
      ends_at: endsAt,
      max_units: maxUnits,
      is_active: isActive,
    }
  }
}

export function filterPromotions(promotions, { term = "", status = "all" } = {}, now = Date.now()) {
  const normTerm = String(term || "").trim().toLowerCase()
  return (promotions || []).filter((promo) => {
    if (status !== "all") {
      const current = computePromotionStatus(promo, now).tone
      if (status === "active" && current !== "active") return false
      if (status === "ended" && current !== "ended" && current !== "depleted") return false
      if (status === "scheduled" && current !== "scheduled") return false
    }

    if (!normTerm) return true
    const nameMatch = String(promo.name || "").toLowerCase().includes(normTerm)
    const catMatch = String(promo.category || "").toLowerCase().includes(normTerm)
    const codeMatch = Array.isArray(promo.product_codes) && promo.product_codes.some((c) => String(c).toLowerCase().includes(normTerm))
    return nameMatch || catMatch || codeMatch
  })
}

export function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function renderPromoCard(promo) {
  const status = computePromotionStatus(promo)
  const discount = formatDiscountDisplay(promo)
  const dates = formatDateRange(promo.starts_at, promo.ends_at)
  const units = formatUnitsLimit(promo.units_sold, promo.max_units)

  const isScopeProduct = promo.scope === "produto"
  const codes = Array.isArray(promo.product_codes) ? promo.product_codes : parseProductCodes(promo.product_codes)

  const scopeHtml = isScopeProduct
    ? `<span>🏷️ Peças (${codes.length}): <span class="promo-codes-list">${
        codes.length
          ? codes.map((c) => `<code class="promo-code-chip">${escapeHtml(c)}</code>`).join(" ")
          : '<em class="field-hint">Nenhuma peça informada</em>'
      }</span></span>`
    : `<span>📂 Categoria: <strong>${escapeHtml(promo.category || "-")}</strong></span>`

  const canEnd = promo.is_active !== false && status.tone !== "ended"

  return `
    <article class="promo-card" data-id="${promo.id}">
      <div class="promo-card-header">
        <div class="promo-card-title-group">
          <h2 class="promo-card-title">${escapeHtml(promo.name || "Sem nome")}</h2>
          <div class="promo-card-badges">
            <span class="promo-badge promo-badge--${status.tone}">${status.label}</span>
            <span class="promo-discount-tag">${discount}</span>
          </div>
        </div>
      </div>

      <div class="promo-card-meta">
        <div class="promo-meta-row">${scopeHtml}</div>
        <div class="promo-meta-row"><span>📅 ${dates}</span></div>
        <div class="promo-meta-row"><span>🛍️ ${units}</span></div>
      </div>

      <div class="promo-card-actions">
        <button type="button" class="promo-btn-secondary promo-btn-sm" data-action="edit" data-id="${promo.id}">Editar</button>
        ${
          canEnd
            ? `<button type="button" class="promo-btn-secondary promo-btn-danger promo-btn-sm" data-action="end" data-id="${promo.id}">Encerrar</button>`
            : ""
        }
      </div>
    </article>
  `
}

export function renderPromotionsPage(promotions, { query = "", status = "all" } = {}) {
  const filtered = filterPromotions(promotions, { term: query, status })

  const listHtml = !promotions?.length
    ? `
      <div class="promo-empty">
        <p>Nenhuma campanha promocional cadastrada.</p>
        <p class="field-hint">Clique em "+ Nova promoção" para criar a primeira campanha da loja.</p>
      </div>
    `
    : !filtered.length
    ? `
      <div class="promo-empty">
        <p>Nenhuma promoção encontrada para os filtros atuais.</p>
      </div>
    `
    : filtered.map(renderPromoCard).join("")

  return `
    <div class="promotions-page">
      <div class="promotions-header">
        <div>
          <h2>Promoções</h2>
          <p class="promotions-subtitle">Gerencie as campanhas promocionais do catálogo por categoria ou peças específicas. O desconto é calculado pelo servidor e exibido automaticamente.</p>
        </div>
        <button id="promo-new-btn" type="button" class="btn-primary">+ Nova promoção</button>
      </div>

      <div class="promotions-toolbar">
        <label for="promo-search" class="visually-hidden">Buscar promoções</label>
        <input id="promo-search" class="promo-search" type="search" placeholder="Buscar por nome, categoria ou código…" autocomplete="off" enterkeyhint="search" value="${escapeHtml(query)}">

        <div class="promo-status-filter" role="tablist" aria-label="Filtrar por status">
          <button type="button" class="status-filter-btn ${status === "all" ? "status-filter-btn--active" : ""}" data-status="all" role="tab" aria-selected="${status === "all" ? "true" : "false"}">Todas</button>
          <button type="button" class="status-filter-btn ${status === "active" ? "status-filter-btn--active" : ""}" data-status="active" role="tab" aria-selected="${status === "active" ? "true" : "false"}">Ativas</button>
          <button type="button" class="status-filter-btn ${status === "scheduled" ? "status-filter-btn--active" : ""}" data-status="scheduled" role="tab" aria-selected="${status === "scheduled" ? "true" : "false"}">Agendadas</button>
          <button type="button" class="status-filter-btn ${status === "ended" ? "status-filter-btn--active" : ""}" data-status="ended" role="tab" aria-selected="${status === "ended" ? "true" : "false"}">Encerradas</button>
        </div>
      </div>

      <div id="promo-feedback" class="promo-feedback" hidden></div>
      <div id="promo-list" class="promo-grid">
        ${listHtml}
      </div>
    </div>
  `
}

export function renderPromoDialogContent(promo = null) {
  const isEditing = Boolean(promo?.id)
  const title = isEditing ? "Editar promoção" : "Nova promoção"
  const name = promo?.name || ""
  const scope = promo?.scope || "categoria"
  const category = promo?.category || PROMO_CATEGORIES[0] || "Anel"
  const codes = Array.isArray(promo?.product_codes)
    ? promo.product_codes.join(", ")
    : (parseProductCodes(promo?.product_codes).join(", ") || "")
  const discountType = promo?.discount_type || "percent"
  const value = promo?.value != null ? String(promo.value) : "10"
  const maxUnits = promo?.max_units != null ? String(promo.max_units) : ""
  const isActive = promo ? promo.is_active !== false : true

  const now = new Date()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const startsAt = toLocalDatetimeInput(promo?.starts_at || now)
  const endsAt = toLocalDatetimeInput(promo?.ends_at || in30Days)

  return `
    <div class="promo-dialog-content">
      <div class="dialog-header">
        <h2 id="promo-dialog-title">${escapeHtml(title)}</h2>
        <button id="promo-dialog-close-btn" type="button" class="dialog-close" aria-label="Fechar">&times;</button>
      </div>

      <form id="promo-form" method="dialog">
        <input type="hidden" id="promo-form-id" value="${escapeHtml(promo?.id || "")}">

        <div id="promo-dialog-feedback" class="promo-feedback" hidden></div>

        <div class="dialog-body">
          <label class="form-field">
            <span>Nome da campanha *</span>
            <input type="text" id="promo-form-name" required maxlength="120" placeholder="Ex: Black Friday Anéis, Mês das Mães" value="${escapeHtml(name)}">
          </label>

          <div class="form-row">
            <label class="form-field">
              <span>Alcance *</span>
              <select id="promo-form-scope" required>
                <option value="categoria" ${scope === "categoria" ? "selected" : ""}>Por categoria</option>
                <option value="produto" ${scope === "produto" ? "selected" : ""}>Por peças específicas</option>
              </select>
            </label>

            <div id="promo-group-category" class="form-field" ${scope === "categoria" ? "" : "hidden"}>
              <span>Categoria *</span>
              <select id="promo-form-category">
                ${PROMO_CATEGORIES.map((cat) => `<option value="${escapeHtml(cat)}" ${cat === category ? "selected" : ""}>${escapeHtml(cat)}</option>`).join("")}
              </select>
            </div>
          </div>

          <div id="promo-group-products" class="form-field" ${scope === "produto" ? "" : "hidden"}>
            <span>Códigos das peças (separados por vírgula) *</span>
            <input type="text" id="promo-form-codes" placeholder="Ex: AN01, AN02, BR05" value="${escapeHtml(codes)}">
            <small class="field-hint">Informe os códigos das peças cadastradas (ex: AN1, CO2).</small>
          </div>

          <div class="form-row">
            <label class="form-field">
              <span>Tipo de desconto *</span>
              <select id="promo-form-discount-type" required>
                <option value="percent" ${discountType === "percent" ? "selected" : ""}>Porcentagem (% OFF)</option>
                <option value="fixed" ${discountType === "fixed" ? "selected" : ""}>Valor fixo (R$ OFF)</option>
              </select>
            </label>

            <label class="form-field">
              <span id="promo-value-label">${discountType === "percent" ? "Desconto (% OFF) *" : "Desconto (R$ OFF) *"}</span>
              <input type="number" id="promo-form-value" required min="0.01" step="any" placeholder="Ex: 15" value="${escapeHtml(value)}">
            </label>
          </div>

          <div class="form-row">
            <label class="form-field">
              <span>Início da promoção *</span>
              <input type="datetime-local" id="promo-form-starts-at" required value="${escapeHtml(startsAt)}">
            </label>

            <label class="form-field">
              <span>Término da promoção *</span>
              <input type="datetime-local" id="promo-form-ends-at" required value="${escapeHtml(endsAt)}">
            </label>
          </div>

          <div class="form-row">
            <label class="form-field">
              <span>Limite de peças</span>
              <input type="number" id="promo-form-max-units" min="1" step="1" placeholder="Sem limite se vazio" value="${escapeHtml(maxUnits)}">
              <small class="field-hint">Encerra após atingir o total vendido.</small>
            </label>

            <label class="form-field-checkbox">
              <input type="checkbox" id="promo-form-active" ${isActive ? "checked" : ""}>
              <span>Campanha ativa</span>
            </label>
          </div>
        </div>

        <div class="dialog-actions">
          <button id="promo-dialog-cancel" type="button" class="promo-btn-secondary">Cancelar</button>
          <button id="promo-dialog-submit" type="submit" class="btn-primary">Salvar promoção</button>
        </div>
      </form>
    </div>
  `
}

export function filterProductsForPromo(products, componentsByProductCode, term) {
  const normalized = (term || "").trim().toLowerCase()
  if (!normalized) return products
  return products.filter((product) => {
    if (String(product.name || "").toLowerCase().includes(normalized)) return true
    if (String(product.code || "").toLowerCase().includes(normalized)) return true
    const components = componentsByProductCode[product.code] || []
    return components.some((c) => String(c.name || "").toLowerCase().includes(normalized))
  })
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisPromocoesLogic = {
    PROMO_CATEGORIES,
    computePromotionStatus,
    formatDiscountDisplay,
    formatDateTimeBR,
    toLocalDatetimeInput,
    formatDateRange,
    formatUnitsLimit,
    parseProductCodes,
    validatePromotionPayload,
    filterPromotions,
    filterProductsForPromo,
    escapeHtml,
    renderPromoCard,
    renderPromotionsPage,
    renderPromoDialogContent,
  }
}

