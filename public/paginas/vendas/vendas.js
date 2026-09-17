const { createSupabaseClient, roundMoney, formatMoneyBRL, groupByKey, effectivePrice, hasPromo } = window.MarisUtils
const escapeHtml = (text) => window.MarisUI.escapeHtml(text)
const {
  doesProductMatchSearch,
  getClampedSelectedQuantity,
  buildQtyOptions,
  isSalesProductShowable,
  sortSalesProductsByName,
  computeSaleTotals,
} = window.MarisSalesLogic

const supabaseClient = createSupabaseClient()

const form = document.getElementById("sale-form")
const sellerSelect = document.getElementById("seller-select")
const paymentMethodSelect = document.getElementById("payment-method")
const productsGrid = document.getElementById("products-grid")
const productSearchInput = document.getElementById("product-search")
const summarySubtotalEl = document.getElementById("summary-subtotal")
const summaryDiscountRowEl = document.getElementById("summary-discount-row")
const summaryDiscountEl = document.getElementById("summary-discount")
const summaryTotalEl = document.getElementById("summary-total")
const selectionStripEl = document.getElementById("selection-strip")
const submitBtn = document.getElementById("submit-btn")
const messageEl = document.getElementById("message")

let products = []
let productsByCode = Object.create(null)
let sellers = []
let productComponents = []
let componentsByProductCode = Object.create(null)
let componentsById = Object.create(null)
// Armazena a quantidade selecionada por código, para que a busca/filtragem
// não “perca” itens que já foram escolhidos.
let selectedQuantitiesByCode = Object.create(null)
let selectedComponentQuantitiesById = Object.create(null)

function setMessage(text, type = "") {
  window.MarisUI.setFeedback(messageEl, text, type, { baseClass: "message", toggleHidden: false })
}

function buildSelectionStrip(selectedItems, selectedComponentItems) {
  if (!selectionStripEl) return
  const chips = []

  for (const item of selectedItems) {
    const product = productsByCode[item.code]
    const name = product?.name || item.code
    chips.push(`<span class="selection-chip">${escapeHtml(name)} ×${item.quantity}</span>`)
  }
  for (const item of selectedComponentItems) {
    const component = componentsById[item.component_id]
    const name = component?.name || `Tipo #${item.component_id}`
    chips.push(`<span class="selection-chip">${escapeHtml(name)} ×${item.quantity}</span>`)
  }

  if (!chips.length) {
    selectionStripEl.hidden = true
    selectionStripEl.innerHTML = ""
    return
  }

  selectionStripEl.hidden = false
  selectionStripEl.innerHTML = `<div class="selection-strip-label">Selecionados</div><div class="selection-strip-chips">${chips.join("")}</div>`
}

function updateSaleSummary() {
  const paymentMethod = paymentMethodSelect.value
  const selectedItems = getSelectedItems()
  const selectedComponentItems = getSelectedComponentItems()
  const { subtotal: roundedSubtotal, discount, total } = computeSaleTotals({
    selectedItems,
    selectedComponentItems,
    productsByCode,
    componentsById,
    paymentMethod,
    effectivePrice,
    roundMoney,
  })

  summarySubtotalEl.textContent = formatMoneyBRL(roundedSubtotal)
  summaryDiscountEl.textContent = formatMoneyBRL(discount)
  if (summaryDiscountRowEl) {
    summaryDiscountRowEl.hidden = paymentMethod !== "pix"
  }
  summaryTotalEl.textContent = formatMoneyBRL(total)
  buildSelectionStrip(selectedItems, selectedComponentItems)
}

function getSearchTerm() {
  return (productSearchInput?.value || "").trim().toLowerCase()
}

function getComponentsForProduct(productCode) {
  return componentsByProductCode[productCode] || []
}

// Com tipos: ignora estoque do pai; mostra na lista se algum tipo tiver quantidade > 0.
function isProductShowable(product) {
  return isSalesProductShowable(product, getComponentsForProduct(product.code))
}

