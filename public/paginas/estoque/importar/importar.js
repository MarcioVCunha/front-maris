const {
  parseImportJsonText,
  formatImportSuccessMessage,
  formatImportErrorMessage,
} = window.MarisImportLogic

const uploadBtn = document.getElementById("uploadBtn")
const fileInput = document.getElementById("fileInput")
const resultEl = document.getElementById("result")
const resultWrap = document.getElementById("resultWrap")
const resultTitleEl = document.getElementById("resultTitle")
const detailsEl = document.getElementById("resultDetails")
const fileNameEl = document.getElementById("fileName")

const FUNCTION_URL = window.ENV.fn("import-products")

function setResult(text, kind, detailsText = "") {
  resultEl.textContent = text
  resultEl.classList.remove("is-loading", "is-error", "is-success")
  if (kind === "loading") {
    resultEl.classList.add("is-loading")
    if (resultTitleEl) resultTitleEl.textContent = "Enviando…"
  } else if (kind === "error") {
    resultEl.classList.add("is-error")
    if (resultTitleEl) resultTitleEl.textContent = "Não foi possível importar"
  } else if (kind === "success") {
    resultEl.classList.add("is-success")
    if (resultTitleEl) resultTitleEl.textContent = "Importação concluída"
  }
  if (detailsEl) {
    if (detailsText) {
      detailsEl.hidden = false
      detailsEl.textContent = detailsText
    } else {
      detailsEl.hidden = true
      detailsEl.textContent = ""
    }
  }
  resultWrap.hidden = false
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0]
  if (file) {
    fileNameEl.textContent = file.name
    fileNameEl.classList.add("has-file")
  } else {
    fileNameEl.textContent = "Nenhum arquivo selecionado"
    fileNameEl.classList.remove("has-file")
  }
})

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files?.[0]

  if (!file) {
    setResult("Selecione um arquivo JSON para continuar.", "error")
    return
  }

  if (!FUNCTION_URL) {
    setResult("URL da função de importação não encontrada.", "error")
    return
  }

  let json
  try {
    const text = await file.text()
    json = parseImportJsonText(text)
  } catch {
    setResult("Não foi possível ler o arquivo ou o JSON está inválido.", "error")
    return
  }

  if (!Array.isArray(json) || !json.length) {
    setResult("O arquivo precisa ser uma lista de produtos (array JSON não vazio).", "error")
    return
  }

  setResult("Enviando…", "loading")
  uploadBtn.disabled = true

  try {
    const { ok, status, data } = await window.MarisApi.callFunction(FUNCTION_URL, {
      body: json,
      auth: "anon"
    })

    if (!ok) {
      setResult(formatImportErrorMessage(data, status), "error")
      return
    }
    setResult(formatImportSuccessMessage(data), "success")
  } catch {
    setResult("Não foi possível conectar. Verifique a internet e tente de novo.", "error")
  } finally {
    uploadBtn.disabled = false
  }
})
