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

// Pix é 5% sobre o preço já final. products_public.preco_pix repete essa conta,
// já com a promoção e com 2 casas. A coluna só existe depois da etapa 2 do banco.
export const PIX_PRICE_FIELD = "preco_pix"
// products_public.preco_efetivo é o preço já com a promoção. Mesmo nome em MarisUtils.
export const EFFECTIVE_PRICE_FIELD = "preco_efetivo"

export function pixPrice(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 0
  const cents = Math.round(value * 100)
  return Math.round((cents * 95) / 100) / 100
}

export function moneyFromSource(product, field) {
  const name = String(field || "").trim()
  if (!name || !product || product[name] == null || product[name] === "") return null
  const value = Number(product[name])
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export function pixPriceFromSource(product, finalPrice, field = PIX_PRICE_FIELD) {
  const value = moneyFromSource(product, field)
  return value == null ? pixPrice(finalPrice) : value
}

export function localFinalPrice(listPrice, onSale, percent) {
  if (!onSale) return listPrice
  return Math.round(listPrice * (1 - percent / 100) * 100) / 100
}

export function offerFromProduct(product) {
  const listPrice = Number(product?.unit_price) || 0
  const legacyPercent = product?.is_on_sale ? Number(product?.discount_percent) || 0 : 0
  const legacyOnSale = Boolean(product?.is_on_sale) && legacyPercent > 0
  const fromBank = moneyFromSource(product, EFFECTIVE_PRICE_FIELD)
  const finalPrice = fromBank == null ? localFinalPrice(listPrice, legacyOnSale, legacyPercent) : fromBank
  const onSale = fromBank != null ? (fromBank < listPrice && listPrice > 0) : legacyOnSale
  let percentOff = 0
  if (onSale) {
    if (legacyPercent > 0) {
      percentOff = legacyPercent
    } else if (fromBank != null && listPrice > 0) {
      percentOff = Math.round((listPrice - fromBank) * 100 / listPrice)
    }
  }
  return {
    listPrice,
    finalPrice,
    onSale,
    percentOff,
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

export const NEW_DAYS = 15
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

export function detectPieceMaterial(product) {
  const code = String(product?.code || "").trim()
  const nameFolded = foldText(product?.name)
  const suffix = parseProductColor(code).suffix

  if (suffix === "AD" || nameFolded.includes("aco dourado")) {
    return {
      id: "aco_dourado",
      label: "Aço Inoxidável Dourado (PVD)",
      metal: "Aço cirúrgico 316L",
      finishing: "Acabamento Dourado PVD",
      badge: "Aço Inox PVD",
      isSteel: true,
      hypoallergenic: "100% hipoalergênico e livre de níquel",
      description: "Base em aço cirúrgico com revestimento dourado em tecnologia PVD. Não descasca, não oxida e é ideal para o dia a dia.",
    }
  }

  if (suffix === "A" || nameFolded.includes("aco inox") || nameFolded.includes("aco cirurgico") || nameFolded.includes("em aco") || (nameFolded.includes("aco") && !nameFolded.includes("aco dourado"))) {
    return {
      id: "aco",
      label: "Aço Inoxidável",
      metal: "Aço cirúrgico 316L",
      finishing: "Polimento espelhado brilhante",
      badge: "Aço Cirúrgico",
      isSteel: true,
      hypoallergenic: "100% hipoalergênico e livre de níquel",
      description: "Aço cirúrgico de altíssima durabilidade, resistente à água e ao suor. Mantém a cor prateada viva sem escurecer.",
    }
  }

  if (suffix === "R" || nameFolded.includes("rodio") || nameFolded.includes("prata")) {
    return {
      id: "rodio",
      label: "Semijoia banhada a ródio branco",
      metal: "Liga nobre para semijoias",
      finishing: "Banho nobre de ródio branco + verniz protetor (não é ouro maciço)",
      badge: "Banhada a ródio branco",
      isSteel: false,
      hypoallergenic: "100% hipoalergênica e livre de níquel",
      description: "Semijoia banhada a ródio branco (acabamento semelhante ao ouro branco) com verniz protetor. Não é ouro maciço; o banho garante o brilho espelhado.",
    }
  }

  return {
    id: "ouro",
    label: "Semijoia banhada a ouro 18k",
    metal: "Liga nobre para semijoias",
    finishing: "Banho multicamadas de ouro 18k + verniz Diamond (não é ouro maciço)",
    badge: "Banhada a ouro 18k",
    isSteel: false,
    hypoallergenic: "100% hipoalergênica e livre de níquel",
    description: "Semijoia banhada a ouro 18k (não é ouro maciço), com verniz protetor que preserva o brilho e aumenta a resistência ao atrito.",
  }
}

export function getPiecePhotoLabels(urls = []) {
  if (!Array.isArray(urls)) return []
  return urls.map((url, index) => {
    const lower = String(url || "").toLowerCase()
    if (index === 0) return { label: "Principal", kind: "front" }
    if (lower.includes("usando") || lower.includes("corpo") || lower.includes("look") || index === 1) {
      return { label: "No corpo / Usando", kind: "wear" }
    }
    if (lower.includes("detalhe") || lower.includes("macro") || index === 2) {
      return { label: "Detalhes da peça", kind: "detail" }
    }
    return { label: `Foto ${index + 1}`, kind: "extra" }
  })
}

export const CATEGORY_SPECS = {
  Colar: {
    categoria: "Colar",
    comprimento: "40 cm a 45 cm (+ 5 cm extensor)",
    fecho: "Fecho lagosta / boia resistente",
    tamanho: "Ajustável no pescoço",
  },
  Choker: {
    categoria: "Choker / Gargantilha",
    comprimento: "35 cm a 38 cm (+ 5 cm extensor)",
    fecho: "Fecho regulável rente ao pescoço",
    tamanho: "Ajustável",
  },
  Pulseira: {
    categoria: "Pulseira",
    comprimento: "16 cm a 18 cm (+ 4 cm extensor)",
    fecho: "Fecho lagosta prático",
    tamanho: "Ajustável para pulsos finos a médios",
  },
  Tornozeleira: {
    categoria: "Tornozeleira",
    comprimento: "22 cm a 24 cm (+ 5 cm extensor)",
    fecho: "Fecho com corrente extensora",
    tamanho: "Ajustável",
  },
  Brinco: {
    categoria: "Brinco",
    comprimento: "Design anatômico e super leve",
    fecho: "Acompanha tarraxas de sustentação confortáveis",
    tamanho: "Confortável para o dia todo",
  },
  Anel: {
    categoria: "Anel",
    comprimento: "Aro anatômico polido",
    fecho: "Modelos reguláveis ou aro padrão",
    tamanho: "Consulte a numeração nas opções",
  },
  Pingente: {
    categoria: "Pingente",
    comprimento: "Passador compatível com correntes finas e médias",
    fecho: "Argola soldada e segura",
    tamanho: "Delicado",
  },
  Conjunto: {
    categoria: "Conjunto",
    comprimento: "Peças coordenadas (colar + brinco / pulseira)",
    fecho: "Fechos e extensores individuais",
    tamanho: "Harmonioso para usar junto ou separado",
  },
  Piercing: {
    categoria: "Piercing fake / pressão",
    comprimento: "Ajuste manual com pressão confortável",
    fecho: "Sem necessidade de furo",
    tamanho: "Regulável",
  },
  Outros: {
    categoria: "Semijoia",
    comprimento: "Tamanho padrão",
    fecho: "Fecho seguro",
    tamanho: "Confortável",
  },
}

export function getCategorySpecifications(category) {
  const norm = String(category || "").trim()
  return CATEGORY_SPECS[norm] || CATEGORY_SPECS.Outros
}

export function getMaterialCareGuide(product) {
  const mat = detectPieceMaterial(product)
  const isSteel = mat.isSteel

  return {
    title: "Cuidados para maior durabilidade",
    material: mat,
    cards: [
      {
        icon: "cosmetics",
        title: "Cosméticos e Perfume",
        text: "Aplique perfumes, loções e maquiagens antes de colocar a peça e aguarde secar na pele.",
      },
      {
        icon: "water",
        title: "Água, Piscina e Mar",
        text: isSteel
          ? "O aço resiste à água doce. Em banhos de mar ou piscina, enxágue com água corrente para retirar sal e cloro."
          : "Retire antes do banho de chuveiro, piscina e praia. O cloro e o sal aceleram o desgaste do banho.",
      },
      {
        icon: "storage",
        title: "Armazenamento Individual",
        text: "Guarde as semijoias separadas em saquinhos ou caixas forradas para evitar atrito e arranhões.",
      },
      {
        icon: "clean",
        title: "Limpeza Delicada",
        text: "Limpe sempre com uma flanela macia e seca. Nunca utilize pastas, sabões abrasivos ou esponjas.",
      },
    ],
    guarantee: "1 ano de garantia no banho (inclui os 90 dias legais) e arrependimento em até 7 dias nas compras pelo site.",
  }
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
  { id: "dourado", label: "Dourado (banho a ouro 18k)", suffixes: ["O"], materialIds: ["ouro"] },
  { id: "rodio", label: "Ródio Branco", suffixes: ["R"], materialIds: ["rodio"] },
  { id: "aco", label: "Aço Inox", suffixes: ["A"], materialIds: ["aco"] },
  { id: "aco-dourado", label: "Aço Dourado (PVD)", suffixes: ["AD"], materialIds: ["aco_dourado"] },
]

export const PRICE_RANGE_PRESETS = [
  { id: "ate-50", label: "Até R$ 50", min: null, max: 50 },
  { id: "50-100", label: "R$ 50 a R$ 100", min: 50, max: 100 },
  { id: "100-200", label: "R$ 100 a R$ 200", min: 100, max: 200 },
  { id: "acima-200", label: "Acima de R$ 200", min: 200, max: null },
]

export function variantMatchesColor(variant, colorFilter) {
  if (!colorFilter || !variant) return false
  if (variant.suffix && colorFilter.suffixes?.includes(variant.suffix)) return true
  const mat = detectPieceMaterial(variant.product)
  if (colorFilter.materialIds?.includes(mat.id)) return true
  return false
}

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
    const matches = (group?.variants || []).filter((variant) => variantMatchesColor(variant, color))
    const available = matches.find((variant) => Boolean(isAvailable?.(variant.product)))
    if (available) return available
    if (matches[0]) return matches[0]
  }
  return groupDisplayVariant(group, isAvailable)
}

export function doesGroupMatchCollection(group, collection, isAvailable) {
  if (!collection) return true
  const codes = Array.isArray(collection.product_codes) ? collection.product_codes : []
  const hasCodes = codes.length > 0
  const maxPrice = collection.max_price != null && Number.isFinite(Number(collection.max_price))
    ? Number(collection.max_price)
    : null

  let codeMatch = false
  if (hasCodes) {
    const groupCodes = (group?.variants || []).map((v) => String(v?.product?.code || "").trim().toUpperCase())
    const baseCode = String(group?.base || "").trim().toUpperCase()
    codeMatch = codes.some((c) => {
      const upper = String(c || "").trim().toUpperCase()
      return Boolean(upper && (groupCodes.includes(upper) || baseCode === upper))
    })
  }

  let priceMatch = false
  if (maxPrice != null) {
    const display = displayVariantForFilters(group, {}, isAvailable)
    const offer = offerFromProduct(display?.product)
    priceMatch = offer.finalPrice <= maxPrice
  }

  if (hasCodes && maxPrice != null) return codeMatch || priceMatch
  if (hasCodes) return codeMatch
  if (maxPrice != null) return priceMatch
  return true
}

export function groupPassesFilters(group, filters, isAvailable) {
  const term = filters?.term || ""
  const category = filters?.category || "Todos"
  if (!groupMatchesFilters(group, term, category, isAvailable)) return false
  const color = COLOR_FILTERS.find((item) => item.id === filters?.colorId)
  if (color && !(group?.variants || []).some((variant) => variantMatchesColor(variant, color))) return false
  const display = displayVariantForFilters(group, filters, isAvailable)
  const offer = offerFromProduct(display?.product)
  if (filters?.onSaleOnly && !offer.onSale) return false
  const minPrice = filters?.minPrice
  const maxPrice = filters?.maxPrice
  if (minPrice != null && Number.isFinite(Number(minPrice)) && offer.finalPrice < Number(minPrice)) return false
  if (maxPrice != null && Number.isFinite(Number(maxPrice)) && offer.finalPrice > Number(maxPrice)) return false
  if (filters?.collection && !doesGroupMatchCollection(group, filters.collection, isAvailable)) return false
  if (filters?.favoritos) {
    const favs = Array.isArray(filters?.favoritesList) ? filters.favoritesList : []
    const groupCodes = (group?.variants || []).map((v) => String(v?.product?.code || "").trim().toUpperCase())
    const baseCode = String(group?.base || "").trim().toUpperCase()
    const isFav = favs.some((f) => {
      const upper = String(f || "").trim().toUpperCase()
      return Boolean(upper && (groupCodes.includes(upper) || baseCode === upper))
    })
    if (!isFav) return false
  }
  return true
}

export function getActiveFilterPills(filters = {}) {
  const pills = []
  if (filters.category && filters.category !== "Todos") {
    pills.push({ type: "category", label: `Categoria: ${filters.category}`, value: filters.category })
  }
  if (filters.collection) {
    pills.push({
      type: "collection",
      label: `Coleção: ${filters.collection.name}`,
      value: filters.collection.slug || filters.collection.id,
    })
  }
  if (filters.favoritos) {
    pills.push({ type: "favoritos", label: "Favoritos", value: true })
  }
  if (filters.colorId) {
    const color = COLOR_FILTERS.find((c) => c.id === filters.colorId)
    pills.push({ type: "color", label: `Banho: ${color?.label || filters.colorId}`, value: filters.colorId })
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    let label = ""
    if (filters.minPrice != null && filters.maxPrice != null) {
      label = `R$ ${filters.minPrice} a R$ ${filters.maxPrice}`
    } else if (filters.minPrice != null) {
      label = `A partir de R$ ${filters.minPrice}`
    } else {
      label = `Até R$ ${filters.maxPrice}`
    }
    pills.push({ type: "price", label, value: { min: filters.minPrice, max: filters.maxPrice } })
  }
  if (filters.onSaleOnly) {
    pills.push({ type: "onSale", label: "Em promoção", value: true })
  }
  if (filters.onlyAvailable) {
    pills.push({ type: "onlyAvailable", label: "Só disponíveis", value: true })
  }
  if (filters.term) {
    pills.push({ type: "term", label: `Busca: "${filters.term}"`, value: filters.term })
  }
  return pills
}

export function countActiveFilters(filters = {}) {
  let count = 0
  if (filters.category && filters.category !== "Todos") count++
  if (filters.collection) count++
  if (filters.favoritos) count++
  if (filters.colorId) count++
  if (filters.minPrice != null || filters.maxPrice != null) count++
  if (filters.onSaleOnly) count++
  if (filters.onlyAvailable) count++
  return count
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
  return same.filter((item) => groupIsAvailable(item, isAvailable)).slice(0, limit)
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function renderCategoryFilterButtons(names, selected) {
  return (names || []).map((name) => {
    const label = String(name ?? "")
    const on = label === selected
    return `<button type="button" class="catalog-filter${on ? " is-selected" : ""}" data-category="${escapeHtml(label)}" aria-pressed="${on ? "true" : "false"}">${escapeHtml(label)}</button>`
  }).join("")
}

export function renderCatalogIdentityHtml(name, code) {
  return `<h3>${escapeHtml(name)}</h3><div class="code">${escapeHtml(code)}</div>`
}

export function renderCatalogPhotoStrip(urls, alt) {
  const shown = (urls || []).filter(Boolean).slice(0, 2)
  if (!shown.length) return `<div class="product-media"><div class="product-photos product-photos-empty"></div></div>`
  const dots = shown.length > 1 ? `<div class="product-photo-dots" aria-hidden="true"><span></span><span></span></div>` : ""
  const nav = shown.length > 1
    ? `<button type="button" class="product-photo-nav prev" data-photo-nav="-1" aria-label="Foto anterior">‹</button><button type="button" class="product-photo-nav next" data-photo-nav="1" aria-label="Próxima foto">›</button>`
    : ""
  return `<div class="product-media"><div class="product-photos">${shown.map((url) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy">`).join("")}</div>${dots}${nav}</div>`
}

export function renderSearchSuggestionsHtml(suggestions, query) {
  const items = suggestions || []
  if (!items.length) return ""
  if (!query) {
    return `
      <div class="catalog-suggestion-header">Sugestões rápidas</div>
      <div class="catalog-suggestion-chips">
        ${items.map((s) => `
          <button type="button" class="catalog-suggestion-chip" data-suggestion-kind="${escapeHtml(s.kind)}" data-suggestion-value="${escapeHtml(s.value)}">
            ${escapeHtml(s.text)}
          </button>
        `).join("")}
      </div>
    `
  }
  return `
      <div class="catalog-suggestion-header">Sugestões</div>
      <div class="catalog-suggestion-list">
        ${items.map((s) => {
          const badge = s.kind === "category" ? "Categoria" : s.kind === "collection" ? "Coleção" : "Peça"
          return `
            <button type="button" class="catalog-suggestion-item" data-suggestion-kind="${escapeHtml(s.kind)}" data-suggestion-value="${escapeHtml(s.value)}" ${s.groupKey ? `data-group-key="${escapeHtml(s.groupKey)}"` : ""}>
              <span class="catalog-suggestion-text">${escapeHtml(s.text)}</span>
              <span class="catalog-suggestion-badge">${badge}</span>
            </button>
          `
        }).join("")}
      </div>
    `
}

export const COMPLEMENTARY_CATEGORIES = {
  Anel: ["Brinco", "Colar", "Pulseira"],
  Brinco: ["Colar", "Anel", "Pulseira"],
  Colar: ["Brinco", "Anel", "Pulseira"],
  Pulseira: ["Anel", "Brinco", "Colar"],
  Conjunto: ["Anel", "Pulseira", "Brinco", "Colar"],
  Choker: ["Brinco", "Anel", "Pulseira"],
  Pingente: ["Colar", "Brinco", "Pulseira"],
  Tornozeleira: ["Pulseira", "Anel"],
  Piercing: ["Brinco", "Colar"],
  Outros: ["Brinco", "Colar", "Anel"],
}

export function getComplementaryCategories(category) {
  const raw = String(category || "").trim()
  if (COMPLEMENTARY_CATEGORIES[raw]) return COMPLEMENTARY_CATEGORIES[raw]
  const byWord = productCategory(raw)
  if (COMPLEMENTARY_CATEGORIES[byWord]) return COMPLEMENTARY_CATEGORIES[byWord]
  const norm = normalizeCategoryParam(raw)
  return COMPLEMENTARY_CATEGORIES[norm] || ["Brinco", "Colar", "Anel"]
}

export function combinaGroups(groups, group, isAvailable, limit = 4) {
  if (!group) return []
  const current = groupDisplayVariant(group, isAvailable)?.product
  const category = resolveProductCategory(current)
  const currentColor = parseProductColor(current?.name || current?.code).colorId
  const targets = getComplementaryCategories(category)

  const others = (groups || []).filter((item) => item && item.key !== group?.key)
  const matching = others.filter((item) => {
    if (!groupIsAvailable(item, isAvailable)) return false
    const product = groupDisplayVariant(item, isAvailable)?.product
    const cat = resolveProductCategory(product)
    return targets.includes(cat)
  })

  const sorted = [...matching].sort((a, b) => {
    const aAvail = groupIsAvailable(a, isAvailable) ? 1 : 0
    const bAvail = groupIsAvailable(b, isAvailable) ? 1 : 0
    if (aAvail !== bAvail) return bAvail - aAvail

    const aColor = parseProductColor(groupDisplayVariant(a, isAvailable)?.product?.name || "").colorId
    const bColor = parseProductColor(groupDisplayVariant(b, isAvailable)?.product?.name || "").colorId
    const aColorMatch = aColor && aColor === currentColor ? 1 : 0
    const bColorMatch = bColor && bColor === currentColor ? 1 : 0
    if (aColorMatch !== bColorMatch) return bColorMatch - aColorMatch

    return String(a?.base || "").localeCompare(String(b?.base || ""))
  })

  return sorted.slice(0, limit)
}

export function renderCombinaComponentCard(component, options = {}) {
  if (!component) return ""
  const name = String(component.name || "Peça do conjunto").trim()
  const qty = Number(component.quantity) || 0
  const isAvailable = qty > 0
  const unitPrice = Number(component.computed_unit_price || component.unit_price) || 0
  const effective = typeof options.effectivePrice === "function" ? options.effectivePrice(component) : unitPrice
  const hasPromoBadge = typeof options.hasPromo === "function" ? options.hasPromo(component) : false
  const pix = typeof options.pixPrice === "function" ? options.pixPrice(effective) : Math.round(effective * 0.95 * 100) / 100

  const priceFormatted = typeof options.formatMoneyBRL === "function"
    ? options.formatMoneyBRL(effective)
    : `R$ ${effective.toFixed(2).replace(".", ",")}`
  const pixFormatted = typeof options.formatMoneyBRL === "function"
    ? options.formatMoneyBRL(pix)
    : `R$ ${pix.toFixed(2).replace(".", ",")}`

  const actionBtn = isAvailable
    ? `<button type="button" class="btn-primary combina-add-btn" data-add-component="${escapeHtml(component.id)}">+ Adicionar à cesta</button>`
    : `<button type="button" class="btn-secondary combina-waitlist-btn" data-waitlist-component="${escapeHtml(component.id)}">Lista de espera</button>`

  const statusBadge = isAvailable
    ? `<span class="combina-badge in-stock">Disponível</span>`
    : `<span class="combina-badge out-of-stock">Esgotado</span>`

  const promoBadge = hasPromoBadge ? `<span class="combina-promo-badge">PROMOÇÃO</span>` : ""

  return `
    <article class="combina-component-card ${isAvailable ? "" : "sold-out"}" data-component-id="${escapeHtml(component.id)}">
      <div class="combina-card-top">
        <span class="combina-type-tag">Conjunto</span>
        ${promoBadge}
        ${statusBadge}
      </div>
      <h3 class="combina-card-title">${escapeHtml(name)}</h3>
      <div class="combina-card-prices">
        <div class="combina-price-main">${priceFormatted}</div>
        <div class="combina-price-pix">${pixFormatted} no Pix</div>
      </div>
      <div class="combina-card-action">
        ${actionBtn}
      </div>
    </article>
  `.trim()
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
  const rawPromo = params.get("promocao") || params.get("promo")
  const onSaleOnly = rawPromo === "1" || rawPromo === "true" || rawPromo === "sim"
  const rawAvail = params.get("disponivel")
  const onlyAvailable = rawAvail === "1" || rawAvail === "true" || rawAvail === "sim"
  const rawFav = params.get("favoritos") || params.get("fav")
  const favoritos = rawFav === "1" || rawFav === "true" || rawFav === "sim"
  const cor = String(params.get("cor") || "").trim().toLowerCase()
  const validColor = COLOR_FILTERS.some((c) => c.id === cor) ? cor : ""
  const ordem = String(params.get("ordem") || "").trim()
  const colecao = String(params.get("colecao") || params.get("collection") || "").trim().toLowerCase()

  return {
    categoria: normalizeCategoryParam(params.get("categoria")),
    peca: String(params.get("peca") || "").trim(),
    cor: validColor,
    ordem,
    onSaleOnly,
    onlyAvailable,
    favoritos,
    colecao,
    minPrice: parsePriceBound(params.get("preco_min") || params.get("min")),
    maxPrice: parsePriceBound(params.get("preco_max") || params.get("max")),
    busca: String(params.get("busca") || params.get("q") || "").trim(),
    utmSource: String(params.get("utm_source") || "").trim(),
    utmMedium: String(params.get("utm_medium") || "").trim(),
    utmCampaign: String(params.get("utm_campaign") || "").trim(),
  }
}

export function buildCatalogQuery(options = {}) {
  const params = new URLSearchParams()
  const category = normalizeCategoryParam(options.categoria)
  if (category !== "Todos") params.set("categoria", category)
  const piece = String(options.peca || "").trim()
  if (piece) params.set("peca", piece)
  if (options.cor) params.set("cor", options.cor)
  if (options.ordem && options.ordem !== "name_asc") params.set("ordem", options.ordem)
  if (options.onSaleOnly) params.set("promocao", "1")
  if (options.onlyAvailable) params.set("disponivel", "1")
  if (options.favoritos) params.set("favoritos", "1")
  const collectionSlug = String(options.colecao || options.collectionSlug || "").trim().toLowerCase()
  if (collectionSlug) params.set("colecao", collectionSlug)
  if (options.minPrice != null && Number.isFinite(Number(options.minPrice))) params.set("preco_min", String(options.minPrice))
  if (options.maxPrice != null && Number.isFinite(Number(options.maxPrice))) params.set("preco_max", String(options.maxPrice))
  if (options.busca) params.set("busca", options.busca)
  if (options.utmSource) params.set("utm_source", options.utmSource)
  if (options.utmMedium) params.set("utm_medium", options.utmMedium)
  if (options.utmCampaign) params.set("utm_campaign", options.utmCampaign)
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
  const termFolded = foldText(term)
  if (!termFolded) return true
  const nameFolded = foldText(product?.name)
  const codeFolded = foldText(product?.code)
  const catFolded = foldText(resolveProductCategory(product))
  return nameFolded.includes(termFolded) || codeFolded.includes(termFolded) || catFolded.includes(termFolded)
}

export function getSearchSuggestions(groups, term, limit = 5) {
  const raw = String(term || "").trim()
  const folded = foldText(raw)

  if (!folded) {
    return [
      { text: "Novidades", kind: "collection", value: "novidades" },
      { text: "Promoções", kind: "collection", value: "promocoes" },
      { text: "Brincos", kind: "category", value: "Brinco" },
      { text: "Colares", kind: "category", value: "Colar" },
      { text: "Anéis", kind: "category", value: "Anel" },
      { text: "Conjuntos", kind: "category", value: "Conjunto" },
    ].slice(0, limit)
  }

  const suggestions = []
  const seenTexts = new Set()

  // 1. Sugestões de categoria
  for (const cat of CATEGORY_ORDER) {
    if (cat === "Outros") continue
    const catFolded = foldText(cat)
    if (catFolded.includes(folded) || folded.includes(catFolded)) {
      const label = cat === "Anel" ? "Anéis" : `${cat}s`
      if (!seenTexts.has(label)) {
        seenTexts.add(label)
        suggestions.push({ text: label, kind: "category", value: cat })
      }
    }
  }

  // 2. Sugestões de coleções (se buscar "novidade" ou "promo")
  if ("novidades".includes(folded) || folded.includes("novid")) {
    if (!seenTexts.has("Novidades")) {
      seenTexts.add("Novidades")
      suggestions.push({ text: "Novidades", kind: "collection", value: "novidades" })
    }
  }
  if ("promocoes".includes(folded) || folded.includes("promo")) {
    if (!seenTexts.has("Promoções")) {
      seenTexts.add("Promoções")
      suggestions.push({ text: "Promoções", kind: "collection", value: "promocoes" })
    }
  }

  // 3. Sugestões de peças individuais por nome ou código
  for (const group of groups || []) {
    if (suggestions.length >= limit) break
    const variant = groupDisplayVariant(group)
    const product = variant?.product
    if (!product) continue

    const name = String(product.name || "").trim()
    const code = String(product.code || "").trim()
    const nameFolded = foldText(name)
    const codeFolded = foldText(code)

    if (nameFolded.includes(folded) || codeFolded.includes(folded)) {
      if (!seenTexts.has(name)) {
        seenTexts.add(name)
        suggestions.push({
          text: name,
          kind: "product",
          value: code,
          groupKey: group.key,
          code: code,
        })
      }
    }
  }

  return suggestions.slice(0, limit)
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
    } else if (mode === "discount_desc") {
      const da = offerFromProduct(a).percentOff || 0
      const db = offerFromProduct(b).percentOff || 0
      if (da !== db) return db - da
      const pa = offerFromProduct(a).finalPrice
      const pb = offerFromProduct(b).finalPrice
      if (pa !== pb) return pa - pb
    } else if (mode === "name_desc") {
      return String(b?.name || "").localeCompare(String(a?.name || ""), "pt-BR")
    }
    return String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR")
  })
}

export function formatMoneyShare(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

export function buildProductShareText(product, options = {}) {
  if (!product) return ""
  const name = String(product.name || "Semijoia").trim()
  const offer = offerFromProduct(product)
  const base = String(options.origin || "").replace(/\/$/, "") || "https://lojamaris.com.br"
  const code = options.code || product.code || ""
  const url = options.url || (code ? `${base}/catalog?peca=${encodeURIComponent(code)}` : `${base}/catalog`)

  let text = `Olha essa semijoia linda da Maris: *${name}*`
  if (offer?.finalPrice) {
    const priceFormatted = formatMoneyShare(offer.finalPrice)
    text += ` por apenas ${priceFormatted}`
    if (offer.pixPrice) {
      const pixFormatted = formatMoneyShare(offer.pixPrice)
      text += ` (ou ${pixFormatted} no Pix à vista)`
    }
  }
  text += `\n\nConfira os detalhes e fotos aqui: ${url}`
  return text
}

export function buildWhatsappShareLink(shareText) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(String(shareText || "").trim())}`
}

