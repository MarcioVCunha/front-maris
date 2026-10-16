import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  ADMIN_DASHBOARD_ENABLED,
  ADMIN_HOME_CHANNELS_ENABLED,
  HOME_CHANNEL_ORDER,
  NCM_DEFAULT,
  ORIGEM_DEFAULT,
  NO_DATA,
  PACKAGING_DEFAULTS,
  STOCK_PAGE_SIZE,
  archiveConfirmText,
  archivePayload,
  ceilMarketplacePrice,
  channelLabel,
  currentMonthKey,
  filterStock,
  inStockProducts,
  isPanelLink,
  buildAddProductPayload,
  buildProductUpdatePayload,
  componentSku,
  componentUpdatePayload,
  dashboardView,
  displayQuantity,
  fieldPlaceholder,
  isComponentSku,
  isDashboardAdmin,
  nextPackagingValues,
  normalizeCategoryDefaults,
  normalizeOverview,
  outOfStockProducts,
  overviewHasDetailedChannels,
  packagingValues,
  pieceFormState,
  defaultsFor,
  renderAddForm,
  renderArchiveDialog,
  renderInicio,
  renderPieceForm,
  renderSalesStatusFilter,
  renderVendas,
  renderVendedoras,
  navHtml,
  renderStockList,
  renderStockPage,
  renderTipos,
  sellersFromDirectory,
  shouldShowHomeChannels,
  stockNavHtml,
  visibleStock,
  shouldShowDashboard,
  shouldShowFab,
  fabMenuHtml,
  feedbackParts,
  LEGACY_ADMIN_REDIRECTS,
} from "./painel.logic.js"

const anelDefaults = {
  descricao: "Anel ajustável folheado",
  peso_g: 3.5,
  largura_cm: 1.2,
  altura_cm: 0.4,
  comprimento_cm: 2,
  ncm: "71171900",
  origem: 0,
}

Deno.test("o painel está ligado e Promoções continua no menu", async () => {
  assertEquals(ADMIN_DASHBOARD_ENABLED, true)
  assertEquals(shouldShowDashboard(), true)
  const source = await Deno.readTextFile(new URL("./painel.logic.js", import.meta.url))
  assertEquals(source.includes("export const ADMIN_DASHBOARD_ENABLED = true"), true)
  const page = await Deno.readTextFile(new URL("./painel.js", import.meta.url))
  assertEquals(page.includes('location.replace("/admin/inicio")'), false)
  assertEquals(page.includes("location.reload"), false)
  assert(page.includes("history.pushState"))
  assert(page.includes("settleAdminGate"))
  const hub = await Deno.readTextFile(new URL("./admin.html", import.meta.url))
  const redirectAt = hub.indexOf('location.replace("/admin/inicio")')
  const legacyAt = hub.indexOf('id="legacy-admin"')
  assert(redirectAt > 0 && legacyAt > redirectAt)
  assert(hub.includes('aria-label="Carregando"'))
  assert(hub.includes("maris-loading"))
  assert(hub.includes("#legacy-admin { display: none"))
  assertEquals(hub.includes("MarisStaffAuth.loadProfile()"), false)
  const flag = await Deno.readTextFile(new URL("./painel.flag.js", import.meta.url))
  assert(flag.includes("window.MARIS_ADMIN_DASHBOARD = true"))
  assert(hub.includes('href="/promocoes"'))
  const menu = navHtml("inicio")
  assert(menu.includes('href="/promocoes"'))
  assert(menu.includes("Promoções"))
  assert(menu.includes('href="/admin/inicio" aria-current="page"'))
  const vercel = JSON.parse(await Deno.readTextFile(new URL("../../../vercel.json", import.meta.url)))
  assertEquals(
    vercel.rewrites.find((item: { source: string }) => item.source === "/admin").destination,
    "/paginas/admin/painel.html",
  )
  assertEquals(
    vercel.rewrites.find((item: { source: string }) => item.source === "/promocoes").destination,
    "/paginas/estoque/promocoes/promocoes.html",
  )
})

