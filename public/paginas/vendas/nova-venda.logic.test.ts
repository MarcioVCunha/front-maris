import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  MARKETPLACE_PLATFORMS,
  MARKETPLACE_SALE_ENABLED,
  NEW_SALE_ENABLED,
  buildCreateSaleBody,
  buildMarketplaceSaleBody,
  cancelMarketplaceOrderPayload,
  chargedTotalFromSummary,
  commissionRateFor,
  customerPayload,
  filterCustomers,
  filterPieces,
  applyStockIssues,
  isMarketplaceSale,
  marketplaceLabel,
  marketplaceLine,
  marketplacePlatformOf,
  monthCard,
  monthCardFromSummary,
  paidPiecesLabel,
  renderRecentSales,
  renderSaleDetail,
  saleDetailTotals,
  saleTotals,
  setPieceQuantity,
  shouldShowMarketplaceSale,
  sumPaidChargesInMonth,
  togglePiece,
  whatsappLink,
  addPiece,
  removePiece,
  resolvePieceCategory,
  totalPiecesCount,
} from "./nova-venda.logic.js"

Deno.test("a flag da venda nova está ligada", async () => {
  assertEquals(NEW_SALE_ENABLED, true)
  const source = await Deno.readTextFile(new URL("./nova-venda.logic.js", import.meta.url))
  assertEquals(source.includes("export const NEW_SALE_ENABLED = true"), true)
  const page = await Deno.readTextFile(new URL("./nova-venda.js", import.meta.url))
  assertEquals(page.includes('location.replace("/vendas")'), false)
  assertEquals(page.includes('location.replace("/vendedoras")'), true)
  const css = await Deno.readTextFile(new URL("./nova-venda.css", import.meta.url))
  assertEquals(css.includes(".nova-venda [hidden]"), true)
})

Deno.test("a venda antiga redireciona para a tela nova", async () => {
  const vercel = JSON.parse(await Deno.readTextFile(new URL("../../../vercel.json", import.meta.url)))
  for (const source of ["/vendas", "/sales/sales.html", "/paginas/vendas/vendas.html"]) {
    const rule = vercel.redirects.find((item: { source: string }) => item.source === source)
    assert(rule, source)
    assertEquals(rule.destination, "/vendas/nova")
    assertEquals(rule.permanent, true)
  }
  assertEquals(vercel.rewrites.some((item: { source: string; destination: string }) => {
    return item.source === "/vendas" || item.destination.endsWith("/vendas.html")
  }), false)
  const rewrite = vercel.rewrites.find((item: { source: string }) => item.source === "/vendas/nova")
  assertEquals(rewrite.destination, "/paginas/vendas/nova-venda.html")
  for (const name of ["vendas.html", "vendas.js", "vendas.logic.js", "vendas.logic.test.ts"]) {
    let missing = false
    try {
      await Deno.stat(new URL(`./${name}`, import.meta.url))
    } catch {
      missing = true
    }
    assertEquals(missing, true, name)
  }
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
    { total: 5, payment_status: "paid", paid_at: "2026-09-30T15:00:00Z" },
    { total: 500, payment_status: "partial", paid_at: null, paid_items_count: 1, items_count: 3 }
  ]
  assertEquals(sumPaidChargesInMonth(sales, 2026, 10), 17)
  assertEquals(chargedTotalFromSummary({ charged_total: 1240 }, { year: 2026, month: 10 }), 1240)
  assertEquals(chargedTotalFromSummary({ sales }, { year: 2026, month: 10 }), 17)
})

