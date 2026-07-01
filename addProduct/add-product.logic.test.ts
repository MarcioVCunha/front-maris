import { assertEquals } from "jsr:@std/assert@1"
import {
  buildAddProductPayload,
  parseImageUrlLines,
  validateAddProductPayload,
} from "./add-product.logic.js"

Deno.test("parseImageUrlLines: quebra por vírgula e linha", () => {
  assertEquals(parseImageUrlLines("a,b\nc"), ["a", "b", "c"])
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