Deno.test("quantidade vazia aparece como zero e o NCM e a origem nascem no padrão", () => {
  assertEquals(displayQuantity(null), 0)
  assertEquals(displayQuantity(""), 0)
  assertEquals(displayQuantity("  "), 0)
  const state = pieceFormState({ code: "AN581-R", quantity: null, ncm: "", origem: null }, anelDefaults)
  assertEquals(state.quantity, 0)
  assertEquals(state.ncm, NCM_DEFAULT)
  assertEquals(state.origem, String(ORIGEM_DEFAULT))
  assertEquals(state.descricao, "")
  assertEquals(state.placeholders.descricao, anelDefaults.descricao)
  assertEquals(state.placeholders.peso_g, "3.5")
  assertEquals(fieldPlaceholder("ncm", {}), NCM_DEFAULT)
  assertEquals(fieldPlaceholder("origem", {}), "0")
})

Deno.test("salvar a peça manda os campos novos e deixa a coluna interna de fora", () => {
  const payload = buildProductUpdatePayload({
    code: "AN581-R",
    unitPrice: "120,00",
    quantity: "",
    categoria: "Anel",
    photos: "https://exemplo.test/a.jpg",
    descricao: "",
    peso_g: "",
    largura_cm: "",
    altura_cm: "",
    comprimento_cm: "",
    ncm: "",
    origem: "",
    gtin: "",
  })
  assertEquals(payload.quantity, 0)
  assertEquals(payload.ncm, "71171900")
  assertEquals(payload.origem, 0)
  assertEquals(payload.descricao, "")
  assertEquals(payload.peso_g, null)
  assertEquals(payload.gtin, null)
  assertEquals(payload.unit_price, 120)
  assertEquals(payload.image_urls, ["https://exemplo.test/a.jpg"])
  const hidden = ["cus", "to"].join("")
  assertEquals(Object.hasOwn(payload, hidden), false)
  assertEquals(JSON.stringify(payload).toLowerCase().includes(hidden), false)
  const form = renderPieceForm({ code: "AN581-R", name: "Anel rosa", quantity: null }, anelDefaults)
  assertEquals(form.includes('id="quantity"'), true)
  assertEquals(form.includes("Anel ajustável folheado"), true)
  assertEquals(form.toLowerCase().includes(hidden), false)
})

Deno.test("adicionar peça repete os campos novos e o arquivamento pede confirmação", () => {
  const payload = buildAddProductPayload({
    code: "BM1786-O",
    name: "Brinco orquídea",
    unitPrice: "89,90",
    quantity: "2",
    categoria: "Brinco",
    photos: "",
    ncm: "71171900",
    origem: "0",
  })
  assertEquals(payload.name, "Brinco orquídea")
  assertEquals(payload.quantity, 2)
  assertEquals(payload.ncm, "71171900")
  const hidden = ["cus", "to"].join("")
  assertEquals(Object.hasOwn(payload, hidden), false)
  const add = renderAddForm()
  assertEquals(add.includes("Adicionar peça"), true)
  assertEquals(add.includes(`value="${NCM_DEFAULT}"`), true)
  assertEquals(add.includes(`value="${ORIGEM_DEFAULT}"`), true)
  assertEquals(add.includes(`value="${PACKAGING_DEFAULTS.peso_g}"`), true)
  assertEquals(add.includes(`value="${PACKAGING_DEFAULTS.largura_cm}"`), true)
  assertEquals(add.includes(`value="${PACKAGING_DEFAULTS.comprimento_cm}"`), true)
  assertEquals(add.includes(`value="${PACKAGING_DEFAULTS.altura_cm}"`), true)
  assert(add.includes('id="quantity"') && add.includes('value="1"'))
  const piece = { code: "AN581-R", name: "Anel rosa" }
  assertEquals(archivePayload(piece.code), { code: "AN581-R" })
  assertEquals(archivePayload(piece.code, false), { code: "AN581-R", archive: false })
  assertEquals(archiveConfirmText(piece), "Arquivar Anel rosa (AN581-R)? Ela sai da lista do estoque.")
  assert(renderArchiveDialog(piece).includes("archive-confirm"))
})

