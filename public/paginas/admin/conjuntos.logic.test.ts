import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts"
import {
  ADMIN_CONJUNTOS_ENABLED,
  activePercentSum,
  divisionSkuPayload,
  divisionsOf,
  filterPiecesByQuery,
  piecesWithDivisions,
  piecesWithoutDivisions,
  renderConjuntoCreatePicker,
  renderConjuntoEditDialog,
  renderConjuntosPage,
  renderStockByType,
  saveDivisionsPayload,
  shouldShowConjuntos,
  stockByDivisionType,
  validateDivisionsPayload,
} from "./conjuntos.logic.js"
import { renderEntityCard, entityPhotoHtml } from "./painel-entity.logic.js"

const setPiece = {
  code: "CJ100-O",
  name: "Conjunto flor",
  categoria: "Conjunto",
  image_url: "https://exemplo.test/cj.jpg",
  components: [
    { id: 12, name: "Brinco", sku: "CJ100-O-BRINCO", quantity: 3, price_percent: 45 },
    { id: 13, name: "Colar", sku: "CJ100-O-COLAR", quantity: 2, price_percent: 55 },
  ],
}

const plainPiece = {
  code: "AN581-R",
  name: "Anel rosa",
  categoria: "Anel",
  components: [],
}

Deno.test("ADMIN_CONJUNTOS_ENABLED fica ligada com o back PR #17", () => {
  assertEquals(ADMIN_CONJUNTOS_ENABLED, true)
  assertEquals(shouldShowConjuntos(), true)
  assertEquals(shouldShowConjuntos(false), false)
})

Deno.test("divisionsOf e filtros de peças com/sem divisões", () => {
  assertEquals(divisionsOf(setPiece).length, 2)
  assertEquals(piecesWithDivisions([setPiece, plainPiece]).map((p) => p.code), ["CJ100-O"])
  assertEquals(piecesWithoutDivisions([setPiece, plainPiece]).map((p) => p.code), ["AN581-R"])
  assertEquals(filterPiecesByQuery([setPiece, plainPiece], "anel").map((p) => p.code), ["AN581-R"])
})

Deno.test("payload admin-product-components exige % 100 e is_active boolean", () => {
  const payload = saveDivisionsPayload("CJ100-O", setPiece.components)
  assertEquals(payload.product_code, "CJ100-O")
  assertEquals(payload.components[0].name, "Brinco")
  assertEquals(payload.components[0].price_percent, 45)
  assertEquals(payload.components[0].is_active, true)
  assertEquals("sku" in payload.components[0], false)
  assertEquals(activePercentSum(payload.components), 100)
  assertEquals(validateDivisionsPayload(payload), "")
  assert(validateDivisionsPayload({ product_code: "CJ100-O", components: [] }))
  assert(
    validateDivisionsPayload({
      product_code: "CJ100-O",
      components: [
        { name: "Brinco", quantity: 1, price_percent: 40, is_active: true },
        { name: "Colar", quantity: 1, price_percent: 40, is_active: true },
      ],
    }).includes("100"),
  )
  const auto = divisionSkuPayload("CJ100-O", { name: "Brinco", quantity: 1, price_percent: 40 })
  assertEquals(auto.sku, "CJ100-O-BRINCO")
})

Deno.test("com flag on a página mostra cards, Estoque por tipo e criar divisões", () => {
  const html = renderConjuntosPage([setPiece], { enabled: true })
  assert(html.includes("conjunto-create-open"))
  assert(html.includes("entity-card"))
  assert(html.includes("CJ100-O-BRINCO"))
  assert(html.includes("data-product-code=\"CJ100-O\""))
  assert(html.includes("45%"))
  assert(html.includes("Estoque por tipo"))
  assert(html.includes("divisão de conjunto"))
})

Deno.test("Estoque por tipo agrupa quantidade por nome da divisão", () => {
  const other = {
    code: "CJ200-O",
    name: "Conjunto folha",
    components: [
      { id: 20, name: "Brinco", quantity: 1, price_percent: 50 },
      { id: 21, name: "Pulseira", quantity: 4, price_percent: 50 },
    ],
  }
  const groups = stockByDivisionType([setPiece, other])
  assertEquals(groups.find((g) => g.name === "Brinco")?.quantity, 4)
  assertEquals(groups.find((g) => g.name === "Colar")?.quantity, 2)
  assertEquals(groups.find((g) => g.name === "Pulseira")?.quantity, 4)
  const html = renderStockByType([setPiece, other])
  assert(html.includes("Brinco"))
  assert(html.includes("4 un."))
})

Deno.test("com flag off a página Conjuntos usa o editor legado de SKU", () => {
  const html = renderConjuntosPage([setPiece], { enabled: false })
  assert(html.includes("Conjuntos"))
  assert(html.includes("tipos-form"))
  assert(html.includes("DIVISAO"))
  assert(!html.includes("conjunto-create-open"))
  assert(!html.includes("entity-card"))
})

Deno.test("diálogo de edição e busca para criar divisões", () => {
  const edit = renderConjuntoEditDialog(setPiece)
  assert(edit.includes("Nome da divisão"))
  assert(edit.includes("% preço"))
  assert(edit.includes("conjunto-edit-save"))
  const picker = renderConjuntoCreatePicker([setPiece, plainPiece], "anel")
  assert(picker.includes("data-create-code=\"AN581-R\""))
  assert(!picker.includes("data-create-code=\"CJ100-O\""))
})

Deno.test("entity-card compartilhado renderiza foto e metadados", () => {
  const card = renderEntityCard({
    title: "Conjunto flor",
    meta: ["CJ100-O · Conjunto"],
    sideTitle: "2 div.",
    photo: entityPhotoHtml({ image_url: "https://exemplo.test/cj.jpg" }),
    attrs: 'data-product-code="CJ100-O"',
  })
  assert(card.includes('class="entity-card"'))
  assert(card.includes("entity-card__photo"))
  assert(card.includes("Conjunto flor"))
})
