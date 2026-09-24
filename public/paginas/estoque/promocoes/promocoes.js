const { createSupabaseClient, formatMoneyBRL, effectivePrice, hasPromo, groupByKey } = window.MarisUtils
const { filterProductsForPromo } = window.MarisPromocoesLogic

const supabaseClient = createSupabaseClient()

const listEl = document.getElementById("promo-list")
const searchInput = document.getElementById("promo-search")
const feedbackEl = document.getElementById("promo-feedback")
const bulkPercentInput = document.getElementById("bulk-percent")
const bulkApplyBtn = document.getElementById("bulk-apply-btn")
const bulkClearBtn = document.getElementById("bulk-clear-btn")

let products = []
let componentsByProductCode = Object.create(null)

function setFeedback(text, type = "") {
  window.MarisUI.setFeedback(feedbackEl, text, type, { baseClass: "promo-feedback" })
}

function priceBlock(row) {
  const base = Number(row?.unit_price) || 0
  const onSale = hasPromo(row)
  const final = effectivePrice(row)
  return `
    <div class="promo-prices">
      <span class="base ${onSale ? "struck" : ""}">${formatMoneyBRL(base)}</span>
      ${onSale ? `<span class="final">${formatMoneyBRL(final)}</span>` : ""}
    </div>
  `
}

function controlsBlock({ code, row }) {
  const onSale = Boolean(row?.is_on_sale)
  const pct = Number(row?.discount_percent) || 0
  return `
    <div class="promo-controls" data-target="product" data-code="${code}">
      <label class="promo-toggle">
        <input type="checkbox" class="promo-on" ${onSale ? "checked" : ""}>
        Em promoção
      </label>
      <span class="promo-pct">
        <input type="number" class="promo-percent" min="0" max="100" step="1" value="${pct}" ${onSale ? "" : "disabled"}>
        % off
      </span>
      <button type="button" class="promo-save">Salvar</button>
    </div>
  `
}

function renderProductCard(product) {
  const escapeHtml = window.MarisUI.escapeHtml
  const components = componentsByProductCode[product.code] || []
  const hasTypes = components.length > 0
  const onSale = hasPromo(product)
  const componentsHtml = hasTypes
    ? `
      <div class="promo-components">
        <p class="promo-components-title">Tipos (preço = % do pai · promo herdada)</p>
        ${components.map((component) => `
          <div class="promo-comp-row">
            <div>
              <div class="promo-comp-name">${escapeHtml(component.name)}${onSale ? ' <span class="promo-badge">Promo</span>' : ""}</div>
              ${priceBlock(component)}
            </div>
          </div>
        `).join("")}
      </div>
    `
    : ""

  return `
    <article class="promo-card" data-product-code="${escapeHtml(product.code)}">
      <div class="promo-row">
        <img class="promo-thumb" src="${escapeHtml(product.image_url || "")}" alt="${escapeHtml(product.name)}" loading="lazy">
        <div class="promo-info">
          <p class="promo-name">${escapeHtml(product.name)} ${onSale ? '<span class="promo-badge">Promo</span>' : ""}</p>
          <p class="promo-code">${escapeHtml(product.code)}</p>
          ${hasTypes ? '<p class="promo-type-note">Venda por tipos — promo do pai vale para todos</p>' : ""}
          ${priceBlock(product)}
        </div>
        ${controlsBlock({ code: product.code, row: product })}
      </div>
      ${componentsHtml}
    </article>
  `
}

function getFilteredProducts() {
  return filterProductsForPromo(products, componentsByProductCode, searchInput.value)
}

function render() {
  const filtered = getFilteredProducts()
  if (!products.length) {
    listEl.innerHTML = '<p class="promo-empty">Nenhum produto cadastrado.</p>'
    return
  }
  if (!filtered.length) {
    listEl.innerHTML = '<p class="promo-empty">Nada encontrado para a busca.</p>'
    return
  }
  listEl.innerHTML = filtered.map(renderProductCard).join("")
}

async function loadData() {
  const [productsRes, componentsRes] = await Promise.all([
    supabaseClient
      .from("products")
      .select("code, name, unit_price, image_url, is_on_sale, discount_percent")
      .order("name"),
    supabaseClient
      .from("product_components_priced")
      .select("id, product_code, name, quantity, is_active, price_percent, computed_unit_price, parent_unit_price, parent_is_on_sale, parent_discount_percent")
      .eq("is_active", true)
      .order("name")
  ])

  if (productsRes.error || componentsRes.error) {
    setFeedback("Erro ao carregar os produtos.", "error")
    return
  }

  products = productsRes.data || []
  componentsByProductCode = groupByKey(
    window.MarisUtils.mapPricedComponents(componentsRes.data || []),
    (c) => c.product_code
  )
  render()
}

