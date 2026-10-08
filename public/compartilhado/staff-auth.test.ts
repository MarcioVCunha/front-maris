// Sessão Supabase da equipe, papéis e o que cada menu mostra.
import { assert, assertEquals } from "jsr:@std/assert@1"

const local = memoryStorage()
const session = memoryStorage()
const calls: unknown[][] = []
let profileResult: { user: Record<string, unknown> | null; error: { message: string } | null } = {
  user: { id: "1", email: "ana@loja.test", name: "Ana", role: "seller" },
  error: null
}
let sessionForGet: { access_token?: string } | null = null

const locationState = {
  pathname: "/equipe",
  search: "",
  hash: "",
  origin: "https://loja.test",
  href: "https://loja.test/equipe",
  replace(url: string) {
    this.href = url
  }
}

const documentStub = {
  readyState: "complete",
  currentScript: null,
  documentElement: { style: {} as Record<string, string> },
  addEventListener() {},
  querySelectorAll() {
    return []
  },
  getElementById() {
    return null
  }
}

const sb = {
  auth: {
    onAuthStateChange() {
      calls.push(["onAuthStateChange"])
      return { data: { subscription: { unsubscribe() {} } } }
    },
    async signInWithPassword(creds: { email: string; password: string }) {
      calls.push(["signIn", creds])
      if (creds.password === "errada") {
        return { data: { session: null }, error: { message: "Invalid login credentials" } }
      }
      const stored = {
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_at: Math.floor(Date.now() / 1000) + 3600
      }
      local.setItem("sb-abc-auth-token", JSON.stringify(stored))
      return { data: { session: stored }, error: null }
    },
    async signOut() {
      calls.push(["signOut"])
      local.removeItem("sb-abc-auth-token")
    },
    async resetPasswordForEmail(email: string, opts: { redirectTo: string }) {
      calls.push(["reset", email, opts])
      return { error: null }
    },
    async updateUser(body: { password: string }) {
      calls.push(["update", body])
      return { data: { user: { id: "1" } }, error: null }
    },
    async refreshSession() {
      calls.push(["refresh"])
      return { data: { session: null }, error: { message: "no" } }
    },
    async getSession() {
      calls.push(["getSession"])
      return { data: { session: sessionForGet }, error: null }
    }
  }
}

const staffData: {
  FUNCTIONS: { staffMe: string }
  fetchStaffProfile?: () => Promise<typeof profileResult>
} = {
  FUNCTIONS: { staffMe: "staff-me" },
  async fetchStaffProfile() {
    return profileResult
  }
}

const win = {
  location: locationState,
  localStorage: local,
  sessionStorage: session,
  document: documentStub,
  ENV: {
    SUPABASE_URL: "https://abc.supabase.co",
    fn(name: string) {
      return `https://abc.supabase.co/functions/v1/${name}`
    }
  },
  MarisStaffData: staffData,
  MarisUtils: {
    createSupabaseClient() {
      return sb
    }
  },
  supabase: {
    createClient() {
      return sb
    }
  }
}

function pinWindow() {
  ;(globalThis as Record<string, unknown>).window = win
  ;(globalThis as Record<string, unknown>).document = documentStub
  ;(globalThis as Record<string, unknown>).sessionStorage = session
}

pinWindow()
await import("./staff-auth.js")