Deno.test("a busca de peças fica no estoque e aceita código, nome e categoria", () => {
  const pieces = [
    { id: 1, code: "AN581-R", name: "Anel rosa", quantity: 2, categoria: "Anel" },
    { id: 2, code: "BR100", name: "Brinco pérola", quantity: 0, categoria: "Brinco" },
    { id: 3, code: "CL200", name: "Colar de anel", quantity: 1, categoria: "Colar" },
    { id: 4, code: "PU300", name: "Pulseira dourada", quantity: 3 }
  ]
  assertEquals(filterPieces(pieces, "").map((piece) => piece.id), [1, 3, 4])
  assertEquals(filterPieces(pieces, "anel").map((piece) => piece.id), [1, 3])
  assertEquals(filterPieces(pieces, "an581").map((piece) => piece.id), [1])
  assertEquals(filterPieces(pieces, "brinco"), [])
  assertEquals(filterPieces(pieces, "", "Anel").map((piece) => piece.id), [1])
  assertEquals(filterPieces(pieces, "", "Colar").map((piece) => piece.id), [3])
  assertEquals(filterPieces(pieces, "", "Pulseira").map((piece) => piece.id), [4])
  assertEquals(filterPieces(pieces, "", "Todas").map((piece) => piece.id), [1, 3, 4])
  assertEquals(resolvePieceCategory({ name: "Brinco de prata" }), "Brinco")
  assertEquals(resolvePieceCategory({ name: "Anel solitário", categoria: "Anel" }), "Anel")
})

Deno.test("a seleção guarda várias peças e respeita o estoque", () => {
  const anel = { id: 1, code: "AN581-R", name: "Anel", unit_price: 120, quantity: 2, image_url: "a.jpg" }
  const colar = { id: 2, code: "CL200", name: "Colar", unit_price: 80, quantity: 1 }
  let selected = togglePiece([], anel)
  selected = togglePiece(selected, colar)
  assertEquals(selected.map((piece) => piece.quantity), [1, 1])
  assertEquals(totalPiecesCount(selected), 2)
  selected = setPieceQuantity(selected, 1, 9)
  assertEquals(selected[0].quantity, 2)
  assertEquals(totalPiecesCount(selected), 3)
  selected = togglePiece(selected, anel)
  assertEquals(selected.map((piece) => piece.id), [2])
  assertEquals(togglePiece([], { id: 9, quantity: 0 }), [])

  // addPiece adiciona ou incrementa quantidade
  let added = addPiece([], anel, 1)
  assertEquals(added[0].quantity, 1)
  added = addPiece(added, anel, 1)
  assertEquals(added[0].quantity, 2)
  // Não passa do estoque de 2
  added = addPiece(added, anel, 1)
  assertEquals(added[0].quantity, 2)

  // removePiece remove da lista
  const removed = removePiece(added, 1)
  assertEquals(removed.length, 0)

  // Peça com promoção ativa via preco_efetivo e preco_pix
  const promo = { id: 3, code: "PR1", name: "Promo", unit_price: 100, preco_efetivo: 79.9, preco_pix: 75.91, quantity: 5 }
  const promoSelected = togglePiece([], promo)
  assertEquals(promoSelected[0].unit_price, 79.9)
  assertEquals(promoSelected[0].preco_pix, 75.91)
})

Deno.test("cliente existente ou novo, com WhatsApp", () => {
  assertEquals(customerPayload({ id: 4, name: "", whatsapp: "" }), { ok: true, customer: { id: 4 } })
  assertEquals(customerPayload({ name: "Lia", whatsapp: "(11) 98888-7777" }).customer?.whatsapp, "(11) 98888-7777")
  assertEquals(customerPayload({ name: "Lia", whatsapp: "5511988887777" }).customer?.whatsapp, "(11) 98888-7777")
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
  assertEquals(saleTotals([
    { unit_price: 120, preco_pix: 114, quantity: 1 },
    { unit_price: 80, preco_pix: 76, quantity: 1 }
  ], "pix"), { subtotal: 200, discount: 10, total: 190 })
  assertEquals(saleTotals([{ unit_price: 100, preco_pix: 90, quantity: 1 }], "pix").total, 90)
  assertEquals(saleTotals([{ unit_price: 36, quantity: 1 }], "dinheiro").total, 36)

  const built = buildCreateSaleBody({
    sellerId: 3,
    customer: { id: 9 },
    paymentStatus: "receivable",
    paymentMethod: "cartao",
    clientRequestId: "11111111-1111-4111-8111-111111111111",
    pieces: [
      { id: "c:12", code: "AN581-R", component_id: 12, quantity: 1, unit_price: 120, preco_pix: 114 },
      { id: 9, code: "BR1", quantity: 2, unit_price: 50, preco_pix: 47.5 }
    ]
  })
  assertEquals(built.ok, true)
  assertEquals(built.body?.items, [
    { piece_id: "c:12", quantity: 1 },
    { piece_id: 9, quantity: 2 }
  ])
  assertEquals(built.body?.client_request_id, "11111111-1111-4111-8111-111111111111")
  assertEquals(JSON.stringify(built.body).includes("unit_price"), false)
  assertEquals(JSON.stringify(built.body).includes("preco_pix"), false)
  assertEquals(JSON.stringify(built.body).includes("product_code"), false)
  assertEquals(JSON.stringify(built.body).includes("component_id"), false)
  assertEquals(buildCreateSaleBody({
    sellerId: 3,
    customer: { id: 9 },
    paymentStatus: "paid",
    paymentMethod: "pix",
    pieces: [{ code: "BR1", quantity: 1, unit_price: 50 }]
  }).body?.items, [{ piece_id: "BR1", quantity: 1 }])
  assertEquals(buildCreateSaleBody({
    sellerId: 3,
    customer: { name: "Lia", whatsapp: "11988887777" },
    paymentStatus: "paid",
    paymentMethod: "pix",
    pieces: []
  }).ok, false)
})

