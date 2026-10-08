// Nenhuma página do browser lê custo, grava tabela direto ou abre sales /
// sellers / product_components com a chave anônima.
import { assertEquals } from "jsr:@std/assert@1"

const pagesRoot = new URL("../paginas/", import.meta.url)

async function listJs(dir: URL): Promise<string[]> {
  const out: string[] = []
  for await (const entry of Deno.readDir(dir)) {
    const next = new URL(entry.name + (entry.isDirectory ? "/" : ""), dir)
    if (entry.isDirectory) out.push(...(await listJs(next)))
    else if (entry.name.endsWith(".js")) out.push(next.pathname)
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
      if (rule.re.test(text)) hits.push(`${file}: ${rule.name}`)
    }
  }
  assertEquals(hits, [])
})
