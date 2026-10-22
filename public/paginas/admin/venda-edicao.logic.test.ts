import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  ADMIN_SALE_EDIT_ENABLED,
  daysSince,
  filterSalesByChannel,
  filterSalesBySeller,
  filterSalesByStatus,
  isSaleOverdueReceivable,
  normalizeAdminSale,
  normalizeSaleItems,
  parseMoneyInput,
  readSaleEditForm,
  isSaleBugged,
  renderSaleCards,
  renderSaleEditDialog,
  saleCancelPayload,
  saleChannelLabel,
  saleMarkPaidPayload,
  saleMetaChipsHtml,
  salePrimaryPhoto,
  saleStatusLabel,
  saleStatusTone,
  saleUpdatePayload,
  shouldShowSaleEdit,
  canReturnItem,
  confirmOrderPayload,
  normalizeExpiringOrders,
  renderExpiringOrderCards,
  reserveHint,
  returnOrderItemsPayload,
} from "./venda-edicao.logic.js"

const formatMoney = (value: number) => `R$ ${Number(value).toFixed(2).replace(".", ",")}`

Deno.test("a edição de venda no painel fica ligada ao contrato do back #18", async () => {
  assertEquals(ADMIN_SALE_EDIT_ENABLED, true)
  assertEquals(shouldShowSaleEdit(), true)
  assertEquals(shouldShowSaleEdit(false), false)
  const source = await Deno.readTextFile(new URL("./venda-edicao.logic.js", import.meta.url))
  assertEquals(source.includes("export const ADMIN_SALE_EDIT_ENABLED = true"), true)
  assertEquals(saleChannelLabel("mercado_livre"), "Mercado Livre")
  assertEquals(saleChannelLabel("tiktok"), "TikTok Shop")
})

Deno.test("filtra vendas por canal ou vendedora e monta cards com chip de status", () => {
  const sales = [
    {
      id: 1,
      channel: "shopee",
      customer_name: "Ana",
      seller_id: null,
      seller_name: "",
      total: 200,
      payment_status: "paid",
      created_at: "2026-10-14T15:00:00Z",
      items_count: 1,
      items: [{ code: "AN1", name: "Anel", quantity: 1, image_url: "https://exemplo.test/a.jpg" }],
    },
    {
      id: 2,
      channel: "equipe",
      customer_name: "Lia",
      seller_id: 2,
      seller_name: "Marineide",
      total: 190,
      payment_status: "receivable",
      created_at: "2026-10-14T16:00:00Z",
      items_count: 2,
      items: [],
    },
  ]
  assertEquals(filterSalesByChannel(sales, "shopee").map((s) => s.id), [1])
  assertEquals(filterSalesByChannel(sales, "").length, 2)
  assertEquals(filterSalesBySeller(sales, { seller_id: 2, name: "Marineide" }).map((s) => s.id), [2])
  assertEquals(filterSalesBySeller(sales, { name: "Marineide" }).map((s) => s.id), [2])
  assertEquals(filterSalesByStatus(sales, "paid").map((s) => s.id), [1])
  assertEquals(filterSalesByStatus(sales, "receivable").map((s) => s.id), [2])
  assertEquals(filterSalesByStatus(sales, "all").length, 2)
  assertEquals(filterSalesByStatus([...sales, { id: 3, payment_status: "cancelled" }], "all").length, 2)
  assertEquals(filterSalesByStatus([...sales, { id: 3, payment_status: "cancelled" }], "cancelled").map((s) => s.id), [3])
  assertEquals(filterSalesByStatus([{ id: 9, payment_status: "a_confirmar" }], "a_confirmar").map((s) => s.id), [9])
  assertEquals(salePrimaryPhoto(sales[0]), "https://exemplo.test/a.jpg")
  assertEquals(salePrimaryPhoto(sales[1]), "")

  const cards = renderSaleCards(sales, formatMoney)
  assert(cards.includes("Ana"))
  assert(cards.includes("Lia"))
  assert(cards.includes('data-sale-id="1"'))
  assert(cards.includes("https://exemplo.test/a.jpg"))
  assert(cards.includes("Marineide"))
  assert(cards.includes("sale-chip--paid"))
  assert(cards.includes("sale-chip--receivable"))
})