Deno.test("vendas recentes abrem detalhe e não têm editar nem cancelar", () => {
  const html = renderRecentSales([
    { id: 7, customer_name: "Lia", total: 190, payment_method: "pix", payment_status: "paid", created_at: "2026-10-14T15:00:00Z" }
  ], (value) => `R$ ${value}`)
  assertEquals(html.includes("Lia"), true)
  assertEquals(html.includes("Pago"), true)
  assertEquals(html.includes('data-sale-id="7"'), true)
  assertEquals(/editar|cancelar/i.test(html), false)
  assertEquals(renderRecentSales([], (value) => String(value)).includes("Nenhuma venda recente"), true)
})

Deno.test("o detalhe da venda é só leitura, com WhatsApp e desconto no Pix", () => {
  assertEquals(whatsappLink("11988887777"), "https://wa.me/5511988887777")
  assertEquals(whatsappLink("5511988887777"), "https://wa.me/5511988887777")
  assertEquals(whatsappLink("123"), "")
  const html = renderSaleDetail({
    id: 7,
    created_at: "2026-10-14T15:00:00Z",
    customer_name: "Lia Souza",
    customer_whatsapp: "11988887777",
    payment_method: "pix",
    payment_status: "paid",
    total: 114,
    items: [{
      code: "AN581-R",
      name: "Anel rosa",
      image_url: "https://loja.test/anel.jpg",
      quantity: 1,
      unit_price: 120
    }]
  }, (value) => `R$ ${value}`)
  assertEquals(html.includes("Anel rosa"), true)
  assertEquals(html.includes("AN581-R"), true)
  assertEquals(html.includes("Qtd 1"), true)
  assertEquals(html.includes("https://loja.test/anel.jpg"), true)
  assertEquals(html.includes("https://wa.me/5511988887777"), true)
  assertEquals(html.includes("Lia Souza"), true)
  assertEquals(html.includes("Pix"), true)
  assertEquals(html.includes("Pago"), true)
  assertEquals(html.includes("Desconto Pix"), true)
  assertEquals(html.includes("R$ 6"), true)
  assertEquals(html.includes("R$ 114"), true)
  assertEquals(/editar|cancelar/i.test(html), false)

  const cash = renderSaleDetail({
    created_at: "2026-10-10T18:00:00Z",
    customer_name: "Bia",
    payment_method: "dinheiro",
    payment_status: "receivable",
    total: 80,
    items: [{ code: "BR1", name: "Brinco", quantity: 1, unit_price: 80 }]
  }, (value) => `R$ ${value}`)
  assertEquals(cash.includes("A receber"), true)
  assertEquals(cash.includes("Desconto Pix"), false)
  assertEquals(cash.includes("Sem WhatsApp"), true)

  const pix = {
    payment_method: "pix",
    payment_status: "paid",
    paid_items_count: 2,
    items_count: 2,
    total: 142.5,
    customer_name: "Lia",
    customer_whatsapp: "11988887777",
    created_at: "2026-10-14T15:00:00Z",
    items: [
      { code: "AN", name: "Anel", image_url: "", quantity: 1, unit_price: 100, paid_at: "2026-10-14T15:00:00Z" },
      { code: "BR", name: "Brinco", image_url: "", quantity: 1, unit_price: 50, paid_at: "2026-10-14T15:00:00Z" }
    ]
  }
  assertEquals(saleDetailTotals(pix), { subtotal: 150, discount: 7.5, total: 142.5, pix: true })
  assertEquals(saleDetailTotals({ ...pix, total: 140 }).total, 140)
  const pixHtml = renderSaleDetail(pix, (value) => `R$ ${value}`)
  assertEquals(pixHtml.includes("R$ 150"), true)
  assertEquals(pixHtml.includes("Desconto Pix"), true)
  assertEquals(pixHtml.includes("R$ 7.5"), true)
  assertEquals(pixHtml.includes("R$ 142.5"), true)
  assertEquals(whatsappLink(pix.customer_whatsapp), "https://wa.me/5511988887777")
})

