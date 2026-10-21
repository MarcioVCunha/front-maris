/**
 * Bridge clássico para páginas que carregam /compartilhado/loja-info.js.
 * A fonte de verdade dos textos fica em loja-info.logic.js (ESM).
 */
;(function (root) {
  const LOJA = {
    nomeFantasia: "Maris Semijoias",
    razaoSocial: "Maris",
    documento: "CPF 379.743.338-71",
    email: "contato@lojamaris.com.br",
    site: "https://lojamaris.com.br",
    whatsappE164: "5519992732874",
    endereco: {
      logradouro: "Rua Doutor Alfredo Guedes, 47",
      bairro: "Centro",
      cidade: "Tambaú",
      uf: "SP",
      cep: "13710-087",
    },
    horarioAtendimento: "seg. a sex., das 9h às 18h",
    prazoResposta: "Respondemos em horário comercial (seg. a sex., 9h–18h)",
    encarregadoNome: "Marcio",
    garantiaBanhoAnos: 1,
    arrependimentoDias: 7,
  }

  const BUYER_STORAGE_KEY = "maris_buyer_profile_v1"
  const BUYER_REMEMBER_KEY = "maris_buyer_remember_v1"

  function enderecoLinha(info = LOJA) {
    const e = info.endereco || {}
    return `${e.logradouro}, ${e.bairro}, ${e.cidade}-${e.uf}, CEP ${e.cep}`
  }

  function whatsappDigits(info = LOJA) {
    return String(info.whatsappE164 || "").replace(/\D/g, "")
  }

  function formatWhatsappDisplay(digits = whatsappDigits()) {
    const d = String(digits || "").replace(/\D/g, "")
    if (d.length === 13 && d.startsWith("55")) {
      const local = d.slice(2)
      return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
    }
    if (d.length === 11) {
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    }
    return d || ""
  }

  function whatsappUrl(message = "Oi, gostaria de falar com a Maris", info = LOJA) {
    const phone = whatsappDigits(info)
    const text = encodeURIComponent(String(message || "").trim())
    return `https://wa.me/${phone}?text=${text}`
  }

  function formatValidityUntil(isoOrDate) {
    if (!isoOrDate) return ""
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
    if (!Number.isFinite(d.getTime())) return ""
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    return `até ${day}/${month}`
  }

  function privacyNoticeText(kind = "pedido") {
    const link = `<a href="/privacidade">Política de Privacidade</a>`
    if (kind === "waitlist") {
      return `Usamos seus dados só para avisar sobre esta peça. Veja a ${link}.`
    }
    if (kind === "cupom" || kind === "indicacao") {
      return `Usamos seus dados para aplicar o cupom ou a indicação e falar sobre o pedido. Veja a ${link}.`
    }
    return `Usamos seus dados para processar o pedido, confirmar e acompanhar a compra. Veja a ${link}.`
  }

  function isRememberEnabled() {
    try {
      return localStorage.getItem(BUYER_REMEMBER_KEY) === "1"
    } catch {
      return false
    }
  }

  function setRememberEnabled(enabled) {
    try {
      if (enabled) localStorage.setItem(BUYER_REMEMBER_KEY, "1")
      else localStorage.removeItem(BUYER_REMEMBER_KEY)
    } catch {}
  }

  function forgetBuyerData() {
    try {
      localStorage.removeItem(BUYER_STORAGE_KEY)
      localStorage.removeItem(BUYER_REMEMBER_KEY)
    } catch {}
  }

  function fillContactLinks(rootEl = document) {
    const scope = rootEl || document
    const href = whatsappUrl()
    scope.querySelectorAll("[data-loja-whatsapp]").forEach((el) => {
      el.setAttribute("href", href)
    })
    scope.querySelectorAll("[data-loja-email]").forEach((el) => {
      el.setAttribute("href", `mailto:${LOJA.email}`)
      if (!el.textContent.trim() || el.getAttribute("data-loja-fill") === "text") {
        el.textContent = LOJA.email
      }
    })
    scope.querySelectorAll("[data-loja-doc]").forEach((el) => {
      el.textContent = LOJA.documento
    })
    scope.querySelectorAll("[data-loja-endereco]").forEach((el) => {
      el.textContent = enderecoLinha()
    })
    scope.querySelectorAll("[data-loja-whatsapp-display]").forEach((el) => {
      el.textContent = formatWhatsappDisplay()
    })
    scope.querySelectorAll("[data-loja-prazo]").forEach((el) => {
      el.textContent = LOJA.prazoResposta
    })
  }

  root.MarisLojaInfo = {
    LOJA,
    BUYER_STORAGE_KEY,
    BUYER_REMEMBER_KEY,
    enderecoLinha,
    whatsappDigits,
    formatWhatsappDisplay,
    whatsappUrl,
    formatValidityUntil,
    privacyNoticeText,
    isRememberEnabled,
    setRememberEnabled,
    forgetBuyerData,
    fillContactLinks,
  }
})(typeof window !== "undefined" ? window : globalThis)
