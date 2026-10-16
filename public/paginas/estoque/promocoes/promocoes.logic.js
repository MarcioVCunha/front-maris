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
  }
}
