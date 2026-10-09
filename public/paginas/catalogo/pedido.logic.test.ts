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

// Corpos reais da create-order (cópia do banco, HTTP 200). O repetido é idêntico.
const CREATED_ORDER = {
  ok: true,
  order_id: 140,
  subtotal: 176.4,
  total_pix: 167.58,
  reserved_until: "2026-10-16T15:04:48.970216+00:00",
  items: [
    {
      code: "AN419-O",
      name: "Anel Regulável Geométrico Cravejado com Pérolas",
      quantity: 1,
      unit_price: 99.8,
      line_total: 99.8
    },
    {
      code: "AN428-O",
      name: "Anel Minimalista com Quadrado Cravejado no Ouro",
      quantity: 1,
      unit_price: 59.8,
      line_total: 59.8
    },
    {
      code: "PG072-O",
      name: "Espirito Santo",
      quantity: 1,
      unit_price: 16.8,
      line_total: 16.8
    }
  ]
}
const REPEATED_ORDER = {
  ok: true,
  order_id: 140,
  subtotal: 176.4,
  total_pix: 167.58,
  reserved_until: "2026-10-16T15:04:48.970216+00:00",
  items: [
    {
      code: "AN419-O",
      name: "Anel Regulável Geométrico Cravejado com Pérolas",
      quantity: 1,
      unit_price: 99.8,
      line_total: 99.8
    },
    {
      code: "AN428-O",
      name: "Anel Minimalista com Quadrado Cravejado no Ouro",
      quantity: 1,
      unit_price: 59.8,
      line_total: 59.8
    },
    {
      code: "PG072-O",
      name: "Espirito Santo",
      quantity: 1,
      unit_price: 16.8,
      line_total: 16.8
    }
  ]
}

// HTTP 409 real. O componente 13 do pedido não entrou nesta lista.
const STOCK_OUT = {
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
    },
    {
      code: "AN519-O",
      name: "Anel Liso Vazado Ajustável",
      available: 1,
      reason: "insufficient",
      product_code: "AN519-O",
      product_name: "Anel Liso Vazado Ajustável",
      requested: 2
    }
  ]
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
  assertEquals(result.order.subtotal, 176.4)
  assertEquals(result.order.total, 176.4)
  assertEquals(result.order.totalPix, 167.58)
  assertEquals(result.order.items[0].code, "AN419-O")
  assertEquals(result.order.items[0].unitPrice, 99.8)
  assertEquals(result.order.items[2].code, "PG072-O")
  assertEquals(result.order.items[2].name, "Espirito Santo")
  assertEquals(result.order.items[2].lineTotal, 16.8)
  assertEquals(reservationText(result.order.reservedUntil), "Sua peça fica reservada até 16/10/2026, 12:04")

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
  assertEquals(result.stockIssues[0].code, "AN223-O")
  assertEquals(result.stockIssues[0].name, "Anel Ajustável Aro Triplo no Ouro")
  assertEquals(result.stockIssues[0].available, 0)
  assertEquals(result.stockIssues[0].reason, "out_of_stock")
  assertEquals(result.stockIssues[1].code, "AN519-O")
  assertEquals(result.stockIssues[1].available, 1)
  assertEquals(result.stockIssues[1].reason, "insufficient")
  assertEquals(stockIssueText(result.stockIssues[0]), "Anel Ajustável Aro Triplo no Ouro acabou de esgotar. Disponível: 0.")
  assertEquals(stockIssueText(result.stockIssues[1]), "Anel Liso Vazado Ajustável não tem essa quantidade. Disponível: 1.")
  assertEquals("component_id" in result.stockIssues[0], false)
  assertEquals("component_id" in result.stockIssues[1], false)
  assertEquals(cartKeysForStockIssues([
    { key: "p-AN223-O", product_code: "AN223-O" },
    { key: "p-AN519-O", product_code: "AN519-O" },
    { key: "c-13", component_id: 13, code: "PG-OUTRO" }
  ], result.stockIssues), ["p-AN223-O", "p-AN519-O"])
})

// HTTP 409 real de peça composta. Cada issue traz component_id.
const COMPONENT_STOCK_OUT = {
  ok: false,
  error: "Algumas peças esgotaram.",
  stock_issues: [
    {
      code: "CJ099-O",
      name: "Brinco",
      available: 0,
      reason: "out_of_stock",
      product_code: "CJ099-O",
      product_name: "Brinco",
      requested: 1,
      component_id: 5
    },
    {
      code: "PG072-O",
      name: "Cruz Esmeralda",
      available: 1,
      reason: "insufficient",
      product_code: "PG072-O",
      product_name: "Cruz Esmeralda",
      requested: 2,
      component_id: 13
    },
    {
      code: "COMP-999999",
      name: "COMP-999999",
      available: 0,
      reason: "out_of_stock",
      product_code: "COMP-999999",
      product_name: "COMP-999999",
      requested: 1,
      component_id: 999999
    }
  ]
}

Deno.test("componente esgotado cita a peça e sai só essa linha da cesta", () => {
  const result = interpretCreateOrderResponse({
    ok: false,
    status: 409,
    data: COMPONENT_STOCK_OUT
  })
  assertEquals(result.kind, "stock")
  if (result.kind !== "stock") return
  assertEquals(result.error, "Algumas peças esgotaram.")
  assertEquals(result.stockIssues.map((issue) => issue.component_id), [5, 13, 999999])
  assertEquals(stockIssueText(result.stockIssues[0]), "Brinco (CJ099-O) acabou de esgotar. Disponível: 0.")
  assertEquals(stockIssueText(result.stockIssues[1]), "Cruz Esmeralda (PG072-O) não tem essa quantidade. Disponível: 1.")
  assertEquals(stockIssueText(result.stockIssues[2]), "COMP-999999 acabou de esgotar. Disponível: 0.")
  assertEquals(cartKeysForStockIssues([
    { key: "p-CJ099-O", product_code: "CJ099-O", code: "CJ099-O" },
    { key: "c-5", component_id: 5, code: "CJ099-O" },
    { key: "p-PG072-O", product_code: "PG072-O", code: "PG072-O" },
    { key: "c-13", component_id: 13, code: "PG072-O" },
    { key: "c-999999", component_id: 999999, code: "COMP-999999" },
    { key: "p-AN419-O", product_code: "AN419-O", code: "AN419-O" }
  ], result.stockIssues), ["c-5", "c-13", "c-999999"])
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
  assertEquals(foreign, { kind: "error", error: "Informe um WhatsApp do Brasil, com DDD." })
  assertEquals(emptyCart, { kind: "error", error: "Sua cesta está vazia." })
  assertEquals(calls, 0)
})

Deno.test("client_request_id repetido mostra o pedido completo", () => {
  assertEquals(REPEATED_ORDER, CREATED_ORDER)
  assertEquals("duplicate" in REPEATED_ORDER, false)
  const result = interpretCreateOrderResponse({
    ok: true,
    status: 200,
    data: REPEATED_ORDER
  })
  assertEquals(result.kind, "confirmed")
  if (result.kind !== "confirmed") return
  assertEquals(result.order.orderId, 140)
  assertEquals(result.order.subtotal, 176.4)
  assertEquals(result.order.total, 176.4)
  assertEquals(result.order.totalPix, 167.58)
  assertEquals(result.order.items.length, 3)
  assertEquals(result.order.items[2].lineTotal, 16.8)
  assertEquals(reservationText(result.order.reservedUntil), "Sua peça fica reservada até 16/10/2026, 12:04")
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
