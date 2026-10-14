import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  NEW_SALE_ENABLED,
  buildCreateSaleBody,
  chargedTotalFromSummary,
  commissionRateFor,
  customerPayload,
  filterCustomers,
  filterPieces,
  monthCard,
  renderRecentSales,
  saleTotals,
  setPieceQuantity,
  sumPaidChargesInMonth,
  togglePiece,
} from "./nova-venda.logic.js"

Deno.test("a flag da venda nova nasce desligada", async () => {
  assertEquals(NEW_SALE_ENABLED, false)
  const source = await Deno.readTextFile(new URL("./nova-venda.logic.js", import.meta.url))
  assertEquals(source.includes("export const NEW_SALE_ENABLED = false"), true)
  const page = await Deno.readTextFile(new URL("./nova-venda.js", import.meta.url))
  assertEquals(page.includes('location.replace("/vendas")'), true)
})

Deno.test("a tela atual de venda continua em /vendas", async () => {
  const html = await Deno.readTextFile(new URL("./vendas.html", import.meta.url))
  assertEquals(html.includes('id="sale-form"'), true)
  assertEquals(html.includes('id="submit-btn"'), true)
  assertEquals(html.includes("nova-venda"), false)
  assertEquals(html.includes("NEW_SALE_ENABLED"), false)
})

Deno.test("comissão é 30% das pagas e zero para Marcio e Marineide", () => {
  assertEquals(commissionRateFor({ name: "Ana Souza" }), 0.3)
  assertEquals(commissionRateFor({ name: "Marcio" }), 0)
  assertEquals(commissionRateFor({ name: "Márcio Cunha", role: "admin" }), 0)
  assertEquals(commissionRateFor({ name: "Marineide" }), 0)
  assertEquals(commissionRateFor({ name: "marineide souza" }), 0)

  assertEquals(monthCard({ chargedTotal: 100, seller: { name: "Ana" } }), {
    chargedTotal: 100,
    commission: 30,
    rate: 0.3,
    zeroCommission: false,
    note: "30% do valor cobrado nas vendas pagas."
  })
  assertEquals(monthCard({ chargedTotal: 80, seller: { name: "Marineide" } }).commission, 0)
  assertEquals(monthCard({ chargedTotal: 10.1, seller: { name: "Ana" } }).commission, 3.03)
})

Deno.test("o mês soma só venda paga pela data de pagamento", () => {
  const sales = [
    { total: 10, payment_status: "paid", paid_at: "2026-10-01T03:00:00Z" },
    { total: 99, payment_status: "paid", paid_at: "2026-10-01T02:00:00Z" },
    { total: 40, payment_status: "receivable", paid_at: "2026-10-15T15:00:00Z" },
    { total: 7, is_paid: true, paid_at: "2026-10-20T18:00:00Z" },
    { total: 5, payment_status: "paid", paid_at: "2026-09-30T15:00:00Z" }
  ]
  assertEquals(sumPaidChargesInMonth(sales, 2026, 10), 17)
  assertEquals(chargedTotalFromSummary({ charged_total: 1240 }, { year: 2026, month: 10 }), 1240)
  assertEquals(chargedTotalFromSummary({ sales }, { year: 2026, month: 10 }), 17)
})

Deno.test("a busca de peças fica no estoque e aceita código ou nome", () => {
  const pieces = [
    { id: 1, code: "AN581-R", name: "Anel rosa", quantity: 2 },
    { id: 2, code: "BR100", name: "Brinco", quantity: 0 },
    { id: 3, code: "CL200", name: "Colar de anel", quantity: 1 }
  ]
  assertEquals(filterPieces(pieces, "").map((piece) => piece.id), [1, 3])
  assertEquals(filterPieces(pieces, "anel").map((piece) => piece.id), [1, 3])
  assertEquals(filterPieces(pieces, "an581").map((piece) => piece.id), [1])
  assertEquals(filterPieces(pieces, "brinco"), [])
})

