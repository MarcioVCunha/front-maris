import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts"
import {
  ADMIN_CONJUNTOS_ENABLED,
  divisionSkuPayload,
  divisionsOf,
  filterPiecesByQuery,
  piecesWithDivisions,
  piecesWithoutDivisions,
  renderConjuntoCreatePicker,
  renderConjuntoEditDialog,
  renderConjuntosPage,
  saveDivisionsPayload,
  shouldShowConjuntos,
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

Deno.test("ADMIN_CONJUNTOS_ENABLED começa desligada até o back PR #17", () => {
  assertEquals(ADMIN_CONJUNTOS_ENABLED, false)
  assertEquals(shouldShowConjuntos(), false)
  assertEquals(shouldShowConjuntos(true), true)
})

Deno.test("divisionsOf e filtros de peças com/sem divisões", () => {
  assertEquals(divisionsOf(setPiece).length, 2)
  assertEquals(piecesWithDivisions([setPiece, plainPiece]).map((p) => p.code), ["CJ100-O"])
  assertEquals(piecesWithoutDivisions([setPiece, plainPiece]).map((p) => p.code), ["AN581-R"])
  assertEquals(filterPiecesByQuery([setPiece, plainPiece], "anel").map((p) => p.code), ["AN581-R"])
})

Deno.test("payload e validação das divisões usam % preço e SKU código-DIVISAO", () => {
  const payload = saveDivisionsPayload("CJ100-O", setPiece.components)
  assertEquals(payload.product_code, "CJ100-O")
  assertEquals(payload.components[0].sku, "CJ100-O-BRINCO")
  assertEquals(payload.components[0].price_percent, 45)
  assertEquals(validateDivisionsPayload(payload), "")
  assert(validateDivisionsPayload({ product_code: "CJ100-O", components: [] }))
  assert(
    validateDivisionsPayload({
      product_code: "CJ100-O",
      components: [{ name: "Brinco", quantity: 1, price_percent: 0, sku: "CJ100-O-BRINCO" }],
    }).includes("%"),
  )
  const auto = divisionSkuPayload("CJ100-O", { name: "Brinco", quantity: 1, price_percent: 40 })
  assertEquals(auto.sku, "CJ100-O-BRINCO")
})

Deno.test("com flag off a página Conjuntos usa o editor legado de SKU", () => {
  const html = renderConjuntosPage([setPiece], { enabled: false })
  assert(html.includes("Conjuntos"))
  assert(html.includes("tipos-form"))
  assert(html.includes("DIVISAO"))
  assert(!html.includes("conjunto-create-open"))
  assert(!html.includes("entity-card"))
})

Deno.test("com flag on a página mostra cards e criar divisões", () => {
  const html = renderConjuntosPage([setPiece], { enabled: true })
  assert(html.includes("conjunto-create-open"))
  assert(html.includes("entity-card"))
  assert(html.includes("CJ100-O-BRINCO"))
  assert(html.includes("data-product-code=\"CJ100-O\""))
  assert(html.includes("45%"))
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
