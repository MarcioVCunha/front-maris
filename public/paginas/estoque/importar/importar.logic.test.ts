import { assertEquals } from "jsr:@std/assert@1"
import {
  IMPORT_CLIENT_TIMEOUT_MS,
  IMPORT_LOADING_MESSAGE,
  formatImportErrorMessage,
  formatImportSuccessMessage,
  parseImportJsonText,
} from "./importar.logic.js"

Deno.test("parseImportJsonText: parseia array", () => {
  assertEquals(parseImportJsonText('[{"codigo":"A1"}]'), [{ codigo: "A1" }])
})

Deno.test("formatImportSuccessMessage: conta criados e atualizados", () => {
  assertEquals(
    formatImportSuccessMessage({ created: 2, updated: 1 }),
    "Importação concluída: 2 criados, 1 atualizado."
  )
})

Deno.test("importação espera pelo menos 150 segundos e avisa a demora", () => {
  assertEquals(IMPORT_CLIENT_TIMEOUT_MS >= 150000, true)
  assertEquals(IMPORT_LOADING_MESSAGE, "Importando... isso pode levar até 2 minutos")
})

Deno.test("formatImportErrorMessage: usa data.error", () => {
  assertEquals(formatImportErrorMessage({ error: "JSON inválido" }, 400), "JSON inválido")
})
