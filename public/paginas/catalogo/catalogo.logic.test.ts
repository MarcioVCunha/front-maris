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
  LAST_UNIT_BADGE_ENABLED,
  LAST_UNIT_INITIAL_FIELD,
  LAST_UNIT_INITIAL_MIN,
  LAST_UNIT_QUANTITY,
  lastUnitBadgeMatches,
  NEW_DAYS,
  PIECE_CARE,
  pieceCareText,
  detectPieceMaterial,
  getPiecePhotoLabels,
  getCategorySpecifications,
  getMaterialCareGuide,
  EFFECTIVE_PRICE_FIELD,
  PIX_PRICE_FIELD,
  pixPrice,
  pixPriceFromSource,
  productCategory,
  productMatchesCategory,
  readCatalogLink,
  relatedGroups,
  resolvePieceLink,
  resolveProductCategory,
  productWhatsappMessage,
  selectVariantByCode,
  showLastUnitBadge,
  showNewBadge,
  sortGroupsByBestsellers,
  sortGroupsForCatalog,
  totalsByProductCode,
  sortProductsForCatalog,
  STORE_WHATSAPP_NUMBER,
  visibleCategories,
  whatsappLink,
  buildProductShareText,
  buildWhatsappShareLink,
  buildProductOgMetadata,
  updateOpenGraphTags,
  formatMoneyShare,
  COMPLEMENTARY_CATEGORIES,
  getComplementaryCategories,
  combinaGroups,
  renderCombinaComponentCard,
  getSearchSuggestions,
  COLOR_FILTERS,
  PRICE_RANGE_PRESETS,
  variantMatchesColor,
  getActiveFilterPills,
  countActiveFilters,
  buildCatalogQuery,
  doesGroupMatchCollection,
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
  assertEquals(doesProductMatchSearch({ name: "Anel Solitário", code: "A1" }, "solitario"), true)
  assertEquals(doesProductMatchSearch({ name: "Brinco Pérola", code: "BM-1" }, "perola"), true)
  assertEquals(doesProductMatchSearch({ name: "Brinco Ouro", code: "BM-O" }, "bm-o"), true)
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
  assertEquals(pixPrice(10.1), 9.6)
  assertEquals(pixPrice(20.2), 19.19)
  assertEquals(pixPrice(0), 0)
  assertEquals(pixPrice(-4), 0)
  assertEquals(pixPrice(null), 0)
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

  const localVinte = offerFromProduct({ unit_price: 100, is_on_sale: true, discount_percent: 20 })
  assertEquals(localVinte.finalPrice, 80)
  assertEquals(localVinte.percentOff, 20)
  assertEquals(localVinte.pixPrice, 76)
  assertEquals(cartMoneyTotals([{ unit_price: localVinte.finalPrice, quantity: 1 }]).pixTotal, 76)

  const vinte = offerFromProduct({
    unit_price: 100,
    is_on_sale: true,
    discount_percent: 20,
    preco_efetivo: 79.9,
    preco_pix: 75.91
  })
  assertEquals(vinte.finalPrice, 79.9)
  assertEquals(vinte.percentOff, 20)
  assertEquals(vinte.pixPrice, 75.91)
  assertEquals(cartMoneyTotals([{ unit_price: vinte.finalPrice, quantity: 1 }]).pixTotal, 75.91)
  assertEquals(PIX_PRICE_FIELD, "preco_pix")
  assertEquals(EFFECTIVE_PRICE_FIELD, "preco_efetivo")
})

