;(function () {
const { formatMoneyBRL } = window.MarisUtils
const sbClient = window.MarisUtils.createSupabaseClient()

const basketLinesEl = document.getElementById("basket-lines")
const basketTotalEl = document.getElementById("basket-total")
const selectAllBtn = document.getElementById("select-all-btn")
const clearAllBtn = document.getElementById("clear-all-btn")
const addSelectedBtn = document.getElementById("add-selected-btn")
const messageEl = document.getElementById("basket-message")

const params = new URLSearchParams(window.location.search)
const basketId = String(params.get("id") || "").trim()

let productsByCode = Object.create(null)
let componentsById = Object.create(null)
let productImagesByCode = Object.create(null)

/** @type {Array<{ key: string, product_code: string|null, component_id: number|null, quantity: number }>} */
let basketItems = []
/** @type {Set<string>} */
const selectedKeys = new Set()
/** @type {"loading"|"ready"|"missing_id"|"not_found"|"empty"|"error"} */
let basketState = "loading"

function setMessage(text, type = "") {
  window.MarisUI.setFeedback(messageEl, text, type, { baseClass: "cart-page-message" })
}

function itemKey(item) {
  return window.MarisCart.itemKey(item)
}

function resolveLine(item) {
  return window.MarisCart.resolveLine(
    item,
    { productsByCode, componentsById, productImagesByCode },
    "shared"
  )
}

function emptyStateHtml(message) {
  return `
    <p class="cart-help">${message}</p>
    <p class="cart-help"><a href="/catalog">Voltar ao catálogo</a></p>
  `
}

function updateTotal() {
  let total = 0
  for (const item of basketItems) {
    if (!selectedKeys.has(item.key)) continue
    const info = resolveLine(item)
    total += info.unitPrice * item.quantity
  }
  basketTotalEl.textContent = formatMoneyBRL(total)
  addSelectedBtn.disabled = selectedKeys.size === 0 || basketState !== "ready"
}

function renderBasket() {
  selectAllBtn.disabled = basketState !== "ready" || !basketItems.length
  clearAllBtn.disabled = basketState !== "ready" || !basketItems.length

  if (basketState === "loading") {
    basketLinesEl.innerHTML = "<p class=\"cart-help\">Carregando cesta…</p>"
    basketTotalEl.textContent = formatMoneyBRL(0)
    addSelectedBtn.disabled = true
    return
  }

  if (basketState === "missing_id") {
    basketLinesEl.innerHTML = emptyStateHtml("Link inválido: falta o identificador da cesta.")
    basketTotalEl.textContent = formatMoneyBRL(0)
    addSelectedBtn.disabled = true
    return
  }

  if (basketState === "not_found") {
    basketLinesEl.innerHTML = emptyStateHtml("Esta cesta não foi encontrada. Peça um novo link.")
    basketTotalEl.textContent = formatMoneyBRL(0)
    addSelectedBtn.disabled = true
    return
  }

  if (basketState === "error") {
    basketLinesEl.innerHTML = emptyStateHtml("Não foi possível carregar a cesta. Tente novamente.")
    basketTotalEl.textContent = formatMoneyBRL(0)
    addSelectedBtn.disabled = true
    return
  }

  if (basketState === "empty" || !basketItems.length) {
    basketLinesEl.innerHTML = emptyStateHtml("Esta cesta compartilhada está vazia.")
    basketTotalEl.textContent = formatMoneyBRL(0)
    addSelectedBtn.disabled = true
    return
  }

  basketLinesEl.innerHTML = basketItems.map((item) => {
    const info = resolveLine(item)
    const checked = selectedKeys.has(item.key) ? "checked" : ""
    const soldOut = info.available <= 0
    const stockLabel = soldOut ? "Sem estoque" : `${info.available} em estoque`
    const lineTotal = info.unitPrice * item.quantity
    const priceLabel = info.onSale
      ? window.MarisUI.renderPricePair(info.originalPrice * item.quantity, lineTotal)
      : formatMoneyBRL(lineTotal)
    return `
      <article class="cart-line shared-line ${soldOut ? "shared-line--out" : ""}" data-key="${item.key}">
        <label class="shared-line-select">
          <input type="checkbox" class="shared-checkbox" data-key="${item.key}" ${checked} ${soldOut ? "disabled" : ""}>
        </label>
        <div class="cart-line-main">
          <img class="cart-line-image" src="${window.MarisUI.escapeHtml(info.imageUrl || "")}" alt="${window.MarisUI.escapeHtml(info.name)}">
          <div>
            <p class="cart-line-name">${window.MarisUI.escapeHtml(info.name)}</p>
            <p class="cart-line-code">${window.MarisUI.escapeHtml(info.code)} · ${priceLabel}</p>
            <p class="cart-line-stock">Qtd: ${item.quantity} · ${stockLabel}</p>
          </div>
        </div>
      </article>
    `
  }).join("")
}

async function loadCatalogData() {
  const [productsRes, componentsRes, imagesRes] = await Promise.all([
    sbClient.from("products").select("id, code, name, unit_price, quantity, image_url, is_on_sale, discount_percent"),
    sbClient.from("product_components").select("id, product_code, name, unit_price, quantity, is_on_sale, discount_percent").eq("is_active", true),
    sbClient.from("product_images").select("product_id, image_url, sort_order").order("sort_order", { ascending: true })
  ])

  if (productsRes.error || componentsRes.error || imagesRes.error) {
    console.error(productsRes.error || componentsRes.error || imagesRes.error)
    throw new Error("Falha ao carregar o catálogo.")
  }

  const products = productsRes.data || []
  const components = componentsRes.data || []
  const images = imagesRes.data || []

  productsByCode = Object.create(null)
  for (const p of products) productsByCode[p.code] = p
  componentsById = Object.create(null)
  for (const c of components) componentsById[c.id] = c

  productImagesByCode = Object.create(null)
  const codeById = Object.create(null)
  for (const p of products) {
    if (p?.id && p?.code) codeById[Number(p.id)] = String(p.code)
    const fallback = String(p?.image_url || "").trim()
    if (p?.code && fallback) productImagesByCode[p.code] = fallback
  }
  for (const row of images) {
    const code = codeById[Number(row.product_id)]
    const imageUrl = String(row.image_url || "").trim()
    if (code && imageUrl && !productImagesByCode[code]) productImagesByCode[code] = imageUrl
  }

  window.MarisCatalogCart.setCatalogData({ products, components, imagesByCode: productImagesByCode })
}

async function loadBasket() {
  if (!basketId) {
    basketItems = []
    basketState = "missing_id"
    return
  }
  const { data, error } = await sbClient
    .from("shared_baskets")
    .select("items")
    .eq("id", basketId)
    .maybeSingle()

  if (error) {
    basketItems = []
    basketState = "error"
    return
  }

  if (!data) {
    basketItems = []
    basketState = "not_found"
    return
  }

  if (!Array.isArray(data.items) || !data.items.length) {
    basketItems = []
    basketState = "empty"
    return
  }

  basketItems = data.items
    .map((raw) => {
      const quantity = Number(raw?.quantity) || 0
      const productCode = raw?.product_code ? String(raw.product_code) : null
      const componentId = Number(raw?.component_id) || null
      if (quantity <= 0) return null
      if (!productCode && !componentId) return null
      const item = {
        product_code: componentId ? null : productCode,
        component_id: componentId,
        quantity,
      }
      const locked = Number(raw?.unit_price)
      if (Number.isFinite(locked) && locked > 0) item.unit_price = locked
      return { ...item, key: itemKey(item) }
    })
    .filter(Boolean)

  if (!basketItems.length) {
    basketState = "empty"
    return
  }

  basketState = "ready"
  // Pré-seleciona todos os itens que têm estoque.
  selectedKeys.clear()
  for (const item of basketItems) {
    const info = resolveLine(item)
    if (info.available > 0) selectedKeys.add(item.key)
  }
}

basketLinesEl.addEventListener("change", (event) => {
  const input = event.target.closest(".shared-checkbox")
  if (!input) return
  const key = input.dataset.key
  if (!key) return
  if (input.checked) selectedKeys.add(key)
  else selectedKeys.delete(key)
  updateTotal()
})

selectAllBtn.addEventListener("click", () => {
  for (const item of basketItems) {
    const info = resolveLine(item)
    if (info.available > 0) selectedKeys.add(item.key)
  }
  renderBasket()
  updateTotal()
})

clearAllBtn.addEventListener("click", () => {
  selectedKeys.clear()
  renderBasket()
  updateTotal()
})

addSelectedBtn.addEventListener("click", async () => {
  if (!selectedKeys.size || basketState !== "ready") return
  await window.MarisCatalogCart.init()

  let added = 0
  let clamped = false
  for (const item of basketItems) {
    if (!selectedKeys.has(item.key)) continue
    const payload = {
      product_code: item.product_code,
      component_id: item.component_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }
    const result = window.MarisCatalogCart.addItemWithPrice(payload)
    if (result?.ok) {
      added += 1
      if (result.clamped) clamped = true
    }
  }

  if (!added) {
    setMessage("Não foi possível adicionar os itens (sem estoque).", "error")
    return
  }

  const suffix = clamped ? " Algumas quantidades foram ajustadas ao estoque disponível." : ""
  setMessage(`Itens adicionados à sua cesta!${suffix} Redirecionando…`, "success")
  setTimeout(() => {
    window.location.href = "/catalog/carrinho"
  }, 900)
})

;(async () => {
  renderBasket()
  try {
    await window.MarisCatalogCart.init()
    await loadCatalogData()
    await loadBasket()
    renderBasket()
    updateTotal()
  } catch (error) {
    console.error(error)
    basketItems = []
    basketState = "error"
    renderBasket()
    setMessage("Não foi possível carregar a cesta. Tente novamente.", "error")
  }
})()
})()
