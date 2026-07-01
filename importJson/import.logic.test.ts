import { assertEquals } from "jsr:@std/assert@1"
import { parseImportJsonText } from "./import.logic.js"

Deno.test("parseImportJsonText: parseia array", () => {
  assertEquals(parseImportJsonText('[{"codigo":"A1"}]'), [{ codigo: "A1" }])
})
