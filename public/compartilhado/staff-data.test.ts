// Contrato do cliente das funções da equipe (window.MarisStaffData).
import { assertEquals } from "jsr:@std/assert@1"

type Call = { url: string; options: Record<string, unknown> }

const calls: Call[] = []
let nextResponse: { ok: boolean; status: number; data: unknown } = {
  ok: true,
  status: 200,
  data: {}
}

const win: Record<string, unknown> = {
  ENV: {
    fn(name: string) {
      return `https://example.test/functions/v1/${name}`
    }
  },
  MarisApi: {
    async callFunction(url: string, options: Record<string, unknown>) {
      calls.push({ url, options })
      return nextResponse
    }
  }
}
;(globalThis as Record<string, unknown>).window = win
await import("./staff-data.js")

const Staff = win.MarisStaffData as {
  FUNCTIONS: Record<string, string>
  listSales: (mode: string) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>
  markSalesPaid: (ids: number[]) => Promise<{ data: unknown; error: { message: string } | null }>
  listActiveSellers: () => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>
  listProductComponents: () => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>
  saveProductComponents: (
    code: string,
    rows: Array<Record<string, unknown>>
  ) => Promise<{ data: unknown; error: { message: string } | null }>
}

function reset(response?: { ok: boolean; status: number; data: unknown }) {
  calls.length = 0
  nextResponse = response || { ok: true, status: 200, data: {} }
}

Deno.test("listSales unpaid pede status active e paid unpaid com auth staff", async () => {
  reset({
    ok: true,
    status: 200,
    data: {
      sales: [
        { id: 1, status: "active", is_paid: false, created_at: "2024-01-01T00:00:00Z" },
        { id: 2, status: "active", is_paid: null, created_at: "2024-06-01T00:00:00Z" },
        { id: 3, status: "active", is_paid: true, created_at: "2024-07-01T00:00:00Z" },
        { id: 4, status: "cancelled", is_paid: false, created_at: "2024-08-01T00:00:00Z" }
      ]
    }
  })
  const res = await Staff.listSales("unpaid")
  assertEquals(res.error, null)
  assertEquals(res.data?.map((row) => row.id), [2, 1])
  assertEquals(calls[0].url, "https://example.test/functions/v1/list-sales?status=active&paid=unpaid")
  assertEquals(calls[0].options.auth, "staff")
  assertEquals(calls[0].options.method, "GET")
})

Deno.test("listSales paid ordena por paid_at e manda paid=paid", async () => {
  reset({
    ok: true,
    status: 200,
    data: {
      sales: [
        { id: 1, status: "active", is_paid: true, paid_at: "2024-01-02T00:00:00Z", created_at: "2024-01-01T00:00:00Z" },
        { id: 2, status: "active", is_paid: true, paid_at: null, created_at: "2024-08-01T00:00:00Z" },
        { id: 3, status: "active", is_paid: true, paid_at: "2024-05-02T00:00:00Z", created_at: "2024-05-01T00:00:00Z" }
      ]
    }
  })
  const res = await Staff.listSales("paid")
  assertEquals(res.data?.map((row) => row.id), [3, 1, 2])
  assertEquals(calls[0].url, "https://example.test/functions/v1/list-sales?status=active&paid=paid")
})

Deno.test("listSales all e cancelled usam os filtros combinados", async () => {
  reset({ ok: true, status: 200, data: { sales: [] } })
  await Staff.listSales("all")
  assertEquals(calls[0].url, "https://example.test/functions/v1/list-sales?status=active&paid=all")
  reset({ ok: true, status: 200, data: [] })
  await Staff.listSales("cancelled")
  assertEquals(calls[0].url, "https://example.test/functions/v1/list-sales?status=cancelled")
})

Deno.test("listSales aceita array cru e propaga erro HTTP", async () => {
  reset({ ok: true, status: 200, data: [{ id: 9, status: "cancelled", created_at: "2024-01-01T00:00:00Z" }] })
  const okRes = await Staff.listSales("cancelled")
  assertEquals(okRes.data?.map((row) => row.id), [9])

  reset({ ok: false, status: 401, data: { error: "Sem acesso" } })
  const errRes = await Staff.listSales("unpaid")
  assertEquals(errRes.data, null)
  assertEquals(errRes.error?.message, "Sem acesso")
})

Deno.test("markSalesPaid envia sale_ids e exige ok", async () => {
  reset({ ok: true, status: 200, data: { ok: true, count: 2 } })
  const res = await Staff.markSalesPaid([3, 3, 0, 8])
  assertEquals(res.error, null)
  assertEquals(calls[0].url, "https://example.test/functions/v1/mark-sales-paid")
  assertEquals(calls[0].options.auth, "staff")
  assertEquals(calls[0].options.body, { sale_ids: [3, 8] })

  reset({ ok: true, status: 200, data: { ok: false, error: "Não deu" } })
  const failed = await Staff.markSalesPaid([1])
  assertEquals(failed.error?.message, "Não deu")

  reset()
  const empty = await Staff.markSalesPaid([])
  assertEquals(empty.error?.message, "Nenhuma venda selecionada.")
  assertEquals(calls.length, 0)
})

Deno.test("listActiveSellers ordena por nome e ignora inativas", async () => {
  reset({
    ok: true,
    status: 200,
    data: {
      sellers: [
        { id: 2, name: "Bia", is_active: true },
        { id: 3, name: "Ana", is_active: false },
        { id: 1, name: "Caio" }
      ]
    }
  })
  const res = await Staff.listActiveSellers()
  assertEquals(res.data?.map((row) => row.name), ["Bia", "Caio"])
  assertEquals(calls[0].url, "https://example.test/functions/v1/list-sellers")
  assertEquals(calls[0].options.auth, "staff")
})

Deno.test("componentes: lista e grava o conjunto final sem id nulo", async () => {
  reset({
    ok: true,
    status: 200,
    data: {
      components: [
        { id: 2, name: "Pulseira", product_code: "A" },
        { id: 1, name: "Anel", product_code: "A" }
      ]
    }
  })
  const listed = await Staff.listProductComponents()
  assertEquals(listed.data?.map((row) => row.name), ["Anel", "Pulseira"])
  assertEquals(calls[0].url, "https://example.test/functions/v1/list-product-components")

  reset({ ok: true, status: 200, data: { ok: true } })
  const saved = await Staff.saveProductComponents("BM1", [
    { id: 4, name: "Brinco", price_percent: 40, quantity: 2, is_active: true },
    { id: null, name: "Colar", price_percent: 60, quantity: 1 }
  ])
  assertEquals(saved.error, null)
  assertEquals(calls[0].options.body, {
    product_code: "BM1",
    components: [
      { id: 4, name: "Brinco", price_percent: 40, quantity: 2, is_active: true },
      { name: "Colar", price_percent: 60, quantity: 1, is_active: true }
    ]
  })
  assertEquals(calls[0].options.auth, "staff")

  reset()
  const missing = await Staff.saveProductComponents("  ", [])
  assertEquals(missing.error?.message, "Produto inválido.")
  assertEquals(calls.length, 0)
})

Deno.test("nomes das funções ficam neste mapa", () => {
  assertEquals(Staff.FUNCTIONS, {
    listSales: "list-sales",
    markSalesPaid: "mark-sales-paid",
    listSellers: "list-sellers",
    listProductComponents: "list-product-components",
    saveProductComponents: "save-product-components"
  })
})
