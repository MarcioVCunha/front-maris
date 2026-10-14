import { assertEquals } from "jsr:@std/assert@1"
import {
  NEW_SALE_API,
  createSale,
  fetchMonthSummary,
  fetchRecentSales,
  recentSalesLimit,
  saveCustomer,
  searchCustomers,
  searchPieces,
} from "./nova-venda.api.js"

function fakeClient(data: unknown, ok = true, status = ok ? 200 : 500) {
  const calls: Array<{ name: string; options: Record<string, unknown> }> = []
  return {
    calls,
    async call(name: string, options: Record<string, unknown>) {
      calls.push({ name, options })
      return { ok, status, data }
    }
  }
}

Deno.test("o resumo do mês pede seller e o mês, sem calcular comissão na função", async () => {
  const payload = {
    ok: true,
    month: "2026-10",
    paid_count: 4,
    charged_total: 1240,
    commission_percent: 30,
    commission_amount: 372,
    sem_comissao: false
  }
  const client = fakeClient(payload)
  const result = await fetchMonthSummary({ sellerId: 3, month: "2026-10" }, client)
  assertEquals(result.ok, true)
  assertEquals(result.data, payload)
  assertEquals(client.calls[0].name, NEW_SALE_API.monthSummary)
  assertEquals(client.calls[0].options.query, { seller_id: 3, month: "2026-10" })
  assertEquals(JSON.stringify(client.calls[0].options).includes("commission"), false)
})

Deno.test("peças, clientes e vendas recentes usam os nomes provisórios", async () => {
  const piece = {
    id: "c:12",
    code: "AN581-R",
    name: "Anel rosa",
    image_url: "https://loja.test/anel.jpg",
    quantity: 2,
    unit_price: 120,
    preco_pix: 114,
    item_type: "component",
    component_id: 12
  }
  const pieces = fakeClient({ ok: true, pieces: [piece] })
  const found = await searchPieces({ sellerId: 3, query: "anel" }, pieces)
  assertEquals(pieces.calls[0].name, "sale-piece-search")
  assertEquals(pieces.calls[0].options.query, { seller_id: 3, q: "anel" })
  assertEquals(found.pieces, [piece])

  const customers = fakeClient({ ok: true, customers: [] })
  await searchCustomers({ query: "lia" }, customers)
  assertEquals(customers.calls[0].name, "sale-customer-search")

  const sale = {
    id: 8,
    items: [{ code: "AN581-R", name: "Anel rosa", image_url: "a.jpg", quantity: 1, unit_price: 120 }],
    total: 114,
    paid_at: "2026-10-12T15:00:00Z",
    created_at: "2026-10-12T15:00:00Z",
    customer_name: "Lia Souza",
    customer_whatsapp: "11988887777",
    payment_method: "pix",
    payment_status: "paid"
  }
  const recent = fakeClient({ ok: true, sales: [sale] })
  const listed = await fetchRecentSales({ sellerId: 3, limit: 80 }, recent)
  assertEquals(recent.calls[0].name, "seller-recent-sales")
  assertEquals(recentSalesLimit(80), 50)
  assertEquals(recent.calls[0].options.query, { seller_id: 3, limit: 50 })
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
  const created = fakeClient({
    ok: true,
    order_id: 15,
    total: 190,
    stock_updated: true,
    duplicate: false
  })
  const sale = await createSale(body, created)
  assertEquals(created.calls[0].name, "sale-create")
  assertEquals(created.calls[0].options.body, body)
  assertEquals(sale.order, { order_id: 15, total: 190, stock_updated: true, duplicate: false })

  const again = fakeClient({ ok: true, order_id: 15, total: 190, stock_updated: false, duplicate: true })
  const replay = await createSale(body, again)
  assertEquals(replay.order?.duplicate, true)
  assertEquals(replay.order?.total, 190)
})

Deno.test("409 devolve stock_issues no formato da etapa 2", async () => {
  const data = {
    ok: false,
    error: "Algumas peças esgotaram.",
    stock_issues: [
      {
        code: "AN223-O",
        name: "Anel Ajustável Aro Triplo no Ouro",
        available: 0,
        reason: "out_of_stock",
        product_code: "AN223-O",
        product_name: "Anel Ajustável Aro Triplo no Ouro",
        requested: 1
      }
    ]
  }
  const client = fakeClient(data, false, 409)
  const result = await createSale({ seller_id: 3, items: [] }, client)
  assertEquals(result.ok, false)
  assertEquals(result.status, 409)
  assertEquals(result.error, "Algumas peças esgotaram.")
  assertEquals(result.stockIssues, data.stock_issues)
})

Deno.test("erro da função provisória volta mensagem e não segue", async () => {
  const client = fakeClient({ ok: false, error: "Função ainda não publicada." }, false)
  const result = await fetchMonthSummary({ sellerId: 3, month: "2026-10" }, client)
  assertEquals(result.ok, false)
  assertEquals(result.error, "Função ainda não publicada.")
})
