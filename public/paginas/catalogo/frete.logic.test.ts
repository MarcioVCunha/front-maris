import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  FREE_SHIPPING_MIN,
  SHIPPING_QUOTE_FUNCTION,
  TERMS_VERSION,
  buildShippingOrderInput,
  buildShippingQuoteBody,
  checkoutTotals,
  freeShippingHint,
  interpretShippingQuote,
  renderShippingOptions,
  trackingPath,
} from "./frete.logic.js"

Deno.test("shipping-quote pede CEP e itens, sem preço", () => {
  assertEquals(SHIPPING_QUOTE_FUNCTION, "shipping-quote")
  const body = buildShippingQuoteBody({
    cep: "01310100",
    items: [
      { product_code: "AN01", quantity: 1, unit_price: 10 },
      { component_id: 4, quantity: 2 },
    ],
  })
  assertEquals(body, {
    cep: "01310-100",
    items: [
      { product_code: "AN01", quantity: 1 },
      { component_id: 4, quantity: 2 },
    ],
  })
  assertEquals(JSON.stringify(body).includes("unit_price"), false)
})

Deno.test("flag desligada ou função ausente esconde o envio", () => {
  assertEquals(interpretShippingQuote({ ok: false, status: 404, data: {} }).kind, "off")
  assertEquals(interpretShippingQuote({ ok: false, status: 0, data: {} }).shippingEnabled, false)
  const off = interpretShippingQuote({
    ok: true,
    status: 200,
    data: { ok: true, shipping_enabled: false, options: [{ delivery_type: "retirada", price: 0, label: "Retirada" }] },
  })
  assertEquals(off.kind, "off")
  assertEquals(off.shippingEnabled, false)
})

Deno.test("frete indisponível deixa só a retirada", () => {
  const parsed = interpretShippingQuote({
    ok: true,
    status: 200,
    data: {
      ok: true,
      shipping_enabled: true,
      warning: "frete indisponível agora",
      options: [
        { delivery_type: "envio", service_id: 1, service: "PAC", price: 18.9, deadline_days: 5, label: "PAC" },
        { delivery_type: "retirada", service_id: null, price: 0, deadline_days: 0, label: "Retirada" },
      ],
    },
  })
  assertEquals(parsed.options.map((item) => item.delivery_type), ["retirada"])
  assertEquals(interpretShippingQuote({ ok: false, status: 400, data: { error: "Informe um CEP válido." } }).error, "Informe um CEP válido.")
  assertEquals(interpretShippingQuote({ ok: false, status: 429, data: { error: "Calma." } }).error, "Calma.")
})

Deno.test("Pix soma peças líquidas e frete com 5% e o aviso mostra quanto falta", () => {
  assertEquals(FREE_SHIPPING_MIN, 199)
  assertEquals(checkoutTotals({ merchandise: 100, freight: 20 }), {
    merchandise: 100,
    freight: 20,
    total: 120,
    pix: 114,
  })
  assert(freeShippingHint(150).includes("Faltam"))
  assert(freeShippingHint(150).includes("49,00"))
  assertEquals(freeShippingHint(199).includes("Faltam"), false)
  const html = renderShippingOptions([
    { delivery_type: "envio", service_id: 2, service: "Sedex", price: 0, deadline_days: 3, label: "Sedex" },
    { delivery_type: "retirada", service_id: null, price: 0, deadline_days: 0, label: "Retirada" },
  ], "envio:2")
  assert(html.includes("Sedex"))
  assert(html.includes("Grátis"))
  assert(html.includes("3 dias"))
  assert(html.includes("Retirada"))
  assert(html.includes("Na loja"))
  assertEquals(html.includes("width:100%"), false)
})

Deno.test("envio exige login, CPF, endereço e termos; retirada pede e-mail", () => {
  assertEquals(buildShippingOrderInput({ enabled: false }).fields, {})
  const guest = buildShippingOrderInput({
    enabled: true,
    deliveryType: "retirada",
    termsAccepted: true,
    email: "ana@exemplo.com",
  })
  assertEquals(guest.ok, true)
  assertEquals(guest.fields.deliveryType, "retirada")
  assertEquals(guest.fields.termsVersion, TERMS_VERSION)
  assertEquals(guest.fields.shippingPriceSeen, 0)
  assertEquals(buildShippingOrderInput({ enabled: true, deliveryType: "envio", termsAccepted: false }).error, "Aceite os termos para continuar.")
  assertEquals(buildShippingOrderInput({
    enabled: true,
    deliveryType: "envio",
    termsAccepted: true,
    hasLogin: false,
  }).error, "Envio pede login de cliente.")
  assertEquals(buildShippingOrderInput({
    enabled: true,
    deliveryType: "envio",
    termsAccepted: true,
    hasLogin: true,
    cpf: "123",
  }).error, "Cadastre o CPF para enviar.")
  const envio = buildShippingOrderInput({
    enabled: true,
    deliveryType: "envio",
    termsAccepted: true,
    hasLogin: true,
    cpf: "12345678901",
    whatsapp: "11999998888",
    serviceId: 9,
    priceSeen: 18.9,
    shipTo: { cep: "01310100", uf: "sp", rua: "Paulista", numero: "100", bairro: "Bela Vista", cidade: "São Paulo", complemento: "ap 2" },
  })
  assertEquals(envio.ok, true)
  assertEquals(envio.fields.shipTo?.cep, "01310-100")
  assertEquals(envio.fields.shipTo?.uf, "SP")
  assertEquals(envio.fields.shipTo?.complemento, "ap 2")
  assertEquals(envio.fields.shippingServiceId, 9)
  assertEquals(envio.fields.shippingPriceSeen, 18.9)
  assertEquals(trackingPath("abc 1"), "/pedido/abc%201")
})
