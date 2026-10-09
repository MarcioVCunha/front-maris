export const STORE_WHATSAPP_NUMBER = "5519992732874"
export const CATALOG_WHATSAPP_MESSAGE = "Oi, vi o catálogo e queria tirar uma dúvida"

export const CATEGORY_ORDER = [
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

const KNOWN_CATEGORIES = new Set(CATEGORY_ORDER)

const CATEGORY_BY_WORD = {
  brinco: "Brinco",
  brincos: "Brinco",
  colar: "Colar",
  colares: "Colar",
  pulseira: "Pulseira",
  pulseiras: "Pulseira",
  choker: "Choker",
  chokers: "Choker",
  anel: "Anel",
  aneis: "Anel",
  pingente: "Pingente",
  pingentes: "Pingente",
  conjunto: "Conjunto",
  conjuntos: "Conjunto",
}

function foldText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function productCategory(name) {
  const first = foldText(name).split(/[^a-z0-9]+/).find(Boolean) || ""
  return CATEGORY_BY_WORD[first] || "Outros"
}

export function resolveProductCategory(product) {
  const stored = String(product?.categoria ?? "").trim()
  if (KNOWN_CATEGORIES.has(stored)) return stored
  return productCategory(product?.name)
}

export function visibleCategories(products) {
  const seen = new Set()
  for (const product of products || []) {
    seen.add(resolveProductCategory(product))
  }
  return CATEGORY_ORDER.filter((name) => seen.has(name))
}

export function productMatchesCategory(product, category) {
  if (!category || category === "Todos") return true
  return resolveProductCategory(product) === category
}

// O trecho depois do último hífen é a cor, se estiver nesta lista.
// AD vem antes de A para o sufixo inteiro não ser lido como A.
export const COLOR_SUFFIXES = [
  { suffix: "AD", label: "Aço dourado" },
  { suffix: "A", label: "Aço" },
  { suffix: "O", label: "Ouro" },
  { suffix: "R", label: "Ródio" },
]

const COLOR_SORT = { O: 0, R: 1, A: 2, AD: 3 }

export function parseProductColor(code) {
  const raw = String(code || "").trim()
  const upper = raw.toUpperCase()
  const hyphen = upper.lastIndexOf("-")
  if (hyphen <= 0 || hyphen >= upper.length - 1) {
    return { base: upper, suffix: null, label: null }
  }
  const tail = upper.slice(hyphen + 1)
  const color = COLOR_SUFFIXES.find((item) => item.suffix === tail)
  if (!color) return { base: upper, suffix: null, label: null }
  return { base: upper.slice(0, hyphen), suffix: color.suffix, label: color.label }
}

export function groupProductsByColor(products) {
  const map = new Map()
  const groups = []
  for (const product of products || []) {
    const parsed = parseProductColor(product?.code)
    const key = parsed.suffix ? `color:${parsed.base}` : `solo:${parsed.base}`
    let group = map.get(key)
    if (!group) {
      group = { key, base: parsed.base, variants: [] }
      map.set(key, group)
      groups.push(group)
    }
    group.variants.push({
      product,
      suffix: parsed.suffix,
      label: parsed.label,
    })
  }
  for (const group of groups) {
    group.variants.sort((a, b) => {
      const ao = a.suffix == null ? 99 : COLOR_SORT[a.suffix]
      const bo = b.suffix == null ? 99 : COLOR_SORT[b.suffix]
      if (ao !== bo) return ao - bo
      return String(a.product?.code || "").localeCompare(String(b.product?.code || ""), "pt-BR")
    })
  }
  return groups
}

export function groupIsAvailable(group, isAvailable) {
  return (group?.variants || []).some((variant) => Boolean(isAvailable?.(variant.product)))
}

export function selectVariantByCode(group, isAvailable, preferredCode) {
  const variants = group?.variants || []
  if (!variants.length) return null
  if (preferredCode) {
    const chosen = variants.find((variant) => String(variant.product?.code) === String(preferredCode))
    if (chosen) return chosen
  }
  return variants.find((variant) => Boolean(isAvailable?.(variant.product))) || variants[0]
}

export function groupDisplayVariant(group, isAvailable) {
  return selectVariantByCode(group, isAvailable, null)
}

export function groupMatchesFilters(group, term, category, isAvailable) {
  const variants = group?.variants || []
  if (term && !variants.some((variant) => doesProductMatchSearch(variant.product, term))) return false
  if (!category || category === "Todos") return true
  const display = groupDisplayVariant(group, isAvailable)
  return productMatchesCategory(display?.product, category)
}

export function partitionCatalogGroups(groups, { term = "", category = "Todos", isAvailable } = {}) {
  const available = []
  const soldOut = []
  for (const group of groups || []) {
    if (!groupMatchesFilters(group, term, category, isAvailable)) continue
    if (groupIsAvailable(group, isAvailable)) available.push(group)
    else soldOut.push(group)
  }
  return { available, soldOut }
}

export function sortGroupsForCatalog(groups, mode, isAvailable, filters = null) {
  const groupByProduct = new Map()
  const products = []
  for (const group of groups || []) {
    const display = filters
      ? displayVariantForFilters(group, filters, isAvailable)
      : groupDisplayVariant(group, isAvailable)
    if (!display?.product) continue
    groupByProduct.set(display.product, group)
    products.push(display.product)
  }
  return sortProductsForCatalog(products, mode).map((product) => groupByProduct.get(product))
}

// Pix é sempre 5% sobre o preço já final (promoção, se houver). Uma conta só.
// O banco vai gravar o mesmo valor em products_public. O nome da coluna ainda não existe.
export const PIX_PRICE_FIELD = ""

export function pixPrice(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 0
  const cents = Math.round(value * 100)
  return Math.round((cents * 95) / 100) / 100
}

export function pixPriceFromSource(product, finalPrice, field = PIX_PRICE_FIELD) {
  const name = String(field || "").trim()
  if (name && product && product[name] != null && product[name] !== "") {
    const value = Number(product[name])
    if (Number.isFinite(value) && value >= 0) return value
  }
  return pixPrice(finalPrice)
}

export function offerFromProduct(product) {
  const listPrice = Number(product?.unit_price) || 0
  const percent = product?.is_on_sale ? Number(product?.discount_percent) || 0 : 0
  const onSale = Boolean(product?.is_on_sale) && percent > 0
  const finalPrice = onSale ? Math.round(listPrice * (1 - percent / 100) * 100) / 100 : listPrice
  return {
    listPrice,
    finalPrice,
    onSale,
    percentOff: onSale ? percent : 0,
    pixPrice: pixPriceFromSource(product, finalPrice),
  }
}

export function cartMoneyTotals(lines) {
  const cents = (lines || []).reduce((sum, line) => {
    const unit = Number(line?.unit_price)
    const quantity = Number(line?.quantity) || 0
    if (!Number.isFinite(unit) || unit <= 0 || quantity <= 0) return sum
    return sum + Math.round(unit * 100) * quantity
  }, 0)
  const total = cents / 100
  return { total, pixTotal: pixPrice(total) }
}

export const NEW_DAYS = 30
// Sem coluna com a quantidade do cadastro. A flag deixa o selo desligado.
export const LAST_UNIT_BADGE_ENABLED = false
export const LAST_UNIT_QUANTITY = 1
export const LAST_UNIT_INITIAL_MIN = 3
export const LAST_UNIT_INITIAL_FIELD = ""

// Texto aprovado pelo PO. Se a redação mudar, só esta constante muda.
export const PIECE_CARE = {
  general: "Pra sua peça durar mais: tire antes do banho, da piscina, do mar e de academia. Passe perfume, creme e maquiagem antes de colocar. Guarde separada das outras peças, num saquinho ou caixinha, longe da umidade. Pra limpar, use só um pano macio e seco.",
  steel: "O aço é mais resistente à água, mas os cuidados acima mantêm o brilho por mais tempo.",
}

export function lastUnitBadgeMatches(quantity, initialQuantity) {
  if (Number(quantity) !== LAST_UNIT_QUANTITY) return false
  const initial = Number(initialQuantity)
  if (!Number.isFinite(initial)) return false
  return initial >= LAST_UNIT_INITIAL_MIN
}

export function showLastUnitBadge(product) {
  if (!LAST_UNIT_BADGE_ENABLED) return false
  const field = LAST_UNIT_INITIAL_FIELD
  if (!field) return false
  return lastUnitBadgeMatches(product?.quantity, product?.[field])
}

export function showNewBadge(product, now = Date.now()) {
  const created = Date.parse(String(product?.created_at || ""))
  if (!Number.isFinite(created)) return false
  const age = now - created
  const windowMs = NEW_DAYS * 24 * 60 * 60 * 1000
  return age >= 0 && age <= windowMs
}

function isSteelPiece(product) {
  const suffix = parseProductColor(product?.code).suffix
  return suffix === "A" || suffix === "AD"
}

export function pieceCareText(product) {
  const general = String(PIECE_CARE?.general || "").trim()
  if (!general) return ""
  const steel = String(PIECE_CARE?.steel || "").trim()
  if (!steel || !isSteelPiece(product)) return general
  return `${general}\n${steel}`
}

export function totalsByProductCode(rows) {
  const totals = new Map()
  for (const row of rows || []) {
    const code = String(row?.code || "").trim().toUpperCase()
    const total = Number(row?.total_vendido)
    if (!code || !Number.isFinite(total) || total < 0) continue
    totals.set(code, total)
  }
  return totals
}

export function groupSoldTotal(group, totals) {
  if (!totals || typeof totals.has !== "function") return 0
  const fromVariants = []
  for (const variant of group?.variants || []) {
    const code = String(variant?.product?.code || "").trim().toUpperCase()
    if (!code || !totals.has(code)) continue
    fromVariants.push(Number(totals.get(code)) || 0)
  }
  if (fromVariants.length) return fromVariants.reduce((sum, value) => sum + value, 0)
  const base = String(group?.base || "").trim().toUpperCase()
  if (base && totals.has(base)) return Number(totals.get(base)) || 0
  return 0
}

function groupCreatedAt(group) {
  let latest = 0
  for (const variant of group?.variants || []) {
    const time = Date.parse(String(variant?.product?.created_at || ""))
    if (Number.isFinite(time) && time > latest) latest = time
  }
  return latest
}

export function sortGroupsByBestsellers(groups, totals) {
  return [...(groups || [])].sort((a, b) => {
    const diff = groupSoldTotal(b, totals) - groupSoldTotal(a, totals)
    if (diff) return diff
    const created = groupCreatedAt(b) - groupCreatedAt(a)
    if (created) return created
    const aName = String(a?.variants?.[0]?.product?.name || a?.base || "")
    const bName = String(b?.variants?.[0]?.product?.name || b?.base || "")
    return aName.localeCompare(bName, "pt-BR")
  })
}

export const COLOR_FILTERS = [
  { id: "dourado", label: "Dourado", suffixes: ["O"] },
  { id: "rodio", label: "Ródio", suffixes: ["R"] },
  { id: "aco", label: "Aço", suffixes: ["A"] },
  { id: "aco-dourado", label: "Aço dourado", suffixes: ["AD"] },
]

export function parsePriceBound(value) {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  let cleaned = raw.replace(/[^\d,.-]/g, "")
  if (!cleaned) return null
  if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

export function displayVariantForFilters(group, filters, isAvailable) {
  const color = COLOR_FILTERS.find((item) => item.id === filters?.colorId)
  if (color) {
    const matches = (group?.variants || []).filter((variant) => color.suffixes.includes(variant.suffix))
    const available = matches.find((variant) => Boolean(isAvailable?.(variant.product)))
    if (available) return available
    if (matches[0]) return matches[0]
  }
  return groupDisplayVariant(group, isAvailable)
}

export function groupPassesFilters(group, filters, isAvailable) {
  const term = filters?.term || ""
  const category = filters?.category || "Todos"
  if (!groupMatchesFilters(group, term, category, isAvailable)) return false
  const color = COLOR_FILTERS.find((item) => item.id === filters?.colorId)
  if (color && !(group?.variants || []).some((variant) => color.suffixes.includes(variant.suffix))) return false
  const display = displayVariantForFilters(group, filters, isAvailable)
  const offer = offerFromProduct(display?.product)
  if (filters?.onSaleOnly && !offer.onSale) return false
  const minPrice = filters?.minPrice
  const maxPrice = filters?.maxPrice
  if (minPrice != null && Number.isFinite(Number(minPrice)) && offer.finalPrice < Number(minPrice)) return false
  if (maxPrice != null && Number.isFinite(Number(maxPrice)) && offer.finalPrice > Number(maxPrice)) return false
  return true
}

export function filterAndPartitionCatalog(groups, filters, isAvailable) {
  const narrowed = (groups || []).filter((group) => groupPassesFilters(group, filters, isAvailable))
  const partitioned = partitionCatalogGroups(narrowed, {
    term: filters?.term || "",
    category: filters?.category || "Todos",
    isAvailable,
  })
  if (filters?.onlyAvailable) return { available: partitioned.available, soldOut: [] }
  return partitioned
}

export function relatedGroups(groups, group, isAvailable, limit = 4) {
  const current = groupDisplayVariant(group, isAvailable)?.product
  const category = resolveProductCategory(current)
  const others = (groups || []).filter((item) => item && item.key !== group?.key)
  const same = others.filter((item) => {
    const product = groupDisplayVariant(item, isAvailable)?.product
    return resolveProductCategory(product) === category
  })
  const available = same.filter((item) => groupIsAvailable(item, isAvailable))
  const soldOut = same.filter((item) => !groupIsAvailable(item, isAvailable))
  return [...available, ...soldOut].slice(0, limit)
}

export function normalizeCategoryParam(value) {
  const raw = String(value || "").trim()
  if (!raw || raw === "Todos") return "Todos"
  if (KNOWN_CATEGORIES.has(raw)) return raw
  const folded = foldText(raw)
  return CATEGORY_ORDER.find((name) => foldText(name) === folded) || "Todos"
}

export function readCatalogLink(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""))
  return {
    categoria: normalizeCategoryParam(params.get("categoria")),
    peca: String(params.get("peca") || "").trim(),
    utmSource: String(params.get("utm_source") || "").trim(),
    utmMedium: String(params.get("utm_medium") || "").trim(),
    utmCampaign: String(params.get("utm_campaign") || "").trim(),
  }
}