Deno.test("preco_efetivo preenchido entra no de/por, na ordenação e no Pix; ausente usa o cálculo local", () => {
  const promo = { unit_price: 39.8, is_on_sale: true, discount_percent: 12.5, name: "Pulseira" }
  const local = offerFromProduct(promo)
  assertEquals(local.listPrice, 39.8)
  assertEquals(local.onSale, true)
  assertEquals(local.percentOff, 12.5)
  assertEquals(local.finalPrice, 34.82)
  assertEquals(local.pixPrice, pixPrice(34.82))

  const fromBank = offerFromProduct({ ...promo, preco_efetivo: 34.83 })
  assertEquals(fromBank.listPrice, 39.8)
  assertEquals(fromBank.finalPrice, 34.83)
  assertEquals(fromBank.onSale, true)
  assertEquals(fromBank.pixPrice, pixPrice(34.83))
  assertEquals(offerFromProduct({ ...promo, preco_efetivo: "34.83" }).finalPrice, 34.83)
  assertEquals(offerFromProduct({ ...promo, preco_efetivo: null }).finalPrice, 34.82)
  assertEquals(offerFromProduct({ ...promo, preco_efetivo: "" }).finalPrice, 34.82)
  assertEquals(offerFromProduct({ ...promo, preco_efetivo: 34.83, preco_pix: 33.09 }).pixPrice, 33.09)

  const sorted = sortProductsForCatalog(
    [
      { name: "Local", unit_price: 40 },
      { name: "Banco", unit_price: 50, is_on_sale: true, discount_percent: 20, preco_efetivo: 30 },
    ],
    "price_asc",
  )
  assertEquals(sorted.map((item) => item.name), ["Banco", "Local"])
})

Deno.test("preco_pix preenchido entra no catálogo e valor ausente ou nulo usa o cálculo local", () => {
  assertEquals(offerFromProduct({ unit_price: 100, preco_pix: 70 }).pixPrice, 70)
  assertEquals(offerFromProduct({ unit_price: 100, preco_pix: "79.80" }).pixPrice, 79.8)
  assertEquals(offerFromProduct({ unit_price: 100 }).pixPrice, 95)
  assertEquals(offerFromProduct({ unit_price: 100, preco_pix: null }).pixPrice, 95)
  assertEquals(pixPriceFromSource({ preco_pix: "" }, 100), 95)
})

