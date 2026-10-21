// Peça, embalagem e listagem de estoque do painel.
import { ADD_PRODUCT_CATEGORIES, parseImageUrlLines, parseMoneyBRL } from "../estoque/adicionar-peca/adicionar-peca.logic.js"
import { entityPhotoHtml, renderEntityCard } from "./painel-entity.logic.js"
import { shouldShowHomeChannels } from "./painel.logic.js"
import {
  displayQuantity,
  escapeHtml,
  formatActionDateTime,
  formatActionLabel,
  formatPrice
} from "./painel.texto.logic.js"

export const NCM_DEFAULT = "71171900"
export const ORIGEM_DEFAULT = 0
export const STOCK_PAGE_SIZE = 20

// Embalagem padrão ao adicionar peça. A categoria pode trazer outros valores.
export const PACKAGING_FIELDS = ["peso_g", "largura_cm", "comprimento_cm", "altura_cm"]
export const PACKAGING_DEFAULTS = {
  peso_g: "80",
  comprimento_cm: "20",
  largura_cm: "17",
  altura_cm: "5"
}

const PLACEHOLDER_FIELDS = ["descricao", "peso_g", "largura_cm", "altura_cm", "comprimento_cm"]

// A função category-defaults devolve um array [{ category, peso_g, ... }].
// O painel usa um mapa por nome (Anel, Brinco…).
export function normalizeCategoryDefaults(raw) {
  if (Array.isArray(raw)) {
    const map = {}
    for (const row of raw) {
      if (!row || typeof row !== "object") continue
      const name = String(row.category || row.categoria || "").trim()
      if (!name) continue
      map[name] = row
    }
    return map
  }
  if (raw && typeof raw === "object") return raw
  return {}
}

export function defaultsFor(data, categoria) {
  const name = String(categoria || "").trim()
  const bag = normalizeCategoryDefaults(
    data?.defaults && typeof data.defaults === "object" ? data.defaults : data
  )
  if (!bag || typeof bag !== "object") return {}
  if (name && bag[name] && typeof bag[name] === "object") return bag[name]
  if (name) {
    const match = Object.keys(bag).find((key) => key.toLowerCase() === name.toLowerCase())
    if (match && bag[match] && typeof bag[match] === "object") return bag[match]
  }
  if (name && bag.categoria === name && bag.defaults && typeof bag.defaults === "object") {
    return normalizeCategoryDefaults(bag.defaults)
  }
  const direct = ["descricao", "peso_g", "largura_cm", "altura_cm", "comprimento_cm", "ncm", "origem"]
  if (direct.some((key) => bag[key] != null && bag[key] !== "")) return bag
  return {}
}

export function fieldPlaceholder(field, defaults) {
  const value = defaults?.[field]
  if (value != null && String(value).trim() !== "") return String(value)
  if (field === "ncm") return NCM_DEFAULT
  if (field === "origem") return String(ORIGEM_DEFAULT)
  return ""
}

function filled(value) {
  return value != null && String(value).trim() !== ""
}

export function packagingValues(defaults = {}) {
  const out = {}
  for (const field of PACKAGING_FIELDS) {
    const fromCategory = defaults?.[field]
    out[field] = filled(fromCategory) ? String(fromCategory) : PACKAGING_DEFAULTS[field]
  }
  return out
}

export function samePackagingNumber(a, b) {
  const left = String(a ?? "").trim().replace(",", ".")
  const right = String(b ?? "").trim().replace(",", ".")
  if (!left && !right) return true
  const na = Number(left)
  const nb = Number(right)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb
  return left === right
}

// Só troca o valor se ainda for o sugerido anterior (o usuário não mexeu).
export function nextPackagingValues({ current = {}, previousSuggested = {}, nextSuggested = {} } = {}) {
  const next = {}
  for (const field of PACKAGING_FIELDS) {
    const cur = current[field]
    const prev = previousSuggested[field]
    const suggested = nextSuggested[field]
    next[field] = samePackagingNumber(cur, prev) ? String(suggested ?? "") : String(cur ?? "")
  }
  return next
}

