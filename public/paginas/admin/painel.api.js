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
  sellersMonth: "admin-sellers-month",
  saleGet: "admin-sale-get",
  saleUpdate: "admin-sale-update",
  saleCancel: "admin-sale-cancel",
  saleMarkPaid: "admin-sale-mark-paid",
  collectionList: "admin-collection-list",
  collectionSave: "admin-collection-save",
  collectionDelete: "admin-collection-delete",
  promotionList: "admin-promotion-list",
  promotionSave: "admin-promotion-save",
  promotionEnd: "admin-promotion-end",
  monthlyGoalUpdate: "admin-set-monthly-goal",
  weeklySummary: "admin-weekly-summary",
  purchasesOverview: "admin-purchases-overview",
  batchProducts: "admin-product-batch",
  productHistory: "admin-product-history",
  couponList: "admin-coupon-list",
  couponSave: "admin-coupon-save",
  referralList: "admin-referral-list",
  customerReviewList: "admin-customer-review-list",
  customerReviewResolve: "admin-customer-review-resolve"
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
 * POST admin-set-monthly-goal
 * Corpo: { goal: number }
 * Resposta: { ok: true, sales_goal: number }
 */
export async function setMonthlyGoal(goal, client) {
  const result = await call(ADMIN_DASHBOARD_API.monthlyGoalUpdate, {
    method: "POST",
    body: { goal: Number(goal) }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível salvar a meta.")
  return { ok: true, sales_goal: result.data?.sales_goal }
}

/**
 * GET admin-recent-sales v3 (back-maris PR #18) — auth orders.read_all
 * Query: limit, p_channel? (site|equipe|shopee|mercado_livre|tiktok)
 * Sales: seller_name, payment_status, payment_method separados;
 * items[] { id, code, name, quantity, unit_price, line_total, image_url, … }
 * (chips/foto no Início). Ver docs/contratos/painel-venda-edicao.md.
 */
export async function fetchRecentSales({ limit = 20, channel, status } = {}, client) {
  const query = { limit }
  if (channel) query.p_channel = channel
  if (status) query.status = status
  const result = await call(ADMIN_DASHBOARD_API.recentSales, {
    method: "GET",
    query
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar as vendas.")
  return { ok: true, data: result.data || {} }
}

/** GET admin-sale-get v1?order_id= — orders.read_all (PR #18). */
export async function fetchAdminSale({ orderId }, client) {
  const result = await call(ADMIN_DASHBOARD_API.saleGet, {
    method: "GET",
    query: { order_id: orderId }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível abrir a venda.")
  return { ok: true, data: result.data || {} }
}

/** POST admin-sale-update v1 — { order_id, total?, items? }; orders.write_all (PR #18). */
export async function updateAdminSale(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.saleUpdate, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível salvar a venda.")
  return { ok: true, data: result.data || {} }
}

/** POST admin-sale-cancel v1 — { order_id }; orders.write_all (PR #18). */
export async function cancelAdminSale(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.saleCancel, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível cancelar a venda.")
  return { ok: true, data: result.data || {} }
}

/** POST admin-sale-mark-paid v1 — { order_id }; orders.write_all (PR #18). */
export async function markAdminSalePaid(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.saleMarkPaid, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível marcar a venda como paga.")
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

/** GET admin-collection-list — { ok, collections: [...] } */
export async function fetchCollectionList(client) {
  const result = await call(ADMIN_DASHBOARD_API.collectionList, { method: "GET" }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar as coleções.")
  return { ok: true, data: result.data || {} }
}

/** POST admin-collection-save — { ...collection } -> { ok, collection } */
export async function saveCollection(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.collectionSave, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível salvar a coleção.")
  return { ok: true, data: result.data || {} }
}

/** POST admin-collection-delete — { id } -> { ok, id } */
export async function deleteCollection(id, client) {
  const result = await call(ADMIN_DASHBOARD_API.collectionDelete, { method: "POST", body: { id } }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível excluir a coleção.")
  return { ok: true, data: result.data || {} }
}

/** GET admin-promotion-list — { ok, promotions: [...] } */
export async function fetchPromotions(client) {
  const result = await call(ADMIN_DASHBOARD_API.promotionList, { method: "GET" }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar as promoções.")
  return { ok: true, data: result.data || {} }
}

/** POST admin-promotion-save — { ...promotion } -> { ok, promotion } */
export async function savePromotion(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.promotionSave, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível salvar a promoção.")
  return { ok: true, data: result.data || {} }
}

/** POST admin-promotion-end — { id } -> { ok, id, already_ended? } */
export async function endPromotion(id, client) {
  const result = await call(ADMIN_DASHBOARD_API.promotionEnd, { method: "POST", body: { id } }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível encerrar a promoção.")
  return { ok: true, data: result.data || {} }
}

/** POST admin-weekly-summary — { to?, days?, send? } -> { ok, sent, skipped?, message?, summary? } */
export async function triggerWeeklySummaryEmail(body = {}, client) {
  const result = await call(ADMIN_DASHBOARD_API.weeklySummary, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível enviar o resumo semanal.")
  return { ok: true, data: result.data || {} }
}

/** GET admin-purchases-overview — { month } -> { ok, month, total_units_sold, total_orders_paid, top_pieces, restock_requests } */
export async function fetchPurchasesOverview({ month }, client) {
  const result = await call(ADMIN_DASHBOARD_API.purchasesOverview, {
    method: "GET",
    query: { month }
  }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível carregar a visão de compras.")
  return { ok: true, data: result.data || {} }
}

/**
 * POST admin-product-batch (Etapa 5)
 * Corpo: { action, codes, value?, delta_percent?, quantity_mode? }
 */
export async function batchProducts(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.batchProducts, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível processar a ação em lote.")
  }
  return {
    ok: true,
    action: result.data?.action,
    count: result.data?.count || 0,
    updated: Array.isArray(result.data?.updated) ? result.data.updated : []
  }
}

/**
 * GET admin-product-history (Etapa 5)
 * Query: { code?, limit? }
 */
export async function fetchProductHistory(query = {}, client) {
  const result = await call(ADMIN_DASHBOARD_API.productHistory, { method: "GET", query }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível consultar o histórico de estoque.")
  }
  return {
    ok: true,
    code: result.data?.code || null,
    events: Array.isArray(result.data?.events) ? result.data.events : []
  }
}

export async function fetchCoupons(client) {
  const result = await call(ADMIN_DASHBOARD_API.couponList, { method: "POST" }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível carregar os cupons.")
  }
  return {
    ok: true,
    coupons: Array.isArray(result.data?.coupons) ? result.data.coupons : [],
    summary: result.data?.summary || null
  }
}

export async function saveCoupon(payload, client) {
  const result = await call(ADMIN_DASHBOARD_API.couponSave, { method: "POST", body: payload }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível salvar o cupom.")
  }
  return {
    ok: true,
    data: result.data || {}
  }
}

export async function toggleCoupon(couponId, isActive, client) {
  const result = await call(ADMIN_DASHBOARD_API.couponSave, {
    method: "POST",
    body: { action: "toggle", coupon_id: couponId, is_active: isActive }
  }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível alterar a situação do cupom.")
  }
  return {
    ok: true,
    data: result.data || {}
  }
}

export async function createReferralCode(payload, client) {
  const result = await call(ADMIN_DASHBOARD_API.couponSave, {
    method: "POST",
    body: {
      action: "create_referral",
      referrer_name: payload.referrer_name,
      referrer_whatsapp: payload.referrer_whatsapp,
      discount_percent: payload.discount_percent
    }
  }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível gerar código de indicação.")
  }
  return {
    ok: true,
    data: result.data || {}
  }
}

/**
 * GET admin-customer-review-list
 * Auth: staff (Authorization Bearer). Sem apikey e sem x-client-info.
 * Resposta: { ok, pending_count, reviews: [{ id, matched_field, accounts }] }
 * matched_field: "name" | "email" | "whatsapp" | "cpf"
 * accounts: exatamente dois { id, name, email, whatsapp, cpf, order_count, has_login }
 */
export async function fetchCustomerReviews(client) {
  const result = await call(ADMIN_DASHBOARD_API.customerReviewList, { method: "GET" }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível carregar os cadastros para revisão.")
  }
  return { ok: true, data: result.data || {} }
}

/**
 * POST admin-customer-review-resolve
 * Corpo: { review_id, action: "merge" | "keep" | "delete", keep_id?, delete_id? }
 * merge exige keep_id (cadastro que fica). delete exige delete_id (cadastro que sai).
 * keep só precisa de review_id e action.
 * Resposta: { ok, pending_count }
 */
export async function resolveCustomerReview(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.customerReviewResolve, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível concluir a revisão.")
  }
  const pending = Number(result.data?.pending_count)
  return { ok: true, pendingCount: Number.isFinite(pending) ? pending : null }
}

export async function fetchReferrals(client) {
  const result = await call(ADMIN_DASHBOARD_API.referralList, { method: "POST" }, client)
  if (!result?.ok || result.data?.ok === false) {
    return failed(result, "Não foi possível carregar as indicações.")
  }
  return {
    ok: true,
    referrals: Array.isArray(result.data?.referrals) ? result.data.referrals : [],
    summary: result.data?.summary || null
  }
}



