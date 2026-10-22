import { assertEquals } from "jsr:@std/assert@1"
import {
  OBRIGADO_PATH,
  PAYMENT_CREATE_LINK_FUNCTION,
  buildObrigadoUrl,
  buildOrderWhatsappMessage,
  buildPaymentCreateLinkBody,
  checkoutUrlFromData,
  inferStatusFromReturn,
  interpretOrderStatusResponse,
  orderStatusPageState,
  interpretPaymentCreateLinkResponse,
  parseObrigadoQuery,
  submitPaymentCreateLink,
  validatePaymentCreateLinkBody
} from "./pagamento.logic.js"

Deno.test("payment-create-link usa o nome da Edge Function do back", () => {
  assertEquals(PAYMENT_CREATE_LINK_FUNCTION, "payment-create-link")
  assertEquals(OBRIGADO_PATH, "/catalog/obrigado")
})

Deno.test("buildPaymentCreateLinkBody monta order_id e redirect_url sem payment_method", () => {
  const body = buildPaymentCreateLinkBody({
    orderId: 42,
    redirectUrl: "https://lojamaris.com.br/catalog/obrigado?order_id=42",
    paymentMethod: "pix"
  })
  assertEquals(body, {
    order_id: 42,
    redirect_url: "https://lojamaris.com.br/catalog/obrigado?order_id=42"
  })
  assertEquals(Object.prototype.hasOwnProperty.call(body, "payment_method"), false)
  assertEquals(validatePaymentCreateLinkBody(body).ok, true)
})

Deno.test("validatePaymentCreateLinkBody rejeita payment_method, preço e redirect inválido", () => {
  assertEquals(
    validatePaymentCreateLinkBody({ order_id: 1, redirect_url: "" }),
    { ok: false, error: "Falta a página de retorno do pagamento." }
  )
  assertEquals(
    validatePaymentCreateLinkBody({
      order_id: 1,
      redirect_url: "https://lojamaris.com.br/catalog/obrigado?order_id=1",
      payment_method: "pix"
    }),
    { ok: false, error: "O pagamento não envia método pela tela." }
  )
  const withCost = {
    order_id: 1,
    redirect_url: "https://lojamaris.com.br/catalog/obrigado?order_id=1"
  }
  withCost["cos" + "to"] = 10
  assertEquals(
    validatePaymentCreateLinkBody(withCost),
    { ok: false, error: "O preço do pagamento não sai da tela." }
  )
  assertEquals(
    validatePaymentCreateLinkBody({ order_id: 0, redirect_url: "https://x.test/ok" }),
    { ok: false, error: "Pedido inválido para pagamento." }
  )
})

Deno.test("interpretPaymentCreateLinkResponse lê checkout_url e aliases", () => {
  assertEquals(
    interpretPaymentCreateLinkResponse({
      ok: true,
      data: { ok: true, checkout_url: "https://checkout.infinitepay.io/abc" }
    }),
    {
      kind: "ready",
      checkoutUrl: "https://checkout.infinitepay.io/abc",
      orderId: null
    }
  )
  assertEquals(
    checkoutUrlFromData({ payment_url: "https://checkout.infinitepay.io/xyz" }),
    "https://checkout.infinitepay.io/xyz"
  )
  assertEquals(
    interpretPaymentCreateLinkResponse({
      ok: false,
      data: { error: "Pedido não encontrado." }
    }),
    { kind: "error", error: "Pedido não encontrado." }
  )
})

Deno.test("submitPaymentCreateLink chama a função sem payment_method", async () => {
  let seenName = ""
  let seenBody = null
  const result = await submitPaymentCreateLink((name, body) => {
    seenName = name
    seenBody = body
    return {
      ok: true,
      status: 200,
      data: { ok: true, order_id: 7, checkout_url: "https://checkout.infinitepay.io/pay" }
    }
  }, {
    orderId: 7,
    redirectUrl: "https://lojamaris.com.br/catalog/obrigado?order_id=7"
  })
  assertEquals(seenName, "payment-create-link")
  assertEquals(seenBody.order_id, 7)
  assertEquals(Object.prototype.hasOwnProperty.call(seenBody, "payment_method"), false)
  assertEquals(result.kind, "ready")
  assertEquals(result.checkoutUrl, "https://checkout.infinitepay.io/pay")
})

Deno.test("buildObrigadoUrl e parseObrigadoQuery tratam retorno InfinitePay", () => {
  assertEquals(
    buildObrigadoUrl("https://lojamaris.com.br", 99),
    "https://lojamaris.com.br/catalog/obrigado?order_id=99"
  )
  const query = parseObrigadoQuery(
    "?order_nsu=99&receipt_url=https%3A%2F%2Fpay.example%2Fr&capture_method=pix&transaction_nsu=tx1&slug=abc"
  )
  assertEquals(query.orderId, 99)
  assertEquals(query.captureMethod, "pix")
  assertEquals(query.transactionNsu, "tx1")
  assertEquals(inferStatusFromReturn(query), "pago")
  assertEquals(inferStatusFromReturn({ orderId: 1 }), "a_confirmar")
})

Deno.test("interpretOrderStatusResponse e mensagem WhatsApp", () => {
  assertEquals(
    interpretOrderStatusResponse({
      ok: true,
      data: { ok: true, order_id: 5, status: "pago", total: 100, total_pix: 95 }
    }),
    {
      kind: "ok",
      orderId: 5,
      status: "pago",
      statusLabel: "Pago",
      total: 100,
      totalPix: 95,
      reservedUntil: null
    }
  )
  assertEquals(
    orderStatusPageState({ kind: "error", error: "Não foi possível consultar o pedido." }, "a_confirmar"),
    {
      status: "a_confirmar",
      message: "Não foi possível consultar o pedido.",
      messageType: "error"
    }
  )
  assertEquals(
    orderStatusPageState({ kind: "error" }, "pago").message,
    "Não foi possível consultar o status agora."
  )
  assertEquals(orderStatusPageState({ kind: "ok", status: "pago" }, "a_confirmar").message, "")

  const msg = buildOrderWhatsappMessage({
    orderId: 5,
    total: 100,
    totalPix: 95,
    items: [{ name: "Anel", quantity: 1 }]
  })
  assertEquals(msg.includes("pedido #5"), true)
  assertEquals(msg.includes("Anel x1"), true)
})
