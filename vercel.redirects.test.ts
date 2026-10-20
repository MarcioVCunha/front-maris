// Links antigos da cesta compartilhada não podem abrir página de erro.
// No vercel.json, source casa o pathname e ignora a query.
import { assert, assertEquals } from "jsr:@std/assert@1"

type Rule = { source: string; destination: string; permanent?: boolean }

const LEGACY_PATHS = ["/catalog/cesta", "/catalog/cesta-compartilhada.html"]

function pathnameOf(url: string) {
  return new URL(url, "https://loja.test").pathname
}

Deno.test("cesta compartilhada antiga redireciona ao catálogo com qualquer query", async () => {
  const config = JSON.parse(await Deno.readTextFile(new URL("./vercel.json", import.meta.url))) as {
    redirects: Rule[]
    rewrites: Rule[]
  }
  const samples = [
    "https://loja.test/catalog/cesta",
    "https://loja.test/catalog/cesta?id=abc",
    "https://loja.test/catalog/cesta?id=abc&utm_source=whatsapp",
    "https://loja.test/catalog/cesta-compartilhada.html",
    "https://loja.test/catalog/cesta-compartilhada.html?id=abc"
  ]

  for (const url of samples) {
    const path = pathnameOf(url)
    assert(LEGACY_PATHS.includes(path), path)
    const rule = config.redirects.find((item) => item.source === path)
    assert(rule, `${path} precisa de redirect em vercel.json`)
    assertEquals(rule.destination, "/catalog")
    assertEquals(rule.permanent, true)
    assertEquals(rule.source.includes("?"), false)
    assertEquals(config.rewrites.some((item) => item.source === path), false)
  }

  const catalog = config.rewrites.find((item) => item.source === "/catalog")
  assertEquals(catalog?.destination, "/paginas/catalogo/catalogo.html")

  const obrigado = config.rewrites.find((item) => item.source === "/catalog/obrigado")
  assertEquals(obrigado?.destination, "/paginas/catalogo/obrigado.html")

  const trocas = config.rewrites.find((item) => item.source === "/trocas")
  assertEquals(trocas?.destination, "/paginas/institucional/trocas.html")

  const trocasHtml = config.redirects.find((item) => item.source === "/trocas.html")
  assertEquals(trocasHtml?.destination, "/trocas")
  assertEquals(trocasHtml?.permanent, true)

  const garantia = config.redirects.find((item) => item.source === "/garantia")
  assertEquals(garantia?.destination, "/trocas")
  assertEquals(garantia?.permanent, true)

  const vendedoras = config.redirects.find((item) => item.source === "/vendedoras")
  assertEquals(vendedoras?.destination, "/vendas/nova")
  assertEquals(vendedoras?.permanent, true)
})
