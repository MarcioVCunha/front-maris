// Painel do admin. Ligado: /admin abre este painel. Promoções continua em /promocoes.
// Fase 2 Passo 1 (canais + preco_marketplace): ADMIN_HOME_CHANNELS_ENABLED ligada.
// Fase 2 Passo 5: Estoque em cards, aba Esgotadas, qtd 1 ao adicionar, Estoque por tipo.
// Módulos: painel.texto, painel.peca, painel.inicio, painel.relatorios, painel.atalhos.
// escapeHtml permanece o do #75. ceilMarketplacePrice permanece a regra do #74.
import { ADD_PRODUCT_CATEGORIES } from "../estoque/adicionar-peca/adicionar-peca.logic.js"

export const ADMIN_DASHBOARD_ENABLED = true
/** Início com canais site/equipe/shopee/ML/tiktok, mês anterior e preço marketplace. Ligada (back-maris PR #16). */
export const ADMIN_HOME_CHANNELS_ENABLED = true

export const DASHBOARD_VIEWS = [
  { id: "inicio", href: "/admin/inicio", label: "Início" },
  { id: "estoque", href: "/admin/estoque", label: "Estoque" },
  { id: "vendas", href: "/admin/vendas", label: "Vendas" },
  { id: "vendedoras", href: "/admin/vendedoras", label: "Vendedoras" },
  { id: "compras", href: "/admin/compras", label: "Compras" },
  { id: "colecoes", href: "/admin/colecoes", label: "Coleções" },
  { id: "promocoes", href: "/admin/promocoes", label: "Promoções" },
  { id: "cupons", href: "/admin/cupons", label: "Cupons & Indicação" },
  { id: "cadastros", href: "/admin/cadastros", label: "Revisar cadastros" }
]

/** Abas liberadas para o papel compras (Marineide). */
export const COMPRAS_VIEWS = ["compras", "vendedoras"]

export const STOCK_LINKS = [
  { id: "estoque", href: "/admin/estoque", label: "Peças" },
  { id: "esgotadas", href: "/admin/esgotadas", label: "Esgotadas" },
  { id: "conjuntos", href: "/admin/conjuntos", label: "Conjuntos" },
  { id: "adicionar", href: "/admin/adicionar", label: "Adicionar peça" },
  { id: "importar", href: "/admin/importar", label: "Importar" }
]


export function shouldShowDashboard(enabled = ADMIN_DASHBOARD_ENABLED) {
  return enabled === true
}

export function shouldShowHomeChannels(enabled = ADMIN_HOME_CHANNELS_ENABLED) {
  return enabled === true
}

/** Espelha a regra do banco: 2,5× + R$5, arredondado pra cima até ,90. Ver docs/contratos/painel-admin-inicio.md. */
export function ceilMarketplacePrice(base) {
  if (base == null || base === "") return null
  const amount = Number(base)
  if (!Number.isFinite(amount) || amount < 0) return null
  const raw = amount * 2.5 + 5
  if (!Number.isFinite(raw) || raw <= 0) return null
  return Math.round((Math.ceil(raw - 0.9) + 0.9) * 100) / 100
}

export function dashboardView(pathname, search = "") {
  const path = String(pathname || "").replace(/\/$/, "") || "/"
  const known = {
    "/admin/inicio": "inicio",
    "/admin/estoque": "estoque",
    "/admin/esgotadas": "esgotadas",
    "/admin/vendas": "vendas",
    "/admin/vendedoras": "vendedoras",
    "/admin/compras": "compras",
    "/admin/colecoes": "colecoes",
    "/admin/promocoes": "promocoes",
    "/admin/cupons": "cupons",
    "/admin/indicacoes": "cupons",
    "/admin/cadastros": "cadastros",
    "/admin/peca": "peca",
    "/admin/conjuntos": "conjuntos",
    "/admin/tipos": "conjuntos",
    "/admin/adicionar": "adicionar",
    "/admin/importar": "importar"
  }
  if (known[path]) return known[path]
  const view = new URLSearchParams(search).get("view")
  if (view === "tipos") return "conjuntos"
  return known[`/admin/${view}`] ? view : "inicio"
}

export function isDashboardAdmin(user) {
  return user?.role === "admin"
}

/** Admin vê tudo; compras entra só nas abas de reposição e vendedoras. */
export function canAccessPanel(user) {
  const role = user?.role
  return role === "admin" || role === "compras"
}

