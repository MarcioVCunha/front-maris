// Promoções do painel.
export function installPromocoesUi(deps) {
  const {
    fetchPromotions,
    state,
    showMessage,
    promoDialog,
    renderPromoDialogContent,
    promoPriceExample,
    validatePromoPayload,
    savePromotion,
    viewEl,
    renderPromotionsPage,
    endPromotion,
  } = deps

  async function loadPromotions() {
    const result = await fetchPromotions()
    state.promotions = result.ok ? (result.data?.promotions || []) : []
    if (!result.ok) showMessage(result.error || "Não foi possível carregar as promoções.", "error")
    return state.promotions
  }

  function openPromoEditDialog(promo = null) {
    state.promoEditing = promo
    promoDialog.innerHTML = renderPromoDialogContent(promo)

    const form = promoDialog.querySelector("#promo-form")
    const closeBtn = promoDialog.querySelector("#promo-dialog-close-btn")
    const cancelBtn = promoDialog.querySelector("#promo-dialog-cancel")
    const radioValue = (name) =>
      promoDialog.querySelector(`input[name="${name}"]:checked`)?.value
    const scopeSelect = {
      get value() { return radioValue("promo-scope") },
      addEventListener: (type, fn) => promoDialog.querySelectorAll('input[name="promo-scope"]').forEach((el) => el.addEventListener(type, fn)),
    }
    const groupCategory = promoDialog.querySelector("#promo-group-category")
    const groupProducts = promoDialog.querySelector("#promo-group-products")
    const groupStale = promoDialog.querySelector("#promo-group-stale")
    const discountTypeSelect = {
      get value() { return radioValue("promo-discount-type") },
      addEventListener: (type, fn) => promoDialog.querySelectorAll('input[name="promo-discount-type"]').forEach((el) => el.addEventListener(type, fn)),
    }
    const valueLabel = promoDialog.querySelector("#promo-value-label")
    const valueInput = promoDialog.querySelector("#promo-form-value")
    const feedbackEl = promoDialog.querySelector("#promo-dialog-feedback")

    const syncScope = () => {
      const current = scopeSelect.value
      if (groupCategory) groupCategory.hidden = current !== "categoria"
      if (groupProducts) groupProducts.hidden = current !== "produto"
      if (groupStale) groupStale.hidden = current !== "parada"
    }

    const syncDiscount = () => {
      const isPercent = discountTypeSelect.value === "percent"
      if (valueLabel) valueLabel.textContent = isPercent ? "Desconto (% OFF) *" : "Desconto (R$ OFF) *"
      if (valueInput) {
        valueInput.placeholder = isPercent ? "Ex: 15" : "Ex: 25.00"
        if (isPercent) valueInput.max = "100"
        else valueInput.removeAttribute("max")
      }
      const hint = promoDialog.querySelector("#promo-price-hint")
      if (hint) hint.textContent = promoPriceExample(discountTypeSelect.value, valueInput?.value)
    }

    scopeSelect?.addEventListener("change", syncScope)
    discountTypeSelect?.addEventListener("change", syncDiscount)
    valueInput?.addEventListener("input", syncDiscount)
    closeBtn?.addEventListener("click", () => promoDialog.close())
    cancelBtn?.addEventListener("click", () => promoDialog.close())

    promoDialog.addEventListener("click", (e) => {
      if (e.target === promoDialog) promoDialog.close()
    })

    form?.addEventListener("submit", async (e) => {
      e.preventDefault()
      if (feedbackEl) feedbackEl.hidden = true

      const nameInput = promoDialog.querySelector("#promo-form-name")
      const categorySelect = promoDialog.querySelector("#promo-form-category")
      const codesInput = promoDialog.querySelector("#promo-form-codes")
      const startsAtInput = promoDialog.querySelector("#promo-form-starts-at")
      const endsAtInput = promoDialog.querySelector("#promo-form-ends-at")
      const maxUnitsInput = promoDialog.querySelector("#promo-form-max-units")
      const activeCheckbox = promoDialog.querySelector("#promo-form-active")
      const submitBtn = promoDialog.querySelector("#promo-dialog-submit")

      const formData = {
        id: promo?.id || null,
        name: nameInput?.value,
        scope: scopeSelect.value,
        category: categorySelect?.value,
        product_codes: codesInput?.value,
        discount_type: discountTypeSelect.value,
        value: Number(valueInput?.value),
        starts_at: startsAtInput?.value,
        ends_at: endsAtInput?.value,
        max_units: maxUnitsInput?.value,
        is_active: activeCheckbox ? activeCheckbox.checked : true,
      }

      const validation = validatePromoPayload(formData)
      if (!validation.ok) {
        if (feedbackEl) {
          feedbackEl.textContent = validation.error
          feedbackEl.className = "promo-feedback error"
          feedbackEl.hidden = false
        }
        return
      }

      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = "Salvando…"
      }

      const res = await savePromotion(validation.payload)
      if (!res.ok) {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = "Salvar promoção"
        }
        if (feedbackEl) {
          feedbackEl.textContent = res.error || "Erro ao salvar a promoção."
          feedbackEl.className = "promo-feedback error"
          feedbackEl.hidden = false
        }
        return
      }

      promoDialog.close()
      showMessage(promo?.id ? "Promoção atualizada." : "Promoção salva com sucesso!")
      await loadPromotions()
      paintPromocoes()
    })

    if (!promoDialog.open) promoDialog.showModal()
  }

  function paintPromocoes() {
    viewEl.innerHTML = renderPromotionsPage(state.promotions, {
      query: state.promoQuery,
      status: state.promoStatusFilter
    })

    // Botão nova promoção
    viewEl.querySelector("#promo-new-btn")?.addEventListener("click", () => openPromoEditDialog(null))

    // Busca de promoções
    const searchInput = viewEl.querySelector("#promo-search")
    searchInput?.addEventListener("input", () => {
      state.promoQuery = searchInput.value
      paintPromocoes()
      const newInput = viewEl.querySelector("#promo-search")
      if (newInput) {
        newInput.focus()
        newInput.setSelectionRange(newInput.value.length, newInput.value.length)
      }
    })

    // Filtro por status
    viewEl.querySelectorAll(".status-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.promoStatusFilter = btn.dataset.status || "all"
        paintPromocoes()
      })
    })

    // Ações nos cards (Editar / Encerrar)
    viewEl.querySelector("#promo-list")?.addEventListener("click", async (event) => {
      const actionBtn = event.target.closest("button[data-action]")
      if (!actionBtn) return
      const action = actionBtn.dataset.action
      const id = Number(actionBtn.dataset.id)
      const promo = (state.promotions || []).find((p) => Number(p.id) === id)
      if (!promo) return

      if (action === "edit") {
        openPromoEditDialog(promo)
        return
      }

      if (action === "end") {
        const ok = confirm(`Deseja realmente encerrar a promoção "${promo.name}"?`)
        if (!ok) return
        const res = await endPromotion(id)
        if (res.ok) {
          showMessage(res.data?.already_ended ? "Esta promoção já estava encerrada." : "Promoção encerrada com sucesso!")
          await loadPromotions()
          paintPromocoes()
        } else {
          showMessage(res.error || "Não foi possível encerrar a promoção.", "error")
        }
      }
    })
  }

  return {
    loadPromotions,
    openPromoEditDialog,
    paintPromocoes,
  }
}
