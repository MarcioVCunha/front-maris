import { assertEquals } from "jsr:@std/assert@1"
import {
  IMPORT_CATEGORIES,
  IMPORT_CLIENT_TIMEOUT_MS,
  IMPORT_LOADING_MESSAGE,
  buildImportPayloadFromPreview,
  filterPreviewItems,
  formatImportErrorMessage,
  formatImportSuccessMessage,
  formatMoneyBRL,
  normalizeImportRow,
  parseImportFileContent,
  parseImportJsonText,
  parseMoneyBRL,
  removePreviewItem,
  renderImportPreviewCard,
  renderImportPreviewView,
  renderImportResultView,
  updatePreviewItem,
  validatePreviewItems,
} from "./importar.logic.js"

Deno.test("parseImportJsonText: parseia array", () => {
  assertEquals(parseImportJsonText('[{"codigo":"A1"}]'), [{ codigo: "A1" }])
})

Deno.test("formatImportSuccessMessage: conta criados e atualizados", () => {
  assertEquals(
    formatImportSuccessMessage({ created: 2, updated: 1 }),
    "Importação concluída: 2 criados, 1 atualizado."
  )
})

Deno.test("importação espera pelo menos 150 segundos e avisa a demora", () => {
  assertEquals(IMPORT_CLIENT_TIMEOUT_MS >= 150000, true)
  assertEquals(IMPORT_LOADING_MESSAGE, "Importando... isso pode levar até 2 minutos")
})

Deno.test("formatImportErrorMessage: usa data.error", () => {
  assertEquals(formatImportErrorMessage({ error: "JSON inválido" }, 400), "JSON inválido")
})

Deno.test("parseMoneyBRL e formatMoneyBRL: converte moedas no padrão brasileiro", () => {
  assertEquals(parseMoneyBRL("49,90"), 49.9)
  assertEquals(parseMoneyBRL("R$ 1.250,00"), 1250)
  assertEquals(parseMoneyBRL(79.9), 79.9)
  assertEquals(isNaN(parseMoneyBRL("abc")), true)
  assertEquals(formatMoneyBRL(49.9).includes("49,90"), true)
})

Deno.test("parseImportFileContent: aceita array JSON e objeto { items: [...] }", () => {
  const jsonArr = JSON.stringify([
    { codigo: "BR01", nome: "Brinco Gota", preco_unitario: 15, quantidade: 2 }
  ])
  const res1 = parseImportFileContent(jsonArr)
  assertEquals(res1.ok, true)
  if (res1.ok) {
    assertEquals(res1.rows.length, 1)
    assertEquals(res1.rows[0].code, "BR01")
    assertEquals(res1.rows[0].name, "Brinco Gota")
    assertEquals(res1.rows[0].sellPrice, 30) // 15 * 2
    assertEquals(res1.rows[0].quantity, 2)
  }

  const jsonObj = JSON.stringify({
    items: [
      { code: "CO02", name: "Colar Corrente", unit_price: 59.9, quantity: 5 }
    ]
  })
  const res2 = parseImportFileContent(jsonObj)
  assertEquals(res2.ok, true)
  if (res2.ok) {
    assertEquals(res2.rows.length, 1)
    assertEquals(res2.rows[0].code, "CO02")
    assertEquals(res2.rows[0].sellPrice, 59.9)
  }

  assertEquals(parseImportFileContent("").ok, false)
  assertEquals(parseImportFileContent("{ quebrado: }").ok, false)
  assertEquals(parseImportFileContent("[]").ok, false)
})

Deno.test("normalizeImportRow: calcula 2x compra se não houver preço de venda e extrai fotos", () => {
  const item1 = normalizeImportRow({
    codigo: "AN01",
    nome: "Anel Solitário",
    preco_unitario: 20,
    categoria: "Anel",
    image_url: "https://example.com/foto1.jpg"
  }, 0)
  assertEquals(item1.code, "AN01")
  assertEquals(item1.purchasePrice, 20)
  assertEquals(item1.sellPrice, 40)
  assertEquals(item1.imageUrl, "https://example.com/foto1.jpg")

  const item2 = normalizeImportRow({
    code: "PU02",
    name: "Pulseira Prata",
    unit_price: 89.9,
    image_urls: ["https://example.com/f1.jpg", "https://example.com/f2.jpg"]
  }, 1)
  assertEquals(item2.code, "PU02")
  assertEquals(item2.sellPrice, 89.9)
  assertEquals(item2.imageUrl, "https://example.com/f1.jpg")
  assertEquals(item2.imageUrls.length, 2)
})