Deno.test("de/por só aparece com promoção ativa e o Pix incide sobre o preço já com desconto", () => {
  const semDesconto = offerFromProduct({ unit_price: 50, is_on_sale: true, discount_percent: 0 })
  assertEquals(semDesconto.onSale, false)
  assertEquals(semDesconto.finalPrice, 50)
  assertEquals(semDesconto.pixPrice, 47.5)

  // Promoção ativa pela tabela promotions (sem is_on_sale legado)
  const promoBanco = offerFromProduct({ unit_price: 100, is_on_sale: false, preco_efetivo: 80 })
  assertEquals(promoBanco.onSale, true)
  assertEquals(promoBanco.finalPrice, 80)
  assertEquals(promoBanco.percentOff, 20)
  assertEquals(promoBanco.pixPrice, 76)
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

Deno.test("peças relacionadas são da mesma categoria", () => {
  const groups = groupProductsByColor([
    { code: "A1-O", name: "Anel um", quantity: 1, categoria: "Anel" },
    { code: "A2-O", name: "Anel dois", quantity: 0, categoria: "Anel" },
    { code: "A3-O", name: "Anel tres", quantity: 1, categoria: "Anel" },
    { code: "B1-O", name: "Brinco", quantity: 1, categoria: "Brinco" },
  ])
  const related = relatedGroups(groups, groups[0], inStock, 4)
  assertEquals(related.map((group) => group.base), ["A3", "A2"])
})

Deno.test("última unidade exige 1 no estoque e 3 ou mais no cadastro, e fica desligada", () => {
  assertEquals(LAST_UNIT_BADGE_ENABLED, false)
  assertEquals(LAST_UNIT_QUANTITY, 1)
  assertEquals(LAST_UNIT_INITIAL_MIN, 3)
  assertEquals(LAST_UNIT_INITIAL_FIELD, "")
  assertEquals(lastUnitBadgeMatches(1, 3), true)
  assertEquals(lastUnitBadgeMatches(1, 8), true)
  assertEquals(lastUnitBadgeMatches(1, 2), false)
  assertEquals(lastUnitBadgeMatches(2, 5), false)
  assertEquals(lastUnitBadgeMatches(0, 5), false)
  assertEquals(lastUnitBadgeMatches(1, null), false)
  assertEquals(showLastUnitBadge({ quantity: 1, quantidade_inicial: 5 }), false)
})

Deno.test("novo dura 15 dias depois do created_at", () => {
  assertEquals(NEW_DAYS, 15)
  const now = Date.parse("2026-10-09T12:00:00.000Z")
  const day = 24 * 60 * 60 * 1000
  assertEquals(showNewBadge({ created_at: new Date(now - 15 * day).toISOString() }, now), true)
  assertEquals(showNewBadge({ created_at: new Date(now - 15 * day - 1).toISOString() }, now), false)
  assertEquals(showNewBadge({ created_at: "2026-10-08T00:00:00.000Z" }, now), true)
  assertEquals(showNewBadge({ created_at: "" }, now), false)
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
    { code: "b-o", total_vendido: 2 },
    { code: "B-A", total_vendido: 5, total_sold: 100 },
    { code: "A-O", total_vendido: 3 },
    { code: "sem-total" },
    { code: "", total_vendido: 9 },
  ])
  assertEquals(sortGroupsByBestsellers(groups, totals).map((group) => group.base), ["B", "A", "C"])

  const byBase = totalsByProductCode([{ code: "C", total_vendido: 9 }])
  assertEquals(sortGroupsByBestsellers(groups, byBase).map((group) => group.base), ["C", "A", "B"])

  const tied = groupProductsByColor([
    { code: "X-O", name: "X ouro", quantity: 1, created_at: "2026-01-01T00:00:00.000Z" },
    { code: "X-R", name: "X ródio", quantity: 1, created_at: "2026-12-01T00:00:00.000Z" },
    { code: "Y-O", name: "Y", quantity: 1, created_at: "2026-06-01T00:00:00.000Z" },
  ])
  const tiedTotals = totalsByProductCode([
    { code: "X-O", total_vendido: 1 },
    { code: "X-R", total_vendido: 1 },
    { code: "Y-O", total_vendido: 2 },
  ])
  assertEquals(sortGroupsByBestsellers(tied, tiedTotals).map((group) => group.base), ["X", "Y"])
  assertEquals(totalsByProductCode([]).size, 0)
  assertEquals(totalsByProductCode(null).size, 0)
})

Deno.test("buildProductShareText monta texto com nome, preços em reais e link", () => {
  const product = {
    code: "BM123",
    name: "Brinco Coração",
    unit_price: 100,
    preco_efetivo: 80,
    preco_pix: 76,
  }

  const text = buildProductShareText(product, { origin: "https://maris.test" })
  assertEquals(text.includes("Brinco Coração"), true)
  assertEquals(text.includes("80,00"), true)
  assertEquals(text.includes("76,00"), true)
  assertEquals(text.includes("https://maris.test/catalog?peca=BM123"), true)

  const fallbackText = buildProductShareText(product)
  assertEquals(fallbackText.includes("https://lojamaris.com.br/catalog?peca=BM123"), true)

  assertEquals(buildProductShareText(null), "")
})

Deno.test("buildWhatsappShareLink gera URL de compartilhamento", () => {
  const url = buildWhatsappShareLink("Olha esse brinco lindo: https://maris.test")
  assertEquals(url.startsWith("https://api.whatsapp.com/send?text="), true)
  assertEquals(url.includes("Olha%20esse%20brinco"), true)
})

