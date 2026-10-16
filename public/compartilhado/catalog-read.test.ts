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
  ARCHIVED_AT_FIELD: string
  isArchivedProduct: (row: Record<string, unknown>) => boolean
  withoutArchivedProducts: (rows: Record<string, unknown>[]) => Record<string, unknown>[]
  selectProducts: (client: FakeClient) => FakeChain
  selectPricedComponents: (client: FakeClient) => FakeChain
  selectImages: (client: FakeClient) => FakeChain
  selectActiveSellers: (client: FakeClient) => FakeChain
  BESTSELLERS_ENABLED: boolean
  BESTSELLERS_RELATION: string
  BESTSELLER_COLUMNS: string
  selectBestsellers: (client: FakeClient) => FakeChain | null
  columnsWithPixField: (columns: string, field: string) => string
  productColumns: () => string
  missingOptionalPriceColumn: (error: { message?: string }) => boolean
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
    Read.BESTSELLER_COLUMNS
  ]) {
    assertEquals(columnsOf(columns).includes("custo"), false)
    assert(!/\bcusto\b/i.test(columns))
  }
  assert(columnsOf(Read.PRODUCT_COLUMNS).includes("created_at"))
  assert(columnsOf(Read.PRODUCT_COLUMNS).includes("unit_price"))
  assert(columnsOf(Read.PRODUCT_COLUMNS).includes("categoria"))
  assertEquals(Read.SELLER_COLUMNS, "id, name")
})

Deno.test("a leitura pública pede preco_pix e preco_efetivo e ignora nome vazio", () => {
  assertEquals(Read.PIX_PRICE_FIELD, "preco_pix")
  assertEquals(Read.EFFECTIVE_PRICE_FIELD, "preco_efetivo")
  assertEquals(Read.columnsWithPixField(Read.PRODUCT_COLUMNS, ""), Read.PRODUCT_COLUMNS)
  assertEquals(Read.columnsWithPixField(Read.PRODUCT_COLUMNS, "  "), Read.PRODUCT_COLUMNS)
  assertEquals(Read.columnsWithPixField(Read.PRODUCT_COLUMNS, "custo"), Read.PRODUCT_COLUMNS)
  assertEquals(Read.productColumns(), `${Read.PRODUCT_COLUMNS}, preco_pix, preco_efetivo`)
  assertEquals(Read.componentColumns(), `${Read.COMPONENT_COLUMNS}, preco_pix, preco_efetivo`)
})

Deno.test("selectProducts pede o preço do banco e repete sem a coluna se ela ainda não existir", async () => {
  const selects: string[] = []
  const orders: unknown[][] = []
  const client = {
    from() {
      return {
        select(cols: string) {
          selects.push(cols)
          const chain = {
            order(...args: unknown[]) {
              orders.push(args)
              return chain
            },
            then(resolve: (value: unknown) => void) {
              const missing = cols.includes("preco_pix") || cols.includes("preco_efetivo")
              resolve(missing
                ? { data: null, error: { code: "PGRST204", message: "Could not find the 'preco_efetivo' column of 'products_public' in the schema cache" } }
                : { data: [{ code: "AN651-R" }], error: null })
            }
          }
          return chain
        }
      }
    }
  }
  const result = await Read.selectProducts(client as unknown as FakeClient).order("name")
  assertEquals(selects, [`${Read.PRODUCT_COLUMNS}, preco_pix, preco_efetivo`, Read.PRODUCT_COLUMNS])
  assertEquals(orders.length, 2)
  assertEquals(result, { data: [{ code: "AN651-R" }], error: null })
  assertEquals(Read.missingOptionalPriceColumn({ message: "Could not find the 'preco_pix' column" }), true)
})

Deno.test("componentes com preço, imagens e vendedoras", () => {
  const components = new FakeClient()
  const componentChain = Read.selectPricedComponents(components)
  assertEquals(components.relation, "product_components_priced")
  assertEquals(componentChain.ops[0][1], Read.componentColumns())
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
})

Deno.test("peças com archived_at saem da lista pública", async () => {
  assertEquals(Read.ARCHIVED_AT_FIELD, "archived_at")
  assertEquals(Read.isArchivedProduct({ code: "A", archived_at: null }), false)
  assertEquals(Read.isArchivedProduct({ code: "A", archived_at: "2026-10-14T12:00:00Z" }), true)
  assertEquals(
    Read.withoutArchivedProducts([
      { code: "OK" },
      { code: "GONE", archived_at: "2026-10-14T12:00:00Z" },
      { code: "ALSO", archived_at: null }
    ]).map((row) => row.code),
    ["OK", "ALSO"]
  )

  const client = {
    from() {
      return {
        select() {
          return {
            then(resolve: (value: unknown) => void) {
              resolve({
                data: [
                  { code: "VIVA" },
                  { code: "ARQUIVADA", archived_at: "2026-10-14T12:00:00Z" }
                ],
                error: null
              })
            }
          }
        }
      }
    }
  }
  const result = await Read.selectProducts(client as unknown as FakeClient)
  assertEquals(result.data?.map((row: { code: string }) => row.code), ["VIVA"])

  const contract = await Deno.readTextFile(new URL("../../docs/contratos/catalogo-arquivadas.md", import.meta.url))
  assert(contract.includes("catalog_product_visible"))
  assert(contract.includes("archived_at IS NULL"))
  assert(contract.includes("admin-product-archive"))
  assert(contract.includes('"archive"'))
})

Deno.test("mais vendidas ligada consulta a view e desligada não consulta", () => {
  assertEquals(Read.BESTSELLERS_ENABLED, true)
  assertEquals(Read.BESTSELLERS_RELATION, "product_sales_counts")
  assertEquals(Read.BESTSELLER_COLUMNS, "code, total_vendido")
  const client = new FakeClient()
  const chain = Read.selectBestsellers(client)
  assertEquals(client.relation, "product_sales_counts")
  assertEquals(chain?.ops[0], ["select", "code, total_vendido"])

  const previous = Read.BESTSELLERS_ENABLED
  try {
    Read.BESTSELLERS_ENABLED = false
    const idle = new FakeClient()
    assertEquals(Read.selectBestsellers(idle), null)
    assertEquals(idle.relation, "")
  } finally {
    Read.BESTSELLERS_ENABLED = previous
  }
})

Deno.test("selectCollections suporta encadeamento de .catch mesmo se o builder do cliente não tiver", async () => {
  const client = new FakeClient()
  const readAny = Read as unknown as { selectCollections: (c: unknown) => { catch: (fn: (err: unknown) => unknown) => Promise<unknown> } }
  const query = readAny.selectCollections(client)
  assert(typeof query.catch === "function", "selectCollections deve ter método catch")
  const value = await query.catch(() => ({ data: [] }))
  assertEquals(value, client.chain)

  const errorClient = {
    from() {
      return {
        select() {
          return {
            order() {
              return {
                order() {
                  return {
                    then(_res: unknown, reject: (err: Error) => unknown) {
                      reject(new Error("fail"))
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  const errQuery = readAny.selectCollections(errorClient)
  const caught = await errQuery.catch(() => ({ data: [] }))
  assertEquals(caught, { data: [] })
})
