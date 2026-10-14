import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  orderPaidHint,
  paidIdsToRemove,
  rowsForUnpaidView,
  toggleSaleSelection,
  withoutPaidIds,
} from "./contas.logic.js"

const order = [
  { id: 1, order_id: 40, product_name: "Anel", is_paid: false, status: "active" },
  { id: 2, order_id: 40, product_name: "Brinco", is_paid: false, status: "active" },
  { id: 3, order_id: 40, product_name: "Colar", is_paid: true, status: "active" },
  { id: 4, order_id: 41, product_name: "Pulseira", is_paid: false, status: "active" }
]

Deno.test("a receber esconde peça já paga e mantém as outras do mesmo pedido", () => {
  assertEquals(rowsForUnpaidView(order).map((row) => row.id), [1, 2, 4])
})

Deno.test("marcar uma peça não seleciona as outras do mesmo pedido", () => {
  const selected = toggleSaleSelection(new Set(), 1)
  assertEquals([...selected], ["1"])
  const rows = order.filter((row) => selected.has(String(row.id)))
  assertEquals(rows.map((row) => row.product_name), ["Anel"])
  assertEquals(rows.some((row) => row.id === 2), false)
})

Deno.test("depois de pagar, só a peça marcada sai e o resto do pedido fica", () => {
  const removed = paidIdsToRemove([1, 2], { ok: true, count: 1, ids: [1] })
  assertEquals(removed, [1])
  const left = withoutPaidIds(rowsForUnpaidView(order), removed)
  assertEquals(left.map((row) => row.id), [2, 4])
  assertEquals(left.some((row) => row.is_paid === true), false)
})

Deno.test("sem os ids confirmados a lista não apaga peça no escuro", () => {
  assertEquals(paidIdsToRemove([1, 2], { ok: true, count: 1 }), [])
  assertEquals(paidIdsToRemove([1], { ok: true, count: 1 }), [1])
})

Deno.test("a dica do pedido só entra quando a linha traz as contagens", () => {
  assertEquals(orderPaidHint(order[0]), "")
  assertEquals(orderPaidHint({
    id: 2,
    order_id: 40,
    order_piece_count: 3,
    order_paid_count: 1
  }), "pedido #40: 1 de 3 peças pagas")
  assertEquals(orderPaidHint({ id: 2, order_id: 40, order_piece_count: 1, order_paid_count: 0 }), "")
})

Deno.test("a tela tira só a peça paga e não agrupa pelo pedido", async () => {
  const source = await Deno.readTextFile(new URL("./contas.js", import.meta.url))
  for (const name of [
    "toggleSaleSelection",
    "rowsForUnpaidView",
    "paidIdsToRemove",
    "withoutPaidIds",
    "orderPaidHint",
    "quiet"
  ]) {
    assert(source.includes(name), name)
  }
  assertEquals(source.includes("order_id"), false)
})