Deno.test("status do plano vira etiqueta com tom certo", () => {
  assertEquals(saleStatusLabel("paid"), "Paga")
  assertEquals(saleStatusLabel("receivable"), "A receber")
  assertEquals(saleStatusLabel("partial"), "A confirmar")
  assertEquals(saleStatusLabel("a_confirmar"), "A confirmar")
  assertEquals(saleStatusTone("a_confirmar"), "confirm")
  assertEquals(saleStatusLabel("cancelled"), "Cancelada")
  assertEquals(saleStatusTone("paid"), "paid")
  assertEquals(saleStatusTone("receivable"), "receivable")
  assertEquals(saleStatusTone("partial"), "confirm")
  assertEquals(saleStatusTone("cancelled"), "cancelled")
})

Deno.test("o diálogo de edição só libera ações com a flag ligada", () => {
  const sale = {
    id: 10,
    channel: "equipe",
    customer_name: "Lia",
    seller_name: "Marineide",
    total: 190,
    payment_status: "receivable",
    payment_method: "pix",
    created_at: "2026-10-14T15:00:00Z",
    items_count: 1,
    items: [{
      id: 7,
      code: "AN581-R",
      name: "Anel rosa",
      quantity: 1,
      unit_price: 190,
      component_id: 13,
      image_url: "https://exemplo.test/anel.jpg",
    }],
  }
  const off = renderSaleEditDialog(sale, formatMoney, { enabled: false })
  assert(off.includes("Lia"))
  assert(off.includes("Fechar"))
  assertEquals(off.includes("sale-edit-save"), false)
  assertEquals(off.includes("sale-edit-paid"), false)
  assertEquals(off.includes("ADMIN_SALE_EDIT_ENABLED"), false)
  assertEquals(off.includes("docs/contratos"), false)
  assertEquals(off.includes("detalhe ainda sem foto"), false)
  assert(off.includes("sale-chip--seller"))
  assert(off.includes("sale-chip--receivable"))
  assert(off.includes("sale-chip--method"))
  assert(off.includes("https://exemplo.test/anel.jpg"))
  assert(off.includes("sale-edit__piece-photo"))

  const withoutItems = renderSaleEditDialog({
    ...sale,
    items: [],
    items_count: 2,
    customer_name: "Flor",
  }, formatMoney, { enabled: false })
  assert(withoutItems.includes("2 peça(s)."))
  assertEquals(withoutItems.includes("detalhe ainda sem foto"), false)
  assert(withoutItems.includes("FL") || withoutItems.includes("sale-card__photo--empty"))

  const on = renderSaleEditDialog(sale, formatMoney, { enabled: true })
  assert(on.includes("sale-edit-save"))
  assert(on.includes("sale-edit-paid"))
  assert(on.includes("sale-edit-cancel"))
  assert(on.includes("sale-edit-total"))
  assert(on.includes('data-item-id="7"'))
  assert(on.includes("Devolver peça"))
  assert(on.includes('data-return-item="7"'))
  assert(on.includes("sale-return-btn"))
  assertEquals(on.includes("width:100%"), false)
  assertEquals(on.includes("width: 100%"), false)
  assert(off.includes("Devolver peça"))
  const returned = renderSaleEditDialog({
    ...sale,
    items: [{ ...sale.items[0], id: 8, status: "devolvido" }],
  }, formatMoney, { enabled: true })
  assertEquals(returned.includes("Devolver peça"), false)
  assertEquals(canReturnItem({ id: 7 }), true)
  assertEquals(canReturnItem({ id: 7, status: "ativo" }), true)
  assertEquals(canReturnItem({ id: 0 }), false)
  assertEquals(returnOrderItemsPayload(10, 7), { order_id: 10, item_ids: [7], restore_stock: true })
  assertEquals(returnOrderItemsPayload(10, 0), null)
  assertEquals(confirmOrderPayload(10), { order_id: 10 })
  assert(on.includes('data-code="AN581-R"'))
  assert(on.includes('data-component-id="13"'))
  assert(on.includes("sale-edit__piece-photo"))
  assertEquals(normalizeSaleItems(sale.items)[0].code, "AN581-R")
})

