import { assertEquals } from "jsr:@std/assert@1"

// deno-lint-ignore no-explicit-any
;(globalThis as any).window = {}
await import("./utils.js")
// deno-lint-ignore no-explicit-any
const U = (globalThis as any).window.MarisUtils as any

Deno.test("computeComponentPrice: round 2 casas", () => {
  assertEquals(U.computeComponentPrice(90, 25), { ok: true, value: 22.5 })
})

Deno.test("computeComponentPrice: valor exato inteiro", () => {
  assertEquals(U.computeComponentPrice(90, 20), { ok: true, value: 18 })
})

Deno.test("computeComponentPrice: centavos no pai", () => {
  assertEquals(U.computeComponentPrice(89.9, 25), { ok: true, value: 22.48 })
})

Deno.test("computeComponentPrice: percentual decimal", () => {
  assertEquals(U.computeComponentPrice(90, 25.5), { ok: true, value: 22.95 })
})

Deno.test("computeComponentPrice: acima de 100%", () => {
  assertEquals(U.computeComponentPrice(90, 150), { ok: true, value: 135 })
})

Deno.test("computeComponentPrice: minimo valido", () => {
  assertEquals(U.computeComponentPrice(90, 0.01), { ok: true, value: 0.01 })
})

Deno.test("computeComponentPrice: BM1733-O 25/35/45% de 190.9", () => {
  assertEquals(U.computeComponentPrice(190.9, 25), { ok: true, value: 47.73 })
  assertEquals(U.computeComponentPrice(190.9, 35), { ok: true, value: 66.82 })
  assertEquals(U.computeComponentPrice(190.9, 45), { ok: true, value: 85.91 })
})

Deno.test("computeComponentPrice: % zero", () => {
  const r = U.computeComponentPrice(90, 0)
  assertEquals(r.ok, false)
  assertEquals(r.error, "A % deve ser maior que zero.")
})

Deno.test("computeComponentPrice: preco pai zero", () => {
  const r = U.computeComponentPrice(0, 25)
  assertEquals(r.ok, false)
  assertEquals(r.error, "Produto sem preço válido para calcular o tipo.")
})

Deno.test("computeComponentPrice: preco pai negativo", () => {
  const r = U.computeComponentPrice(-10, 25)
  assertEquals(r.ok, false)
})

Deno.test("computeComponentPrice: % negativa", () => {
  const r = U.computeComponentPrice(90, -10)
  assertEquals(r.ok, false)
  assertEquals(r.error, "A % deve ser maior que zero.")
})

Deno.test("computeComponentPrice: % vazia", () => {
  const r = U.computeComponentPrice(90, "")
  assertEquals(r.ok, false)
  assertEquals(r.error, "Informe a % do preço.")
})

Deno.test("computeComponentPrice: % nao numerica", () => {
  const r = U.computeComponentPrice(90, "abc")
  assertEquals(r.ok, false)
  assertEquals(r.error, "Informe a % do preço.")
})

Deno.test("computeComponentPrice: ambos invalidos", () => {
  const r = U.computeComponentPrice("", "")
  assertEquals(r.ok, false)
  assertEquals(r.error, "Produto sem preço válido para calcular o tipo.")
})

Deno.test("percentFromSavedPrice: legado exato", () => {
  assertEquals(U.percentFromSavedPrice(90, 18), { ok: true, value: 20 })
})

Deno.test("percentFromSavedPrice: legado com arredondamento", () => {
  assertEquals(U.percentFromSavedPrice(90, 23), { ok: true, value: 25.56 })
})

Deno.test("percentFromSavedPrice: pai zero", () => {
  const r = U.percentFromSavedPrice(0, 23)
  assertEquals(r.ok, false)
})

Deno.test("parseComponentRows: linha sem nome ignorada", () => {
  const r = U.parseComponentRows([{ name: "", price_percent: 25, quantity: 1 }], 90)
  assertEquals(r, { ok: true, rows: [] })
})

Deno.test("parseComponentRows: nome sem %", () => {
  const r = U.parseComponentRows([{ name: "Brinco", price_percent: "", quantity: 1 }], 90)
  assertEquals(r.ok, false)
  assertEquals(r.error, "Brinco: Informe a % do preço.")
})

Deno.test("parseComponentRows: estoque invalido", () => {
  const r = U.parseComponentRows([{ name: "Brinco", price_percent: 25, quantity: 1.5 }], 90)
  assertEquals(r.ok, false)
})

Deno.test("parseComponentRows: duas linhas validas sem unit_price", () => {
  const r = U.parseComponentRows(
    [
      { name: "Brinco", price_percent: 25, quantity: 2 },
      { name: "Colar", price_percent: 50, quantity: 1 }
    ],
    90
  )
  assertEquals(r.ok, true)
  assertEquals(r.rows.length, 2)
  assertEquals(r.rows[0].price_percent, 25)
  assertEquals(r.rows[0].unit_price, undefined)
  assertEquals(r.rows[1].price_percent, 50)
})

Deno.test("normalizePricedComponent + effectivePrice: BM1733 com promo pai", () => {
  const c = U.normalizePricedComponent({
    id: 15,
    product_code: "BM1733-O",
    name: "Pequeno",
    quantity: 1,
    is_active: true,
    price_percent: 25,
    computed_unit_price: 47.73,
    parent_unit_price: 190.9,
    parent_is_on_sale: true,
    parent_discount_percent: 25
  })
  assertEquals(c.unit_price, 47.73)
  assertEquals(U.effectivePrice(c), 35.79)
})