Deno.test("a embalagem ao adicionar começa no padrão e a categoria só troca o que não foi editado", () => {
  assertEquals(PACKAGING_DEFAULTS, {
    peso_g: "80",
    comprimento_cm: "20",
    largura_cm: "17",
    altura_cm: "5",
  })
  assertEquals(packagingValues({}), { ...PACKAGING_DEFAULTS })
  assertEquals(packagingValues({ peso_g: 90, largura_cm: 22 }), {
    peso_g: "90",
    largura_cm: "22",
    comprimento_cm: PACKAGING_DEFAULTS.comprimento_cm,
    altura_cm: PACKAGING_DEFAULTS.altura_cm,
  })
  const withCategory = packagingValues({
    peso_g: 12,
    largura_cm: 10,
    comprimento_cm: 15,
    altura_cm: 4,
  })
  assertEquals(withCategory, {
    peso_g: "12",
    largura_cm: "10",
    comprimento_cm: "15",
    altura_cm: "4",
  })
  const untouched = nextPackagingValues({
    current: { ...PACKAGING_DEFAULTS },
    previousSuggested: { ...PACKAGING_DEFAULTS },
    nextSuggested: withCategory,
  })
  assertEquals(untouched, withCategory)
  const edited = nextPackagingValues({
    current: { ...PACKAGING_DEFAULTS, peso_g: "95" },
    previousSuggested: { ...PACKAGING_DEFAULTS },
    nextSuggested: withCategory,
  })
  assertEquals(edited.peso_g, "95")
  assertEquals(edited.largura_cm, withCategory.largura_cm)
  assertEquals(edited.comprimento_cm, withCategory.comprimento_cm)
  assertEquals(edited.altura_cm, withCategory.altura_cm)
  const addWithDefaults = renderAddForm(withCategory)
  assert(addWithDefaults.includes('id="peso" inputmode="decimal" value="12"'))
  assert(addWithDefaults.includes('id="comprimento" inputmode="decimal" value="15"'))
  assert(addWithDefaults.includes(`value="${PACKAGING_DEFAULTS.largura_cm}"`) || addWithDefaults.includes('value="10"'))
  const page = Deno.readTextFileSync(new URL("./painel.js", import.meta.url))
  assert(page.includes("nextPackagingValues"))
  assert(page.includes("applyAddPackagingForCategory"))
})

Deno.test("os padrões de categoria do servidor viram mapa por nome Anel/Brinco", () => {
  const map = normalizeCategoryDefaults([
    { category: "Anel", peso_g: 80, largura_cm: 17, comprimento_cm: 20, altura_cm: 5, ncm: "71171900" },
    { category: "Brinco", peso_g: 80, largura_cm: 17, comprimento_cm: 20, altura_cm: 5, ncm: "71171900" },
  ])
  assertEquals(map.Anel.peso_g, 80)
  assertEquals(map.Anel.largura_cm, 17)
  assertEquals(map.Anel.comprimento_cm, 20)
  assertEquals(defaultsFor({ defaults: map }, "Anel").comprimento_cm, 20)
  assertEquals(defaultsFor({ defaults: map }, "brinco").category, "Brinco")
  assertEquals(packagingValues(defaultsFor({ defaults: map }, "Anel")), {
    peso_g: "80",
    comprimento_cm: "20",
    largura_cm: "17",
    altura_cm: "5",
  })
})

Deno.test("o SKU da divisão segue código-DIVISAO", () => {
  assertEquals(componentSku("AN581-R", "Pedra"), "AN581-R-PEDRA")
  assertEquals(isComponentSku("AN581-R-PEDRA", "AN581-R"), true)
  assertEquals(isComponentSku("OUTRO-PEDRA", "AN581-R"), false)
  assertEquals(isComponentSku("AN581-R-pedra", "AN581-R"), false)
  const body = componentUpdatePayload({
    componentId: 13,
    productCode: "AN581-R",
    sku: "AN581-R-PEDRA",
  })
  assertEquals(body, { component_id: 13, product_code: "AN581-R", sku: "AN581-R-PEDRA" })
  const html = renderTipos([{
    code: "AN581-R",
    name: "Anel rosa",
    components: [{ id: 13, name: "Pedra", sku: "AN581-R-PEDRA" }],
  }])
  assert(html.includes("AN581-R-PEDRA"))
  assert(html.includes("DIVISAO"))
  assert(html.includes('data-component-id="13"'))
})

