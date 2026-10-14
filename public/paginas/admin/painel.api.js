// Funções do painel. Ainda não estão publicadas. Os nomes e os corpos ficam aqui.

export const ADMIN_DASHBOARD_API = {
  productList: "admin-product-list",
  productUpdate: "admin-product-update",
  productArchive: "admin-product-archive",
  categoryDefaults: "category-defaults",
  componentUpdate: "admin-component-update",
  addProduct: "add-product",
  importProducts: "import-products"
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
 *   comprimento_cm, ncm, origem, gtin, components: [{ id, name, sku }] }] }
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
 * POST admin-product-archive
 * Corpo: { code }
 */
export async function archiveProduct(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.productArchive, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível arquivar a peça.")
  return { ok: true }
}

/**
 * GET category-defaults
 * Resposta: { ok, defaults: { Anel: { descricao, peso_g, largura_cm, altura_cm,
 *   comprimento_cm, ncm, origem } } }
 */
export async function fetchCategoryDefaults(client) {
  const result = await call(ADMIN_DASHBOARD_API.categoryDefaults, { method: "GET" }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível ler os padrões da categoria.")
  return { ok: true, defaults: result.data?.defaults || {} }
}

/**
 * POST admin-component-update
 * Corpo: { component_id, product_code, sku }
 * sku segue o padrão <código>-<TIPO>.
 */
export async function updateComponentSku(body, client) {
  const result = await call(ADMIN_DASHBOARD_API.componentUpdate, { method: "POST", body }, client)
  if (!result?.ok || result.data?.ok === false) return failed(result, "Não foi possível salvar o SKU.")
  return { ok: true, component: result.data?.component || null }
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
