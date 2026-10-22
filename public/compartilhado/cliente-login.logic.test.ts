import { assert, assertEquals } from "jsr:@std/assert@1"
import {
  ADDRESS_COLUMNS,
  CUSTOMER_LOGIN_PREVIEW_KEY,
  FORBIDDEN_KEYS,
  MY_ORDER_ITEMS_COLUMNS,
  MY_ORDERS_COLUMNS,
  addressFromBrasilApi,
  addressFromViaCep,
  applyCepResult,
  buildExportDownload,
  codeRequestMessage,
  containsForbiddenKey,
  accountSavedMessage,
  customerFromMe,
  customerMeRequest,
  customerPutBody,
  dataErrorMessage,
  deleteConfirmed,
  headerAccountLink,
  isCustomerLoginEnabled,
  isValidCpf,
  listMyOrders,
  loginErrorMessage,
  lookupCep,
  marketingOptInFromCustomer,
  passwordCanSubmit,
  passwordChecks,
  passwordIsValid,
  pickOrder,
  renderOrderCard,
  requestEmailCode,
  resetRequestMessage,
  safeNextPath,
  saveAddress,
  signupResultMessage,
  normalizeSignupCode,
  signupCodeCanConfirm,
  saveSignupDraft,
  readSignupDraft,
  clearSignupDraft,
  resendButtonState,
  resendCodeMessage,
  resendSignupCode,
  SIGNUP_DRAFT_KEY,
  SIGNUP_RESEND_COOLDOWN_MS,
  stripForbidden,
  validateAddress,
  validateCustomer
} from "./cliente-login.logic.js"

const STRONG = "Abcdef1!"

Deno.test("senha exige 8, maiúscula, minúscula, número e especial", () => {
  assertEquals(passwordIsValid("Abcdef1"), false)
  assertEquals(passwordIsValid("abcdef1!"), false)
  assertEquals(passwordIsValid("ABCDEF1!"), false)
  assertEquals(passwordIsValid("Abcdefg!"), false)
  assertEquals(passwordIsValid("Ab1!"), false)
  assertEquals(passwordIsValid(STRONG), true)
  assertEquals(passwordChecks(STRONG).special, true)
  assertEquals(passwordCanSubmit(STRONG, STRONG), true)
  assertEquals(passwordCanSubmit(STRONG, "Abcdef1?"), false)
  assertEquals(passwordCanSubmit("fraca", undefined), false)
})

Deno.test("erros de entrada não revelam se o e-mail existe", () => {
  const missing = loginErrorMessage({ message: "User not found" })
  const invalid = loginErrorMessage({ message: "Invalid login credentials" })
  assertEquals(missing, invalid)
  assertEquals(missing.includes("@"), false)
  assertEquals(missing.toLowerCase().includes("not found"), false)
  assertEquals(loginErrorMessage({ message: "email rate limit exceeded", status: 429 }), "Aguarde um pouco e tente de novo.")
  assertEquals(signupResultMessage(null).text, signupResultMessage({ message: "User already registered" }).text)
  assertEquals(signupResultMessage(null).type, "success")
  assertEquals(signupResultMessage({ message: "Password should be at least 8 characters" }).text, "A senha não atende às regras.")
  assertEquals(codeRequestMessage({ message: "User not found" }).type, "success")
  assertEquals(codeRequestMessage({ message: "For security purposes you can only request this once every 60 seconds" }).type, "error")
  assertEquals(resetRequestMessage({ message: "User not found" }).type, "success")
  assertEquals(resetRequestMessage({ message: "email rate limit" }).text, "Aguarde um pouco e tente de novo.")
})

Deno.test("cadastro desligado não avança como se o código tivesse sido enviado", () => {
  const blocked = signupResultMessage({ message: "Signups not allowed", status: 422 })
  assertEquals(blocked.type, "error")
  assertEquals(blocked.text, "Não foi possível criar a conta agora. Tente de novo em instantes.")
  const existing = signupResultMessage({ message: "User already registered" })
  assertEquals(existing.type, "success")
  assertEquals(existing.text, signupResultMessage(null).text)
  const server = signupResultMessage({ message: "Internal server error", status: 500 })
  assertEquals(server.type, "error")
  assertEquals(server.text, blocked.text)
  assertEquals(signupResultMessage({ message: "email rate limit exceeded", status: 429 }).text, "Aguarde um pouco e tente de novo.")
})

