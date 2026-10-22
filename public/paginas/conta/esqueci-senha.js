import { createCustomerClient } from "../../compartilhado/cliente-auth.js"
import {
  accountUrl,
  isCustomerLoginEnabled,
  isEmail,
  requestPasswordReset,
  resetRequestMessage
} from "../../compartilhado/cliente-login.logic.js"
import { guardCustomerLogin, publicEnv, setMessage } from "./conta-ui.js"

async function boot() {
  if (!guardCustomerLogin(isCustomerLoginEnabled(publicEnv(), window.sessionStorage, window.location))) return
  const msg = document.getElementById("esqueci-msg")
  const client = createCustomerClient()
  const form = document.getElementById("esqueci-form")
  const submit = document.getElementById("esqueci-submit")
  if (!client) {
    setMessage(msg, "Não foi possível enviar o e-mail. Tente de novo.", "error")
    return
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const email = document.getElementById("esqueci-email").value
    if (!isEmail(email)) {
      setMessage(msg, "Não foi possível enviar o e-mail. Tente de novo.", "error")
      return
    }
    submit.disabled = true
    const result = await requestPasswordReset(client, email, accountUrl(window.location.origin, "/redefinir-senha"))
    submit.disabled = false
    const feedback = resetRequestMessage(result.error)
    setMessage(msg, feedback.text, feedback.type)
  })
}

boot()
