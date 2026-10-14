import { assertEquals } from "jsr:@std/assert@1"
import {
  ADMIN_DASHBOARD_API,
  addProduct,
  archiveProduct,
  fetchCategoryDefaults,
  fetchMonthOverview,
  fetchRecentSales,
  fetchSellersMonth,
  importProducts,
  listProducts,
  updateComponentSku,
  updateProduct,
} from "./painel.api.js"

function client(data: unknown = { ok: true }) {
  const calls: Array<{ name: string; options: { method?: string; body?: unknown; timeoutMs?: number; query?: unknown } }> = []
  return {
    calls,
    call(name: string, options: { method?: string; body?: unknown; timeoutMs?: number; query?: unknown }) {
      calls.push({ name, options })
      return { ok: true, data }
    },
  }
}

Deno.test("os nomes das funções do painel ficam num só lugar", async () => {
  assertEquals(ADMIN_DASHBOARD_API.productList, "admin-product-list")
  assertEquals(ADMIN_DASHBOARD_API.productUpdate, "admin-product-update")
  assertEquals(ADMIN_DASHBOARD_API.productArchive, "admin-product-archive")
  assertEquals(ADMIN_DASHBOARD_API.categoryDefaults, "category-defaults")
  assertEquals(ADMIN_DASHBOARD_API.componentUpdate, "admin-component-update")
  assertEquals(ADMIN_DASHBOARD_API.addProduct, "add-product")
  assertEquals(ADMIN_DASHBOARD_API.importProducts, "import-products")
  assertEquals(ADMIN_DASHBOARD_API.monthOverview, "admin-month-overview")
  assertEquals(ADMIN_DASHBOARD_API.recentSales, "admin-recent-sales")
  assertEquals(ADMIN_DASHBOARD_API.sellersMonth, "admin-sellers-month")
  const source = await Deno.readTextFile(new URL("./painel.api.js", import.meta.url))
  assertEquals(source.includes('auth: "staff"'), true)
})

Deno.test("listar, salvar, arquivar e padrões usam o método e o corpo combinados", async () => {
  const listed = client({ ok: true, products: [{ code: "AN581-R" }] })
  const products = await listProducts(listed)
  assertEquals(products.products[0].code, "AN581-R")
  assertEquals(listed.calls[0].name, "admin-product-list")
  assertEquals(listed.calls[0].options.method, "GET")

  const saved = client({ ok: true, product: { code: "AN581-R" } })
  const body = { code: "AN581-R", quantity: 0, ncm: "71171900", origem: 0, gtin: null }
  await updateProduct(body, saved)
  assertEquals(saved.calls[0].name, "admin-product-update")
  assertEquals(saved.calls[0].options.method, "POST")
  assertEquals(saved.calls[0].options.body, body)

  const archived = client({
    ok: true,
    code: "AN581-R",
    archived_at: "2026-10-14T15:00:00.000Z",
    already_archived: false
  })
  const archiveResult = await archiveProduct({ code: "AN581-R" }, archived)
  assertEquals(archived.calls[0].name, "admin-product-archive")
  assertEquals(archived.calls[0].options.body, { code: "AN581-R" })
  assertEquals(archiveResult.ok, true)
  assertEquals(archiveResult.archived_at, "2026-10-14T15:00:00.000Z")
  assertEquals(archiveResult.already_archived, false)

  const unarchived = client({
    ok: true,
    code: "AN581-R",
    archived_at: null,
    already_archived: false,
    already_unarchived: false
  })
  const unarchiveResult = await archiveProduct({ code: "AN581-R", archive: false }, unarchived)
  assertEquals(unarchived.calls[0].options.body, { code: "AN581-R", archive: false })
  assertEquals(unarchiveResult.archived_at, null)
  assertEquals(unarchiveResult.already_unarchived, false)

  const defaults = client({
    ok: true,
    defaults: [
      { category: "Anel", peso_g: 80, largura_cm: 17, comprimento_cm: 20, altura_cm: 5, ncm: "71171900" },
    ],
  })
  const bag = await fetchCategoryDefaults(defaults)
  assertEquals(defaults.calls[0].name, "category-defaults")
  assertEquals(defaults.calls[0].options.method, "GET")
  assertEquals(bag.defaults.Anel.peso_g, 80)
  assertEquals(bag.defaults.Anel.comprimento_cm, 20)
  assertEquals(bag.defaults.Anel.largura_cm, 17)

  const sku = client({ ok: true })
  const skuBody = { component_id: 13, product_code: "AN581-R", sku: "AN581-R-PEDRA" }
  await updateComponentSku(skuBody, sku)
  assertEquals(sku.calls[0].name, "admin-component-update")
  assertEquals(sku.calls[0].options.body, skuBody)

  const added = client({ ok: true })
  await addProduct({ code: "BM1786-O", name: "Brinco" }, added)
  assertEquals(added.calls[0].name, "add-product")

  const imported = client({ ok: true, created: 1 })
  await importProducts([{ code: "BM1786-O" }], imported)
  assertEquals(imported.calls[0].name, "import-products")
  assertEquals(imported.calls[0].options.timeoutMs, 150000)
  assertEquals(imported.calls[0].options.body, [{ code: "BM1786-O" }])

  const month = client({
    ok: true,
    month: "2026-10",
    charged_total: 10,
    channels: [{ channel: "site", orders: 1, charged_total: 10 }],
    best_sellers: [],
  })
  const overview = await fetchMonthOverview({ month: "2026-10" }, month)
  assertEquals(overview.ok, true)
  assertEquals(month.calls[0].name, "admin-month-overview")
  assertEquals(month.calls[0].options.method, "GET")
  assertEquals(month.calls[0].options.query, { month: "2026-10" })

  const recent = client({ ok: true, sales: [{ id: 1, seller_name: "Marineide" }] })
  await fetchRecentSales({ limit: 20 }, recent)
  assertEquals(recent.calls[0].name, "admin-recent-sales")
  assertEquals(recent.calls[0].options.query, { limit: 20 })

  const sellers = client({ ok: true, sellers: [{ seller_id: 2, name: "Marineide", balance: 0 }] })
  const team = await fetchSellersMonth({ month: "2026-10" }, sellers)
  assertEquals(team.ok, true)
  assertEquals(sellers.calls[0].name, "admin-sellers-month")
  assertEquals(sellers.calls[0].options.method, "GET")
})
