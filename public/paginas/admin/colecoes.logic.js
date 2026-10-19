// Lógica da tela de gerenciamento de coleções temáticas no painel admin.

export function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function computeCollectionStatus(collection, now = Date.now()) {
  if (!collection) return { label: "Desconhecido", tone: "inactive" }
  if (collection.is_active === false) {
    return { label: "Inativa", tone: "inactive" }
  }

  const startMs = Date.parse(String(collection.starts_at || ""))
  const endMs = Date.parse(String(collection.ends_at || ""))

  if (Number.isFinite(startMs) && startMs > now) {
    return { label: "Agendada", tone: "scheduled" }
  }

  if (Number.isFinite(endMs) && endMs < now) {
    return { label: "Expirada", tone: "expired" }
  }

  return { label: "Ativa", tone: "active" }
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

export function formatDateRange(startsAt, endsAt) {
  const startStr = formatDateTimeBR(startsAt)
  const endStr = formatDateTimeBR(endsAt)
  if (!startStr && !endStr) return "Sempre visível"
  if (!startStr) return `Até ${endStr}`
  if (!endStr) return `A partir de ${startStr}`
  return `${startStr} até ${endStr}`
}

export function toLocalDatetimeInput(isoOrDate) {
  if (!isoOrDate) return ""
  const d = typeof isoOrDate === "string" || typeof isoOrDate === "number" ? new Date(isoOrDate) : isoOrDate
  if (!Number.isFinite(d?.getTime?.())) return ""
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatCollectionRules(collection, formatMoney = (v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`) {
  if (!collection) return "Sem regras"
  const maxPrice = collection.max_price != null && Number.isFinite(Number(collection.max_price))
    ? Number(collection.max_price)
    : null
  const codes = Array.isArray(collection.product_codes) ? collection.product_codes : []
  const hasCodes = codes.length > 0

  if (maxPrice != null && hasCodes) {
    return `Até ${formatMoney(maxPrice)} + ${codes.length} peça(s)`
  }
  if (maxPrice != null) {
    return `Até ${formatMoney(maxPrice)}`
  }
  if (hasCodes) {
    return `${codes.length} peça(s) selecionada(s)`
  }
  return "Todas as peças"
}

export function validateCollectionPayload(payload = {}) {
  const name = String(payload.name || "").trim()
  if (!name || name.length > 120) {
    return { ok: false, error: "Informe o nome da coleção (até 120 caracteres)." }
  }

  const rawSlug = String(payload.slug || "").trim()
  const slug = rawSlug ? slugify(rawSlug) : slugify(name)
  if (!slug || slug.length > 140) {
    return { ok: false, error: "Link/slug da coleção inválido (até 140 caracteres)." }
  }

  let max_price = null
  if (payload.max_price !== undefined && payload.max_price !== null && payload.max_price !== "") {
    const p = Number(payload.max_price)
    if (!Number.isFinite(p) || p <= 0) {
      return { ok: false, error: "Preço máximo deve ser maior que zero." }
    }
    max_price = Math.round(p * 100) / 100
  }

  let product_codes = []
  if (Array.isArray(payload.product_codes)) {
    product_codes = payload.product_codes.map((c) => String(c || "").trim().toUpperCase()).filter(Boolean)
  } else if (typeof payload.product_codes === "string") {
    product_codes = payload.product_codes.split(/[,;\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean)
  }
  product_codes = [...new Set(product_codes)]

  const startsAt = String(payload.starts_at || "").trim()
  const endsAt = String(payload.ends_at || "").trim()

  if (startsAt && endsAt) {
    const startMs = Date.parse(startsAt)
    const endMs = Date.parse(endsAt)
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs <= startMs) {
      return { ok: false, error: "O fim da coleção deve ser depois do início." }
    }
  }

  return {
    ok: true,
    data: {
      id: payload.id ? Number(payload.id) : null,
      name,
      slug,
      description: String(payload.description || "").trim().slice(0, 500) || null,
      badge_text: String(payload.badge_text || "").trim().slice(0, 40) || null,
      max_price,
      product_codes,
      is_active: payload.is_active !== false,
      sort_order: Number(payload.sort_order) || 0,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    },
  }
}

export function filterProductsForPicker(products, term, selectedCodes = [], limit = 10) {
  const selectedSet = new Set((selectedCodes || []).map((c) => String(c || "").trim().toUpperCase()))
  const rawTerm = String(term || "").trim().toLowerCase()
  const folded = slugify(rawTerm)

  const unselected = (products || []).filter((p) => {
    const code = String(p?.code || "").trim().toUpperCase()
    return code && !selectedSet.has(code)
  })

  if (!folded) return unselected.slice(0, limit)

  return unselected
    .filter((p) => {
      const name = slugify(p?.name || "")
      const code = String(p?.code || "").toLowerCase()
      return name.includes(folded) || code.includes(rawTerm)
    })
    .slice(0, limit)
}

export function filterCollections(collections, term) {
  const query = slugify(String(term || "").trim())
  if (!query) return collections || []
  return (collections || []).filter((c) => {
    const name = slugify(c?.name || "")
    const slug = slugify(c?.slug || "")
    const badge = slugify(c?.badge_text || "")
    const desc = slugify(c?.description || "")
    return name.includes(query) || slug.includes(query) || badge.includes(query) || desc.includes(query)
  })
}

export function renderCollectionPieceSuggestions(products) {
  return (products || []).map((product) => {
    const code = product?.code ?? ""
    const name = product?.name ?? ""
    return `
          <div class="collection-piece-suggestion-item">
            <span><strong>${escapeHtml(code)}</strong> — ${escapeHtml(name)}</span>
            <button type="button" class="btn-secondary btn-sm" data-add-piece="${escapeHtml(code)}">+ Adicionar</button>
          </div>`
  }).join("")
}

export function renderSelectedPieceChips(productCodes = [], allProducts = []) {
  if (!productCodes.length) {
    return `<p class="collection-picker-empty">Nenhuma peça adicionada manualmente (opcional se usar teto de preço).</p>`
  }
  const productsByCode = new Map((allProducts || []).map((p) => [String(p.code).toUpperCase(), p]))

  return productCodes
    .map((code) => {
      const upper = String(code).toUpperCase()
      const product = productsByCode.get(upper)
      const name = product?.name || upper
      const img = product?.image_url
        ? `<img src="${escapeHtml(product.image_url)}" alt="" class="collection-piece-thumb" />`
        : `<span class="collection-piece-no-thumb">💍</span>`

      return `
        <span class="collection-piece-chip" data-code="${escapeHtml(upper)}">
          ${img}
          <span class="collection-piece-chip-text">
            <strong>${escapeHtml(upper)}</strong>
            <small>${escapeHtml(name)}</small>
          </span>
          <button type="button" class="collection-piece-remove" data-remove-code="${escapeHtml(upper)}" aria-label="Remover ${escapeHtml(upper)}">×</button>
        </span>
      `
    })
    .join("")
}

export function renderCollectionsPage(collections = [], options = {}) {
  const formatMoney = options.formatMoney || ((v) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`)
  const query = options.query || ""
  const filtered = filterCollections(collections, query)

  const rowsHtml = filtered.length
    ? filtered
        .map((c) => {
          const status = computeCollectionStatus(c)
          const badgeHtml = c.badge_text
            ? `<span class="collection-badge-tag">${escapeHtml(c.badge_text)}</span>`
            : ""
          const rulesText = formatCollectionRules(c, formatMoney)
          const dateText = formatDateRange(c.starts_at, c.ends_at)

          return `
            <article class="collection-card" data-collection-id="${escapeHtml(c.id)}">
              <div class="collection-card-head">
                <div class="collection-card-title-group">
                  <div class="collection-card-top-row">
                    <h3 class="collection-card-name">${escapeHtml(c.name)}</h3>
                    ${badgeHtml}
                    <span class="collection-status-pill tone-${status.tone}">${escapeHtml(status.label)}</span>
                  </div>
                  <a href="/catalog?colecao=${escapeHtml(c.slug)}" target="_blank" rel="noopener" class="collection-card-slug" title="Ver no catálogo">
                    maris.com.br/catalog?colecao=<strong>${escapeHtml(c.slug)}</strong> ↗
                  </a>
                </div>
                <div class="collection-card-actions">
                  <button type="button" class="btn-secondary btn-sm" data-edit-collection="${escapeHtml(c.id)}">Editar</button>
                  <button type="button" class="btn-danger btn-sm" data-delete-collection="${escapeHtml(c.id)}">Excluir</button>
                </div>
              </div>

              ${c.description ? `<p class="collection-card-desc">${escapeHtml(c.description)}</p>` : ""}

              <div class="collection-card-details">
                <div class="collection-detail-item">
                  <span class="collection-detail-label">Critério</span>
                  <span class="collection-detail-value">${escapeHtml(rulesText)}</span>
                </div>
                <div class="collection-detail-item">
                  <span class="collection-detail-label">Vigência</span>
                  <span class="collection-detail-value">${escapeHtml(dateText)}</span>
                </div>
                <div class="collection-detail-item">
                  <span class="collection-detail-label">Ordem</span>
                  <span class="collection-detail-value">${escapeHtml(c.sort_order ?? 0)}</span>
                </div>
              </div>
            </article>
          `
        })
        .join("")
    : `<div class="empty-state">
         <p class="empty">Nenhuma coleção cadastrada${query ? ` para "${escapeHtml(query)}"` : ""}.</p>
         <button type="button" class="btn-primary" id="btn-nova-colecao-empty">+ Criar primeira coleção</button>
       </div>`

  return `
    <div class="collections-page">
      <div class="collections-header">
        <div>
          <h2>Coleções Temáticas</h2>
          <p class="collections-subtitle">Monte e agende coleções especiais para a vitrine (Dia das Mães, Presentes até R$ 50, Natal).</p>
        </div>
        <button type="button" class="btn-primary" id="btn-nova-colecao">+ Nova coleção</button>
      </div>

      <div class="collections-toolbar">
        <input
          type="search"
          id="collection-search-input"
          class="collection-search-input"
          placeholder="Buscar coleção por nome, selo ou link..."
          value="${escapeHtml(query)}"
        />
        <div class="collections-count">
          <strong>${filtered.length}</strong> ${filtered.length === 1 ? "coleção" : "coleções"}
        </div>
      </div>

      <div class="collections-list">
        ${rowsHtml}
      </div>
    </div>
  `
}

export function renderCollectionEditDialog(collection = null, allProducts = [], state = {}) {
  const isEditing = Boolean(collection?.id)
  const title = isEditing ? "Editar Coleção" : "Nova Coleção"
  const name = collection?.name || ""
  const slug = collection?.slug || ""
  const description = collection?.description || ""
  const badge_text = collection?.badge_text || ""
  const max_price = collection?.max_price != null ? String(collection.max_price) : ""
  const sort_order = collection?.sort_order != null ? String(collection.sort_order) : "0"
  const is_active = collection ? collection.is_active !== false : true
  const starts_at = toLocalDatetimeInput(collection?.starts_at)
  const ends_at = toLocalDatetimeInput(collection?.ends_at)

  const selectedCodes = state.selectedCodes || collection?.product_codes || []
  const chipsHtml = renderSelectedPieceChips(selectedCodes, allProducts)

  return `
    <div class="collection-dialog-content">
      <div class="collection-dialog-header">
        <h3>${escapeHtml(title)}</h3>
        <button type="button" class="dialog-close-btn" id="collection-close-x" aria-label="Fechar">×</button>
      </div>

      <form id="collection-form" class="collection-form stack">
        <input type="hidden" name="id" value="${escapeHtml(collection?.id || "")}" />

        <div class="form-grid-2">
          <label class="field">
            <span>Nome da coleção *</span>
            <input
              type="text"
              name="name"
              id="collection-name-input"
              required
              maxlength="120"
              placeholder="Ex: Dia das Mães, Presentes até R$ 50"
              value="${escapeHtml(name)}"
            />
          </label>

          <label class="field">
            <span>Link no catálogo (slug) *</span>
            <input
              type="text"
              name="slug"
              id="collection-slug-input"
              required
              maxlength="140"
              placeholder="Ex: dia-das-maes, presentes-ate-50"
              value="${escapeHtml(slug)}"
            />
            <small class="field-hint">Acessível via /catalog?colecao=<strong>slug</strong></small>
          </label>
        </div>

        <div class="form-grid-2">
          <label class="field">
            <span>Texto do Selo / Badge (opcional)</span>
            <input
              type="text"
              name="badge_text"
              maxlength="40"
              placeholder="Ex: Mães, Especial, Presente"
              value="${escapeHtml(badge_text)}"
            />
            <small class="field-hint">Aparece destacado no card das peças.</small>
          </label>

          <label class="field">
            <span>Preço Máximo — Regra Automática (opcional)</span>
            <input
              type="number"
              name="max_price"
              step="0.01"
              min="0.01"
              placeholder="Ex: 50.00"
              value="${escapeHtml(max_price)}"
            />
            <small class="field-hint">Peças até este valor entram automaticamente.</small>
          </label>
        </div>

        <label class="field">
          <span>Descrição da Coleção (opcional)</span>
          <textarea
            name="description"
            rows="2"
            maxlength="500"
            placeholder="Texto convidativo exibido no topo do catálogo quando a coleção for selecionada."
          >${escapeHtml(description)}</textarea>
        </label>

        <fieldset class="collection-picker-fieldset">
          <legend>Peças Selecionadas Manualmente</legend>
          <p class="field-hint">Adicione peças específicas para entrarem na coleção além ou no lugar do teto de preço.</p>

          <div class="collection-picker-search-wrap">
            <input
              type="search"
              id="collection-piece-search"
              class="collection-piece-search"
              placeholder="Digite o código (ex: BM123) ou nome para buscar..."
              autocomplete="off"
            />
            <div id="collection-piece-suggestions" class="collection-piece-suggestions" hidden></div>
          </div>

          <div id="collection-selected-pieces" class="collection-selected-pieces">
            ${chipsHtml}
          </div>
        </fieldset>

        <div class="form-grid-3">
          <label class="field">
            <span>Início (agendamento opcional)</span>
            <input type="datetime-local" name="starts_at" value="${escapeHtml(starts_at)}" />
          </label>

          <label class="field">
            <span>Término (expiração opcional)</span>
            <input type="datetime-local" name="ends_at" value="${escapeHtml(ends_at)}" />
          </label>

          <label class="field">
            <span>Ordem de exibição</span>
            <input type="number" name="sort_order" step="1" value="${escapeHtml(sort_order)}" />
          </label>
        </div>

        <label class="checkbox-field">
          <input type="checkbox" name="is_active" ${is_active ? "checked" : ""} />
          <span>Coleção ativa na vitrine</span>
        </label>

        <p id="collection-form-error" class="form-error" hidden></p>

        <div class="dialog-actions">
          <button type="button" class="btn-secondary" id="collection-cancel-btn">Cancelar</button>
          <button type="submit" class="btn-primary" id="collection-save-btn">Salvar Coleção</button>
        </div>
      </form>
    </div>
  `
}
