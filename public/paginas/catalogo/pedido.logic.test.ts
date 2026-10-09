import { assertEquals } from "jsr:@std/assert@1"
import {
  CREATE_ORDER_FUNCTION,
  MarisPedido,
  RESERVE_DAYS,
  buildCreateOrderBody,
  cartKeysForStockIssues,
  interpretCreateOrderResponse,
  reservationText,
  stockIssueText,
  submitCreateOrder
} from "./pedido.logic.js"

const enabledAtImport = MarisPedido.ORDERS_ENABLED

const sampleInput = {
  clientRequestId: "11111111-1111-4111-8111-111111111111",
  name: "Ana",
  whatsapp: "(19) 99999-8888",
  sellerId: "",
  items: [
    { product_code: "AN651-R", component_id: null, quantity: 1, unit_price: 10 },
    { product_code: null, component_id: 12, quantity: 2, unit_price: 4 }
  ],
  dryRun: false,
  website: ""
}

Deno.test("a flag do pedido começa desligada e a reserva combinada é de 7 dias", () => {
  assertEquals(enabledAtImport, false)
  assertEquals(MarisPedido.ORDERS_ENABLED, false)
  assertEquals(CREATE_ORDER_FUNCTION, "create-order")
  assertEquals(RESERVE_DAYS, 7)
})

Deno.test("com a flag desligada a cesta não chama create-order", async () => {
  let called = false
  const result = await submitCreateOrder(() => {
    called = true
    return { ok: true, status: 200, data: {} }
  }, sampleInput)
  assertEquals(MarisPedido.ORDERS_ENABLED, false)
  assertEquals(result.kind, "disabled")
  assertEquals(called, false)
})

Deno.test("o corpo usa os campos da proposta e não manda o preço da tela", () => {
  const body = buildCreateOrderBody(sampleInput)
  assertEquals(body, {
    client_request_id: sampleInput.clientRequestId,
    customer: { name: "Ana", whatsapp: "19999998888" },
    seller_id: null,
    items: [
      { product_code: "AN651-R", quantity: 1 },
      { component_id: 12, quantity: 2 }
    ],
    dry_run: false,
    website: ""
  })
  assertEquals(JSON.stringify(body).includes("unit_price"), false)
  const withCountry = buildCreateOrderBody({ ...sampleInput, whatsapp: "5511999998888" })
  assertEquals(withCountry.customer.whatsapp, "5511999998888")
  assertEquals(MarisPedido.validateCreateOrderBody(withCountry).ok, true)
})

// Corpo público de create-order/handler.test.ts: "reserva de 7 dias volta na resposta".
const CREATED_ORDER = {
  ok: true,
  order_id: 140,
  subtotal: 100,
  total_pix: 95,
  reserved_until: "2026-10-16T12:00:00.000Z",
  items: [{
    code: "AN651-R",
    name: "Anel",
    quantity: 1,
    unit_price: 100,
    line_total: 100
  }]
}

// Corpo público do 409 em create-order/handler.test.ts, depois de publicStockIssue.
const STOCK_OUT = {
  ok: false,
  error: "Algumas peças esgotaram.",
  stock_issues: [{
    code: "AN651-R",
    name: "Anel",
    available: 0,
    reason: "out_of_stock",
    product_code: "AN651-R",
    product_name: "Anel",
    requested: 1
  }]
}

Deno.test("create-order devolve o preço do banco, sem recalcular o Pix", async () => {
  let seenName = ""
  let seenBody: Record<string, unknown> | null = null
  const result = await submitCreateOrder((name, body) => {
    seenName = name
    seenBody = body
    return { ok: true, status: 200, data: CREATED_ORDER }
  }, { ...sampleInput, sellerId: 2 }, { enabled: true })
  assertEquals(seenName, "create-order")
  assertEquals(seenBody?.seller_id, 2)
  assertEquals(result.kind, "confirmed")
  if (result.kind !== "confirmed") return
  assertEquals(result.order.orderId, 140)
  assertEquals(result.order.subtotal, 100)
  assertEquals(result.order.total, 100)
  assertEquals(result.order.totalPix, 95)
  assertEquals(result.order.items[0].code, "AN651-R")
  assertEquals(result.order.items[0].name, "Anel")
  assertEquals(result.order.items[0].unitPrice, 100)
  assertEquals(result.order.items[0].lineTotal, 100)
  assertEquals(reservationText(result.order.reservedUntil), "Sua peça fica reservada até 16/10/2026, 09:00")

  const copied = interpretCreateOrderResponse({
    ok: true,
    status: 200,
    data: { ...CREATED_ORDER, total_pix: 70 }
  })
  if (copied.kind !== "confirmed") return
  assertEquals(copied.order.totalPix, 70)
})

