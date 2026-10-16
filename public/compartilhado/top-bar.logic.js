// Configuração e renderização da faixa de avisos no topo do site.
// Todas as mensagens e links são configuráveis aqui.

export const DEFAULT_TOP_BAR_MESSAGES = [
  {
    id: "frete",
    icon: "shipping",
    text: "Envio pelas plataformas: Shopee, Mercado Livre e TikTok Shop",
    shortText: "Envio pelas plataformas parceiras",
    link: null
  },
  {
    id: "pix",
    icon: "pix",
    text: "5% de desconto no Pix à vista",
    shortText: "5% de desconto no Pix",
    link: null
  },
  {
    id: "trocas",
    icon: "shield",
    text: "Troca ou retorno em até 1 mês no site · Garantia 90 dias",
    shortText: "Troca em até 1 mês no site",
    link: "/trocas"
  }
]

export function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function topBarItemById(id, messages = DEFAULT_TOP_BAR_MESSAGES) {
  const list = Array.isArray(messages) ? messages : []
  return list.find((item) => item.id === id) || null
}

export function renderTopBarHtml(messages = DEFAULT_TOP_BAR_MESSAGES) {
  const list = Array.isArray(messages) ? messages : []
  if (!list.length) return ""

  const itemsHtml = list.map((item) => {
    const textEscaped = escapeHtml(item.text)
    const content = `<span class="top-bar-text">${textEscaped}</span>`
    const body = item.link
      ? `<a href="${escapeHtml(item.link)}" class="top-bar-link" title="${textEscaped}">${content}</a>`
      : content
    return `<div class="top-bar-item" data-id="${escapeHtml(item.id)}">${body}</div>`
  }).join('<span class="top-bar-sep" aria-hidden="true">·</span>')

  return `
<aside class="top-announcement-bar" role="region" aria-label="Avisos da loja">
  <div class="top-bar-inner">
    ${itemsHtml}
  </div>
</aside>`.trim()
}
