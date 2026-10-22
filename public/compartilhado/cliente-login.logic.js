// Login de cliente (Fase A, PR 4). Flag desligada até o back estar em produção.
// Auth: supabase-js (senha ou código, cadastro com código uma vez, reset).
// Sessão em localStorage, chave própria, para não derrubar a sessão da equipe.
//
// customer-me (JWT da cliente; o e-mail sai do token, nunca do corpo):
//   GET  /functions/v1/customer-me
//   PUT  /functions/v1/customer-me   { name, whatsapp, cpf, phone_e164?, marketing_opt_in }
//   POST /functions/v1/customer-me   { action: "export" } | { action: "delete" }
// Endereços: tabela customer_addresses (RLS da própria cliente).
// Pedidos: views my_orders e my_order_items, sem custo, unit_cost nem sales.

export const CUSTOMER_ME_FUNCTION = "customer-me"
export const CUSTOMER_LOGIN_STORAGE_KEY = "maris-cliente-auth"
export const CUSTOMER_LOGIN_PREVIEW_KEY = "maris_cliente_login_preview"
export const DELETE_CONFIRM_TEXT = "EXCLUIR"
export const CANONICAL_ORIGIN = "https://lojamaris.com.br"

export const ADDRESS_COLUMNS = "id,customer_id,cep,rua,numero,complemento,bairro,cidade,uf,is_default"
export const MY_ORDERS_COLUMNS = "id,created_at,status,total"
export const MY_ORDER_ITEMS_COLUMNS = "id,order_id,product_code,product_name,quantity,unit_price,line_total"

export const FORBIDDEN_KEYS = ["custo", "unit_cost", "sales"]

export const PASSWORD_RULES = [
  { id: "minLength", label: "8 caracteres" },
  { id: "upper", label: "Maiúscula" },
  { id: "lower", label: "Minúscula" },
  { id: "digit", label: "Número" },
  { id: "special", label: "Especial" }
]

const STATUS_LABELS = {
  a_confirmar: "A confirmar",
  a_receber: "A receber",
  pago: "Pago",
  cancelado: "Cancelado",
  paid: "Pago",
  pending: "A confirmar",
  partial: "A confirmar",
  cancelled: "Cancelado",
  canceled: "Cancelado"
}

export function isCustomerLoginEnabled(env, storage, locationLike) {
  const flag = env?.CUSTOMER_LOGIN_ENABLED
  if (flag === true || flag === 1 || flag === "1") return true
  const host = String(locationLike?.hostname || "")
  const local = host === "localhost" || host === "127.0.0.1"
  if (!local) return false
  const search = String(locationLike?.search || "")
  if (/(?:^|[?&])conta=1(?:&|$)/.test(search)) {
    try {
      storage?.setItem?.(CUSTOMER_LOGIN_PREVIEW_KEY, "1")
    } catch {
      /* preview local é só conveniência */
    }
    return true
  }
  try {
    return storage?.getItem?.(CUSTOMER_LOGIN_PREVIEW_KEY) === "1"
  } catch {
    return false
  }
}

export function headerAccountLink(enabled, hasSession) {
  if (!enabled) return { hidden: true, href: "/entrar", label: "Entrar" }
  if (hasSession) return { hidden: false, href: "/minha-conta", label: "Minha conta" }
  return { hidden: false, href: "/entrar", label: "Entrar" }
}

export function safeNextPath(raw) {
  if (!raw) return ""
  let decoded = String(raw)
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    return ""
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://") || decoded.includes("\\")) {
    return ""
  }
  const pathOnly = decoded.split("?")[0].split("#")[0]
  const path = pathOnly.length > 1 && pathOnly.endsWith("/") ? pathOnly.slice(0, -1) : pathOnly
  if (path === "/entrar" || path === "/criar-conta" || path === "/esqueci-senha" || path === "/redefinir-senha") {
    return ""
  }
  return decoded
}

export function accountUrl(origin, path) {
  const base = String(origin || CANONICAL_ORIGIN).replace(/\/$/, "")
  return `${base}${path}`
}

