import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  ADMIN_SALE_EDIT_ENABLED,
  filterSalesByChannel,
  filterSalesBySeller,
  normalizeAdminSale,
  normalizeSaleItems,
  readSaleEditForm,
  renderSaleCards,
  renderSaleEditDialog,
  saleCancelPayload,
  saleChannelLabel,
  saleMarkPaidPayload,
  salePrimaryPhoto,
  saleStatusLabel,
  saleStatusTone,
  saleUpdatePayload,
  shouldShowSaleEdit,
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
  assertEquals(normalized?.payment_method, "pix")
  assertEquals(normalized?.items[0].image_url, "https://exemplo.test/a.jpg")
})