Deno.test("só o administrador entra e a lista mostra quantidade vazia como zero", () => {
  assertEquals(isDashboardAdmin({ role: "admin", name: "Marcio" }), true)
  assertEquals(isDashboardAdmin({ role: "seller", name: "Marineide" }), false)
  assertEquals(isDashboardAdmin(null), false)
  assertEquals(dashboardView("/admin/estoque"), "estoque")
  assertEquals(dashboardView("/admin/esgotadas"), "esgotadas")
  assertEquals(dashboardView("/admin/peca", "?code=AN581-R"), "peca")
  assertEquals(dashboardView("/admin/conjuntos"), "conjuntos")
  assertEquals(dashboardView("/admin/tipos"), "conjuntos")
  assertEquals(dashboardView("/paginas/admin/painel.html", "?view=tipos"), "conjuntos")
  const list = renderStockList([{
    code: "AN581-R",
    name: "Anel rosa",
    unit_price: 120,
    quantity: null,
    categoria: "Anel",
    image_url: "https://exemplo.test/anel.jpg",
  }])
  assert(list.includes("0 un."))
  assert(list.includes('loading="lazy"'))
  assert(list.includes("entity-card"))
  assert(list.includes('data-product-code="AN581-R"'))
  assert(list.includes("https://exemplo.test/anel.jpg"))
  const nav = stockNavHtml("esgotadas")
  assert(nav.includes("/admin/esgotadas"))
  assert(nav.includes('aria-current="page"'))
  assert(nav.includes("Esgotadas"))
})

Deno.test("o estoque busca, pagina e separa esgotadas sem pedir a lista de novo", () => {
  const products = [
    { code: "AN581-R", name: "Anel rosa", categoria: "Anel", quantity: 2 },
    { code: "BR10", name: "Brinco orquídea", categoria: "Brinco", quantity: 0 },
    { code: "CO2", name: "Colar", categoria: "Colar", quantity: null },
  ]
  assertEquals(filterStock(products, "rosa").map((item) => item.code), ["AN581-R"])
  assertEquals(filterStock(products, "brinco").map((item) => item.code), ["BR10"])
  assertEquals(inStockProducts(products).map((item) => item.code), ["AN581-R"])
  assertEquals(outOfStockProducts(products).map((item) => item.code), ["BR10", "CO2"])
  const page = visibleStock(products, "", 2)
  assertEquals(page.total, 3)
  assertEquals(page.rows.length, 2)
  assertEquals(STOCK_PAGE_SIZE, 20)
  assertEquals(isPanelLink("/admin/estoque"), true)
  assertEquals(isPanelLink("/promocoes"), false)
  const stockPage = renderStockPage({
    rows: inStockProducts(products),
    total: 1,
    query: "",
    mode: "estoque",
    typeBlock: `<section class="stock-by-type"><h3>Estoque por tipo</h3></section>`,
  })
  assert(stockPage.includes("stock-by-type"))
  assert(stockPage.includes('data-stock-mode="estoque"'))
  const soldOut = renderStockPage({
    rows: outOfStockProducts(products),
    total: 2,
    query: "",
    mode: "esgotadas",
  })
  assert(soldOut.includes('data-stock-mode="esgotadas"'))
  assertEquals(soldOut.includes("stock-by-type"), false)
})

