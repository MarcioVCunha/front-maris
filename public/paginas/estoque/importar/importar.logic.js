import { formatImageFailuresWarning } from "../../../compartilhado/image-failures.js"

export { formatImageFailuresWarning }

export const IMPORT_CLIENT_TIMEOUT_MS = 150000
export const IMPORT_LOADING_MESSAGE = "Importando... isso pode levar até 2 minutos"

export const IMPORT_CATEGORIES = [
  "Brinco",
  "Colar",
  "Pulseira",
  "Choker",
  "Anel",
  "Pingente",
  "Conjunto",
  "Tornozeleira",
  "Piercing",
  "Outros",
]

export function parseMoneyBRL(raw) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : NaN
  }
  let text = String(raw ?? "").trim()
  if (!text) return NaN
  text = text.replace(/[R$\s]/gi, "")
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".")
  }
  const value = Number(text)
  return Number.isFinite(value) ? value : NaN
}

export function formatMoneyBRL(value) {
  const num = Number(value) || 0
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export function parseImportJsonText(text) {
  return JSON.parse(text)
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Normaliza um item bruto do arquivo JSON para a estrutura de prévia editável.
 */
export function normalizeImportRow(rawItem, index) {
  const raw = rawItem && typeof rawItem === "object" ? rawItem : {}
  const code = String(raw.codigo || raw.code || "").trim()
  const name = String(raw.nome || raw.name || "").trim()

  // Preço de compra / fornecedor
  const purchase = Number(raw.preco_unitario ?? raw.preco_compra ?? raw.preco_fornecedor)
  const purchasePrice = Number.isFinite(purchase) && purchase > 0 ? purchase : 0

  // Preço de venda: se fornecido explicitamente usa ele; senão 2x o preço de compra; senão preco
  let sell = Number(raw.unit_price ?? raw.preco_venda ?? raw.preco)
  if (!Number.isFinite(sell) || sell <= 0) {
    sell = purchasePrice > 0 ? purchasePrice * 2 : 0
  }
  const sellPrice = Number.isFinite(sell) && sell > 0 ? sell : 0

  // Quantidade
  const qtyRaw = raw.quantidade ?? raw.quantity
  const quantity = Number.isFinite(Number(qtyRaw)) ? Math.max(0, Math.floor(Number(qtyRaw))) : 1

  // Categoria
  const categoria = String(raw.categoria || "").trim()

  // Imagens
  let imageUrl = ""
  let imageUrls = []
  if (Array.isArray(raw.image_urls) && raw.image_urls.length) {
    imageUrls = raw.image_urls.map(String).map((s) => s.trim()).filter(Boolean)
    imageUrl = imageUrls[0] || ""
  } else if (Array.isArray(raw.imagem_urls) && raw.imagem_urls.length) {
    imageUrls = raw.imagem_urls.map(String).map((s) => s.trim()).filter(Boolean)
    imageUrl = imageUrls[0] || ""
  } else if (typeof raw.image_urls === "string" && raw.image_urls.trim()) {
    imageUrls = raw.image_urls.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean)
    imageUrl = imageUrls[0] || ""
  } else if (typeof raw.image_url === "string" && raw.image_url.trim()) {
    imageUrl = raw.image_url.trim()
    imageUrls = [imageUrl]
  } else if (typeof raw.imagem_url === "string" && raw.imagem_url.trim()) {
    imageUrl = raw.imagem_url.trim()
    imageUrls = [imageUrl]
  }

  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, "")
  return {
    _id: `import_${index}_${safeCode || Math.random().toString(36).slice(2, 7)}`,
    code,
    name,
    categoria,
    quantity,
    purchasePrice,
    sellPrice,
    imageUrl,
    imageUrls,
    raw,
  }
}

/**
 * Lê o conteúdo do arquivo (JSON) e retorna lista de itens normalizados ou erro.
 */
