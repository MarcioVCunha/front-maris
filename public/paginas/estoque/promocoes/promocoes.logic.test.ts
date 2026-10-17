import { assertEquals, assert } from "jsr:@std/assert@1"
import {
  PROMO_CATEGORIES,
  computePromotionStatus,
  formatDiscountDisplay,
  formatDateRange,
  toLocalDatetimeInput,
  formatUnitsLimit,
  parseProductCodes,
  validatePromotionPayload,
  filterPromotions,
  filterProductsForPromo,
  renderPromoCard,
  renderPromotionsPage,
  renderPromoDialogContent,
} from "./promocoes.logic.js"

Deno.test("toLocalDatetimeInput formata data para input datetime-local", () => {
  const d = new Date(2026, 9, 16, 14, 30) // Outubro é mês 9 (0-indexed)
  assertEquals(toLocalDatetimeInput(d), "2026-10-16T14:30")
  assertEquals(toLocalDatetimeInput(""), "")
})

Deno.test("filterProductsForPromo: busca por componente", () => {
  const products = [{ code: "P1", name: "Anel" }]
  const map = { P1: [{ name: "Ouro" }] }
  assertEquals(filterProductsForPromo(products, map, "ouro").length, 1)
  assertEquals(filterProductsForPromo(products, map, "prata").length, 0)
})

Deno.test("validatePromotionPayload valida campos obrigatórios e regras de negócio", () => {
  // Caso de sucesso: Categoria
  const validCat = validatePromotionPayload({
    name: "Campanha Brincos 15%",
    scope: "categoria",
    category: "Brinco",
    discount_type: "percent",
    value: 15,
    starts_at: "2026-10-01T00:00:00.000Z",
    ends_at: "2026-10-31T23:59:59.000Z",
    max_units: 30,
    is_active: true,
  })
  assertEquals(validCat.ok, true)
  assertEquals(validCat.payload?.name, "Campanha Brincos 15%")
  assertEquals(validCat.payload?.category, "Brinco")
  assertEquals(validCat.payload?.value, 15)

  // Caso de sucesso: Produto com códigos em texto separado por vírgula
  const validProd = validatePromotionPayload({
    name: "Desconto Colares",
    scope: "produto",
    product_codes: "cl1, cl2 ; cl3",
    discount_type: "fixed",
    value: 20,
    starts_at: "2026-10-01T00:00:00.000Z",
    ends_at: "2026-10-15T00:00:00.000Z",
    max_units: "",
  })
  assertEquals(validProd.ok, true)
  assertEquals(validProd.payload?.product_codes, ["CL1", "CL2", "CL3"])
  assertEquals(validProd.payload?.max_units, null)

  // Erros de validação
  assertEquals(validatePromotionPayload({ name: "" }).ok, false)
  assertEquals(validatePromotionPayload({ name: "A", scope: "invalido" }).ok, false)
  assertEquals(validatePromotionPayload({ name: "A", scope: "categoria", category: "Inexistente" }).ok, false)
  assertEquals(validatePromotionPayload({ name: "A", scope: "produto", product_codes: "" }).ok, false)
  assertEquals(validatePromotionPayload({ name: "A", scope: "categoria", category: "Anel", discount_type: "percent", value: 150 }).ok, false)
  assertEquals(validatePromotionPayload({
    name: "A",
    scope: "categoria",
    category: "Anel",
    discount_type: "percent",
    value: 10,
    starts_at: "2026-10-20T00:00:00.000Z",
    ends_at: "2026-10-10T00:00:00.000Z", // término antes do início
  }).ok, false)
})

Deno.test("computePromotionStatus determina o status correto da promoção", () => {
  const now = Date.parse("2026-10-16T12:00:00.000Z")

  // Ativa
  assertEquals(
    computePromotionStatus({
      is_active: true,
      starts_at: "2026-10-01T00:00:00.000Z",
      ends_at: "2026-10-31T00:00:00.000Z",
      units_sold: 5,
      max_units: 10,
    }, now).tone,
    "active"
  )

  // Encerrada manualmente
  assertEquals(
    computePromotionStatus({
      is_active: false,
      starts_at: "2026-10-01T00:00:00.000Z",
      ends_at: "2026-10-31T00:00:00.000Z",
    }, now).tone,
    "ended"
  )

  // Encerrada por data
  assertEquals(
    computePromotionStatus({
      is_active: true,
      starts_at: "2026-10-01T00:00:00.000Z",
      ends_at: "2026-10-15T00:00:00.000Z",
    }, now).tone,
    "ended"
  )

  // Agendada
  assertEquals(
    computePromotionStatus({
      is_active: true,
      starts_at: "2026-10-20T00:00:00.000Z",
      ends_at: "2026-10-31T00:00:00.000Z",
    }, now).tone,
    "scheduled"
  )

  // Esgotada (atingiu o limite max_units)
  assertEquals(
    computePromotionStatus({
      is_active: true,
      starts_at: "2026-10-01T00:00:00.000Z",
      ends_at: "2026-10-31T00:00:00.000Z",
      units_sold: 10,
      max_units: 10,
    }, now).tone,
    "depleted"
  )
})

