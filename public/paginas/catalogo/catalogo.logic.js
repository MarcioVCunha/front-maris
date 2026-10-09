export const STORE_WHATSAPP_NUMBER = "5519992732874"
export const CATALOG_WHATSAPP_MESSAGE = "Oi, vi o catálogo e queria tirar uma dúvida"

export const CATEGORY_ORDER = ["Brinco", "Colar", "Pulseira", "Choker", "Anel", "Pingente", "Conjunto", "Outros"]

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

export function visibleCategories(products) {
  const seen = new Set()
  for (const product of products || []) {
    seen.add(productCategory(product?.name))
  }
  return CATEGORY_ORDER.filter((name) => seen.has(name))
}

export function productMatchesCategory(product, category) {
  if (!category || category === "Todos") return true
  return productCategory(product?.name) === category
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

export function sortGroupsForCatalog(groups, mode, isAvailable) {
  const groupByProduct = new Map()
  const products = []
  for (const group of groups || []) {
    const display = groupDisplayVariant(group, isAvailable)
    if (!display?.product) continue
    groupByProduct.set(display.product, group)
    products.push(display.product)
  }
  return sortProductsForCatalog(products, mode).map((product) => groupByProduct.get(product))
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
      const pa = Number(a?.unit_price) || 0
      const pb = Number(b?.unit_price) || 0
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
    productWhatsappMessage,
    whatsappLink,
    doesProductMatchSearch,
    sortProductsForCatalog,
  }
}