export function parseImportFileContent(text) {
  if (!text || typeof text !== "string" || !text.trim()) {
    return { ok: false, error: "Arquivo vazio." }
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: "Não foi possível ler o arquivo ou o JSON está inválido." }
  }

  const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : null)
  if (!items || !items.length) {
    return { ok: false, error: "O arquivo precisa conter uma lista de produtos (array JSON não vazio)." }
  }

  const rows = items.map((it, idx) => normalizeImportRow(it, idx))
  return { ok: true, rows }
}

/**
 * Valida a lista de itens da prévia antes de enviar.
 * Retorna se está tudo válido, códigos duplicados e contagem de erros.
 */
export function validatePreviewItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return {
      isValid: false,
      errorCount: 1,
      totalItems: 0,
      totalQuantity: 0,
      duplicates: [],
      errorsByRow: {},
      summary: "Nenhuma peça para importar.",
    }
  }

  const codeCounts = new Map()
  for (const item of items) {
    const code = String(item.code || "").trim()
    if (code) {
      codeCounts.set(code, (codeCounts.get(code) || 0) + 1)
    }
  }

  const duplicates = []
  for (const [code, count] of codeCounts.entries()) {
    if (count > 1) duplicates.push(code)
  }

  const errorsByRow = {}
  let errorCount = 0
  let totalQuantity = 0

  for (const item of items) {
    const rowErrors = []
    const code = String(item.code || "").trim()
    if (!code) {
      rowErrors.push("Código é obrigatório")
    } else if (codeCounts.get(code) > 1) {
      rowErrors.push("Código duplicado no arquivo")
    }

    if (!item.name || !String(item.name).trim()) {
      rowErrors.push("Nome da peça é obrigatório")
    }

    if (!Number.isFinite(Number(item.sellPrice)) || Number(item.sellPrice) <= 0) {
      rowErrors.push("Preço de venda deve ser maior que zero")
    }

    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0) {
      rowErrors.push("Quantidade deve ser zero ou positiva")
    }

    totalQuantity += Math.max(0, Number(item.quantity) || 0)

    if (rowErrors.length) {
      errorsByRow[item._id] = rowErrors
      errorCount++
    }
  }

  const isValid = errorCount === 0 && items.length > 0
  let summary = ""
  if (items.length === 0) {
    summary = "Nenhuma peça selecionada."
  } else if (!isValid) {
    summary = `${errorCount} ${errorCount === 1 ? "peça com pendência precisa" : "peças com pendências precisam"} de ajuste antes de salvar.`
  } else {
    summary = `${items.length} ${items.length === 1 ? "peça pronta" : "peças prontas"} para importação (${totalQuantity} no total).`
  }

  return {
    isValid,
    errorCount,
    totalItems: items.length,
    totalQuantity,
    duplicates,
    errorsByRow,
    summary,
  }
}

/**
 * Atualiza um campo de um item específico na prévia de forma imutável.
 */
export function updatePreviewItem(items, itemId, field, value) {
  return (items || []).map((item) => {
    if (item._id !== itemId) return item
    const updated = { ...item }

    if (field === "sellPrice") {
      const parsed = parseMoneyBRL(value)
      updated.sellPrice = Number.isFinite(parsed) ? parsed : (value === "" ? 0 : value)
    } else if (field === "purchasePrice") {
      const parsed = parseMoneyBRL(value)
      updated.purchasePrice = Number.isFinite(parsed) ? parsed : (value === "" ? 0 : value)
    } else if (field === "quantity") {
      const num = Number(value)
      updated.quantity = Number.isFinite(num) ? Math.max(0, Math.floor(num)) : 0
    } else if (field === "code") {
      updated.code = String(value || "").trim()
    } else if (field === "name") {
      updated.name = String(value || "").trim()
    } else if (field === "categoria") {
      updated.categoria = String(value || "").trim()
    } else {
      updated[field] = value
    }

    return updated
  })
}

/**
 * Remove um item da prévia por id.
 */
export function removePreviewItem(items, itemId) {
  return (items || []).filter((item) => item._id !== itemId)
}

/**
 * Filtra itens da prévia por busca (código, nome, categoria).
 */