Deno.test("readSaleEditForm e payloads do back #18", () => {
  const root = {
    getAttribute(name: string) {
      return name === "data-sale-id" ? "55" : null
    },
    querySelector(sel: string) {
      if (sel === "#sale-edit-total") return { value: "210,50" }
      return null
    },
    querySelectorAll() {
      return [{
        getAttribute(name: string) {
          if (name === "data-item-id") return "7"
          if (name === "data-code") return "AN581-R"
          if (name === "data-component-id") return "13"
          return null
        },
        querySelector(sel: string) {
          if (sel.includes("name")) return { value: "Anel" }
          if (sel.includes("quantity")) return { value: "2" }
          if (sel.includes("unit_price")) return { value: "100" }
          return null
        },
      }]
    },
  }
  const form = readSaleEditForm(root as never)
  assertEquals(form, {
    id: "55",
    total: "210,50",
    pieces: [{
      id: "7",
      code: "AN581-R",
      component_id: "13",
      name: "Anel",
      quantity: "2",
      unit_price: "100",
    }],
  })
  assertEquals(readSaleEditForm(null), null)

  assertEquals(saleUpdatePayload(55, form), {
    order_id: 55,
    total: 210.5,
    items: [{ id: 7, code: "AN581-R", component_id: 13, quantity: 2, unit_price: 100 }],
  })
  assertEquals(saleCancelPayload(55), { order_id: 55 })
  assertEquals(saleMarkPaidPayload(55), { order_id: 55 })

  const normalized = normalizeAdminSale({
    sale: {
      id: 55,
      seller_name: "Marineide",
      payment_status: "paid",
      payment_method: "pix",
      channel: "equipe",
      customer_name: "Lia",
      total: 190,
      items: [{ id: 7, code: "AN581-R", name: "Anel", quantity: 1, unit_price: 190, image_url: "https://exemplo.test/a.jpg" }],
    },
  })
  assertEquals(normalized?.id, 55)
  assertEquals(normalized?.seller_name, "Marineide")
  assertEquals(normalized?.payment_status, "paid")
  assertEquals(normalized?.items[0].image_url, "https://exemplo.test/a.jpg")
})

Deno.test("etapa 3: identifica venda a receber há mais de 7 dias e renderiza chip de atraso", () => {
  const baseTime = new Date("2026-10-25T12:00:00Z")

  // Venda criada há 10 dias, status a receber
  const overdueSale = {
    payment_status: "receivable",
    created_at: "2026-10-15T12:00:00Z",
    seller_name: "Marineide",
  }
  assertEquals(isSaleOverdueReceivable(overdueSale, baseTime), true)
  assertEquals(daysSince(overdueSale.created_at, baseTime), 10)

  // Venda criada há 3 dias, status a receber
  const recentReceivable = {
    payment_status: "receivable",
    created_at: "2026-10-22T12:00:00Z",
  }
  assertEquals(isSaleOverdueReceivable(recentReceivable, baseTime), false)

  // Venda criada há 15 dias, mas já paga
  const paidOldSale = {
    payment_status: "paid",
    created_at: "2026-10-10T12:00:00Z",
  }
  assertEquals(isSaleOverdueReceivable(paidOldSale, baseTime), false)

  // Chip renderizado na venda com atraso
  const chipsHtml = saleMetaChipsHtml(overdueSale, baseTime)
  assert(chipsHtml.includes("sale-chip--overdue"))
  assert(chipsHtml.includes("⏳ 10d em aberto"))
  assert(chipsHtml.includes("sale-chip--receivable"))
})