Deno.test("código de cadastro aceita cola, autofill e só dígitos", () => {
  assertEquals(normalizeSignupCode(" 123 456 "), "123456")
  assertEquals(normalizeSignupCode("12a34b56c789"), "123456")
  assertEquals(normalizeSignupCode("12-34"), "1234")
  assertEquals(signupCodeCanConfirm("123456"), true)
  assertEquals(signupCodeCanConfirm("123 456"), true)
  assertEquals(signupCodeCanConfirm("12345"), false)
  assertEquals(signupCodeCanConfirm(""), false)
})

Deno.test("etapa do código sobrevive ao reload e o reenvio tem cooldown", async () => {
  const store = memory()
  const now = 1_700_000_000_000
  assertEquals(readSignupDraft(store, now), null)
  const saved = saveSignupDraft(store, " Ana@Loja.Test ", now)
  assertEquals(saved?.step, "code")
  assertEquals(saved?.email, "ana@loja.test")
  assertEquals(readSignupDraft(store, now + 1000), saved)
  assertEquals(readSignupDraft(store, now + 31 * 60 * 1000), null)
  assertEquals(store.getItem(SIGNUP_DRAFT_KEY), null)

  const fresh = saveSignupDraft(store, "ana@loja.test", now)
  assertEquals(resendButtonState(fresh?.sentAt, now).disabled, true)
  assertEquals(resendButtonState(fresh?.sentAt, now + SIGNUP_RESEND_COOLDOWN_MS).text, "Reenviar código")
  assertEquals(resendButtonState(fresh?.sentAt, now + 1000).text, "Reenviar código (59s)")
  clearSignupDraft(store)
  assertEquals(readSignupDraft(store, now), null)

  const calls: string[] = []
  const client = {
    auth: {
      signUp() {
        calls.push("signUp")
        return Promise.resolve({ data: {}, error: null })
      },
      resend(args: { type: string, email: string }) {
        calls.push(`resend:${args.type}:${args.email}`)
        return Promise.resolve({ error: null })
      }
    }
  }
  const sent = await resendSignupCode(client, " Ana@Loja.Test ", "https://lojamaris.com.br/minha-conta")
  assertEquals(sent.error, null)
  assertEquals(calls, ["resend:signup:ana@loja.test"])
  assertEquals(resendCodeMessage(null).type, "success")
  assertEquals(resendCodeMessage({ message: "Signups not allowed", status: 422 }).type, "error")

  const page = await Deno.readTextFile(new URL("../paginas/conta/criar-conta.js", import.meta.url))
  const html = await Deno.readTextFile(new URL("../paginas/conta/criar-conta.html", import.meta.url))
  assertEquals(page.includes("event.preventDefault()"), true)
  assertEquals((page.match(/preventDefault\(\)/g) || []).length >= 2, true)
  assertEquals(page.includes("saveSignupDraft"), true)
  assertEquals(page.includes("readSignupDraft"), true)
  assertEquals(page.includes("resendSignupCode"), true)
  assertEquals(page.includes('getElementById("criar-codigo-confirm")'), true)
  assertEquals(html.includes('id="criar-codigo-confirm"'), true)
  assertEquals(html.includes('maxlength="6"'), false)
  assertEquals(html.includes('onsubmit="event.preventDefault()"'), true)
})

