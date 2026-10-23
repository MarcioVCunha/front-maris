import { createCustomerClient } from "../../compartilhado/cliente-auth.js"
import {
  applyCepResult,
  customerMeRequest,
  isValidCpf,
  listAddresses,
  lookupCep,
  readCustomerMe
} from "../../compartilhado/cliente-login.logic.js"

export async function loadShippingAccount() {
  const client = createCustomerClient()
  if (!client?.auth?.getSession) return { token: "", customer: null, addresses: [] }
  const { data } = await client.auth.getSession()
  const token = data?.session?.access_token || ""
  if (!token) return { token: "", customer: null, addresses: [] }
  const request = customerMeRequest({
    baseUrl: window.ENV?.SUPABASE_URL,
    token,
    method: "GET"
  })
  const me = await readCustomerMe(fetch, request)
  const listed = await listAddresses(client)
  return {
    token,
    customer: me.ok ? me.customer : null,
    addresses: listed.ok ? (listed.addresses || []) : []
  }
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisFreteConta = { loadShippingAccount, lookupCep, applyCepResult, isValidCpf }
}
