const { createSupabaseClient, sortProductsByStockAndName, roundMoney, formatMoneyBRL } = window.MarisUtils

const supabaseClient = createSupabaseClient()

const form = document.getElementById("sale-form")
const sellerSelect = document.getElementById("seller-select")
const paymentMethodSelect = document.getElementById("payment-method")
const productsGrid = document.getElementById("products-grid")
const productSearchInput = document.getElementById("product-search")
const summarySubtotalEl = document.getElementById("summary-subtotal")
const summaryDiscountEl = document.getElementById("summary-discount")
const summaryTotalEl = document.getElementById("summary-total")
const submitBtn = document.getElementById("submit-btn")
const messageEl = document.getElementById("message")

let products = []
let sellers = []
// Armazena a quantidade selecionada por código, para que a busca/filtragem
// não “perca” itens que já foram escolhidos.
let selectedQuantitiesByCode = Object.create(null)

function setMessage(text, type = "") {
  messageEl.textContent = text
  messageEl.className = `message ${type}`.trim()
}

function updateSaleSummary() {
  const paymentMethod = paymentMethodSelect.value
  const selectedItems = getSelectedItems()

  const subtotal = selectedItems.reduce((acc, item) => {
    const product = products.find((p) => p.code === item.code)
    const unitPrice = Number(product?.unit_price) || 0
    return acc + unitPrice * item.quantity
  }, 0)

  const roundedSubtotal = roundMoney(subtotal)
  const discount = paymentMethod === "pix" ? roundMoney(roundedSubtotal * 0.05) : 0
  const total = roundMoney(roundedSubtotal - discount)

  summarySubtotalEl.textContent = formatMoneyBRL(roundedSubtotal)
  summaryDiscountEl.textContent = formatMoneyBRL(discount)
  summaryTotalEl.textContent = formatMoneyBRL(total)
}

function getSearchTerm() {
  return (productSearchInput?.value || "").trim().toLowerCase()
}

function doesProductMatchSearch(product, term) {
  if (!term) return true
  const name = String(product?.name || "").toLowerCase()
  const code = String(product?.code || "").toLowerCase()
  return name.includes(term) || code.includes(term)
}

function getClampedSelectedQuantity(code, stockQuantity) {
  // Quantidade selecionada pode ficar “stale” se o usuário buscou e o card sumiu.
  // Então sempre clampa usando o estoque atual do produto.
  const raw = selectedQuantitiesByCode[code]
  let selectedQty = Number(raw)
  if (!Number.isFinite(selectedQty) || selectedQty < 0) selectedQty = 0
  if (!Number.isInteger(selectedQty)) selectedQty = 0

  const stock = Number(stockQuantity) || 0
  if (stock <= 0) selectedQty = 0
  selectedQty = Math.min(selectedQty, stock)

  return selectedQty
}

function buildQtyOptions(stockQuantity, selectedQty) {
  const quantity = Math.max(Number(stockQuantity) || 0, 0)
  const options = Array.from({ length: quantity + 1 }, (_, i) => i)
  return options
    .map((q) => {
      const label = q === 0 ? "0" : String(q)
      const isSelected = q === selectedQty
      return `<option value="${q}" ${isSelected ? "selected" : ""}>${label}</option>`
    })
    .join("")
}

function renderProductCards() {
  if (!products.length) {
    productsGrid.innerHTML = "Nenhum produto encontrado"
    submitBtn.disabled = true
    return
  }

  const term = getSearchTerm()

  const sorted = sortProductsByStockAndName(products)
  const filtered = sorted.filter((product) => doesProductMatchSearch(product, term))

  if (!filtered.length) {
    productsGrid.innerHTML = term ? "Nenhum produto encontrado para a busca" : "Nenhum produto encontrado"
    updateSaleSummary()
    return
  }

  productsGrid.innerHTML = filtered.map((product) => {
    const code = product.code
    const stockQuantity = Number(product.quantity) || 0
    const soldOut = stockQuantity <= 0

    const selectedQty = getClampedSelectedQuantity(code, stockQuantity)
    if (selectedQty > 0) {
      selectedQuantitiesByCode[code] = selectedQty
    } else {
      delete selectedQuantitiesByCode[code]
    }

    const qtyOptions = buildQtyOptions(stockQuantity, selectedQty)

    return `
      <div class="product">
        <img src="${product.image_url}" alt="${product.name}">
        <h3>${product.name}</h3>
        <div class="code">Código: ${code}</div>
        <div class="price ${soldOut ? "unavailable" : ""}">
          ${soldOut ? "Indisponível" : `R$ ${Number(product.unit_price).toFixed(2)}`}
        </div>
        <div class="stock ${soldOut ? "zero" : ""}">Estoque: ${stockQuantity}</div>
        <div class="sale-controls">
          <label class="select-line">Quantidade</label>
          <select class="qty-select" data-code="${code}" ${soldOut ? "disabled" : ""}>
            ${qtyOptions}
          </select>
        </div>
      </div>
    `
  }).join("")

  updateSaleSummary()
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, code, name, quantity, image_url, unit_price")

  if (error) {
    setMessage("Erro ao carregar produtos", "error")
    console.log(error)
    return
  }

  products = data || []
  renderProductCards()
}

function renderSellerOptions() {
  if (!sellers.length) {
    sellerSelect.innerHTML = '<option value="">Nenhuma vendedora cadastrada</option>'
    submitBtn.disabled = true
    return
  }

  sellerSelect.innerHTML = `
    <option value="">Selecione a vendedora</option>
    ${sellers.map((seller) => `<option value="${seller.id}">${seller.name}</option>`).join("")}
  `
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
    const product = products.find((p) => p.code === code)
    const stockQuantity = Number(product?.quantity) || 0
    const selectedQty = getClampedSelectedQuantity(code, stockQuantity)

    if (Number.isInteger(selectedQty) && selectedQty > 0) {
      selected.push({ code, quantity: selectedQty })
    } else {
      // Mantém o estado consistente com o estoque (ou remove códigos inválidos).
      delete selectedQuantitiesByCode[code]
    }
  }

  return selected
}

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  setMessage("")

  const sellerId = Number(sellerSelect.value)
  const paymentMethod = paymentMethodSelect.value
  const selectedItems = getSelectedItems()

  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    setMessage("Selecione a vendedora.", "error")
    return
  }

  if (!selectedItems.length) {
    setMessage("Selecione pelo menos um produto.", "error")
    return
  }

  if (!paymentMethod) {
    setMessage("Selecione um método de pagamento.", "error")
    return
  }

  submitBtn.disabled = true
  try {
    const response = await fetch(window.ENV.SUPABASE_SALES_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        seller_id: sellerId,
        payment_method: paymentMethod,
        items: selectedItems
      })
    })

    const result = await response.json()

    if (!response.ok) {
      setMessage(result?.error || "Erro ao registrar venda.", "error")
      submitBtn.disabled = false
      return
    }

    selectedQuantitiesByCode = Object.create(null)
    await loadProducts()
    paymentMethodSelect.value = ""
    sellerSelect.value = ""
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

if (productSearchInput) {
  productSearchInput.addEventListener("input", () => {
    renderProductCards()
  })
}

// Atualiza o estado da venda quando o usuário altera a quantidade.
// Usamos delegacao de eventos para nao precisar re-registrar listener
// a cada renderizacao dos cards.
productsGrid.addEventListener("change", (event) => {
  const target = event.target
  if (!target || !(target instanceof HTMLSelectElement)) return
  if (!target.classList.contains("qty-select")) return

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