export function filterPreviewItems(items, query) {
  const needle = String(query || "").trim().toLocaleLowerCase("pt-BR")
  if (!needle) return items || []
  return (items || []).filter((item) => {
    const hay = [item.code, item.name, item.categoria].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR")
    return hay.includes(needle)
  })
}

/**
 * Monta o payload pronto para enviar à Edge Function import-products.
 */
export function buildImportPayloadFromPreview(items) {
  return (items || []).map((item) => {
    const base = { ...(item.raw || {}) }
    base.codigo = item.code
    base.code = item.code
    base.nome = item.name
    base.name = item.name
    base.quantidade = item.quantity
    base.quantity = item.quantity
    base.categoria = item.categoria || base.categoria || ""

    const sell = Number(item.sellPrice) || 0
    base.unit_price = sell
    base.preco_venda = sell

    // Se tiver compra original, mantém; senão coloca sell / 2 para coerência com backend
    const purchase = Number(item.purchasePrice) || (sell > 0 ? sell / 2 : 0)
    base.preco_unitario = purchase

    if (item.imageUrl) base.image_url = item.imageUrl
    if (Array.isArray(item.imageUrls) && item.imageUrls.length) base.image_urls = item.imageUrls

    return base
  })
}

export function formatImportSuccessMessage(data) {
  if (data == null) return "Importação concluída."
  if (typeof data === "string" && data.trim()) return data.trim()

  const created = Number(data.created ?? data.created_count ?? data.inserted)
  const updated = Number(data.updated ?? data.updated_count)
  const failed = Number(data.failed ?? data.errors_count ?? data.error_count)
  const total = Number(data.total ?? data.count ?? data.processed)

  const parts = []
  if (Number.isFinite(created) && created > 0) {
    parts.push(`${created} criado${created === 1 ? "" : "s"}`)
  }
  if (Number.isFinite(updated) && updated > 0) {
    parts.push(`${updated} atualizado${updated === 1 ? "" : "s"}`)
  }
  if (Number.isFinite(failed) && failed > 0) {
    parts.push(`${failed} com erro`)
  }
  if (parts.length) return `Importação concluída: ${parts.join(", ")}.`
  if (Number.isFinite(total) && total > 0) {
    return `Importação concluída: ${total} produto${total === 1 ? "" : "s"} processado${total === 1 ? "" : "s"}.`
  }
  if (data.ok === true || data.success === true) return "Importação concluída com sucesso."
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim()
  return "Importação concluída com sucesso."
}

export function formatImportErrorMessage(data, status) {
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data?.error && typeof data.error === "string") return data.error
  if (data?.message && typeof data.message === "string") return data.message
  if (Number.isFinite(status) && status > 0) return `Não foi possível importar (erro HTTP ${status}).`
  return "Não foi possível importar os produtos."
}

/**
 * Renderiza o card individual de prévia editável para a grade.
 */