function buildComponentControls(productCode) {
  const components = getComponentsForProduct(productCode)
  if (!components.length) return ""

  const rows = components.map((component) => {
    const stock = Number(component.quantity) || 0
    const soldOut = stock <= 0
    const selectedQtyRaw = Number(selectedComponentQuantitiesById[component.id] || 0)
    const selectedQty = soldOut ? 0 : Math.min(Math.max(selectedQtyRaw, 0), stock)
    if (selectedQty > 0) {
      selectedComponentQuantitiesById[component.id] = selectedQty
    } else {
      delete selectedComponentQuantitiesById[component.id]
    }

    const qtyOptions = buildQtyOptions(stock, selectedQty)
    const priceLabel = hasPromo(component)
      ? window.MarisUI.renderPricePair(Number(component.unit_price) || 0, effectivePrice(component))
      : formatMoneyBRL(Number(component.unit_price) || 0)

    return `
      <div class="component-item ${soldOut ? "sold-out" : ""}">
        <div class="component-header">
          <strong>${escapeHtml(component.name)}</strong>
          <span>${soldOut ? "Em falta" : priceLabel}</span>
        </div>
        <div class="component-stock">${soldOut ? "Vendido/sem estoque" : `Estoque: ${stock}`}</div>
        <select class="qty-select component-qty-select" data-component-id="${escapeHtml(component.id)}" ${soldOut ? "disabled" : ""}>
          ${qtyOptions}
        </select>
      </div>
    `
  }).join("")

  return `
    <div class="component-block">
      <div class="component-title">Tipos deste produto:</div>
      ${rows}
    </div>
  `
}

function renderProductCards() {
  if (!products.length) {
    productsGrid.innerHTML = "Nenhum produto encontrado"
    submitBtn.disabled = true
    return
  }

  const term = getSearchTerm()

  // Em vendas, listamos só o que pode ser vendido: pai com estoque ou, com tipos, algum tipo com estoque.
  const availableProducts = products.filter((product) => isProductShowable(product))

  if (!availableProducts.length) {
    productsGrid.innerHTML = "Nenhum produto disponível para venda"
    updateSaleSummary()
    return
  }

  const sortedAvailable = sortSalesProductsByName(availableProducts)
  const filteredAvailable = sortedAvailable.filter((product) =>
    doesProductMatchSearch(product, term, getComponentsForProduct(product.code))
  )

  if (!filteredAvailable.length && availableProducts.length) {
    productsGrid.innerHTML = term
      ? "Nenhum produto disponível encontrado para a busca"
      : "Nenhum produto disponível para venda"
    updateSaleSummary()
    return
  }

  productsGrid.innerHTML = filteredAvailable.map((product) => {
    const code = product.code
    const stockQuantity = Number(product.quantity) || 0
    const components = getComponentsForProduct(code)
    const hasComponents = components.length > 0

    const selectedQty = hasComponents ? 0 : getClampedSelectedQuantity(selectedQuantitiesByCode[code], stockQuantity)
    if (selectedQty > 0 && !hasComponents) {
      selectedQuantitiesByCode[code] = selectedQty
    } else {
      delete selectedQuantitiesByCode[code]
    }

    const qtyOptions = buildQtyOptions(stockQuantity, selectedQty)

    return `
      <div class="product">
        <img src="${escapeHtml(product.image_url || "")}" alt="${escapeHtml(product.name)}" loading="lazy">
        <h3>${escapeHtml(product.name)}</h3>
        <div class="code">Código: ${escapeHtml(code)}</div>
        ${hasComponents ? "" : `<div class="price">${hasPromo(product) ? window.MarisUI.renderPricePair(Number(product.unit_price) || 0, effectivePrice(product)) : formatMoneyBRL(Number(product.unit_price) || 0)}</div>`}
        ${hasComponents ? "" : `<div class="stock">Estoque: ${stockQuantity}</div>`}
        ${buildComponentControls(code)}
        ${hasComponents
          ? ""
          : `
            <div class="sale-controls">
              <label class="select-line">Quantidade</label>
              <select class="qty-select" data-code="${escapeHtml(code)}">
                ${qtyOptions}
              </select>
            </div>
          `}
      </div>
    `
  }).join("")

  updateSaleSummary()
}