function findProduct(code) {
  return products.find((p) => p.code === code)
}

async function savePromotion(controlsEl) {
  const code = controlsEl.dataset.code
  const checkbox = controlsEl.querySelector(".promo-on")
  const percentInput = controlsEl.querySelector(".promo-percent")
  const saveBtn = controlsEl.querySelector(".promo-save")

  const isOnSale = checkbox.checked
  const discountPercent = Math.max(0, Math.min(100, Number(percentInput.value) || 0))

  if (isOnSale && discountPercent <= 0) {
    setFeedback("Defina um percentual maior que 0 para ativar a promoção.", "error")
    return
  }

  saveBtn.disabled = true
  saveBtn.textContent = "Salvando…"
  try {
    const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("set-product-promotion"), {
      body: {
        target: "product",
        code,
        is_on_sale: isOnSale,
        discount_percent: discountPercent
      }
    })
    if (!ok || !data.ok) {
      setFeedback(data.error || "Não foi possível salvar a promoção.", "error")
      return
    }

    const row = findProduct(code)
    if (row) {
      row.is_on_sale = data.is_on_sale
      row.discount_percent = data.discount_percent
    }
    setFeedback("Promoção atualizada!", "success")
    await loadData()
  } catch {
    setFeedback("Erro de conexão ao salvar.", "error")
  } finally {
    saveBtn.disabled = false
    saveBtn.textContent = "Salvar"
  }
}

async function applyAllPromotions(isOnSale, discountPercent) {
  bulkApplyBtn.disabled = true
  bulkClearBtn.disabled = true
  const applyLabel = bulkApplyBtn.textContent
  const clearLabel = bulkClearBtn.textContent
  bulkApplyBtn.textContent = "Aplicando…"
  if (!isOnSale) bulkClearBtn.textContent = "Limpando…"
  try {
    const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("set-all-promotions"), {
      body: { is_on_sale: isOnSale, discount_percent: discountPercent }
    })
    if (!ok || !data.ok) {
      setFeedback(data.error || "Não foi possível atualizar as promoções.", "error")
      return
    }
    setFeedback(
      isOnSale
        ? `Todos os produtos em promoção com ${data.discount_percent}% de desconto!`
        : "Todas as promoções foram removidas.",
      "success"
    )
    await loadData()
  } catch {
    setFeedback("Erro de conexão ao atualizar as promoções.", "error")
  } finally {
    bulkApplyBtn.disabled = false
    bulkClearBtn.disabled = false
    bulkApplyBtn.textContent = applyLabel
    bulkClearBtn.textContent = clearLabel
  }
}

bulkApplyBtn.addEventListener("click", () => {
  const pct = Math.max(0, Math.min(100, Number(bulkPercentInput.value) || 0))
  if (pct <= 0) {
    setFeedback("Defina um percentual maior que 0 para aplicar a todos.", "error")
    bulkPercentInput.focus()
    return
  }
  if (!window.confirm(`Colocar TODOS os produtos em promoção com ${pct}% de desconto?`)) return
  applyAllPromotions(true, pct)
})

bulkClearBtn.addEventListener("click", () => {
  if (!window.confirm("Remover a promoção de TODOS os produtos?")) return
  applyAllPromotions(false, 0)
})

listEl.addEventListener("change", (event) => {
  const checkbox = event.target.closest(".promo-on")
  if (!checkbox) return
  const controlsEl = checkbox.closest(".promo-controls")
  const percentInput = controlsEl.querySelector(".promo-percent")
  percentInput.disabled = !checkbox.checked
  if (checkbox.checked && (Number(percentInput.value) || 0) <= 0) percentInput.focus()
})

listEl.addEventListener("click", (event) => {
  const saveBtn = event.target.closest(".promo-save")
  if (!saveBtn) return
  const controlsEl = saveBtn.closest(".promo-controls")
  if (controlsEl) savePromotion(controlsEl)
})

searchInput && window.MarisUI.bindDebouncedSearch(searchInput, () => render(), { debounceMs: 120 })

loadData()
