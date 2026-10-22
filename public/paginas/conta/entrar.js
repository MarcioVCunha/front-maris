import { createCustomerClient } from "../../compartilhado/cliente-auth.js"
import {
  codeErrorMessage,
  codeRequestMessage,
  isCustomerLoginEnabled,
  isEmail,
  loginErrorMessage,
  requestEmailCode,
  safeNextPath,
  signInWithPassword,
  verifyEmailCode
} from "../../compartilhado/cliente-login.logic.js"
import { destination, guardCustomerLogin, publicEnv, setMessage } from "./conta-ui.js"

const params = new URLSearchParams(window.location.search)
const next = safeNextPath(params.get("next"))

function withNext(path) {
  if (!next) return path
  return `${path}?next=${encodeURIComponent(next)}`
}

function showTab(name) {
  document.getElementById("tab-senha").setAttribute("aria-selected", name === "senha" ? "true" : "false")
  document.getElementById("tab-codigo").setAttribute("aria-selected", name === "codigo" ? "true" : "false")
  document.getElementById("panel-senha").hidden = name !== "senha"
  document.getElementById("panel-codigo").hidden = name !== "codigo"
}

async function boot() {
  if (!guardCustomerLogin(isCustomerLoginEnabled(publicEnv(), window.sessionStorage, window.location))) return
  const criar = document.getElementById("link-criar")
  const esqueci = document.getElementById("link-esqueci")
  if (criar) criar.href = withNext("/criar-conta")
  if (esqueci) esqueci.href = withNext("/esqueci-senha")

  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => showTab(tab.getAttribute("data-tab")))
  })

  const msg = document.getElementById("entrar-msg")
  const client = createCustomerClient()
  if (!client) {
    setMessage(msg, "Não foi possível entrar. Tente de novo.", "error")
    return
  }

  const existing = await client.auth.getSession().catch(() => null)
  if (existing?.data?.session?.access_token) {
    window.location.replace(destination(next))
    return
  }

  const senhaForm = document.getElementById("senha-form")
  const senhaSubmit = document.getElementById("senha-submit")
  document.getElementById("senha-toggle").addEventListener("click", () => {
    const input = document.getElementById("senha-password")
    const show = input.type === "password"
    input.type = show ? "text" : "password"
    document.getElementById("senha-toggle").textContent = show ? "Ocultar" : "Mostrar"
  })

  senhaForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    const email = document.getElementById("senha-email").value
    const password = document.getElementById("senha-password").value
    if (!isEmail(email) || !password) {
      setMessage(msg, "Não foi possível entrar. Tente de novo.", "error")
      return
    }
    senhaSubmit.disabled = true
    const result = await signInWithPassword(client, email, password)
    senhaSubmit.disabled = false
    if (!result.ok) {
      setMessage(msg, loginErrorMessage(result.error), "error")
      return
    }
    window.location.replace(destination(next))
  })

  const codigoForm = document.getElementById("codigo-form")
  const verifyForm = document.getElementById("codigo-verify")
  const tokenInput = document.getElementById("codigo-token")
  const confirmBtn = document.getElementById("codigo-confirm")
  tokenInput.addEventListener("input", () => {
    confirmBtn.disabled = tokenInput.value.replace(/\D/g, "").length !== 6
  })

  codigoForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    const email = document.getElementById("codigo-email").value
    if (!isEmail(email)) {
      setMessage(msg, "Não foi possível enviar o código.", "error")
      return
    }
    const send = document.getElementById("codigo-send")
    send.disabled = true
    const result = await requestEmailCode(client, email)
    send.disabled = false
    const feedback = codeRequestMessage(result.error)
    setMessage(msg, feedback.text, feedback.type)
    if (feedback.type === "success") verifyForm.hidden = false
  })

  verifyForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    const email = document.getElementById("codigo-email").value
    const token = tokenInput.value
    confirmBtn.disabled = true
    const result = await verifyEmailCode(client, email, token, "email")
    confirmBtn.disabled = token.replace(/\D/g, "").length !== 6
    if (!result.ok) {
      setMessage(msg, codeErrorMessage(result.error), "error")
      return
    }
    window.location.replace(destination(next))
  })
}

boot()
