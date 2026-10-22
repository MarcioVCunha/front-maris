import { createCustomerClient } from "../../compartilhado/cliente-auth.js"
import {
  accountUrl,
  codeErrorMessage,
  isCustomerLoginEnabled,
  safeNextPath,
  signUpWithPassword,
  signupHasSession,
  signupResultMessage,
  verifyEmailCode
} from "../../compartilhado/cliente-login.logic.js"
import { bindPasswordFields, destination, guardCustomerLogin, publicEnv, setMessage } from "./conta-ui.js"

const next = safeNextPath(new URLSearchParams(window.location.search).get("next"))

async function boot() {
  if (!guardCustomerLogin(isCustomerLoginEnabled(publicEnv(), window.sessionStorage, window.location))) return
  const entrar = document.getElementById("link-entrar")
  if (entrar && next) entrar.href = `/entrar?next=${encodeURIComponent(next)}`

  const msg = document.getElementById("criar-msg")
  const client = createCustomerClient()
  if (!client) {
    setMessage(msg, "Não foi possível criar a conta. Tente de novo.", "error")
    return
  }

  const email = document.getElementById("criar-email")
  const password = document.getElementById("criar-password")
  const confirm = document.getElementById("criar-confirm")
  const mismatch = document.getElementById("criar-mismatch")
  const paint = bindPasswordFields({
    input: password,
    toggle: document.getElementById("criar-toggle"),
    confirm,
    checks: document.getElementById("criar-checks"),
    button: document.getElementById("criar-submit"),
    email
  })
  const showMismatch = () => {
    mismatch.hidden = !confirm.value || confirm.value === password.value
  }
  confirm.addEventListener("input", showMismatch)
  password.addEventListener("input", showMismatch)

  let pendingEmail = ""
  document.getElementById("criar-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    paint()
    if (document.getElementById("criar-submit").disabled) return
    document.getElementById("criar-submit").disabled = true
    const result = await signUpWithPassword(
      client,
      email.value,
      password.value,
      accountUrl(window.location.origin, "/minha-conta")
    )
    const feedback = signupResultMessage(result.error)
    setMessage(msg, feedback.text, feedback.type)
    if (feedback.type !== "success") {
      paint()
      return
    }
    if (signupHasSession(result)) {
      window.location.replace(destination(next))
      return
    }
    pendingEmail = email.value
    document.getElementById("criar-form").hidden = true
    document.getElementById("criar-codigo").hidden = false
  })

  const token = document.getElementById("criar-token")
  const confirmCode = document.getElementById("criar-confirm")
  token.addEventListener("input", () => {
    confirmCode.disabled = token.value.replace(/\D/g, "").length !== 6
  })
  document.getElementById("criar-codigo").addEventListener("submit", async (event) => {
    event.preventDefault()
    confirmCode.disabled = true
    const result = await verifyEmailCode(client, pendingEmail, token.value, "signup")
    if (!result.ok) {
      confirmCode.disabled = token.value.replace(/\D/g, "").length !== 6
      setMessage(msg, codeErrorMessage(result.error), "error")
      return
    }
    window.location.replace(destination(next))
  })
}

boot()