Deno.test("início, vendas e vendedoras mostram o mês ou sem dados ainda", () => {
  assertEquals(currentMonthKey(new Date("2026-10-14T15:00:00Z")), "2026-10")
  assertEquals(channelLabel("site"), "Site")
  assertEquals(channelLabel("equipe"), "Equipe")
  assertEquals(channelLabel("marketplace"), "Marketplace")
  const inicio = renderInicio({
    month: "2026-10",
    charged_total: 2400,
    paid_count: 12,
    paid_orders_count: 7,
    channels: [
      { channel: "site", orders: 2, charged_total: 400 },
      { channel: "equipe", orders: 4, charged_total: 1600 },
      { channel: "marketplace", orders: 1, charged_total: 400 },
    ],
    best_sellers: [{ code: "AN581-R", name: "Anel rosa", quantity: 5 }],
  })
  assert(inicio.includes("Vendas do mês"))
  assert(inicio.includes("origin-strip"))
  assert(inicio.includes('data-origin="site"'))
  assert(inicio.includes("Site"))
  assert(inicio.includes("Equipe"))
  assert(inicio.includes("Marketplace"))
  assert(inicio.includes("Anel rosa"))
  assert(inicio.includes("5 un."))
  assertEquals(inicio.includes("Shopee"), false)
  assertEquals(inicio.includes("vs mês anterior"), false)
  assertEquals(renderInicio(null).includes(NO_DATA), true)

  const filtered = renderInicio({
    month: "2026-10",
    charged_total: 2400,
    paid_count: 12,
    paid_orders_count: 7,
    channels: [
      { channel: "site", orders: 2, charged_total: 400 },
      { channel: "equipe", orders: 4, charged_total: 1600 },
    ],
    best_sellers: [{ code: "AN581-R", name: "Anel rosa", quantity: 5 }],
  }, undefined, {
    selectedChannel: "equipe",
    sales: [
      { id: 1, channel: "equipe", customer_name: "Lia", seller_name: "Marineide", total: 190, payment_status: "paid", created_at: "2026-10-14T15:00:00Z", items_count: 1 },
      { id: 2, channel: "site", customer_name: "Ana", total: 80, payment_status: "paid", created_at: "2026-10-14T16:00:00Z", items_count: 1 },
    ],
  })
  assert(filtered.includes("Vendas · Equipe"))
  assert(filtered.includes("Lia"))
  assertEquals(filtered.includes("Anel rosa"), false)
  assertEquals(filtered.includes("Ana"), false)
  assert(filtered.includes('aria-pressed="true"'))

  const vendas = renderVendas([{
    id: 10,
    created_at: "2026-10-14T15:00:00Z",
    seller_name: "Marineide",
    channel: "equipe",
    customer_name: "Lia",
    total: 190,
    payment_status: "paid",
    payment_method: "pix",
  }])
  assert(vendas.includes("Lia"))
  assert(vendas.includes("Marineide"))
  assert(vendas.includes("Equipe"))
  assert(vendas.includes("Paga"))
  assertEquals(renderVendas(null).includes(NO_DATA), true)

  const vendasCards = renderVendas([{
    id: 10,
    created_at: "2026-10-14T15:00:00Z",
    seller_name: "Marineide",
    channel: "equipe",
    customer_name: "Lia",
    total: 190,
    payment_status: "paid",
  }], undefined, {
    renderSales: (rows) => `<ul class="sale-card-list"><li><button type="button" class="sale-card" data-sale-id="${rows[0].id}">${rows[0].customer_name}</button></li></ul>`,
  })
  assert(vendasCards.includes('data-sale-id="10"'))
  assert(vendasCards.includes("Lia"))

  const statusFilterHtml = renderSalesStatusFilter("receivable")
  assert(statusFilterHtml.includes("Todas"))
  assert(statusFilterHtml.includes("A receber"))
  assert(statusFilterHtml.includes("Pagas"))
  assert(statusFilterHtml.includes("Canceladas"))
  assert(statusFilterHtml.includes('data-status="receivable" role="tab" aria-selected="true"'))

  const filteredVendas = renderVendas([
    { id: 1, customer_name: "Lia", payment_status: "paid" },
    { id: 2, customer_name: "Bia", payment_status: "receivable" },
  ], undefined, {
    selectedStatus: "receivable",
    filterSales: (rows, status) => rows.filter((r) => r.payment_status === status),
  })
  assert(filteredVendas.includes("Bia"))
  assertEquals(filteredVendas.includes("Lia"), false)

  const emptyReceivable = renderVendas([], undefined, { selectedStatus: "receivable" })
  assert(emptyReceivable.includes("Nenhuma venda a receber."))

  const team = renderVendedoras([{
    seller_id: 2,
    name: "Marineide",
    month_ready: true,
    paid_count: 4,
    paid_orders_count: 3,
    charged_total: 890,
    commission_amount: 89,
    commission_percent: 10,
    balance: 120,
  }])
  assert(team.includes("Marineide"))
  assert(team.includes("Saldo a receber"))
  assert(team.includes("10%"))
  assert(team.includes('data-seller-id="2"'))
  assert(team.includes('aria-pressed="false"'))

  const sellerSales = renderVendedoras([{
    seller_id: 2,
    name: "Marineide",
    month_ready: true,
    paid_count: 1,
    paid_orders_count: 1,
    charged_total: 190,
    commission_amount: 19,
    commission_percent: 10,
    balance: 0,
  }], undefined, {
    selectedSellerId: 2,
    sales: [
      { id: 10, seller_id: 2, seller_name: "Marineide", customer_name: "Lia", total: 190, payment_status: "paid" },
      { id: 11, seller_id: 3, seller_name: "Outra", customer_name: "Ana", total: 80, payment_status: "paid" },
    ],
    renderSales: (rows) => rows.map((sale) => `<button class="sale-card" data-sale-id="${sale.id}">${sale.customer_name}</button>`).join(""),
  })
  assert(sellerSales.includes("Vendas · Marineide"))
  assert(sellerSales.includes('aria-pressed="true"'))
  assert(sellerSales.includes("Lia"))
  assertEquals(sellerSales.includes("Ana"), false)

  const waiting = renderVendedoras(sellersFromDirectory([{ id: 2, name: "Marineide" }]))
  assert(waiting.includes("Marineide"))
  assert(waiting.includes(NO_DATA))
  assertEquals(renderVendedoras(null).includes(NO_DATA), true)
})