Deno.test("peça esgotada vem no 409 e sai da cesta", async () => {
  const result = await submitCreateOrder(() => ({
    ok: false,
    status: 409,
    data: STOCK_OUT
  }), sampleInput, { enabled: true })
  assertEquals(result.kind, "stock")
  if (result.kind !== "stock") return
  assertEquals(result.error, "Algumas peças esgotaram.")
  assertEquals(result.stockIssues[0].code, "AN651-R")
  assertEquals(result.stockIssues[0].name, "Anel")
  assertEquals(result.stockIssues[0].available, 0)
  assertEquals(result.stockIssues[0].reason, "out_of_stock")
  assertEquals(stockIssueText(result.stockIssues[0]), "Anel acabou de esgotar. Disponível: 0.")
  assertEquals(
    stockIssueText({ name: "Anel", code: "AN651-R", available: 1, reason: "insufficient" }),
    "Anel não tem essa quantidade. Disponível: 1."
  )
  assertEquals(cartKeysForStockIssues([
    { key: "p-AN651-R", product_code: "AN651-R" },
    { key: "p-BM2194-A", product_code: "BM2194-A" },
    { key: "c-12", component_id: 12, code: "E2-MAE" }
  ], result.stockIssues), ["p-AN651-R"])
  assertEquals(cartKeysForStockIssues([
    { key: "c-12", component_id: 12, code: "E2-MAE" }
  ], [{ code: "E2-MAE", name: "Brinco", available: 0, reason: "out_of_stock" }]), ["c-12"])
})

Deno.test("nome, WhatsApp e cesta vazia não disparam a chamada", async () => {
  let calls = 0
  const call = () => {
    calls += 1
    return { ok: true, status: 200, data: {} }
  }
  const on = { enabled: true }
  const missingName = await submitCreateOrder(call, { ...sampleInput, name: "  " }, on)
  const shortPhone = await submitCreateOrder(call, { ...sampleInput, whatsapp: "123" }, on)
  const emptyCart = await submitCreateOrder(call, { ...sampleInput, items: [] }, on)
  assertEquals(missingName, { kind: "error", error: "Informe o nome." })
  assertEquals(shortPhone, { kind: "error", error: "Informe um WhatsApp do Brasil, com DDD." })
  const foreign = await submitCreateOrder(call, { ...sampleInput, whatsapp: "123456789012" }, on)
  const withCountry = await submitCreateOrder(call, { ...sampleInput, whatsapp: "5511999998888", name: " " }, on)
  assertEquals(foreign, { kind: "error", error: "Informe um WhatsApp do Brasil, com DDD." })
  assertEquals(emptyCart, { kind: "error", error: "Sua cesta está vazia." })
  assertEquals(calls, 0)
})

Deno.test("client_request_id repetido mostra o pedido completo", () => {
  // Resposta pública de "reenvio não avisa de novo": o mesmo corpo, sem duplicate.
  const result = interpretCreateOrderResponse({
    ok: true,
    status: 200,
    data: CREATED_ORDER
  })
  assertEquals(result.kind, "confirmed")
  if (result.kind !== "confirmed") return
  assertEquals("duplicate" in CREATED_ORDER, false)
  assertEquals(result.order.orderId, 140)
  assertEquals(result.order.subtotal, 100)
  assertEquals(result.order.total, 100)
  assertEquals(result.order.totalPix, 95)
  assertEquals(result.order.items[0].code, "AN651-R")
  assertEquals(result.order.items[0].lineTotal, 100)
  assertEquals(reservationText(result.order.reservedUntil), "Sua peça fica reservada até 16/10/2026, 09:00")
  assertEquals(reservationText(null), "")
  assertEquals(reservationText("nao-e-data"), "")
})

Deno.test("dry_run, pausa e validação usam o status e o erro do handler", () => {
  const preview = interpretCreateOrderResponse({
    ok: true,
    status: 200,
    data: { ok: true, dry_run: true, subtotal: 100, total_pix: 95, stock_issues: [], items: [] }
  }, { dryRun: true })
  assertEquals(preview.kind, "available")

  const paused = interpretCreateOrderResponse({
    ok: false,
    status: 503,
    data: { error: "Pedidos pelo site estão pausados." }
  })
  assertEquals(paused, { kind: "error", error: "Pedidos pelo site estão pausados." })

  const invalidPhone = interpretCreateOrderResponse({
    ok: false,
    status: 400,
    data: { error: "Informe um WhatsApp do Brasil, com DDD." }
  })
  assertEquals(invalidPhone, { kind: "error", error: "Informe um WhatsApp do Brasil, com DDD." })
})
