// Painel do admin. Ligado: /admin abre este painel. Promoções continua em /promocoes.
// Fase 2 Passo 1 (canais + preco_marketplace): ADMIN_HOME_CHANNELS_ENABLED ligada.
// Fase 2 Passo 5: Estoque em cards, aba Esgotadas, qtd 1 ao adicionar, Estoque por tipo.
import { ADD_PRODUCT_CATEGORIES, parseImageUrlLines, parseMoneyBRL } from "../estoque/adicionar-peca/adicionar-peca.logic.js"
import { entityPhotoHtml, renderEntityCard } from "./painel-entity.logic.js"

export const ADMIN_DASHBOARD_ENABLED = true
/** Início com canais site/equipe/shopee/ML/tiktok, mês anterior e preço marketplace. Ligada (back-maris PR #16). */
export const ADMIN_HOME_CHANNELS_ENABLED = true
export const NCM_DEFAULT = "71171900"
export const ORIGEM_DEFAULT = 0
export const STOCK_PAGE_SIZE = 20
export const NO_DATA = "sem dados ainda"

export const HOME_CHANNEL_ORDER = ["site", "equipe", "shopee", "mercado_livre", "tiktok"]

// Embalagem padrão ao adicionar peça. A categoria pode trazer outros valores.
export const PACKAGING_FIELDS = ["peso_g", "largura_cm", "comprimento_cm", "altura_cm"]
export const PACKAGING_DEFAULTS = {
  peso_g: "80",
  comprimento_cm: "20",
  largura_cm: "17",
  altura_cm: "5"
}

export const DASHBOARD_VIEWS = [
  { id: "inicio", href: "/admin/inicio", label: "Início" },
  { id: "estoque", href: "/admin/estoque", label: "Estoque" },
  { id: "vendas", href: "/admin/vendas", label: "Vendas" },
  { id: "vendedoras", href: "/admin/vendedoras", label: "Vendedoras" },
  { id: "promocoes", href: "/promocoes", label: "Promoções" }
]

export const STOCK_LINKS = [
  { id: "estoque", href: "/admin/estoque", label: "Peças" },
  { id: "esgotadas", href: "/admin/esgotadas", label: "Esgotadas" },
  { id: "conjuntos", href: "/admin/conjuntos", label: "Conjuntos" },
  { id: "adicionar", href: "/admin/adicionar", label: "Adicionar peça" },
  { id: "importar", href: "/admin/importar", label: "Importar" }
]

const PLACEHOLDER_FIELDS = ["descricao", "peso_g", "largura_cm", "altura_cm", "comprimento_cm"]

export function shouldShowDashboard(enabled = ADMIN_DASHBOARD_ENABLED) {
  return enabled === true
}

export function shouldShowHomeChannels(enabled = ADMIN_HOME_CHANNELS_ENABLED) {
  return enabled === true
}

/** Espelha a regra do banco: 2,5× + R$5, arredondado pra cima até ,90. Ver docs/contratos/painel-admin-inicio.md. */
export function ceilMarketplacePrice(base) {
  if (base == null || base === "") return null
  const amount = Number(base)
  if (!Number.isFinite(amount) || amount < 0) return null
  const raw = amount * 2.5 + 5
  if (!Number.isFinite(raw) || raw <= 0) return null
  return Math.round((Math.ceil(raw - 0.9) + 0.9) * 100) / 100
}

export function dashboardView(pathname, search = "") {
  const path = String(pathname || "").replace(/\/$/, "") || "/"
  const known = {
    "/admin/inicio": "inicio",
    "/admin/estoque": "estoque",
    "/admin/esgotadas": "esgotadas",
    "/admin/vendas": "vendas",
    "/admin/vendedoras": "vendedoras",
    "/admin/peca": "peca",
    "/admin/conjuntos": "conjuntos",
    "/admin/tipos": "conjuntos",
    "/admin/adicionar": "adicionar",
    "/admin/importar": "importar"
  }
  if (known[path]) return known[path]
  const view = new URLSearchParams(search).get("view")
  if (view === "tipos") return "conjuntos"
  return known[`/admin/${view}`] ? view : "inicio"
}

export function isDashboardAdmin(user) {
  return user?.role === "admin"
}

export function isPanelLink(pathname) {
  const path = String(pathname || "").replace(/\/$/, "") || "/"
  return path === "/admin" || path.startsWith("/admin/")
}

export function currentMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit"
  }).format(now)
  return parts.slice(0, 7)
}

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

