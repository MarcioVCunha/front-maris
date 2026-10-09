import { assertEquals } from "jsr:@std/assert@1"
import {
  buildCatalogLink,
  cartMoneyTotals,
  CATALOG_WHATSAPP_MESSAGE,
  doesProductMatchSearch,
  filterAndPartitionCatalog,
  groupDisplayVariant,
  groupIsAvailable,
  groupPassesFilters,
  groupProductsByColor,
  offerFromProduct,
  parsePriceBound,
  parseProductColor,
  partitionCatalogGroups,
  PIECE_CARE,
  pieceCareText,
  pixPrice,
  productCategory,
  productMatchesCategory,
  readCatalogLink,
  relatedGroups,
  resolvePieceLink,
  resolveProductCategory,
  productWhatsappMessage,
  selectVariantByCode,
  showLowStockBadge,
  showNewBadge,
  sortGroupsByBestsellers,
  sortGroupsForCatalog,
  totalsByProductCode,
  sortProductsForCatalog,
  STORE_WHATSAPP_NUMBER,
  visibleCategories,
  whatsappLink,
} from "./catalogo.logic.js"

const inStock = (product) => (Number(product?.quantity) || 0) > 0

Deno.test("categoria usa a primeira palavra, sem acento e no singular", () => {
  assertEquals(productCategory("Brincos de pérola"), "Brinco")
  assertEquals(productCategory("BRINCO argola"), "Brinco")
  assertEquals(productCategory("Colares"), "Colar")
  assertEquals(productCategory("Colár curto"), "Colar")
  assertEquals(productCategory("Pulseiras"), "Pulseira")
  assertEquals(productCategory("Chokers"), "Choker")
  assertEquals(productCategory("Anéis dourados"), "Anel")
  assertEquals(productCategory("Pingentes"), "Pingente")
  assertEquals(productCategory("Conjuntos"), "Conjunto")
})

Deno.test("o que não é categoria conhecida vai para Outros", () => {
  assertEquals(productCategory("Bracelete"), "Outros")
  assertEquals(productCategory("Tornozeleira delicada"), "Outros")
  assertEquals(productCategory("Trio de brincos"), "Outros")
  assertEquals(productCategory("Piercing"), "Outros")
  assertEquals(productCategory("Kit colar"), "Outros")
  assertEquals(productCategory(""), "Outros")
})

Deno.test("categorias vazias somem e a ordem fica fixa", () => {
  assertEquals(
    visibleCategories([
      { name: "Kit festa" },
      { name: "Anel fino" },
      { name: "Brincos" },
      { name: "Anéis" },
    ]),
    ["Brinco", "Anel", "Outros"],
  )
  assertEquals(visibleCategories([{ name: "Colar" }]), ["Colar"])
  assertEquals(productMatchesCategory({ name: "Pulseira" }, "Todos"), true)
  assertEquals(productMatchesCategory({ name: "Pulseira" }, "Colar"), false)
  assertEquals(productMatchesCategory({ name: "Pulseiras" }, "Pulseira"), true)
})

Deno.test("categoria gravada prevalece e valor vazio ou desconhecido volta ao nome", () => {
  assertEquals(resolveProductCategory({ name: "Pulseira fina", categoria: "Tornozeleira" }), "Tornozeleira")
  assertEquals(resolveProductCategory({ name: "Brinco argola", categoria: "Outros" }), "Outros")
  assertEquals(resolveProductCategory({ name: "Piercing nariz", categoria: "Piercing" }), "Piercing")
  assertEquals(resolveProductCategory({ name: "Brincos de pérola", categoria: null }), "Brinco")
  assertEquals(resolveProductCategory({ name: "Colares", categoria: "  " }), "Colar")
  assertEquals(resolveProductCategory({ name: "Anel fino", categoria: "brinco" }), "Anel")
  assertEquals(resolveProductCategory({ name: "Kit festa", categoria: "Joia" }), "Outros")
  assertEquals(productMatchesCategory({ name: "Pulseira", categoria: "Tornozeleira" }, "Tornozeleira"), true)
  assertEquals(productMatchesCategory({ name: "Pulseira", categoria: "Tornozeleira" }, "Pulseira"), false)
})

