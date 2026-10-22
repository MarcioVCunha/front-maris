import { createCustomerClient } from "../../compartilhado/cliente-auth.js"
import {
  accountUrl,
  clearSignupDraft,
  codeErrorMessage,
  isCustomerLoginEnabled,
  normalizeSignupCode,
  readSignupDraft,
  resendButtonState,
  resendCodeMessage,
  resendSignupCode,
  safeNextPath,
  saveSignupDraft,
  signUpWithPassword,
  signupCodeCanConfirm,
  signupHasSession,
  signupResultMessage,
  verifyEmailCode
} from "../../compartilhado/cliente-login.logic.js"
import { bindPasswordFields, destination, guardCustomerLogin, publicEnv, setMessage } from "./conta-ui.js"

const next = safeNextPath(new URLSearchParams(window.location.search).get("next"))

function syncCodeField(token, confirmCode) {
  const digits = normalizeSignupCode(token.value)
  if (token.value !== digits) token.value = digits
  confirmCode.disabled = !signupCodeCanConfirm(digits)
  return digits
}

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
  const form = document.getElementById("criar-form")
  const codeForm = document.getElementById("criar-codigo")
  const token = document.getElementById("criar-token")
  const confirmCode = document.getElementById("criar-codigo-confirm")
  const resend = document.getElementById("criar-resend")
  const hint = document.getElementById("criar-codigo-hint")
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
  let sentAt = 0
  let resendTimer = 0

  const paintResend = () => {
    const state = resendButtonState(sentAt)
    resend.disabled = state.disabled
    resend.textContent = state.text
  }

  const watchResend = () => {
    window.clearInterval(resendTimer)
    paintResend()
    resendTimer = window.setInterval(() => {
      paintResend()
      if (!resendButtonState(sentAt).disabled) window.clearInterval(resendTimer)
    }, 1000)
  }

  const showCodeStep = (address, at) => {
    pendingEmail = address
    sentAt = at
    email.value = address
    hint.hidden = false
    hint.textContent = `Código enviado para ${address}`
    form.hidden = true
    codeForm.hidden = false
    syncCodeField(token, confirmCode)
    watchResend()
  }

  const draft = readSignupDraft(window.sessionStorage)
  if (draft) showCodeStep(draft.email, draft.sentAt)

  form.addEventListener("submit", async (event) => {
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
      clearSignupDraft(window.sessionStorage)
      window.location.replace(destination(next))
      return
    }
    const saved = saveSignupDraft(window.sessionStorage, email.value)
    showCodeStep(saved.email, saved.sentAt)
  })

  token.addEventListener("input", () => syncCodeField(token, confirmCode))
  token.addEventListener("change", () => syncCodeField(token, confirmCode))
  token.addEventListener("animationstart", (event) => {
    if (event.animationName === "maris-otp-autofill") syncCodeField(token, confirmCode)
  })
  token.addEventListener("paste", (event) => {
    event.preventDefault()
    token.value = normalizeSignupCode(event.clipboardData?.getData("text") || "")
    syncCodeField(token, confirmCode)
  })

  codeForm.addEventListener("submit", async (event) => {
    event.preventDefault()
    const digits = syncCodeField(token, confirmCode)
    if (!pendingEmail || !signupCodeCanConfirm(digits)) return
    confirmCode.disabled = true
    const result = await verifyEmailCode(client, pendingEmail, digits, "signup")
    if (!result.ok) {
      syncCodeField(token, confirmCode)
      setMessage(msg, codeErrorMessage(result.error), "error")
      return
    }
    clearSignupDraft(window.sessionStorage)
    window.location.replace(destination(next))
  })

  resend.addEventListener("click", async () => {
    if (!pendingEmail || resendButtonState(sentAt).disabled) return
    resend.disabled = true
    const result = await resendSignupCode(
      client,
      pendingEmail,
      accountUrl(window.location.origin, "/minha-conta")
    )
    const feedback = resendCodeMessage(result.error)
    setMessage(msg, feedback.text, feedback.type)
    if (feedback.type !== "success") {
      paintResend()
      return
    }
    const saved = saveSignupDraft(window.sessionStorage, pendingEmail)
    sentAt = saved.sentAt
    watchResend()
  })
}

boot()