async function loadProducts() {
  const [productsResponse, componentsResponse] = await Promise.all([
    supabaseClient
      .from("products")
      .select("id, code, name, quantity, image_url, unit_price, is_on_sale, discount_percent"),
    supabaseClient
      .from("product_components")
      .select("id, product_code, name, quantity, unit_price, is_active, is_on_sale, discount_percent")
      .eq("is_active", true)
  ])

  const { data, error } = productsResponse
  const { data: componentsData, error: componentsError } = componentsResponse

  if (error || componentsError) {
    setMessage("Erro ao carregar produtos", "error")
    console.log(error || componentsError)
    return
  }

  products = data || []
  productsByCode = Object.create(null)
  for (const p of products) {
    productsByCode[p.code] = p
  }
  productComponents = componentsData || []
  componentsById = Object.create(null)
  for (const component of productComponents) {
    componentsById[component.id] = component
  }
  componentsByProductCode = groupByKey(productComponents, (c) => c.product_code)

  renderProductCards()
}

const LAST_SELLER_KEY = "maris_last_seller_id"

function renderSellerOptions() {
  if (!sellers.length) {
    sellerSelect.innerHTML = '<option value="">Nenhuma vendedora cadastrada</option>'
    submitBtn.disabled = true
    return
  }

  const savedSellerId = localStorage.getItem(LAST_SELLER_KEY) || ""
  const hasSaved = sellers.some((s) => String(s.id) === String(savedSellerId))

  sellerSelect.innerHTML = `
    <option value="">Selecione a vendedora</option>
    ${sellers.map((seller) => `<option value="${escapeHtml(seller.id)}">${escapeHtml(seller.name)}</option>`).join("")}
  `
  if (hasSaved) sellerSelect.value = String(savedSellerId)
}

async function loadSellers() {
  const { data, error } = await supabaseClient
    .from("sellers")
    .select("id, name")
    .eq("is_active", true)
    .order("name")

  if (error) {
    setMessage("Erro ao carregar vendedoras.", "error")
    console.log(error)
    return
  }

  sellers = data || []
  renderSellerOptions()
}

function getSelectedItems() {
  // Sempre clampa a quantidade selecionada com base no estoque atual do produto.
  // Isso evita discrepância quando o card some por causa da busca (ou estoque muda).
  const selected = []

  for (const [code, rawQuantity] of Object.entries(selectedQuantitiesByCode)) {
    if (getComponentsForProduct(code).length) {
      delete selectedQuantitiesByCode[code]
      continue
    }

    const product = productsByCode[code]
    const stockQuantity = Number(product?.quantity) || 0
    const selectedQty = getClampedSelectedQuantity(selectedQuantitiesByCode[code], stockQuantity)

    if (Number.isInteger(selectedQty) && selectedQty > 0) {
      selected.push({ code, quantity: selectedQty })
    } else {
      // Mantém o estado consistente com o estoque (ou remove códigos inválidos).
      delete selectedQuantitiesByCode[code]
    }
  }

  return selected
}

