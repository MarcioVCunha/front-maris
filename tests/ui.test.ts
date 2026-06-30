// Testes dos helpers de UI (window.MarisUI). ui.js usa window.MarisUtils
// (formatMoneyBRL) em renderPricePair, então importamos utils.js antes.
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1"

// deno-lint-ignore no-explicit-any
;(globalThis as any).window = {}
await import("../utils.js")
await import("../ui.js")
// deno-lint-ignore no-explicit-any
const UI = (globalThis as any).window.MarisUI as any

function fakeEl() {
  return { hidden: false, textContent: "", className: "" }
}

Deno.test("setFeedback: texto define classe base + tipo e mostra o elemento", () => {
  const el = fakeEl()
  UI.setFeedback(el, "Salvo!", "success", { baseClass: "promo-feedback" })
  assertEquals(el.textContent, "Salvo!")
  assertEquals(el.className, "promo-feedback success")
  assertEquals(el.hidden, false)
})

Deno.test("setFeedback: texto vazio esconde o elemento por padrão", () => {
  const el = fakeEl()
  UI.setFeedback(el, "", "", { baseClass: "message" })
  assertEquals(el.textContent, "")
  assertEquals(el.className, "message")
  assertEquals(el.hidden, true)
})

Deno.test("setFeedback: toggleHidden=false não mexe em hidden", () => {
  const el = fakeEl()
  el.hidden = false
  UI.setFeedback(el, "", "error", { baseClass: "message", toggleHidden: false })
  assertEquals(el.hidden, false)
  assertEquals(el.className, "message error")
})

Deno.test("setFeedback: elemento nulo não quebra", () => {
  UI.setFeedback(null, "x", "error")
})

Deno.test("setFeedback: baseClass padrão é 'message' quando não informado", () => {
  const el = fakeEl()
  UI.setFeedback(el, "Oi", "success")
  assertEquals(el.className, "message success")
  assertEquals(el.hidden, false)
})

Deno.test("escapeHtml escapa caracteres perigosos", () => {
  assertEquals(UI.escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;")
  assertEquals(UI.escapeHtml(null), "")
  assertEquals(UI.escapeHtml(123), "123")
})

Deno.test("renderPricePair gera price-old e price-now com separador padrão", () => {
  const html = UI.renderPricePair(100, 90)
  assertStringIncludes(html, "price-old")
  assertStringIncludes(html, "price-now")
  assertStringIncludes(html, "100,00")
  assertStringIncludes(html, "90,00")
  assertStringIncludes(html, "</span> <span")
})

Deno.test("renderPricePair aceita separador vazio", () => {
  const html = UI.renderPricePair(100, 90, "")
  assertStringIncludes(html, "</span><span")
})

Deno.test("openModal e closeModal alternam hidden", () => {
  const el = fakeEl()
  UI.openModal(el)
  assertEquals(el.hidden, false)
  UI.closeModal(el)
  assertEquals(el.hidden, true)
  UI.openModal(null)
  UI.closeModal(null)
  assert(true)
})
