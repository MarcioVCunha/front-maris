import { assertEquals } from "jsr:@std/assert@1"
import {
  CATALOG_WHATSAPP_MESSAGE,
  doesProductMatchSearch,
  groupDisplayVariant,
  groupIsAvailable,
  groupProductsByColor,
  parseProductColor,
  partitionCatalogGroups,
  productCategory,
  productMatchesCategory,
  productWhatsappMessage,
  selectVariantByCode,
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
  assertEquals(parseProductColor("BM1-AD").label, "Aço dourado")
  assertEquals(parseProductColor("BM2194-A").suffix, null)
  assertEquals(parseProductColor("BM1786").suffix, null)

  const groups = groupProductsByColor([
    { code: "AN651-R", name: "Anel ródio", quantity: 1 },
    { code: "AN651-O", name: "Anel ouro", quantity: 0 },
    { code: "BM1786", name: "Brinco liso", quantity: 1 },
    { code: "FOO-AD", name: "Pulseira aço", quantity: 1 },
    { code: "FOO-O", name: "Pulseira ouro", quantity: 1 },
    { code: "BM2194-A", name: "Brinco aço polido", quantity: 1 },
    { code: "BM2194-AD", name: "Brinco aço dourado", quantity: 1 },
  ])

  const anel = groups.find((group) => group.base === "AN651" && group.variants.length === 2)
  assertEquals(anel.variants.map((variant) => variant.suffix), ["O", "R"])
  assertEquals(anel.variants.map((variant) => variant.label), ["Ouro", "Ródio"])

  const solo = groups.find((group) => group.variants.some((variant) => variant.product.code === "BM1786"))
  assertEquals(solo.variants.length, 1)
  assertEquals(solo.variants[0].suffix, null)

  const aco = groups.find((group) => group.base === "FOO")
  assertEquals(aco.variants.map((variant) => variant.label), ["Ouro", "Aço dourado"])

  const polido = groups.find((group) => group.variants.some((variant) => variant.product.code === "BM2194-A"))
  const dourado = groups.find((group) => group.variants.some((variant) => variant.product.code === "BM2194-AD"))
  assertEquals(polido.variants.length, 1)
  assertEquals(dourado.variants.length, 1)
  assertEquals(polido.key === dourado.key, false)
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
