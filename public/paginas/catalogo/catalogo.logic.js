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
    productWhatsappMessage,
    whatsappLink,
    doesProductMatchSearch,
    sortProductsForCatalog,
  }
}
