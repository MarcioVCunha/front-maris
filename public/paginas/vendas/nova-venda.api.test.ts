import { assertEquals } from "jsr:@std/assert@1"
import {
  NEW_SALE_API,
  createSale,
  fetchMonthSummary,
  fetchRecentSales,
  saveCustomer,
  searchCustomers,
  searchPieces,
} from "./nova-venda.api.js"

function fakeClient(data: unknown, ok = true) {
  const calls: Array<{ name: string; options: Record<string, unknown> }> = []
  return {
    calls,
    async call(name: string, options: Record<string, unknown>) {
      calls.push({ name, options })
      return { ok, status: ok ? 200 : 500, data }
    }
  }
}

Deno.test("o resumo do mês pede seller e o mês, sem calcular comissão na função", async () => {
  const client = fakeClient({ ok: true, charged_total: 200, paid_count: 2 })
  const result = await fetchMonthSummary({ sellerId: 3, month: "2026-10" }, client)
  assertEquals(result.ok, true)
  assertEquals(client.calls[0].name, NEW_SALE_API.monthSummary)
  assertEquals(client.calls[0].options.query, { seller_id: 3, month: "2026-10" })
  assertEquals(JSON.stringify(client.calls[0].options).includes("commission"), false)
})

Deno.test("peças, clientes e vendas recentes usam os nomes provisórios", async () => {
  const pieces = fakeClient({ ok: true, pieces: [{ id: 1, quantity: 2 }] })
  await searchPieces({ sellerId: 3, query: "anel" }, pieces)
  assertEquals(pieces.calls[0].name, "sale-piece-search")
  assertEquals(pieces.calls[0].options.query, { seller_id: 3, q: "anel" })

  const customers = fakeClient({ ok: true, customers: [] })
  await searchCustomers({ query: "lia" }, customers)
  assertEquals(customers.calls[0].name, "sale-customer-search")

  const sale = {
    id: 8,
    customer_whatsapp: "11988887777",
    items: [{ code: "AN581-R", name: "Anel rosa", quantity: 1, unit_price: 120, image_url: "a.jpg" }]
  }
  const recent = fakeClient({ ok: true, sales: [sale] })
  const listed = await fetchRecentSales({ sellerId: 3 }, recent)
  assertEquals(recent.calls[0].name, "seller-recent-sales")
  assertEquals(recent.calls[0].options.query, { seller_id: 3, limit: 20 })
  assertEquals(listed.sales, [sale])
  const source = await Deno.readTextFile(new URL("./nova-venda.api.js", import.meta.url))
  assertEquals(source.includes("customer_whatsapp"), true)
  assertEquals(source.includes("unit_price"), true)
})

Deno.test("cadastrar cliente e criar a venda mandam o corpo combinado", async () => {
  const saved = fakeClient({ ok: true, customer: { id: 4, name: "Lia", whatsapp: "11988887777" } })
  const customer = await saveCustomer({ name: "Lia", whatsapp: "11988887777" }, saved)
  assertEquals(saved.calls[0].name, "sale-customer-save")
  assertEquals(saved.calls[0].options.method, "POST")
  assertEquals(customer.customer?.id, 4)

  const body = {
    seller_id: 3,
    customer: { id: 4 },
    payment_status: "paid",
    payment_method: "pix",
    items: [{ piece_id: 1, quantity: 1 }]
  }
  const created = fakeClient({ ok: true, order_id: 15, total: 190, stock_updated: true })
  const sale = await createSale(body, created)
  assertEquals(created.calls[0].name, "sale-create")
  assertEquals(created.calls[0].options.body, body)
  assertEquals(sale.order?.order_id, 15)
})

Deno.test("erro da função provisória volta mensagem e não segue", async () => {
  const client = fakeClient({ ok: false, error: "Função ainda não publicada." }, false)
  const result = await fetchMonthSummary({ sellerId: 3, month: "2026-10" }, client)
  assertEquals(result.ok, false)
  assertEquals(result.error, "Função ainda não publicada.")
})
