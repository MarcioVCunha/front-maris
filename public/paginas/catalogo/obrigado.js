;(function () {
  const titleEl = document.getElementById("obrigado-title")
  const leadEl = document.getElementById("obrigado-lead")
  const orderIdEl = document.getElementById("obrigado-order-id")
  const statusEl = document.getElementById("obrigado-status")
  const methodRowEl = document.getElementById("obrigado-method-row")
  const methodEl = document.getElementById("obrigado-method")
  const messageEl = document.getElementById("obrigado-message")
  const receiptEl = document.getElementById("obrigado-receipt")

  function setMessage(text, type = "") {
    window.MarisUI.setFeedback(messageEl, text, type, { baseClass: "cart-page-message" })
  }

  function captureMethodLabel(value) {
    const key = String(value || "").toLowerCase()
    if (key === "pix") return "Pix"
    if (key === "credit_card" || key === "card") return "Cartão"
    return value ? String(value) : ""
  }

  function applyStatus(status, orderId) {
    const label = window.MarisPagamento.statusLabel(status)
    if (orderIdEl) orderIdEl.textContent = orderId != null ? `#${orderId}` : "—"
    if (statusEl) statusEl.textContent = label
    if (status === "pago") {
      if (titleEl) titleEl.textContent = "Pagamento recebido"
      if (leadEl) leadEl.textContent = "Obrigada! Seu pedido foi pago e vamos cuidar do envio."
    } else if (status === "cancelado") {
      if (titleEl) titleEl.textContent = "Pedido cancelado"
      if (leadEl) leadEl.textContent = "Este pedido está cancelado. Se precisar, fale conosco pelo WhatsApp no catálogo."
    } else {
      if (titleEl) titleEl.textContent = "Pedido registrado"
      if (leadEl) {
        leadEl.textContent = status
          ? `Status atual: ${label}. Se você acabou de pagar, o status pode atualizar em instantes.`
          : "Estamos conferindo o status do seu pedido."
      }
    }
  }

  function callOrderStatus(functionName, body) {
    return window.MarisApi.callFunction(window.ENV.fn(functionName), { body })
  }

  async function load() {
    const query = window.MarisPagamento.parseObrigadoQuery(window.location.search)
    const inferred = window.MarisPagamento.inferStatusFromReturn(query)
    applyStatus(inferred, query.orderId)

    if (query.captureMethod && methodRowEl && methodEl) {
      methodRowEl.hidden = false
      methodEl.textContent = captureMethodLabel(query.captureMethod)
    }

    if (query.receiptUrl && receiptEl) {
      receiptEl.hidden = false
      receiptEl.href = query.receiptUrl
    }

    if (query.orderId == null) {
      setMessage("Não encontramos o número do pedido neste retorno.", "error")
      return
    }

    try {
      const result = await window.MarisPagamento.submitOrderStatus(callOrderStatus, query.orderId)
      if (result.kind === "ok") {
        applyStatus(result.status || inferred, result.orderId ?? query.orderId)
        setMessage("")
        return
      }
      if (inferred) {
        setMessage("")
        return
      }
      setMessage(result.error || "Não foi possível consultar o status agora.", "error")
    } catch (_err) {
      if (!inferred) {
        setMessage("Não foi possível consultar o status agora.", "error")
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load)
  } else {
    load()
  }
})()