export function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "")
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase()
}

export function isEmail(value) {
  const email = normalizeEmail(value)
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function passwordChecks(password) {
  const value = String(password || "")
  return {
    minLength: value.length >= 8,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    digit: /\d/.test(value),
    special: /[^A-Za-z0-9\s]/.test(value)
  }
}

export function passwordIsValid(password) {
  const checks = passwordChecks(password)
  return PASSWORD_RULES.every((rule) => checks[rule.id])
}

export function passwordCanSubmit(password, confirm) {
  if (!passwordIsValid(password)) return false
  if (confirm === undefined) return true
  return String(password) === String(confirm)
}

export function isBrazilWhatsapp(value) {
  const digits = onlyDigits(value)
  return /^55\d{10,11}$/.test(digits) || /^\d{10,11}$/.test(digits)
}

export function toPhoneE164(value) {
  const digits = onlyDigits(value)
  if (/^55\d{10,11}$/.test(digits)) return `+${digits}`
  if (/^\d{10,11}$/.test(digits)) return `+55${digits}`
  return ""
}

export function isValidCpf(value) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = (length) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length !== 8) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length !== 11) return digits
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function messageOf(error) {
  if (!error) return ""
  if (typeof error === "string") return error
  return String(error.message || error.msg || error.error_description || "")
}

export function isRateLimited(error) {
  const msg = messageOf(error).toLowerCase()
  const status = Number(error?.status || error?.statusCode || 0)
  return status === 429
    || msg.includes("rate")
    || msg.includes("too many")
    || msg.includes("once every")
    || msg.includes("over_email")
    || msg.includes("over_request")
    || msg.includes("for security purposes")
}

export function isOffline(error) {
  const msg = messageOf(error).toLowerCase()
  return msg.includes("failed to fetch")
    || msg.includes("network")
    || msg.includes("conex")
    || msg.includes("timeout")
    || msg.includes("abort")
}

function isExistingAccountError(error) {
  const msg = messageOf(error).toLowerCase()
  return msg.includes("already registered")
    || msg.includes("already been registered")
    || msg.includes("user already")
}

function isHiddenAccountError(error) {
  const msg = messageOf(error).toLowerCase()
  return msg.includes("user not found")
    || msg.includes("invalid login")
    || msg.includes("invalid credentials")
    || msg.includes("email not confirmed")
    || isExistingAccountError(error)
}

function isWeakPassword(error) {
  const msg = messageOf(error).toLowerCase()
  return msg.includes("password") && (
    msg.includes("weak")
    || msg.includes("at least")
    || msg.includes("should")
    || msg.includes("character")
    || msg.includes("leaked")
    || msg.includes("pwned")
  )
}

export function loginErrorMessage(error) {
  if (isRateLimited(error)) return "Aguarde um pouco e tente de novo."
  if (isOffline(error)) return "Sem conexão. Tente de novo."
  return "Não foi possível entrar. Tente de novo."
}

export function signupResultMessage(error) {
  if (isRateLimited(error)) return { type: "error", text: "Aguarde um pouco e tente de novo." }
  if (isOffline(error)) return { type: "error", text: "Sem conexão. Tente de novo." }
  if (isWeakPassword(error)) return { type: "error", text: "A senha não atende às regras." }
  if (!error || isExistingAccountError(error)) {
    return { type: "success", text: "Se o e-mail puder ser usado, enviamos um código." }
  }
  return { type: "error", text: "Não foi possível criar a conta agora. Tente de novo em instantes." }
}

export function codeRequestMessage(error) {
  if (isRateLimited(error)) return { type: "error", text: "Aguarde um pouco e tente de novo." }
  if (isOffline(error)) return { type: "error", text: "Sem conexão. Tente de novo." }
  if (error && !isHiddenAccountError(error)) return { type: "error", text: "Não foi possível enviar o código." }
  return { type: "success", text: "Se o e-mail estiver cadastrado, enviamos um código." }
}

export function codeErrorMessage(error) {
  if (isRateLimited(error)) return "Aguarde um pouco e tente de novo."
  if (isOffline(error)) return "Sem conexão. Tente de novo."
  return "Não foi possível confirmar o código."
}