Deno.test("login fica escondido até a flag e o preview local não vale em produção", () => {
  assertEquals(isCustomerLoginEnabled({}, memory(), { hostname: "lojamaris.com.br", search: "" }), false)
  assertEquals(isCustomerLoginEnabled({}, memory(), { hostname: "lojamaris.com.br", search: "?conta=1" }), false)
  assertEquals(isCustomerLoginEnabled({ CUSTOMER_LOGIN_ENABLED: true }, memory(), { hostname: "lojamaris.com.br", search: "" }), true)
  assertEquals(isCustomerLoginEnabled({ CUSTOMER_LOGIN_ENABLED: "1" }, memory(), { hostname: "lojamaris.com.br", search: "" }), true)
  const store = memory()
  assertEquals(isCustomerLoginEnabled({}, store, { hostname: "127.0.0.1", search: "?conta=1" }), true)
  assertEquals(store.getItem(CUSTOMER_LOGIN_PREVIEW_KEY), "1")
  assertEquals(isCustomerLoginEnabled({}, store, { hostname: "127.0.0.1", search: "" }), true)
  assertEquals(headerAccountLink(false, true), { hidden: true, href: "/entrar", label: "Entrar" })
  assertEquals(headerAccountLink(true, false).label, "Entrar")
  assertEquals(headerAccountLink(true, true), { hidden: false, href: "/minha-conta", label: "Minha conta" })
})

Deno.test("next só aceita caminho interno", () => {
  assertEquals(safeNextPath("/minha-conta"), "/minha-conta")
  assertEquals(safeNextPath(""), "")
  assertEquals(safeNextPath("//loja.test"), "")
  assertEquals(safeNextPath("https://loja.test"), "")
  assertEquals(safeNextPath("/entrar"), "")
})

Deno.test("CEP usa ViaCEP e cai na BrasilAPI", async () => {
  const calls: string[] = []
  const viaFail = async (url: string) => {
    calls.push(url)
    if (url.includes("viacep")) return { ok: false, json: async () => ({}) }
    return {
      ok: true,
      json: async () => ({ cep: "13710087", state: "SP", city: "Tambaú", neighborhood: "Centro", street: "Rua Doutor Alfredo Guedes" })
    }
  }
  const found = await lookupCep("13710-087", viaFail as unknown as typeof fetch)
  assertEquals(found.ok, true)
  assertEquals(found.address?.cidade, "Tambaú")
  assertEquals(found.address?.rua, "Rua Doutor Alfredo Guedes")
  assert(calls[0].includes("viacep.com.br"))
  assert(calls[1].includes("brasilapi.com.br"))
  assertEquals(addressFromViaCep({ erro: true }), null)
  assertEquals(addressFromBrasilApi({ city: "Tambaú", state: "SP", street: "" })?.rua, "")
  const kept = applyCepResult({ numero: "47", rua: "Já preenchida" }, { rua: "", cidade: "Tambaú", uf: "SP" })
  assertEquals(kept.numero, "47")
  assertEquals(kept.rua, "Já preenchida")
  assertEquals(kept.cidade, "Tambaú")
  assertEquals((await lookupCep("123", viaFail as unknown as typeof fetch)).ok, false)
})

Deno.test("CPF, marketing desmarcado e corpo sem e-mail", () => {
  assertEquals(isValidCpf("529.982.247-25"), true)
  assertEquals(isValidCpf("111.111.111-11"), false)
  assertEquals(isValidCpf("123"), false)
  assertEquals(marketingOptInFromCustomer(null), false)
  assertEquals(marketingOptInFromCustomer(customerFromMe({ customer: { name: "Ana" } })), false)
  assertEquals(customerFromMe({ customer: { marketing_opt_in: true } })?.marketingOptIn, true)
  const body = customerPutBody({ name: "Ana", whatsapp: "19999998888", cpf: "529.982.247-25", marketingOptIn: false })
  assertEquals(body.marketing_opt_in, false)
  assertEquals(body.phone_e164, "+5519999998888")
  assertEquals(Object.hasOwn(body, "email"), false)
  assertEquals(accountSavedMessage({ needs_review: true }), "Dados salvos. Vamos confirmar seu cadastro.")
  assertEquals(accountSavedMessage({ customer: { name: "Ana" } }), "Dados salvos.")
  assertEquals(accountSavedMessage({ ok: false }), "Dados salvos.")
  assertEquals(validateCustomer({ name: "" }), "Informe o nome.")
  assertEquals(validateCustomer({ name: "Ana", cpf: "111" }), "CPF inválido.")
  assertEquals(validateAddress({ cep: "13710087", rua: "Rua", numero: "47", bairro: "Centro", cidade: "Tambaú", uf: "SP" }), "")
})

