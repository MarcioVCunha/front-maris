import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  LOADING_ARIA_LABEL,
  SPARK_PATH,
  isLoadingMarkup,
  loadingHtml,
  skeletonProductCardHtml,
  skeletonCatalogGridHtml,
  skeletonPiecePageHtml,
  skeletonAdminDashboardHtml,
  skeletonNovaVendaGridHtml,
  skeletonCartLinesHtml
} from "./loading.js"

Deno.test("o brilho de carregamento tem status, rótulo e o caminho da estrela", () => {
  assertEquals(LOADING_ARIA_LABEL, "Carregando")
  assert(SPARK_PATH.includes("16 1.2"))
  const html = loadingHtml()
  assertEquals(isLoadingMarkup(html), true)
  assert(html.includes('role="status"'))
  assert(html.includes('aria-label="Carregando"'))
  assert(html.includes("maris-loading__spark-fill"))
  assert(html.includes("maris-loading__spark-outline"))
  assert(html.includes(SPARK_PATH))
  assertEquals(html.includes("Carregando…"), false)
  assertEquals(html.includes("spinner"), false)
})

Deno.test("o markup aceita tamanho e bloco sem perder o aria-label", () => {
  const html = loadingHtml({ size: "lg", block: true, label: "Carregando" })
  assert(html.includes("maris-loading--lg"))
  assert(html.includes("maris-loading--block"))
  assert(html.includes('aria-label="Carregando"'))
})

Deno.test("o CSS anima o preenchimento, shimmer e respeita reduced-motion", async () => {
  const css = await Deno.readTextFile(new URL("./loading.css", import.meta.url))
  assert(css.includes("@keyframes maris-spark-fill"))
  assert(css.includes("@keyframes maris-shimmer"))
  assert(css.includes(".maris-skeleton-shimmer"))
  assert(css.includes("prefers-reduced-motion"))
  assert(css.includes("animation: none"))
  assert(css.includes("fill-opacity"))
})

Deno.test("geradores de skeleton criam marcação acessível e com estrutura de layout", () => {
  const card = skeletonProductCardHtml()
  assert(card.includes("maris-skeleton-card"))
  assert(card.includes("maris-skeleton-media"))
  assert(card.includes("maris-skeleton-shimmer"))
  assert(card.includes('aria-hidden="true"'))

  const grid = skeletonCatalogGridHtml(6)
  assert(grid.includes("maris-skeleton-grid"))
  assert(grid.includes('role="status"'))
  assert(grid.includes('aria-busy="true"'))
  assert(grid.includes('aria-label="Carregando produtos"'))
  const cardCount = (grid.match(/maris-skeleton-card/g) || []).length
  assertEquals(cardCount, 6)

  const piece = skeletonPiecePageHtml()
  assert(piece.includes("maris-skeleton-piece"))
  assert(piece.includes("maris-skeleton-piece__gallery"))
  assert(piece.includes("maris-skeleton-piece__info"))
  assert(piece.includes('role="status"'))
  assert(piece.includes('aria-busy="true"'))

  const adminInicio = skeletonAdminDashboardHtml("inicio")
  assert(adminInicio.includes("maris-skeleton-admin"))
  assert(adminInicio.includes("maris-skeleton-admin__chart"))
  assert(adminInicio.includes("maris-skeleton-admin__stats"))

  const adminCupons = skeletonAdminDashboardHtml("cupons")
  assert(adminCupons.includes("maris-skeleton-admin"))
  assert(adminCupons.includes('aria-label="Carregando cupons"'))

  const adminVendedoras = skeletonAdminDashboardHtml("vendedoras")
  assert(adminVendedoras.includes("maris-skeleton-admin"))
  assert(adminVendedoras.includes('aria-label="Carregando equipe"'))

  const adminEstoque = skeletonAdminDashboardHtml("estoque")
  assert(adminEstoque.includes("maris-skeleton-admin"))
  assert(adminEstoque.includes('aria-label="Carregando estoque"'))

  const adminDefault = skeletonAdminDashboardHtml("default")
  assert(adminDefault.includes("maris-skeleton-admin"))

  const vendaGrid = skeletonNovaVendaGridHtml(4)
  assert(vendaGrid.includes("maris-skeleton-venda-grid"))
  assert(vendaGrid.includes("maris-skeleton-card--venda"))
  assertEquals((vendaGrid.match(/maris-skeleton-card--venda/g) || []).length, 4)

  const cartLines = skeletonCartLinesHtml(3)
  assert(cartLines.includes("maris-skeleton-cart-list"))
  assert(cartLines.includes("maris-skeleton-cart-line"))
  assertEquals((cartLines.match(/maris-skeleton-cart-line/g) || []).length, 3)
})

Deno.test("catálogo, painel, nova venda e carrinho integram os esqueletos e brilho", async () => {
  const painel = await Deno.readTextFile(new URL("../paginas/admin/painel.html", import.meta.url))
  assert(painel.includes("/compartilhado/loading.css"))
  assert(painel.includes("/compartilhado/loading.js"))
  assert(painel.includes("maris-loading"))
  assert(painel.includes('aria-label="Carregando"'))
  assertEquals(painel.includes("Carregando…"), false)

  const hub = await Deno.readTextFile(new URL("../paginas/admin/admin.html", import.meta.url))
  assert(hub.includes("maris-loading"))
  assert(hub.includes('aria-label="Carregando"'))
  assertEquals(hub.includes(">Carregando…<"), false)

  const page = await Deno.readTextFile(new URL("../paginas/admin/painel.js", import.meta.url))
  assert(page.includes("loadingHtml"))
  assert(page.includes("skeletonAdminDashboardHtml"))
  assertEquals(page.includes("Carregando…"), false)

  const catalogPage = await Deno.readTextFile(new URL("../paginas/catalogo/catalogo.html", import.meta.url))
  assert(catalogPage.includes("/compartilhado/loading.css"))
  assert(catalogPage.includes("/compartilhado/loading.js"))
  assert(catalogPage.includes("maris-loading"))
  assert(catalogPage.includes("maris-skeleton-grid"))

  const catalogJs = await Deno.readTextFile(new URL("../paginas/catalogo/catalogo.js", import.meta.url))
  assert(catalogJs.includes("MarisLoading"))
  assert(catalogJs.includes("catalog--loading"))
  assert(catalogJs.includes("skeletonCatalogGrid"))

  const cartPage = await Deno.readTextFile(new URL("../paginas/catalogo/carrinho.html", import.meta.url))
  assert(cartPage.includes("/compartilhado/loading.css"))
  assert(cartPage.includes("/compartilhado/loading.js"))
  assert(cartPage.includes("maris-skeleton-cart-list"))

  const cartJs = await Deno.readTextFile(new URL("../paginas/catalogo/carrinho.js", import.meta.url))
  assert(cartJs.includes("MarisLoading"))
  assert(cartJs.includes("skeletonCartLines"))

  const novaVendaPage = await Deno.readTextFile(new URL("../paginas/vendas/nova-venda.html", import.meta.url))
  assert(novaVendaPage.includes("/compartilhado/loading.css"))
  assert(novaVendaPage.includes("/compartilhado/loading.js"))

  const novaVendaJs = await Deno.readTextFile(new URL("../paginas/vendas/nova-venda.js", import.meta.url))
  assert(novaVendaJs.includes("skeletonNovaVendaGrid"))
})
