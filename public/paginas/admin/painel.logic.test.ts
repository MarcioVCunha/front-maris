import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  ADMIN_DASHBOARD_ENABLED,
  ADMIN_HOME_CHANNELS_ENABLED,
  HOME_CHANNEL_ORDER,
  NCM_DEFAULT,
  ORIGEM_DEFAULT,
  ORIGEM_OPTIONS,
  originOptions,
  NO_DATA,
  PACKAGING_DEFAULTS,
  STOCK_PAGE_SIZE,
  archiveConfirmText,
  archivePayload,
  ceilMarketplacePrice,
  channelLabel,
  computeSalesGoalProgress,
  currentMonthKey,
  filterStock,
  generateSalesCsv,
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
  normalizeSellersMonth,
  outOfStockProducts,
  overviewHasDetailedChannels,
  packagingValues,
  pieceFormState,
  defaultsFor,
  renderAddForm,
  renderArchiveDialog,
  renderCategoryRanking,
  renderConversionCard,
  renderGoalBar,
  renderInicio,
  renderOverdueAlert,
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
  computeAverageTicket,
  stepMonth,
  formatTicketDelta,
  renderTicketCard,
  renderPeriodFilter,
  renderCompras,
  renderStockBatchBar,
  renderBatchArchiveDialog,
  renderBatchQuantityDialog,
  renderBatchPriceDialog,
  formatActionDateTime,
  formatActionLabel,
  renderProductHistoryDialog,
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
  assert(menu.includes('href="/admin/promocoes"'))
  assert(menu.includes("Promoções"))
  assert(menu.includes('href="/admin/inicio" aria-current="page"'))
  const vercel = JSON.parse(await Deno.readTextFile(new URL("../../../vercel.json", import.meta.url)))
  assertEquals(
    vercel.rewrites.find((item: { source: string }) => item.source === "/admin").destination,
    "/paginas/admin/painel.html",
  )
  assertEquals(
    vercel.rewrites.find((item: { source: string }) => item.source === "/admin/promocoes").destination,
    "/paginas/admin/painel.html",
  )
  assertEquals(
    vercel.redirects.find((item: { source: string }) => item.source === "/promocoes").destination,
    "/admin/promocoes",
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

Deno.test("opções de origem da peça cobrem de 0 a 8 e renderizam select no formulário", () => {
  assertEquals(ORIGEM_OPTIONS.length, 9)
  assertEquals(ORIGEM_OPTIONS[0], { value: 0, label: "0 — Nacional (padrão)" })
  assertEquals(ORIGEM_OPTIONS[1], { value: 1, label: "1 — Importada direto" })
  assertEquals(ORIGEM_OPTIONS[8], { value: 8, label: "8 — Nacional (importação > 70%)" })

  const opts0 = originOptions(0)
  assert(opts0.includes('<option value="0" selected>0 — Nacional (padrão)</option>'))
  assert(opts0.includes('<option value="1">1 — Importada direto</option>'))

  const opts2 = originOptions("2")
  assert(opts2.includes('<option value="2" selected>2 — Importada comprada no Brasil</option>'))
  assert(!opts2.includes('<option value="0" selected>'))

  const optsNull = originOptions(null)
  assert(optsNull.includes('<option value="0" selected>0 — Nacional (padrão)</option>'))

  const form = renderPieceForm({ code: "AN581-R", name: "Anel rosa", origem: 1 }, anelDefaults)
  assert(form.includes('<select id="origem">'))
  assert(form.includes('<option value="1" selected>1 — Importada direto</option>'))

  const add = renderAddForm()
  assert(add.includes('<select id="origem">'))
  assert(add.includes('<option value="0" selected>0 — Nacional (padrão)</option>'))
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
  assertEquals(dashboardView("/admin/promocoes"), "promocoes")
  assertEquals(dashboardView("/admin/cupons"), "cupons")
  assertEquals(dashboardView("/admin/indicacoes"), "cupons")
  assertEquals(dashboardView("/admin/compras"), "compras")
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

Deno.test("ranking de vendedoras: normalizeSellersMonth e renderVendedoras com medalhas, progresso e totais", () => {
  const rawData = {
    ok: true,
    month: "2026-10",
    team_totals: {
      total_charged: 1200,
      total_commission: 240,
      paid_orders_count: 6,
      paid_units_count: 10,
      total_balance: 500,
      active_sellers_count: 2,
    },
    sellers: [
      {
        seller_id: 1,
        name: "Lia Vendedora",
        charged_total: 800,
        commission_amount: 240,
        commission_percent: 30,
        paid_orders_count: 4,
        paid_count: 7,
        balance: 100,
        average_ticket: 200,
        rank: 1,
      },
      {
        seller_id: 2,
        name: "Marcio",
        charged_total: 400,
        commission_amount: 0,
        commission_percent: 0,
        paid_orders_count: 2,
        paid_count: 3,
        balance: 400,
        average_ticket: 200,
        rank: 2,
        sem_comissao: true,
      },
    ],
  }

  const normalized = normalizeSellersMonth(rawData) as any
  assertEquals(Array.isArray(normalized), true)
  assertEquals(normalized?.length, 2)
  assertEquals(normalized?.team_totals.total_charged, 1200)
  assertEquals(normalized?.team_totals.total_commission, 240)
  assertEquals(normalized?.[0].rank, 1)
  assertEquals(normalized?.[0].average_ticket, 200)

  const html = renderVendedoras(normalized, undefined, { month: "2026-10" })
  assert(html.includes("Ranking de Vendas da Equipe"))
  assert(html.includes("Vendas da Equipe"))
  assert(html.includes("Comissões a Pagar"))
  assert(html.includes("#1 🥇"))
  assert(html.includes("#2 🥈"))
  assert(html.includes("Lia Vendedora"))
  assert(html.includes("seller-progress-track"))
  assert(html.includes("Ticket médio"))
  assert(html.includes("inicio-period-bar"))
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
  assert(script.includes("undoCancelSale"))
  assert(script.includes("commitPendingSaleCancel"))
  assert(script.includes('label: "Desfazer"'))
})

Deno.test("passo 7: feedbackParts marca Desfazer e archivePayload desfaz com archive false", () => {
  const withUndo = feedbackParts("Peça arquivada.", { undo: { label: "Desfazer", ms: 5000 } })
  assertEquals(withUndo.text, "Peça arquivada.")
  assertEquals(withUndo.undoLabel, "Desfazer")
  assertEquals(withUndo.undoMs, 5000)
  const cancelUndo = feedbackParts("Venda cancelada.", { undo: { label: "Desfazer", ms: 8000 } })
  assertEquals(cancelUndo.text, "Venda cancelada.")
  assertEquals(cancelUndo.undoLabel, "Desfazer")
  assertEquals(cancelUndo.undoMs, 8000)
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

Deno.test("etapa 3: progresso da meta e renderização da barra", () => {
  const p1 = computeSalesGoalProgress(4000, 10000)
  assertEquals(p1.percent, 40)
  assertEquals(p1.rawPercent, 40)
  assertEquals(p1.remaining, 6000)
  assertEquals(p1.reached, false)

  const p2 = computeSalesGoalProgress(10000, 10000)
  assertEquals(p2.percent, 100)
  assertEquals(p2.remaining, 0)
  assertEquals(p2.reached, true)

  const p3 = computeSalesGoalProgress(12500, 10000)
  assertEquals(p3.percent, 100)
  assertEquals(p3.rawPercent, 125)
  assertEquals(p3.remaining, 0)
  assertEquals(p3.reached, true)

  const p4 = computeSalesGoalProgress(500, 0)
  assertEquals(p4.reached, true)

  const html = renderGoalBar(4000, 10000, (v) => `R$ ${v}`)
  assert(html.includes("goal-widget"))
  assert(html.includes("Meta do mês:"))
  assert(html.includes("R$ 10000"))
  assert(html.includes("40% da meta de R$ 10000 · Faltam R$ 6000"))
  assert(html.includes('id="btn-edit-goal"'))
  assert(html.includes('style="width: 40%"'))

  const htmlReached = renderGoalBar(12000, 10000, (v) => `R$ ${v}`)
  assert(htmlReached.includes("goal-widget__bar-fill--reached"))
  assert(htmlReached.includes("🎉 Meta atingida! (120%)"))
})

Deno.test("etapa 3: alerta de vendas a receber há mais de 7 dias", () => {
  assertEquals(renderOverdueAlert(null), "")
  assertEquals(renderOverdueAlert({ count: 0, total: 0 }), "")

  const alertHtml = renderOverdueAlert({ count: 3, total: 450 }, (v) => `R$ ${v}`)
  assert(alertHtml.includes("overdue-banner"))
  assert(alertHtml.includes("3 vendas a receber há mais de 7 dias"))
  assert(alertHtml.includes("R$ 450"))
  assert(alertHtml.includes('href="/admin/vendas?status=receivable"'))
  assert(alertHtml.includes("Ver vendas a receber"))
})

Deno.test("etapa 3: geração de CSV de vendas formatado para Excel BR", () => {
  const sales = [
    {
      id: 101,
      created_at: "2026-10-14T15:30:00Z",
      channel: "site",
      customer_name: "Mariana Silva",
      seller_name: "",
      payment_status: "paid",
      payment_method: "pix",
      items_count: 2,
      items: [
        { code: "AN581-R", quantity: 1 },
        { code: "BR102-O", quantity: 1 },
      ],
      total: 219.9,
    },
    {
      id: 102,
      created_at: "2026-10-14T16:00:00Z",
      channel: "equipe",
      customer_name: "Carla Pires",
      seller_name: "Marineide",
      payment_status: "receivable",
      payment_method: "dinheiro",
      items_count: 1,
      items: [{ code: "CO200-O", quantity: 1 }],
      total: 89.5,
    },
  ]

  const csv = generateSalesCsv(sales)
  // Verifica BOM UTF-8
  assertEquals(csv.startsWith("\uFEFF"), true)
  // Cabeçalho com ponto-e-vírgula
  assert(csv.includes("Data;Pedido;Canal;Cliente;Vendedora;Status;Forma de Pagamento;Qtd Peças;Itens;Valor Total (R$)"))
  // Linhas com valores formatados
  assert(csv.includes("#101;Site;Mariana Silva;;Paga;Pix;2;AN581-R (1x), BR102-O (1x);219,90"))
  assert(csv.includes("#102;Equipe;Carla Pires;Marineide;A receber;Dinheiro;1;CO200-O (1x);89,50"))

  // Array vazio gera cabeçalho
  const emptyCsv = generateSalesCsv([])
  assertEquals(emptyCsv.startsWith("\uFEFF"), true)
  assert(emptyCsv.includes("Data;Pedido;Canal"))
})

Deno.test("etapa 3: renderInicio com lucro, meta, alerta a receber e botão CSV", () => {
  const formatMoney = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`
  const html = renderInicio({
    month: "2026-10",
    charged_total: 2400,
    profit_total: 1400,
    sales_goal: 10000,
    receivables_overdue: { count: 2, total: 350 },
    paid_count: 12,
    paid_orders_count: 7,
    channels: [
      { channel: "site", orders: 2, charged_total: 400, profit_total: 250 },
      { channel: "equipe", orders: 4, charged_total: 1600, profit_total: 900 },
      { channel: "shopee", orders: 1, charged_total: 200, profit_total: 120 },
      { channel: "mercado_livre", orders: 0, charged_total: 0, profit_total: 0 },
      { channel: "tiktok", orders: 0, charged_total: 0, profit_total: 0 },
    ],
    best_sellers: [{ code: "AN581-R", name: "Anel rosa", quantity: 5, charged_total: 600 }],
  }, formatMoney, { enabled: true })

  // Alerta a receber
  assert(html.includes("overdue-banner"))
  assert(html.includes("2 vendas a receber há mais de 7 dias"))
  assert(html.includes("R$ 350,00"))

  // Lucro no hero com margem
  assert(html.includes("hero-profit-card"))
  assert(html.includes("Lucro do mês"))
  assert(html.includes("R$ 1400,00"))
  assert(html.includes("58% de margem bruta"))

  // Meta de vendas
  assert(html.includes("goal-widget"))
  assert(html.includes("Meta do mês:"))
  assert(html.includes("R$ 10000,00"))
  assert(html.includes('id="btn-edit-goal"'))

  // Botão exportar CSV
  assert(html.includes('id="btn-export-sales-csv"'))
  assert(html.includes("Exportar vendas (CSV)"))

  // Lucro nos cards de origem
  assert(html.includes("Lucro: R$ 250,00"))
  assert(html.includes("Lucro: R$ 900,00"))
  assert(html.includes("Lucro: R$ 120,00"))
})

Deno.test("etapa 3: renderVendas com botão de exportar CSV", () => {
  const html = renderVendas([], undefined, { selectedStatus: "all" })
  assert(html.includes('id="btn-export-sales-vendas"'))
  assert(html.includes("Exportar vendas (CSV)"))
})

Deno.test("etapa 3: renderConversionCard formata taxa geral, detalhe, site e comparação", () => {
  assertEquals(renderConversionCard(null), "")

  const conv = {
    orders_created: 10,
    orders_paid: 7,
    conversion_rate: 70,
    site_orders_created: 4,
    site_orders_paid: 3,
    site_conversion_rate: 75,
  }
  const prev = {
    orders_created: 8,
    orders_paid: 5,
    conversion_rate: 62.5,
  }

  const html = renderConversionCard(conv, prev)
  assert(html.includes("hero-conversion-card"))
  assert(html.includes("Conversão"))
  assert(html.includes("70%"))
  assert(html.includes("7 de 10 pedidos pagos"))
  assert(html.includes("Site: 75% (3/4)"))
  assert(html.includes("+7.5% vs mês anterior"))

  // Caso com queda
  const lower = renderConversionCard({ ...conv, conversion_rate: 50 }, prev)
  assert(lower.includes("−12.5% vs mês anterior"))

  // Caso vazio
  const empty = renderConversionCard({ orders_created: 0, orders_paid: 0, conversion_rate: 0 })
  assert(empty.includes("0%"))
  assert(empty.includes("Nenhum pedido no mês"))
})

Deno.test("etapa 3: renderCategoryRanking gera lista com posições, valores e barras", () => {
  const formatMoney = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`
  assertEquals(renderCategoryRanking([], formatMoney), `<p class="empty">${NO_DATA}</p>`)

  const ranking = [
    {
      category: "Brincos",
      profit_total: 800,
      charged_total: 1300,
      quantity: 8,
      margin_percent: 61.5,
    },
    {
      category: "Colares",
      profit_total: 400,
      charged_total: 800,
      quantity: 4,
      margin_percent: 50,
    },
  ]

  const html = renderCategoryRanking(ranking, formatMoney)
  assert(html.includes("category-rank-list"))
  assert(html.includes("#1"))
  assert(html.includes("Brincos"))
  assert(html.includes("8 un. · Faturamento: R$ 1300,00"))
  assert(html.includes("Lucro: R$ 800,00"))
  assert(html.includes("61.5% margem"))
  assert(html.includes("width: 100%"))

  assert(html.includes("#2"))
  assert(html.includes("Colares"))
  assert(html.includes("4 un. · Faturamento: R$ 800,00"))
  assert(html.includes("Lucro: R$ 400,00"))
  assert(html.includes("50% margem"))
  assert(html.includes("width: 50%"))
})

Deno.test("etapa 3: renderInicio integra card de conversão e seção de ranking de categorias", () => {
  const formatMoney = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`
  const overview = {
    month: "2026-10",
    charged_total: 3000,
    profit_total: 1800,
    sales_goal: 10000,
    conversion: {
      orders_created: 12,
      orders_paid: 9,
      conversion_rate: 75,
      site_orders_created: 4,
      site_orders_paid: 3,
      site_conversion_rate: 75,
    },
    category_ranking: [
      {
        category: "Brincos",
        profit_total: 1000,
        charged_total: 1600,
        quantity: 10,
        margin_percent: 62.5,
      },
    ],
    paid_count: 15,
    paid_orders_count: 9,
    channels: [
      { channel: "site", orders: 3, charged_total: 600, profit_total: 350 },
      { channel: "equipe", orders: 6, charged_total: 2400, profit_total: 1450 },
      { channel: "shopee", orders: 0, charged_total: 0, profit_total: 0 },
      { channel: "mercado_livre", orders: 0, charged_total: 0, profit_total: 0 },
      { channel: "tiktok", orders: 0, charged_total: 0, profit_total: 0 },
    ],
    best_sellers: [{ code: "BR101-O", name: "Brinco pérola", quantity: 5, charged_total: 500 }],
  }

  const html = renderInicio(overview, formatMoney, { enabled: true })
  assert(html.includes("hero-conversion-card"))
  assert(html.includes("75%"))
  assert(html.includes("9 de 12 pedidos pagos"))
  assert(html.includes("Categorias por lucro"))
  assert(html.includes("inicio-category-ranking"))
  assert(html.includes("Brincos"))
  assert(html.includes("Lucro: R$ 1000,00"))
  assert(html.includes("inicio-period-bar"), "Deve conter a barra de período")
  assert(html.includes("hero-ticket-card"), "Deve conter o card de ticket médio")
  assert(html.includes("60% de margem bruta"), "Deve exibir margem bruta no card de lucro")
  assert(html.includes("btn-send-weekly-summary"), "Deve conter o botão de resumo semanal por e-mail")
})

Deno.test("etapa 3: computeAverageTicket calcula ticket médio corretamente", () => {
  assertEquals(computeAverageTicket(1500, 10), 150)
  assertEquals(computeAverageTicket(100.55, 3), 33.52)
  assertEquals(computeAverageTicket(0, 0), 0)
  assertEquals(computeAverageTicket(500, 0), 0)
  assertEquals(computeAverageTicket(-100, 5), 0)
})

Deno.test("etapa 3: stepMonth avança e retrocede meses corretamente", () => {
  assertEquals(stepMonth("2026-10", 1), "2026-11")
  assertEquals(stepMonth("2026-10", -1), "2026-09")
  assertEquals(stepMonth("2026-12", 1), "2027-01")
  assertEquals(stepMonth("2026-01", -1), "2025-12")
  assertEquals(stepMonth("invalid-month", 1), currentMonthKey())
})

Deno.test("etapa 3: formatTicketDelta formata a variação vs mês anterior", () => {
  const formatMoney = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`
  assertEquals(formatTicketDelta(150, 100, formatMoney), "+R$ 50,00 vs mês anterior")
  assertEquals(formatTicketDelta(80, 100, formatMoney), "−R$ 20,00 vs mês anterior")
  assertEquals(formatTicketDelta(100, 100, formatMoney), "igual ao mês anterior")
  assertEquals(formatTicketDelta(100, null as unknown as number, formatMoney), "")
})

Deno.test("etapa 3: renderTicketCard monta o HTML do ticket médio", () => {
  const formatMoney = (v: number) => `R$ ${Number(v).toFixed(2).replace(".", ",")}`
  const html = renderTicketCard(2000, 10, 1500, 10, formatMoney)
  assert(html.includes("hero-ticket-card"))
  assert(html.includes("Ticket médio"))
  assert(html.includes("R$ 200,00"))
  assert(html.includes("+R$ 50,00 vs mês anterior"))
})

Deno.test("etapa 3: renderPeriodFilter monta a barra com controles de navegação", () => {
  const current = currentMonthKey()
  const filterCurrent = renderPeriodFilter(current, current)
  assert(filterCurrent.includes("inicio-period-bar"))
  assert(filterCurrent.includes("btn-prev-month"))
  assert(filterCurrent.includes("btn-next-month"))
  assert(filterCurrent.includes(`value="${current}"`))
  assertEquals(filterCurrent.includes("btn-current-month"), false, "Não deve mostrar botão Mês atual quando já no mês atual")

  const past = "2026-05"
  const filterPast = renderPeriodFilter(past, "2026-10")
  assert(filterPast.includes("btn-current-month"), "Deve exibir botão Mês atual quando em mês anterior/posterior")
  assert(filterPast.includes(`value="${past}"`))
})

Deno.test("etapa 4: peças paradas (+60d) recebem badge, atalho de promo e filtro staleOnly", () => {
  const pieces = [
    {
      code: "AN1",
      name: "Anel Solitário",
      quantity: 5,
      unit_price: 80,
      days_without_sale: 75,
      is_stale: true,
    },
    {
      code: "BR2",
      name: "Brinco Gota",
      quantity: 10,
      unit_price: 50,
      days_without_sale: 15,
      is_stale: false,
    },
  ]

  // filterStock com staleOnly
  const allFiltered = filterStock(pieces, "", { staleOnly: false })
  assertEquals(allFiltered.length, 2)
  const staleFiltered = filterStock(pieces, "", { staleOnly: true })
  assertEquals(staleFiltered.length, 1)
  assertEquals(staleFiltered[0].code, "AN1")

  // renderStockList exibe badge e link Criar promo para peça parada
  const html = renderStockList(pieces, (v) => `R$ ${v}`)
  assert(html.includes("⏳ Sem saída há 75d"), "Deve exibir badge de dias sem saída")
  assert(html.includes('data-promo-shortcut="true"'), "Deve exibir atalho de promoção")
  assert(html.includes('/admin/promocoes?code=AN1'), "Link deve apontar para promoção com o código da peça")

  // Peça sem saída recente (<60d) não recebe o badge nem atalho
  assert(!html.includes("⏳ Sem saída há 15d"))

  // renderStockPage renderiza o chip de filtro Paradas (+60d)
  const pageHtml = renderStockPage({
    rows: staleFiltered,
    total: 1,
    query: "",
    mode: "estoque",
    staleOnly: true,
  })
  assert(pageHtml.includes("stock-filter-chips"))
  assert(pageHtml.includes("data-stock-filter=\"stale\""))
  assert(pageHtml.includes("is-active"))
})

Deno.test("etapa 4: renderCompras exibe Top 10 com fotos, ranking de reposição e zero vazamento de custo", () => {
  const purchasesData = {
    ok: true,
    month: "2026-10",
    total_units_sold: 58,
    total_orders_paid: 24,
    top_pieces: [
      {
        code: "BM100",
        name: "Brinco Dourado Flor",
        categoria: "Brinco",
        image_url: "https://example.com/bm100.jpg",
        quantity_sold: 15,
        custo: 12.5,
        unit_cost: 12.5,
        profit: 300,
      },
    ],
    restock_requests: [
      {
        code: "CL200",
        name: "Colar Ponto de Luz",
        categoria: "Colar",
        image_url: "https://example.com/cl200.jpg",
        quantity: 0,
        waiting_count: 7,
        contacts: [
          {
            id: 1,
            buyer_name: "Camila",
            buyer_whatsapp: "11999998888",
            buyer_email: "camila@example.com",
            created_at: "2026-10-18T10:00:00Z",
          },
        ],
      },
    ],
  }

  const html = renderCompras(purchasesData, (v) => `R$ ${v}`, { month: "2026-10" })

  // Título e resumo
  assert(html.includes("Visão de Compras & Reposição"))
  assert(html.includes("58 <small>unidades</small>"))
  assert(html.includes("em 24 pedidos pagos no mês"))

  // Top 10
  assert(html.includes("Top 10 Peças Mais Vendidas no Mês"))
  assert(html.includes("BM100"))
  assert(html.includes("Brinco Dourado Flor"))
  assert(html.includes("15 un."))
  assert(html.includes("https://example.com/bm100.jpg"))

  // Reposição esgotadas
  assert(html.includes("Reposição — Peças Esgotadas Mais Pedidas"))
  assert(html.includes("CL200"))
  assert(html.includes("Colar Ponto de Luz"))
  assert(html.includes("💖 7 clientes interessadas"))
  assert(html.includes('data-view-contacts="CL200"'))
  assert(html.includes("Ver contatos (1)"))

  // Segurança estrita: zero vazamento de custo, lucro ou comissão
  assertEquals(html.includes("custo"), false, "Nunca deve exibir custo na visão compras")
  assertEquals(html.includes("unit_cost"), false, "Nunca deve exibir unit_cost na visão compras")
  assertEquals(html.includes("profit"), false, "Nunca deve exibir profit na visão compras")
  assertEquals(html.includes("comissao"), false, "Nunca deve exibir comissão na visão compras")
  assertEquals(html.includes("commission"), false, "Nunca deve exibir commission na visão compras")
  assertEquals(html.includes("12.5"), false, "Nunca deve exibir valor de custo na visão compras")
  assertEquals(html.includes("300"), false, "Nunca deve exibir lucro na visão compras")
})

Deno.test("etapa 5: renderStockBatchBar exibe barra apenas quando houver seleção", () => {
  assertEquals(renderStockBatchBar(0, 10), "")
  const barSingle = renderStockBatchBar(1, 10)
  assert(barSingle.includes("1 peça selecionada"))
  assert(barSingle.includes("stock-batch-clear"))
  assert(barSingle.includes("stock-batch-select-all"))
  assert(barSingle.includes("stock-batch-quantity-btn"))
  assert(barSingle.includes("stock-batch-price-btn"))
  assert(barSingle.includes("stock-batch-promo-btn"))
  assert(barSingle.includes("stock-batch-archive-btn"))

  const barMultiple = renderStockBatchBar(4, 10)
  assert(barMultiple.includes("4 peças selecionadas"))
})

Deno.test("etapa 5: modais de lote montam HTML com acessibilidade e controles corretos", () => {
  // Modal de arquivamento
  const archiveDialog = renderBatchArchiveDialog(2, ["BR01", "BR02"])
  assert(archiveDialog.includes("Arquivar em lote"))
  assert(archiveDialog.includes("2 peças selecionadas"))
  assert(archiveDialog.includes("<code>BR01</code>"))
  assert(archiveDialog.includes("batch-archive-confirm"))

  // Modal de ajuste de estoque
  const qtyDialog = renderBatchQuantityDialog(3)
  assert(qtyDialog.includes("Ajustar estoque em lote"))
  assert(qtyDialog.includes("Definir quantidade fixa"))
  assert(qtyDialog.includes("Somar ou subtrair quantidade"))
  assert(qtyDialog.includes("batch-quantity-input"))
  assert(qtyDialog.includes("Repor para 1"))
  assert(qtyDialog.includes("+1 em cada"))
  assert(qtyDialog.includes("Zerar estoque"))

  // Modal de reajuste de preço
  const priceDialog = renderBatchPriceDialog(3)
  assert(priceDialog.includes("Reajustar preços em lote"))
  assert(priceDialog.includes("Porcentagem (%)"))
  assert(priceDialog.includes("Preço fixo (R$)"))
  assert(priceDialog.includes("batch-price-input"))
  assert(priceDialog.includes("+10%"))
  assert(priceDialog.includes("-10%"))
})

Deno.test("etapa 5: formatActionLabel e formatActionDateTime formatam eventos de auditoria", () => {
  const dt = formatActionDateTime("2026-10-18T10:30:00.000Z")
  assert(dt !== "—")

  // Quantidade em lote
  const qtyEvent = {
    action: "admin-product-batch:quantity",
    detail: { old_quantity: 0, new_quantity: 2 }
  }
  assertEquals(formatActionLabel(qtyEvent), "Estoque alterado de 0 para 2 un. (+2)")

  // Preço em lote
  const priceEvent = {
    action: "admin-product-batch:price",
    detail: { old_price: 50, new_price: 55, delta_percent: 10 }
  }
  assert(formatActionLabel(priceEvent).includes("50,00"))
  assert(formatActionLabel(priceEvent).includes("55,00"))
  assert(formatActionLabel(priceEvent).includes("+10%"))

  // Arquivamento
  assertEquals(formatActionLabel({ action: "admin-product-batch:archive" }), "Peça arquivada em lote")
  assertEquals(formatActionLabel({ action: "admin-product-batch:unarchive" }), "Peça desarquivada em lote")
  assertEquals(formatActionLabel({ action: "admin-product-archive" }), "Peça arquivada")
  assertEquals(formatActionLabel({ action: "admin-product-unarchive" }), "Peça desarquivada")

  // Atualização cadastral
  assertEquals(formatActionLabel({ action: "admin-product-update", detail: { fields: ["name", "unit_price"] } }), "Cadastro atualizado (name, unit_price)")
})

Deno.test("etapa 5: renderProductHistoryDialog monta timeline e respeita blindagem de dados", () => {
  const events = [
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

  const dialogHtml = renderProductHistoryDialog({
    code: "BR01",
    events,
    productName: "Brinco Gota"
  })

  assert(dialogHtml.includes("Histórico de Estoque: Brinco Gota (BR01)"))
  assert(dialogHtml.includes("Marcio"))
  assert(dialogHtml.includes("(admin)"))
  assert(dialogHtml.includes("Estoque alterado de 0 para 1 un. (+1)"))
  assert(dialogHtml.includes("history-timeline"))

  // Zero vazamento
  assertEquals(dialogHtml.includes("custo"), false)
  assertEquals(dialogHtml.includes("unit_cost"), false)
})

Deno.test("etapa 5: renderStockList suporta checkboxes de seleção e botões de histórico", () => {
  const pieces = [
    { code: "P1", name: "Peça 1", quantity: 3, unit_price: 49.9 },
    { code: "P2", name: "Peça 2", quantity: 0, unit_price: 89.9 }
  ]
  const selected = new Set(["P1"])

  const html = renderStockList(pieces, (v) => `R$ ${v}`, { selectedCodes: selected })
  assert(html.includes('data-stock-select="P1"'))
  assert(html.includes('data-stock-select="P2"'))
  assert(html.includes("is-selected"), "P1 deve ter classe is-selected")
  assert(html.includes('data-history-code="P1"'))
  assert(html.includes('data-history-code="P2"'))
})

Deno.test("etapa 5: renderPieceForm contém botão para abrir histórico de estoque", () => {
  const piece = { code: "AN10", name: "Anel Flor", quantity: 2, unit_price: 35.0, categoria: "Anel" }
  const html = renderPieceForm(piece, anelDefaults)
  assert(html.includes("piece-history-open"))
  assert(html.includes('data-piece-code="AN10"'))
  assert(html.includes("Ver histórico de estoque"))
})


