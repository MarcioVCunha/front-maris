const formEl = document.getElementById("addProductForm")
const submitBtn = document.getElementById("submitBtn")
const resultEl = document.getElementById("result")
const resultWrap = document.getElementById("resultWrap")
const codeInput = document.getElementById("codeInput")
const nameInput = document.getElementById("nameInput")
const priceInput = document.getElementById("priceInput")
const quantityInput = document.getElementById("quantityInput")
const imageUrlsInput = document.getElementById("imageUrlsInput")

const FUNCTION_URL = window.ENV.SUPABASE_ADD_PRODUCT_FUNCTION_URL
const SUPABASE_ANON_KEY = window.ENV.SUPABASE_ANON_KEY

function setResult(text, kind) {
  resultEl.textContent = text
  resultEl.classList.remove("is-loading", "is-error", "is-success")
  if (kind === "loading") resultEl.classList.add("is-loading")
  else if (kind === "error") resultEl.classList.add("is-error")
  else if (kind === "success") resultEl.classList.add("is-success")
  resultWrap.hidden = false
}

function getPayload() {
  const imageUrls = String(imageUrlsInput.value || "")
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return {
    code: String(codeInput.value || "").trim(),
    name: String(nameInput.value || "").trim(),
    unit_price: Number(priceInput.value),
    quantity: Number(quantityInput.value),
    image_url: imageUrls[0] || "",
    image_urls: imageUrls
  }
}

function validatePayload(payload) {
  if (!payload.code) return "Informe o código da peça."
  if (!payload.name) return "Informe o nome da peça."
  if (!Number.isFinite(payload.unit_price) || payload.unit_price < 0) return "Informe um preço válido."
  if (!Number.isInteger(payload.quantity) || payload.quantity < 0) return "Informe uma quantidade inteira válida."
  return ""
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault()

  if (!FUNCTION_URL) {
    setResult("URL da função add-product não encontrada no env.js.", "error")
    return
  }

  const payload = getPayload()
  const validationError = validatePayload(payload)
  if (validationError) {
    setResult(validationError, "error")
    return
  }

  setResult("Enviando peça...", "loading")
  submitBtn.disabled = true

  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setResult(
        JSON.stringify({ error: data?.error || `Erro HTTP ${response.status}` }, null, 2),
        "error"
      )
      return
    }

    setResult(JSON.stringify(data, null, 2), "success")
    formEl.reset()
  } catch {
    setResult("Não foi possível conectar. Verifique a internet e tente de novo.", "error")
  } finally {
    submitBtn.disabled = false
  }
})
