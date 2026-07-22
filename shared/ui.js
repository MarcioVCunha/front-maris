// Helpers de UI compartilhados pelas páginas do `front/`.
// Centralizam o que era duplicado: mensagens de feedback, escape de HTML,
// markup de preço promocional e controle simples de modais.

window.MarisUI = {
  /**
   * Atualiza um elemento de feedback/mensagem.
   * @param {HTMLElement|null} el
   * @param {string} text
   * @param {string} [type] Classe modificadora ("success" | "error" | "").
   * @param {object} [options]
   * @param {string} [options.baseClass] Classe base do elemento (default: "message").
   * @param {boolean} [options.toggleHidden] Alterna `hidden` conforme o texto (default: true).
   */
  setFeedback(el, text, type = "", options = {}) {
    if (!el) return
    const baseClass = options.baseClass ?? "message"
    if (options.toggleHidden !== false) el.hidden = !text
    el.textContent = text || ""
    el.className = `${baseClass} ${type}`.trim()
  },

  /** Escapa caracteres especiais para uso seguro em innerHTML. */
  escapeHtml(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  },

  /**
   * Markup do par de preços promocionais (riscado + final).
   * @param {number} originalValue
   * @param {number} finalValue
   * @param {string} [separator] Texto entre os spans (default: " ").
   */
  renderPricePair(originalValue, finalValue, separator = " ") {
    const fmt = window.MarisUtils.formatMoneyBRL
    return `<span class="price-old">${fmt(originalValue)}</span>${separator}<span class="price-now">${fmt(finalValue)}</span>`
  },

  openModal(el) {
    if (el) el.hidden = false
  },

  closeModal(el) {
    if (el) el.hidden = true
  },

  /**
   * Primitivo de busca compartilhado: garante type=search e debounce no callback.
   * @param {HTMLInputElement|null} input
   * @param {(value: string) => void} onChange
   * @param {{ debounceMs?: number }} [options]
   * @returns {(() => void)|null} Handler debounced (útil para testes) ou null.
   */
  bindDebouncedSearch(input, onChange, options = {}) {
    if (!input || typeof onChange !== "function") return null
    if (input.type !== "search") input.type = "search"
    const ms = Number.isFinite(options.debounceMs) ? options.debounceMs : 120
    const run = window.MarisUtils.debounce(() => onChange(input.value), ms)
    input.addEventListener("input", run)
    return run
  }
}
