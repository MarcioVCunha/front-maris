import { isEmail, passwordCanSubmit, passwordChecks } from "../../compartilhado/cliente-login.logic.js"

export function publicEnv() {
  return window.ENV || window.__MARIS_ENV__ || {}
}

export function guardCustomerLogin(enabled) {
  if (!enabled) {
    window.location.replace("/catalog")
    return false
  }
  document.body.hidden = false
  return true
}

export function setMessage(el, text, type) {
  if (!el) return
  el.hidden = !text
  el.textContent = text || ""
  el.className = type ? `conta-msg conta-msg--${type}` : "conta-msg"
}

export function bindPasswordFields({ input, toggle, confirm, checks, button, email }) {
  const paint = () => {
    const state = passwordChecks(input?.value || "")
    checks?.querySelectorAll("[data-check]").forEach((el) => {
      el.classList.toggle("is-ok", Boolean(state[el.getAttribute("data-check")]))
    })
    const emailOk = email ? isEmail(email.value) : true
    const confirmValue = confirm ? confirm.value : undefined
    if (button) button.disabled = !(emailOk && passwordCanSubmit(input?.value || "", confirmValue))
  }
  input?.addEventListener("input", paint)
  confirm?.addEventListener("input", paint)
  email?.addEventListener("input", paint)
  toggle?.addEventListener("click", () => {
    if (!input) return
    const show = input.type === "password"
    input.type = show ? "text" : "password"
    toggle.textContent = show ? "Ocultar" : "Mostrar"
    toggle.setAttribute("aria-pressed", show ? "true" : "false")
  })
  paint()
  return paint
}

export function destination(next) {
  return next || "/minha-conta"
}