const Auth = (win as Record<string, unknown>).MarisStaffAuth as {
  ADMIN_ONLY_PATHS: string[]
  storageKey: () => string
  getToken: () => string
  isValid: () => boolean
  authHeaders: () => Record<string, string>
  safeNextPath: (raw: string | null) => string
  normalizeStaffUser: (raw: unknown) => { role: string; name: string; email: string } | null
  accessDecision: (input: { pathname: string; role: string | null; hasSession: boolean; optional: boolean }) => string
  menuFor: (role: string) => Record<string, boolean>
  isAdminOnlyPath: (pathname: string) => boolean
  saleSellerChoice: (user: { role?: string; seller_id?: number | null } | null) => { mode: string; sellerId: number | null; message: string }
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  signInAndLoadProfile: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: { role: string } }>
  requestPasswordReset: (email: string) => Promise<{ ok: boolean }>
  passwordError: (password: string, confirm?: string) => string
  loginErrorMessage: (error: string) => string
  resetRequestMessage: (result: { ok?: boolean; error?: string }) => { type: string; text: string }
  loadProfile: () => Promise<{ ok: boolean; user?: { role: string }; error?: string }>
  prepareRecoverySession: () => Promise<{ ok: boolean; error?: string }>
  signUp?: unknown
}

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null
    },
    setItem(key: string, value: string) {
      data.set(key, String(value))
    },
    removeItem(key: string) {
      data.delete(key)
    },
    clear() {
      data.clear()
    }
  }
}

function storeSession(sessionBody: Record<string, unknown>) {
  local.setItem(Auth.storageKey(), JSON.stringify(sessionBody))
}

Deno.test("a sessão fica na chave do Supabase e ignora o token antigo", () => {
  pinWindow()
  local.clear()
  session.clear()
  assertEquals(Auth.storageKey(), "sb-abc-auth-token")
  session.setItem("maris_staff_token", "legado.token.antigo")
  assertEquals(Auth.getToken(), "")
  assertEquals(Auth.isValid(), false)

  storeSession({
    access_token: "access-ok",
    refresh_token: "refresh-ok",
    expires_at: Math.floor(Date.now() / 1000) + 3600
  })
  assertEquals(Auth.getToken(), "access-ok")
  assertEquals(Auth.authHeaders(), { Authorization: "Bearer access-ok" })

  storeSession({ access_token: "vencido", expires_at: 10 })
  assertEquals(Auth.isValid(), false)
  assertEquals(Auth.authHeaders(), {})
})

Deno.test("vendedora entra em vendas, carrinhos e tipos; o resto é admin", () => {
  pinWindow()
  const sellerPages = ["/", "/vendedoras", "/vendas", "/carrinhos-clientes", "/carrinho-cliente", "/tipos-produto"]
  const adminPages = ["/admin", "/importar", "/adicionar-peca", "/promocoes", "/contas-vendedoras", "/lista-espera"]
  for (const pathname of sellerPages) {
    assertEquals(
      Auth.accessDecision({ pathname, role: "seller", hasSession: true, optional: false }),
      "allow",
      pathname
    )
  }
  for (const pathname of adminPages) {
    assertEquals(
      Auth.accessDecision({ pathname, role: "seller", hasSession: true, optional: false }),
      "deny",
      pathname
    )
    assertEquals(
      Auth.accessDecision({ pathname, role: "admin", hasSession: true, optional: false }),
      "allow",
      pathname
    )
  }
  assertEquals(Auth.isAdminOnlyPath("/tipos-produto"), false)
  assertEquals(Auth.ADMIN_ONLY_PATHS.includes("/tipos-produto"), false)
  assertEquals([...Auth.ADMIN_ONLY_PATHS].sort(), [...adminPages].sort())
  assertEquals(
    Auth.accessDecision({ pathname: "/vendas", role: null, hasSession: false, optional: false }),
    "login"
  )
  assertEquals(
    Auth.accessDecision({ pathname: "/equipe", role: null, hasSession: false, optional: false }),
    "allow"
  )
  assertEquals(
    Auth.accessDecision({ pathname: "/equipe/nova-senha", role: null, hasSession: false, optional: false }),
    "allow"
  )
})

Deno.test("a vendedora vende só pela própria conta", () => {
  pinWindow()
  assertEquals(Auth.saleSellerChoice({ role: "seller", seller_id: 7 }), {
    mode: "locked",
    sellerId: 7,
    message: ""
  })
  assertEquals(Auth.saleSellerChoice({ role: "seller", seller_id: null }), {
    mode: "unlinked",
    sellerId: null,
    message: "Esta conta não está ligada a uma vendedora. Peça para completar o cadastro."
  })
  assertEquals(Auth.saleSellerChoice({ role: "admin", seller_id: null }).mode, "pick")
  assertEquals(Auth.saleSellerChoice({ role: "admin", seller_id: 4 }).mode, "pick")
})