export function buildProductOgMetadata(product, options = {}) {
  const base = String(options.origin || "").replace(/\/$/, "") || "https://lojamaris.com.br"
  if (!product) {
    return {
      title: "Catálogo — Maris Semijoias",
      description: "Semijoias elegantes feitas em família, escolhidas com carinho. 5% de desconto no Pix à vista e envio seguro pelas plataformas parceiras.",
      image: options.defaultImage || "",
      url: `${base}/catalog`
    }
  }

  const name = String(product.name || "Semijoia Maris").trim()
  const offer = offerFromProduct(product)
  const code = options.code || product.code || ""
  const url = options.url || (code ? `${base}/catalog?peca=${encodeURIComponent(code)}` : `${base}/catalog`)
  const image = options.image || (Array.isArray(product.images) && product.images[0]) || product.image_url || ""

  let priceText = ""
  if (offer?.finalPrice) {
    const priceFormatted = formatMoneyShare(offer.finalPrice)
    priceText = ` por ${priceFormatted}`
    if (offer.pixPrice) {
      const pixFormatted = formatMoneyShare(offer.pixPrice)
      priceText += ` (${pixFormatted} no Pix)`
    }
  }

  return {
    title: `${name} — Maris Semijoias`,
    description: `${name}${priceText}. Semijoias de alta qualidade com garantia e envio seguro.`,
    image,
    url
  }
}

