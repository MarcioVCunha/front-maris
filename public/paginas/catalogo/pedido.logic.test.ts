import { assertEquals } from "jsr:@std/assert@1"
import {
  CREATE_ORDER_FUNCTION,
  MarisPedido,
  RESERVE_DAYS,
  buildCreateOrderBody,
  cartKeysForStockIssues,
  interpretCreateOrderResponse,
  reservationText,
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
})

Deno.test("create-order devolve o preço do banco, sem recalcular o Pix", async () => {
  let seenName = ""
  let seenBody: Record<string, unknown> | null = null
  const result = await submitCreateOrder((name, body) => {
    seenName = name
    seenBody = body
    return {
      ok: true,
      status: 200,
      data: {
        ok: true,
        order_id: 140,
        status: "a_confirmar",
        subtotal: 100,
        total_pix: 70,
        reserved_until: "2026-10-16T17:00:00.000Z",
        items: [
          { code: "AN651-R", name: "Anel", quantity: 1, unit_price: 79.8, line_total: 79.8 }
        ]
      }
    }
  }, { ...sampleInput, sellerId: 2 }, { enabled: true })
  assertEquals(seenName, "create-order")
  assertEquals(seenBody?.seller_id, 2)
  assertEquals(result.kind, "confirmed")
  if (result.kind !== "confirmed") return
  assertEquals(result.order.orderId, 140)
  assertEquals(result.order.subtotal, 100)
  assertEquals(result.order.total, 100)
  assertEquals(result.order.totalPix, 70)
  assertEquals(result.order.items[0].unitPrice, 79.8)
  assertEquals(result.order.items[0].lineTotal, 79.8)
  assertEquals(reservationText(result.order.reservedUntil), "Sua peça fica reservada até 16/10/2026, 14:00")
})

Deno.test("peça esgotada vem no 409 e sai da cesta", async () => {
  const result = await submitCreateOrder(() => ({
    ok: false,
    status: 409,
    data: {
      ok: false,
      error: "Algumas peças acabaram de esgotar.",
      stock_issues: [
        {
          product_code: "AN651-R",
          product_name: "Anel Regulável",
          requested: 1,
          available: 0,
          reason: "out_of_stock"
        }
      ]
    }
  }), sampleInput, { enabled: true })
  assertEquals(result.kind, "stock")
  if (result.kind !== "stock") return
  assertEquals(result.stockIssues[0].reason, "out_of_stock")
  assertEquals(cartKeysForStockIssues([
    { key: "p-AN651-R", product_code: "AN651-R" },
    { key: "p-BM2194-A", product_code: "BM2194-A" },
    { key: "c-12", component_id: 12 }
  ], result.stockIssues), ["p-AN651-R"])
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
  assertEquals(shortPhone, { kind: "error", error: "Informe um WhatsApp com DDD." })
  assertEquals(emptyCart, { kind: "error", error: "Sua cesta está vazia." })
  assertEquals(calls, 0)
})

Deno.test("resposta repetida não inventa preço", () => {
  const result = interpretCreateOrderResponse({
    ok: true,
    status: 200,
    data: { ok: true, order_id: 140, duplicate: true }
  })
  assertEquals(result.kind, "duplicate")
  assertEquals(result.orderId, 140)
  assertEquals(reservationText(null), "")
  assertEquals(reservationText("nao-e-data"), "")
})