export function viewsForRole(role) {
  if (role === "compras") {
    return DASHBOARD_VIEWS.filter((item) => COMPRAS_VIEWS.includes(item.id))
  }
  return DASHBOARD_VIEWS
}

export function canAccessView(user, view) {
  if (user?.role === "admin") return true
  if (user?.role === "compras") return COMPRAS_VIEWS.includes(view)
  return false
}

export function defaultPanelView(user) {
  return user?.role === "compras" ? "compras" : "inicio"
}

export function panelPathForView(view) {
  const known = DASHBOARD_VIEWS.find((item) => item.id === view)
  return known?.href || "/admin/inicio"
}

export function isPanelLink(pathname) {
  const path = String(pathname || "").replace(/\/$/, "") || "/"
  return path === "/admin" || path.startsWith("/admin/")
}

function reviewBadge(count) {
  const number = Number(count)
  if (!Number.isFinite(number) || number < 0) return ""
  const shown = number > 99 ? "99+" : String(Math.trunc(number))
  return `<span class="dash-count">${shown}</span>`
}

export function navHtml(active, counts, role = "admin") {
  return viewsForRole(role).map((item) => {
    const current = item.id === active ? " aria-current=\"page\"" : ""
    const badge = counts && Object.hasOwn(counts, item.id) ? reviewBadge(counts[item.id]) : ""
    return `<a class="dash-link" href="${item.href}"${current}>${item.label}${badge}</a>`
  }).join("")
}

export function stockNavHtml(active) {
  return STOCK_LINKS.map((item) => {
    const current = item.id === active ? " aria-current=\"page\"" : ""
    return `<a class="sub-link" href="${item.href}"${current}>${item.label}</a>`
  }).join("")
}

export { ADD_PRODUCT_CATEGORIES }

export {
  displayQuantity,
  escapeHtml,
  formatPrice,
  formatActionDateTime,
  formatActionLabel
} from "./painel.texto.logic.js"

export {
  NCM_DEFAULT,
  ORIGEM_DEFAULT,
  STOCK_PAGE_SIZE,
  PACKAGING_FIELDS,
  PACKAGING_DEFAULTS,
  normalizeCategoryDefaults,
  defaultsFor,
  fieldPlaceholder,
  packagingValues,
  samePackagingNumber,
  nextPackagingValues,
  pieceFormState,
  buildProductUpdatePayload,
  validateProductUpdate,
  buildAddProductPayload,
  validateAddProduct,
  archivePayload,
  archiveConfirmText,
  componentSku,
  isComponentSku,
  componentUpdatePayload,
  inStockProducts,
  outOfStockProducts,
  renderStockList,
  ORIGEM_OPTIONS,
  originOptions,
  renderPieceForm,
  renderArchiveDialog,
  renderAddForm,
  renderTipos,
  renderImportHelp,
  filterStock,
  visibleStock,
  renderStockPage,
  renderStockBatchBar,
  renderBatchArchiveDialog,
  renderBatchQuantityDialog,
  renderBatchPriceDialog,
  renderProductHistoryDialog
} from "./painel.peca.logic.js"

export {
  NO_DATA,
  HOME_CHANNEL_ORDER,
  currentMonthKey,
  channelLabel,
  moneyDelta,
  formatMoneyDelta,
  formatWhen,
  normalizeOverview,
  overviewHasDetailedChannels,
  normalizeRecentSales,
  normalizeSellersMonth,
  sellersFromDirectory,
  computeSalesGoalProgress,
  renderGoalBar,
  renderOverdueAlert,
  generateSalesCsv,
  downloadCsvFile,
  renderConversionCard,
  renderCategoryRanking,
  computeAverageTicket,
  stepMonth,
  formatTicketDelta,
  renderTicketCard,
  renderPeriodFilter,
  formatMonthLabel,
  CHANNEL_COLORS,
  renderDailySalesChart,
  renderChannelShareChart
} from "./painel.inicio.logic.js"

export {
  renderInicio,
  SALE_STATUS_FILTERS,
  renderSalesStatusFilter,
  renderVendas,
  renderVendedoras,
  renderCompras
} from "./painel.relatorios.logic.js"

export {
  resolveKeyboardShortcut,
  renderShortcutsDialog,
  shouldShowFab,
  fabMenuHtml,
  feedbackParts,
  LEGACY_ADMIN_REDIRECTS
} from "./painel.atalhos.logic.js"
