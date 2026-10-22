import {
  CUSTOMER_LOGIN_STORAGE_KEY,
  headerAccountLink,
  isCustomerLoginEnabled,
  readStoredCustomerSession
} from "./cliente-login.logic.js"

const link = document.getElementById("header-account-link")
if (link) {
  const enabled = isCustomerLoginEnabled(window.__MARIS_ENV__, window.sessionStorage, window.location)
  let hasSession = false
  if (enabled) {
    let raw = ""
    try {
      raw = window.localStorage.getItem(CUSTOMER_LOGIN_STORAGE_KEY) || ""
    } catch {
      raw = ""
    }
    hasSession = Boolean(readStoredCustomerSession(raw))
  }
  const state = headerAccountLink(enabled, hasSession)
  const label = link.querySelector(".account-label")
  if (label) label.textContent = state.label
  else link.textContent = state.label
  link.setAttribute("href", state.href)
  link.setAttribute("aria-label", state.label)
  link.hidden = state.hidden
}
