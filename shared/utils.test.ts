// Testes das utilidades globais do front (window.MarisUtils).
// O arquivo utils.js é um script de navegador que faz `window.MarisUtils = {...}`,
// então definimos um shim de `window` antes do import dinâmico.
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1"

// deno-lint-ignore no-explicit-any
;(globalThis as any).window = {}
await import("./utils.js")
// deno-lint-ignore no-explicit-any
const U = (globalThis as any).window.MarisUtils as any

Deno.test("onlyDigits remove tudo que não é dígito", () => {
  assertEquals(U.onlyDigits("(11) 99999-8888"), "11999998888")
  assertEquals(U.onlyDigits(null), "")
  assertEquals(U.onlyDigits(12345), "12345")
})

Deno.test("roundMoney arredonda para 2 casas", () => {
  assertEquals(U.roundMoney(10.005), 10.01)
  assertEquals(U.roundMoney(10.004), 10)
  assertEquals(U.roundMoney(0), 0)
})

Deno.test("effectivePrice aplica desconto só com promoção ativa e percentual > 0", () => {
  assertEquals(U.effectivePrice({ unit_price: 100 }), 100)
  assertEquals(U.effectivePrice({ unit_price: 100, is_on_sale: true, discount_percent: 10 }), 90)
  assertEquals(U.effectivePrice({ unit_price: 100, is_on_sale: false, discount_percent: 10 }), 100)
  assertEquals(U.effectivePrice({ unit_price: 100, is_on_sale: true, discount_percent: 0 }), 100)
  assertEquals(U.effectivePrice(null), 0)
})

Deno.test("hasPromo true só quando is_on_sale e desconto > 0", () => {
  assert(U.hasPromo({ is_on_sale: true, discount_percent: 5 }))
  assertEquals(U.hasPromo({ is_on_sale: true, discount_percent: 0 }), false)
  assertEquals(U.hasPromo({ is_on_sale: false, discount_percent: 5 }), false)
  assertEquals(U.hasPromo(null), false)
})

Deno.test("formatMoneyBRL formata em reais", () => {
  assertStringIncludes(U.formatMoneyBRL(10), "10,00")
  assertStringIncludes(U.formatMoneyBRL(10), "R$")
  assertStringIncludes(U.formatMoneyBRL(0), "0,00")
})

Deno.test("groupByKey agrupa por chave", () => {
  const rows = [
    { k: "a", v: 1 },
    { k: "b", v: 2 },
    { k: "a", v: 3 }
  ]
  const grouped = U.groupByKey(rows, (r: { k: string }) => r.k)
  assertEquals(grouped.a.length, 2)
  assertEquals(grouped.b.length, 1)
})

Deno.test("debounce executa apenas uma vez após o intervalo", async () => {
  let count = 0
  const fn = U.debounce(() => count++, 20)
  fn()
  fn()
  fn()
  assertEquals(count, 0)
  await new Promise((r) => setTimeout(r, 50))
  assertEquals(count, 1)
})

Deno.test("createSupabaseClient memoiza o cliente (singleton)", () => {
  // deno-lint-ignore no-explicit-any
  const w = (globalThis as any).window
  let createCount = 0
  w.ENV = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon" }
  w.supabase = {
    createClient: (url: string, key: string) => {
      createCount++
      return { url, key }
    }
  }
  const first = U.createSupabaseClient()
  const second = U.createSupabaseClient()
  assertEquals(createCount, 1)
  assert(first === second)
  assertEquals(first.url, "https://x.supabase.co")
})