export function navHtml(active) {
  return DASHBOARD_VIEWS.map((item) => {
    const current = item.id === active ? " aria-current=\"page\"" : ""
    return `<a class="dash-link" href="${item.href}"${current}>${item.label}</a>`
  }).join("")
}

export function stockNavHtml(active) {
  return STOCK_LINKS.map((item) => {
    const current = item.id === active ? " aria-current=\"page\"" : ""
    return `<a class="sub-link" href="${item.href}"${current}>${item.label}</a>`
  }).join("")
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
  return `<ul class="entity-card-list stock-card-list">${rows.map((piece) => {
    const qty = displayQuantity(piece.quantity)
    const photo = entityPhotoHtml({
      image_url: Array.isArray(piece.image_urls) ? piece.image_urls[0] : piece.image_url,
      code: piece.code,
      name: piece.name
    })
    const meta = [[piece.code, piece.categoria].filter(Boolean).join(" · ")].filter(Boolean)
    return `<li>${renderEntityCard({
      title: piece.name || piece.code || "Peça",
      meta,
      sideTitle: formatMoney(piece.unit_price),
      sideMeta: `${qty} un.`,
      photo,
      attrs: `data-product-code="${escapeHtml(piece.code || "")}"`,
      clickable: options.clickable !== false
    })}</li>`
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
    ${field("Origem", input("origem", state.origem, ` inputmode="numeric" placeholder="${escapeHtml(fieldPlaceholder("origem", defaults))}"`))}
    ${field("GTIN", input("gtin", state.gtin, ` placeholder="Opcional"`))}
    <button class="btn-primary" type="submit">Salvar peça</button>
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
    ${field("Origem", `<input id="origem" inputmode="numeric" value="${ORIGEM_DEFAULT}">`)}
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

export function filterStock(products, query) {
  const needle = String(query || "").trim().toLocaleLowerCase("pt-BR")
  const rows = products || []
  if (!needle) return rows
  return rows.filter((piece) => {
    const hay = [piece?.code, piece?.name, piece?.categoria].join(" ").toLocaleLowerCase("pt-BR")
    return hay.includes(needle)
  })
}

export function visibleStock(products, query, limit = STOCK_PAGE_SIZE) {
  const filtered = filterStock(products, query)
  const size = Math.max(1, Number(limit) || STOCK_PAGE_SIZE)
  return { rows: filtered.slice(0, size), total: filtered.length }
}

export function renderStockPage({ rows, total, query, mode = "estoque", typeBlock = "" }) {
  const shown = (rows || []).length
  const esgotadas = mode === "esgotadas"
  const more = total > shown
    ? `<button type="button" id="stock-more" class="btn-ghost">${esgotadas ? "Mais esgotadas" : "Mais peças"}</button>`
    : ""
  const meta = total ? `<p class="hint" id="stock-meta">${shown} de ${total}</p>` : ""
  const empty = esgotadas
    ? (String(query || "").trim() ? "Nenhuma esgotada com esse nome." : "Nenhuma peça esgotada.")
    : (String(query || "").trim() ? "Nenhuma peça com esse nome." : "Nenhuma peça no estoque.")
  return `<section class="report report--estoque" data-stock-mode="${escapeHtml(mode)}">
    ${typeBlock || ""}
    <form id="stock-search" class="stock-tools" role="search">
      <label class="field"><span>Buscar</span>
        <input id="stock-query" type="search" enterkeyhint="search" value="${escapeHtml(query || "")}" placeholder="Nome, código ou categoria">
      </label>
    </form>
    ${meta}
    <div id="stock-list">${renderStockList(rows, formatPrice, { empty })}</div>
    ${more}
  </section>`
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

function money(value, formatMoney) {
  const number = Number(value)
  if (!Number.isFinite(number)) return formatMoney(0)
  return formatMoney(number)
}

function normalizeChannelRow(item) {
  return {
    channel: String(item?.channel || ""),
    orders: Number(item?.orders) || 0,
    charged_total: Number(item?.charged_total) || 0,
    previous_orders: item?.previous_orders == null ? null : Number(item.previous_orders) || 0,
    previous_charged_total: item?.previous_charged_total == null
      ? null
      : Number(item.previous_charged_total) || 0
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
      paid_count: Number(data.previous.paid_count) || 0,
      paid_orders_count: Number(data.previous.paid_orders_count) || 0,
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
      previous_charged_total: prev.charged_total
    }
  })
  return {
    month: String(data.month || ""),
    charged_total: Number(data.charged_total) || 0,
    paid_count: Number(data.paid_count) || 0,
    paid_orders_count: Number(data.paid_orders_count) || 0,
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

function orderedHomeChannels(channels) {
  const map = new Map((channels || []).map((item) => [item.channel, item]))
  return HOME_CHANNEL_ORDER.map((channel) => map.get(channel) || {
    channel,
    orders: 0,
    charged_total: 0,
    previous_orders: 0,
    previous_charged_total: 0
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
      items_count: Number(sale.items_count) || items.length || 0,
      image_url: String(sale.image_url || "").trim(),
      items
    }
  })
}

export function normalizeSellersMonth(data) {
  if (!data || data.ok === false || !Array.isArray(data.sellers)) return null
  return data.sellers.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name || "Vendedora",
    month_ready: true,
    paid_count: Number(seller.paid_count) || 0,
    paid_orders_count: Number(seller.paid_orders_count) || 0,
    charged_total: Number(seller.charged_total) || 0,
    commission_amount: Number(seller.commission_amount) || 0,
    commission_percent: seller.commission_percent == null ? null : Number(seller.commission_percent),
    balance: seller.balance == null || seller.balance === "" ? null : Number(seller.balance)
  }))
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

function paymentLabel(method) {
  if (method === "pix") return "Pix"
  if (method === "dinheiro") return "Dinheiro"
  if (method === "cartao") return "Cartão"
  return ""
}

function statusLabel(status) {
  if (status === "paid") return "Paga"
  if (status === "partial") return "Parcial"
  if (status === "receivable") return "A receber"
  return ""
}

function renderOriginStrip(channelRows, selectedChannel, formatMoney, detailed) {
  if (!channelRows.length) return `<p class="empty">${NO_DATA}</p>`
  return `<div class="origin-strip" role="list">${channelRows.map((item) => {
    const active = selectedChannel && selectedChannel === item.channel
    const delta = detailed && item.previous_charged_total != null
      ? formatMoneyDelta(moneyDelta(item.charged_total, item.previous_charged_total), formatMoney)
      : ""
    return `<button type="button" class="origin-card" role="listitem" data-origin="${escapeHtml(item.channel)}" aria-pressed="${active ? "true" : "false"}">
      <span class="origin-card__name">${escapeHtml(channelLabel(item.channel))}</span>
      <b class="origin-card__total">${escapeHtml(money(item.charged_total, formatMoney))}</b>
      <small class="origin-card__meta">${Number(item.orders) || 0} pedidos</small>
      ${delta ? `<small class="delta origin-card__delta">${escapeHtml(delta)}</small>` : ""}
    </button>`
  }).join("")}</div>`
}

function renderBestSellersBlock(bestSellers, detailed) {
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

  let secondaryTitle = "Mais vendidas"
  let secondaryBody = renderBestSellersBlock(data.best_sellers, detailed)
  if (selected) {
    secondaryTitle = `Vendas · ${channelLabel(selected)}`
    const sales = Array.isArray(options.sales) ? options.sales : []
    const filtered = sales.filter((sale) => String(sale?.channel || "") === selected)
    if (typeof options.renderSales === "function") {
      secondaryBody = options.renderSales(filtered, formatMoney)
    } else {
      secondaryBody = filtered.length
        ? `<ul class="sale-card-list">${filtered.map((sale) => `<li><article class="sale-card sale-card--static">
            <span class="sale-card__copy"><strong>${escapeHtml(sale.customer_name || "Cliente")}</strong>
              <small>${escapeHtml([sale.seller_name, formatWhen(sale.created_at)].filter(Boolean).join(" · "))}</small></span>
            <span class="sale-card__side"><b>${escapeHtml(money(sale.total, formatMoney))}</b>
              <small>${escapeHtml(statusLabel(sale.payment_status))}</small></span>
          </article></li>`).join("")}</ul>`
        : `<p class="empty">Nenhuma venda neste canal.</p>`
    }
  }

  return `<section class="report report--inicio">
    <header class="inicio-hero">
      <h2>Vendas do mês</h2>
      <p class="stat">${escapeHtml(money(data.charged_total, formatMoney))}</p>
      <p class="hint">${data.paid_count} peças · ${data.paid_orders_count} pedidos${data.month ? ` · ${escapeHtml(data.month)}` : ""}</p>
      ${monthDelta ? `<p class="hint delta">${escapeHtml(monthDelta)}</p>` : ""}
    </header>
    <h2>Origem</h2>
    <p class="hint origin-hint">Toque numa origem para ver as vendas. Toque de novo para voltar às mais vendidas.</p>
    ${origins}
    <h2 id="inicio-secondary-title">${escapeHtml(secondaryTitle)}</h2>
    <div id="inicio-secondary">${secondaryBody}</div>
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
  return `<div class="sale-status-filter" role="tablist" aria-label="Filtrar por status">${SALE_STATUS_FILTERS.map((item) => {
    const pressed = item.id === active
    return `<button type="button" class="status-filter-btn${pressed ? " status-filter-btn--active" : ""}" data-status="${escapeHtml(item.id)}" role="tab" aria-selected="${pressed ? "true" : "false"}">${escapeHtml(item.label)}</button>`
  }).join("")}</div>`
}

