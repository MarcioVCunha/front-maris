import { assertEquals } from "jsr:@std/assert@1"
import {
  ADD_PRODUCT_CATEGORIES,
  buildAddProductPayload,
  formatAddProductErrorMessage,
  formatAddProductSuccessMessage,
  parseImageUrlLines,
  parseMoneyBRL,
  validateAddProductPayload,
} from "./adicionar-peca.logic.js"

Deno.test("parseImageUrlLines: quebra por vírgula e linha", () => {
  assertEquals(parseImageUrlLines("a,b\nc"), ["a", "b", "c"])
})

Deno.test("parseMoneyBRL: aceita formato BR", () => {
  assertEquals(parseMoneyBRL("89,90"), 89.9)
  assertEquals(parseMoneyBRL("1.234,56"), 1234.56)
  assertEquals(parseMoneyBRL("89.90"), 89.9)
  assertEquals(parseMoneyBRL("R$ 10,00"), 10)
})

Deno.test("validateAddProductPayload: exige código", () => {
  const payload = buildAddProductPayload({
    code: "",
    name: "Anel",
    unitPrice: 10,
    quantity: 1,
    imageUrlsRaw: "",
  })
  assertEquals(validateAddProductPayload(payload), "Informe o código da peça.")
})

Deno.test("validateAddProductPayload: aceita preço com vírgula", () => {
  const payload = buildAddProductPayload({
    code: "A1",
    name: "Anel",
    unitPrice: "89,90",
    quantity: 1,
    imageUrlsRaw: "",
  })
  assertEquals(validateAddProductPayload(payload), "")
  assertEquals(payload.unit_price, 89.9)
})

Deno.test("formatAddProductSuccessMessage: inclui código e nome", () => {
  assertEquals(
    formatAddProductSuccessMessage({ code: "A1", name: "Anel" }, {}),
    "Produto A1 (Anel) cadastrado com sucesso."
  )
})

Deno.test("categoria automática não entra no corpo do add-product", () => {
  const base = { code: "A1", name: "Tornozeleira fina", unitPrice: 10, quantity: 1, imageUrlsRaw: "" }
  for (const categoria of [undefined, null, "", "Automático (pelo nome)", "anel", "foo"]) {
    const payload = buildAddProductPayload({ ...base, categoria })
    assertEquals(Object.hasOwn(payload, "categoria"), false)
  }
})

Deno.test("categoria escolhida vai com o valor exato da lista", () => {
  assertEquals(ADD_PRODUCT_CATEGORIES, [
    "Brinco",
    "Colar",
    "Pulseira",
    "Choker",
    "Anel",
    "Pingente",
    "Conjunto",
    "Tornozeleira",
    "Piercing",
    "Outros",
  ])
  for (const categoria of ADD_PRODUCT_CATEGORIES) {
    const payload = buildAddProductPayload({
      code: "A1",
      name: "Peça",
      unitPrice: 10,
      quantity: 1,
      imageUrlsRaw: "",
      categoria,
    })
    assertEquals(payload.categoria, categoria)
  }
})

Deno.test("formatAddProductErrorMessage: usa data.error", () => {
  assertEquals(formatAddProductErrorMessage({ error: "Código duplicado" }, 400), "Código duplicado")
})