export function pieceFormState(piece = {}, defaults = {}) {
  const photos = Array.isArray(piece.image_urls) ? piece.image_urls.filter(Boolean) : []
  if (!photos.length && piece.image_url) photos.push(piece.image_url)
  const marketplace = piece.preco_marketplace
  return {
    code: String(piece.code || "").trim(),
    name: String(piece.name || "").trim(),
    unitPrice: filled(piece.unit_price) ? String(piece.unit_price).replace(".", ",") : "",
    precoMarketplace: filled(marketplace) && Number.isFinite(Number(marketplace))
      ? String(marketplace).replace(".", ",")
      : "",
    quantity: displayQuantity(piece.quantity),
    categoria: String(piece.categoria || "").trim(),
    photos: photos.join("\n"),
    descricao: filled(piece.descricao) ? String(piece.descricao) : "",
    peso_g: filled(piece.peso_g) ? String(piece.peso_g) : "",
    largura_cm: filled(piece.largura_cm) ? String(piece.largura_cm) : "",
    altura_cm: filled(piece.altura_cm) ? String(piece.altura_cm) : "",
    comprimento_cm: filled(piece.comprimento_cm) ? String(piece.comprimento_cm) : "",
    ncm: filled(piece.ncm) ? String(piece.ncm) : (filled(defaults.ncm) ? String(defaults.ncm) : NCM_DEFAULT),
    origem: filled(piece.origem) || piece.origem === 0
      ? String(piece.origem)
      : (filled(defaults.origem) || defaults.origem === 0 ? String(defaults.origem) : String(ORIGEM_DEFAULT)),
    gtin: filled(piece.gtin) ? String(piece.gtin) : "",
    placeholders: Object.fromEntries(PLACEHOLDER_FIELDS.map((field) => [field, fieldPlaceholder(field, defaults)]))
  }
}