export function resetRequestMessage(error) {
  if (isRateLimited(error)) return { type: "error", text: "Aguarde um pouco e tente de novo." }
  if (isOffline(error)) return { type: "error", text: "Sem conexão. Tente de novo." }
  if (!error || isHiddenAccountError(error)) {
    return { type: "success", text: "Se o e-mail estiver cadastrado, enviamos um link." }
  }
  return { type: "error", text: "Não foi possível enviar o e-mail. Tente de novo." }
}

export function passwordUpdateMessage(error) {
  if (!error) return { type: "success", text: "Senha atualizada." }
  if (isRateLimited(error)) return { type: "error", text: "Aguarde um pouco e tente de novo." }
  if (isWeakPassword(error)) return { type: "error", text: "A senha não atende às regras." }
  return { type: "error", text: "Não foi possível salvar a senha." }
}

export function dataErrorMessage(statusOrError) {
  if (isRateLimited(statusOrError) || Number(statusOrError) === 429) return "Aguarde um pouco e tente de novo."
  if (isOffline(statusOrError)) return "Sem conexão. Tente de novo."
  return "Não foi possível concluir. Tente de novo."
}

export function readStoredCustomerSession(raw, nowMs = Date.now()) {
  if (!raw) return null
  let parsed = raw
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
  }
  const session = parsed?.access_token ? parsed : (parsed?.currentSession || parsed?.session || null)
  if (!session?.access_token && !session?.refresh_token) return null
  const exp = Number(session.expires_at)
  const fresh = Number.isFinite(exp) && exp * 1000 > nowMs + 15000
  if (fresh || session.refresh_token) return session
  return null
}

export function recoveryLinkPresent(locationLike) {
  const hash = String(locationLike?.hash || "")
  const search = String(locationLike?.search || "")
  return hash.includes("access_token")
    || hash.includes("type=recovery")
    || search.includes("code=")
    || search.includes("token_hash=")
}

export function customerMeRequest({ baseUrl, token, anonKey, method, body }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: anonKey
  }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  return {
    url: `${String(baseUrl || "").replace(/\/$/, "")}/functions/v1/${CUSTOMER_ME_FUNCTION}`,
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  }
}

export function customerPutBody(input = {}) {
  const whatsapp = onlyDigits(input.whatsapp)
  const body = {
    name: String(input.name || "").trim(),
    whatsapp,
    cpf: onlyDigits(input.cpf),
    marketing_opt_in: input.marketingOptIn === true
  }
  const phone = toPhoneE164(whatsapp)
  if (phone) body.phone_e164 = phone
  return body
}

export function validateCustomer(input = {}) {
  const name = String(input.name || "").trim()
  if (!name) return "Informe o nome."
  if (name.length > 80) return "O nome pode ter no máximo 80 caracteres."
  const whatsapp = onlyDigits(input.whatsapp)
  if (whatsapp && !isBrazilWhatsapp(whatsapp)) return "WhatsApp inválido."
  const cpf = onlyDigits(input.cpf)
  if (cpf && !isValidCpf(cpf)) return "CPF inválido."
  return ""
}

export function customerFromMe(data) {
  const raw = data?.customer && typeof data.customer === "object" ? data.customer : null
  if (!raw) return null
  return {
    id: raw.id ?? null,
    name: String(raw.name || raw.nome || "").trim(),
    email: String(raw.email || "").trim(),
    whatsapp: onlyDigits(raw.whatsapp || raw.phone || raw.phone_e164 || ""),
    cpf: onlyDigits(raw.cpf || ""),
    marketingOptIn: raw.marketing_opt_in === true || raw.marketingOptIn === true
  }
}

export function marketingOptInFromCustomer(customer) {
  return customer?.marketingOptIn === true
}

