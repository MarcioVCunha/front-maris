import { assert, assertEquals } from "jsr:@std/assert@1"

const SUPABASE_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2"
const INTEGRITY = "sha384-WgXwGL6fUsYJWNaKJgVbrJKGRQwc1vieh2oy4kw9nXqpNDz3tdSsqEYUgeHD/NuF"

Deno.test("vercel.json publica CSP, referrer, nosniff e Permissions-Policy", async () => {
  const config = JSON.parse(await Deno.readTextFile(new URL("./vercel.json", import.meta.url)))
  const block = config.headers?.find((item: { source: string }) => item.source === "/(.*)")
  assert(block, "falta o bloco headers")
  const headers = Object.fromEntries(
    block.headers.map((item: { key: string; value: string }) => [item.key, item.value])
  )
  const csp = headers["Content-Security-Policy"]
  assert(csp, "falta Content-Security-Policy")
  for (const part of [
    "default-src 'self'",
    "https://cdn.jsdelivr.net",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "'unsafe-inline'",
    "img-src 'self' data: blob: https:",
  ]) {
    assert(csp.includes(part), `CSP sem ${part}`)
  }
  assertEquals(headers["X-Content-Type-Options"], "nosniff")
  assertEquals(headers["Referrer-Policy"], "strict-origin-when-cross-origin")
  assert(headers["Permissions-Policy"]?.includes("camera=()"))
  assert(headers["Permissions-Policy"]?.includes("microphone=()"))
  assert(headers["Permissions-Policy"]?.includes("geolocation=()"))
})

Deno.test("todo script supabase-js@2.117.2 tem integrity e crossorigin", async () => {
  const files: string[] = []
  async function walk(dir: string) {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`
      if (entry.isDirectory) await walk(path)
      else if (entry.name.endsWith(".html")) files.push(path)
    }
  }
  await walk(new URL("./public", import.meta.url).pathname)
  let found = 0
  for (const file of files) {
    const text = await Deno.readTextFile(file)
    if (!text.includes(SUPABASE_SRC)) continue
    found += 1
    assert(text.includes(INTEGRITY), `${file} sem integrity`)
    assert(text.includes('crossorigin="anonymous"'), `${file} sem crossorigin`)
    assert(!text.includes(`${SUPABASE_SRC}"></script>`), `${file} ainda tem script sem integrity`)
    assert(!text.includes(`${SUPABASE_SRC}"><\\/script>`), `${file} ainda injeta script sem integrity`)
  }
  assert(found >= 14, `esperava os HTMLs com supabase-js, achei ${found}`)
})
