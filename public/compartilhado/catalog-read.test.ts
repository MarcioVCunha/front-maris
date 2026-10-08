// Garante que o catálogo público não pede a coluna restrita e usa colunas explícitas.
import { assert, assertEquals } from "jsr:@std/assert@1"

const win: Record<string, unknown> = {}
;(globalThis as Record<string, unknown>).window = win
await import("./catalog-read.js")

const Read = win.MarisCatalogRead as {
  PRODUCTS_RELATION: string
  PRODUCT_COLUMNS: string
  COMPONENT_COLUMNS: string
  IMAGE_COLUMNS: string
  SELLER_COLUMNS: string
  BASKET_COLUMNS: string
  selectProducts: (client: FakeClient) => FakeChain
  selectPricedComponents: (client: FakeClient) => FakeChain
  selectImages: (client: FakeClient) => FakeChain
  selectActiveSellers: (client: FakeClient) => FakeChain
  selectSharedBasket: (client: FakeClient, id: string) => FakeChain
}

type Op = [string, ...unknown[]]

class FakeChain {
  ops: Op[] = []
  select(cols: string) {
    this.ops.push(["select", cols])
    return this
  }
  eq(col: string, val: unknown) {
    this.ops.push(["eq", col, val])
    return this
  }
  order(col: string, opts?: unknown) {
    this.ops.push(["order", col, opts])
    return this
  }
  maybeSingle() {
    this.ops.push(["maybeSingle"])
    return this
  }
}

class FakeClient {
  relation = ""
  chain = new FakeChain()
  from(relation: string) {
    this.relation = relation
    this.chain = new FakeChain()
    return this.chain
  }
}

function columnsOf(value: string) {
  return value.split(",").map((part) => part.trim())
}

Deno.test("colunas públicas não incluem custo", () => {
  for (const columns of [
    Read.PRODUCT_COLUMNS,
    Read.COMPONENT_COLUMNS,
    Read.IMAGE_COLUMNS,
    Read.SELLER_COLUMNS,
    Read.BASKET_COLUMNS
  ]) {
    assertEquals(columnsOf(columns).includes("custo"), false)
    assert(!/\bcusto\b/i.test(columns))
  }
  assert(columnsOf(Read.PRODUCT_COLUMNS).includes("created_at"))
  assert(columnsOf(Read.PRODUCT_COLUMNS).includes("unit_price"))
  assertEquals(Read.SELLER_COLUMNS, "id, name")
})

Deno.test("selectProducts usa a relação e a lista explícita", () => {
  const client = new FakeClient()
  const chain = Read.selectProducts(client)
  assertEquals(client.relation, "products")
  assertEquals(chain.ops[0], ["select", Read.PRODUCT_COLUMNS])
})

Deno.test("componentes com preço, imagens, vendedoras e cesta", () => {
  const components = new FakeClient()
  const componentChain = Read.selectPricedComponents(components)
  assertEquals(components.relation, "product_components_priced")
  assertEquals(componentChain.ops[1], ["eq", "is_active", true])

  const images = new FakeClient()
  Read.selectImages(images)
  assertEquals(images.relation, "product_images")
  assertEquals(images.chain.ops[0][1], Read.IMAGE_COLUMNS)

  const sellers = new FakeClient()
  Read.selectActiveSellers(sellers)
  assertEquals(sellers.relation, "sellers")
  assertEquals(sellers.chain.ops[0][1], "id, name")
  assertEquals(sellers.chain.ops[1], ["eq", "is_active", true])

  const baskets = new FakeClient()
  Read.selectSharedBasket(baskets, "abc")
  assertEquals(baskets.relation, "shared_baskets")
  assertEquals(baskets.chain.ops[1], ["eq", "id", "abc"])
  assertEquals(baskets.chain.ops[2], ["maybeSingle"])
})
