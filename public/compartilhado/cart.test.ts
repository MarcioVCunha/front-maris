// Testes da lógica pura de carrinho/cesta (window.MarisCart).
// cart-resolver.js usa window.MarisUtils (effectivePrice/hasPromo).
import { assertEquals } from "jsr:@std/assert@1"

// deno-lint-ignore no-explicit-any
;(globalThis as any).window = {}
await import("./promo-price.js")
await import("./utils.js")
await import("./cart-resolver.js")
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
  assertEquals(line.name, "Tipo 99")
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
  assertEquals(line.name, "Tipo")
  assertEquals(line.code, "COMP-30")
  assertEquals(line.unitPrice, 25)
  assertEquals(line.available, 4)
})

Deno.test("resolveLine respeita preco_efetivo do banco no produto e no componente", () => {
  const mapsBanco = {
    productsByCode: {
      PROMO_BANCO: { code: "PROMO_BANCO", name: "Pulseira", unit_price: 100, preco_efetivo: 79.90, quantity: 4 }
    },
    componentsById: {
      40: { id: 40, product_code: "PROMO_BANCO", name: "Parte", unit_price: 50, preco_efetivo: 39.95, quantity: 2 }
    },
    productImagesByCode: {}
  }
  const lineProd = Cart.resolveLine({ product_code: "PROMO_BANCO", component_id: null }, mapsBanco, "cart")
  assertEquals(lineProd.unitPrice, 79.90)
  assertEquals(lineProd.originalPrice, 100)
  assertEquals(lineProd.onSale, true)

  const lineComp = Cart.resolveLine({ product_code: null, component_id: 40 }, mapsBanco, "cart")
  assertEquals(lineComp.unitPrice, 39.95)
  assertEquals(lineComp.originalPrice, 50)
  assertEquals(lineComp.onSale, true)
})

Deno.test("resolveLine usa o promocional exato quando o banco só pisou no ,90", () => {
  const mapsExato = {
    productsByCode: {
      ANEL: {
        code: "ANEL",
        name: "Anel",
        unit_price: 100,
        is_on_sale: true,
        discount_percent: 20,
        preco_efetivo: 79.9,
        quantity: 2
      }
    },
    componentsById: {
      7: {
        id: 7,
        product_code: "ANEL",
        name: "Metade",
        unit_price: 50,
        parent_unit_price: 100,
        price_percent: 50,
        is_on_sale: true,
        discount_percent: 20,
        preco_efetivo: 39.95,
        quantity: 1
      }
    },
    productImagesByCode: {}
  }
  const line = Cart.resolveLine({ product_code: "ANEL", component_id: null }, mapsExato, "cart")
  assertEquals(line.unitPrice, 80)
  assertEquals(line.originalPrice, 100)
  const part = Cart.resolveLine({ product_code: null, component_id: 7 }, mapsExato, "cart")
  assertEquals(part.unitPrice, 40)
})