Deno.test("a seleção guarda várias peças e respeita o estoque", () => {
  const anel = { id: 1, code: "AN581-R", name: "Anel", unit_price: 120, quantity: 2, image_url: "a.jpg" }
  const colar = { id: 2, code: "CL200", name: "Colar", unit_price: 80, quantity: 1 }
  let selected = togglePiece([], anel)
  selected = togglePiece(selected, colar)
  assertEquals(selected.map((piece) => piece.quantity), [1, 1])
  selected = setPieceQuantity(selected, 1, 9)
  assertEquals(selected[0].quantity, 2)
  selected = togglePiece(selected, anel)
  assertEquals(selected.map((piece) => piece.id), [2])
  assertEquals(togglePiece([], { id: 9, quantity: 0 }), [])
})

Deno.test("cliente existente ou novo, com WhatsApp", () => {
  assertEquals(customerPayload({ id: 4, name: "", whatsapp: "" }), { ok: true, customer: { id: 4 } })
  assertEquals(customerPayload({ name: "Lia", whatsapp: "(11) 98888-7777" }).customer?.whatsapp, "11988887777")
  assertEquals(customerPayload({ name: "", whatsapp: "11988887777" }).ok, false)
  assertEquals(customerPayload({ name: "Lia", whatsapp: "123" }).ok, false)
  assertEquals(filterCustomers([
    { id: 1, name: "Lia Souza", whatsapp: "11988887777" },
    { id: 2, name: "Bia", whatsapp: "21911112222" }
  ], "8888").map((customer) => customer.id), [1])
})

Deno.test("Pix tira 5% e o corpo da venda não manda preço", () => {
  assertEquals(saleTotals([
    { unit_price: 120, quantity: 1 },
    { unit_price: 80, quantity: 1 }
  ], "pix"), { subtotal: 200, discount: 10, total: 190 })
  assertEquals(saleTotals([{ unit_price: 36, quantity: 1 }], "dinheiro").total, 36)

  const built = buildCreateSaleBody({
    sellerId: 3,
    customer: { id: 9 },
    paymentStatus: "receivable",
    paymentMethod: "cartao",
    pieces: [{ id: "p1", quantity: 2, unit_price: 50 }]
  })
  assertEquals(built.ok, true)
  assertEquals(built.body?.items, [{ piece_id: "p1", quantity: 2 }])
  assertEquals(JSON.stringify(built.body).includes("unit_price"), false)
  assertEquals(buildCreateSaleBody({
    sellerId: 3,
    customer: { name: "Lia", whatsapp: "11988887777" },
    paymentStatus: "paid",
    paymentMethod: "pix",
    pieces: []
  }).ok, false)
})

Deno.test("vendas recentes não têm botão de editar nem cancelar", () => {
  const html = renderRecentSales([
    { customer_name: "Lia", total: 190, payment_method: "pix", payment_status: "paid", created_at: "2026-10-14T15:00:00Z" }
  ], (value) => `R$ ${value}`)
  assertEquals(html.includes("Lia"), true)
  assertEquals(html.includes("Pago"), true)
  assertEquals(/<button/i.test(html), false)
  assertEquals(/editar|cancelar/i.test(html), false)
  assertEquals(renderRecentSales([], (value) => String(value)).includes("Nenhuma venda recente"), true)
})

Deno.test("o atalho da tela nova fica escondido enquanto a flag está desligada", async () => {
  const hub = await Deno.readTextFile(new URL("../admin/vendedoras.html", import.meta.url))
  const link = hub.match(/<a\b[^>]*href="\/vendas\/nova"[^>]*>/)
  assert(link, "falta o link /vendas/nova")
  assertEquals(link[0].includes("hidden"), true)
  const vercel = JSON.parse(await Deno.readTextFile(new URL("../../../vercel.json", import.meta.url)))
  const rewrite = vercel.rewrites.find((item: { source: string }) => item.source === "/vendas/nova")
  assertEquals(rewrite.destination, "/paginas/vendas/nova-venda.html")
  const current = vercel.rewrites.find((item: { source: string }) => item.source === "/vendas")
  assertEquals(current.destination, "/paginas/vendas/vendas.html")
})
