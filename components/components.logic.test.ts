import { assertEquals } from "jsr:@std/assert@1"
import { doesProductMatchSearch, resolvePercentForRow } from "./components.logic.js"

// deno-lint-ignore no-explicit-any
;(globalThis as any).window = {}
await import("../shared/utils.js")
// deno-lint-ignore no-explicit-any
const { percentFromSavedPrice } = (globalThis as any).window.MarisUtils

Deno.test("resolvePercentForRow: usa price_percent salvo", () => {
  assertEquals(resolvePercentForRow({ price_percent: 25 }, 100, percentFromSavedPrice), "25")
})

Deno.test("resolvePercentForRow: deriva de unit_price", () => {
  assertEquals(resolvePercentForRow({ unit_price: 23 }, 90, percentFromSavedPrice), "25.56")
})

Deno.test("doesProductMatchSearch: nome e código", () => {
  assertEquals(doesProductMatchSearch({ name: "Anel", code: "A1" }, "anel"), true)
  assertEquals(doesProductMatchSearch({ name: "Anel", code: "A1" }, "a1"), true)
  assertEquals(doesProductMatchSearch({ name: "Anel", code: "A1" }, "b1"), false)
  assertEquals(doesProductMatchSearch({ name: "Anel", code: "A1" }, ""), true)
})