Deno.test("venda parcial mostra quantas peças já foram pagas", () => {
  const sale = {
    id: 9,
    created_at: "2026-10-13T18:00:00Z",
    customer_name: "Bia",
    customer_whatsapp: "11977776666",
    payment_method: "dinheiro",
    payment_status: "partial",
    paid_items_count: 1,
    items_count: 3,
    total: 290,
    items: [
      { code: "AN581-R", name: "Anel rosa", quantity: 1, unit_price: 120, paid_at: "2026-10-12T15:00:00Z" },
      { code: "BR200", name: "Brinco gota", quantity: 1, unit_price: 80, paid_at: null },
      { code: "CO300", name: "Colar", quantity: 1, unit_price: 90, paid_at: null }
    ]
  }
  const list = renderRecentSales([sale], (value) => `R$ ${value}`)
  assertEquals(list.includes("pay-badge--partial"), true)
  assertEquals(list.includes("Parcial"), true)
  assertEquals(list.includes("1 de 3 peças pagas"), true)
  assertEquals(list.includes(">Pago<"), false)

  const html = renderSaleDetail(sale, (value) => `R$ ${value}`)
  assertEquals(html.includes("pay-badge--partial"), true)
  assertEquals(html.includes("1 de 3 peças pagas"), true)
  assertEquals(html.includes("piece-pay--paid"), true)
  assertEquals(html.includes("Paga em"), true)
  assertEquals(html.includes("12/10/2026"), true)
  assertEquals(html.includes("piece-pay--open"), true)
  assertEquals(html.includes("A receber"), true)
  assertEquals(html.includes("Anel rosa"), true)
  assertEquals(html.includes("Brinco gota"), true)
  assertEquals(/editar|cancelar/i.test(html), false)
})

Deno.test("o resumo do mês mostra peças, vendas e a comissão do servidor", () => {
  assertEquals(paidPiecesLabel(5, 2), "5 peças pagas em 2 vendas")
  assertEquals(paidPiecesLabel(1, 1), "1 peça paga em 1 venda")
  const month = {
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
  const card = monthCardFromSummary(month, { name: "Ana Souza" })
  assertEquals(card.chargedTotal, 0.11)
  assertEquals(card.commission, 0.03)
  assertEquals(card.paidCount, 2)
  assertEquals(card.paidOrdersCount, 1)
  assertEquals(card.piecesLabel, "2 peças pagas em 1 venda")
  assertEquals(card.note, "30% de cada peça paga.")
  assertEquals(monthCardFromSummary({
    charged_total: 1000,
    commission_amount: 285,
    commission_percent: 30,
    sem_comissao: false,
    paid_count: 5,
    paid_orders_count: 2
  }, { name: "Ana Souza" }).commission, 285)

  const none = monthCardFromSummary({
    month: "2026-10",
    paid_count: 2,
    paid_orders_count: 1,
    charged_total: 800,
    commission_percent: 0,
    commission_amount: 0,
    sem_comissao: true
  }, { name: "Ana Souza" })
  assertEquals(none.commission, 0)
  assertEquals(none.piecesLabel, "2 peças pagas em 1 venda")
  assertEquals(none.note, "Sem comissão nesta conta.")
})

Deno.test("409 de estoque avisa e deixa ajustar a quantidade", () => {
  const adjusted = applyStockIssues([
    { id: "c:5", code: "CJ099-O", component_id: 5, quantity: 1, stock: 2 },
    { id: 2, code: "AN519-O", quantity: 2, stock: 4 }
  ], [
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
      code: "AN519-O",
      name: "Anel Liso Vazado Ajustável",
      available: 1,
      reason: "insufficient",
      product_code: "AN519-O",
      product_name: "Anel Liso Vazado Ajustável",
      requested: 2
    }
  ])
  assertEquals(adjusted.pieces.map((piece) => piece.id), [2])
  assertEquals(adjusted.pieces[0].quantity, 1)
  assertEquals(adjusted.pieces[0].stock, 1)
  assertEquals(adjusted.message.includes("Brinco (CJ099-O) acabou de esgotar. Disponível: 0."), true)
  assertEquals(adjusted.message.includes("Anel Liso Vazado Ajustável não tem essa quantidade. Disponível: 1."), true)
})