Deno.test("buildProductOgMetadata gera metatags para produto ou fallback do catálogo", () => {
  const product = {
    code: "CL456",
    name: "Colar Ponto de Luz",
    unit_price: 50,
    image_url: "https://img.test/colar.jpg",
  }

  const productMeta = buildProductOgMetadata(product, { origin: "https://maris.test" })
  assertEquals(productMeta.title, "Colar Ponto de Luz — Maris Semijoias")
  assertEquals(productMeta.description.includes("Colar Ponto de Luz"), true)
  assertEquals(productMeta.description.includes("50,00"), true)
  assertEquals(productMeta.image, "https://img.test/colar.jpg")
  assertEquals(productMeta.url, "https://maris.test/catalog?peca=CL456")

  const catalogMeta = buildProductOgMetadata(null, { origin: "https://maris.test" })
  assertEquals(catalogMeta.title, "Catálogo — Maris Semijoias")
  assertEquals(catalogMeta.url, "https://maris.test/catalog")

  const fallbackMeta = buildProductOgMetadata(null)
  assertEquals(fallbackMeta.url, "https://lojamaris.com.br/catalog")
})

Deno.test("updateOpenGraphTags atualiza atributos no DOM", () => {
  const store: Record<string, string> = {}
  const mockDoc = {
    title: "",
    querySelector(selector: string) {
      return {
        setAttribute(attr: string, val: string) {
          store[`${selector}[${attr}]`] = val
        }
      }
    }
  }

  updateOpenGraphTags({
    title: "Anel Solitário — Maris",
    description: "Anel lindo por R$ 39,90",
    image: "https://img.test/anel.jpg",
    url: "https://maris.test/catalog?peca=AN1"
  }, mockDoc as unknown as Document)

  assertEquals(mockDoc.title, "Anel Solitário — Maris")
  assertEquals(store['meta[property="og:title"][content]'], "Anel Solitário — Maris")
  assertEquals(store['meta[property="og:description"][content]'], "Anel lindo por R$ 39,90")
  assertEquals(store['meta[property="og:image"][content]'], "https://img.test/anel.jpg")
  assertEquals(store['meta[property="og:url"][content]'], "https://maris.test/catalog?peca=AN1")
})

Deno.test("getComplementaryCategories retorna categorias certas para cross-sell", () => {
  assertEquals(getComplementaryCategories("Anel"), ["Brinco", "Colar", "Pulseira"])
  assertEquals(getComplementaryCategories("Brinco"), ["Colar", "Anel", "Pulseira"])
  assertEquals(getComplementaryCategories("Conjuntos"), ["Anel", "Pulseira", "Brinco", "Colar"])
  assertEquals(getComplementaryCategories("Categoria Desconhecida"), ["Brinco", "Colar", "Anel"])
})

Deno.test("combinaGroups filtra categorias complementares, prioriza estoque e mesma cor", () => {
  const groups = groupProductsByColor([
    { code: "A1-O", name: "Anel Ouro", quantity: 1, categoria: "Anel" },
    { code: "B1-O", name: "Brinco Ouro", quantity: 1, categoria: "Brinco" },
    { code: "B2-R", name: "Brinco Ródio", quantity: 1, categoria: "Brinco" },
    { code: "C1-O", name: "Colar Ouro", quantity: 0, categoria: "Colar" },
    { code: "A2-O", name: "Anel Outro", quantity: 1, categoria: "Anel" }, // mesma categoria do alvo, deve ser ignorado
  ])

  const target = groups.find((g) => g.base === "A1")
  const suggestions = combinaGroups(groups, target, inStock, 4)

  // Deve excluir o próprio A1 e o A2 (mesma categoria)
  assertEquals(suggestions.some((g) => g.base === "A1"), false)
  assertEquals(suggestions.some((g) => g.base === "A2"), false)

  // Em estoque vem antes de esgotado; e mesma cor (Ouro) vem antes de cor diferente (Ródio)
  // B1-O (estoque 1, ouro match) > B2-R (estoque 1, rodio) > C1-O (esgotado)
  assertEquals(suggestions.map((g) => g.base), ["B1", "B2", "C1"])
})