Deno.test("valor da edição de venda aceita ponto decimal do banco (bug venda #146)", () => {
  assertEquals(parseMoneyInput("882,55"), 882.55)
  assertEquals(parseMoneyInput("882.55"), 882.55)
  assertEquals(parseMoneyInput("882.6"), 882.6)
  assertEquals(parseMoneyInput("56.81"), 56.81)
  assertEquals(parseMoneyInput("1.234,56"), 1234.56)
  assertEquals(parseMoneyInput("1.234"), 1234)
  assertEquals(parseMoneyInput("R$ 90,13"), 90.13)
  assertEquals(parseMoneyInput("929"), 929)
  assertEquals(parseMoneyInput(94.87), 94.87)
  assertEquals(parseMoneyInput(""), null)
  assertEquals(parseMoneyInput("abc"), null)
  // Salvar sem mexer: o campo vem "94.87" e a peça "56.81"; nada multiplica por 100.
  assertEquals(saleUpdatePayload(147, {
    total: "94.87",
    pieces: [{ id: "1", code: "X", quantity: "1", unit_price: "56.81" }],
  }), { order_id: 147, total: 94.87, items: [{ id: 1, code: "X", quantity: 1, unit_price: 56.81 }] })
})

Deno.test("venda sem peças ou com total zerado mostra aviso no diálogo e no card", () => {
  const bugged = { id: 90, customer_name: "Zé", total: 0, payment_status: "paid", items_count: 0, items: [] }
  assert(isSaleBugged(bugged))
  assert(isSaleBugged({ ...bugged, total: 50 }))
  assert(isSaleBugged({ ...bugged, total: null, items_count: 2 }))
  assertEquals(isSaleBugged({ id: 91, total: 50, items_count: 1, items: [] }), false)
  assert(renderSaleEditDialog(bugged, formatMoney, { enabled: true }).includes("sale-bug-warning"))
  assert(renderSaleCards([bugged], formatMoney).includes("sale-chip--bug"))
  const ok = { id: 92, total: 50, items_count: 1, items: [{ code: "A1", quantity: 1 }] }
  assertEquals(renderSaleEditDialog(ok, formatMoney, { enabled: true }).includes("sale-bug-warning"), false)
  assertEquals(renderSaleCards([ok], formatMoney).includes("sale-chip--bug"), false)
})

Deno.test("pedidos a confirmar destacam a reserva e confirmam pelo order_id", () => {
  const orders = normalizeExpiringOrders({
    ok: true,
    orders: [{
      id: 12,
      customer_name: "Lia",
      seller_name: "Marineide",
      hours_left: 2.5,
      reserved_until: "2026-10-22T18:00:00Z",
      items: [{ id: 7, product_code: "AN01", product_name: "Anel", quantity: 1 }],
    }, {
      id: 13,
      customer_name: "Bia",
      hours_left: 20,
      items: [],
    }],
  })
  assertEquals(orders?.[0].payment_status, "a_confirmar")
  assertEquals(orders?.[0].items[0].code, "AN01")
  assertEquals(reserveHint(2.5), { urgent: true, text: "Reserva acaba em 2,5 h" })
  assertEquals(reserveHint(0).text, "Reserva vencendo")
  assertEquals(reserveHint(20).urgent, false)
  const html = renderExpiringOrderCards(orders)
  assert(html.includes("Lia"))
  assert(html.includes('class="sale-card sale-card--stack sale-card--expiring" data-sale-id="12"'))
  assert(html.includes('class="sale-card sale-card--stack" data-sale-id="13"'))
  assert(html.includes("Reserva acaba em 2,5 h"))
  assert(html.includes('data-confirm-order="12"'))
  assert(html.includes("Confirmar pedido"))
  assert(html.includes("sale-confirm-btn"))
  assertEquals(html.includes("width:100%"), false)
})
