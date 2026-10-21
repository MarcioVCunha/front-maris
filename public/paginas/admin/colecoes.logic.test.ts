import { assertEquals } from "jsr:@std/assert@1"
import {
  computeCollectionStatus,
  filterCollections,
  filterProductsForPicker,
  formatCollectionRules,
  formatDateRange,
  renderCollectionEditDialog,
  renderCollectionsPage,
  renderSelectedPieceChips,
  slugify,
  toLocalDatetimeInput,
  validateCollectionPayload,
} from "./colecoes.logic.js"

Deno.test("slugify sanitiza texto em formato de URL amigável", () => {
  assertEquals(slugify("Dia das Mães 2026!"), "dia-das-maes-2026")
  assertEquals(slugify("Presentes até R$ 50"), "presentes-ate-r-50")
  assertEquals(slugify("  Coleção & Especial -- "), "colecao-especial")
  assertEquals(slugify(""), "")
})

Deno.test("computeCollectionStatus identifica status ativa, agendada, expirada e inativa", () => {
  const now = new Date("2026-10-15T12:00:00Z").getTime()

  // Inativa
  assertEquals(
    computeCollectionStatus({ is_active: false }, now),
    { label: "Inativa", tone: "inactive" },
  )

  // Agendada para o futuro
  assertEquals(
    computeCollectionStatus({
      is_active: true,
      starts_at: "2026-11-01T00:00:00Z",
    }, now),
    { label: "Agendada", tone: "scheduled" },
  )

  // Expirada
  assertEquals(
    computeCollectionStatus({
      is_active: true,
      ends_at: "2026-10-01T00:00:00Z",
    }, now),
    { label: "Expirada", tone: "expired" },
  )

  // Ativa
  assertEquals(
    computeCollectionStatus({
      is_active: true,
      starts_at: "2026-10-01T00:00:00Z",
      ends_at: "2026-10-31T00:00:00Z",
    }, now),
    { label: "Ativa", tone: "active" },
  )
})

Deno.test("formatCollectionRules e formatDateRange formatam visualmente", () => {
  assertEquals(
    formatCollectionRules({ max_price: 50, product_codes: ["AN1", "BR2"] }),
    "Até R$ 50,00 + 2 peça(s)",
  )
  assertEquals(
    formatCollectionRules({ max_price: 50, product_codes: [] }),
    "Até R$ 50,00",
  )
  assertEquals(
    formatCollectionRules({ max_price: null, product_codes: ["AN1"] }),
    "1 peça(s) selecionada(s)",
  )
  assertEquals(
    formatCollectionRules({ max_price: null, product_codes: [] }),
    "Todas as peças",
  )

  assertEquals(formatDateRange(null, null), "Sempre visível")
})

Deno.test("validateCollectionPayload valida campos obrigatórios e regras de negócio", () => {
  // Nome vazio
  assertEquals(validateCollectionPayload({ name: "" }).ok, false)

  // Preço inválido
  assertEquals(validateCollectionPayload({ name: "Coleção", max_price: -5 }).ok, false)

  // Válido com geração de slug automático
  const res = validateCollectionPayload({
    name: "Dia das Mães",
    max_price: "49.90",
    product_codes: ["an1", "an2", "an1"],
    is_active: true,
    sort_order: "2",
  })
  assertEquals(res.ok, true)
  if (res.ok) {
    assertEquals(res.data.name, "Dia das Mães")
    assertEquals(res.data.slug, "dia-das-maes")
    assertEquals(res.data.max_price, 49.9)
    assertEquals(res.data.product_codes, ["AN1", "AN2"])
    assertEquals(res.data.sort_order, 2)
  }
})

Deno.test("filterProductsForPicker busca por código e nome excluindo já selecionadas", () => {
  const products = [
    { code: "BM100", name: "Brinco Pérola" },
    { code: "AN200", name: "Anel Solitário" },
    { code: "CL300", name: "Colar Coração" },
  ]

  // Sem filtro: retorna unselected
  const all = filterProductsForPicker(products, "", ["BM100"])
  assertEquals(all.length, 2)
  assertEquals(all.map((p) => p.code), ["AN200", "CL300"])

  // Com busca por nome
  const byName = filterProductsForPicker(products, "solitário", [])
  assertEquals(byName.length, 1)
  assertEquals(byName[0].code, "AN200")

  // Com busca por código
  const byCode = filterProductsForPicker(products, "cl3", [])
  assertEquals(byCode.length, 1)
  assertEquals(byCode[0].code, "CL300")
})

Deno.test("filterCollections filtra lista por termo", () => {
  const collections = [
    { name: "Dia das Mães", slug: "dia-das-maes", badge_text: "Mães" },
    { name: "Presentes até R$ 50", slug: "presentes-50", badge_text: "" },
    { name: "Natal Encantado", slug: "natal", badge_text: "Natal" },
  ]

  assertEquals(filterCollections(collections, "mães").length, 1)
  assertEquals(filterCollections(collections, "50").length, 1)
  assertEquals(filterCollections(collections, "natal").length, 1)
  assertEquals(filterCollections(collections, "").length, 3)
})

Deno.test("renderCollectionsPage e renderCollectionEditDialog geram HTML válido", () => {
  const collections = [
    {
      id: 1,
      name: "Dia das Mães",
      slug: "dia-das-maes",
      badge_text: "Mães",
      max_price: null,
      product_codes: ["BM100"],
      is_active: true,
      sort_order: 1,
    },
  ]

  const pageHtml = renderCollectionsPage(collections)
  assertEquals(pageHtml.includes("Dia das Mães"), true)
  assertEquals(pageHtml.includes("data-edit-collection=\"1\""), true)
  assertEquals(pageHtml.includes("data-delete-collection=\"1\""), true)

  const dialogHtml = renderCollectionEditDialog(collections[0], [
    { code: "BM100", name: "Brinco Pérola", image_url: "https://img/1.jpg" },
  ])
  assertEquals(dialogHtml.includes("Editar Coleção"), true)
  assertEquals(dialogHtml.includes("BM100"), true)
  assertEquals(dialogHtml.includes("Brinco Pérola"), true)
})

Deno.test("renderCollectionEditDialog separa a coleção em 3 passos", () => {
  const html = renderCollectionEditDialog(null, [])
  assertEquals((html.match(/class="step-card"/g) || []).length, 3)
  assertEquals(html.includes("Nome e link"), true)
  assertEquals(html.includes("Regra automática ou peças"), true)
  assertEquals(html.includes("Período"), true)
  assertEquals(html.includes('id="collection-slug-input"'), true)
})