Deno.test("botões seguem a ordem e somem quando a categoria não tem cartão", () => {
  assertEquals(
    visibleCategories([
      { name: "Kit festa", categoria: "Piercing" },
      { name: "Pulseira", categoria: "Tornozeleira" },
      { name: "Brincos" },
      { name: "Anel", categoria: "Anel" },
    ]),
    ["Brinco", "Anel", "Tornozeleira", "Piercing"],
  )
  assertEquals(visibleCategories([{ name: "Bracelete", categoria: "" }]).includes("Outros"), true)
  assertEquals(visibleCategories([{ name: "Brinco", categoria: "Brinco" }]).includes("Outros"), false)
})

Deno.test("grupo de cores usa a categoria da variante principal", () => {
  const groups = groupProductsByColor([
    { code: "TZ1-O", name: "Pulseira tornozelo ouro", quantity: 1, categoria: "Tornozeleira" },
    { code: "TZ1-R", name: "Pulseira tornozelo ródio", quantity: 0, categoria: "Pulseira" },
  ])
  const shown = partitionCatalogGroups(groups, { category: "Tornozeleira", isAvailable: inStock })
  assertEquals(shown.available.map((group) => group.base), ["TZ1"])
  const other = partitionCatalogGroups(groups, { category: "Pulseira", isAvailable: inStock })
  assertEquals(other.available.length, 0)
  assertEquals(other.soldOut.length, 0)

  const soldPrimary = groupProductsByColor([
    { code: "TZ2-O", name: "Tornozeleira ouro", quantity: 0, categoria: "Tornozeleira" },
    { code: "TZ2-R", name: "Pulseira ródio", quantity: 2, categoria: "Pulseira" },
  ])
  assertEquals(groupDisplayVariant(soldPrimary[0], inStock).product.code, "TZ2-R")
  const byPrimary = partitionCatalogGroups(soldPrimary, { category: "Pulseira", isAvailable: inStock })
  assertEquals(byPrimary.available.map((group) => group.base), ["TZ2"])
})

Deno.test("link do WhatsApp usa o número único e a mensagem codificada", () => {
  assertEquals(STORE_WHATSAPP_NUMBER, "5519992732874")
  const catalogUrl = whatsappLink(CATALOG_WHATSAPP_MESSAGE)
  assertEquals(
    catalogUrl,
    "https://wa.me/5519992732874?text=Oi%2C%20vi%20o%20cat%C3%A1logo%20e%20queria%20tirar%20uma%20d%C3%BAvida",
  )
  assertEquals(
    productWhatsappMessage("Brinco argola"),
    "Oi, vi o Brinco argola no catálogo e queria tirar uma dúvida",
  )
  assertEquals(
    whatsappLink(productWhatsappMessage("Anel coração")),
    "https://wa.me/5519992732874?text=Oi%2C%20vi%20o%20Anel%20cora%C3%A7%C3%A3o%20no%20cat%C3%A1logo%20e%20queria%20tirar%20uma%20d%C3%BAvida",
  )
})

