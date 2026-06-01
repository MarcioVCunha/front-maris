;(function () {
  const { createSupabaseClient } = window.MarisUtils

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "")
  }

  window.MarisCustomerAuth = {
    supabase: createSupabaseClient(),

    async getSession() {
      const { data } = await this.supabase.auth.getSession()
      return data.session
    },

    async getUser() {
      const { data } = await this.supabase.auth.getUser()
      return data.user
    },

    isEmailConfirmed(user) {
      return Boolean(user?.email_confirmed_at)
    },

    async requireAuth(options = {}) {
      const { redirectTo = "auth.html" } = options
      const session = await this.getSession()
      if (!session?.user) {
        const next = encodeURIComponent(window.location.pathname.split("/").pop() + window.location.search)
        window.location.href = `${redirectTo}?next=${next}`
        return null
      }
      if (!this.isEmailConfirmed(session.user)) {
        window.location.href = `auth.html?pending=1&next=${encodeURIComponent(window.location.pathname.split("/").pop())}`
        return null
      }
      return session
    },

    async getProfile() {
      const user = await this.getUser()
      if (!user) return null
      const { data, error } = await this.supabase
        .from("profiles")
        .select("id, full_name, whatsapp")
        .eq("id", user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },

    async signUp({ email, password, fullName, whatsapp }) {
      return this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            whatsapp: onlyDigits(whatsapp)
          },
          emailRedirectTo: window.ENV.CATALOG_AUTH_REDIRECT_URL || window.location.origin + window.location.pathname.replace(/[^/]+$/, "auth-callback.html")
        }
      })
    },

    async signIn(email, password) {
      return this.supabase.auth.signInWithPassword({ email, password })
    },

    async signOut() {
      return this.supabase.auth.signOut()
    },

    async updateProfile({ fullName, whatsapp }) {
      const user = await this.getUser()
      if (!user) throw new Error("Não autenticado")
      return this.supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          whatsapp: onlyDigits(whatsapp),
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)
    }
  }
})()
