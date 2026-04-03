const uploadBtn = document.getElementById("uploadBtn")
const fileInput = document.getElementById("fileInput")
const resultEl = document.getElementById("result")
const resultWrap = document.getElementById("resultWrap")
const fileNameEl = document.getElementById("fileName")

const FUNCTION_URL = window.ENV.SUPABASE_FUNCTION_URL
const SUPABASE_ANON_KEY = window.ENV.SUPABASE_ANON_KEY

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
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(json)
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setResult(
        JSON.stringify(
          { error: data?.error || `Erro HTTP ${response.status}` },
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
