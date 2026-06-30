const uploadBtn = document.getElementById("uploadBtn")
const fileInput = document.getElementById("fileInput")
const resultEl = document.getElementById("result")
const resultWrap = document.getElementById("resultWrap")
const fileNameEl = document.getElementById("fileName")

const FUNCTION_URL = window.ENV.SUPABASE_FUNCTION_URL

function setResult(text, kind) {
  resultEl.textContent = text
  resultEl.classList.remove("is-loading", "is-error", "is-success")
  if (kind === "loading") resultEl.classList.add("is-loading")
  else if (kind === "error") resultEl.classList.add("is-error")
  else if (kind === "success") resultEl.classList.add("is-success")
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
    alert("Selecione um arquivo JSON.")
    return
  }

  let json
  try {
    const text = await file.text()
    json = JSON.parse(text)
  } catch {
    setResult("Não foi possível ler o arquivo ou o JSON está inválido.", "error")
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
      setResult(
        JSON.stringify(
          { error: data?.error || `Erro HTTP ${status}` },
          null,
          2
        ),
        "error"
      )
      return
    }
    setResult(JSON.stringify(data, null, 2), "success")
  } catch {
    setResult("Não foi possível conectar. Verifique a internet e tente de novo.", "error")
  } finally {
    uploadBtn.disabled = false
  }
})
