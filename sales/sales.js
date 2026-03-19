const supabaseClient = window.supabase.createClient(
  window.ENV.SUPABASE_URL,
  window.ENV.SUPABASE_ANON_KEY
)

const form = document.getElementById("sale-form")
const productSelect = document.getElementById("product-select")
const quantityInput = document.getElementById("quantity-input")
const paymentMethodSelect = document.getElementById("payment-method")
const stockInfo = document.getElementById("stock-info")
const submitBtn = document.getElementById("submit-btn")
const messageEl = document.getElementById("message")

let products = []

function setMessage(text, type = "") {
  messageEl.textContent = text
  messageEl.className = `message ${type}`.trim()
}

function updateStockInfo() {
  const selectedCode = productSelect.value
  const product = products.find((item) => item.code === selectedCode)

  if (!product) {
    stockInfo.textContent = ""
    stockInfo.className = "stock-info"
    return
  }

  const quantity = Number(product.quantity) || 0
  stockInfo.textContent = `Estoque atual: ${quantity}`
  stockInfo.className = `stock-info ${quantity <= 0 ? "zero" : ""}`.trim()
}

function renderProductOptions() {
  if (!products.length) {
    productSelect.innerHTML = '<option value="">Nenhum produto encontrado</option>'
    productSelect.disabled = true
    submitBtn.disabled = true
    return
  }

  const sorted = [...products].sort((a, b) => {
    const stockA = Number(a.quantity) || 0
    const stockB = Number(b.quantity) || 0
    const outA = stockA <= 0 ? 1 : 0
    const outB = stockB <= 0 ? 1 : 0
    if (outA !== outB) return outA - outB
    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")
  })

  productSelect.innerHTML = `
    <option value="">Selecione um modelo</option>
    ${sorted.map((product) => {
      const quantity = Number(product.quantity) || 0
      const soldOut = quantity <= 0 ? " (sem estoque)" : ""
      return `<option value="${product.code}">${product.name} - Cód. ${product.code}${soldOut}</option>`
    }).join("")}
  `
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("id, code, name, quantity")

  if (error) {
    setMessage("Erro ao carregar produtos", "error")
    console.log(error)
    return
  }

  products = data || []
  renderProductOptions()
  updateStockInfo()
}

productSelect.addEventListener("change", () => {
  setMessage("")
  updateStockInfo()
})

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  setMessage("")

  const productCode = productSelect.value
  const quantity = Number(quantityInput.value)
  const paymentMethod = paymentMethodSelect.value

  if (!productCode) {
    setMessage("Selecione um modelo.", "error")
    return
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    setMessage("Quantidade inválida.", "error")
    return
  }

  if (!paymentMethod) {
    setMessage("Selecione um método de pagamento.", "error")
    return
  }

  const selectedProduct = products.find((item) => item.code === productCode)
  if (!selectedProduct) {
    setMessage("Produto não encontrado.", "error")
    return
  }

  const availableQuantity = Number(selectedProduct.quantity) || 0
  if (availableQuantity < quantity) {
    setMessage("Estoque insuficiente para essa venda.", "error")
    return
  }

  submitBtn.disabled = true

  const newQuantity = availableQuantity - quantity

  const { error: updateError } = await supabaseClient
    .from("products")
    .update({ quantity: newQuantity })
    .eq("code", productCode)

  if (updateError) {
    setMessage("Erro ao atualizar estoque.", "error")
    submitBtn.disabled = false
    console.log(updateError)
    return
  }

  const { error: saleError } = await supabaseClient
    .from("sales")
    .insert({
      product_code: productCode,
      product_name: selectedProduct.name,
      quantity,
      payment_method: paymentMethod
    })

  if (saleError) {
    // Tenta reverter o estoque caso falhe ao registrar a venda.
    await supabaseClient
      .from("products")
      .update({ quantity: availableQuantity })
      .eq("code", productCode)

    setMessage("Erro ao registrar venda.", "error")
    submitBtn.disabled = false
    console.log(saleError)
    return
  }

  selectedProduct.quantity = newQuantity
  renderProductOptions()
  productSelect.value = productCode
  updateStockInfo()
  quantityInput.value = "1"
  paymentMethodSelect.value = ""

  setMessage("Venda registrada com sucesso!", "success")
  submitBtn.disabled = false
})

loadProducts()
