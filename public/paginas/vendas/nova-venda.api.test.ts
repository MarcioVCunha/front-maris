import { assertEquals } from "jsr:@std/assert@1"
import {
  NEW_SALE_API,
  cancelMarketplaceOrder,
  createSale,
  fetchMonthSummary,
  fetchRecentSales,
  messageForSaleError,
  recentSalesLimit,
  registerMarketplaceOrder,
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
    timezone: "America/Sao_Paulo",
    paid_count: 2,
    paid_orders_count: 1,
    sem_comissao: false,
    charged_total: 0.11,
    commission_amount: 0.03,
    commission_percent: 30.00
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
    quantity: 2,
    image_url: "https://loja.test/anel.jpg",
    item_type: "component",
    preco_pix: 114,
    unit_price: 120,
    component_id: 12,
    preco_efetivo: 120
  }
  const pieces = fakeClient({ ok: true, pieces: [piece] })
  const found = await searchPieces({ query: "anel" }, pieces)
  assertEquals(pieces.calls[0].name, "sale-piece-search")
  assertEquals(pieces.calls[0].options.query, { q: "anel" })
  assertEquals(found.pieces, [piece])

  const customers = fakeClient({ ok: true, customers: [] })
  await searchCustomers({ query: "lia" }, customers)
  assertEquals(customers.calls[0].name, "sale-customer-search")

  const sale = {
    id: 8,
    created_at: "2026-10-12T15:00:00Z",
    paid_at: "2026-10-12T15:00:00Z",
    customer_name: "Lia Souza",
    customer_whatsapp: "11988887777",
    payment_method: "pix",
    payment_status: "paid",
    paid_items_count: 2,
    items_count: 2,
    total: 142.5,
    items: [
      { code: "AN", name: "Anel", image_url: "", quantity: 1, unit_price: 100, paid_at: "2026-10-12T15:00:00Z" },
      { code: "BR", name: "Brinco", image_url: "", quantity: 1, unit_price: 50, paid_at: "2026-10-12T15:00:00Z" }
    ]
  }
  const partial = {
    id: 9,
    items: [
      { code: "AN581-R", name: "Anel rosa", image_url: "a.jpg", quantity: 1, unit_price: 120, paid_at: "2026-10-12T15:00:00Z" },
      { code: "BR200", name: "Brinco gota", image_url: "", quantity: 1, unit_price: 80, paid_at: null }
    ],
    total: 200,
    paid_at: null,
    created_at: "2026-10-13T15:00:00Z",
    customer_name: "Bia",
    customer_whatsapp: "11977776666",
    payment_method: "dinheiro",
    payment_status: "partial",
    paid_items_count: 1,
    items_count: 2
  }
  const recent = fakeClient({ ok: true, sales: [sale, partial] })
  const listed = await fetchRecentSales({ sellerId: 3, limit: 80 }, recent)
  assertEquals(recent.calls[0].name, "seller-recent-sales")
  assertEquals(recentSalesLimit(80), 50)
  assertEquals(recent.calls[0].options.query, { seller_id: 3, limit: 50 })
  assertEquals(listed.sales, [sale, partial])
  assertEquals(partial.payment_status, "partial")
  assertEquals(partial.items.some((item) => item.paid_at), true)
  assertEquals(partial.items.some((item) => item.paid_at == null), true)
  const source = await Deno.readTextFile(new URL("./nova-venda.api.js", import.meta.url))
  assertEquals(source.includes("customer_whatsapp"), true)
  assertEquals(source.includes("unit_price"), true)
  assertEquals(source.includes("paid|partial|receivable"), true)
  assertEquals(source.includes("paid_items_count"), true)
  assertEquals(source.includes("paid_orders_count"), true)
})