Deno.test("agrupa cores pelo sufixo e deixa código sem sufixo sozinho", () => {
  assertEquals(parseProductColor("AN651-O").suffix, "O")
  assertEquals(parseProductColor("an651-r").label, "Ródio")
  assertEquals(parseProductColor("BM1-AD").base, "BM1")
  assertEquals(parseProductColor("BM1-AD").suffix, "AD")
  assertEquals(parseProductColor("BM1-AD").label, "Aço dourado")
  assertEquals(parseProductColor("BM2194-A").suffix, "A")
  assertEquals(parseProductColor("BM2194-A").label, "Aço")
  assertEquals(parseProductColor("BM1786").suffix, null)
  assertEquals(parseProductColor("PM537-PRATA").suffix, null)

  const groups = groupProductsByColor([
    { code: "AN651-R", name: "Anel ródio", quantity: 1 },
    { code: "AN651-O", name: "Anel ouro", quantity: 0 },
    { code: "BM1786", name: "Brinco liso", quantity: 1 },
    { code: "FOO-AD", name: "Pulseira aço", quantity: 1 },
    { code: "FOO-O", name: "Pulseira ouro", quantity: 1 },
    { code: "BM2194-AD", name: "Brinco aço dourado", quantity: 1 },
    { code: "BM2194-A", name: "Brinco aço polido", quantity: 1 },
    { code: "PM592-X", name: "Bracelete outro", quantity: 1 },
    { code: "PM592-A", name: "Bracelete aço", quantity: 1 },
  ])

  const anel = groups.find((group) => group.base === "AN651" && group.variants.length === 2)
  assertEquals(anel.variants.map((variant) => variant.suffix), ["O", "R"])
  assertEquals(anel.variants.map((variant) => variant.label), ["Ouro", "Ródio"])

  const solo = groups.find((group) => group.variants.some((variant) => variant.product.code === "BM1786"))
  assertEquals(solo.variants.length, 1)
  assertEquals(solo.variants[0].suffix, null)

  const aco = groups.find((group) => group.base === "FOO")
  assertEquals(aco.variants.map((variant) => variant.label), ["Ouro", "Aço dourado"])

  const acoInox = groups.find((group) => group.variants.some((variant) => variant.product.code === "BM2194-A"))
  assertEquals(acoInox.variants.map((variant) => variant.suffix), ["A", "AD"])
  assertEquals(acoInox.variants.map((variant) => variant.label), ["Aço", "Aço dourado"])

  const outro = groups.find((group) => group.variants.some((variant) => variant.product.code === "PM592-X"))
  const acoSolo = groups.find((group) => group.variants.some((variant) => variant.product.code === "PM592-A"))
  assertEquals(outro.variants.length, 1)
  assertEquals(outro.variants[0].suffix, null)
  assertEquals(acoSolo.variants.length, 1)
  assertEquals(outro.key === acoSolo.key, false)
})

Deno.test("grupo com uma cor só e disponibilidade pela primeira cor em estoque", () => {
  const onlyGold = groupProductsByColor([{ code: "CH123-O", name: "Choker ouro", quantity: 1 }])
  assertEquals(onlyGold.length, 1)
  assertEquals(onlyGold[0].variants.length, 1)
  assertEquals(groupIsAvailable(onlyGold[0], inStock), true)

  const mixed = groupProductsByColor([
    { code: "BM145-R", name: "Brinco ródio", quantity: 2 },
    { code: "BM145-O", name: "Brinco ouro", quantity: 0 },
  ])
  assertEquals(groupIsAvailable(mixed[0], inStock), true)
  assertEquals(selectVariantByCode(mixed[0], inStock, null).product.code, "BM145-R")
  assertEquals(selectVariantByCode(mixed[0], inStock, "BM145-O").product.code, "BM145-O")

  const soldOut = groupProductsByColor([
    { code: "AN252-R", name: "Anel ródio", quantity: 0 },
    { code: "AN252-O", name: "Anel ouro", quantity: 0 },
  ])
  assertEquals(groupIsAvailable(soldOut[0], inStock), false)
  assertEquals(groupDisplayVariant(soldOut[0], inStock).product.code, "AN252-O")

  const viaTypes = groupProductsByColor([
    { code: "X-O", name: "Colar ouro", quantity: 0 },
    { code: "X-R", name: "Colar ródio", quantity: 0 },
  ])
  assertEquals(groupIsAvailable(viaTypes[0], (product) => product.code === "X-R"), true)
})