export async function readCustomerMe(fetchImpl, request) {
  try {
    const res = await fetchImpl(request.url, {
      method: request.method,
      headers: request.headers,
      ...(request.body ? { body: request.body } : {})
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.ok === false) return { ok: false, status: res.status, data }
    return { ok: true, status: res.status, data, customer: customerFromMe(data) }
  } catch (error) {
    return { ok: false, status: 0, error }
  }
}

export function deleteConfirmed(value) {
  return String(value || "").trim() === DELETE_CONFIRM_TEXT
}

export function stripForbidden(value) {
  if (Array.isArray(value)) return value.map(stripForbidden)
  if (!value || typeof value !== "object") return value
  const out = {}
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.includes(key)) continue
    out[key] = stripForbidden(item)
  }
  return out
}

export function containsForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenKey)
  if (!value || typeof value !== "object") return false
  return Object.entries(value).some(([key, item]) => FORBIDDEN_KEYS.includes(key) || containsForbiddenKey(item))
}

export function buildExportDownload(data) {
  const source = data?.ok && data?.data ? data.data : data
  const clean = stripForbidden(source ?? {})
  return {
    filename: "maris-meus-dados.json",
    json: JSON.stringify(clean, null, 2),
    data: clean
  }
}

export function addressFromViaCep(data) {
  if (!data || data.erro === true || data.erro === "true") return null
  const cidade = String(data.localidade || "").trim()
  const uf = String(data.uf || "").trim().toUpperCase()
  if (!cidade && !uf) return null
  return {
    cep: formatCep(data.cep || ""),
    rua: String(data.logradouro || "").trim(),
    bairro: String(data.bairro || "").trim(),
    cidade,
    uf
  }
}

export function addressFromBrasilApi(data) {
  if (!data || data.errors) return null
  const cidade = String(data.city || "").trim()
  const uf = String(data.state || "").trim().toUpperCase()
  if (!cidade && !uf) return null
  return {
    cep: formatCep(data.cep || ""),
    rua: String(data.street || "").trim(),
    bairro: String(data.neighborhood || "").trim(),
    cidade,
    uf
  }
}

export function applyCepResult(current = {}, found = {}) {
  return {
    ...current,
    cep: found.cep || current.cep || "",
    rua: found.rua || current.rua || "",
    bairro: found.bairro || current.bairro || "",
    cidade: found.cidade || current.cidade || "",
    uf: found.uf || current.uf || ""
  }
}

