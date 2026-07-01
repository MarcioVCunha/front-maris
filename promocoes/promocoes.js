const { createSupabaseClient, formatMoneyBRL, effectivePrice, hasPromo, groupByKey, debounce } = window.MarisUtils
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

function controlsBlock({ target, code, componentId, row }) {
  const onSale = Boolean(row?.is_on_sale)
  const pct = Number(row?.discount_percent) || 0
  const dataAttrs = target === "product"
    ? `data-target="product" data-code="${code}"`
    : `data-target="component" data-component-id="${componentId}"`
  return `
    <div class="promo-controls" ${dataAttrs}>
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
  const components = componentsByProductCode[product.code] || []
  const onSale = hasPromo(product)
  const componentsHtml = components.length
    ? `
      <div class="promo-components">
        <p class="promo-components-title">Peças separadas</p>
        ${components.map((component) => `
          <div class="promo-comp-row">
            <div>
              <div class="promo-comp-name">${component.name} ${hasPromo(component) ? '<span class="promo-badge">Promo</span>' : ""}</div>
              ${priceBlock(component)}
            </div>
            ${controlsBlock({ target: "component", componentId: component.id, row: component })}
          </div>
        `).join("")}
      </div>
    `
    : ""

  return `
    <article class="promo-card" data-product-code="${product.code}">
      <div class="promo-row">
        <img class="promo-thumb" src="${product.image_url || ""}" alt="${product.name}" loading="lazy">
        <div class="promo-info">
          <p class="promo-name">${product.name} ${onSale ? '<span class="promo-badge">Promo</span>' : ""}</p>
          <p class="promo-code">${product.code}</p>
          ${priceBlock(product)}
        </div>
        ${controlsBlock({ target: "product", code: product.code, row: product })}
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
      .from("product_components")
      .select("id, product_code, name, unit_price, is_on_sale, discount_percent, is_active")
      .eq("is_active", true)
      .order("name")
  ])

  if (productsRes.error || componentsRes.error) {
    setFeedback("Erro ao carregar os produtos.", "error")
    return
  }

  products = productsRes.data || []
  componentsByProductCode = groupByKey(componentsRes.data || [], (c) => c.product_code)
  render()
}

function findRow({ target, code, componentId }) {
  if (target === "product") return products.find((p) => p.code === code)
  for (const list of Object.values(componentsByProductCode)) {
    const found = list.find((c) => Number(c.id) === Number(componentId))
    if (found) return found
  }
  return null
}

async function savePromotion(controlsEl) {
  const target = controlsEl.dataset.target
  const code = controlsEl.dataset.code
  const componentId = controlsEl.dataset.componentId
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
        target,
        code: target === "product" ? code : undefined,
        component_id: target === "component" ? Number(componentId) : undefined,
        is_on_sale: isOnSale,
        discount_percent: discountPercent
      }
    })
    if (!ok || !data.ok) {
      setFeedback(data.error || "Não foi possível salvar a promoção.", "error")
      return
    }

    const row = findRow({ target, code, componentId })
    if (row) {
      row.is_on_sale = data.is_on_sale
      row.discount_percent = data.discount_percent
    }
    setFeedback("Promoção atualizada!", "success")
    render()
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
        ? `Tudo em promoção com ${data.discount_percent}% de desconto!`
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
  if (!window.confirm(`Colocar TODOS os produtos e peças em promoção com ${pct}% de desconto?`)) return
  applyAllPromotions(true, pct)
})

bulkClearBtn.addEventListener("click", () => {
  if (!window.confirm("Remover a promoção de TODOS os produtos e peças?")) return
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

searchInput.addEventListener("input", debounce(() => render(), 120))

loadData()
