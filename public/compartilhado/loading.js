// Brilho de carregamento da Maris — estrela de 4 pontas que enche e esvazia,
// e esqueletos de carregamento (Skeleton Loading) com efeito shimmer.

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
 * Markup do carregamento básico (brilho da estrela Maris).
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

/**
 * Card individual de esqueleto do catálogo com efeito shimmer.
 */
export function skeletonProductCardHtml() {
  return `
    <article class="maris-skeleton-card" aria-hidden="true">
      <div class="maris-skeleton-media maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-body">
        <div class="maris-skeleton-line maris-skeleton-line--title maris-skeleton-shimmer"></div>
        <div class="maris-skeleton-line maris-skeleton-line--subtitle maris-skeleton-shimmer"></div>
        <div class="maris-skeleton-row">
          <div class="maris-skeleton-line maris-skeleton-line--price maris-skeleton-shimmer"></div>
          <div class="maris-skeleton-line maris-skeleton-line--badge maris-skeleton-shimmer"></div>
        </div>
      </div>
    </article>
  `
}

/**
 * Grade de esqueletos para a tela do catálogo.
 * @param {number} count Quantidade de cards (padrão 8)
 */
export function skeletonCatalogGridHtml(count = 8) {
  const cards = Array.from({ length: Math.max(1, count) }, () => skeletonProductCardHtml()).join("")
  return `
    <div class="maris-skeleton-grid" role="status" aria-label="Carregando produtos" aria-busy="true">
      ${cards}
    </div>
  `
}

/**
 * Esqueleto para a visualização detalhada de uma peça.
 */
export function skeletonPiecePageHtml() {
  return `
    <div class="maris-skeleton-piece" role="status" aria-label="Carregando detalhes da peça" aria-busy="true">
      <div class="maris-skeleton-piece__gallery maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-piece__info">
        <div class="maris-skeleton-line maris-skeleton-line--badge maris-skeleton-shimmer" style="width: 80px; height: 20px;"></div>
        <div class="maris-skeleton-line maris-skeleton-line--title maris-skeleton-shimmer" style="width: 85%; height: 26px; margin: 12px 0;"></div>
        <div class="maris-skeleton-line maris-skeleton-line--price maris-skeleton-shimmer" style="width: 140px; height: 30px; margin-bottom: 20px;"></div>
        <div class="maris-skeleton-line maris-skeleton-shimmer" style="width: 100%; height: 46px; border-radius: 8px; margin-bottom: 18px;"></div>
        <div class="maris-skeleton-line maris-skeleton-shimmer" style="width: 100%; height: 16px; margin-bottom: 8px;"></div>
        <div class="maris-skeleton-line maris-skeleton-shimmer" style="width: 90%; height: 16px; margin-bottom: 8px;"></div>
        <div class="maris-skeleton-line maris-skeleton-shimmer" style="width: 75%; height: 16px;"></div>
      </div>
    </div>
  `
}

/**
 * Esqueleto contextual para as abas do painel admin.
 * @param {"inicio"|"vendas"|"vendedoras"|"compras"|"estoque"|"cupons"|"default"} view
 */
