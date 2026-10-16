import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  STORE_POLICIES,
  STORE_WHATSAPP_NUMBER,
  TROCAS_WHATSAPP_MESSAGE,
  getPoliciesList,
  trocasWhatsappUrl
} from "./trocas.logic.js"

Deno.test("STORE_POLICIES contém as seções essenciais de atendimento", () => {
  const keys = Object.keys(STORE_POLICIES)
  assertEquals(keys.includes("garantia"), true)
  assertEquals(keys.includes("trocas"), true)
  assertEquals(keys.includes("envio"), true)
  assertEquals(keys.includes("cuidados"), true)

  const garantia = STORE_POLICIES.garantia
  assert(garantia.summary.includes("90 dias"))
  assert(garantia.topics.length >= 3)

  const trocas = STORE_POLICIES.trocas
  assert(trocas.summary.includes("7 dias"))
  assert(trocas.topics.some((t) => t.text.includes("CDC")))

  const envio = STORE_POLICIES.envio
  assert(envio.topics.some((t) => t.text.includes("Shopee")))

  const cuidados = STORE_POLICIES.cuidados
  assert(cuidados.topics.some((t) => t.text.includes("flanela macia")))
})

Deno.test("getPoliciesList retorna array com todas as políticas", () => {
  const list = getPoliciesList()
  assertEquals(list.length, 4)
  assertEquals(list.map((p) => p.id), ["garantia", "trocas", "envio", "cuidados"])
})

Deno.test("trocasWhatsappUrl monta URL com número da loja e mensagem codificada", () => {
  const url = trocasWhatsappUrl()
  assert(url.startsWith(`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=`))
  assert(url.includes(encodeURIComponent(TROCAS_WHATSAPP_MESSAGE)))

  const custom = trocasWhatsappUrl("Dúvida", "5511999998888")
  assertEquals(custom, "https://wa.me/5511999998888?text=D%C3%BAvida")
})