Deno.test("renderCombinaComponentCard renderiza card com dados, preços e botões corretos", () => {
  const componentAvailable = {
    id: 101,
    name: "Colar do Conjunto",
    quantity: 2,
    unit_price: 100,
  }

  const htmlAvail = renderCombinaComponentCard(componentAvailable, {
    effectivePrice: (c) => c.unit_price,
    hasPromo: () => false,
    pixPrice: (p) => p * 0.95,
    formatMoneyBRL: (v) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  })

  assertEquals(htmlAvail.includes("Colar do Conjunto"), true)
  assertEquals(htmlAvail.includes("R$ 100,00"), true)
  assertEquals(htmlAvail.includes("R$ 95,00 no Pix"), true)
  assertEquals(htmlAvail.includes("Disponível"), true)
  assertEquals(htmlAvail.includes('data-add-component="101"'), true)
  assertEquals(htmlAvail.includes("+ Adicionar à cesta"), true)

  const componentSoldOut = {
    id: 102,
    name: "Brinco do Conjunto",
    quantity: 0,
    unit_price: 60,
  }

  const htmlSoldOut = renderCombinaComponentCard(componentSoldOut, {
    effectivePrice: (c) => 50,
    hasPromo: () => true,
    pixPrice: (p) => 47.5,
    formatMoneyBRL: (v) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  })

  assertEquals(htmlSoldOut.includes("Brinco do Conjunto"), true)
  assertEquals(htmlSoldOut.includes("sold-out"), true)
  assertEquals(htmlSoldOut.includes("PROMOÇÃO"), true)
  assertEquals(htmlSoldOut.includes("Esgotado"), true)
  assertEquals(htmlSoldOut.includes('data-waitlist-component="102"'), true)
  assertEquals(htmlSoldOut.includes("Lista de espera"), true)
})

Deno.test("getSearchSuggestions retorna sugestões rápidas e busca inteligente", () => {
  const groups = groupProductsByColor([
    { code: "A1-O", name: "Anel Solitário", quantity: 1, categoria: "Anel" },
    { code: "B1-O", name: "Brinco Pérola", quantity: 1, categoria: "Brinco" },
    { code: "C1-O", name: "Colar Coração", quantity: 1, categoria: "Colar" },
  ])

  // Busca vazia: retorna atalhos padrão
  const empty = getSearchSuggestions(groups, "", 5)
  assertEquals(empty.length, 5)
  assertEquals(empty[0].text, "Novidades")
  assertEquals(empty[1].text, "Promoções")

  // Busca por categoria
  const catSearch = getSearchSuggestions(groups, "ane", 4)
  assertEquals(catSearch.some((s) => s.text === "Anéis" && s.kind === "category"), true)

  // Busca por nome de peça (sem acento contra peça com acento)
  const pieceSearch = getSearchSuggestions(groups, "perola", 4)
  assertEquals(pieceSearch.some((s) => s.text === "Brinco Pérola" && s.kind === "product"), true)

  // Busca por código
  const codeSearch = getSearchSuggestions(groups, "c1", 4)
  assertEquals(codeSearch.some((s) => s.text === "Colar Coração" && s.kind === "product"), true)
})

Deno.test("detectPieceMaterial identifica ouro, ródio, aço e aço dourado", () => {
  assertEquals(detectPieceMaterial({ code: "BM123-O", name: "Colar" }).id, "ouro")
  assertEquals(detectPieceMaterial({ code: "BM123-R", name: "Colar" }).id, "rodio")
  assertEquals(detectPieceMaterial({ code: "BM123-A", name: "Pulseira Aço" }).id, "aco")
  assertEquals(detectPieceMaterial({ code: "BM123-AD", name: "Pulseira Dourada" }).id, "aco_dourado")
  assertEquals(detectPieceMaterial({ code: "BM999", name: "Anel Folheado a Ouro" }).id, "ouro")
  assertEquals(detectPieceMaterial({ code: "BM888", name: "Anel em Ródio" }).id, "rodio")
})

Deno.test("getPiecePhotoLabels classifica fotos por posição ou nome", () => {
  const urls = [
    "https://img.test/front.webp",
    "https://img.test/look-usando.webp",
    "https://img.test/macro-detalhe.webp",
    "https://img.test/outro.webp",
  ]
  const labels = getPiecePhotoLabels(urls)
  assertEquals(labels[0].label, "Principal")
  assertEquals(labels[1].label, "No corpo / Usando")
  assertEquals(labels[2].label, "Detalhes da peça")
  assertEquals(labels[3].label, "Foto 4")
})