export function renderImportPreviewCard(item, rowErrors = [], categories = IMPORT_CATEGORIES) {
  const hasErrors = Array.isArray(rowErrors) && rowErrors.length > 0
  const imageMarkup = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name || item.code)}" class="import-card__img" loading="lazy" onerror="this.onerror=null;this.classList.add('is-broken');this.parentNode.innerHTML='<div class=\\'import-card__img-ph\\'>✦</div>';">`
    : `<div class="import-card__img-ph" aria-label="Sem foto">✦</div>`

  const categoryOptions = [
    `<option value="">Selecione…</option>`,
    ...categories.map((cat) => {
      const selected = String(item.categoria || "").trim().toLowerCase() === cat.toLowerCase() ? "selected" : ""
      return `<option value="${escapeHtml(cat)}" ${selected}>${escapeHtml(cat)}</option>`
    }),
  ].join("")

  const formattedSell = Number.isFinite(Number(item.sellPrice)) && Number(item.sellPrice) > 0
    ? Number(item.sellPrice).toFixed(2).replace(".", ",")
    : ""

  const costHint = Number.isFinite(Number(item.purchasePrice)) && Number(item.purchasePrice) > 0
    ? `<span class="import-card__cost-hint">Compra original: R$ ${Number(item.purchasePrice).toFixed(2).replace(".", ",")}</span>`
    : ""

  const errorMarkup = hasErrors
    ? `<div class="import-card__errors" role="alert">
        ${rowErrors.map((err) => `<span class="import-card__error-msg">⚠️ ${escapeHtml(err)}</span>`).join("")}
      </div>`
    : ""

  return `
    <article class="import-card ${hasErrors ? "is-invalid" : ""}" data-item-id="${escapeHtml(item._id)}">
      <div class="import-card__header">
        <div class="import-card__media">
          ${imageMarkup}
        </div>
        <div class="import-card__top-actions">
          <button type="button" class="btn-ghost btn-sm text-danger import-card__remove-btn" data-action="remove-item" data-id="${escapeHtml(item._id)}" title="Remover esta peça da importação">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Excluir</span>
          </button>
        </div>
      </div>

      <div class="import-card__body">
        <div class="import-card__field">
          <label for="code-${escapeHtml(item._id)}">Código <span class="req">*</span></label>
          <input type="text" id="code-${escapeHtml(item._id)}" class="input input-sm import-input" data-field="code" data-id="${escapeHtml(item._id)}" value="${escapeHtml(item.code || "")}" placeholder="Ex.: BR10" required>
        </div>

        <div class="import-card__field">
          <label for="name-${escapeHtml(item._id)}">Nome da peça <span class="req">*</span></label>
          <input type="text" id="name-${escapeHtml(item._id)}" class="input input-sm import-input" data-field="name" data-id="${escapeHtml(item._id)}" value="${escapeHtml(item.name || "")}" placeholder="Ex.: Brinco Flor Cravejada" required>
        </div>

        <div class="import-card__field">
          <label for="cat-${escapeHtml(item._id)}">Categoria</label>
          <select id="cat-${escapeHtml(item._id)}" class="select select-sm import-select" data-field="categoria" data-id="${escapeHtml(item._id)}">
            ${categoryOptions}
          </select>
        </div>

        <div class="import-card__row">
          <div class="import-card__field">
            <label for="qty-${escapeHtml(item._id)}">Estoque / Qtd</label>
            <input type="number" id="qty-${escapeHtml(item._id)}" min="0" step="1" class="input input-sm import-input" data-field="quantity" data-id="${escapeHtml(item._id)}" value="${Number(item.quantity) || 0}">
          </div>

          <div class="import-card__field">
            <label for="price-${escapeHtml(item._id)}">Preço Venda (R$) <span class="req">*</span></label>
            <input type="text" id="price-${escapeHtml(item._id)}" class="input input-sm import-input" data-field="sellPrice" data-id="${escapeHtml(item._id)}" value="${escapeHtml(formattedSell)}" placeholder="Ex.: 49,90" required>
          </div>
        </div>

        ${costHint}
        ${errorMarkup}
      </div>
    </article>
  `
}

/**
 * Renderiza a visualização completa de conferência com topo, busca, contadores e grade.
 */
