const supabaseClient = window.supabase.createClient(
  window.ENV.SUPABASE_URL,
  window.ENV.SUPABASE_ANON_KEY
)

const form = document.getElementById("sale-form")
const sellerNameInput = document.getElementById("seller-name")
const paymentMethodSelect = document.getElementById("payment-method")
const productsGrid = document.getElementById("products-grid")
const submitBtn = document.getElementById("submit-btn")
const messageEl = document.getElementById("message")

let products = []

function setMessage(text, type = "") {
  messageEl.textContent = text
  messageEl.className = `message ${type}`.trim()
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
    return `
      <div class="product">
        <img src="${product.image_url}" alt="${product.name}">
        <h3>${product.name}</h3>
        <div class="code">Código: ${product.code}</div>
        <div class="price">R$ ${Number(product.unit_price).toFixed(2)}</div>
        <div class="stock ${soldOut ? "zero" : ""}">Estoque: ${quantity}</div>
        <div class="sale-controls">
          <label class="select-line">
            <input type="checkbox" class="product-check" data-code="${product.code}" ${soldOut ? "disabled" : ""}>
            Selecionar
          </label>
          <input
            type="number"
            class="qty-input"
            data-code="${product.code}"
            min="1"
            max="${Math.max(quantity, 1)}"
            value="1"
            ${soldOut ? "disabled" : ""}
          >
        </div>
      </div>
    `
  }).join("")

  const checkboxes = productsGrid.querySelectorAll(".product-check")
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const code = event.target.dataset.code
      const qtyInput = productsGrid.querySelector(`.qty-input[data-code="${code}"]`)
      if (!qtyInput) return
      qtyInput.disabled = !event.target.checked
    })
  })

  const qtyInputs = productsGrid.querySelectorAll(".qty-input")
  qtyInputs.forEach((input) => {
    const checkbox = productsGrid.querySelector(`.product-check[data-code="${input.dataset.code}"]`)
    input.disabled = !checkbox || !checkbox.checked
  })
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

function getSelectedItems() {
  const checks = productsGrid.querySelectorAll(".product-check:checked")
  const selected = []

  checks.forEach((check) => {
    const code = check.dataset.code
    const qtyInput = productsGrid.querySelector(`.qty-input[data-code="${code}"]`)
    const quantity = Number(qtyInput?.value)
    if (Number.isInteger(quantity) && quantity > 0) {
      selected.push({ code, quantity })
    }
  })

  return selected
}

form.addEventListener("submit", async (event) => {
  event.preventDefault()
  setMessage("")

  const sellerName = sellerNameInput.value.trim()
  const paymentMethod = paymentMethodSelect.value
  const selectedItems = getSelectedItems()

  if (!sellerName) {
    setMessage("Informe o nome da vendedora.", "error")
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

  const updatesToRollback = []
  const saleRows = []

  for (const item of selectedItems) {
    const selectedProduct = products.find((product) => product.code === item.code)
    if (!selectedProduct) {
      setMessage("Produto não encontrado.", "error")
      submitBtn.disabled = false
      return
    }

    const availableQuantity = Number(selectedProduct.quantity) || 0
    if (availableQuantity < item.quantity) {
      setMessage(`Estoque insuficiente para ${selectedProduct.name}.`, "error")
      submitBtn.disabled = false
      return
    }

    const newQuantity = availableQuantity - item.quantity

    const { error: updateError } = await supabaseClient
      .from("products")
      .update({ quantity: newQuantity })
      .eq("code", item.code)

    if (updateError) {
      for (const previous of updatesToRollback) {
        await supabaseClient
          .from("products")
          .update({ quantity: previous.oldQuantity })
          .eq("code", previous.code)
      }
      setMessage("Erro ao atualizar estoque.", "error")
      submitBtn.disabled = false
      console.log(updateError)
      return
    }

    updatesToRollback.push({
      code: item.code,
      oldQuantity: availableQuantity
    })

    selectedProduct.quantity = newQuantity

    saleRows.push({
      product_code: item.code,
      product_name: selectedProduct.name,
      quantity: item.quantity,
      payment_method: paymentMethod,
      seller_name: sellerName
    })
  }

  const { error: saleError } = await supabaseClient
    .from("sales")
    .insert(saleRows)

  if (saleError) {
    for (const previous of updatesToRollback) {
      await supabaseClient
        .from("products")
        .update({ quantity: previous.oldQuantity })
        .eq("code", previous.code)
    }
    setMessage("Erro ao registrar venda.", "error")
    submitBtn.disabled = false
    console.log(saleError)
    return
  }

  renderProductCards()
  paymentMethodSelect.value = ""
  sellerNameInput.value = ""

  setMessage("Venda registrada com sucesso!", "success")
  submitBtn.disabled = false
})

loadProducts()
