import { assertEquals } from "jsr:@std/assert@1"
import {
  formatImportErrorMessage,
  formatImportSuccessMessage,
  parseImportJsonText,
} from "./import.logic.js"

Deno.test("parseImportJsonText: parseia array", () => {
  assertEquals(parseImportJsonText('[{"codigo":"A1"}]'), [{ codigo: "A1" }])
})

Deno.test("formatImportSuccessMessage: conta criados e atualizados", () => {
  assertEquals(
    formatImportSuccessMessage({ created: 2, updated: 1 }),
    "Importação concluída: 2 criados, 1 atualizado."
  )
})

Deno.test("formatImportErrorMessage: usa data.error", () => {
  assertEquals(formatImportErrorMessage({ error: "JSON inválido" }, 400), "JSON inválido")
})
