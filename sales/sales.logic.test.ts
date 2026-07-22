import { assertEquals } from "jsr:@std/assert@1"
import {
  buildQtyOptions,
  computeSaleTotals,
  doesProductMatchSearch,
  getClampedSelectedQuantity,
  isSalesProductShowable,
  sortSalesProductsByName,
} from "./sales.logic.js"

const roundMoney = (n) => Math.round(n * 100) / 100
const effectivePrice = (row) => {
  if (!row?.is_on_sale) return Number(row?.unit_price) || 0
  const pct = Number(row?.discount_percent) || 0
  return roundMoney((Number(row?.unit_price) || 0) * (1 - pct / 100))
}

Deno.test("doesProductMatchSearch: nome e código", () => {
  assertEquals(doesProductMatchSearch({ name: "Anel", code: "A1" }, "anel"), true)
  assertEquals(doesProductMatchSearch({ name: "Anel", code: "A1" }, "b1"), false)
})

Deno.test("doesProductMatchSearch: nome de tipo/componente", () => {
  assertEquals(
    doesProductMatchSearch({ name: "Conjunto", code: "C1" }, "brinco", [{ name: "Brinco ouro" }]),
    true
  )
  assertEquals(
    doesProductMatchSearch({ name: "Conjunto", code: "C1" }, "colar", [{ name: "Brinco ouro" }]),
    false
  )
})

Deno.test("getClampedSelectedQuantity: respeita estoque", () => {
  assertEquals(getClampedSelectedQuantity(5, 2), 2)
  assertEquals(getClampedSelectedQuantity(1, 0), 0)
})

Deno.test("buildQtyOptions: inclui zero até estoque", () => {
  assertEquals(buildQtyOptions(2, 1).includes('value="2"'), true)
})

Deno.test("isSalesProductShowable: componente com estoque", () => {
  const product = { code: "P1", quantity: 0 }
  assertEquals(isSalesProductShowable(product, [{ quantity: 1 }]), true)
  assertEquals(isSalesProductShowable(product, []), false)
})

Deno.test("sortSalesProductsByName: ordem pt-BR", () => {
  const sorted = sortSalesProductsByName([{ name: "Zebra" }, { name: "Ágata" }])
  assertEquals(sorted[0].name, "Ágata")
})

Deno.test("computeSaleTotals: desconto pix 5%", () => {
  const totals = computeSaleTotals({
    selectedItems: [{ code: "P1", quantity: 2 }],
    selectedComponentItems: [],
    productsByCode: { P1: { unit_price: 100, is_on_sale: false } },
    componentsById: {},
    paymentMethod: "pix",
    effectivePrice,
    roundMoney,
  })
  assertEquals(totals.subtotal, 200)
  assertEquals(totals.discount, 10)
  assertEquals(totals.total, 190)
})