export function skeletonAdminDashboardHtml(view = "default") {
  const statCards = `
    <div class="maris-skeleton-admin__stats">
      <div class="maris-skeleton-stat-card maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-stat-card maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-stat-card maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-stat-card maris-skeleton-shimmer"></div>
    </div>
  `

  if (view === "inicio") {
    return `
      <div class="maris-skeleton-admin" role="status" aria-label="Carregando painel" aria-busy="true">
        <div class="maris-skeleton-line maris-skeleton-shimmer" style="width: 200px; height: 38px; border-radius: 8px; margin-bottom: 4px;"></div>
        ${statCards}
        <div class="maris-skeleton-admin__chart maris-skeleton-shimmer"></div>
        <div class="maris-skeleton-admin__bar maris-skeleton-shimmer" style="height: 38px; border-radius: 8px;"></div>
        <div class="maris-skeleton-admin__list">
          <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
          <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
          <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
        </div>
      </div>
    `
  }

  if (view === "cupons") {
    return `
      <div class="maris-skeleton-admin" role="status" aria-label="Carregando cupons" aria-busy="true">
        <div class="maris-skeleton-line maris-skeleton-shimmer" style="width: 240px; height: 36px; border-radius: 8px; margin-bottom: 4px;"></div>
        ${statCards}
        <div class="maris-skeleton-admin__bar maris-skeleton-shimmer" style="height: 44px; border-radius: 8px;"></div>
        <div class="maris-skeleton-grid" style="margin-top: 8px;">
          ${skeletonProductCardHtml()}
          ${skeletonProductCardHtml()}
          ${skeletonProductCardHtml()}
          ${skeletonProductCardHtml()}
        </div>
      </div>
    `
  }

  if (view === "vendedoras") {
    return `
      <div class="maris-skeleton-admin" role="status" aria-label="Carregando equipe" aria-busy="true">
        <div class="maris-skeleton-line maris-skeleton-shimmer" style="width: 220px; height: 36px; border-radius: 8px; margin-bottom: 4px;"></div>
        <div class="maris-skeleton-admin__stats" style="grid-template-columns: repeat(3, 1fr);">
          <div class="maris-skeleton-stat-card maris-skeleton-shimmer"></div>
          <div class="maris-skeleton-stat-card maris-skeleton-shimmer"></div>
          <div class="maris-skeleton-stat-card maris-skeleton-shimmer"></div>
        </div>
        <div class="maris-skeleton-admin__list" style="margin-top: 12px;">
          <div class="maris-skeleton-admin__card maris-skeleton-shimmer" style="height: 120px; border-radius: 12px;"></div>
          <div class="maris-skeleton-admin__card maris-skeleton-shimmer" style="height: 120px; border-radius: 12px;"></div>
        </div>
      </div>
    `
  }

  if (view === "estoque" || view === "esgotadas") {
    return `
      <div class="maris-skeleton-admin" role="status" aria-label="Carregando estoque" aria-busy="true">
        <div class="maris-skeleton-admin__bar maris-skeleton-shimmer" style="height: 48px; border-radius: 8px;"></div>
        <div class="maris-skeleton-admin__list" style="margin-top: 12px;">
          <div class="maris-skeleton-admin__row maris-skeleton-shimmer" style="height: 60px;"></div>
          <div class="maris-skeleton-admin__row maris-skeleton-shimmer" style="height: 60px;"></div>
          <div class="maris-skeleton-admin__row maris-skeleton-shimmer" style="height: 60px;"></div>
          <div class="maris-skeleton-admin__row maris-skeleton-shimmer" style="height: 60px;"></div>
          <div class="maris-skeleton-admin__row maris-skeleton-shimmer" style="height: 60px;"></div>
        </div>
      </div>
    `
  }

  // Padrão universal
  return `
    <div class="maris-skeleton-admin" role="status" aria-label="Carregando painel" aria-busy="true">
      ${statCards}
      <div class="maris-skeleton-admin__main maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-admin__list">
        <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
        <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
        <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
      </div>
    </div>
  `
}

/**
 * Esqueleto para a vitrine de Nova Venda.
 */
export function skeletonNovaVendaGridHtml(count = 6) {
  const cards = Array.from({ length: Math.max(1, count) }, () => `
    <article class="maris-skeleton-card maris-skeleton-card--venda" aria-hidden="true">
      <div class="maris-skeleton-media maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-body">
        <div class="maris-skeleton-line maris-skeleton-line--title maris-skeleton-shimmer"></div>
        <div class="maris-skeleton-row">
          <div class="maris-skeleton-line maris-skeleton-line--price maris-skeleton-shimmer"></div>
          <div class="maris-skeleton-line maris-skeleton-line--btn maris-skeleton-shimmer"></div>
        </div>
      </div>
    </article>
  `).join("")

  return `<div class="maris-skeleton-venda-grid" role="status" aria-label="Carregando catálogo de peças" aria-busy="true">${cards}</div>`
}

/**
 * Esqueleto para as linhas do carrinho.
 */
export function skeletonCartLinesHtml(count = 3) {
  const lines = Array.from({ length: Math.max(1, count) }, () => `
    <div class="maris-skeleton-cart-line" aria-hidden="true">
      <div class="maris-skeleton-cart-thumb maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-cart-info">
        <div class="maris-skeleton-line maris-skeleton-line--title maris-skeleton-shimmer" style="width: 70%;"></div>
        <div class="maris-skeleton-line maris-skeleton-line--subtitle maris-skeleton-shimmer" style="width: 40%; margin-top: 4px;"></div>
        <div class="maris-skeleton-line maris-skeleton-line--price maris-skeleton-shimmer" style="width: 90px; margin-top: 8px;"></div>
      </div>
      <div class="maris-skeleton-cart-qty maris-skeleton-shimmer"></div>
    </div>
  `).join("")

  return `<div class="maris-skeleton-cart-list" role="status" aria-label="Carregando itens da cesta" aria-busy="true">${lines}</div>`
}

const api = {
  ARIA_LABEL: LOADING_ARIA_LABEL,
  SPARK_PATH,
  html: loadingHtml,
  isLoadingMarkup,
  skeletonProductCard: skeletonProductCardHtml,
  skeletonCatalogGrid: skeletonCatalogGridHtml,
  skeletonPiecePage: skeletonPiecePageHtml,
  skeletonAdminDashboard: skeletonAdminDashboardHtml,
  skeletonNovaVendaGrid: skeletonNovaVendaGridHtml,
  skeletonCartLines: skeletonCartLinesHtml
}

if (typeof window !== "undefined") {
  window.MarisLoading = api
}

export default api