export function renderImportPreviewView({ items, query = "", validation, isSubmitting = false }) {
  const visible = filterPreviewItems(items, query)
  const errorsByRow = validation?.errorsByRow || {}
  const isValid = Boolean(validation?.isValid)
  const totalCount = items?.length || 0
  const visibleCount = visible.length

  const warningBanner = !isValid
    ? `<div class="import-banner import-banner--warning" role="alert">
        <span>⚠️ <strong>Atenção:</strong> Existem peças com pendências (código vazio, duplicado ou preço inválido). Corrija ou exclua as peças destacadas antes de salvar.</span>
      </div>`
    : `<div class="import-banner import-banner--success">
        <span>✓ <strong>Tudo certo:</strong> Todas as ${totalCount} peças estão prontas para gravação.</span>
      </div>`

  const cardsHtml = visibleCount > 0
    ? visible.map((it) => renderImportPreviewCard(it, errorsByRow[it._id] || [])).join("")
    : `<div class="import-empty">
        <p>Nenhuma peça encontrada para o filtro "<strong>${escapeHtml(query)}</strong>".</p>
      </div>`

  return `
    <div class="import-preview-container stack">
      <div class="import-preview-header">
        <div>
          <h2>Conferência de Importação</h2>
          <p class="lead">${escapeHtml(validation?.summary || "")}</p>
        </div>

        <div class="import-preview-actions">
          <button type="button" id="import-btn-cancel" class="btn-secondary" ${isSubmitting ? "disabled" : ""}>
            ← Escolher outro arquivo
          </button>
          <button type="button" id="import-btn-confirm" class="btn-primary" ${!isValid || isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? "Gravando peças…" : `Confirmar Importação (${totalCount})`}
          </button>
        </div>
      </div>

      ${warningBanner}

      <div class="import-preview-toolbar">
        <div class="import-search-box">
          <input type="search" id="import-search-input" class="input input-sm" placeholder="Buscar por código, nome ou categoria…" value="${escapeHtml(query)}">
          ${query ? `<button type="button" id="import-search-clear" class="btn-ghost btn-sm" title="Limpar busca">×</button>` : ""}
        </div>
        <span class="import-count-tag">${visibleCount} de ${totalCount} peça${totalCount === 1 ? "" : "s"}</span>
      </div>

      <div class="import-preview-grid">
        ${cardsHtml}
      </div>
    </div>
  `
}

/**
 * Renderiza o bloco de upload inicial de arquivos JSON.
 */
export function renderImportUploadBlock() {
  return `
    <div class="import-upload-shell stack">
      <div class="upload-block">
        <input type="file" id="fileInput" accept=".json,.txt,application/json" class="visually-hidden drop-zone__input" />

        <label for="fileInput" class="drop-zone" id="dropZone">
          <span class="drop-zone__icon" aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </span>
          <span class="drop-zone__title">Escolher ou arrastar arquivo JSON</span>
          <span class="drop-zone__hint">Arquivo JSON com as novas peças</span>
        </label>

        <p class="file-name" id="fileName">Nenhum arquivo selecionado</p>
      </div>

      <div class="import-help-box">
        <p class="hint"><strong>Dica:</strong> Após escolher o arquivo, uma tela de conferência abrirá para você revisar fotos, nomes, preços e categorias ou excluir peças antes de salvar no estoque.</p>
      </div>
    </div>
  `
}

/**
 * Renderiza o card de resultado concluído.
 */
export function renderImportResultView({ successMessage, warningText }) {
  return `
    <div class="import-result-card stack">
      <div class="import-result-success">
        <div class="import-result-icon">✓</div>
        <div>
          <h3>${escapeHtml(successMessage)}</h3>
          <p class="lead">As novas peças e alterações já estão salvas no banco e disponíveis no catálogo e estoque.</p>
        </div>
      </div>

      ${warningText ? `<div class="import-banner import-banner--warning">${escapeHtml(warningText)}</div>` : ""}

      <div class="import-result-actions">
        <a href="/admin/estoque" class="btn-primary">Ver peças no Estoque →</a>
        <button type="button" id="import-btn-restart" class="btn-secondary">Importar outro arquivo</button>
      </div>
    </div>
  `
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisImportLogic = {
    IMPORT_CLIENT_TIMEOUT_MS,
    IMPORT_LOADING_MESSAGE,
    IMPORT_CATEGORIES,
    parseMoneyBRL,
    formatMoneyBRL,
    parseImportJsonText,
    normalizeImportRow,
    parseImportFileContent,
    validatePreviewItems,
    updatePreviewItem,
    removePreviewItem,
    filterPreviewItems,
    buildImportPayloadFromPreview,
    formatImportSuccessMessage,
    formatImportErrorMessage,
    formatImageFailuresWarning,
    renderImportPreviewCard,
    renderImportPreviewView,
    renderImportUploadBlock,
    renderImportResultView,
  }
}
