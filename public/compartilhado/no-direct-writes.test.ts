// Nenhuma página do browser lê custo, grava tabela direto ou abre sales /
// sellers / product_components com a chave anônima.
import { assertEquals } from "jsr:@std/assert@1"

const pagesRoot = new URL("../paginas/", import.meta.url)

async function listJs(dir: URL): Promise<URL[]> {
  const out: URL[] = []
  for await (const entry of Deno.readDir(dir)) {
    const next = new URL(entry.name + (entry.isDirectory ? "/" : ""), dir)
    if (entry.isDirectory) out.push(...(await listJs(next)))
    else if (entry.name.endsWith(".js")) out.push(next)
  }
  return out
}

const forbidden: Array<{ name: string; re: RegExp }> = [
  { name: "select *", re: /\.select\(\s*["']\*["']\s*\)/ },
  { name: "coluna custo", re: /\bcusto\b/i },
  { name: "from sales", re: /\.from\(\s*["']sales["']\s*\)/ },
  { name: "from sellers", re: /\.from\(\s*["']sellers["']\s*\)/ },
  { name: "from product_components", re: /\.from\(\s*["']product_components["']\s*\)/ },
  { name: "insert", re: /\.insert\s*\(/ },
  { name: "upsert", re: /\.upsert\s*\(/ },
  { name: "update", re: /\.update\s*\(/ }
]

Deno.test("páginas não leem custo nem gravam tabelas direto", async () => {
  const files = await listJs(pagesRoot)
  assertEquals(files.length > 0, true)
  const hits: string[] = []
  for (const file of files) {
    const text = await Deno.readTextFile(file)
    for (const rule of forbidden) {
      if (rule.re.test(text)) hits.push(`${file.pathname}: ${rule.name}`)
    }
  }
  assertEquals(hits, [])
})

const repoRoot = new URL("../../", import.meta.url)
const retiredCartFunctions = [
  ["create", "shared", "basket"].join("-"),
  ["customer", "cart", "share"].join("-"),
  ["list", "shared", "carts"].join("-"),
  ["discard", "shared", "cart"].join("-"),
  ["mark", "cart", "converted"].join("-")
]

async function listRepoText(dir: URL): Promise<URL[]> {
  const out: URL[] = []
  for await (const entry of Deno.readDir(dir)) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "cov") continue
    const next = new URL(entry.name + (entry.isDirectory ? "/" : ""), dir)
    if (entry.isDirectory) out.push(...(await listRepoText(next)))
    else if (/\.(js|ts|html|css|md|json|yml)$/.test(entry.name)) out.push(next)
  }
  return out
}

Deno.test("as funções antigas de cesta compartilhada ficam só no changelog", async () => {
  const files = await listRepoText(repoRoot)
  const hits: string[] = []
  for (const file of files) {
    if (file.pathname.endsWith("/CHANGELOG.md")) continue
    const text = await Deno.readTextFile(file)
    for (const name of retiredCartFunctions) {
      if (text.includes(name)) hits.push(`${file.pathname}: ${name}`)
    }
  }
  assertEquals(hits, [])
})
