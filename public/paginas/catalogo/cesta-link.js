// TODO: apagar este arquivo, a seção .cart-card--secondary-path em carrinho.html
// e a página cesta-compartilhada no dia em que ORDERS_ENABLED for ligada.
// O Backend remove create-shared-basket na etapa 2.
;(function () {
  const section = document.querySelector(".cart-card--secondary-path")
  if (window.MarisPedido?.ORDERS_ENABLED === true) {
    if (section) section.hidden = true
    return
  }

  const generateLinkBtn = document.getElementById("generate-link-btn")
  const shareResultEl = document.getElementById("share-result")
  const shareLinkInput = document.getElementById("share-link-input")
  const copyLinkBtn = document.getElementById("copy-link-btn")
  const shareWhatsappBtn = document.getElementById("share-whatsapp-btn")
  const messageEl = document.getElementById("cart-page-message")

  function setMessage(text, type = "") {
    window.MarisUI.setFeedback(messageEl, text, type, { baseClass: "cart-page-message" })
  }

  function setActiveStep(stepNumber) {
    document.querySelectorAll(".cart-step").forEach((el, idx) => {
      const active = idx === stepNumber - 1
      el.classList.toggle("cart-step--active", active)
      if (active) el.setAttribute("aria-current", "step")
      else el.removeAttribute("aria-current")
    })
  }

  function hide() {
    if (!shareResultEl) return
    shareResultEl.hidden = true
    if (shareLinkInput) shareLinkInput.value = ""
  }

  function show(url) {
    if (!shareLinkInput || !shareResultEl || !shareWhatsappBtn) return
    shareLinkInput.value = url
    shareResultEl.hidden = false
    const text = `Olá! Separei algumas peças da Maris Semijoias, dê uma olhada: ${url}`
    shareWhatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(text)}`
  }

  function syncButton() {
    if (!generateLinkBtn) return
    const count = window.MarisCatalogCart?.getItems?.().length || 0
    generateLinkBtn.disabled = count === 0
  }

  async function generateLink() {
    setMessage("")
    const items = window.MarisCatalogCart.getItems().map((line) => ({
      product_code: line.product_code || null,
      component_id: line.component_id || null,
      quantity: Number(line.quantity) || 0,
      unit_price: Number(line.unit_price) || undefined
    }))
    if (!items.length) {
      setMessage("Sua cesta está vazia.", "error")
      return
    }

    generateLinkBtn.disabled = true
    generateLinkBtn.textContent = "Gerando…"
    try {
      const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("create-shared-basket"), {
        body: { items }
      })
      if (!ok || !data.id) {
        setMessage(data.error || "Não foi possível gerar o link.", "error")
        return
      }
      const url = `${window.location.origin}/catalog/cesta?id=${encodeURIComponent(data.id)}`
      show(url)
      setMessage("Link gerado! Copie ou envie no WhatsApp.", "success")
      setActiveStep(3)
    } catch {
      setMessage("Erro de conexão ao gerar o link.", "error")
    } finally {
      generateLinkBtn.disabled = false
      generateLinkBtn.textContent = "Gerar link para compartilhar"
      syncButton()
    }
  }

  async function copyLink() {
    const url = shareLinkInput?.value
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setMessage("Link copiado!", "success")
    } catch {
      shareLinkInput.focus()
      shareLinkInput.select()
      setMessage("Selecione e copie o link manualmente.", "")
    }
  }

  if (generateLinkBtn) generateLinkBtn.addEventListener("click", generateLink)
  if (copyLinkBtn) copyLinkBtn.addEventListener("click", copyLink)
  window.addEventListener("maris-cart-updated", syncButton)
  syncButton()

  window.MarisCestaLink = { hide }
})()
