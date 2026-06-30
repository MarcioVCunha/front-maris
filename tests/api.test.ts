// Testes do cliente de Edge Functions (window.MarisApi.callFunction).
// api.js é script de navegador: faz `window.MarisApi = {...}` e usa `fetch`
// global, `window.ENV` e `window.MarisStaffAuth`. Shimamos tudo antes do import.
import { assertEquals } from "jsr:@std/assert@1"

// deno-lint-ignore no-explicit-any
const win: any = {
  ENV: { SUPABASE_ANON_KEY: "anon-key-123" },
  MarisStaffAuth: { authHeaders: () => ({ Authorization: "Bearer staff-token" }) }
}
// deno-lint-ignore no-explicit-any
;(globalThis as any).window = win
await import("../api.js")
const API = win.MarisApi as {
  callFunction: (
    url: string,
    options?: Record<string, unknown>
  ) => Promise<{ ok: boolean; status: number; data: unknown }>
}

type Captured = { url: string; init: RequestInit }
const originalFetch = globalThis.fetch

function mockFetch(response: { status?: number; body?: unknown; reject?: boolean }) {
  const calls: Captured[] = []
  // deno-lint-ignore no-explicit-any
  globalThis.fetch = ((url: any, init: any) => {
    calls.push({ url: String(url), init: init || {} })
    if (response.reject) return Promise.reject(new Error("network"))
    const status = response.status ?? 200
    const payload = response.body === undefined ? {} : response.body
    return Promise.resolve(
      new Response(typeof payload === "string" ? payload : JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    )
    // deno-lint-ignore no-explicit-any
  }) as any
  return calls
}

function restoreFetch() {
  globalThis.fetch = originalFetch
}

Deno.test("callFunction: POST com body envia JSON e Content-Type", async () => {
  const calls = mockFetch({ status: 200, body: { ok: true, id: 7 } })
  try {
    const res = await API.callFunction("https://x/fn", { body: { a: 1 } })
    assertEquals(res.ok, true)
    assertEquals(res.status, 200)
    assertEquals(res.data, { ok: true, id: 7 })
    assertEquals(calls.length, 1)
    assertEquals(calls[0].init.method, "POST")
    const headers = calls[0].init.headers as Record<string, string>
    assertEquals(headers["Content-Type"], "application/json")
    assertEquals(calls[0].init.body, JSON.stringify({ a: 1 }))
  } finally {
    restoreFetch()
  }
})

Deno.test("callFunction: sem body usa GET e não envia corpo", async () => {
  const calls = mockFetch({ status: 200, body: { entries: [] } })
  try {
    await API.callFunction("https://x/list", { method: "GET" })
    assertEquals(calls[0].init.method, "GET")
    assertEquals(calls[0].init.body, undefined)
    const headers = calls[0].init.headers as Record<string, string>
    assertEquals(headers["Content-Type"], undefined)
  } finally {
    restoreFetch()
  }
})

Deno.test("callFunction: auth anon adiciona Bearer da anon key", async () => {
  const calls = mockFetch({ status: 200, body: {} })
  try {
    await API.callFunction("https://x/fn", { body: {}, auth: "anon" })
    const headers = calls[0].init.headers as Record<string, string>
    assertEquals(headers.Authorization, "Bearer anon-key-123")
  } finally {
    restoreFetch()
  }
})

Deno.test("callFunction: auth staff usa MarisStaffAuth.authHeaders", async () => {
  const calls = mockFetch({ status: 200, body: {} })
  try {
    await API.callFunction("https://x/fn", { method: "GET", auth: "staff" })
    const headers = calls[0].init.headers as Record<string, string>
    assertEquals(headers.Authorization, "Bearer staff-token")
  } finally {
    restoreFetch()
  }
})

Deno.test("callFunction: resposta !ok preserva status e data.error", async () => {
  mockFetch({ status: 400, body: { error: "Dados inválidos" } })
  try {
    const res = await API.callFunction("https://x/fn", { body: {} })
    assertEquals(res.ok, false)
    assertEquals(res.status, 400)
    assertEquals(res.data, { error: "Dados inválidos" })
  } finally {
    restoreFetch()
  }
})

Deno.test("callFunction: corpo não-JSON vira objeto vazio", async () => {
  mockFetch({ status: 200, body: "not json <html>" })
  try {
    const res = await API.callFunction("https://x/fn", { body: {} })
    assertEquals(res.ok, true)
    assertEquals(res.data, {})
  } finally {
    restoreFetch()
  }
})

Deno.test("callFunction: erro de rede propaga a exceção", async () => {
  mockFetch({ reject: true })
  try {
    let threw = false
    try {
      await API.callFunction("https://x/fn", { body: {} })
    } catch {
      threw = true
    }
    assertEquals(threw, true)
  } finally {
    restoreFetch()
  }
})
