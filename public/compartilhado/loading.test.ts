import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  LOADING_ARIA_LABEL,
  SPARK_PATH,
  isLoadingMarkup,
  loadingHtml,
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

Deno.test("o CSS anima o preenchimento e respeita reduced-motion", async () => {
  const css = await Deno.readTextFile(new URL("./loading.css", import.meta.url))
  assert(css.includes("@keyframes maris-spark-fill"))
  assert(css.includes("prefers-reduced-motion"))
  assert(css.includes("animation: none"))
  assert(css.includes("fill-opacity"))
})

Deno.test("catálogo e painel usam o brilho no lugar de Carregando…", async () => {
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
  assertEquals(page.includes("Carregando…"), false)

  const catalogPage = await Deno.readTextFile(new URL("../paginas/catalogo/catalogo.html", import.meta.url))
  assert(catalogPage.includes("/compartilhado/loading.css"))
  assert(catalogPage.includes("/compartilhado/loading.js"))
  assert(catalogPage.includes("maris-loading"))

  const catalogJs = await Deno.readTextFile(new URL("../paginas/catalogo/catalogo.js", import.meta.url))
  assert(catalogJs.includes("MarisLoading"))
  assert(catalogJs.includes("catalog--loading"))

  const cartPage = await Deno.readTextFile(new URL("../paginas/catalogo/carrinho.html", import.meta.url))
  assert(cartPage.includes("/compartilhado/loading.css"))
  assert(cartPage.includes("/compartilhado/loading.js"))

  const cartJs = await Deno.readTextFile(new URL("../paginas/catalogo/carrinho.js", import.meta.url))
  assert(cartJs.includes("MarisLoading"))
})