async function fetchJson(fetchImpl, url) {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(6000) })
    if (!res?.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function lookupCep(cep, fetchImpl = globalThis.fetch) {
  const digits = onlyDigits(cep)
  if (digits.length !== 8) return { ok: false, error: "CEP inválido." }
  const via = addressFromViaCep(await fetchJson(fetchImpl, `https://viacep.com.br/ws/${digits}/json/`))
  if (via) return { ok: true, address: via }
  const brasil = addressFromBrasilApi(await fetchJson(fetchImpl, `https://brasilapi.com.br/api/cep/v2/${digits}`))
  if (brasil) return { ok: true, address: brasil }
  return { ok: false, error: "Não achamos esse CEP. Preencha o endereço." }
}

export function validateAddress(input = {}) {
  if (onlyDigits(input.cep).length !== 8) return "CEP inválido."
  if (!String(input.rua || "").trim()) return "Informe a rua."
  if (!String(input.numero || "").trim()) return "Informe o número."
  if (!String(input.bairro || "").trim()) return "Informe o bairro."
  if (!String(input.cidade || "").trim()) return "Informe a cidade."
  if (!/^[A-Za-z]{2}$/.test(String(input.uf || "").trim())) return "Informe a UF."
  return ""
}

export function addressWriteBody(input = {}, options = {}) {
  const includeCustomerId = options.includeCustomerId !== false
  const body = {
    cep: onlyDigits(input.cep),
    rua: String(input.rua || "").trim(),
    numero: String(input.numero || "").trim(),
    complemento: String(input.complemento || "").trim(),
    bairro: String(input.bairro || "").trim(),
    cidade: String(input.cidade || "").trim(),
    uf: String(input.uf || "").trim().toUpperCase(),
    is_default: input.isDefault === true
  }
  if (includeCustomerId) body.customer_id = input.customerId
  return body
}

export function addressFromRow(row) {
  if (!row || typeof row !== "object") return null
  return {
    id: row.id ?? null,
    customerId: row.customer_id ?? null,
    cep: onlyDigits(row.cep),
    rua: String(row.rua || ""),
    numero: String(row.numero || ""),
    complemento: String(row.complemento || ""),
    bairro: String(row.bairro || ""),
    cidade: String(row.cidade || ""),
    uf: String(row.uf || ""),
    isDefault: row.is_default === true
  }
}

function firstRow(data) {
  if (Array.isArray(data)) return data[0] || null
  return data || null
}

export async function listAddresses(client) {
  const query = await client.from("customer_addresses").select(ADDRESS_COLUMNS).order("is_default", { ascending: false })
  if (query.error) return { ok: false, addresses: [] }
  return { ok: true, addresses: (query.data || []).map(addressFromRow).filter(Boolean) }
}

export async function saveAddress(client, input = {}) {
  const invalid = validateAddress(input)
  if (invalid) return { ok: false, error: invalid }
  if (input.customerId == null || input.customerId === "") {
    return { ok: false, error: "Salve seus dados para incluir um endereço." }
  }
  if (input.isDefault === true) {
    const cleared = await client.from("customer_addresses").update({ is_default: false }).eq("is_default", true)
    if (cleared.error) return { ok: false, error: "Não foi possível salvar o endereço." }
  }
  const payload = addressWriteBody(input, { includeCustomerId: !input.id })
  const query = input.id
    ? client.from("customer_addresses").update(payload).eq("id", input.id).select(ADDRESS_COLUMNS)
    : client.from("customer_addresses").insert(payload).select(ADDRESS_COLUMNS)
  const result = await query
  if (result.error) return { ok: false, error: "Não foi possível salvar o endereço." }
  return { ok: true, address: addressFromRow(firstRow(result.data)) }
}

export async function deleteAddress(client, id) {
  if (id == null || id === "") return { ok: false }
  const result = await client.from("customer_addresses").delete().eq("id", id)
  if (result.error) return { ok: false }
  return { ok: true }
}

export function pickOrder(row) {
  if (!row || typeof row !== "object") return null
  return {
    id: row.id ?? null,
    createdAt: row.created_at || "",
    status: row.status || "",
    total: row.total ?? null
  }
}

export function pickOrderItem(row) {
  if (!row || typeof row !== "object") return null
  return {
    id: row.id ?? null,
    orderId: row.order_id ?? null,
    code: row.product_code || "",
    name: row.product_name || row.name || "",
    quantity: Number(row.quantity) || 0,
    unitPrice: row.unit_price ?? null,
    lineTotal: row.line_total ?? null
  }
}

export function attachOrderItems(orders, items) {
  const byOrder = new Map()
  for (const item of items) {
    const key = String(item.orderId)
    if (!byOrder.has(key)) byOrder.set(key, [])
    byOrder.get(key).push(item)
  }
  return orders.map((order) => ({ ...order, items: byOrder.get(String(order.id)) || [] }))
}

export async function listMyOrders(client) {
  const ordersQuery = await client.from("my_orders").select(MY_ORDERS_COLUMNS).order("created_at", { ascending: false })
  if (ordersQuery.error) return { ok: false, orders: [] }
  const orders = (ordersQuery.data || []).map(pickOrder).filter(Boolean)
  const ids = orders.map((order) => order.id).filter((id) => id != null)
  if (!ids.length) return { ok: true, orders }
  const itemsQuery = await client.from("my_order_items").select(MY_ORDER_ITEMS_COLUMNS).in("order_id", ids)
  if (itemsQuery.error) return { ok: false, orders: [] }
  const items = (itemsQuery.data || []).map(pickOrderItem).filter(Boolean)
  return { ok: true, orders: attachOrderItems(orders, items) }
}

export function statusLabel(status) {
  const key = String(status || "").trim()
  return STATUS_LABELS[key] || (key ? "Em andamento" : "Aguardando")
}

export function formatMoneyBRL(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ""
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatWhen(iso) {
  const date = new Date(iso || "")
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function renderOrderCard(order) {
  const items = (order?.items || []).map((item) => {
    const price = item.lineTotal != null ? formatMoneyBRL(item.lineTotal) : formatMoneyBRL(item.unitPrice)
    const name = item.name || item.code || "Peça"
    return `<p class="conta-muted">${escapeHtml(name)} · ${Number(item.quantity) || 0}${price ? ` · ${escapeHtml(price)}` : ""}</p>`
  }).join("")
  const when = formatWhen(order?.createdAt)
  const total = order?.total != null ? formatMoneyBRL(order.total) : ""
  const meta = [when, total].filter(Boolean).join(" · ")
  return `<article class="conta-card conta-order">
    <div class="conta-order-top">
      <h3>Pedido ${escapeHtml(order?.id ?? "")}</h3>
      <span>${escapeHtml(statusLabel(order?.status))}</span>
    </div>
    ${meta ? `<p class="conta-muted">${escapeHtml(meta)}</p>` : ""}
    ${items}
  </article>`
}

export function renderAddressCard(address) {
  const line = [address?.rua, address?.numero].filter(Boolean).join(", ")
  const city = [address?.bairro, address?.cidade && address?.uf ? `${address.cidade}-${address.uf}` : address?.cidade]
    .filter(Boolean)
    .join(" · ")
  const id = escapeHtml(address?.id ?? "")
  return `<article class="conta-card conta-address" data-id="${id}">
    <div class="conta-order-top">
      <h3>${escapeHtml(formatCep(address?.cep) || "Endereço")}</h3>
      ${address?.isDefault ? `<span class="conta-pill">Padrão</span>` : ""}
    </div>
    ${line ? `<p class="conta-muted">${escapeHtml(line)}</p>` : ""}
    ${city ? `<p class="conta-muted">${escapeHtml(city)}</p>` : ""}
    ${address?.complemento ? `<p class="conta-muted">${escapeHtml(address.complemento)}</p>` : ""}
    <div class="conta-actions">
      <button type="button" class="conta-text-btn" data-action="edit" data-id="${id}">Editar</button>
      <button type="button" class="conta-text-btn" data-action="remove" data-id="${id}">Apagar</button>
    </div>
  </article>`
}

export async function signInWithPassword(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: String(password || "")
  })
  if (error || !data?.session?.access_token) return { ok: false, error: error || { message: "sem sessão" } }
  return { ok: true, session: data.session }
}

export async function requestEmailCode(client, email) {
  const { error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: false }
  })
  return { error: error || null }
}