Deno.test("validatePreviewItems: detecta código faltando, duplicados e preços inválidos", () => {
  const invalidItems = [
    { _id: "1", code: "", name: "Sem Código", sellPrice: 20, quantity: 1 },
    { _id: "2", code: "P1", name: "Item Duplicado 1", sellPrice: 20, quantity: 1 },
    { _id: "3", code: "P1", name: "Item Duplicado 2", sellPrice: 0, quantity: 1 }
  ]
  const val1 = validatePreviewItems(invalidItems)
  const errors = val1.errorsByRow as Record<string, string[]>
  assertEquals(val1.isValid, false)
  assertEquals(val1.duplicates, ["P1"])
  assertEquals(errors["1"].includes("Código é obrigatório"), true)
  assertEquals(errors["2"].includes("Código duplicado no arquivo"), true)
  assertEquals(errors["3"].includes("Preço de venda deve ser maior que zero"), true)

  const validItems = [
    { _id: "1", code: "A1", name: "Anel A", sellPrice: 30, quantity: 2 },
    { _id: "2", code: "A2", name: "Anel B", sellPrice: 40, quantity: 1 }
  ]
  const val2 = validatePreviewItems(validItems)
  assertEquals(val2.isValid, true)
  assertEquals(val2.errorCount, 0)
  assertEquals(val2.totalItems, 2)
  assertEquals(val2.totalQuantity, 3)
})

Deno.test("updatePreviewItem: altera campos e converte valores com segurança", () => {
  const initial = [
    { _id: "x1", code: "BR01", name: "Brinco", sellPrice: 20, quantity: 1, categoria: "Brinco" }
  ]
  const step1 = updatePreviewItem(initial, "x1", "code", "BR01-NOVO")
  assertEquals(step1[0].code, "BR01-NOVO")

  const step2 = updatePreviewItem(step1, "x1", "sellPrice", "35,50")
  assertEquals(step2[0].sellPrice, 35.5)

  const step3 = updatePreviewItem(step2, "x1", "quantity", "4")
  assertEquals(step3[0].quantity, 4)

  const step4 = updatePreviewItem(step3, "x1", "categoria", "Colar")
  assertEquals(step4[0].categoria, "Colar")
})

Deno.test("removePreviewItem: descarta peça da prévia por id", () => {
  const items = [
    { _id: "1", code: "A1" },
    { _id: "2", code: "A2" },
    { _id: "3", code: "A3" }
  ]
  const remaining = removePreviewItem(items, "2")
  assertEquals(remaining.length, 2)
  assertEquals(remaining.map((it: { code: string }) => it.code), ["A1", "A3"])
})

Deno.test("filterPreviewItems: busca por código, nome ou categoria", () => {
  const items = [
    { _id: "1", code: "BR01", name: "Argola Ouro", categoria: "Brinco" },
    { _id: "2", code: "CO02", name: "Gargantilha", categoria: "Colar" },
    { _id: "3", code: "AN03", name: "Aliança", categoria: "Anel" }
  ]
  assertEquals(filterPreviewItems(items, "ouro").length, 1)
  assertEquals(filterPreviewItems(items, "CO02").length, 1)
  assertEquals(filterPreviewItems(items, "anel").length, 1)
  assertEquals(filterPreviewItems(items, "nada").length, 0)
  assertEquals(filterPreviewItems(items, "").length, 3)
})

Deno.test("buildImportPayloadFromPreview: monta payload pronto para a função com unit_price e aliases", () => {
  const preview = [
    {
      _id: "1",
      code: "BR10",
      name: "Brinco Flor",
      categoria: "Brinco",
      quantity: 3,
      purchasePrice: 12.5,
      sellPrice: 29.9,
      imageUrl: "https://example.com/flor.jpg",
      imageUrls: ["https://example.com/flor.jpg"],
      raw: { ncm: "71171900", peso_g: 80 }
    }
  ]
  const payload = buildImportPayloadFromPreview(preview)
  assertEquals(payload.length, 1)
  assertEquals(payload[0].codigo, "BR10")
  assertEquals(payload[0].code, "BR10")
  assertEquals(payload[0].nome, "Brinco Flor")
  assertEquals(payload[0].quantidade, 3)
  assertEquals(payload[0].unit_price, 29.9)
  assertEquals(payload[0].preco_unitario, 12.5)
  assertEquals(payload[0].ncm, "71171900")
})

Deno.test("renderImportPreviewCard e renderImportPreviewView geram marcação com dados e acessibilidade", () => {
  const item = {
    _id: "test1",
    code: "CO01",
    name: "Colar Ponto de Luz",
    categoria: "Colar",
    quantity: 2,
    purchasePrice: 15,
    sellPrice: 39.9,
    imageUrl: "https://example.com/colar.jpg",
    imageUrls: ["https://example.com/colar.jpg"]
  }
  const cardHtml = renderImportPreviewCard(item, ["Código duplicado"])
  assertEquals(cardHtml.includes("CO01"), true)
  assertEquals(cardHtml.includes("Colar Ponto de Luz"), true)
  assertEquals(cardHtml.includes("39,90"), true)
  assertEquals(cardHtml.includes("Código duplicado"), true)

  const viewHtml = renderImportPreviewView({
    items: [item],
    query: "",
    validation: { isValid: false, summary: "1 peça com pendência" }
  })
  assertEquals(viewHtml.includes("Conferência de Importação"), true)
  assertEquals(viewHtml.includes("import-preview-grid"), true)

  const resultHtml = renderImportResultView({
    successMessage: "Importação concluída: 1 criado.",
    warningText: ""
  })
  assertEquals(resultHtml.includes("Importação concluída: 1 criado."), true)
  assertEquals(resultHtml.includes("Ver peças no Estoque"), true)
})