Deno.test("vendedora não admin manda o seller_id do perfil e não o formulário antigo", async () => {
  const built = buildCreateSaleBody({
    sellerId: 2,
    customer: { id: 4 },
    paymentStatus: "paid",
    paymentMethod: "dinheiro",
    pieces: [{ id: 9, code: "AN", name: "Anel", quantity: 1, unit_price: 100 }]
  })
  assertEquals(built.ok, true)
  if (!built.ok) return
  assertEquals(built.body.seller_id, 2)
  assertEquals("unit_price" in built.body, false)
  const page = await Deno.readTextFile(new URL("./nova-venda.js", import.meta.url))
  assertEquals(page.includes("state.seller = profile.user"), true)
  assertEquals(page.includes("sellerId: state.seller?.seller_id"), true)
  assertEquals(page.includes("saleSellerChoice"), false)
  const html = await Deno.readTextFile(new URL("./nova-venda.html", import.meta.url))
  assertEquals(html.includes('id="sale-form"'), false)
  assertEquals(html.includes("Registrar vendas"), false)
  const hub = await Deno.readTextFile(new URL("../admin/vendedoras.html", import.meta.url))
  assertEquals(hub.includes("Registrar vendas"), false)
  assertEquals(hub.includes("Venda avulsa"), false)
  assertEquals(hub.includes('href="/vendas"'), false)
})

Deno.test("o atalho da equipe abre a venda nova", async () => {
  const hub = await Deno.readTextFile(new URL("../admin/vendedoras.html", import.meta.url))
  const link = hub.match(/<a\b[^>]*href="\/vendas\/nova"[^>]*>/)
  assert(link, "falta o link /vendas/nova")
  assertEquals(link[0].includes("hidden"), false)
  assertEquals(hub.includes('href="/vendas"'), false)
  assertEquals(hub.includes("Venda avulsa"), false)
  assertEquals(hub.includes("Nova venda"), true)
  assertEquals(hub.includes("Ainda desligada"), false)
})

