import { assertEquals } from "jsr:@std/assert@1"
import {
  exactPercentPrice,
  pixDiscountPrice,
  priceFloor90,
  quotePromoPrice,
  resolvePromoPrice,
  resolveRowPrice
} from "./promo-price.js"

Deno.test("preço base no ,90 não se aplica à promoção", () => {
  assertEquals(priceFloor90(80), 79.9)
  assertEquals(priceFloor90(100), 99.9)
  assertEquals(exactPercentPrice(100, 20), 80)
  assertEquals(quotePromoPrice(100, "percent", 20), 80)
  assertEquals(quotePromoPrice(100, "fixed", 20), 80)
  assertEquals(resolvePromoPrice({
    listPrice: 100,
    percent: 20,
    onSale: true,
    bankPrice: 79.9
  }), 80)
  assertEquals(pixDiscountPrice(80), 76)
})

Deno.test("sem percentual conhecido o valor do banco permanece", () => {
  assertEquals(resolvePromoPrice({ listPrice: 100, bankPrice: 79.9 }), 79.9)
  assertEquals(resolveRowPrice({
    unit_price: 100,
    preco_efetivo: 79.9
  }), 79.9)
})

Deno.test("componente usa o percentual exato do pai, não a fatia do preço pisado", () => {
  assertEquals(resolveRowPrice({
    parent_unit_price: 100,
    price_percent: 50,
    is_on_sale: true,
    discount_percent: 20,
    preco_efetivo: 39.95
  }), 40)
  assertEquals(resolveRowPrice({
    parent_unit_price: 190.9,
    price_percent: 25,
    is_on_sale: true,
    discount_percent: 25
  }), 35.79)
})
