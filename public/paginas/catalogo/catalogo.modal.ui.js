// Modal do produto e lista de espera.
export function installModalUi(deps) {
  const {
    estado,
    productModalImage,
    productModalPrevBtn,
    productModalNextBtn,
    productModalDots,
    productModalTitle,
    productModalComponentsList,
    escapeHtml,
    hasPromo,
    effectivePrice,
    formatMoneyBRL,
    productModalActions,
    waitlistFeedbackEl,
    waitlistNameInput,
    waitlistWhatsappInput,
    waitlistEmailInput,
    waitlistModal,
    validateEmail,
    formatRestockAlertPayload,
    waitlistSubmitBtn,
    productModalColors,
    productModalWhatsapp,
    whatsappLink,
    productWhatsappMessage,
    productModalShareWhatsapp,
    buildProductShareText,
    buildWhatsappShareLink,
    buildProductOgMetadata,
    updateOpenGraphTags,
    productModalCode,
    productModalPrice,
    productModalStock,
    productModalStatus,
    productModal,
    piecePage,
  } = deps

  function setModalImageIndex(index) {
    if (!estado.modalImageUrls.length) {
      productModalImage.src = ""
      productModalImage.alt = "Produto"
      productModalPrevBtn.disabled = true
      productModalNextBtn.disabled = true
      productModalDots.innerHTML = ""
      return
    }

    estado.modalImageIndex = (index + estado.modalImageUrls.length) % estado.modalImageUrls.length
    productModalImage.src = estado.modalImageUrls[estado.modalImageIndex]
    productModalImage.alt = `${productModalTitle.textContent || "Produto"} (${estado.modalImageIndex + 1}/${estado.modalImageUrls.length})`
    productModalPrevBtn.disabled = estado.modalImageUrls.length <= 1
    productModalNextBtn.disabled = estado.modalImageUrls.length <= 1
    productModalDots.innerHTML = estado.modalImageUrls
      .map((_, dotIndex) => `<button class="carousel-dot ${dotIndex === estado.modalImageIndex ? "active" : ""}" data-index="${dotIndex}" type="button" aria-label="Ir para imagem ${dotIndex + 1}"></button>`)
      .join("")
  }

  function renderModalComponentsRows(components) {
    if (!components.length) {
      productModalComponentsList.innerHTML = '<div class="component-col">Este produto não tem tipos cadastrados.</div>'
      return
    }

    productModalComponentsList.innerHTML = components.map((component) => {
      const componentQty = Number(component.quantity) || 0
      const isAvailable = componentQty > 0
      const actionBtn = isAvailable
        ? `<button type="button" class="modal-add-btn" data-add-component="${escapeHtml(component.id)}">+ Cesta</button>`
        : `<button type="button" class="modal-waitlist-btn" data-waitlist-component="${escapeHtml(component.id)}">Lista de espera</button>`
      const componentOnSale = hasPromo(component)
      const priceLabel = componentOnSale
        ? `Valor: ${window.MarisUI.renderPricePair(component.unit_price, effectivePrice(component))}`
        : `Valor: ${formatMoneyBRL(component.unit_price)}`
      return `
        <div class="component-row ${isAvailable ? "" : "is-unavailable"}">
          <div class="component-col">
            <strong>${escapeHtml(component.name)}</strong>
          </div>
          <div class="component-col ${isAvailable ? "" : "component-status-unavailable"}">${isAvailable ? priceLabel : "Indisponível"}</div>
          <div class="component-col component-actions">${actionBtn}</div>
        </div>
      `
    }).join("")
  }

  function renderModalActions(product, components, soldOut) {
    if (!productModalActions) return
    if (components.length) {
      productModalActions.innerHTML = ""
      return
    }
    if (soldOut) {
      productModalActions.innerHTML = `<button type="button" class="btn-primary modal-waitlist-btn" data-waitlist-code="${escapeHtml(product.code)}">💖 Quero essa peça</button>`
    } else {
      productModalActions.innerHTML = `<button type="button" class="btn-primary modal-add-btn" data-add-code="${escapeHtml(product.code)}">Adicionar à cesta</button>`
    }
  }

  function setWaitlistFeedback(text, type = "") {
    window.MarisUI.setFeedback(waitlistFeedbackEl, text, type, { baseClass: "waitlist-feedback" })
  }

  function openWaitlistModal({ productCode = null, componentId = null }) {
    estado.pendingWaitlistItem = { productCode, componentId }
    setWaitlistFeedback("")
    const buyer = window.MarisCatalogCart?.getBuyerProfile?.()
    if (buyer) {
      if (waitlistNameInput) waitlistNameInput.value = buyer.name || ""
      if (waitlistWhatsappInput) waitlistWhatsappInput.value = buyer.whatsapp || ""
      if (waitlistEmailInput) waitlistEmailInput.value = buyer.email || ""
    }
    waitlistModal.hidden = false
    if (waitlistWhatsappInput) waitlistWhatsappInput.focus()
    else if (waitlistEmailInput) waitlistEmailInput.focus()
    else if (waitlistNameInput) waitlistNameInput.focus()
  }

  function closeWaitlistModal() {
    waitlistModal.hidden = true
    estado.pendingWaitlistItem = null
  }

  function joinWaitlist({ productCode = null, componentId = null }) {
    // 1-tap: registra imediatamente no backend como interesse da cliente
    try {
      const payload = {
        anonymous: true,
        product_code: productCode ? String(productCode).trim() : null,
        component_id: componentId ? Number(componentId) : null,
      }
      window.MarisApi?.callFunction?.(window.ENV.fn("customer-waitlist-add"), {
        body: payload,
      }).catch(() => {})
    } catch {}

    openWaitlistModal({ productCode, componentId })
  }

  async function submitWaitlist() {
    if (!estado.pendingWaitlistItem) return
    const email = (waitlistEmailInput?.value || "").trim().toLowerCase()
    const name = (waitlistNameInput?.value || "").trim()
    const rawWhatsapp = (waitlistWhatsappInput?.value || "").trim()
    const whatsapp = window.MarisUtils.onlyDigits(rawWhatsapp)

    if (!email && !whatsapp) {
      closeWaitlistModal()
      deps.setCatalogFeedback("Interesse registrado! 💖", "success")
      return
    }

    if (email) {
      const isEmailValid = typeof validateEmail === "function"
        ? validateEmail(email)
        : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      if (!isEmailValid) {
        setWaitlistFeedback("Informe um e-mail válido (ex.: seu@email.com).", "error")
        return
      }
    }

    if (whatsapp && whatsapp.length < 10) {
      setWaitlistFeedback("WhatsApp incompleto. Digite com DDD (ex.: 11 99999-9999).", "error")
      return
    }

    window.MarisCatalogCart?.saveBuyerProfile?.({ name, whatsapp, email })

    const payload = typeof formatRestockAlertPayload === "function"
      ? formatRestockAlertPayload({
          email,
          name,
          whatsapp,
          productCode: estado.pendingWaitlistItem.productCode,
          componentId: estado.pendingWaitlistItem.componentId,
        })
      : {
          buyer_email: email,
          buyer_name: name || (email ? "Cliente" : ""),
          buyer_whatsapp: whatsapp,
          product_code: estado.pendingWaitlistItem.productCode,
          component_id: estado.pendingWaitlistItem.componentId,
        }

    waitlistSubmitBtn.disabled = true
    waitlistSubmitBtn.textContent = "Cadastrando aviso…"
    try {
      const { ok, data } = await window.MarisApi.callFunction(window.ENV.fn("customer-waitlist-add"), {
        body: payload
      })
      if (!ok) {
        setWaitlistFeedback(data.error || "Não foi possível cadastrar seu aviso.", "error")
        return
      }
      closeWaitlistModal()
      deps.setCatalogFeedback("Aviso cadastrado! Enviaremos uma notificação assim que a peça voltar ao estoque.", "success")
    } catch {
      setWaitlistFeedback("Erro de conexão. Tente novamente.", "error")
    } finally {
      waitlistSubmitBtn.disabled = false
      waitlistSubmitBtn.textContent = "Cadastrar aviso"
    }
  }

  function openProductModal(group) {
    if (!group) return
    estado.currentModalGroup = group
    const variant = deps.selectedVariant(group)
    const product = variant?.product
    if (!product) return

    const components = deps.getProductComponents(product.code)
    const available = deps.isCatalogProductAvailable(product, components)
    const soldOut = !available
    estado.modalImageUrls = deps.getProductImageUrls(product)
    estado.modalImageIndex = 0

    productModalTitle.textContent = product.name || "Produto"
    if (productModalColors) productModalColors.innerHTML = deps.renderColorOptions(group, product.code)
    if (productModalWhatsapp) {
      productModalWhatsapp.href = whatsappLink(productWhatsappMessage(product.name))
    }
    if (productModalShareWhatsapp) {
      const shareText = buildProductShareText(product, { code: product.code, origin: window.location.origin })
      productModalShareWhatsapp.href = buildWhatsappShareLink(shareText)
    }
    const modalOgMeta = buildProductOgMetadata(product, {
      code: product.code,
      origin: window.location.origin,
      image: estado.modalImageUrls[0]
    })
    updateOpenGraphTags(modalOgMeta)
    setModalImageIndex(0)
    productModalCode.textContent = ""
    if (components.length) {
      productModalPrice.innerHTML = "Preço: consulte os valores dos tipos"
    } else if (soldOut) {
      productModalPrice.innerHTML = "Preço: Em falta"
    } else {
      productModalPrice.innerHTML = deps.renderOfferHtml(product)
    }
    productModalStock.textContent = ""
    productModalStatus.textContent = ""
    if (!available) {
      productModalStatus.textContent = "Encomende com o vendedor"
    } else if (components.length) {
      productModalStatus.textContent = "Pode ser comprado separado."
    }

    renderModalComponentsRows(components)
    renderModalActions(product, components, soldOut)

    productModal.hidden = false
  }

  function closeProductModal() {
    productModal.hidden = true
    estado.currentModalGroup = null
    if (!piecePage || piecePage.hidden) {
      updateOpenGraphTags(buildProductOgMetadata(null, { origin: window.location.origin }))
    }
  }

  return {
    setModalImageIndex,
    renderModalComponentsRows,
    renderModalActions,
    setWaitlistFeedback,
    openWaitlistModal,
    closeWaitlistModal,
    joinWaitlist,
    submitWaitlist,
    openProductModal,
    closeProductModal,
  }
}
