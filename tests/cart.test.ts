// Testes da lógica pura de carrinho/cesta (window.MarisCart).
// cart-resolver.js usa window.MarisUtils (effectivePrice/hasPromo).
import { assertEquals } from "jsr:@std/assert@1"

// deno-lint-ignore no-explicit-any
;(globalThis as any).window = {}
await import("../utils.js")
await import("../cart-resolver.js")
// deno-lint-ignore no-explicit-any
const Cart = (globalThis as any).window.MarisCart as any

const maps = {
  productsByCode: {
    ABC: { code: "ABC", name: "Colar", unit_price: 100, quantity: 5, image_url: "img-abc.jpg" },
    PROMO: { code: "PROMO", name: "Anel", unit_price: 200, quantity: 2, is_on_sale: true, discount_percent: 25, image_url: "" }
  },
  componentsById: {
    10: { id: 10, product_code: "ABC", name: "Brinco", unit_price: 40, quantity: 3 },
    20: { id: 20, product_code: "PROMO", name: "Pingente", unit_price: 80, quantity: 0, is_on_sale: true, discount_percent: 50 }
  },
  productImagesByCode: { ABC: "gallery-abc.jpg" }
}

Deno.test("itemKey prioriza componente sobre produto", () => {
  assertEquals(Cart.itemKey({ product_code: "ABC", component_id: null }), "p-ABC")
  assertEquals(Cart.itemKey({ product_code: null, component_id: 10 }), "c-10")
})

Deno.test("resolveLine produto sem promoção (variant cart)", () => {
  const line = Cart.resolveLine({ product_code: "ABC", component_id: null }, maps, "cart")
  assertEquals(line.name, "Colar")
  assertEquals(line.code, "ABC")
  assertEquals(line.unitPrice, 100)
  assertEquals(line.originalPrice, 100)
  assertEquals(line.onSale, false)
  assertEquals(line.available, 5)
  assertEquals(line.imageUrl, "gallery-abc.jpg")
})

Deno.test("resolveLine produto com promoção aplica desconto", () => {
  const line = Cart.resolveLine({ product_code: "PROMO", component_id: null }, maps, "cart")
  assertEquals(line.unitPrice, 150)
  assertEquals(line.originalPrice, 200)
  assertEquals(line.onSale, true)
  assertEquals(line.imageUrl, "")
})

Deno.test("resolveLine componente variant cart usa código simples e fallback de nome", () => {
  const line = Cart.resolveLine({ product_code: null, component_id: 10 }, maps, "cart")
  assertEquals(line.name, "Brinco")
  assertEquals(line.code, "ABC")
  assertEquals(line.unitPrice, 40)
  assertEquals(line.available, 3)
  assertEquals(line.imageUrl, "gallery-abc.jpg")
})

Deno.test("resolveLine componente variant shared usa código composto", () => {
  const line = Cart.resolveLine({ product_code: null, component_id: 20 }, maps, "shared")
  assertEquals(line.code, "PROMO / Pingente")
  assertEquals(line.onSale, true)
  assertEquals(line.unitPrice, 40)
  assertEquals(line.originalPrice, 80)
  assertEquals(line.available, 0)
})

Deno.test("resolveLine componente desconhecido (variant shared) usa fallback COMP-id", () => {
  const line = Cart.resolveLine({ product_code: null, component_id: 99 }, maps, "shared")
  assertEquals(line.name, "Componente 99")
  assertEquals(line.code, "COMP-99")
  assertEquals(line.available, 0)
})

Deno.test("resolveLine produto desconhecido cai nos defaults", () => {
  const line = Cart.resolveLine({ product_code: "ZZZ", component_id: null }, maps, "cart")
  assertEquals(line.name, "ZZZ")
  assertEquals(line.unitPrice, 0)
  assertEquals(line.available, 0)
  assertEquals(line.imageUrl, "")
})

Deno.test("resolveLine usa preço travado do item", () => {
  const line = Cart.resolveLine(
    { product_code: "PROMO", component_id: null, unit_price: 100 },
    maps,
    "cart"
  )
  assertEquals(line.unitPrice, 100)
  assertEquals(line.onSale, true)
})

Deno.test("resolveLine componente variant cart usa fallbacks quando faltam nome e código", () => {
  const mapsFallback = {
    productsByCode: {},
    componentsById: { 30: { id: 30, unit_price: 25, quantity: 4 } }, // sem name nem product_code
    productImagesByCode: {}
  }
  const line = Cart.resolveLine({ product_code: null, component_id: 30 }, mapsFallback, "cart")
  assertEquals(line.name, "Componente")
  assertEquals(line.code, "COMP-30")
  assertEquals(line.unitPrice, 25)
  assertEquals(line.available, 4)
})