export async function verifyEmailCode(client, email, token, type) {
  const { data, error } = await client.auth.verifyOtp({
    email: normalizeEmail(email),
    token: normalizeSignupCode(token),
    type
  })
  if (error || !data?.session?.access_token) return { ok: false, error: error || { message: "sem sessão" } }
  return { ok: true, session: data.session }
}

export async function signUpWithPassword(client, email, password, redirectTo) {
  const { data, error } = await client.auth.signUp({
    email: normalizeEmail(email),
    password: String(password || ""),
    options: { emailRedirectTo: redirectTo || accountUrl(CANONICAL_ORIGIN, "/minha-conta") }
  })
  return { data: data || null, error: error || null }
}

export async function resendSignupCode(client, email, redirectTo) {
  try {
    const { error } = await client.auth.resend({
      type: "signup",
      email: normalizeEmail(email),
      options: { emailRedirectTo: redirectTo || accountUrl(CANONICAL_ORIGIN, "/minha-conta") }
    })
    return { error: error || null }
  } catch (error) {
    return { error }
  }
}

export function signupHasSession(result) {
  return Boolean(result?.data?.session?.access_token)
}

export const SIGNUP_DRAFT_KEY = "maris_cliente_signup_draft"
export const SIGNUP_CODE_MAX_AGE_MS = 30 * 60 * 1000
export const SIGNUP_RESEND_COOLDOWN_MS = 60 * 1000