Deno.test("disponíveis e esgotadas respeitam filtro e busca do grupo", () => {
  const groups = groupProductsByColor([
    { code: "AN651-O", name: "Anel regulável ouro", quantity: 1 },
    { code: "AN651-R", name: "Anel regulável ródio", quantity: 1 },
    { code: "AN252-O", name: "Anel aparador ouro", quantity: 0 },
    { code: "AN252-R", name: "Anel aparador ródio", quantity: 0 },
    { code: "BM145-O", name: "Brinco cruz ouro", quantity: 1 },
    { code: "BM145-R", name: "Brinco cruz ródio", quantity: 0 },
    { code: "CO116-O", name: "Colar riviera ouro", quantity: 0 },
    { code: "CO116-R", name: "Colar riviera ródio", quantity: 0 },
  ])

  const all = partitionCatalogGroups(groups, { isAvailable: inStock })
  assertEquals(all.available.map((group) => group.base), ["AN651", "BM145"])
  assertEquals(all.soldOut.map((group) => group.base), ["AN252", "CO116"])

  const byOtherColor = partitionCatalogGroups(groups, { term: "an651-r", isAvailable: inStock })
  assertEquals(byOtherColor.available.map((group) => group.base), ["AN651"])
  assertEquals(byOtherColor.soldOut.length, 0)

  const aneis = partitionCatalogGroups(groups, { category: "Anel", isAvailable: inStock })
  assertEquals(aneis.available.map((group) => group.base), ["AN651"])
  assertEquals(aneis.soldOut.map((group) => group.base), ["AN252"])

  const soldSearch = partitionCatalogGroups(groups, { term: "aparador", category: "Anel", isAvailable: inStock })
  assertEquals(soldSearch.available.length, 0)
  assertEquals(soldSearch.soldOut.map((group) => group.base), ["AN252"])

  const none = partitionCatalogGroups(groups, { term: "não existe", category: "Anel", isAvailable: inStock })
  assertEquals(none.available.length, 0)
  assertEquals(none.soldOut.length, 0)
})

Deno.test("catalog doesProductMatchSearch", () => {
  assertEquals(doesProductMatchSearch({ name: "Colar", code: "C1" }, "col"), true)
})

Deno.test("sortProductsForCatalog: preço ascendente", () => {
  const sorted = sortProductsForCatalog(
    [{ name: "B", unit_price: 20 }, { name: "A", unit_price: 10 }],
    "price_asc",
  )
  assertEquals(sorted[0].unit_price, 10)
})

Deno.test("preço Pix é 5% sobre o valor final e ignora valor inválido", () => {
  assertEquals(pixPrice(100), 95)
  assertEquals(pixPrice(10), 9.5)
  assertEquals(pixPrice(0), 0)
  assertEquals(pixPrice(-4), 0)
  assertEquals(pixPrice(Number.NaN), 0)

  const promo = offerFromProduct({ unit_price: 100, is_on_sale: true, discount_percent: 10 })
  assertEquals(promo.listPrice, 100)
  assertEquals(promo.finalPrice, 90)
  assertEquals(promo.onSale, true)
  assertEquals(promo.percentOff, 10)
  assertEquals(promo.pixPrice, 85.5)

  const cheio = offerFromProduct({ unit_price: 80, is_on_sale: false, discount_percent: 20 })
  assertEquals(cheio.onSale, false)
  assertEquals(cheio.finalPrice, 80)
  assertEquals(cheio.percentOff, 0)
  assertEquals(cheio.pixPrice, 76)
})

Deno.test("de/por só aparece com promoção ativa e o Pix incide sobre o preço já com desconto", () => {
  const semDesconto = offerFromProduct({ unit_price: 50, is_on_sale: true, discount_percent: 0 })
  assertEquals(semDesconto.onSale, false)
  assertEquals(semDesconto.finalPrice, 50)
  assertEquals(semDesconto.pixPrice, 47.5)
})

Deno.test("total Pix da cesta usa o total, não a soma dos Pix arredondados", () => {
  const totals = cartMoneyTotals([
    { unit_price: 10.1, quantity: 1 },
    { unit_price: 10.1, quantity: 1 },
  ])
  assertEquals(totals.total, 20.2)
  assertEquals(totals.pixTotal, 19.19)
  assertEquals(pixPrice(10.1) + pixPrice(10.1), 19.2)
})

