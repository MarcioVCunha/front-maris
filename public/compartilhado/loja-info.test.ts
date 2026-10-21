import { assertEquals } from "jsr:@std/assert@1"
import {
  LOJA,
  formatValidityUntil,
  privacyNoticeText,
  enderecoLinha,
} from "./loja-info.logic.js"

Deno.test("formatValidityUntil devolve até dd/mm", () => {
  // Usa horário local do runner; fixa com Date explícita.
  assertEquals(formatValidityUntil(new Date(2026, 9, 31)), "até 31/10")
  assertEquals(formatValidityUntil(""), "")
  assertEquals(formatValidityUntil(null), "")
})

Deno.test("LOJA centraliza placeholders e contato conhecido", () => {
  assertEquals(LOJA.email, "contato@lojamaris.com.br")
  assertEquals(LOJA.site, "https://lojamaris.com.br")
  assertEquals(LOJA.documento.includes("PREENCHER"), true)
  assertEquals(LOJA.endereco.cep, "13710-087")
  assertEquals(enderecoLinha().includes("Tambaú"), true)
})

Deno.test("privacyNoticeText cobre pedido, waitlist e cupom", () => {
  assertEquals(privacyNoticeText("pedido").includes("Política de Privacidade"), true)
  assertEquals(privacyNoticeText("waitlist").includes("esta peça"), true)
  assertEquals(privacyNoticeText("cupom").includes("indicação"), true)
})