Deno.test("formatDiscountDisplay e formatUnitsLimit formatam visualmente", () => {
  assertEquals(formatDiscountDisplay({ discount_type: "percent", value: 15 }), "15% OFF")
  assertEquals(formatDiscountDisplay({ discount_type: "fixed", value: 25.5 }), "R$ 25,50 OFF")

  assertEquals(formatUnitsLimit(3, 10), "3 de 10 peças vendidas")
  assertEquals(formatUnitsLimit(4, null), "4 peça(s) vendida(s) (sem limite)")
})

Deno.test("filterPromotions filtra por termo de busca e status", () => {
  const promos = [
    { id: 1, name: "Anéis Prata", category: "Anel", product_codes: [], is_active: true, starts_at: "2026-10-01T00:00:00.000Z", ends_at: "2026-10-31T00:00:00.000Z" },
    { id: 2, name: "Colar Coração", category: null, product_codes: ["CL10"], is_active: false, starts_at: "2026-10-01T00:00:00.000Z", ends_at: "2026-10-31T00:00:00.000Z" },
    { id: 3, name: "Brincos Ouro", category: "Brinco", product_codes: [], is_active: true, starts_at: "2026-10-01T00:00:00.000Z", ends_at: "2026-10-31T00:00:00.000Z" },
  ]
  const now = Date.parse("2026-10-16T12:00:00.000Z")

  // Filtro por termo
  assertEquals(filterPromotions(promos, { term: "prata" }, now).map((p) => p.id), [1])
  assertEquals(filterPromotions(promos, { term: "CL10" }, now).map((p) => p.id), [2])

  // Filtro por status
  assertEquals(filterPromotions(promos, { status: "active" }, now).map((p) => p.id), [1, 3])
  assertEquals(filterPromotions(promos, { status: "ended" }, now).map((p) => p.id), [2])
})

Deno.test("renderPromotionsPage e renderPromoDialogContent montam o HTML com acessibilidade e dados corretos", () => {
  const promo = {
    id: 1,
    name: "Black Friday Anéis",
    scope: "categoria",
    category: "Anel",
    product_codes: [],
    discount_type: "percent",
    value: 20,
    starts_at: "2026-10-01T00:00:00.000Z",
    ends_at: "2026-10-31T00:00:00.000Z",
    max_units: 50,
    units_sold: 10,
    is_active: true
  }

  // Card
  const cardHtml = renderPromoCard(promo)
  assert(cardHtml.includes("Black Friday Anéis"))
  assert(cardHtml.includes("20% OFF"))
  assert(cardHtml.includes("Anel"))
  assert(cardHtml.includes('data-id="1"'))
  assert(cardHtml.includes("Editar"))
  assert(cardHtml.includes("Encerrar"))

  // Página com promoções
  const pageHtml = renderPromotionsPage([promo], { query: "Black", status: "all" })
  assert(pageHtml.includes("promotions-page"))
  assert(pageHtml.includes("Black Friday Anéis"))
  assert(pageHtml.includes("+ Nova promoção"))
  assert(pageHtml.includes('value="Black"'))

  // Página vazia
  const emptyPage = renderPromotionsPage([])
  assert(emptyPage.includes("Nenhuma campanha promocional cadastrada"))

  // Dialog de edição
  const dialogEdit = renderPromoDialogContent(promo)
  assert(dialogEdit.includes("Editar promoção"))
  assert(dialogEdit.includes("Black Friday Anéis"))
  assert(dialogEdit.includes('value="20"'))

  // Dialog de criação
  const dialogNew = renderPromoDialogContent(null)
  assert(dialogNew.includes("Nova promoção"))
  assert(dialogNew.includes("Salvar promoção"))
})

Deno.test("renderPromoCard exibe caixa de desempenho quando houver métricas de vendas", () => {
  const promoWithPerf = {
    id: 10,
    name: "Desconto Outono",
    scope: "categoria",
    category: "Brinco",
    product_codes: [],
    discount_type: "percent",
    value: 15,
    starts_at: "2026-10-01T00:00:00.000Z",
    ends_at: "2026-10-31T00:00:00.000Z",
    is_active: true,
    orders_count: 5,
    units_sold: 8,
    charged_total: 450.00,
    discount_total: 67.50,
    profit_total: 210.00,
  }

  const html = renderPromoCard(promoWithPerf)
  assert(html.includes("promo-perf-box"), "Deve conter a caixa de desempenho")
  assert(html.includes("Desempenho da promoção"), "Deve exibir o label de acessibilidade")
  assert(html.includes("Pedidos:</strong> 5"), "Deve exibir contagem de pedidos")
  assert(html.includes("8 peça(s) vendida(s)"), "Deve exibir peças vendidas")
  assert(html.includes("450,00"), "Deve exibir faturamento gerado")
  assert(html.includes("67,50"), "Deve exibir descontos concedidos")
  assert(html.includes("210,00"), "Deve exibir lucro estimado")
})