Deno.test("ordenação usa o preço final da promoção e novidades por created_at", () => {
  const byPrice = sortProductsForCatalog(
    [
      { name: "Cheio", unit_price: 95 },
      { name: "Promo", unit_price: 100, is_on_sale: true, discount_percent: 10 },
    ],
    "price_asc",
  )
  assertEquals(byPrice.map((item) => item.name), ["Promo", "Cheio"])

  const byNews = sortProductsForCatalog(
    [
      { name: "Antiga", unit_price: 10, created_at: "2026-01-01T00:00:00.000Z" },
      { name: "Nova", unit_price: 40, created_at: "2026-10-01T00:00:00.000Z" },
    ],
    "created_desc",
  )
  assertEquals(byNews.map((item) => item.name), ["Nova", "Antiga"])
})

Deno.test("filtros de preço, cor e só disponíveis mantêm esgotadas no fim", () => {
  const groups = groupProductsByColor([
    { code: "AN1-O", name: "Anel ouro", quantity: 1, unit_price: 100, categoria: "Anel" },
    { code: "AN1-A", name: "Anel aço", quantity: 0, unit_price: 90, categoria: "Anel" },
    { code: "BR1-R", name: "Brinco ródio", quantity: 1, unit_price: 40, categoria: "Brinco", is_on_sale: true, discount_percent: 50 },
    { code: "BR2-AD", name: "Brinco aço dourado", quantity: 1, unit_price: 30, categoria: "Brinco" },
    { code: "CO1-O", name: "Colar ouro", quantity: 0, unit_price: 20, categoria: "Colar" },
  ])

  assertEquals(parsePriceBound(""), null)
  assertEquals(parsePriceBound("1.234,50"), 1234.5)
  assertEquals(groupPassesFilters(groups[0], { minPrice: null, maxPrice: null }, inStock), true)

  const aco = filterAndPartitionCatalog(groups, { colorId: "aco" }, inStock)
  assertEquals(aco.available.map((group) => group.base), ["AN1"])
  assertEquals(aco.soldOut.length, 0)

  const dourado = filterAndPartitionCatalog(groups, { colorId: "dourado", maxPrice: 50 }, inStock)
  assertEquals(dourado.available.length, 0)
  assertEquals(dourado.soldOut.map((group) => group.base), ["CO1"])

  const soDisponiveis = filterAndPartitionCatalog(groups, { onlyAvailable: true }, inStock)
  assertEquals(soDisponiveis.soldOut.length, 0)
  assertEquals(soDisponiveis.available.map((group) => group.base), ["AN1", "BR1", "BR2"])

  const promocao = filterAndPartitionCatalog(groups, { onSaleOnly: true }, inStock)
  assertEquals(promocao.available.map((group) => group.base), ["BR1"])

  const precoFinal = sortGroupsForCatalog(
    filterAndPartitionCatalog(groups, { category: "Brinco" }, inStock).available,
    "price_asc",
    inStock,
  )
  assertEquals(precoFinal.map((group) => group.base), ["BR1", "BR2"])
})

Deno.test("deep link abre a cor disponível, cai na categoria se esgotar e guarda utm_source", () => {
  const groups = groupProductsByColor([
    { code: "BM145-O", name: "Brinco ouro", quantity: 0, categoria: "Brinco" },
    { code: "BM145-R", name: "Brinco ródio", quantity: 2, categoria: "Brinco" },
    { code: "AN252-O", name: "Anel ouro", quantity: 0, categoria: "Anel" },
    { code: "AN252-R", name: "Anel ródio", quantity: 0, categoria: "Pulseira" },
  ])

  const link = readCatalogLink("?categoria=anel&peca=bm145&utm_source=instagram&utm_medium=bio")
  assertEquals(link.categoria, "Anel")
  assertEquals(link.peca, "bm145")
  assertEquals(link.utmSource, "instagram")
  assertEquals(link.utmMedium, "bio")

  const aberta = resolvePieceLink(groups, link.peca, inStock)
  assertEquals(aberta.kind, "piece")
  assertEquals(aberta.variant.product.code, "BM145-R")
  assertEquals(
    buildCatalogLink({ peca: aberta.group.base, utmSource: link.utmSource, utmMedium: link.utmMedium }),
    "/catalog?peca=BM145&utm_source=instagram&utm_medium=bio",
  )

  const esgotada = resolvePieceLink(groups, "AN252", inStock)
  assertEquals(esgotada.kind, "soldout")
  assertEquals(esgotada.category, "Anel")
  assertEquals(
    buildCatalogLink({ categoria: esgotada.category, peca: "", utmSource: "instagram" }),
    "/catalog?categoria=Anel&utm_source=instagram",
  )

  assertEquals(resolvePieceLink(groups, "NAO-EXISTE", inStock).kind, "missing")
  assertEquals(readCatalogLink("?categoria=Joia").categoria, "Todos")
  assertEquals(buildCatalogLink({ categoria: "Todos" }), "/catalog")
})

