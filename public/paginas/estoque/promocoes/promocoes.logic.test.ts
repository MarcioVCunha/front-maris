import { assertEquals } from "jsr:@std/assert@1"
import { filterProductsForPromo } from "./promocoes.logic.js"

Deno.test("filterProductsForPromo: busca por componente", () => {
  const products = [{ code: "P1", name: "Anel" }]
  const map = { P1: [{ name: "Ouro" }] }
  assertEquals(filterProductsForPromo(products, map, "ouro").length, 1)
  assertEquals(filterProductsForPromo(products, map, "prata").length, 0)
})