Deno.test("o menu da vendedora inclui tipos e esconde o resto da administração", () => {
  pinWindow()
  assertEquals(Auth.menuFor("seller"), {
    homeAdmin: false,
    homeTipos: true,
    homeVendedoras: true,
    homeCatalogo: true,
    vendas: true,
    carrinhos: true,
    tipos: true,
    listaEspera: false,
    contas: false,
    importar: false,
    adicionarPeca: false,
    promocoes: false
  })
  assertEquals(Auth.menuFor("admin"), {
    homeAdmin: true,
    homeTipos: false,
    homeVendedoras: true,
    homeCatalogo: true,
    vendas: true,
    carrinhos: true,
    tipos: true,
    listaEspera: true,
    contas: true,
    importar: true,
    adicionarPeca: true,
    promocoes: true
  })
})

Deno.test("só aceita papel admin ou seller e caminhos internos", () => {
  pinWindow()
  assertEquals(Auth.normalizeStaffUser({ id: "1", email: "a@b.c", name: "", role: "ADMIN" })?.role, "admin")
  assertEquals(Auth.normalizeStaffUser({ id: "1", email: "a@b.c", role: "seller" })?.name, "a@b.c")
  assertEquals(Auth.normalizeStaffUser({ id: "1", email: "a@b.c", role: "seller" })?.seller_id, null)
  assertEquals(Auth.normalizeStaffUser({ id: "1", email: "a@b.c", role: "staff" }), null)
  assertEquals(Auth.normalizeStaffUser({ role: "seller" }), null)
  const shared = Auth.normalizeStaffUser({
    id: null,
    email: null,
    name: "Senha compartilhada",
    role: "admin",
    seller_id: null
  })
  assertEquals(shared?.name, "Senha compartilhada")
  assertEquals(shared?.role, "admin")
  assertEquals(shared?.seller_id, null)
  const linked = Auth.normalizeStaffUser({
    id: "u1",
    email: "ana@loja.test",
    name: "Ana",
    role: "seller",
    seller_id: "7"
  })
  assertEquals(linked?.seller_id, 7)
  assertEquals(Auth.safeNextPath("/vendas?id=1"), "/vendas?id=1")
  assertEquals(Auth.safeNextPath("//evil.test"), "/")
  assertEquals(Auth.safeNextPath("https://evil.test"), "/")
  assertEquals(Auth.safeNextPath("/\\\\evil"), "/")
  assertEquals(Auth.safeNextPath("/%2F%2Fevil"), "/")
  assertEquals(Auth.safeNextPath("/equipe"), "/")
  assertEquals(Auth.safeNextPath("/equipe/nova-senha"), "/")
})

Deno.test("entrar confirma o perfil e recusa quem não é da equipe", async () => {
  pinWindow()
  calls.length = 0
  profileResult = {
    user: { id: "1", email: "ana@loja.test", name: "Ana", role: "seller" },
    error: null
  }
  const signed = await Auth.signIn("  Ana@Loja.Test ", "segredo")
  assertEquals(signed.ok, true)
  assertEquals(calls[0], ["signIn", { email: "ana@loja.test", password: "segredo" }])

  const okProfile = await Auth.signInAndLoadProfile("Ana@Loja.Test", "segredo")
  assertEquals(okProfile.ok, true)
  assertEquals(okProfile.user?.role, "seller")

  profileResult = { user: null, error: { message: "Não é da equipe" } }
  calls.length = 0
  const denied = await Auth.signInAndLoadProfile("ana@loja.test", "segredo")
  assertEquals(denied.ok, false)
  assertEquals(denied.error, "Não é da equipe")
  assert(calls.some((call) => call[0] === "signOut"))

  profileResult = { user: { id: "1", email: "ana@loja.test", name: "Ana", role: "guest" }, error: null }
  const unknown = await Auth.signInAndLoadProfile("ana@loja.test", "segredo")
  assertEquals(unknown.ok, false)
  assertEquals(unknown.error, "Seu acesso não tem um papel reconhecido.")
})

