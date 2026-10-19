// Preço promocional: valor exato com 2 casas.
// O preço BASE da peça (custo × 2) é que sobe até o próximo ,90.
// Promoção não usa esse piso. Pix é 5% sobre o valor final.

export function roundMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 100) / 100
}

export function sameMoney(left, right) {
  return Math.round(Number(left) * 100) === Math.round(Number(right) * 100)
}

/** Espelha public.price_floor_90 só para reconhecer o valor já arredondado pelo banco. */
export function priceFloor90(amount) {
  const cents = Math.round(Number(amount) * 100)
  if (!Number.isFinite(cents) || cents <= 0) return 0
  if (cents < 90) return cents / 100
  const base = Math.floor((cents - 90) / 100)
  return (base * 100 + 90) / 100
}

export function exactPercentPrice(listPrice, percent) {
  const list = Number(listPrice) || 0
  const pct = Number(percent) || 0
  if (!(pct > 0)) return roundMoney(list)
  return roundMoney(list * (1 - pct / 100))
}

export function exactFixedPrice(listPrice, amountOff) {
  const list = Number(listPrice) || 0
  const off = Number(amountOff) || 0
  return roundMoney(Math.max(0, list - off))
}

export function quotePromoPrice(listPrice, discountType, value) {
  if (discountType === "fixed") return exactFixedPrice(listPrice, value)
  return exactPercentPrice(listPrice, value)
}

export function pixDiscountPrice(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 0
  const cents = Math.round(value * 100)
  return Math.round((cents * 95) / 100) / 100
}

function readBank(row) {
  if (!row || row.preco_efetivo == null || row.preco_efetivo === "") return null
  const value = Number(row.preco_efetivo)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export function resolvePromoPrice({ listPrice = 0, percent = 0, onSale = false, bankPrice = null } = {}) {
  const list = Number(listPrice) || 0
  const pct = onSale ? Number(percent) || 0 : 0
  const exact = pct > 0 ? exactPercentPrice(list, pct) : null
  const bank = bankPrice == null || bankPrice === "" ? null : Number(bankPrice)
  const bankOk = bank != null && Number.isFinite(bank) && bank >= 0
  if (!bankOk) return exact == null ? list : exact
  if (exact == null) return bank
  if (sameMoney(bank, priceFloor90(exact)) && !sameMoney(bank, exact)) return exact
  return bank
}

function componentExact(parent, pricePercent, percent) {
  const factor = percent > 0 ? 1 - percent / 100 : 1
  return roundMoney((parent * pricePercent) / 100 * factor)
}

export function resolveRowPrice(row) {
  const parent = Number(row?.parent_unit_price)
  const pricePercent = Number(row?.price_percent)
  const hasComponent = Number.isFinite(parent) && parent > 0 && Number.isFinite(pricePercent) && pricePercent > 0
  const percent = row?.is_on_sale ? Number(row?.discount_percent) || 0 : 0
  const bank = readBank(row)

  if (hasComponent) {
    const exact = componentExact(parent, pricePercent, percent)
    if (bank == null) return exact
    if (!(percent > 0)) return bank
    const parentExact = exactPercentPrice(parent, percent)
    const fromFlooredParent = roundMoney(priceFloor90(parentExact) * pricePercent / 100)
    const flooredSelf = priceFloor90(exact)
    if (!sameMoney(bank, exact) && (sameMoney(bank, fromFlooredParent) || sameMoney(bank, flooredSelf))) {
      return exact
    }
    return bank
  }

  return resolvePromoPrice({
    listPrice: Number(row?.unit_price) || 0,
    percent,
    onSale: percent > 0,
    bankPrice: bank
  })
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisPromoPrice = {
    roundMoney,
    sameMoney,
    priceFloor90,
    exactPercentPrice,
    exactFixedPrice,
    quotePromoPrice,
    pixDiscountPrice,
    resolvePromoPrice,
    resolveRowPrice
  }
}