export function normalizeSignupCode(value) {
  return onlyDigits(value).slice(0, 6)
}

export function signupCodeCanConfirm(value) {
  return normalizeSignupCode(value).length === 6
}

export function saveSignupDraft(storage, email, sentAt = Date.now()) {
  const normalized = normalizeEmail(email)
  if (!storage || !isEmail(normalized)) return null
  const draft = { step: "code", email: normalized, sentAt: Number(sentAt) || Date.now() }
  storage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft))
  return draft
}

export function readSignupDraft(storage, nowMs = Date.now(), maxAgeMs = SIGNUP_CODE_MAX_AGE_MS) {
  if (!storage) return null
  const raw = storage.getItem(SIGNUP_DRAFT_KEY)
  if (!raw) return null
  let parsed = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    storage.removeItem?.(SIGNUP_DRAFT_KEY)
    return null
  }
  const email = normalizeEmail(parsed?.email)
  const sentAt = Number(parsed?.sentAt)
  const fresh = parsed?.step === "code" && isEmail(email) && Number.isFinite(sentAt) && nowMs - sentAt <= maxAgeMs
  if (!fresh) {
    storage.removeItem?.(SIGNUP_DRAFT_KEY)
    return null
  }
  return { step: "code", email, sentAt }
}

export function clearSignupDraft(storage) {
  storage?.removeItem?.(SIGNUP_DRAFT_KEY)
}

export function resendCooldownRemaining(sentAt, nowMs = Date.now(), cooldownMs = SIGNUP_RESEND_COOLDOWN_MS) {
  const left = cooldownMs - (nowMs - Number(sentAt || 0))
  return left > 0 ? left : 0
}

export function resendButtonState(sentAt, nowMs = Date.now()) {
  const left = resendCooldownRemaining(sentAt, nowMs)
  if (left > 0) return { disabled: true, text: `Reenviar código (${Math.ceil(left / 1000)}s)` }
  return { disabled: false, text: "Reenviar código" }
}

export function resendCodeMessage(error) {
  if (isRateLimited(error)) return { type: "error", text: "Aguarde um pouco e tente de novo." }
  if (isOffline(error)) return { type: "error", text: "Sem conexão. Tente de novo." }
  if (error) return { type: "error", text: "Não foi possível reenviar o código agora. Tente de novo em instantes." }
  return { type: "success", text: "Se o e-mail puder ser usado, enviamos um código." }
}

export async function requestPasswordReset(client, email, redirectTo) {
  const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: redirectTo || accountUrl(CANONICAL_ORIGIN, "/redefinir-senha")
  })
  return { error: error || null }
}

export async function updatePassword(client, password) {
  const { data, error } = await client.auth.updateUser({ password: String(password || "") })
  if (error) return { ok: false, error }
  return { ok: true, user: data?.user || null }
}

export async function signOut(client) {
  try {
    await client.auth.signOut()
  } catch {
    /* a tela segue para o catálogo */
  }
}

export function waitForSession(client, timeoutMs = 2500) {
  return new Promise((resolve) => {
    let settled = false
    let subscription = null
    const finish = (session) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      subscription?.unsubscribe?.()
      resolve(session?.access_token ? session : null)
    }
    try {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (session?.access_token && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          finish(session)
        }
      })
      subscription = data?.subscription || null
    } catch {
      subscription = null
    }
    client.auth.getSession?.().then((result) => {
      if (result?.data?.session?.access_token) finish(result.data.session)
    }).catch(() => {})
    const timer = setTimeout(() => finish(null), timeoutMs)
  })
}

export async function establishRecoverySession(client, locationLike) {
  const params = new URLSearchParams(String(locationLike?.search || "").replace(/^\?/, ""))
  const code = params.get("code")
  if (code && client.auth.exchangeCodeForSession) {
    try {
      const { data } = await client.auth.exchangeCodeForSession(code)
      if (data?.session?.access_token) return data.session
    } catch {
      /* o hash implícito ainda pode valer */
    }
  }
  return waitForSession(client, recoveryLinkPresent(locationLike) ? 2500 : 400)
}
