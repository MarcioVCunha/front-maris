import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  DEFAULT_TOP_BAR_MESSAGES,
  escapeHtml,
  renderTopBarHtml,
  topBarItemById
} from "./top-bar.logic.js"

Deno.test("DEFAULT_TOP_BAR_MESSAGES contém os 3 destaques combinados", () => {
  assertEquals(DEFAULT_TOP_BAR_MESSAGES.length, 3)
  const ids = DEFAULT_TOP_BAR_MESSAGES.map((m) => m.id)
  assertEquals(ids, ["frete", "pix", "trocas"])

  const frete = topBarItemById("frete")
  assert(frete?.text.includes("plataformas"))
  assert(frete?.text.includes("Shopee"))

  const pix = topBarItemById("pix")
  assert(pix?.text.includes("5%"))
  assert(pix?.text.includes("Pix"))

  const trocas = topBarItemById("trocas")
  assert(trocas?.text.includes("troca"))
  assertEquals(trocas?.link, "/trocas")
})

Deno.test("escapeHtml trata caracteres especiais", () => {
  assertEquals(escapeHtml("<b>A & B</b>"), "&lt;b&gt;A &amp; B&lt;/b&gt;")
  assertEquals(escapeHtml('aspas "duplas"'), "aspas &quot;duplas&quot;")
  assertEquals(escapeHtml(null), "")
})

Deno.test("renderTopBarHtml gera a faixa com itens e links", () => {
  const html = renderTopBarHtml(DEFAULT_TOP_BAR_MESSAGES)
  assert(html.includes('class="top-announcement-bar"'))
  assert(html.includes('role="region"'))
  assert(html.includes('data-id="frete"'))
  assert(html.includes('data-id="pix"'))
  assert(html.includes('data-id="trocas"'))
  assert(html.includes('href="/trocas"'))
  assert(html.includes('class="top-bar-sep"'))
})

Deno.test("renderTopBarHtml lista vazia devolve string vazia", () => {
  assertEquals(renderTopBarHtml([]), "")
  assertEquals(renderTopBarHtml(null as unknown as []), "")
})

Deno.test("topBarItemById busca por ID ou null se inexistente", () => {
  assertEquals(topBarItemById("inexistente"), null)
  assertEquals(topBarItemById("pix")?.id, "pix")
})
