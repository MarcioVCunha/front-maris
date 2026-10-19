// Prévia local do preço promocional: valor exato com 2 casas.
// O preço que o banco manda em preco_efetivo entra como está.
// Quando o front calcula a promoção sozinho, também usa 2 casas, sem piso ,90.

export function roundMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 100) / 100
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