export function renderVendas(sales, formatMoney = formatPrice, options = {}) {
  const selectedStatus = options.selectedStatus || "all"
  const filterToolbar = renderSalesStatusFilter(selectedStatus)
  const rows = Array.isArray(sales) ? sales : normalizeRecentSales(sales)
  if (!rows) return `<section class="report"><h2>Vendas recentes</h2>${filterToolbar}<p class="empty">${NO_DATA}</p></section>`
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
  return `<section class="report"><h2>Vendas recentes</h2>${filterToolbar}${body}</section>`
}

export function renderVendedoras(sellers, formatMoney = formatPrice, options = {}) {
  const rows = Array.isArray(sellers) ? sellers : normalizeSellersMonth(sellers)
  if (!rows) return `<p class="empty">${NO_DATA}</p>`
  if (!rows.length) return `<p class="empty">Nenhuma vendedora ativa.</p>`
  const selectedId = options.selectedSellerId
  const cards = rows.map((seller) => {
    const month = seller.month_ready
      ? `${seller.paid_count} peças em ${seller.paid_orders_count} pedidos · ${money(seller.charged_total, formatMoney)}`
      : NO_DATA
    const commission = seller.month_ready
      ? `${money(seller.commission_amount, formatMoney)}${seller.commission_percent == null ? "" : ` (${seller.commission_percent}%)`}`
      : NO_DATA
    const balance = seller.balance == null || Number.isNaN(Number(seller.balance))
      ? NO_DATA
      : money(seller.balance, formatMoney)
    const pressed = selectedId != null && String(seller.seller_id) === String(selectedId)
    return `<button type="button" class="seller-card${pressed ? " seller-card--active" : ""}" data-seller-id="${escapeHtml(seller.seller_id)}" aria-pressed="${pressed ? "true" : "false"}">
      <h2>${escapeHtml(seller.name || "Vendedora")}</h2>
      <p>Mês: ${escapeHtml(month)}</p>
      <p>Comissão: ${escapeHtml(commission)}</p>
      <p>Saldo a receber: ${escapeHtml(balance)}</p>
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
      <p class="hint">Toque de novo na vendedora para fechar.</p>
      ${body}
    </section>`
  }

  return `${cards}${salesBlock}`
}

/** Atalho flutuante (+) do painel — esconde na tela de adicionar peça. */
export function shouldShowFab(view) {
  return view !== "adicionar"
}

export function fabMenuHtml() {
  return `<div class="fab-menu" id="fab-menu" hidden>
    <a class="fab-menu__item" href="/admin/adicionar" data-fab="peca">Nova peça</a>
    <a class="fab-menu__item" href="/vendas/nova" data-fab="venda">Nova venda</a>
  </div>`
}

/** Mensagem com botão Desfazer (HTML seguro: texto escapado; botão via JS). */
export function feedbackParts(text, options = {}) {
  return {
    text: String(text || ""),
    undoLabel: options.undo ? String(options.undo.label || "Desfazer") : "",
    undoMs: options.undo?.ms == null ? 8000 : Number(options.undo.ms)
  }
}

/** Rotas antigas de admin que o Vercel manda para as telas novas do painel. */
export const LEGACY_ADMIN_REDIRECTS = [
  { from: "/adicionar-peca", to: "/admin/adicionar" },
  { from: "/importar", to: "/admin/importar" },
  { from: "/addProduct/add-product.html", to: "/admin/adicionar" },
  { from: "/importJson/import.html", to: "/admin/importar" }
]

export { ADD_PRODUCT_CATEGORIES }
