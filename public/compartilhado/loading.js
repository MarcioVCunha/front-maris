// Brilho de carregamento da Maris — estrela de 4 pontas que enche e esvazia.

export const LOADING_ARIA_LABEL = "Carregando"

// Losango pontiagudo (✦), viewBox 0 0 32 32.
export const SPARK_PATH =
  "M16 1.2 19.4 12.6 30.8 16 19.4 19.4 16 30.8 12.6 19.4 1.2 16 12.6 12.6 Z"

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
}

/**
 * Markup do carregamento.
 * @param {object} [options]
 * @param {string} [options.label] aria-label (default: "Carregando")
 * @param {"sm"|"md"|"lg"|""} [options.size]
 * @param {boolean} [options.block] centraliza em bloco
 */
export function loadingHtml(options = {}) {
  const label = options.label || LOADING_ARIA_LABEL
  const size = options.size ? ` maris-loading--${options.size}` : ""
  const block = options.block ? " maris-loading--block" : ""
  return `<div class="maris-loading${size}${block}" role="status" aria-label="${escapeAttr(label)}">
  <svg class="maris-loading__spark" viewBox="0 0 32 32" width="40" height="40" aria-hidden="true" focusable="false">
    <path class="maris-loading__spark-outline" d="${SPARK_PATH}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"></path>
    <path class="maris-loading__spark-fill" d="${SPARK_PATH}" fill="currentColor"></path>
  </svg>
</div>`
}

export function isLoadingMarkup(html) {
  return /class="[^"]*maris-loading/.test(String(html || "")) &&
    /role="status"/.test(String(html || "")) &&
    /aria-label="Carregando"/.test(String(html || ""))
}

const api = {
  ARIA_LABEL: LOADING_ARIA_LABEL,
  SPARK_PATH,
  html: loadingHtml,
  isLoadingMarkup
}

if (typeof window !== "undefined") {
  window.MarisLoading = api
}

export default api
