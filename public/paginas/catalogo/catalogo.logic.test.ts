import { assertEquals } from "jsr:@std/assert@1"
import {
  CATALOG_WHATSAPP_MESSAGE,
  doesProductMatchSearch,
  productCategory,
  productMatchesCategory,
  productWhatsappMessage,
  sortProductsForCatalog,
  STORE_WHATSAPP_NUMBER,
  visibleCategories,
  whatsappLink,
} from "./catalogo.logic.js"

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