Deno.test("esqueci a senha manda para /equipe/nova-senha", async () => {
  pinWindow()
  calls.length = 0
  const result = await Auth.requestPasswordReset("  Ana@Loja.Test ")
  assertEquals(result.ok, true)
  assertEquals(calls.at(-1), ["reset", "ana@loja.test", { redirectTo: "https://loja.test/equipe/nova-senha" }])
  assertEquals(Auth.passwordError("curta", "curta"), "A senha precisa ter pelo menos 8 caracteres.")
  assertEquals(Auth.passwordError("12345678", "12345679"), "As senhas não conferem.")
  assertEquals(Auth.passwordError("12345678", "12345678"), "")
  assertEquals(Auth.loginErrorMessage("Invalid login credentials"), "E-mail ou senha incorretos.")
  const generic = "Se esse e-mail estiver cadastrado na equipe, enviamos um link para criar uma nova senha."
  assertEquals(Auth.resetRequestMessage({ ok: true }).text, generic)
  assertEquals(Auth.resetRequestMessage({ ok: false, error: "User not found" }).type, "success")
  assertEquals(Auth.resetRequestMessage({ ok: false, error: "rate limit" }).type, "error")
})

Deno.test("o perfil usa staff-me e a recuperação não espera se a sessão já existe", async () => {
  pinWindow()
  profileResult = {
    user: { id: "1", email: "ana@loja.test", name: "Ana", role: "seller" },
    error: null
  }
  staffData.fetchStaffProfile = async () => profileResult
  const viaData = await Auth.loadProfile()
  assertEquals(viaData.user?.role, "seller")

  delete staffData.fetchStaffProfile
  storeSession({
    access_token: "access-ok",
    expires_at: Math.floor(Date.now() / 1000) + 3600
  })
  const originalFetch = globalThis.fetch
  let seenUrl = ""
  let seenAuth = ""
  globalThis.fetch = ((_url: string, init?: RequestInit) => {
    seenUrl = String(_url)
    seenAuth = new Headers(init?.headers).get("Authorization") || ""
    return Promise.resolve(new Response(JSON.stringify({
      ok: true,
      user: { id: "2", email: "bia@loja.test", name: "Bia", role: "admin" }
    }), { status: 200 }))
  }) as typeof fetch
  try {
    const viaFetch = await Auth.loadProfile()
    assertEquals(viaFetch.user?.role, "admin")
    assertEquals(seenUrl, "https://abc.supabase.co/functions/v1/staff-me")
    assertEquals(seenAuth, "Bearer access-ok")
  } finally {
    globalThis.fetch = originalFetch
    staffData.fetchStaffProfile = async () => profileResult
  }

  sessionForGet = { access_token: "recovery" }
  locationState.search = ""
  locationState.hash = ""
  const ready = await Auth.prepareRecoverySession()
  assertEquals(ready.ok, true)

  sessionForGet = null
  const missing = await Auth.prepareRecoverySession()
  assertEquals(missing.ok, false)
  assertEquals("signUp" in Auth, false)
})

const publicRoot = new URL("../", import.meta.url)

function anchor(html: string, href: string) {
  const match = html.match(new RegExp(`<a\\b[^>]*href="${href}"[^>]*>`))
  if (!match) throw new Error(`link ausente: ${href}`)
  return match[0]
}

async function readPublic(path: string) {
  return await Deno.readTextFile(new URL(path, publicRoot))
}

