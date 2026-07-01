import { assertEquals } from "jsr:@std/assert@1"
import { buildCartsListUrl, sellerLabel } from "./customer-carts.logic.js"

Deno.test("sellerLabel: prioriza nome da vendedora", () => {
  assertEquals(sellerLabel({ seller: { name: "Ana" }, seller_id: 1 }), "Ana")
  assertEquals(sellerLabel({ seller_id: 0 }), "Sem vendedora")
})

Deno.test("buildCartsListUrl: filtro por vendedora", () => {
  assertEquals(buildCartsListUrl("https://fn/carts", "all"), "https://fn/carts")
  assertEquals(buildCartsListUrl("https://fn/carts", "3"), "https://fn/carts?seller_id=3")
})
