// Funções do painel. Ainda não estão publicadas. Os nomes e os corpos ficam aqui.
import { normalizeCategoryDefaults } from "./painel.logic.js"

export const ADMIN_DASHBOARD_API = {
  productList: "admin-product-list",
  productUpdate: "admin-product-update",
  productArchive: "admin-product-archive",
  categoryDefaults: "category-defaults",
  componentUpdate: "admin-component-update",
  productComponents: "admin-product-components",
  addProduct: "add-product",
  importProducts: "import-products",
  monthOverview: "admin-month-overview",
  recentSales: "admin-recent-sales",
  sellersMonth: "admin-sellers-month"
}

function withQuery(url, query) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `${url}?${text}` : url
}

async function defaultCall(name, options) {
  const base = window.ENV.fn(name)
  const url = options.query ? withQuery(base, options.query) : base
  return window.MarisApi.callFunction(url, {
    method: options.method || (options.body == null ? "GET" : "POST"),
    body: options.body,
    auth: "staff",
    timeoutMs: options.timeoutMs
  })
}

async function call(name, options, client) {
  const transport = client?.call || defaultCall
  return transport(name, options)
}

function failed(result, fallback) {
  return {
    ok: false,
    status: result?.status || 0,
    error: result?.data?.error || fallback
  }
}

/**
 * GET admin-product-list
 * Resposta: { ok, products: [{ code, name, unit_price, quantity, categoria,
 *   image_url, image_urls, descricao, peso_g, largura_cm, altura_cm,
 *   comprimento_cm, ncm, origem, gtin, preco_marketplace?,
 *   components?: [{ id, name, sku, quantity, price_percent, is_active }] }] }
 * components (back-maris PR #17): divisões do conjunto. Ver painel-conjuntos.md.
 */
export async function listProducts(client) {
  const result = await call(ADMIN_DASHBOARD_API.productList, { method: "GET" }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível listar as peças.")
  const products = Array.isArray(result.data?.products) ? result.data.products : []
  return { ok: true, products }
}

/**
 * POST admin-product-update
 * Corpo: { code, unit_price, quantity, categoria, image_urls, descricao,
 *   peso_g, largura_cm, altura_cm, comprimento_cm, ncm, origem, gtin }
 */
export async function updateProduct(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.productUpdate, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível salvar a peça.")
  return { ok: true, product: result.data?.product || null }
}

/**
 * POST admin-product-archive (back-maris PR #15)
 * Corpo: { code, archive? } — archive padrão true; false desarquiva.
 * Resposta: { ok, code, archived_at, already_archived, already_unarchived? }
 */
export async function archiveProduct(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.productArchive, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) {
    const archive = body?.archive !== false
    return failed(result, archive ? "Não foi possível arquivar a peça." : "Não foi possível desarquivar a peça.")
  }
  const data = result.data || {}
  return {
    ok: true,
    code: data.code ?? body?.code ?? null,
    archived_at: data.archived_at ?? null,
    already_archived: data.already_archived === true,
    already_unarchived: data.already_unarchived === true
  }
}

/**
 * GET category-defaults (staff). Lê public.category_defaults no servidor.
 * Resposta bruta: { ok, defaults: [{ category, peso_g, largura_cm, altura_cm,
 *   comprimento_cm, ncm }] }
 * Aqui vira mapa { Anel: {...}, Brinco: {...} }. Sem a função, a tabela tem RLS
 * e o front cai no fallback fixo de embalagem.
 */
export async function fetchCategoryDefaults(client) {
  const result = await call(ADMIN_DASHBOARD_API.categoryDefaults, { method: "GET" }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível ler os padrões da categoria.")
  return { ok: true, defaults: normalizeCategoryDefaults(result.data?.defaults) }
}

/**
 * POST admin-component-update
 * Corpo legado do painel: { component_id, product_code, sku } (SKU de uma divisão).
 * sku segue <código>-<DIVISAO>.
 */
export async function updateComponentSku(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.componentUpdate, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível salvar o SKU.")
  return { ok: true, component: result.data?.component || null }
}

/**
 * POST admin-product-components (back-maris PR #17, v1)
 * Corpo: { product_code, components: [{ id?, name, quantity, price_percent, is_active }] }
 * SKU gerado no servidor; % das ativas deve somar 100. Ver docs/contratos/painel-conjuntos.md.
 */
export async function saveProductDivisions(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.productComponents, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível salvar as divisões.")
  }
  return {
    ok: true,
    product_code: result.data?.product_code || body?.product_code || "",
    components: Array.isArray(result.data?.components) ? result.data.components : []
  }
}

/**
 * POST add-product
 * Corpo do cadastro no painel, com os campos novos além de código, nome, preço e fotos.
 */
export async function addProduct(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.addProduct, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível cadastrar a peça.")
  return { ok: true, data: result.data || {} }
}

/**
 * GET admin-month-overview?month=YYYY-MM
 * Formato atual: channels site|equipe|marketplace; best_sellers sem channels.
 * Fase 2 (back-maris PR #16, docs/contratos/painel-admin-inicio.md): previous,
 *   channels site|equipe|shopee|mercado_livre|tiktok (+ previous_*),
 *   best_sellers[].channels. Front com ADMIN_HOME_CHANNELS_ENABLED ligada.
 * Só administrador. Se a função ainda não existe, a tela mostra "sem dados ainda".
 */
export async function fetchMonthOverview({ month }, client) {
  const result = await call(ADMIN_DASHBOARD_API.monthOverview, {
    method: "GET",
    query: { month }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar o mês.")
  return { ok: true, data: result.data || {} }
}

/**
 * GET admin-recent-sales v3 (back-maris PR #18) — auth orders.read_all
 * Query: limit, p_channel? (site|equipe|shopee|mercado_livre|tiktok)
 * Sales: seller_name, payment_status, payment_method separados;
 * items[] com image_url (chips/foto no Início). Ver docs/contratos/painel-venda-edicao.md.
 */
export async function fetchRecentSales({ limit = 20, channel } = {}, client) {
  const query = { limit }
  if (channel) query.p_channel = channel
  const result = await call(ADMIN_DASHBOARD_API.recentSales, {
    method: "GET",
    query
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar as vendas.")
  return { ok: true, data: result.data || {} }
}

/**
 * GET admin-sellers-month?month=YYYY-MM
 * Resposta: { ok, month, timezone, sellers: [{ seller_id, name, paid_count,
 *   paid_orders_count, charged_total, commission_amount, commission_percent, balance }] }
 * balance é o saldo a receber. Só administrador.
 */
export async function fetchSellersMonth({ month }, client) {
  const result = await call(ADMIN_DASHBOARD_API.sellersMonth, {
    method: "GET",
    query: { month }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar as vendedoras.")
  return { ok: true, data: result.data || {} }
}

/**
 * POST import-products
 * Corpo: o array JSON do arquivo. Cada item pode trazer os campos novos.
 */
export async function importProducts(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.importProducts, {
    method: "POST",
    body,
    timeoutMs: 150000
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível importar.")
  return { ok: true, data: result.data || {} }
}
