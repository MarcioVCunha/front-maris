const uploadBtn = document.getElementById("uploadBtn")
const fileInput = document.getElementById("fileInput")
const resultEl = document.getElementById("result")

const FUNCTION_URL = window.ENV.SUPABASE_FUNCTION_URL
const SUPABASE_ANON_KEY = window.ENV.SUPABASE_ANON_KEY

// Envia o JSON selecionado para a função do Supabase (import-products).
uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files?.[0]

  if (!file) {
    alert("Selecione um JSON")
    return
  }

  let json
  try {
    const text = await file.text()
    json = JSON.parse(text)
  } catch {
    resultEl.textContent = "JSON inválido ou arquivo ilegível."
    return
  }

  resultEl.textContent = "Enviando..."
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
      resultEl.textContent = JSON.stringify(
        { error: data?.error || `Erro HTTP ${response.status}` },
        null,
        2
      )
      return
    }
    resultEl.textContent = JSON.stringify(data, null, 2)
  } catch {
    resultEl.textContent = "Falha de rede ao enviar o arquivo."
  } finally {
    uploadBtn.disabled = false
  }
})