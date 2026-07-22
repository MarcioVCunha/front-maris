const {
  buildAddProductPayload,
  validateAddProductPayload,
  formatAddProductSuccessMessage,
  formatAddProductErrorMessage,
} = window.MarisAddProductLogic

const formEl = document.getElementById("addProductForm")
const submitBtn = document.getElementById("submitBtn")
const resultEl = document.getElementById("result")
const resultWrap = document.getElementById("resultWrap")
const resultTitleEl = document.getElementById("resultTitle")
const codeInput = document.getElementById("codeInput")
const nameInput = document.getElementById("nameInput")
const priceInput = document.getElementById("priceInput")
const quantityInput = document.getElementById("quantityInput")
const imageUrlsInput = document.getElementById("imageUrlsInput")

const FUNCTION_URL = window.ENV.fn("add-product")

function setResult(text, kind) {
  resultEl.textContent = text
  resultEl.classList.remove("is-loading", "is-error", "is-success")
  if (kind === "loading") {
    resultEl.classList.add("is-loading")
    if (resultTitleEl) resultTitleEl.textContent = "Enviando…"
  } else if (kind === "error") {
    resultEl.classList.add("is-error")
    if (resultTitleEl) resultTitleEl.textContent = "Não foi possível cadastrar"
  } else if (kind === "success") {
    resultEl.classList.add("is-success")
    if (resultTitleEl) resultTitleEl.textContent = "Produto cadastrado"
  }
  resultWrap.hidden = false
}

function getPayload() {
  return buildAddProductPayload({
    code: codeInput.value,
    name: nameInput.value,
    unitPrice: priceInput.value,
    quantity: quantityInput.value,
    imageUrlsRaw: imageUrlsInput.value,
  })
}

formEl.addEventListener("submit", async (event) => {
  event.preventDefault()

  if (!FUNCTION_URL) {
    setResult("URL da função add-product não encontrada.", "error")
    return
  }

  const payload = getPayload()
  const validationError = validateAddProductPayload(payload)
  if (validationError) {
    setResult(validationError, "error")
    return
  }

  setResult("Enviando…", "loading")
  submitBtn.disabled = true

  try {
    const { ok, status, data } = await window.MarisApi.callFunction(FUNCTION_URL, {
      body: payload,
      auth: "anon"
    })

    if (!ok) {
      setResult(formatAddProductErrorMessage(data, status), "error")
      return
    }

    setResult(formatAddProductSuccessMessage(payload, data), "success")
    formEl.reset()
  } catch {
    setResult("Não foi possível conectar. Verifique a internet e tente de novo.", "error")
  } finally {
    submitBtn.disabled = false
  }
})
