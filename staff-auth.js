;(function () {
  const STAFF_TOKEN_KEY = "maris_staff_token"
  const GATE_PATH = "/equipe"

  function decodeJwtPayload(token) {
    try {
      const part = token.split(".")[1]
      if (!part) return null
      const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"))
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  function isStaffTokenValid(token) {
    if (!token) return false
    const payload = decodeJwtPayload(token)
    if (!payload || payload.role !== "staff") return false
    const exp = Number(payload.exp)
    if (!Number.isFinite(exp)) return false
    return exp > Math.floor(Date.now() / 1000)
  }

  window.MarisStaffAuth = {
    TOKEN_KEY: STAFF_TOKEN_KEY,

    getToken() {
      return sessionStorage.getItem(STAFF_TOKEN_KEY) || ""
    },

    setToken(token) {
      sessionStorage.setItem(STAFF_TOKEN_KEY, token)
    },

    clearToken() {
      sessionStorage.removeItem(STAFF_TOKEN_KEY)
    },

    isValid() {
      return isStaffTokenValid(this.getToken())
    },

    requireStaffAccess() {
      if (this.isValid()) return true
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.replace(`${GATE_PATH}?next=${next}`)
      return false
    },

    authHeaders() {
      const token = this.getToken()
      return token ? { Authorization: `Bearer ${token}` } : {}
    }
  }

  // Na própria página do gate não fazemos o auto-redirect (evita loop): lá o
  // MarisStaffAuth é usado apenas para checar/gravar o token.
  if (window.location.pathname !== GATE_PATH && !window.MarisStaffAuth.requireStaffAccess()) {
    throw new Error("staff-auth-redirect")
  }
})()