Deno.test("peças relacionadas são da mesma categoria e os encaixes sem decisão ficam desligados", () => {
  const groups = groupProductsByColor([
    { code: "A1-O", name: "Anel um", quantity: 1, categoria: "Anel" },
    { code: "A2-O", name: "Anel dois", quantity: 0, categoria: "Anel" },
    { code: "A3-O", name: "Anel tres", quantity: 1, categoria: "Anel" },
    { code: "B1-O", name: "Brinco", quantity: 1, categoria: "Brinco" },
  ])
  const related = relatedGroups(groups, groups[0], inStock, 4)
  assertEquals(related.map((group) => group.base), ["A3", "A2"])
  assertEquals(showLowStockBadge({ quantity: 1 }), false)
  assertEquals(showNewBadge({ created_at: "2026-10-08T00:00:00.000Z" }, Date.parse("2026-10-09T00:00:00.000Z")), false)
})

Deno.test("cuidados vêm de uma constante e o aço ganha a linha extra", () => {
  assertEquals(
    PIECE_CARE.general,
    "Pra sua peça durar mais: tire antes do banho, da piscina, do mar e de academia. Passe perfume, creme e maquiagem antes de colocar. Guarde separada das outras peças, num saquinho ou caixinha, longe da umidade. Pra limpar, use só um pano macio e seco.",
  )
  assertEquals(
    PIECE_CARE.steel,
    "O aço é mais resistente à água, mas os cuidados acima mantêm o brilho por mais tempo.",
  )
  assertEquals(pieceCareText({ code: "BM1-O" }), PIECE_CARE.general)
  assertEquals(pieceCareText({ code: "BM1-R" }), PIECE_CARE.general)
  assertEquals(pieceCareText({ code: "BM1786" }), PIECE_CARE.general)
  assertEquals(pieceCareText({ code: "BM1-A" }), `${PIECE_CARE.general}\n${PIECE_CARE.steel}`)
  assertEquals(pieceCareText({ code: "BM1-AD" }), `${PIECE_CARE.general}\n${PIECE_CARE.steel}`)
})

Deno.test("mais vendidas ordena pelo total e soma as cores da mesma peça", () => {
  const groups = groupProductsByColor([
    { code: "A-O", name: "Anel", quantity: 1 },
    { code: "B-O", name: "Brinco ouro", quantity: 1 },
    { code: "B-A", name: "Brinco aço", quantity: 1 },
    { code: "C-O", name: "Colar", quantity: 1 },
  ])
  const totals = totalsByProductCode([
    { code: "b-o", total_sold: 2 },
    { code: "B-A", total_sold: 5 },
    { code: "A-O", total_sold: 3 },
    { code: "sem-total" },
    { code: "", total_sold: 9 },
  ])
  assertEquals(sortGroupsByBestsellers(groups, totals).map((group) => group.base), ["B", "A", "C"])

  const byBase = totalsByProductCode([{ code: "C", total_sold: 9 }])
  assertEquals(sortGroupsByBestsellers(groups, byBase).map((group) => group.base), ["C", "A", "B"])
})
