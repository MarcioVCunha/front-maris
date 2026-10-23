import { assertEquals } from "jsr:@std/assert@1"
import {
  ADMIN_DASHBOARD_API,
  addProduct,
  archiveProduct,
  cancelAdminSale,
  fetchAdminSale,
  fetchCategoryDefaults,
  fetchMonthOverview,
  fetchRecentSales,
  fetchExpiringOrders,
  confirmOrder,
  returnOrderItems,
  fetchShippingSettings,
  saveShippingSettings,
  fetchSellersMonth,
  importProducts,
  listProducts,
  markAdminSalePaid,
  saveProductDivisions,
  updateAdminSale,
  updateComponentSku,
  updateProduct,
  fetchCollectionList,
  saveCollection,
  deleteCollection,
  fetchPromotions,
  savePromotion,
  endPromotion,
  fetchPurchasesOverview,
  batchProducts,
  fetchProductHistory,
  fetchCoupons,
  saveCoupon,
  toggleCoupon,
  createReferralCode,
  fetchReferrals,
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
  assertEquals(ADMIN_DASHBOARD_API.productComponents, "admin-product-components")
  assertEquals(ADMIN_DASHBOARD_API.addProduct, "add-product")
  assertEquals(ADMIN_DASHBOARD_API.importProducts, "import-products")
  assertEquals(ADMIN_DASHBOARD_API.monthOverview, "admin-month-overview")
  assertEquals(ADMIN_DASHBOARD_API.recentSales, "admin-recent-sales")
  assertEquals(ADMIN_DASHBOARD_API.sellersMonth, "admin-sellers-month")
  assertEquals(ADMIN_DASHBOARD_API.saleGet, "admin-sale-get")
  assertEquals(ADMIN_DASHBOARD_API.saleUpdate, "admin-sale-update")
  assertEquals(ADMIN_DASHBOARD_API.saleCancel, "admin-sale-cancel")
  assertEquals(ADMIN_DASHBOARD_API.saleMarkPaid, "admin-sale-mark-paid")
  assertEquals(ADMIN_DASHBOARD_API.expiringOrders, "list-expiring-orders")
  assertEquals(ADMIN_DASHBOARD_API.orderConfirm, "confirm-order")
  assertEquals(ADMIN_DASHBOARD_API.orderReturnItems, "return-order-items")
  assertEquals(ADMIN_DASHBOARD_API.shippingSettings, "admin-shipping-settings")
  assertEquals(ADMIN_DASHBOARD_API.collectionList, "admin-collection-list")
  assertEquals(ADMIN_DASHBOARD_API.collectionSave, "admin-collection-save")
  assertEquals(ADMIN_DASHBOARD_API.collectionDelete, "admin-collection-delete")
  assertEquals(ADMIN_DASHBOARD_API.promotionList, "admin-promotion-list")
  assertEquals(ADMIN_DASHBOARD_API.promotionSave, "admin-promotion-save")
  assertEquals(ADMIN_DASHBOARD_API.promotionEnd, "admin-promotion-end")
  assertEquals(ADMIN_DASHBOARD_API.purchasesOverview, "admin-purchases-overview")
  assertEquals(ADMIN_DASHBOARD_API.batchProducts, "admin-product-batch")
  assertEquals(ADMIN_DASHBOARD_API.productHistory, "admin-product-history")
  assertEquals(ADMIN_DASHBOARD_API.couponList, "admin-coupon-list")
  assertEquals(ADMIN_DASHBOARD_API.couponSave, "admin-coupon-save")
  assertEquals(ADMIN_DASHBOARD_API.referralList, "admin-referral-list")
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

  const recentChannel = client({ ok: true, sales: [] })
  await fetchRecentSales({ limit: 20, channel: "shopee" }, recentChannel)
  assertEquals(recentChannel.calls[0].name, "admin-recent-sales")
  assertEquals(recentChannel.calls[0].options.query, { limit: 20, p_channel: "shopee" })

  const recentStatus = client({ ok: true, sales: [] })
  await fetchRecentSales({ limit: 50, status: "receivable" }, recentStatus)
  assertEquals(recentStatus.calls[0].name, "admin-recent-sales")
  assertEquals(recentStatus.calls[0].options.query, { limit: 50, status: "receivable" })

  const expiring = client({ ok: true, orders: [] })
  await fetchExpiringOrders(expiring)
  assertEquals(expiring.calls[0].name, "list-expiring-orders")
  assertEquals(expiring.calls[0].options.method, "GET")
  assertEquals(expiring.calls[0].options.body, undefined)

  const confirmed = client({ ok: true })
  await confirmOrder({ order_id: 12 }, confirmed)
  assertEquals(confirmed.calls[0].name, "confirm-order")
  assertEquals(confirmed.calls[0].options.method, "POST")
  assertEquals(confirmed.calls[0].options.body, { order_id: 12 })

  const returned = client({ ok: true })
  await returnOrderItems({ order_id: 12, item_ids: [7], restore_stock: true }, returned)
  assertEquals(returned.calls[0].name, "return-order-items")
  assertEquals(returned.calls[0].options.body, { order_id: 12, item_ids: [7], restore_stock: true })

  const delivery = client({ ok: true, sales: [] })
  await fetchRecentSales({ limit: 50, delivery: "a_enviar" }, delivery)
  assertEquals(delivery.calls[0].options.query, { limit: 50, delivery: "a_enviar" })

  const settings = client({ ok: true, shipping_enabled: false })
  const read = await fetchShippingSettings(settings)
  assertEquals(read.shipping_enabled, false)
  assertEquals(settings.calls[0].name, "admin-shipping-settings")
  assertEquals(settings.calls[0].options.method, "GET")
  const shippingSaved = client({ ok: true, shipping_enabled: true })
  const write = await saveShippingSettings(true, shippingSaved)
  assertEquals(write.shipping_enabled, true)
  assertEquals(shippingSaved.calls[0].options.body, { shipping_enabled: true })

  const sellers = client({ ok: true, sellers: [{ seller_id: 2, name: "Marineide", balance: 0 }] })
  const team = await fetchSellersMonth({ month: "2026-10" }, sellers)
  assertEquals(team.ok, true)
  assertEquals(sellers.calls[0].name, "admin-sellers-month")
  assertEquals(sellers.calls[0].options.method, "GET")

  const saleGet = client({ ok: true, sale: { id: 55, items: [] } })
  await fetchAdminSale({ orderId: 55 }, saleGet)
  assertEquals(saleGet.calls[0].name, "admin-sale-get")
  assertEquals(saleGet.calls[0].options.method, "GET")
  assertEquals(saleGet.calls[0].options.query, { order_id: 55 })

  const saleUpdate = client({ ok: true })
  const updateBody = { order_id: 55, total: 200, items: [{ code: "AN581-R", quantity: 1 }] }
  await updateAdminSale(updateBody, saleUpdate)
  assertEquals(saleUpdate.calls[0].name, "admin-sale-update")
  assertEquals(saleUpdate.calls[0].options.method, "POST")
  assertEquals(saleUpdate.calls[0].options.body, updateBody)

  const saleCancel = client({ ok: true })
  await cancelAdminSale({ order_id: 55 }, saleCancel)
  assertEquals(saleCancel.calls[0].name, "admin-sale-cancel")
  assertEquals(saleCancel.calls[0].options.body, { order_id: 55 })

  const salePaid = client({ ok: true })
  await markAdminSalePaid({ order_id: 55 }, salePaid)
  assertEquals(salePaid.calls[0].name, "admin-sale-mark-paid")
  assertEquals(salePaid.calls[0].options.body, { order_id: 55 })

  const divisions = client({
    ok: true,
    product_code: "CJ100-O",
    components: [{ id: 12, name: "Brinco", quantity: 1, price_percent: 45, sku: "CJ100-O-BRINCO", is_active: true }],
  })
  const divisionsSaved = await saveProductDivisions({
    product_code: "CJ100-O",
    components: [{ id: 12, name: "Brinco", quantity: 1, price_percent: 45, is_active: true }],
  }, divisions)
  assertEquals(divisionsSaved.ok, true)
  assertEquals(divisionsSaved.product_code, "CJ100-O")
  assertEquals(divisionsSaved.components[0].sku, "CJ100-O-BRINCO")
  assertEquals(divisions.calls[0].name, "admin-product-components")
  assertEquals(divisions.calls[0].options.method, "POST")

  // Coleções
  const listClient = client({ ok: true, collections: [{ id: 1, name: "Mães" }] })
  const collectionsRes = await fetchCollectionList(listClient)
  assertEquals(collectionsRes.ok, true)
  assertEquals(collectionsRes.data.collections.length, 1)
  assertEquals(listClient.calls[0].name, "admin-collection-list")
  assertEquals(listClient.calls[0].options.method, "GET")

  const saveClient = client({ ok: true, collection: { id: 1, name: "Mães 2026" } })
  const saveRes = await saveCollection({ name: "Mães 2026" }, saveClient)
  assertEquals(saveRes.ok, true)
  assertEquals(saveClient.calls[0].name, "admin-collection-save")
  assertEquals(saveClient.calls[0].options.method, "POST")
  assertEquals(saveClient.calls[0].options.body, { name: "Mães 2026" })

  const delClient = client({ ok: true, id: 1 })
  const delRes = await deleteCollection(1, delClient)
  assertEquals(delRes.ok, true)
  assertEquals(delClient.calls[0].name, "admin-collection-delete")
  assertEquals(delClient.calls[0].options.method, "POST")
  assertEquals(delClient.calls[0].options.body, { id: 1 })

  // Promoções
  const promoListClient = client({ ok: true, promotions: [{ id: 5, name: "Black Friday" }] })
  const promoListRes = await fetchPromotions(promoListClient)
  assertEquals(promoListRes.ok, true)
  assertEquals(promoListRes.data.promotions.length, 1)
  assertEquals(promoListClient.calls[0].name, "admin-promotion-list")
  assertEquals(promoListClient.calls[0].options.method, "GET")

  const promoSaveClient = client({ ok: true, promotion: { id: 5, name: "Black Friday" } })
  const promoSaveRes = await savePromotion({ name: "Black Friday", value: 20 }, promoSaveClient)
  assertEquals(promoSaveRes.ok, true)
  assertEquals(promoSaveClient.calls[0].name, "admin-promotion-save")
  assertEquals(promoSaveClient.calls[0].options.method, "POST")
  assertEquals(promoSaveClient.calls[0].options.body, { name: "Black Friday", value: 20 })

  const promoEndClient = client({ ok: true, id: 5, already_ended: false })
  const promoEndRes = await endPromotion(5, promoEndClient)
  assertEquals(promoEndRes.ok, true)
  assertEquals(promoEndClient.calls[0].name, "admin-promotion-end")
  assertEquals(promoEndClient.calls[0].options.method, "POST")
  assertEquals(promoEndClient.calls[0].options.body, { id: 5 })

  // Compras
  const purchasesClient = client({
    ok: true,
    month: "2026-10",
    total_units_sold: 42,
    total_orders_paid: 18,
    top_pieces: [],
    restock_requests: []
  })
  const purchasesRes = await fetchPurchasesOverview({ month: "2026-10" }, purchasesClient)
  assertEquals(purchasesRes.ok, true)
  assertEquals(purchasesRes.data.total_units_sold, 42)
  assertEquals(purchasesClient.calls[0].name, "admin-purchases-overview")
  assertEquals(purchasesClient.calls[0].options.method, "GET")
  assertEquals(purchasesClient.calls[0].options.query, { month: "2026-10" })

  // Ações em lote
  const batchClient = client({
    ok: true,
    action: "quantity",
    count: 2,
    updated: [{ code: "BR01", quantity: 1 }, { code: "BR02", quantity: 1 }]
  })
  const batchRes = await batchProducts({ action: "quantity", codes: ["BR01", "BR02"], value: 1 }, batchClient)
  assertEquals(batchRes.ok, true)
  assertEquals(batchRes.count, 2)
  assertEquals(batchClient.calls[0].name, "admin-product-batch")
  assertEquals(batchClient.calls[0].options.method, "POST")
  assertEquals(batchClient.calls[0].options.body, { action: "quantity", codes: ["BR01", "BR02"], value: 1 })

  // Histórico de estoque
  const historyClient = client({
    ok: true,
    code: "BR01",
    events: [
      {
        id: 1,
        created_at: "2026-10-18T10:00:00Z",
        actor_name: "Marcio",
        role: "admin",
        action: "admin-product-batch:quantity",
        entity_id: "BR01",
        detail: { old_quantity: 0, new_quantity: 1 }
      }
    ]
  })
  const historyRes = await fetchProductHistory({ code: "BR01" }, historyClient)
  assertEquals(historyRes.ok, true)
  assertEquals(historyRes.code, "BR01")
  assertEquals(historyRes.events.length, 1)
  assertEquals(historyClient.calls[0].name, "admin-product-history")
  assertEquals(historyClient.calls[0].options.method, "GET")
  assertEquals(historyClient.calls[0].options.query, { code: "BR01" })

  // Cupons & Indicações
  const couponListClient = client({
    ok: true,
    coupons: [{ id: 1, code: "BEMVINDA10" }]
  })
  const couponsRes = await fetchCoupons(couponListClient)
  assertEquals(couponsRes.ok, true)
  assertEquals(couponsRes.coupons.length, 1)
  assertEquals(couponListClient.calls[0].name, "admin-coupon-list")
  assertEquals(couponListClient.calls[0].options.method, "POST")

  const couponSaveClient = client({ ok: true, data: { id: 1, code: "BEMVINDA10" } })
  const couponSaveRes = await saveCoupon({ action: "save", code: "BEMVINDA10" }, couponSaveClient)
  assertEquals(couponSaveRes.ok, true)
  assertEquals(couponSaveClient.calls[0].name, "admin-coupon-save")
  assertEquals(couponSaveClient.calls[0].options.method, "POST")

  const toggleClient = client({ ok: true })
  const toggleRes = await toggleCoupon(1, false, toggleClient)
  assertEquals(toggleRes.ok, true)
  assertEquals(toggleClient.calls[0].name, "admin-coupon-save")
  assertEquals(toggleClient.calls[0].options.body, { action: "toggle", coupon_id: 1, is_active: false })

  const referralCodeClient = client({ ok: true, data: { code: "ANA-ABC123" } })
  const refCodeRes = await createReferralCode({
    referrer_name: "Ana",
    referrer_whatsapp: "5519999998888",
    discount_percent: 10
  }, referralCodeClient)
  assertEquals(refCodeRes.ok, true)
  assertEquals(referralCodeClient.calls[0].name, "admin-coupon-save")

  const refListClient = client({
    ok: true,
    referrals: [{ id: 1, referrer_name: "Ana", status: "pendente" }]
  })
  const refListRes = await fetchReferrals(refListClient)
  assertEquals(refListRes.ok, true)
  assertEquals(refListRes.referrals.length, 1)
  assertEquals(refListClient.calls[0].name, "admin-referral-list")
  assertEquals(refListClient.calls[0].options.method, "POST")
})


