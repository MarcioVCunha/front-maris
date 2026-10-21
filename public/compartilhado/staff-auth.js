// Sessão da equipe via Supabase Auth (e-mail e senha).
// authHeaders() manda o access_token da sessão para as Edge Functions.
// O papel (admin, seller ou vendedora) vem de GET staff-me, não do JWT decodificado aqui.
// vendedora vale como seller. O seller_id do perfil é o da venda.
//
// Páginas só de administração: ADMIN_ONLY_PATHS.
// Vendedora entra em vendas e tipos do produto.
// O restante exige papel admin.
// staff-me também devolve seller_id. Na vendedora, a venda usa esse id.

;(function () {
  const GATE_PATH = "/equipe"
  const RESET_PATH = "/equipe/nova-senha"
  const STAFF_HOME = "/inicio"
  const PROFILE_KEY = "maris_staff_profile"
  const LEGACY_TOKEN_KEY = "maris_staff_token"
  const STAFF_ME_FALLBACK = "staff-me"

  const ADMIN_ONLY_PATHS = [
    "/admin",
    "/importar",
    "/adicionar-peca",
    "/promocoes",
    "/contas-vendedoras",
    "/lista-espera"
  ]

  function normalizePath(pathname) {
    const path = String(pathname || "/")
    if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1)
    return path || "/"
  }

  function isAuthPath(pathname) {
    const path = normalizePath(pathname)
    return path === GATE_PATH || path === RESET_PATH
  }

  function isAdminOnlyPath(pathname) {
    const path = normalizePath(pathname)
    if (path === "/admin" || path.startsWith("/admin/")) return true
    if (path === "/paginas/admin/painel.html") return true
    return ADMIN_ONLY_PATHS.includes(path)
  }

  function supabaseUrl() {
    if (window.ENV && window.ENV.SUPABASE_URL) return window.ENV.SUPABASE_URL
    if (window.__MARIS_ENV__ && window.__MARIS_ENV__.SUPABASE_URL) return window.__MARIS_ENV__.SUPABASE_URL
    return ""
  }

  function storageKey() {
    try {
      const host = new URL(supabaseUrl()).hostname
      const ref = host.split(".")[0]
      return ref ? `sb-${ref}-auth-token` : ""
    } catch {
      return ""
    }
  }

  function decodeJwtPayload(token) {
    try {
      const part = String(token || "").split(".")[1]
      if (!part) return null
      const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"))
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  function readStoredSession() {
    const key = storageKey()
    if (!key || !window.localStorage) return null
    let raw = ""
    try {
      raw = window.localStorage.getItem(key) || ""
    } catch {
      return null
    }
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.access_token) return parsed
      if (parsed?.currentSession?.access_token) return parsed.currentSession
      return null
    } catch {
      return null
    }
  }

  function sessionIsUsable(session, nowMs = Date.now()) {
    if (!session?.access_token) return false
    const skewMs = 15000
    const expSec = Number(session.expires_at)
    if (Number.isFinite(expSec) && expSec > 0) return expSec * 1000 > nowMs + skewMs
    const payload = decodeJwtPayload(session.access_token)
    const exp = Number(payload?.exp)
    if (Number.isFinite(exp) && exp > 0) return exp * 1000 > nowMs + skewMs
    return false
  }

  function safeNextPath(raw) {
    if (!raw) return STAFF_HOME
    let decoded = String(raw)
    try {
      decoded = decodeURIComponent(decoded)
    } catch {
      return STAFF_HOME
    }
    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("://") || decoded.includes("\\")) {
      return STAFF_HOME
    }
    const pathOnly = decoded.split("?")[0].split("#")[0]
    if (normalizePath(pathOnly) === GATE_PATH || normalizePath(pathOnly) === RESET_PATH) return STAFF_HOME
    return decoded
  }

  // Vendedora entra direto na tela nova. Admin segue o next, ou o hub da equipe.
  function landingPath(user, rawNext) {
    const next = safeNextPath(rawNext)
    if (user?.role !== "seller") return next
    const path = normalizePath(String(next).split("?")[0].split("#")[0])
    if (path === "/" || path === STAFF_HOME || path === "/vendedoras" || path === "/vendas") return "/vendas/nova"
    return next
  }

  function normalizeSellerId(value) {
    if (value == null || value === "") return null
    const id = Number(value)
    if (!Number.isInteger(id) || id <= 0) return null
    return id
  }

  function normalizeStaffUser(raw) {
    if (!raw || typeof raw !== "object") return null
    const roleRaw = String(raw.role || "").trim().toLowerCase()
    const role = roleRaw === "admin" ? "admin" : (roleRaw === "seller" || roleRaw === "vendedora" ? "seller" : "")
    if (!role) return null
    const email = String(raw.email || "").trim()
    const name = String(raw.name || "").trim() || email
    if (!raw.id && !email && !name) return null
    return {
      id: raw.id == null ? "" : String(raw.id),
      email,
      name,
      role,
      seller_id: normalizeSellerId(raw.seller_id)
    }
  }

  function roleLabel(role) {
    if (role === "admin") return "Administradora"
    if (role === "seller") return "Vendedora"
    return ""
  }

  function accessDecision({ pathname, role, hasSession, optional }) {
    const path = normalizePath(pathname)
    if (optional || isAuthPath(path)) return "allow"
    if (!hasSession) return "login"
    if (isAdminOnlyPath(path) && role !== "admin") return "deny"
    return "allow"
  }

  // O que cada papel vê no menu. Tipos do produto vale para os dois.
  function menuFor(role) {
    const admin = role === "admin"
    const seller = role === "seller"
    return {
      homeAdmin: admin,
      homeTipos: seller,
      homeVendedoras: admin || seller,
      homeCatalogo: true,
      vendas: admin || seller,
      tipos: admin || seller,
      listaEspera: admin,
      contas: admin,
      importar: admin,
      adicionarPeca: admin,
      promocoes: admin
    }
  }

  function loginErrorMessage(error) {
    const msg = String(error || "").toLowerCase()
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      return "E-mail ou senha incorretos."
    }
    if (msg.includes("email not confirmed")) {
      return "Confirme o e-mail antes de entrar."
    }
    if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("conexão")) {
      return "Erro de conexão. Tente novamente."
    }
    return "Não foi possível entrar. Tente novamente."
  }

  function resetRequestMessage(result) {
    const generic = "Se esse e-mail estiver cadastrado na equipe, enviamos um link para criar uma nova senha."
    if (result?.ok) return { type: "success", text: generic }
    const msg = String(result?.error || "").toLowerCase()
    if (msg.includes("rate") || msg.includes("once every") || msg.includes("too many")) {
      return { type: "error", text: "Aguarde um pouco antes de pedir outro e-mail." }
    }
    if (msg.includes("not found") || msg.includes("signups not") || msg.includes("user not")) {
      return { type: "success", text: generic }
    }
    return { type: "error", text: "Não foi possível enviar o e-mail. Tente novamente." }
  }

  function passwordError(password, confirm) {
    const value = String(password || "")
    if (value.length < 8) return "A senha precisa ter pelo menos 8 caracteres."
    if (confirm !== undefined && value !== String(confirm ?? "")) return "As senhas não conferem."
    return ""
  }

  function staffMeName() {
    return window.MarisStaffData?.FUNCTIONS?.staffMe || STAFF_ME_FALLBACK
  }

  function client() {
    if (!window.MarisUtils?.createSupabaseClient || !window.supabase?.createClient) return null
    try {
      return window.MarisUtils.createSupabaseClient()
    } catch {
      return null
    }
  }

  function redirectToGate() {
    const next = encodeURIComponent((window.location.pathname || "/") + (window.location.search || ""))
    window.location.replace(`${GATE_PATH}?next=${next}`)
  }

  let pageUnloading = false
  let profileFlight = null

  function notePageUnloading() {
    pageUnloading = true
  }

  if (typeof window?.addEventListener === "function") {
    window.addEventListener("pagehide", notePageUnloading)
    window.addEventListener("beforeunload", notePageUnloading)
  }

  function profileWasAborted(profile) {
    if (profile?.aborted) return true
    return /abort/i.test(String(profile?.error || ""))
  }

  // "wait" = a navegação levou o pedido embora. Não é falta de permissão.
  function settleAdminGate(profile, options = {}) {
    if (options.unloading || pageUnloading || profileWasAborted(profile)) return "wait"
    if (!profile?.ok || profile.user?.role !== "admin") return "deny"
    return "allow"
  }

  function redirectHomeDenied() {
    if (pageUnloading) return
    window.location.replace(`${STAFF_HOME}?aviso=sem-permissao`)
  }

  function sessionSubject(session) {
    const sub = decodeJwtPayload(session?.access_token)?.sub
    return sub == null || sub === "" ? "" : String(sub)
  }

  function profileStore() {
    return window.sessionStorage || null
  }

  function readCachedUser() {
    const session = readStoredSession()
    const store = profileStore()
    if (!sessionIsUsable(session) || !store) return null
    const sub = sessionSubject(session)
    if (!sub) return null
    try {
      const parsed = JSON.parse(store.getItem(PROFILE_KEY) || "")
      if (!parsed || parsed.sub !== sub) return null
      return normalizeStaffUser(parsed.user)
    } catch {
      return null
    }
  }

  function writeCachedUser(user) {
    const store = profileStore()
    const sub = sessionSubject(readStoredSession())
    if (!store || !sub || !user) return
    try {
      store.setItem(PROFILE_KEY, JSON.stringify({ sub, user }))
    } catch {
      /* o perfil ainda vale nesta chamada */
    }
  }

  function freshDeniesAdmin(fresh) {
    if (!fresh || fresh.aborted || fresh.cached) return false
    if (fresh.ok) return fresh.user?.role !== "admin"
    return /permiss|equipe|papel/i.test(String(fresh.error || ""))
  }

  function setPageHidden(hidden) {
    const root = document?.documentElement
    if (!root?.style) return
    root.style.visibility = hidden ? "hidden" : ""
  }

  function whenReady(fn) {
    if (!document) return
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn)
    else fn()
  }

  function applyMenus(user) {
    if (!user || !document?.querySelectorAll) return
    const admin = user.role === "admin"
    document.querySelectorAll("[data-staff-min='admin']").forEach((el) => {
      el.hidden = !admin
    })
    document.querySelectorAll("[data-staff-only='seller']").forEach((el) => {
      el.hidden = admin
    })
    const who = document.getElementById?.("staff-who")
    if (who) {
      who.hidden = false
      who.textContent = `${user.name} · ${roleLabel(user.role)}`
    }
    const note = document.getElementById?.("staff-permission-note")
    if (note && new URLSearchParams(window.location.search || "").get("aviso") === "sem-permissao") {
      note.hidden = false
      note.textContent = "Essa área é só para quem administra a loja."
    }
  }

  function bindLogout() {
    const btn = document.getElementById?.("staff-logout-btn")
    if (!btn || btn.dataset.bound === "1") return
    btn.dataset.bound = "1"
    btn.addEventListener("click", async () => {
      btn.disabled = true
      await window.MarisStaffAuth.signOut()
      window.location.href = GATE_PATH
    })
  }

  function urlHasRecoveryHint() {
    const search = String(window.location.search || "")
    const hash = String(window.location.hash || "")
    return /(?:^|[?&])code=/.test(search) || /access_token=/.test(hash) || /type=recovery/.test(hash)
  }

  async function fetchStaffProfileDirect() {
    const token = window.MarisStaffAuth.getToken()
    if (!token) return { user: null, error: { message: "Sem sessão." } }
    const url = window.ENV.fn(staffMeName())
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.ok === false || !data.user) {
      return { user: null, error: { message: data.error || "Não foi possível confirmar seu acesso." } }
    }
    return { user: data.user, error: null }
  }

  window.MarisStaffAuth = {
    GATE_PATH,
    RESET_PATH,
    ADMIN_ONLY_PATHS: ADMIN_ONLY_PATHS.slice(),

    normalizePath,
    isAdminOnlyPath,
    settleAdminGate,
    safeNextPath,
    landingPath,
    normalizeStaffUser,
    roleLabel,
    accessDecision,
    menuFor,
    loginErrorMessage,
    resetRequestMessage,
    passwordError,
    sessionIsUsable,
    storageKey,

    getToken() {
      const session = readStoredSession()
      return sessionIsUsable(session) ? session.access_token : ""
    },

    isValid() {
      return Boolean(this.getToken())
    },

    requireStaffAccess() {
      if (this.isValid()) return true
      redirectToGate()
      return false
    },

    authHeaders() {
      const token = this.getToken()
      return token ? { Authorization: `Bearer ${token}` } : {}
    },

    async loadProfile() {
      const cached = readCachedUser()
      if (cached) {
        this.refreshProfile()
        return { ok: true, user: cached, cached: true }
      }
      return this.refreshProfile()
    },

    refreshProfile() {
      if (!profileFlight) {
        profileFlight = fetchProfileOnce().finally(() => {
          profileFlight = null
        })
      }
      const flight = profileFlight
      flight.then((fresh) => {
        const path = normalizePath(window.location?.pathname)
        if (!isAdminOnlyPath(path) || !freshDeniesAdmin(fresh)) {
          if (fresh?.ok && fresh.user) applyMenus(fresh.user)
          return
        }
        try {
          profileStore()?.removeItem(PROFILE_KEY)
        } catch {
          /* segue para a saída */
        }
        redirectHomeDenied()
      })
      return flight
    },

    async signIn(email, password) {
      const sb = client()
      if (!sb?.auth?.signInWithPassword) {
        return { ok: false, error: "Cliente de login indisponível." }
      }
      try {
        const { data, error } = await sb.auth.signInWithPassword({
          email: String(email || "").trim().toLowerCase(),
          password: String(password || "")
        })
        if (error || !data?.session?.access_token) {
          return { ok: false, error: error?.message || "Não foi possível entrar." }
        }
        return { ok: true, session: data.session }
      } catch (e) {
        return { ok: false, error: e?.message || "Erro de conexão." }
      }
    },

    async signInAndLoadProfile(email, password) {
      const signed = await this.signIn(email, password)
      if (!signed.ok) return { ok: false, error: loginErrorMessage(signed.error) }
      const profile = await this.loadProfile()
      if (!profile.ok) {
        await this.signOut()
        return { ok: false, error: profile.error || "Esta conta não faz parte da equipe." }
      }
      return { ok: true, user: profile.user }
    },

    async requestPasswordReset(email) {
      const sb = client()
      if (!sb?.auth?.resetPasswordForEmail) {
        return { ok: false, error: "Cliente de login indisponível." }
      }
      const cleanEmail = String(email || "").trim().toLowerCase()
      if (!cleanEmail) return { ok: false, error: "Informe o e-mail." }
      const redirectTo = `${window.location.origin}${RESET_PATH}`
      try {
        const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, { redirectTo })
        if (error) return { ok: false, error: error.message || "Não foi possível enviar o e-mail." }
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e?.message || "Erro de conexão." }
      }
    },

    async prepareRecoverySession() {
      const sb = client()
      if (!sb?.auth?.getSession) {
        return { ok: false, error: "Cliente de login indisponível." }
      }
      try {
        const { data, error } = await sb.auth.getSession()
        if (!error && data?.session?.access_token) return { ok: true }
      } catch {
        /* tenta o evento abaixo se o link ainda estiver na URL */
      }
      if (!urlHasRecoveryHint() || !sb.auth.onAuthStateChange) {
        return { ok: false, error: "Link inválido ou vencido. Peça um novo e-mail na tela de entrada." }
      }
      const session = await new Promise((resolve) => {
        let settled = false
        const finish = (value) => {
          if (settled) return
          settled = true
          resolve(value)
        }
        const { data } = sb.auth.onAuthStateChange((event, sess) => {
          if (sess?.access_token && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
            finish(sess)
          }
        })
        setTimeout(() => {
          data?.subscription?.unsubscribe?.()
          finish(null)
        }, 1200)
      })
      if (!session?.access_token) {
        return { ok: false, error: "Link inválido ou vencido. Peça um novo e-mail na tela de entrada." }
      }
      return { ok: true }
    },

    async updatePassword(password) {
      const sb = client()
      if (!sb?.auth?.updateUser) return { ok: false, error: "Cliente de login indisponível." }
      try {
        const { data, error } = await sb.auth.updateUser({ password: String(password || "") })
        if (error) return { ok: false, error: error.message || "Não foi possível salvar a senha." }
        return { ok: true, user: data?.user || null }
      } catch (e) {
        return { ok: false, error: e?.message || "Erro de conexão." }
      }
    },

    async signOut() {
      const sb = client()
      try {
        await sb?.auth?.signOut?.()
      } catch {
        /* segue limpando o que ficou no navegador */
      }
      try {
        profileStore()?.removeItem(PROFILE_KEY)
        profileStore()?.removeItem(LEGACY_TOKEN_KEY)
      } catch {
        /* ignore */
      }
    },

    async ensureFreshSession() {
      if (sessionIsUsable(readStoredSession())) return true
      const sb = client()
      if (!sb?.auth?.refreshSession) return false
      try {
        const { data, error } = await sb.auth.refreshSession()
        if (error || !data?.session?.access_token) return false
        return sessionIsUsable(data.session) || sessionIsUsable(readStoredSession())
      } catch {
        return false
      }
    }
  }

  function startSessionKeeper() {
    const sb = client()
    if (!sb?.auth?.onAuthStateChange) return
    sb.auth.onAuthStateChange(() => {})
  }

  async function fetchProfileOnce() {
    try {
      const result = window.MarisStaffData?.fetchStaffProfile
        ? await window.MarisStaffData.fetchStaffProfile()
        : await fetchStaffProfileDirect()
      if (result?.error || !result?.user) {
        const error = result?.error?.message || "Não foi possível confirmar seu acesso."
        return { ok: false, aborted: profileWasAborted({ error }) || pageUnloading, error }
      }
      const user = normalizeStaffUser(result.user)
      if (!user) return { ok: false, error: "Seu acesso não tem um papel reconhecido." }
      writeCachedUser(user)
      return { ok: true, user }
    } catch (e) {
      const error = e?.message || "Erro de conexão."
      return {
        ok: false,
        aborted: e?.name === "AbortError" || profileWasAborted({ error }) || pageUnloading,
        error
      }
    }
  }

  function enforceRole() {
    const path = normalizePath(window.location.pathname)
    const cached = readCachedUser()
    if (cached && (!isAdminOnlyPath(path) || cached.role === "admin")) {
      setPageHidden(false)
      applyMenus(cached)
      window.MarisStaffAuth.loadProfile()
      return
    }
    if (!isAdminOnlyPath(path)) {
      window.MarisStaffAuth.loadProfile().then((profile) => {
        if (profile.ok) applyMenus(profile.user)
      })
      return
    }
    setPageHidden(true)
    window.MarisStaffAuth.loadProfile()
      .then((profile) => {
        const gate = settleAdminGate(profile)
        if (gate === "wait") return
        if (gate === "deny") {
          redirectHomeDenied()
          return
        }
        setPageHidden(false)
        applyMenus(profile.user)
      })
      .catch((error) => {
        const gate = settleAdminGate({
          ok: false,
          aborted: error?.name === "AbortError",
          error: error?.message
        })
        if (gate === "wait") return
        redirectHomeDenied()
      })
  }

  const scriptEl = document?.currentScript
  const optional = Boolean(scriptEl?.hasAttribute?.("data-optional"))
  const path = normalizePath(window.location?.pathname)

  startSessionKeeper()
  whenReady(bindLogout)

  if (!optional && !isAuthPath(path)) {
    if (window.MarisStaffAuth.isValid()) {
      enforceRole()
    } else if (readStoredSession()?.refresh_token) {
      setPageHidden(true)
      window.MarisStaffAuth.ensureFreshSession().then((ok) => {
        if (!ok) {
          redirectToGate()
          return
        }
        setPageHidden(false)
        enforceRole()
      })
    } else {
      redirectToGate()
    }
  }
})()