Deno.test("getCategorySpecifications retorna especificações da categoria", () => {
  const colar = getCategorySpecifications("Colar")
  assertEquals(colar.categoria, "Colar")
  assertEquals(colar.comprimento.includes("40 cm a 45 cm"), true)

  const brinco = getCategorySpecifications("Brinco")
  assertEquals(brinco.categoria, "Brinco")
  assertEquals(brinco.comprimento.includes("leve"), true)

  const fallback = getCategorySpecifications("Desconhecido")
  assertEquals(fallback.categoria, "Semijoia")
})

Deno.test("getMaterialCareGuide gera guia completo e adapta orientações de água para o aço", () => {
  const goldGuide = getMaterialCareGuide({ code: "AN1-O" })
  assertEquals(goldGuide.material.id, "ouro")
  assertEquals(goldGuide.cards.length, 4)
  const waterCardGold = goldGuide.cards.find((c) => c.icon === "water")
  assertEquals(waterCardGold?.text.includes("Retire antes do banho"), true)

  const steelGuide = getMaterialCareGuide({ code: "PU1-A" })
  assertEquals(steelGuide.material.isSteel, true)
  const waterCardSteel = steelGuide.cards.find((c) => c.icon === "water")
  assertEquals(waterCardSteel?.text.includes("resiste à água doce"), true)
})

Deno.test("variantMatchesColor identifica banho pelo sufixo ou pelo nome quando não há hífen", () => {
  const douradoFilter = COLOR_FILTERS.find((c) => c.id === "dourado")
  const rodioFilter = COLOR_FILTERS.find((c) => c.id === "rodio")
  const acoFilter = COLOR_FILTERS.find((c) => c.id === "aco")
  const acoDouradoFilter = COLOR_FILTERS.find((c) => c.id === "aco-dourado")

  // Com sufixo
  assertEquals(variantMatchesColor({ suffix: "O", product: { code: "BM1-O" } }, douradoFilter), true)
  assertEquals(variantMatchesColor({ suffix: "R", product: { code: "BM1-R" } }, rodioFilter), true)
  assertEquals(variantMatchesColor({ suffix: "A", product: { code: "BM1-A" } }, acoFilter), true)
  assertEquals(variantMatchesColor({ suffix: "AD", product: { code: "BM1-AD" } }, acoDouradoFilter), true)

  // Sem sufixo (fallback inteligente pelo nome/material)
  const pecaSemHifenOuro = { suffix: null, product: { code: "BOX570", name: "Colar São Bento banhado a ouro18k" } }
  assertEquals(variantMatchesColor(pecaSemHifenOuro, douradoFilter), true)
  assertEquals(variantMatchesColor(pecaSemHifenOuro, rodioFilter), false)

  const pecaSemHifenAco = { suffix: null, product: { code: "BOX16", name: "Bracelete prego aço inox" } }
  assertEquals(variantMatchesColor(pecaSemHifenAco, acoFilter), true)
  assertEquals(variantMatchesColor(pecaSemHifenAco, douradoFilter), false)
})

Deno.test("sortProductsForCatalog suporta discount_desc e name_desc", () => {
  const products = [
    { name: "Brinco B", unit_price: 100, preco_efetivo: 90 }, // 10%
    { name: "Anel A", unit_price: 100, preco_efetivo: 70 },   // 30%
    { name: "Colar C", unit_price: 100, preco_efetivo: 80 },  // 20%
  ]

  const byDiscount = sortProductsForCatalog(products, "discount_desc")
  assertEquals(byDiscount.map((p) => p.name), ["Anel A", "Colar C", "Brinco B"])

  const byNameDesc = sortProductsForCatalog(products, "name_desc")
  assertEquals(byNameDesc.map((p) => p.name), ["Colar C", "Brinco B", "Anel A"])
})