function getSelectedComponentItems() {
  const selected = []
  for (const [componentIdRaw, rawQuantity] of Object.entries(selectedComponentQuantitiesById)) {
    const componentId = Number(componentIdRaw)
    const component = componentsById[componentId]
    const stockQuantity = Number(component?.quantity) || 0
    let quantity = Number(rawQuantity)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      delete selectedComponentQuantitiesById[componentId]
      continue
    }
    quantity = Math.min(quantity, stockQuantity)
    if (quantity <= 0) {
      delete selectedComponentQuantitiesById[componentId]
      continue
    }
    selected.push({ component_id: componentId, quantity })
  }
  return selected
}

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  setMessage("")

  const sellerId = Number(sellerSelect.value)
  const paymentMethod = paymentMethodSelect.value
  const selectedItems = getSelectedItems()
  const selectedComponentItems = getSelectedComponentItems()

  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    setMessage("Selecione a vendedora.", "error")
    return
  }

  if (!selectedItems.length && !selectedComponentItems.length) {
    setMessage("Selecione pelo menos um produto ou tipo.", "error")
    return
  }

  if (!paymentMethod) {
    setMessage("Selecione um método de pagamento.", "error")
    return
  }

  const totals = computeSaleTotals({
    selectedItems,
    selectedComponentItems,
    productsByCode,
    componentsById,
    paymentMethod,
    effectivePrice,
    roundMoney,
  })
  const itemCount = selectedItems.length + selectedComponentItems.length
  const pixNote = paymentMethod === "pix"
    ? `\nDesconto Pix: ${formatMoneyBRL(totals.discount)}`
    : ""
  const confirmed = window.confirm(
    `Registrar venda de ${itemCount} item(ns)?\n` +
      `Subtotal: ${formatMoneyBRL(totals.subtotal)}${pixNote}\n` +
      `Total: ${formatMoneyBRL(totals.total)}`
  )
  if (!confirmed) return

  submitBtn.disabled = true
  try {
    const { ok, data: result } = await window.MarisApi.callFunction(window.ENV.fn("register-sale"), {
      body: {
        seller_id: sellerId,
        payment_method: paymentMethod,
        items: selectedItems,
        component_items: selectedComponentItems
      }
    })

    if (!ok) {
      setMessage(result?.error || "Erro ao registrar venda.", "error")
      submitBtn.disabled = false
      return
    }

    selectedQuantitiesByCode = Object.create(null)
    selectedComponentQuantitiesById = Object.create(null)
    await loadProducts()
    paymentMethodSelect.value = ""
    try {
      localStorage.setItem(LAST_SELLER_KEY, String(sellerId))
    } catch { /* ignore */ }
    // Mantém a última vendedora selecionada para a próxima venda.
    sellerSelect.value = String(sellerId)
    updateSaleSummary()
    setMessage("Venda registrada com sucesso!", "success")
    submitBtn.disabled = false
  } catch (error) {
    console.log(error)
    setMessage("Erro ao registrar venda.", "error")
    submitBtn.disabled = false
  }
})

paymentMethodSelect.addEventListener("change", updateSaleSummary)

sellerSelect.addEventListener("change", () => {
  const value = sellerSelect.value
  if (!value) return
  try {
    localStorage.setItem(LAST_SELLER_KEY, String(value))
  } catch { /* ignore */ }
})

if (productSearchInput) {
  window.MarisUI.bindDebouncedSearch(productSearchInput, () => renderProductCards(), { debounceMs: 120 })
}

// Atualiza o estado da venda quando o usuário altera a quantidade.
// Usamos delegacao de eventos para nao precisar re-registrar listener
// a cada renderizacao dos cards.
productsGrid.addEventListener("change", (event) => {
  const target = event.target
  if (!target || !(target instanceof HTMLSelectElement)) return
  if (!target.classList.contains("qty-select")) return

  const componentId = Number(target.dataset.componentId)
  if (Number.isInteger(componentId) && componentId > 0) {
    const quantity = Number(target.value)
    if (Number.isInteger(quantity) && quantity > 0) {
      selectedComponentQuantitiesById[componentId] = quantity
    } else {
      delete selectedComponentQuantitiesById[componentId]
    }

    updateSaleSummary()
    return
  }

  const code = target.dataset.code
  if (!code) return

  const quantity = Number(target.value)
  if (Number.isInteger(quantity) && quantity > 0) {
    selectedQuantitiesByCode[code] = quantity
  } else {
    delete selectedQuantitiesByCode[code]
  }

  updateSaleSummary()
})

Promise.all([loadSellers(), loadProducts()])
