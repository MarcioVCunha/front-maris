// Cliente Supabase só da cliente. Chave de storage separada da equipe.
// persistSession mantém a sessão depois de fechar o navegador (D12).
// flowType implicit: o link de redefinir senha abre mesmo em outro app de e-mail.

import { CUSTOMER_LOGIN_STORAGE_KEY } from "./cliente-login.logic.js"

let clientSingleton = null

export function createCustomerClient() {
  if (clientSingleton) return clientSingleton
  const supabase = window.supabase
  const env = window.ENV || window.__MARIS_ENV__
  if (!supabase?.createClient || !env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) return null
  clientSingleton = supabase.createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: CUSTOMER_LOGIN_STORAGE_KEY,
      flowType: "implicit"
    }
  })
  return clientSingleton
}