Deno.test("a flag de canais do Início fica ligada e o fallback antigo ainda funciona", async () => {
  assertEquals(ADMIN_HOME_CHANNELS_ENABLED, true)
  assertEquals(shouldShowHomeChannels(), true)
  assertEquals(HOME_CHANNEL_ORDER, ["site", "equipe", "shopee", "mercado_livre", "tiktok"])
  assertEquals(ceilMarketplacePrice(16.88), 47.9) // 16.88×2,5+5 = 47,2 → 47,90
  assertEquals(ceilMarketplacePrice(17.28), 48.9) // 17.28×2,5+5 = 48,2 → 48,90
  assertEquals(ceilMarketplacePrice(null), null)
  const source = await Deno.readTextFile(new URL("./painel.logic.js", import.meta.url))
  assertEquals(source.includes("export const ADMIN_HOME_CHANNELS_ENABLED = true"), true)

  const fase2 = {
    month: "2026-10",
    charged_total: 2400,
    paid_count: 12,
    paid_orders_count: 7,
    previous: { month: "2026-09", charged_total: 2000, paid_count: 10, paid_orders_count: 6 },
    channels: [
      { channel: "site", orders: 2, charged_total: 400, previous_orders: 1, previous_charged_total: 300 },
      { channel: "equipe", orders: 4, charged_total: 1600, previous_orders: 3, previous_charged_total: 1200 },
      { channel: "shopee", orders: 1, charged_total: 200, previous_orders: 0, previous_charged_total: 0 },
      { channel: "mercado_livre", orders: 0, charged_total: 0, previous_orders: 1, previous_charged_total: 150 },
      { channel: "tiktok", orders: 0, charged_total: 0, previous_orders: 0, previous_charged_total: 0 },
    ],
    best_sellers: [{
      code: "AN581-R",
      name: "Anel rosa",
      quantity: 5,
      charged_total: 600,
      channels: [
        { channel: "site", quantity: 2, charged_total: 200 },
        { channel: "shopee", quantity: 3, charged_total: 400 },
      ],
    }],
  }
  const normalized = normalizeOverview(fase2)
  assertEquals(overviewHasDetailedChannels(normalized), true)
  assertEquals(normalized?.previous?.month, "2026-09")
  assertEquals(normalized?.best_sellers[0].channels.length, 2)

  const fromPrevChannels = normalizeOverview({
    ok: true,
    month: "2026-10",
    charged_total: 100,
    paid_count: 1,
    paid_orders_count: 1,
    channels: [{ channel: "site", orders: 1, charged_total: 100 }],
    previous: {
      month: "2026-09",
      charged_total: 80,
      paid_count: 1,
      paid_orders_count: 1,
      channels: [{ channel: "site", orders: 2, charged_total: 80 }],
    },
    best_sellers: [],
  })
  assertEquals(fromPrevChannels?.channels[0].previous_charged_total, 80)
  assertEquals(fromPrevChannels?.channels[0].previous_orders, 2)

  const on = renderInicio(normalized)
  assert(on.includes("Shopee"))
  assert(on.includes("Mercado Livre"))
  assert(on.includes("TikTok Shop"))
  assert(on.includes("vs mês anterior"))
  assert(on.includes("Site 2"))
  assert(on.includes("Shopee 3"))

  const off = renderInicio(normalized, undefined, { enabled: false })
  assertEquals(off.includes("Shopee"), true)
  assertEquals(off.includes("vs mês anterior"), false)
  assertEquals(off.includes("Site 2"), false)

  const legacy = renderInicio({
    month: "2026-10",
    charged_total: 2400,
    paid_count: 12,
    paid_orders_count: 7,
    channels: [
      { channel: "site", orders: 2, charged_total: 400 },
      { channel: "equipe", orders: 4, charged_total: 1600 },
      { channel: "marketplace", orders: 1, charged_total: 400 },
    ],
    best_sellers: [{ code: "AN581-R", name: "Anel rosa", quantity: 5 }],
  })
  assert(legacy.includes("Marketplace"))
  assertEquals(legacy.includes("vs mês anterior"), false)

  const formOn = renderPieceForm({
    code: "AN581-R",
    name: "Anel rosa",
    unit_price: 120,
    preco_marketplace: 47.9,
  })
  assert(formOn.includes("Preço do site"))
  assert(formOn.includes('id="preco-marketplace"'))
  assert(formOn.includes("readonly"))
  assert(formOn.includes("47,9"))

  const formOff = renderPieceForm({
    code: "AN581-R",
    name: "Anel rosa",
    unit_price: 120,
    preco_marketplace: 47.9,
  }, {}, { enabled: false })
  assert(formOff.includes(">Preço<") || formOff.includes("Preço</span>"))
  assertEquals(formOff.includes("Preço do site"), false)
  assertEquals(formOff.includes("preco-marketplace"), false)

  assertEquals(pieceFormState({ preco_marketplace: 47.9 }).precoMarketplace, "47,9")
  assertEquals(renderPieceForm({ code: "X", unit_price: 10 }).includes("preco-marketplace"), false)
})

