const { createSupabaseClient } = window.MarisUtils

const supabaseClient = createSupabaseClient()

const productSelect = document.getElementById("product-select")
const componentsList = document.getElementById("components-list")
const addComponentBtn = document.getElementById("add-component-btn")
const saveComponentsBtn = document.getElementById("save-components-btn")
const messageEl = document.getElementById("components-message")

let products = []
let componentsByProductCode = Object.create(null)

function setMessage(text, type = "") {
  messageEl.textContent = text
  messageEl.className = `message ${type}`.trim()
}

function createComponentRow(component = null) {
  const id = component?.id ? String(component.id) : ""
  const name = component?.name || ""
  const price = component?.unit_price != null ? String(component.unit_price) : ""
  const quantity = component?.quantity != null ? String(component.quantity) : "0"

  return `
    <div class="component-row" data-component-id="${id}">
      <input data-field="name" type="text" placeholder="Nome (ex.: Brinco)" value="${name}">
      <input data-field="unit_price" type="number" min="0" step="0.01" placeholder="Valor" value="${price}">
      <input data-field="quantity" type="number" min="0" step="1" placeholder="Estoque" value="${quantity}">
      <button type="button" class="component-remove-btn">Remover</button>
    </div>
  `
}

function renderComponentRows(productCode) {
  const components = componentsByProductCode[productCode] || []
  if (!components.length) {
    componentsList.innerHTML = createComponentRow()
    return
  }
  componentsList.innerHTML = components.map((component) => createComponentRow(component)).join("")
}

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("code, name")
    .order("name")

  if (error) {
    setMessage("Erro ao carregar produtos.", "error")
    return
  }

  products = data || []
  productSelect.innerHTML = `
    <option value="">Selecione um produto</option>
    ${products.map((product) => `<option value="${product.code}">${product.name} (${product.code})</option>`).join("")}
  `
}

async function loadComponents() {
  const { data, error } = await supabaseClient
    .from("product_components")
    .select("id, product_code, name, unit_price, quantity, is_active")
    .eq("is_active", true)
    .order("name")

  if (error) {
    setMessage("Erro ao carregar tipos cadastrados.", "error")
    return
  }

  componentsByProductCode = Object.create(null)
  ;(data || []).forEach((component) => {
    if (!componentsByProductCode[component.product_code]) {
      componentsByProductCode[component.product_code] = []
    }
    componentsByProductCode[component.product_code].push(component)
  })
}

async function saveCurrentProductComponents() {
  const productCode = productSelect.value
  if (!productCode) {
    setMessage("Selecione um produto.", "error")
    return
  }

  const rows = Array.from(componentsList.querySelectorAll(".component-row"))
  const parsedRows = []

  for (const row of rows) {
    const name = String(row.querySelector('input[data-field="name"]')?.value || "").trim()
    const unitPrice = Number(row.querySelector('input[data-field="unit_price"]')?.value)
    const quantity = Number(row.querySelector('input[data-field="quantity"]')?.value)

    if (!name) continue

    if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isInteger(quantity) || quantity < 0) {
      setMessage("Preencha valor e estoque corretamente (estoque inteiro e >= 0).", "error")
      return
    }

    parsedRows.push({
      product_code: productCode,
      name,
      unit_price: unitPrice,
      quantity,
      is_active: true
    })
  }

  const { error: deleteError } = await supabaseClient
    .from("product_components")
    .delete()
    .eq("product_code", productCode)

  if (deleteError) {
    setMessage("Erro ao atualizar tipos.", "error")
    return
  }

  if (parsedRows.length) {
    const { error: insertError } = await supabaseClient
      .from("product_components")
      .insert(parsedRows)

    if (insertError) {
      setMessage("Erro ao salvar tipos.", "error")
      return
    }
  }

  await loadComponents()
  renderComponentRows(productCode)
  setMessage("Tipos salvos com sucesso.", "success")
}

componentsList.addEventListener("click", (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!target.classList.contains("component-remove-btn")) return

  const row = target.closest(".component-row")
  if (row) row.remove()

  if (!componentsList.querySelector(".component-row")) {
    componentsList.innerHTML = createComponentRow()
  }
})

addComponentBtn.addEventListener("click", () => {
  componentsList.insertAdjacentHTML("beforeend", createComponentRow())
})

saveComponentsBtn.addEventListener("click", () => {
  saveCurrentProductComponents()
})

productSelect.addEventListener("change", () => {
  setMessage("")
  const productCode = productSelect.value
  if (!productCode) {
    componentsList.innerHTML = ""
    return
  }
  renderComponentRows(productCode)
})

Promise.all([loadProducts(), loadComponents()])