export function updateOpenGraphTags(metadata, doc = typeof document !== "undefined" ? document : null) {
  if (!doc || !metadata) return
  if (metadata.title) {
    doc.title = metadata.title
    const ogTitle = doc.querySelector?.('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute("content", metadata.title)
    const twTitle = doc.querySelector?.('meta[name="twitter:title"]')
    if (twTitle) twTitle.setAttribute("content", metadata.title)
  }
  if (metadata.description) {
    const ogDesc = doc.querySelector?.('meta[property="og:description"]')
    if (ogDesc) ogDesc.setAttribute("content", metadata.description)
    const twDesc = doc.querySelector?.('meta[name="twitter:description"]')
    if (twDesc) twDesc.setAttribute("content", metadata.description)
  }
  if (metadata.image) {
    const ogImg = doc.querySelector?.('meta[property="og:image"]')
    if (ogImg) ogImg.setAttribute("content", metadata.image)
    const twImg = doc.querySelector?.('meta[name="twitter:image"]')
    if (twImg) twImg.setAttribute("content", metadata.image)
  }
  if (metadata.url) {
    const ogUrl = doc.querySelector?.('meta[property="og:url"]')
    if (ogUrl) ogUrl.setAttribute("content", metadata.url)
  }
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
    EFFECTIVE_PRICE_FIELD,
    pixPrice,
    pixPriceFromSource,
    moneyFromSource,
    localFinalPrice,
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
    detectPieceMaterial,
    getPiecePhotoLabels,
    CATEGORY_SPECS,
    getCategorySpecifications,
    getMaterialCareGuide,
    totalsByProductCode,
    groupSoldTotal,
    sortGroupsByBestsellers,
    COLOR_FILTERS,
    PRICE_RANGE_PRESETS,
    variantMatchesColor,
    getActiveFilterPills,
    countActiveFilters,
    parsePriceBound,
    displayVariantForFilters,
    groupPassesFilters,
    filterAndPartitionCatalog,
    relatedGroups,
    COMPLEMENTARY_CATEGORIES,
    getComplementaryCategories,
    combinaGroups,
    renderCombinaComponentCard,
    renderCategoryFilterButtons,
    renderCatalogIdentityHtml,
    renderCatalogPhotoStrip,
    renderSearchSuggestionsHtml,
    normalizeCategoryParam,
    readCatalogLink,
    buildCatalogQuery,
    buildCatalogLink,
    resolvePieceLink,
    productWhatsappMessage,
    whatsappLink,
    doesProductMatchSearch,
    doesGroupMatchCollection,
    getSearchSuggestions,
    sortProductsForCatalog,
    formatMoneyShare,
    buildProductShareText,
    buildWhatsappShareLink,
    buildProductOgMetadata,
    updateOpenGraphTags,
  }
}
