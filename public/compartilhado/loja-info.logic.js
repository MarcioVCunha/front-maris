/**
 * Dados públicos de atendimento e textos legais (Fase L0).
 * Documento: CPF enquanto o MEI não abre; depois, CNPJ (DC1).
 */

export const LOJA = {
  nomeFantasia: "Maris Semijoias",
  razaoSocial: "Maris",
  /** CPF enquanto o MEI não abre; depois, CNPJ (DC1). */
  documento: "CPF 379.743.338-71",
  email: "contato@lojamaris.com.br",
  site: "https://lojamaris.com.br",
  /** Já usado no catálogo; confirmar se é o número oficial de atendimento. */
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

export const BUYER_STORAGE_KEY = "maris_buyer_profile_v1"
export const BUYER_REMEMBER_KEY = "maris_buyer_remember_v1"

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function enderecoLinha(info = LOJA) {
  const e = info.endereco || {}
  return `${e.logradouro}, ${e.bairro}, ${e.cidade}-${e.uf}, CEP ${e.cep}`
}

export function whatsappDigits(info = LOJA) {
  return String(info.whatsappE164 || "").replace(/\D/g, "")
}

export function formatWhatsappDisplay(digits = whatsappDigits()) {
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

export function whatsappUrl(message = "Oi, gostaria de falar com a Maris", info = LOJA) {
  const phone = whatsappDigits(info)
  const text = encodeURIComponent(String(message || "").trim())
  return `https://wa.me/${phone}?text=${text}`
}

/** Validade curta: "até dd/mm" (só quando a data existir). */
export function formatValidityUntil(isoOrDate) {
  if (!isoOrDate) return ""
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (!Number.isFinite(d.getTime())) return ""
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `até ${day}/${month}`
}

export function privacyNoticeText(kind = "pedido") {
  const link = `<a href="/privacidade">Política de Privacidade</a>`
  if (kind === "waitlist") {
    return `Usamos seus dados só para avisar sobre esta peça. Veja a ${link}.`
  }
  if (kind === "cupom" || kind === "indicacao") {
    return `Usamos seus dados para aplicar o cupom ou a indicação e falar sobre o pedido. Veja a ${link}.`
  }
  return `Usamos seus dados para processar o pedido, confirmar e acompanhar a compra. Veja a ${link}.`
}