Deno.test("cadastrar cliente e criar a venda mandam o corpo combinado", async () => {
  const saved = fakeClient({
    ok: true,
    customer: { id: 4, name: "Lia", whatsapp: "11988887777" }
  })
  const customer = await saveCustomer({ name: "Lia", whatsapp: "(11) 98888-7777" }, saved)
  assertEquals(saved.calls[0].name, "sale-customer-save")
  assertEquals(saved.calls[0].options.method, "POST")
  assertEquals(saved.calls[0].options.body, { name: "Lia", whatsapp: "(11) 98888-7777" })
  assertEquals(customer.customer, { id: 4, name: "Lia", whatsapp: "11988887777" })

  const body = {
    seller_id: 3,
    payment_status: "receivable",
    payment_method: "pix",
    customer: { id: 4 },
    items: [{ piece_id: 1, quantity: 1 }, { piece_id: "c:2", quantity: 1 }],
    client_request_id: "11111111-1111-4111-8111-111111111111"
  }
  const createdPayload = {
    ok: true,
    order_id: 15,
    total: 142.5,
    subtotal: 150,
    total_pix: 142.5,
    items: [
      { piece_id: 1, quantity: 1, line_total: 100 },
      { piece_id: "c:2", quantity: 1, line_total: 50 }
    ],
    customer: { id: 4, name: "Lia", whatsapp: "11988887777" },
    paid_at: null,
    created_at: "2026-10-14T15:00:00Z",
    duplicate: false,
    stock_updated: true,
    payment_method: "pix",
    payment_status: "receivable"
  }
  const created = fakeClient(createdPayload)
  const sale = await createSale(body, created)
  assertEquals(created.calls[0].name, "sale-create")
  assertEquals(created.calls[0].options.body, body)
  assertEquals(JSON.stringify(body).includes("unit_price"), false)
  assertEquals(sale.order?.total, 142.5)
  assertEquals(sale.order?.subtotal, 150)
  assertEquals(sale.order?.total_pix, 142.5)
  assertEquals(sale.order?.duplicate, false)
  assertEquals(sale.order?.stock_updated, true)
  assertEquals(sale.order?.items[0].line_total, 100)

  const again = fakeClient({ ...createdPayload, stock_updated: false, duplicate: true })
  const replay = await createSale(body, again)
  assertEquals(replay.order?.duplicate, true)
  assertEquals(replay.order?.total, 142.5)
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

Deno.test("register-marketplace-order e cancel-marketplace-order usam os nomes do contrato", async () => {
  assertEquals(NEW_SALE_API.registerMarketplaceOrder, "register-marketplace-order")
  assertEquals(NEW_SALE_API.cancelMarketplaceOrder, "cancel-marketplace-order")

  const body = {
    marketplace: "mercado_livre",
    payment_status: "paid",
    payment_method: "pix",
    items: [{ piece_id: 3, quantity: 1 }],
    customer: null,
    client_request_id: "abc"
  }
  const created = fakeClient({
    ok: true,
    order_id: 55,
    sale_ids: [101],
    marketplace: "mercado_livre",
    total: 90,
    subtotal: 90,
    total_pix: 85.5,
    stock_updated: true,
    payment_method: "pix",
    payment_status: "paid",
    commission_amount: 0,
    sem_comissao: true
  })
  const sale = await registerMarketplaceOrder(body, created)
  assertEquals(created.calls[0].name, "register-marketplace-order")
  assertEquals(created.calls[0].options.body, body)
  assertEquals(sale.ok, true)
  assertEquals(sale.order?.channel, "marketplace")
  assertEquals(sale.order?.commission_amount, 0)
  assertEquals(sale.order?.sem_comissao, true)
  assertEquals(sale.order?.sale_ids, [101])

  const cancelled = fakeClient({ ok: true, stock_restored: true })
  const result = await cancelMarketplaceOrder({ order_id: 55 }, cancelled)
  assertEquals(cancelled.calls[0].name, "cancel-marketplace-order")
  assertEquals(cancelled.calls[0].options.body, { order_id: 55 })
  assertEquals(result.ok, true)
  assertEquals(result.stockRestored, true)
})

Deno.test("login, outra vendedora e conta sem vendedora têm aviso", async () => {
  assertEquals(messageForSaleError(401, ""), "Entre de novo para ver suas vendas.")
  assertEquals(messageForSaleError(403, "Você só vê as próprias vendas."), "Você só vê as próprias vendas.")
  assertEquals(messageForSaleError(400, "Conta sem vendedora."), "Esta conta não está ligada a uma vendedora.")
  assertEquals(messageForSaleError(400, ""), "Esta conta não está ligada a uma vendedora.")
  assertEquals(messageForSaleError(400, "Quantidade inválida."), "Quantidade inválida.")

  const denied = fakeClient({ ok: false, error: "Você só vê as próprias vendas." }, false, 403)
  const recent = await fetchRecentSales({ sellerId: 9 }, denied)
  assertEquals(recent.ok, false)
  assertEquals(recent.error, "Você só vê as próprias vendas.")

  const anon = fakeClient({}, false, 401)
  const month = await fetchMonthSummary({ sellerId: 3, month: "2026-10" }, anon)
  assertEquals(month.error, "Entre de novo para ver suas vendas.")
})