Deno.test("customer-me, endereços e pedidos não leem custo nem sales", async () => {
  const put = customerMeRequest({
    baseUrl: "https://abc.supabase.co/",
    token: "jwt-cliente",
    anonKey: "anon",
    method: "PUT",
    body: customerPutBody({ name: "Ana", marketingOptIn: false })
  })
  assertEquals(put.method, "POST")
  assertEquals(put.headers.Authorization, "Bearer jwt-cliente")
  assertEquals(put.headers.apikey, undefined)
  assertEquals(put.headers["x-client-info"], undefined)
  assertEquals(Object.keys(put.headers).sort(), ["Authorization", "Content-Type"])
  assertEquals(JSON.parse(put.body || "{}").email, undefined)
  const exported = customerMeRequest({
    baseUrl: "https://abc.supabase.co",
    token: "jwt-cliente",
    anonKey: "anon",
    method: "POST",
    body: { action: "export" }
  })
  assertEquals(JSON.parse(exported.body || "{}").op, "export")
  assertEquals(JSON.parse(exported.body || "{}").action, undefined)
  assertEquals(exported.headers.apikey, undefined)
  const removed = customerMeRequest({
    baseUrl: "https://abc.supabase.co",
    token: "jwt-cliente",
    method: "DELETE",
    body: { op: "delete" }
  })
  assertEquals(removed.method, "POST")
  assertEquals(JSON.parse(removed.body || "{}").op, "delete")
  const read = customerMeRequest({
    baseUrl: "https://abc.supabase.co",
    token: "jwt-cliente",
    method: "GET"
  })
  assertEquals(read.method, "GET")
  assertEquals(read.body, undefined)
  assertEquals(Object.keys(read.headers), ["Authorization"])
  assertEquals(dataErrorMessage(401, { error: "Faça login para continuar." }), "Faça login para continuar.")
  assertEquals(dataErrorMessage(400, { error: "Confira o CPF e tente de novo." }), "Confira o CPF e tente de novo.")
  assertEquals(dataErrorMessage(500, { error: "Não foi possível salvar a conta." }), "Não foi possível salvar a conta.")
  assertEquals(dataErrorMessage({ message: "Failed to fetch" }), "Sem conexão. Tente de novo.")

  for (const columns of [MY_ORDERS_COLUMNS, MY_ORDER_ITEMS_COLUMNS, ADDRESS_COLUMNS]) {
    for (const key of FORBIDDEN_KEYS) assertEquals(columns.split(",").includes(key), false)
  }

  const orders = queryClient([
    { data: [{ id: 7, created_at: "2026-10-01T15:00:00Z", status: "pago", total: 80, custo: 4.25, sales: 3, unit_cost: 1 }], error: null },
    { data: [{ id: 1, order_id: 7, product_name: "Brinco", quantity: 1, unit_price: 80, line_total: 80, custo: 4.25, unit_cost: 1 }], error: null }
  ])
  const listed = await listMyOrders(orders.client)
  assertEquals(listed.ok, true)
  assertEquals(orders.calls[0].columns, MY_ORDERS_COLUMNS)
  assertEquals(orders.calls[1].columns, MY_ORDER_ITEMS_COLUMNS)
  assertEquals(containsForbiddenKey(listed.orders), false)
  assertEquals(listed.orders[0].items[0].name, "Brinco")
  const html = renderOrderCard(listed.orders[0])
  assert(html.includes("<article"))
  assertEquals(html.includes("4.25"), false)
  assertEquals(html.toLowerCase().includes("custo"), false)
  assertEquals(pickOrder({ id: 1, custo: 9, sales: 2 })?.id, 1)
  assertEquals(containsForbiddenKey(pickOrder({ id: 1, custo: 9, sales: 2 })), false)

  const file = buildExportDownload({
    ok: true,
    data: { customer: { name: "Ana" }, orders: [{ total: 10, custo: 4, sales: [{ unit_cost: 1 }] }] }
  })
  assertEquals(containsForbiddenKey(JSON.parse(file.json)), false)
  assertEquals(deleteConfirmed("EXCLUIR"), true)
  assertEquals(deleteConfirmed("excluir"), false)
})

