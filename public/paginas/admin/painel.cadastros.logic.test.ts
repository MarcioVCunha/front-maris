import { assert, assertEquals } from "jsr:@std/assert@1"
import { dashboardView, navHtml } from "./painel.logic.js"
import {
  maskCpf,
  normalizeReviewList,
  renderReviewCard,
  renderReviewDialog,
  renderReviewPage,
  resolveReviewBody
} from "./painel.cadastros.logic.js"

const sample = {
  id: 12,
  field: "cpf",
  pending_value: "52998224725",
  customer_a: {
    id: 3,
    name: "Ana Lima",
    email: "ana@lojamaris.com.br",
    whatsapp: "19999998888",
    cpf: "52998224725",
    order_count: 3,
    has_login: true
  },
  customer_b: {
    id: 8,
    name: "Ana L.",
    email: "ana.loja@lojamaris.com.br",
    whatsapp: "19988887777",
    cpf: "39053344705",
    order_count: 0,
    has_login: false
  }
}

Deno.test("CPF mascarado e o campo que bateu fica em destaque nos dois lados", () => {
  assertEquals(maskCpf("529.982.247-25"), "***.***.***-25")
  assertEquals(maskCpf(""), "—")
  assertEquals(maskCpf("***.456.789-01"), "***.456.789-01")
  const html = renderReviewCard(sample)
  assert(html.includes("Ana Lima"))
  assert(html.includes("Ana L."))
  assert(html.includes("ana@lojamaris.com.br"))
  assert(html.includes("19999998888"))
  assert(html.includes("***.***.***-25"))
  assert(html.includes("***.***.***-05"))
  assertEquals(html.includes("52998224725"), false)
  assertEquals(html.includes("39053344705"), false)
  assert(html.includes("Tem login"))
  assert(html.includes("Sem login"))
  assertEquals((html.match(/review-field is-match"><dt>CPF/g) || []).length, 2)
  assert(html.includes("Bateu em CPF"))
  assert(html.includes('data-review-action="juntar"'))
  assert(html.includes('data-review-action="separado"'))
  assert(html.includes('class="btn-danger" data-review-action="excluir"'))
  assertEquals(html.includes("width:100%"), false)
  assertEquals(html.includes("width: 100%"), false)
})

Deno.test("WhatsApp em destaque e a fila vazia não inventa card", () => {
  const html = renderReviewCard({ ...sample, field: "whatsapp", pending_value: "19999998888" })
  assertEquals((html.match(/review-field is-match"><dt>WhatsApp/g) || []).length, 2)
  assert(html.includes("Bateu em WhatsApp · 19999998888"))
  assertEquals(renderReviewPage([]), `<p class="empty">Nenhum cadastro para revisar.</p>`)
  const parsed = normalizeReviewList({ pending_count: 4, reviews: [sample] })
  assertEquals(parsed.pendingCount, 4)
  assertEquals(parsed.reviews[0].accounts[0].orderCount, 3)
  assertEquals(renderReviewPage(parsed.reviews).includes("review-card"), true)
})

Deno.test("juntar, manter e excluir pedem confirmação e mandam o corpo certo", () => {
  const merge = renderReviewDialog(sample, "merge")
  assert(merge.includes("Qual cadastro fica?"))
  assert(merge.includes("Ana Lima"))
  assert(merge.includes("Ana L."))
  assert(merge.includes('name="customer_id"'))
  assert(merge.includes('value="3"'))
  assert(merge.includes('value="8"'))
  assert(merge.includes("Cancelar"))
  assertEquals(merge.includes("btn-danger"), false)
  const keep = renderReviewDialog(sample, "separado")
  assert(keep.includes("Manter separado"))
  assert(keep.includes('data-action="separado"'))
  const removing = renderReviewDialog(sample, "excluir")
  assert(removing.includes("Qual cadastro sai?"))
  assert(removing.includes('class="btn-danger"'))
  assert(removing.includes('name="customer_id"'))
  assertEquals(resolveReviewBody({ reviewId: 12, action: "juntar", customerId: 3 }), {
    ok: true,
    body: { id: 12, review_id: 12, action: "juntar", customer_id: 3 }
  })
  assertEquals(resolveReviewBody({ reviewId: 12, action: "separado" }), {
    ok: true,
    body: { id: 12, review_id: 12, action: "separado" }
  })
  assertEquals(resolveReviewBody({ reviewId: "12", action: "excluir", customerId: "8" }), {
    ok: true,
    body: { id: 12, review_id: 12, action: "excluir", customer_id: 8 }
  })
  assertEquals(resolveReviewBody({ reviewId: 12, action: "juntar" }).ok, false)
  assertEquals(resolveReviewBody({ reviewId: 12, action: "excluir" }).ok, false)
})

Deno.test("o menu lateral aponta para Revisar cadastros e mostra o contador", async () => {
  assertEquals(dashboardView("/admin/cadastros"), "cadastros")
  const plain = navHtml("inicio")
  assert(plain.includes('href="/admin/cadastros"'))
  assert(plain.includes("Revisar cadastros"))
  assertEquals(plain.includes("dash-count"), false)
  const current = navHtml("cadastros", { cadastros: 3 })
  assert(current.includes('href="/admin/cadastros" aria-current="page"'))
  assert(current.includes('class="dash-count">3'))
  const vercel = JSON.parse(await Deno.readTextFile(new URL("../../../vercel.json", import.meta.url)))
  assertEquals(
    vercel.rewrites.find((item: { source: string }) => item.source === "/admin/cadastros").destination,
    "/paginas/admin/painel.html"
  )
})
