// Cliente único para chamar as Edge Functions do Supabase a partir do browser.
// Unifica os 9+ `fetch` espalhados pelas páginas: monta headers por modo de
// autenticação, serializa o corpo em JSON e faz o parse tolerante da resposta.

window.MarisApi = {
  /**
   * Chama uma Edge Function.
   * @param {string} url URL completa da função.
   * @param {object} [options]
   * @param {"GET"|"POST"} [options.method] Padrão: POST se houver body, senão GET.
   * @param {object} [options.body] Corpo JSON (define Content-Type automaticamente).
   * @param {"none"|"anon"|"staff"} [options.auth] Convenção de cabeçalho de auth.
   * @param {object} [options.headers] Cabeçalhos extras.
   * @returns {Promise<{ ok: boolean, status: number, data: any }>}
   */
  async callFunction(url, options = {}) {
    const { method, body, auth = "none", headers = {} } = options
    const finalHeaders = { ...headers }
    const hasBody = body !== undefined && body !== null
    const finalMethod = method || (hasBody ? "POST" : "GET")

    if (hasBody) finalHeaders["Content-Type"] = "application/json"
    if (auth === "anon") {
      finalHeaders.Authorization = `Bearer ${window.ENV.SUPABASE_ANON_KEY}`
    } else if (auth === "staff") {
      Object.assign(finalHeaders, window.MarisStaffAuth?.authHeaders?.() || {})
    }

    const res = await fetch(url, {
      method: finalMethod,
      headers: finalHeaders,
      ...(hasBody ? { body: JSON.stringify(body) } : {})
    })

    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  }
}