Deno.test("endereço padrão desmarca os outros antes de gravar", async () => {
  const db = queryClient([
    { error: null },
    { data: [{ id: 3, cep: "13710087", rua: "Rua", numero: "47", bairro: "Centro", cidade: "Tambaú", uf: "SP", is_default: true }], error: null }
  ])
  const saved = await saveAddress(db.client, {
    customerId: 9,
    cep: "13710-087",
    rua: "Rua",
    numero: "47",
    bairro: "Centro",
    cidade: "Tambaú",
    uf: "sp",
    isDefault: true
  })
  assertEquals(saved.ok, true)
  assertEquals(db.calls[0].op, "update")
  assertEquals(db.calls[0].payload.is_default, false)
  assertEquals(db.calls[1].op, "insert")
  assertEquals(db.calls[1].payload.customer_id, 9)
  assertEquals(db.calls[1].payload.uf, "SP")
  assertEquals(db.calls[1].columns, ADDRESS_COLUMNS)
})

Deno.test("código de entrada não cria conta", async () => {
  const seen: unknown[] = []
  const client = {
    auth: {
      signInWithOtp(body: unknown) {
        seen.push(body)
        return Promise.resolve({ error: null })
      }
    }
  }
  await requestEmailCode(client, "Ana@Loja.Test")
  assertEquals(seen[0], {
    email: "ana@loja.test",
    options: { shouldCreateUser: false }
  })
})

Deno.test("o header nasce escondido e o opt-in nasce desmarcado", async () => {
  const catalog = await Deno.readTextFile(new URL("../paginas/catalogo/catalogo.html", import.meta.url))
  const link = catalog.match(/<a\b[^>]*id="header-account-link"[^>]*>/)?.[0] || ""
  assert(link.includes("hidden"))
  assert(link.includes('href="/entrar"'))
  const conta = await Deno.readTextFile(new URL("../paginas/conta/minha-conta.html", import.meta.url))
  assert(conta.includes('id="dados-marketing" type="checkbox"'))
  assertEquals(conta.includes('id="dados-marketing" type="checkbox" checked'), false)
  const css = await Deno.readTextFile(new URL("../paginas/conta/conta.css", import.meta.url))
  assertEquals(css.includes("text-align: center"), false)
  assert(css.includes("width: auto"))
  const envSource = await Deno.readTextFile(new URL("../../scripts/generate-env.js", import.meta.url))
  assert(envSource.includes('process.env.CUSTOMER_LOGIN_ENABLED === "1"'))
})

function memory() {
  const data = new Map<string, string>()
  return {
    getItem(key: string) { return data.get(key) ?? null },
    setItem(key: string, value: string) { data.set(key, value) },
    removeItem(key: string) { data.delete(key) }
  }
}

function queryClient(responses: Array<Record<string, unknown>>) {
  const calls: Array<Record<string, unknown>> = []
  let index = 0
  const client = {
    from(table: string) {
      const call: Record<string, unknown> = { table, columns: "", filters: [], payload: null, op: "select" }
      calls.push(call)
      const api = {
        select(columns: string) { call.columns = columns; return api },
        order() { return api },
        eq(col: string, val: unknown) { (call.filters as unknown[]).push([col, val]); return api },
        in(col: string, vals: unknown) { (call.filters as unknown[]).push([col, vals]); return api },
        update(payload: unknown) { call.op = "update"; call.payload = payload; return api },
        insert(payload: unknown) { call.op = "insert"; call.payload = payload; return api },
        delete() { call.op = "delete"; return api },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          const result = responses[index] || { data: [], error: null }
          index += 1
          return Promise.resolve(result).then(resolve, reject)
        }
      }
      return api
    }
  }
  return { client, calls }
}
