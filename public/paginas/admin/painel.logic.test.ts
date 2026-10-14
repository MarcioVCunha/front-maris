import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  ADMIN_DASHBOARD_ENABLED,
  NCM_DEFAULT,
  ORIGEM_DEFAULT,
  archiveConfirmText,
  archivePayload,
  buildAddProductPayload,
  buildProductUpdatePayload,
  componentSku,
  componentUpdatePayload,
  dashboardView,
  displayQuantity,
  fieldPlaceholder,
  isComponentSku,
  isDashboardAdmin,
  pieceFormState,
  renderAddForm,
  renderArchiveDialog,
  renderPieceForm,
  navHtml,
  renderStockList,
  renderTipos,
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
  const hub = await Deno.readTextFile(new URL("./admin.html", import.meta.url))
  assert(hub.includes('location.replace("/admin/inicio")'))
  assert(hub.includes('href="/promocoes"'))
  const menu = navHtml("inicio")
  assert(menu.includes('href="/promocoes"'))
  assert(menu.includes("Promoções"))
  assert(menu.includes('href="/admin/inicio" aria-current="page"'))
  const vercel = JSON.parse(await Deno.readTextFile(new URL("../../../vercel.json", import.meta.url)))
  assertEquals(
    vercel.rewrites.find((item: { source: string }) => item.source === "/admin").destination,
    "/paginas/admin/admin.html",
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
  const piece = { code: "AN581-R", name: "Anel rosa" }
  assertEquals(archivePayload(piece.code), { code: "AN581-R" })
  assertEquals(archiveConfirmText(piece), "Arquivar Anel rosa (AN581-R)? Ela sai da lista do estoque.")
  assert(renderArchiveDialog(piece).includes("archive-confirm"))
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
  }])
  assert(list.includes("0 un."))
  assert(list.includes("/admin/peca?code=AN581-R"))
})