export function buildCatalogQuery({ categoria, peca, utmSource, utmMedium, utmCampaign } = {}) {
  const params = new URLSearchParams()
  const category = normalizeCategoryParam(categoria)
  if (category !== "Todos") params.set("categoria", category)
  const piece = String(peca || "").trim()
  if (piece) params.set("peca", piece)
  if (utmSource) params.set("utm_source", utmSource)
  if (utmMedium) params.set("utm_medium", utmMedium)
  if (utmCampaign) params.set("utm_campaign", utmCampaign)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function buildCatalogLink(state) {
  return `/catalog${buildCatalogQuery(state)}`
}

export function resolvePieceLink(groups, baseCode, isAvailable) {
  const wanted = String(baseCode || "").trim().toUpperCase()
  if (!wanted) return { kind: "missing" }
  const group = (groups || []).find((item) => String(item?.base || "").toUpperCase() === wanted)
  if (!group) return { kind: "missing" }
  if (groupIsAvailable(group, isAvailable)) {
    return { kind: "piece", group, variant: groupDisplayVariant(group, isAvailable) }
  }
  const product = group.variants?.[0]?.product
  return { kind: "soldout", category: resolveProductCategory(product) }
}

export function productWhatsappMessage(productName) {
  const name = String(productName || "").trim() || "peça"
  return `Oi, vi o ${name} no catálogo e queria tirar uma dúvida`
}

export function whatsappLink(message) {
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(String(message || ""))}`
}

export function doesProductMatchSearch(product, term) {
  if (!term) return true
  const name = String(product?.name || "").toLowerCase()
  const code = String(product?.code || "").toLowerCase()
  return name.includes(term) || code.includes(term)
}

export function sortProductsForCatalog(products, mode) {
  return [...products].sort((a, b) => {
    if (mode === "price_asc" || mode === "price_desc") {
      const pa = offerFromProduct(a).finalPrice
      const pb = offerFromProduct(b).finalPrice
      if (pa !== pb) return mode === "price_asc" ? pa - pb : pb - pa
    } else if (mode === "created_asc" || mode === "created_desc") {
      const ta = Date.parse(String(a?.created_at || "")) || 0
      const tb = Date.parse(String(b?.created_at || "")) || 0
      if (ta !== tb) return mode === "created_asc" ? ta - tb : tb - ta
    }
    return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR")
  })
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisCatalogLogic = {
    STORE_WHATSAPP_NUMBER,
    CATALOG_WHATSAPP_MESSAGE,
    CATEGORY_ORDER,
    productCategory,
    resolveProductCategory,
    visibleCategories,
    productMatchesCategory,
    COLOR_SUFFIXES,
    parseProductColor,
    groupProductsByColor,
    groupIsAvailable,
    selectVariantByCode,
    groupDisplayVariant,
    groupMatchesFilters,
    partitionCatalogGroups,
    sortGroupsForCatalog,
    PIX_PRICE_FIELD,
    pixPrice,
    pixPriceFromSource,
    offerFromProduct,
    cartMoneyTotals,
    NEW_DAYS,
    LAST_UNIT_BADGE_ENABLED,
    LAST_UNIT_QUANTITY,
    LAST_UNIT_INITIAL_MIN,
    LAST_UNIT_INITIAL_FIELD,
    PIECE_CARE,
    lastUnitBadgeMatches,
    showLastUnitBadge,
    showNewBadge,
    pieceCareText,
    totalsByProductCode,
    groupSoldTotal,
    sortGroupsByBestsellers,
    COLOR_FILTERS,
    parsePriceBound,
    displayVariantForFilters,
    groupPassesFilters,
    filterAndPartitionCatalog,
    relatedGroups,
    normalizeCategoryParam,
    readCatalogLink,
    buildCatalogQuery,
    buildCatalogLink,
    resolvePieceLink,
    productWhatsappMessage,
    whatsappLink,
    doesProductMatchSearch,
    sortProductsForCatalog,
  }
}
