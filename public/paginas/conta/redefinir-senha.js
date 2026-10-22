import { createCustomerClient } from "../../compartilhado/cliente-auth.js"
import {
  establishRecoverySession,
  isCustomerLoginEnabled,
  passwordUpdateMessage,
  updatePassword
} from "../../compartilhado/cliente-login.logic.js"
import { bindPasswordFields, guardCustomerLogin, publicEnv, setMessage } from "./conta-ui.js"

async function boot() {
  if (!guardCustomerLogin(isCustomerLoginEnabled(publicEnv(), window.sessionStorage, window.location))) return
  const msg = document.getElementById("redefinir-msg")
  const form = document.getElementById("redefinir-form")
  const client = createCustomerClient()
  if (!client) {
    setMessage(msg, "Este link expirou. Peça outro.", "error")
    return
  }
  const session = await establishRecoverySession(client, window.location)
  if (!session) {
    setMessage(msg, "Este link expirou. Peça outro.", "error")
    return
  }
  form.hidden = false
  const password = document.getElementById("redefinir-password")
  const confirm = document.getElementById("redefinir-confirm")
  const mismatch = document.getElementById("redefinir-mismatch")
  const paint = bindPasswordFields({
    input: password,
    toggle: document.getElementById("redefinir-toggle"),
    confirm,
    checks: document.getElementById("redefinir-checks"),
    button: document.getElementById("redefinir-submit")
  })
  const showMismatch = () => {
    mismatch.hidden = !confirm.value || confirm.value === password.value
  }
  confirm.addEventListener("input", showMismatch)
  password.addEventListener("input", showMismatch)

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (document.getElementById("redefinir-submit").disabled) return
    document.getElementById("redefinir-submit").disabled = true
    const result = await updatePassword(client, password.value)
    const feedback = passwordUpdateMessage(result.error)
    setMessage(msg, feedback.text, feedback.type)
    if (!result.ok) {
      paint()
      return
    }
    window.location.replace("/minha-conta")
  })
}

boot()