Deno.test("passo 7: FAB some em adicionar, menu aponta para nova peça e nova venda", async () => {
  assertEquals(shouldShowFab("inicio"), true)
  assertEquals(shouldShowFab("estoque"), true)
  assertEquals(shouldShowFab("esgotadas"), true)
  assertEquals(shouldShowFab("vendas"), true)
  assertEquals(shouldShowFab("adicionar"), false)
  const menu = fabMenuHtml()
  assert(menu.includes('href="/admin/adicionar"'))
  assert(menu.includes('href="/vendas/nova"'))
  assert(menu.includes("Nova peça"))
  assert(menu.includes("Nova venda"))
  const page = await Deno.readTextFile(new URL("./painel.html", import.meta.url))
  assert(page.includes('id="fab-root"'))
  assert(page.includes('id="fab-toggle"'))
  assert(page.includes('data-fab="peca"'))
  assert(page.includes('data-fab="venda"'))
  const script = await Deno.readTextFile(new URL("./painel.js", import.meta.url))
  assert(script.includes("shouldShowFab"))
  assert(script.includes("paintFab"))
  assert(script.includes("undoArchive"))
  assert(script.includes('label: "Desfazer"'))
})

Deno.test("passo 7: feedbackParts marca Desfazer e archivePayload desfaz com archive false", () => {
  const withUndo = feedbackParts("Peça arquivada.", { undo: { label: "Desfazer", ms: 5000 } })
  assertEquals(withUndo.text, "Peça arquivada.")
  assertEquals(withUndo.undoLabel, "Desfazer")
  assertEquals(withUndo.undoMs, 5000)
  const plain = feedbackParts("Salvo.")
  assertEquals(plain.undoLabel, "")
  assertEquals(archivePayload("AN581-R"), { code: "AN581-R" })
  assertEquals(archivePayload("AN581-R", false), { code: "AN581-R", archive: false })
})

Deno.test("passo 7: rotas antigas de admin redirecionam para as telas novas", async () => {
  const vercel = JSON.parse(await Deno.readTextFile(new URL("../../../vercel.json", import.meta.url)))
  assertEquals(LEGACY_ADMIN_REDIRECTS.length >= 4, true)
  for (const rule of LEGACY_ADMIN_REDIRECTS) {
    const found = vercel.redirects.find((item: { source: string }) => item.source === rule.from)
    assert(found, `${rule.from} precisa de redirect`)
    assertEquals(found.destination, rule.to)
    assertEquals(found.permanent, true)
    assertEquals(
      vercel.rewrites.some((item: { source: string }) => item.source === rule.from),
      false,
      `${rule.from} não pode continuar como rewrite`,
    )
  }
  assertEquals(
    vercel.redirects.find((item: { source: string }) => item.source === "/adicionar-peca")?.destination,
    "/admin/adicionar",
  )
  assertEquals(
    vercel.redirects.find((item: { source: string }) => item.source === "/importar")?.destination,
    "/admin/importar",
  )
})