function optionalNumber(raw) {
  const text = String(raw ?? "").trim().replace(",", ".")
  if (!text) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

export function buildProductUpdatePayload(input = {}) {
  const code = String(input.code || "").trim()
  const quantity = displayQuantity(input.quantity)
  const ncm = String(input.ncm ?? "").trim() || NCM_DEFAULT
  const origemText = String(input.origem ?? "").trim()
  const origem = origemText === "" ? ORIGEM_DEFAULT : Number(origemText)
  const gtin = String(input.gtin ?? "").trim()
  return {
    code,
    unit_price: parseMoneyBRL(input.unitPrice),
    quantity,
    categoria: String(input.categoria || "").trim(),
    image_urls: parseImageUrlLines(input.photos),
    descricao: String(input.descricao ?? "").trim(),
    peso_g: optionalNumber(input.peso_g),
    largura_cm: optionalNumber(input.largura_cm),
    altura_cm: optionalNumber(input.altura_cm),
    comprimento_cm: optionalNumber(input.comprimento_cm),
    ncm,
    origem: Number.isFinite(origem) ? origem : ORIGEM_DEFAULT,
    gtin: gtin || null
  }
}

export function validateProductUpdate(payload) {
  if (!payload.code) return "Informe o código da peça."
  if (!Number.isFinite(payload.unit_price) || payload.unit_price < 0) return "Informe um preço válido."
  if (!Number.isInteger(payload.quantity) || payload.quantity < 0) return "A quantidade precisa ser um número inteiro."
  return ""
}

export function buildAddProductPayload(input = {}) {
  const extra = buildProductUpdatePayload(input)
  return {
    code: String(input.code || "").trim(),
    name: String(input.name || "").trim(),
    unit_price: extra.unit_price,
    quantity: extra.quantity,
    categoria: extra.categoria,
    image_url: extra.image_urls[0] || "",
    image_urls: extra.image_urls,
    descricao: extra.descricao,
    peso_g: extra.peso_g,
    largura_cm: extra.largura_cm,
    altura_cm: extra.altura_cm,
    comprimento_cm: extra.comprimento_cm,
    ncm: extra.ncm,
    origem: extra.origem,
    gtin: extra.gtin
  }
}

export function validateAddProduct(payload) {
  if (!payload.code) return "Informe o código da peça."
  if (!payload.name) return "Informe o nome da peça."
  return validateProductUpdate(payload)
}

/** Corpo de admin-product-archive. archive omitido = arquivar (padrão true no back). */
export function archivePayload(code, archive = true) {
  const body = { code: String(code || "").trim() }
  if (archive === false) body.archive = false
  return body
}

export function archiveConfirmText(piece) {
  const code = String(piece?.code || "").trim()
  const name = String(piece?.name || "").trim()
  const label = name && code ? `${name} (${code})` : (code || name || "esta peça")
  return `Arquivar ${label}? Ela sai da lista do estoque.`
}

export function componentSku(productCode, tipo) {
  const code = String(productCode || "").trim()
  const suffix = String(tipo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
  if (!code || !suffix) return ""
  return `${code}-${suffix}`
}

export function isComponentSku(sku, productCode) {
  const code = String(productCode || "").trim()
  const value = String(sku || "").trim()
  if (!code || !value.startsWith(`${code}-`)) return false
  return /^[A-Z0-9]+$/.test(value.slice(code.length + 1))
}

export function componentUpdatePayload({ componentId, productCode, sku }) {
  return {
    component_id: Number(componentId),
    product_code: String(productCode || "").trim(),
    sku: String(sku || "").trim()
  }
}

/** Peças com quantidade > 0. */
export function inStockProducts(products) {
  return (products || []).filter((piece) => displayQuantity(piece.quantity) > 0)
}

/** Peças esgotadas (quantidade 0). */
export function outOfStockProducts(products) {
  return (products || []).filter((piece) => displayQuantity(piece.quantity) === 0)
}

export function renderStockList(products, formatMoney = formatPrice, options = {}) {
  const rows = products || []
  const empty = options.empty || "Nenhuma peça no estoque."
  if (!rows.length) return `<p class="empty">${escapeHtml(empty)}</p>`
  const selectedCodes = options.selectedCodes || new Set()
  return `<ul class="entity-card-list stock-card-list">${rows.map((piece) => {
    const qty = displayQuantity(piece.quantity)
    const photo = entityPhotoHtml({
      image_url: Array.isArray(piece.image_urls) ? piece.image_urls[0] : piece.image_url,
      code: piece.code,
      name: piece.name
    })
    const isStale = Boolean(piece.is_stale || (piece.days_without_sale != null && piece.days_without_sale >= 60))
    const staleDays = piece.days_without_sale != null ? `${piece.days_without_sale}d` : "+60d"
    const staleBadge = isStale ? `⏳ Sem saída há ${staleDays}` : ""
    const promoShortcut = isStale
      ? `<a href="/admin/promocoes?code=${encodeURIComponent(piece.code || "")}" class="btn-xs stock-promo-shortcut" data-promo-shortcut="true" title="Criar promoção para esta peça">Criar promo</a>`
      : ""
    const historyBtn = `<button type="button" class="btn-xs stock-history-shortcut" data-history-code="${escapeHtml(piece.code || "")}" title="Ver histórico de estoque">Histórico</button>`
    const isSelected = selectedCodes.has(piece.code)
    const checkbox = options.selectable !== false
      ? `<label class="stock-select-control" title="Selecionar para ações em lote" onclick="event.stopPropagation()">
          <input type="checkbox" class="stock-checkbox" data-stock-select="${escapeHtml(piece.code || "")}"${isSelected ? " checked" : ""}>
         </label>`
      : ""
    const meta = [
      [piece.code, piece.categoria].filter(Boolean).join(" · "),
      staleBadge
    ].filter(Boolean)
    return `<li class="stock-item-wrap${isSelected ? " is-selected" : ""}">${checkbox}${renderEntityCard({
      title: piece.name || piece.code || "Peça",
      meta,
      sideTitle: formatMoney(piece.unit_price),
      sideMeta: `${qty} un.`,
      photo,
      attrs: `data-product-code="${escapeHtml(piece.code || "")}"`,
      clickable: options.clickable !== false
    })}<div class="stock-item-actions">${promoShortcut}${historyBtn}</div></li>`
  }).join("")}</ul>`
}

function categoryOptions(selected) {
  const current = String(selected || "")
  const blank = `<option value="">Escolha</option>`
  const options = ADD_PRODUCT_CATEGORIES.map((name) => {
    const picked = name === current ? " selected" : ""
    return `<option value="${escapeHtml(name)}"${picked}>${escapeHtml(name)}</option>`
  }).join("")
  return blank + options
}

export const ORIGEM_OPTIONS = [
  { value: 0, label: "0 — Nacional (padrão)" },
  { value: 1, label: "1 — Importada direto" },
  { value: 2, label: "2 — Importada comprada no Brasil" },
  { value: 3, label: "3 — Nacional (importação > 40%)" },
  { value: 4, label: "4 — Nacional com processo produtivo básico" },
  { value: 5, label: "5 — Nacional (importação ≤ 40%)" },
  { value: 6, label: "6 — Importada direto (sem similar nacional)" },
  { value: 7, label: "7 — Importada no mercado interno (sem similar)" },
  { value: 8, label: "8 — Nacional (importação > 70%)" }
]

export function originOptions(selected) {
  const current = selected === "" || selected == null ? ORIGEM_DEFAULT : Number(selected)
  return ORIGEM_OPTIONS.map((opt) => {
    const picked = opt.value === current ? " selected" : ""
    return `<option value="${opt.value}"${picked}>${escapeHtml(opt.label)}</option>`
  }).join("")
}

function field(label, control) {
  return `<label class="field"><span>${label}</span>${control}</label>`
}

export function renderPieceForm(piece, defaults = {}, options = {}) {
  const state = pieceFormState(piece, defaults)
  const showMarketplace = shouldShowHomeChannels(options.enabled) && state.precoMarketplace !== ""
  const priceLabel = shouldShowHomeChannels(options.enabled) ? "Preço do site" : "Preço"
  const input = (id, value, extra = "") =>
    `<input id="${id}" value="${escapeHtml(value)}"${extra}>`
  const marketplaceField = showMarketplace
    ? field(
      "Preço marketplace",
      input("preco-marketplace", state.precoMarketplace, ` readonly tabindex="-1" aria-readonly="true"`)
    )
    : ""
  return `<form id="piece-form" class="stack">
    <p class="kicker">${escapeHtml(state.code)}</p>
    <h2>${escapeHtml(state.name || "Peça")}</h2>
    ${field(priceLabel, input("unit-price", state.unitPrice, ` inputmode="decimal" required`))}
    ${marketplaceField}
    ${field("Quantidade", input("quantity", state.quantity, ` inputmode="numeric" required`))}
    ${field("Categoria", `<select id="categoria">${categoryOptions(state.categoria)}</select>`)}
    ${field("Fotos", `<textarea id="photos" rows="3" placeholder="Uma URL por linha">${escapeHtml(state.photos)}</textarea>`)}
    ${field("Descrição", `<textarea id="descricao" rows="3" placeholder="${escapeHtml(state.placeholders.descricao)}">${escapeHtml(state.descricao)}</textarea>`)}
    ${field("Peso (g)", input("peso", state.peso_g, ` inputmode="decimal" placeholder="${escapeHtml(state.placeholders.peso_g)}"`))}
    ${field("Largura (cm)", input("largura", state.largura_cm, ` inputmode="decimal" placeholder="${escapeHtml(state.placeholders.largura_cm)}"`))}
    ${field("Altura (cm)", input("altura", state.altura_cm, ` inputmode="decimal" placeholder="${escapeHtml(state.placeholders.altura_cm)}"`))}
    ${field("Comprimento (cm)", input("comprimento", state.comprimento_cm, ` inputmode="decimal" placeholder="${escapeHtml(state.placeholders.comprimento_cm)}"`))}
    ${field("NCM", input("ncm", state.ncm, ` placeholder="${escapeHtml(fieldPlaceholder("ncm", defaults))}"`))}
    ${field("Origem", `<select id="origem">${originOptions(state.origem)}</select>`)}
    ${field("GTIN", input("gtin", state.gtin, ` placeholder="Opcional"`))}
    <button class="btn-primary" type="submit">Salvar peça</button>
    <button class="btn-ghost" id="piece-history-open" type="button" data-piece-code="${escapeHtml(state.code)}">Ver histórico de estoque</button>
    <button class="btn-danger" id="archive-open" type="button">Arquivar peça</button>
  </form>`
}

export function renderArchiveDialog(piece) {
  return `<h2>Arquivar peça</h2>
    <p>${escapeHtml(archiveConfirmText(piece))}</p>
    <div class="dialog-actions">
      <button type="button" id="archive-cancel" class="btn-ghost">Cancelar</button>
      <button type="button" id="archive-confirm" class="btn-danger">Arquivar</button>
    </div>`
}

export function renderAddForm(defaults = {}) {
  const state = pieceFormState({}, defaults)
  const pack = packagingValues(defaults)
  return `<form id="add-form" class="stack">
    <h2>Adicionar peça</h2>
    ${field("Código", `<input id="code" required placeholder="Ex.: BM1786-O">`)}
    ${field("Nome", `<input id="name" required placeholder="Nome do produto">`)}
    ${field("Categoria", `<select id="categoria">${categoryOptions("")}</select>`)}
    ${field("Preço", `<input id="unit-price" inputmode="decimal" required placeholder="Ex.: 89,90">`)}
    ${field("Quantidade", `<input id="quantity" inputmode="numeric" required value="1">`)}
    ${field("Fotos", `<textarea id="photos" rows="3" placeholder="Uma URL por linha"></textarea>`)}
    ${field("Descrição", `<textarea id="descricao" rows="3" placeholder="${escapeHtml(state.placeholders.descricao)}"></textarea>`)}
    ${field("Peso (g)", `<input id="peso" inputmode="decimal" value="${escapeHtml(pack.peso_g)}">`)}
    ${field("Largura (cm)", `<input id="largura" inputmode="decimal" value="${escapeHtml(pack.largura_cm)}">`)}
    ${field("Altura (cm)", `<input id="altura" inputmode="decimal" value="${escapeHtml(pack.altura_cm)}">`)}
    ${field("Comprimento (cm)", `<input id="comprimento" inputmode="decimal" value="${escapeHtml(pack.comprimento_cm)}">`)}
    ${field("NCM", `<input id="ncm" value="${NCM_DEFAULT}">`)}
    ${field("Origem", `<select id="origem">${originOptions(ORIGEM_DEFAULT)}</select>`)}
    ${field("GTIN", `<input id="gtin" placeholder="Opcional">`)}
    <button class="btn-primary" type="submit">Adicionar peça</button>
  </form>`
}

/** @deprecated Use renderConjuntosPage em conjuntos.logic.js. Mantido para testes antigos. */
export function renderTipos(products) {
  const blocks = []
  for (const piece of products || []) {
    const components = Array.isArray(piece.components) ? piece.components : []
    if (!components.length) continue
    const rows = components.map((item) => {
      const suggested = item.sku || componentSku(piece.code, item.name)
      return `<label class="sku-row">
        <span>${escapeHtml(item.name || "Divisão")}</span>
        <input data-component-id="${escapeHtml(item.id)}" data-product-code="${escapeHtml(piece.code)}" value="${escapeHtml(suggested)}" placeholder="${escapeHtml(componentSku(piece.code, item.name))}">
      </label>`
    }).join("")
    blocks.push(`<section class="tipo-block">
      <h2>${escapeHtml(piece.name || piece.code)}</h2>
      <p class="hint">${escapeHtml(piece.code)}-<span>DIVISAO</span></p>
      ${rows}
    </section>`)
  }
  if (!blocks.length) return `<p class="empty">Nenhuma peça com divisões.</p>`
  return `<form id="tipos-form" class="stack">${blocks.join("")}<button class="btn-primary" type="submit">Salvar SKUs</button></form>`
}

export function renderImportHelp() {
  return `<p class="hint">O JSON pode trazer, além de código, nome, preço e quantidade: descricao, peso_g, largura_cm, altura_cm, comprimento_cm, ncm, origem e gtin.</p>`
}

export function filterStock(products, query, options = {}) {
  let rows = products || []
  if (options && options.staleOnly) {
    rows = rows.filter((piece) => Boolean(piece.is_stale || (piece.days_without_sale != null && piece.days_without_sale >= 60)))
  }
  const needle = String(query || "").trim().toLocaleLowerCase("pt-BR")
  if (!needle) return rows
  return rows.filter((piece) => {
    const hay = [piece?.code, piece?.name, piece?.categoria].join(" ").toLocaleLowerCase("pt-BR")
    return hay.includes(needle)
  })
}

export function visibleStock(products, query, limit = STOCK_PAGE_SIZE, options = {}) {
  const filtered = filterStock(products, query, options)
  const size = Math.max(1, Number(limit) || STOCK_PAGE_SIZE)
  return { rows: filtered.slice(0, size), total: filtered.length }
}

export function renderStockPage({ rows, total, query, mode = "estoque", typeBlock = "", staleOnly = false, selectedCodes = new Set() }) {
  const shown = (rows || []).length
  const esgotadas = mode === "esgotadas"
  const more = total > shown
    ? `<button type="button" id="stock-more" class="btn-ghost">${esgotadas ? "Mais esgotadas" : "Mais peças"}</button>`
    : ""
  const meta = total ? `<p class="hint" id="stock-meta">${shown} de ${total}</p>` : ""
  const empty = esgotadas
    ? (String(query || "").trim() ? "Nenhuma esgotada com esse nome." : "Nenhuma peça esgotada.")
    : (staleOnly
      ? (String(query || "").trim() ? "Nenhuma peça parada (+60d) com esse nome." : "Nenhuma peça parada (+60d) no estoque.")
      : (String(query || "").trim() ? "Nenhuma peça com esse nome." : "Nenhuma peça no estoque."))
  const staleFilterHtml = !esgotadas
    ? `<div class="stock-filter-chips" role="group" aria-label="Filtro de estoque">
        <button type="button" class="stock-filter-chip${!staleOnly ? " is-active" : ""}" data-stock-filter="all">Todas</button>
        <button type="button" class="stock-filter-chip${staleOnly ? " is-active" : ""}" data-stock-filter="stale">⏳ Paradas</button>
      </div>`
    : ""
  const batchBarHtml = renderStockBatchBar(selectedCodes.size, shown)
  return `<section class="report report--estoque" data-stock-mode="${escapeHtml(mode)}">
    ${typeBlock || ""}
    <form id="stock-search" class="stock-tools" role="search">
      <div class="stock-tools-top">
        <label class="field"><span>Buscar</span>
          <input id="stock-query" type="search" aria-label="Buscar" enterkeyhint="search" value="${escapeHtml(query || "")}" placeholder="Nome, código ou categoria">
        </label>
        <button type="button" id="stock-general-history-btn" class="btn-xs btn-ghost stock-general-history-btn" title="Ver últimas alterações no estoque">📜 Histórico</button>
      </div>
      ${staleFilterHtml}
    </form>
    ${meta}
    <div id="stock-list">${renderStockList(rows, formatPrice, { empty, selectedCodes })}</div>
    ${more}
    <div id="stock-batch-bar-root">${batchBarHtml}</div>
  </section>`
}

export function renderStockBatchBar(selectedCount = 0, totalCount = 0) {
  if (selectedCount <= 0) return ""
  const countLabel = `${selectedCount} ${selectedCount === 1 ? "peça selecionada" : "peças selecionadas"}`
  return `<aside class="stock-batch-bar" role="toolbar" aria-label="Ações em lote">
    <div class="stock-batch-bar__info">
      <span class="stock-batch-bar__count"><strong>${countLabel}</strong></span>
      <button type="button" class="btn-xs btn-ghost" id="stock-batch-clear" title="Desmarcar todas">Desmarcar</button>
      <button type="button" class="btn-xs btn-ghost" id="stock-batch-select-all" title="Selecionar todas as peças exibidas">Selecionar todas</button>
    </div>
    <div class="stock-batch-bar__actions">
      <button type="button" class="btn-sm btn-outline" id="stock-batch-quantity-btn" title="Definir nova quantidade ou somar estoque">📦 Ajustar estoque</button>
      <button type="button" class="btn-sm btn-outline" id="stock-batch-price-btn" title="Reajustar preço por porcentagem ou valor fixo">💲 Reajustar preço</button>
      <button type="button" class="btn-sm btn-outline" id="stock-batch-promo-btn" title="Criar promoção com as peças selecionadas">🏷️ Criar promoção</button>
      <button type="button" class="btn-sm btn-danger-outline" id="stock-batch-archive-btn" title="Arquivar peças selecionadas">🗑️ Arquivar</button>
    </div>
  </aside>`
}

export function renderBatchArchiveDialog(selectedCount, codes = []) {
  const countText = `${selectedCount} ${selectedCount === 1 ? "peça selecionada" : "peças selecionadas"}`
  const preview = codes.slice(0, 10).map((c) => `<code>${escapeHtml(c)}</code>`).join(" ")
  const more = codes.length > 10 ? `<small> e mais ${codes.length - 10}...</small>` : ""
  return `<h2>Arquivar em lote</h2>
    <p>Tem certeza de que deseja arquivar <strong>${countText}</strong>?</p>
    <div class="batch-codes-preview">${preview}${more}</div>
    <p class="hint">Elas sairão da listagem principal do estoque e da loja.</p>
    <div class="dialog-actions">
      <button type="button" id="batch-dialog-cancel" class="btn-ghost">Cancelar</button>
      <button type="button" id="batch-archive-confirm" class="btn-danger">Confirmar arquivamento</button>
    </div>`
}

export function renderBatchQuantityDialog(selectedCount) {
  const countText = `${selectedCount} ${selectedCount === 1 ? "peça" : "peças"}`
  return `<h2>Ajustar estoque em lote</h2>
    <p class="hint">Atualizando estoque de <strong>${countText}</strong>.</p>
    <form id="batch-quantity-form" class="stack">
      <div class="batch-options-group">
        <label class="radio-label">
          <input type="radio" name="quantity_mode" value="set" checked>
          <span>Definir quantidade fixa</span>
        </label>
        <label class="radio-label">
          <input type="radio" name="quantity_mode" value="add">
          <span>Somar ou subtrair quantidade</span>
        </label>
      </div>
      <label class="field" id="batch-quantity-value-field">
        <span id="batch-quantity-label">Nova quantidade</span>
        <input type="number" id="batch-quantity-input" min="0" step="1" value="1" required inputmode="numeric">
      </label>
      <div class="batch-shortcuts" role="group" aria-label="Atalhos rápidos">
        <button type="button" class="btn-xs btn-ghost batch-qty-shortcut" data-qty-mode="set" data-qty-val="1">Repor para 1</button>
        <button type="button" class="btn-xs btn-ghost batch-qty-shortcut" data-qty-mode="add" data-qty-val="1">+1 em cada</button>
        <button type="button" class="btn-xs btn-ghost batch-qty-shortcut" data-qty-mode="set" data-qty-val="0">Zerar estoque</button>
      </div>
      <div class="dialog-actions">
        <button type="button" id="batch-dialog-cancel" class="btn-ghost">Cancelar</button>
        <button type="submit" id="batch-quantity-submit" class="btn-primary">Aplicar ajuste</button>
      </div>
    </form>`
}

export function renderBatchPriceDialog(selectedCount) {
  const countText = `${selectedCount} ${selectedCount === 1 ? "peça" : "peças"}`
  return `<h2>Reajustar preços em lote</h2>
    <p class="hint">Reajustando preços de <strong>${countText}</strong>.</p>
    <form id="batch-price-form" class="stack">
      <div class="batch-options-group">
        <label class="radio-label">
          <input type="radio" name="price_mode" value="percent" checked>
          <span>Porcentagem (%)</span>
        </label>
        <label class="radio-label">
          <input type="radio" name="price_mode" value="fixed">
          <span>Preço fixo (R$)</span>
        </label>
      </div>
      <label class="field" id="batch-price-value-field">
        <span id="batch-price-label">Variação percentual (%)</span>
        <input type="text" id="batch-price-input" placeholder="Ex: 10 para +10%, ou -5 para desconto" required inputmode="decimal">
      </label>
      <div class="batch-shortcuts" role="group" aria-label="Atalhos rápidos">
        <button type="button" class="btn-xs btn-ghost batch-price-shortcut" data-price-mode="percent" data-price-val="10">+10%</button>
        <button type="button" class="btn-xs btn-ghost batch-price-shortcut" data-price-mode="percent" data-price-val="5">+5%</button>
        <button type="button" class="btn-xs btn-ghost batch-price-shortcut" data-price-mode="percent" data-price-val="-10">-10%</button>
      </div>
      <div class="dialog-actions">
        <button type="button" id="batch-dialog-cancel" class="btn-ghost">Cancelar</button>
        <button type="submit" id="batch-price-submit" class="btn-primary">Aplicar reajuste</button>
      </div>
    </form>`
}

export function renderProductHistoryDialog({ code, events, productName } = {}) {
  const list = events || []
  const title = code
    ? `Histórico de Estoque: ${productName ? `${productName} (${code})` : code}`
    : "Auditoria Recente do Estoque"

  const content = list.length
    ? `<ul class="history-timeline">${list.map((ev) => `
        <li class="history-event">
          <div class="history-event__header">
            <span class="history-event__actor"><strong>${escapeHtml(ev.actor_name || "Equipe")}</strong> <small>(${escapeHtml(ev.role || "staff")})</small></span>
            <time class="history-event__time">${escapeHtml(formatActionDateTime(ev.created_at))}</time>
          </div>
          <div class="history-event__body">
            ${ev.entity_id && !code ? `<span class="history-event__code">Peça <code>${escapeHtml(ev.entity_id)}</code>:</span> ` : ""}
            <span>${escapeHtml(formatActionLabel(ev))}</span>
          </div>
        </li>
      `).join("")}</ul>`
    : `<p class="empty">Nenhum registro de alteração encontrado.</p>`

  return `<div class="history-dialog-inner">
    <div class="history-dialog-header">
      <h2>${escapeHtml(title)}</h2>
      <button type="button" class="btn-ghost" id="history-close-btn" aria-label="Fechar">✕</button>
    </div>
    <div class="history-dialog-content">
      ${content}
    </div>
    <div class="dialog-actions">
      <button type="button" class="btn-ghost" id="history-close-bottom-btn">Fechar</button>
    </div>
  </div>`
}
