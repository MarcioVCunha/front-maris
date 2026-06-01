const auth = window.MarisCustomerAuth
const params = new URLSearchParams(window.location.search)
const nextPage = params.get("next") || "catalog.html"

const pendingBox = document.getElementById("pending-box")
const authTabs = document.getElementById("auth-tabs")
const tabLogin = document.getElementById("tab-login")
const tabSignup = document.getElementById("tab-signup")
const loginForm = document.getElementById("login-form")
const signupForm = document.getElementById("signup-form")
const messageEl = document.getElementById("auth-message")

function setMessage(text, isError = false) {
  messageEl.textContent = text
  messageEl.className = `auth-message ${isError ? "error" : ""}`.trim()
}

if (params.get("pending") === "1") {
  pendingBox.hidden = false
  authTabs.hidden = true
}

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active")
  tabSignup.classList.remove("active")
  loginForm.hidden = false
  signupForm.hidden = true
})

tabSignup.addEventListener("click", () => {
  tabSignup.classList.add("active")
  tabLogin.classList.remove("active")
  signupForm.hidden = false
  loginForm.hidden = true
})

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  setMessage("")
  const { error } = await auth.signIn(
    document.getElementById("login-email").value.trim(),
    document.getElementById("login-password").value
  )
  if (error) {
    setMessage(error.message, true)
    return
  }
  const { data: userData } = await auth.supabase.auth.getUser()
  if (!auth.isEmailConfirmed(userData.user)) {
    setMessage("Confirme seu e-mail antes de continuar.", true)
    return
  }
  window.location.href = nextPage
})

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault()
  setMessage("")
  const { error } = await auth.signUp({
    email: document.getElementById("signup-email").value.trim(),
    password: document.getElementById("signup-password").value,
    fullName: document.getElementById("signup-name").value,
    whatsapp: document.getElementById("signup-whatsapp").value
  })
  if (error) {
    setMessage(error.message, true)
    return
  }
  pendingBox.hidden = false
  authTabs.hidden = true
  setMessage("Conta criada! Confirme o e-mail que enviamos.")
})

;(async () => {
  const session = await auth.getSession()
  if (session?.user && auth.isEmailConfirmed(session.user)) {
    window.location.href = nextPage
  }
})()
