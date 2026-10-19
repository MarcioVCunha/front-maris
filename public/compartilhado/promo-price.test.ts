import { assertEquals } from "jsr:@std/assert@1"
import {
  exactFixedPrice,
  exactPercentPrice,
  quotePromoPrice
} from "./promo-price.js"

Deno.test("prévia da promoção usa o valor exato com 2 casas", () => {
  assertEquals(exactPercentPrice(100, 20), 80)
  assertEquals(exactPercentPrice(100, 10), 90)
  assertEquals(exactPercentPrice(100, 0), 100)
  assertEquals(quotePromoPrice(100, "percent", 20), 80)
  assertEquals(quotePromoPrice(100, "fixed", 20), 80)
  assertEquals(exactFixedPrice(100, 20), 80)
  assertEquals(exactFixedPrice(15, 20), 0)
})
