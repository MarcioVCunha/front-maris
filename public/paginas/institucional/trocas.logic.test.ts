import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  STORE_POLICIES,
  STORE_WHATSAPP_NUMBER,
  TROCAS_WHATSAPP_MESSAGE,
  getPoliciesList,
  trocasWhatsappUrl
} from "./trocas.logic.js"
import { buildPrivacySections } from "./privacidade.logic.js"
import { getGarantiaSections } from "./garantia.logic.js"
import { getTrocasDevolucoesSections } from "./trocas-e-devolucoes.logic.js"

Deno.test("STORE_POLICIES contém as seções essenciais de atendimento", () => {
  const keys = Object.keys(STORE_POLICIES)
  assertEquals(keys.includes("garantia"), true)
  assertEquals(keys.includes("trocas"), true)
  assertEquals(keys.includes("envio"), true)
  assertEquals(keys.includes("cuidados"), true)

  const garantia = STORE_POLICIES.garantia
  assert(garantia.summary.includes("1 ano"))
  assert(garantia.summary.includes("90 dias"))
  assert(garantia.topics.length >= 3)

  const trocas = STORE_POLICIES.trocas
  assert(trocas.summary.includes("7 dias"))
  assert(trocas.summary.includes("CDC") || trocas.topics.some((t) => (t.title + t.text).includes("CDC")))
  assert(trocas.topics.some((t) => /retirada/i.test(t.text)))

  const envio = STORE_POLICIES.envio
  assert(envio.topics.some((t) => t.text.includes("Shopee")))

  const cuidados = STORE_POLICIES.cuidados
  assert(cuidados.topics.some((t) => t.text.includes("flanela macia")))
})

Deno.test("getPoliciesList retorna array com todas as políticas", () => {
  const list = getPoliciesList()
  assertEquals(list.length, 4)
  assertEquals(list.map((p) => p.id), ["garantia", "trocas-e-devolucoes", "envio", "cuidados"])
})

Deno.test("trocasWhatsappUrl monta URL com número da loja e mensagem codificada", () => {
  const url = trocasWhatsappUrl()
  assert(url.startsWith(`https://wa.me/${STORE_WHATSAPP_NUMBER}?text=`))
  assert(url.includes(encodeURIComponent(TROCAS_WHATSAPP_MESSAGE)))

  const custom = trocasWhatsappUrl("Dúvida", "5511999998888")
  assertEquals(custom, "https://wa.me/5511999998888?text=D%C3%BAvida")
})

Deno.test("páginas L0: privacidade, trocas e garantia têm conteúdo mínimo", () => {
  const privacy = buildPrivacySections({
    razaoSocial: "Maris",
    nomeFantasia: "Maris Semijoias",
    documento: "CPF 379.743.338-71",
    email: "contato@lojamaris.com.br",
    encarregadoNome: "Marcio",
    site: "https://lojamaris.com.br",
    endereco: {
      logradouro: "Rua Doutor Alfredo Guedes, 47",
      bairro: "Centro",
      cidade: "Tambaú",
      uf: "SP",
      cep: "13710-087",
    },
  })
  assert(privacy.some((s) => s.id === "controladora"))
  assert(privacy.some((s) => s.id === "direitos"))
  assert(privacy.find((s) => s.id === "direitos")?.paragraphs.some((p) => p.includes("15 dias")))

  const trocas = getTrocasDevolucoesSections()
  assertEquals(trocas[0].badge.includes("7 dias"), true)

  const garantia = getGarantiaSections()
  assert(garantia[0].summary.includes("1 ano"))
  assert(garantia[0].topics.some((t) => /ouro maciço/i.test(t.text)))
})