Deno.test("os menus escondem administração da vendedora e mostram tipos", async () => {
  const index = await readPublic("index.html")
  const homeAdmin = anchor(index, "/admin")
  const homeTipos = anchor(index, "/tipos-produto")
  assert(homeAdmin.includes('data-staff-min="admin"'))
  assert(homeAdmin.includes("hidden"))
  assert(homeTipos.includes('data-staff-only="seller"'))
  assert(homeTipos.includes("hidden"))
  assertEquals(index.includes("clearToken"), false)

  const hub = await readPublic("paginas/admin/vendedoras.html")
  assertEquals(anchor(hub, "/vendas").includes("data-staff-min"), false)
  assertEquals(anchor(hub, "/carrinhos-clientes").includes("data-staff-min"), false)
  assert(anchor(hub, "/lista-espera").includes('data-staff-min="admin"'))
  assert(anchor(hub, "/contas-vendedoras").includes('data-staff-min="admin"'))
  assert(anchor(hub, "/tipos-produto").includes('data-staff-only="seller"'))

  const tipos = await readPublic("paginas/estoque/tipos-produto/tipos-produto.html")
  assert(anchor(tipos, "/admin").includes('data-staff-min="admin"'))
  assert(anchor(tipos, "/vendedoras").includes('data-staff-only="seller"'))

  const equipe = await readPublic("paginas/admin/equipe.html")
  assertEquals(equipe.includes("verify-staff-access"), false)
  assertEquals(equipe.includes("signUp("), false)

  const vendas = await readPublic("paginas/vendas/vendas.js")
  const vendaCarrinho = await readPublic("paginas/vendas/carrinho-cliente.js")
  assert(vendas.includes("saleSellerChoice"))
  assert(vendas.includes('auth: "staff"'))
  assert(vendaCarrinho.includes('auth: "staff"'))
  assert(vendas.includes("error.message"))
})

Deno.test("páginas da equipe carregam a sessão antes do gate e o catálogo público não muda", async () => {
  const order = [
    "/env.js",
    "@supabase/supabase-js@2.117.2",
    "/compartilhado/utils.js",
    "/compartilhado/api.js",
    "/compartilhado/staff-data.js",
    "/compartilhado/staff-auth.js"
  ]
  const staffPages = [
    "index.html",
    "paginas/admin/equipe.html",
    "paginas/admin/nova-senha.html",
    "paginas/admin/admin.html",
    "paginas/admin/vendedoras.html",
    "paginas/vendas/vendas.html",
    "paginas/vendas/carrinhos-clientes.html",
    "paginas/vendas/carrinho-cliente.html",
    "paginas/vendas/lista-espera.html",
    "paginas/vendedoras/contas.html",
    "paginas/estoque/tipos-produto/tipos-produto.html",
    "paginas/estoque/promocoes/promocoes.html",
    "paginas/estoque/importar/importar.html",
    "paginas/estoque/adicionar-peca/adicionar-peca.html"
  ]
  for (const page of staffPages) {
    const html = await readPublic(page)
    let at = -1
    for (const part of order) {
      const found = html.indexOf(part)
      assert(found > at, `${page} deve carregar ${part} depois do script anterior`)
      at = found
    }
  }

  for (const page of [
    "paginas/catalogo/catalogo.html",
    "paginas/catalogo/carrinho.html",
    "paginas/catalogo/cesta-compartilhada.html"
  ]) {
    const html = await readPublic(page)
    assertEquals(html.includes("staff-auth.js"), false, page)
  }

  const vercel = JSON.parse(await Deno.readTextFile(new URL("../../vercel.json", import.meta.url)))
  const rewrite = vercel.rewrites.find((item: { source: string }) => item.source === "/equipe/nova-senha")
  assertEquals(rewrite.destination, "/paginas/admin/nova-senha.html")
})

async function walkSource(dir: URL): Promise<string[]> {
  const hits: string[] = []
  for await (const entry of Deno.readDir(dir)) {
    const next = new URL(entry.name + (entry.isDirectory ? "/" : ""), dir)
    if (entry.isDirectory) hits.push(...(await walkSource(next)))
    else if (entry.name.endsWith(".js") || entry.name.endsWith(".html")) {
      const text = await Deno.readTextFile(next)
      if (text.includes("signUp(")) hits.push(next.pathname)
    }
  }
  return hits
}

Deno.test("não há cadastro público", async () => {
  assertEquals(await walkSource(publicRoot), [])
})