Deno.test("marketplace fica ligado e monta o corpo do contrato real", async () => {
  assertEquals(MARKETPLACE_SALE_ENABLED, true)
  assertEquals(shouldShowMarketplaceSale(), true)
  assertEquals(marketplaceLabel("shopee"), "Shopee")
  assertEquals(marketplaceLabel("mercado_livre"), "Mercado Livre")
  assertEquals(marketplaceLabel("tiktok"), "TikTok Shop")
  assertEquals(
    MARKETPLACE_PLATFORMS.map((item) => item.id),
    ["shopee", "mercado_livre", "tiktok"]
  )
  assertEquals(
    MARKETPLACE_PLATFORMS.map((item) => item.label),
    ["Shopee", "Mercado Livre", "TikTok Shop"]
  )

  assertEquals(marketplaceLine({ id: 12, code: "AN581-R", quantity: 1 }), {
    product_code: "AN581-R",
    quantity: 1
  })
  assertEquals(marketplaceLine({ id: "c:9", component_id: 9, item_type: "component", quantity: 2 }), {
    component_id: 9,
    quantity: 2
  })

  const pieces = [{ id: 12, code: "AN581-R", quantity: 1 }]
  for (const channel of ["shopee", "mercado_livre", "tiktok"]) {
    const builtChannel = buildMarketplaceSaleBody({ channel, pieces })
    assertEquals(builtChannel.ok, true)
    assertEquals(builtChannel.body.channel, channel)
  }

  const built = buildMarketplaceSaleBody({
    channel: "shopee",
    pieces,
    clientRequestId: "11111111-1111-1111-1111-111111111111",
    notes: "SP-99"
  })
  assertEquals(built.ok, true)
  assertEquals(built.body.seller_id, undefined)
  assertEquals(built.body.channel, "shopee")
  assertEquals(built.body.customer, undefined)
  assertEquals(built.body.payment_status, undefined)
  assertEquals(built.body.notes, "SP-99")
  assertEquals(built.body.items, [{ product_code: "AN581-R", quantity: 1 }])
  assertEquals(built.body.client_request_id, "11111111-1111-1111-1111-111111111111")

  assertEquals(buildMarketplaceSaleBody({
    channel: "outro",
    pieces: [{ id: 1, code: "X", quantity: 1 }]
  }).ok, false)
  assertEquals(buildMarketplaceSaleBody({
    channel: "TikTok Shop",
    pieces: [{ id: 1, code: "X", quantity: 1 }]
  }).ok, false)

  assertEquals(cancelMarketplaceOrderPayload(55), { ok: true, body: { order_id: 55 } })
  assertEquals(cancelMarketplaceOrderPayload(55, "erro"), {
    ok: true,
    body: { order_id: 55, reason: "erro" }
  })
  assertEquals(isMarketplaceSale({ channel: "marketplace" }), true)
  assertEquals(isMarketplaceSale({ source: "marketplace", channel: "tiktok" }), true)
  assertEquals(marketplacePlatformOf({ channel: "tiktok" }), "tiktok")
  assertEquals(isMarketplaceSale({ channel: "equipe" }), false)

  const html = renderSaleDetail({
    id: 55,
    source: "marketplace",
    channel: "shopee",
    status: "pago",
    total: 100,
    created_at: "2026-10-14T15:00:00Z",
    items: [{ code: "AN581-R", name: "Anel", quantity: 1, unit_price: 100 }]
  }, (value) => `R$ ${value}`, { allowCancel: true })
  assert(html.includes("Shopee"))
  assert(html.includes("sem comissão"))
  assert(html.includes('data-cancel-order="55"'))

  const page = await Deno.readTextFile(new URL("./nova-venda.html", import.meta.url))
  assert(page.includes('id="marketplace-sale-btn"'))
  assert(page.includes('data-marketplace="shopee">Shopee<'))
  assert(page.includes('data-marketplace="mercado_livre">Mercado Livre<'))
  assert(page.includes('data-marketplace="tiktok">TikTok Shop<'))
  assert(page.includes('id="marketplace-notes"'))
  assertEquals(page.includes("external-order-id"), false)
  const contract = await Deno.readTextFile(new URL("../../../docs/contratos/venda-marketplace.md", import.meta.url))
  assert(contract.includes("register-marketplace-order"))
  assert(contract.includes("cancel-marketplace-order"))
  assert(contract.includes('"channel"'))
  assert(contract.includes("product_code"))
  assertEquals(contract.includes("marketplace-sale-create"), false)
  assertEquals(contract.includes("payment_status"), false)
})

Deno.test("a função antiga de venda fica só no changelog", async () => {
  const retired = ["register", "sale"].join("-")
  const root = new URL("../../../", import.meta.url)
  const hits: string[] = []
  async function walk(dir: URL) {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.name === ".git" || entry.name === "node_modules") continue
      const next = new URL(entry.name + (entry.isDirectory ? "/" : ""), dir)
      if (entry.isDirectory) {
        await walk(next)
        continue
      }
      if (!/\.(js|ts|html|css|md|json|yml)$/.test(entry.name)) continue
      if (next.pathname.endsWith("/CHANGELOG.md")) continue
      const text = await Deno.readTextFile(next)
      if (text.includes(retired)) hits.push(next.pathname)
    }
  }
  await walk(root)
  assertEquals(hits, [])
})
