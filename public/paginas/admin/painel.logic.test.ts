import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  ADMIN_DASHBOARD_ENABLED,
  NCM_DEFAULT,
  ORIGEM_DEFAULT,
  NO_DATA,
  PACKAGING_DEFAULTS,
  STOCK_PAGE_SIZE,
  archiveConfirmText,
  archivePayload,
  channelLabel,
  currentMonthKey,
  filterStock,
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
  packagingValues,
  pieceFormState,
  defaultsFor,
  renderAddForm,
  renderArchiveDialog,
  renderInicio,
  renderPieceForm,
  renderVendas,
  renderVendedoras,
  navHtml,
  renderStockList,
  renderTipos,
  sellersFromDirectory,
  visibleStock,
  shouldShowDashboard,
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
  const piece = { code: "AN581-R", name: "Anel rosa" }
  assertEquals(archivePayload(piece.code), { code: "AN581-R" })
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

Deno.test("o SKU do tipo segue código-TIPO", () => {
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
  assert(html.includes('data-component-id="13"'))
})

Deno.test("só o administrador entra e a lista mostra quantidade vazia como zero", () => {
  assertEquals(isDashboardAdmin({ role: "admin", name: "Marcio" }), true)
  assertEquals(isDashboardAdmin({ role: "seller", name: "Marineide" }), false)
  assertEquals(isDashboardAdmin(null), false)
  assertEquals(dashboardView("/admin/estoque"), "estoque")
  assertEquals(dashboardView("/admin/peca", "?code=AN581-R"), "peca")
  assertEquals(dashboardView("/paginas/admin/painel.html", "?view=tipos"), "tipos")
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
  assert(list.includes("/admin/peca?code=AN581-R"))
})

Deno.test("o estoque busca e pagina sem pedir a lista de novo", () => {
  const products = [
    { code: "AN581-R", name: "Anel rosa", categoria: "Anel" },
    { code: "BR10", name: "Brinco orquídea", categoria: "Brinco" },
    { code: "CO2", name: "Colar", categoria: "Colar" },
  ]
  assertEquals(filterStock(products, "rosa").map((item) => item.code), ["AN581-R"])
  assertEquals(filterStock(products, "brinco").map((item) => item.code), ["BR10"])
  const page = visibleStock(products, "", 2)
  assertEquals(page.total, 3)
  assertEquals(page.rows.length, 2)
  assertEquals(STOCK_PAGE_SIZE, 20)
  assertEquals(isPanelLink("/admin/estoque"), true)
  assertEquals(isPanelLink("/promocoes"), false)
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
  assert(inicio.includes("Site"))
  assert(inicio.includes("Equipe"))
  assert(inicio.includes("Marketplace"))
  assert(inicio.includes("Anel rosa"))
  assert(inicio.includes("5 un."))
  assertEquals(renderInicio(null).includes(NO_DATA), true)

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

  const team = renderVendedoras([{
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
  const waiting = renderVendedoras(sellersFromDirectory([{ id: 2, name: "Marineide" }]))
  assert(waiting.includes("Marineide"))
  assert(waiting.includes(NO_DATA))
  assertEquals(renderVendedoras(null).includes(NO_DATA), true)
})
