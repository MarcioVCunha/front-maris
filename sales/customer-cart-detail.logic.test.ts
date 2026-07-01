import { assert, assertEquals } from "jsr:@std/assert@1"
import { buildWhatsappSummary, computeCartSaleTotals } from "./customer-cart-detail.logic.js"

const roundMoney = (n) => Math.round(n * 100) / 100
const formatMoneyBRL = (n) => `R$ ${n.toFixed(2)}`

Deno.test("computeCartSaleTotals: só linhas marcadas", () => {
  const lines = [
    { checked: true, total_value: 50 },
    { checked: false, total_value: 30 },
  ]
  const totals = computeCartSaleTotals(lines, "dinheiro", roundMoney)
  assertEquals(totals.subtotal, 50)
  assertEquals(totals.discount, 0)
  assertEquals(totals.total, 50)
})

Deno.test("buildWhatsappSummary: inclui itens e total", () => {
  const text = buildWhatsappSummary({
    paymentMethod: "pix",
    buyerName: "Maria",
    lines: [{ product_name: "Anel", display_code: "A1", quantity: 1, total_value: 100 }],
    subtotal: 100,
    discount: 5,
    total: 95,
    formatMoneyBRL,
  })
  assert(text.includes("Maria"))
  assert(text.includes("Anel"))
  assert(text.includes("Pix"))
})
