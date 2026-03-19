const supabaseClient = window.supabase.createClient(
  window.ENV.SUPABASE_URL,
  window.ENV.SUPABASE_ANON_KEY
)

const form = document.getElementById("sale-form")
const sellerSelect = document.getElementById("seller-select")
const paymentMethodSelect = document.getElementById("payment-method")
const productsGrid = document.getElementById("products-grid")
const summarySubtotalEl = document.getElementById("summary-subtotal")
const summaryDiscountEl = document.getElementById("summary-discount")
const summaryTotalEl = document.getElementById("summary-total")
const submitBtn = document.getElementById("submit-btn")
const messageEl = document.getElementById("message")

let products = []
let sellers = []

function setMessage(text, type = "") {
  messageEl.textContent = text
  messageEl.className = `message ${type}`.trim()
}

function roundMoney(value) {
  return Math.round(value * 100) / 100
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function updateSaleSummary() {
  const selectedItems = getSelectedItems()
  const paymentMethod = paymentMethodSelect.value

  let subtotal = 0

  selectedItems.forEach((item) => {
    const product = products.find((p) => p.code === item.code)
    const unitPrice = Number(product?.unit_price) || 0
    subtotal += unitPrice * item.quantity
  })

  const roundedSubtotal = roundMoney(subtotal)
  const discount = paymentMethod === "pix" ? roundMoney(roundedSubtotal * 0.05) : 0
  const total = roundMoney(roundedSubtotal - discount)

  summarySubtotalEl.textContent = formatMoney(roundedSubtotal)
  summaryDiscountEl.textContent = formatMoney(discount)
  summaryTotalEl.textContent = formatMoney(total)
}

function getSortedProducts(list) {
  return [...list].sort((a, b) => {
    const stockA = Number(a.quantity) || 0
    const stockB = Number(b.quantity) || 0
    const outA = stockA <= 0 ? 1 : 0
    const outB = stockB <= 0 ? 1 : 0
    if (outA !== outB) return outA - outB
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")
  })
}

function renderProductCards() {
  if (!products.length) {
    productsGrid.innerHTML = "Nenhum produto encontrado"
    submitBtn.disabled = true
    return
  }

  const sorted = getSortedProducts(products)

  productsGrid.innerHTML = sorted.map((product) => {
    const quantity = Number(product.quantity) || 0
    const soldOut = quantity <= 0
    const qtyOptions = soldOut
      ? `<option value="0">Sem estoque</option>`
      : Array.from({ length: quantity }, (_, i) => i + 1)
          .map((q) => `<option value="${q}" ${q === 1 ? "selected" : ""}>${q}</option>`)
          .join("")

    return `
      <div class="product">
        <img src="${product.image_url}" alt="${product.name}">
        <h3>${product.name}</h3>
        <div class="code">Código: ${product.code}</div>
        <div class="price ${soldOut ? "unavailable" : ""}">
          ${soldOut ? "Indisponível" : `R$ ${Number(product.unit_price).toFixed(2)}`}
        </div>
        <div class="stock ${soldOut ? "zero" : ""}">Estoque: ${quantity}</div>
        <div class="sale-controls">
          <label class="select-line">Quantidade</label>
          <select class="qty-select" data-code="${product.code}" ${soldOut ? "disabled" : ""}>
            ${qtyOptions}
          </select>
        </div>
      </div>
    `
  }).join("")

  const qtySelects = productsGrid.querySelectorAll(".qty-select")
  qtySelects.forEach((select) => {
    select.addEventListener("change", updateSaleSummary)
  })

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
  const selects = productsGrid.querySelectorAll(".qty-select")
  const selected = []

  selects.forEach((select) => {
    const code = select.dataset.code
    const quantity = Number(select.value)
    if (Number.isInteger(quantity) && quantity > 0) {
      selected.push({ code, quantity })
    }
  })

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

Promise.all([loadSellers(), loadProducts()])
