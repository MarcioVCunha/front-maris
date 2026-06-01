;(function () {
  const STAFF_TOKEN_KEY = "maris_staff_token"
  const GATE_PATH = "/staff-gate.html"

  function getGateUrl() {
    const path = window.location.pathname.replace(/\\/g, "/")
    const idx = path.lastIndexOf("/")
    const dir = idx >= 0 ? path.slice(0, idx + 1) : "/"
    const depth = (dir.match(/\//g) || []).length - 1
    if (path.includes("/catalog/")) return "../".repeat(Math.max(depth, 1)) + "staff-gate.html"
    if (path.includes("/hubs/") || path.includes("/sales/") || path.includes("/contas-vendedoras/") ||
        path.includes("/importJson/") || path.includes("/addProduct/") || path.includes("/components/")) {
      return "../staff-gate.html"
    }
    return "staff-gate.html"
  }

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
      const gate = getGateUrl()
      window.location.replace(`${gate}?next=${next}`)
      return false
    },

    authHeaders() {
      const token = this.getToken()
      return token ? { Authorization: `Bearer ${token}` } : {}
    }
  }

  if (!window.MarisStaffAuth.requireStaffAccess()) {
    throw new Error("staff-auth-redirect")
  }
})()