Deno.test("getActiveFilterPills e countActiveFilters geram os pills corretos", () => {
  const filtersEmpty = { category: "Todos", colorId: "", minPrice: null, maxPrice: null, onSaleOnly: false, onlyAvailable: false }
  assertEquals(countActiveFilters(filtersEmpty), 0)
  assertEquals(getActiveFilterPills(filtersEmpty).length, 0)

  const filtersFull = {
    category: "Colar",
    colorId: "dourado",
    minPrice: 50,
    maxPrice: 150,
    onSaleOnly: true,
    onlyAvailable: true,
    term: "argola",
  }
  assertEquals(countActiveFilters(filtersFull), 5) // category, color, price, onSale, onlyAvailable (term não entra no badge do botão)
  const pills = getActiveFilterPills(filtersFull)
  assertEquals(pills.length, 6) // inclui a busca
  assertEquals(pills.some((p) => p.type === "category" && p.label.includes("Colar")), true)
  assertEquals(pills.some((p) => p.type === "color" && p.label.includes("Dourado")), true)
  assertEquals(pills.some((p) => p.type === "price" && p.label.includes("R$ 50 a R$ 150")), true)
  assertEquals(pills.some((p) => p.type === "onSale"), true)
  assertEquals(pills.some((p) => p.type === "onlyAvailable"), true)
  assertEquals(pills.some((p) => p.type === "term"), true)
})

Deno.test("readCatalogLink e buildCatalogQuery sincronizam filtros com a URL", () => {
  const query = buildCatalogQuery({
    categoria: "Brinco",
    cor: "rodio",
    ordem: "price_asc",
    onSaleOnly: true,
    onlyAvailable: true,
    minPrice: 40,
    maxPrice: 120,
    busca: "pérola",
  })

  assertEquals(query.includes("categoria=Brinco"), true)
  assertEquals(query.includes("cor=rodio"), true)
  assertEquals(query.includes("ordem=price_asc"), true)
  assertEquals(query.includes("promocao=1"), true)
  assertEquals(query.includes("disponivel=1"), true)
  assertEquals(query.includes("preco_min=40"), true)
  assertEquals(query.includes("preco_max=120"), true)
  assertEquals(query.includes("busca=p%C3%A9rola"), true)

  const parsed = readCatalogLink(query)
  assertEquals(parsed.categoria, "Brinco")
  assertEquals(parsed.cor, "rodio")
  assertEquals(parsed.ordem, "price_asc")
  assertEquals(parsed.onSaleOnly, true)
  assertEquals(parsed.onlyAvailable, true)
  assertEquals(parsed.minPrice, 40)
  assertEquals(parsed.maxPrice, 120)
  assertEquals(parsed.busca, "pérola")
})

Deno.test("groupPassesFilters filtra por banho, promoção e faixa de preço combinados", () => {
  const group = {
    key: "color:ANEL",
    base: "ANEL",
    variants: [
      {
        suffix: "O",
        product: { code: "ANEL-O", name: "Anel Ouro", unit_price: 100, preco_efetivo: 80, quantity: 2 },
      },
      {
        suffix: "R",
        product: { code: "ANEL-R", name: "Anel Ródio", unit_price: 100, preco_efetivo: 100, quantity: 1 },
      },
    ],
  }

  // Filtrando cor dourada + em promoção + preço até 90
  const passesDouradoPromo = groupPassesFilters(
    group,
    { category: "Todos", colorId: "dourado", onSaleOnly: true, maxPrice: 90 },
    inStock,
  )
  assertEquals(passesDouradoPromo, true)

  // Filtrando cor ródio + em promoção -> Ródio custa 100 e não está em promoção
  const passesRodioPromo = groupPassesFilters(
    group,
    { category: "Todos", colorId: "rodio", onSaleOnly: true },
    inStock,
  )
  assertEquals(passesRodioPromo, false)

  // Filtrando preço mínimo 90 -> Dourado (80) não atende
  const passesMinPrice = groupPassesFilters(
    group,
    { category: "Todos", colorId: "dourado", minPrice: 90 },
    inStock,
  )
  assertEquals(passesMinPrice, false)
})

