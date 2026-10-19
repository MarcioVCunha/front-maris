// Prova que dado vindo do banco com <img onerror> sai escapado no HTML.
import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  renderCatalogIdentityHtml,
  renderCatalogPhotoStrip,
  renderCategoryFilterButtons,
  renderCombinaComponentCard,
  renderSearchSuggestionsHtml,
} from "../paginas/catalogo/catalogo.logic.js"
import { renderCartLineHtml } from "../paginas/catalogo/pedido.logic.js"
import {
  renderCollectionPieceSuggestions,
  renderSelectedPieceChips,
} from "../paginas/admin/colecoes.logic.js"
import { renderCouponCard, renderCouponsPage } from "../paginas/admin/cupons.logic.js"
import { renderCompras, renderStockList, renderVendas } from "../paginas/admin/painel.logic.js"
import {
  renderCategoryChipsHtml,
  renderCustomerHitHtml,
  renderPieceIdentityHtml,
  renderRecentSales,
  renderSaleDetail,
} from "../paginas/vendas/nova-venda.logic.js"
import { renderWaitlistEntryCard } from "../paginas/vendas/lista-espera.logic.js"
import { renderAccountsSaleCards } from "../paginas/vendedoras/contas.logic.js"

const XSS = `"><img src=x onerror=alert(1)>`

function assertEscaped(html: string, where: string) {
  assert(!html.includes(XSS), `${where} ainda inclui o payload cru`)
  assert(html.includes("&lt;img"), `${where} não escapou <img`)
  assert(!html.includes("<img src=x"), `${where} deixou a tag do payload`)
  assert(!html.includes("onerror=alert(1)>"), `${where} não escapou o fechamento do payload`)
}

const money = (value: unknown) => `R$ ${Number(value) || 0}`

Deno.test("catálogo escapa nome, foto, categoria e sugestão com img onerror", () => {
  assertEscaped(renderCatalogIdentityHtml(XSS, XSS), "identidade")
  assertEscaped(renderCatalogPhotoStrip([XSS], XSS), "foto")
  assertEscaped(renderCategoryFilterButtons([XSS], XSS), "categoria")
  assertEscaped(renderSearchSuggestionsHtml([
    { text: XSS, kind: "product", value: XSS, groupKey: XSS },
  ], "brinco"), "sugestão")
  assertEscaped(renderCombinaComponentCard({
    id: XSS,
    name: XSS,
    quantity: 1,
    unit_price: 10,
  }), "combina")
})

Deno.test("painel escapa peça, venda, compra, coleção e cupom com img onerror", () => {
  assertEscaped(renderStockList([{
    code: XSS,
    name: XSS,
    categoria: XSS,
    quantity: 1,
    unit_price: 10,
  }]), "estoque")
  assertEscaped(renderVendas([{
    customer_name: XSS,
    seller_name: XSS,
    channel: "loja",
    total: 10,
    created_at: "2026-10-01T12:00:00Z",
    payment_status: "paid",
    payment_method: "pix",
  }], money), "vendas")
  assertEscaped(renderCompras({
    month: "2026-10",
    total_units_sold: 1,
    total_orders_paid: 1,
    top_pieces: [{ code: XSS, name: XSS, categoria: XSS, quantity_sold: 1 }],
    restock_requests: [],
  }, money), "compras")
  assertEscaped(renderCollectionPieceSuggestions([{ code: XSS, name: XSS }]), "sugestão de coleção")
  assertEscaped(renderSelectedPieceChips([XSS], [{
    code: XSS,
    name: XSS,
    image_url: XSS,
  }]), "chip de coleção")
  assertEscaped(renderCouponCard({
    id: XSS,
    code: XSS,
    description: XSS,
    discount_type: "percent",
    discount_value: 10,
    is_referral: true,
    referrer_name: XSS,
    referrer_whatsapp: "11999999999",
  }, money), "cupom")
  assertEscaped(renderCouponsPage([], [{
    created_at: "2026-10-01T12:00:00Z",
    referrer_name: XSS,
    referrer_whatsapp: XSS,
    referee_name: XSS,
    referee_whatsapp: XSS,
    order_id: XSS,
    status: "pendente",
  }], { tab: "referrals" }), "indicação")
})

Deno.test("nova venda, contas, lista de espera e cesta escapam img onerror", () => {
  assertEscaped(renderCategoryChipsHtml([{ name: XSS, count: 1 }], "Todas"), "chip de categoria")
  assertEscaped(renderPieceIdentityHtml({ name: XSS, code: XSS }), "peça da venda")
  assertEscaped(renderCustomerHitHtml({ id: XSS, name: XSS, whatsapp: "11988887777" }, false), "cliente")
  assertEscaped(renderRecentSales([{
    id: XSS,
    customer_name: XSS,
    total: 20,
    created_at: "2026-10-01T12:00:00Z",
    payment_method: "pix",
    payment_status: "paid",
  }], money), "venda recente")
  assertEscaped(renderSaleDetail({
    id: XSS,
    customer_name: XSS,
    customer_whatsapp: "11988887777",
    created_at: "2026-10-01T12:00:00Z",
    payment_method: "pix",
    payment_status: "paid",
    items: [{ name: XSS, code: XSS, quantity: 1, unit_price: 10, image_url: XSS }],
  }, money), "detalhe da venda")
  assertEscaped(renderAccountsSaleCards([{
    id: XSS,
    product_name: XSS,
    product_code: XSS,
    seller_name: XSS,
    quantity: 1,
    total_value: 10,
    payment_method: "pix",
    status: "active",
    is_paid: false,
    created_at: "2026-10-01T12:00:00Z",
  }], {
    formatMoney: money,
    formatDate: () => "01/10/2026",
    paymentLabel: () => "Pix",
    imageUrlFor: () => XSS,
  }), "conta da vendedora")
  assertEscaped(renderWaitlistEntryCard({
    id: XSS,
    status: "waiting",
    piece_name: XSS,
    piece_code: XSS,
    buyer: { full_name: XSS, email: XSS, whatsapp: "11988887777" },
    in_stock: false,
  }), "lista de espera")
  assertEscaped(renderCartLineHtml({
    key: XSS,
    name: XSS,
    code: XSS,
    image_url: XSS,
    quantity: 1,
    available: 2,
  }, "R$ 10,00"), "linha da cesta")
})

Deno.test("payload escapado vira texto, sem tag img executável", () => {
  const html = renderPieceIdentityHtml({ name: "<img onerror=alert(1)>", code: "BR1" })
  assertEquals(html.includes("<img"), false)
  assert(html.includes("&lt;img onerror=alert(1)&gt;"))
})