Deno.test("doesGroupMatchCollection e filtros de coleções temáticas", () => {
  const group = {
    key: "color:COL1",
    base: "COL1",
    variants: [
      {
        suffix: "O",
        product: { code: "COL1-O", name: "Colar Mãe Ouro", unit_price: 60, preco_efetivo: 45, quantity: 2 },
      },
    ],
  }

  // Coleção por teto de preço (ex: "Presentes até R$ 50")
  const promoAte50 = {
    id: 1,
    name: "Presentes até R$ 50",
    slug: "presentes-ate-50",
    max_price: 50,
    product_codes: [],
  }
  assertEquals(doesGroupMatchCollection(group, promoAte50, inStock), true)

  const promoAte40 = {
    id: 2,
    name: "Presentes até R$ 40",
    slug: "presentes-ate-40",
    max_price: 40,
    product_codes: [],
  }
  assertEquals(doesGroupMatchCollection(group, promoAte40, inStock), false)

  // Coleção por códigos fixos
  const colecaoMaes = {
    id: 3,
    name: "Dia das Mães",
    slug: "dia-das-maes",
    max_price: null,
    product_codes: ["COL1", "BR99"],
  }
  assertEquals(doesGroupMatchCollection(group, colecaoMaes, inStock), true)

  const colecaoNatal = {
    id: 4,
    name: "Natal",
    slug: "natal",
    max_price: null,
    product_codes: ["OUTRO"],
  }
  assertEquals(doesGroupMatchCollection(group, colecaoNatal, inStock), false)

  // Sincronização de URL
  const query = buildCatalogQuery({
    colecao: "dia-das-maes",
  })
  assertEquals(query.includes("colecao=dia-das-maes"), true)

  const parsed = readCatalogLink(query)
  assertEquals(parsed.colecao, "dia-das-maes")

  // Pills e contagem de filtros
  const pills = getActiveFilterPills({ collection: colecaoMaes })
  assertEquals(pills.length, 1)
  assertEquals(pills[0].type, "collection")
  assertEquals(pills[0].label, "Coleção: Dia das Mães")
  assertEquals(countActiveFilters({ collection: colecaoMaes }), 1)

  // Integração em groupPassesFilters
  assertEquals(groupPassesFilters(group, { collection: colecaoMaes }, inStock), true)
  assertEquals(groupPassesFilters(group, { collection: colecaoNatal }, inStock), false)
})

Deno.test("filtro de favoritos no catálogo: URL, pills e groupPassesFilters", () => {
  const group1 = {
    key: "color:AN1",
    base: "AN1",
    variants: [{ suffix: "O", product: { code: "AN1-O", name: "Anel", unit_price: 100, quantity: 1 } }],
  }
  const group2 = {
    key: "color:BR1",
    base: "BR1",
    variants: [{ suffix: "R", product: { code: "BR1-R", name: "Brinco", unit_price: 50, quantity: 1 } }],
  }

  // Sincronização de URL
  const query = buildCatalogQuery({ favoritos: true })
  assertEquals(query.includes("favoritos=1"), true)
  const parsed = readCatalogLink(query)
  assertEquals(parsed.favoritos, true)

  // Pills e contagem de filtros
  const pills = getActiveFilterPills({ favoritos: true })
  assertEquals(pills.some((p) => p.type === "favoritos" && p.label === "Favoritos"), true)
  assertEquals(countActiveFilters({ favoritos: true }), 1)

  // Filtragem de grupos com base na lista de favoritos
  const favList = ["AN1-O"]
  assertEquals(groupPassesFilters(group1, { favoritos: true, favoritesList: favList }, inStock), true)
  assertEquals(groupPassesFilters(group2, { favoritos: true, favoritesList: favList }, inStock), false)
  assertEquals(groupPassesFilters(group2, { favoritos: false, favoritesList: favList }, inStock), true)
})




