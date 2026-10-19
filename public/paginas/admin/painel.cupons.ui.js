// Cupons e indicação do painel.
export function installCuponsUi(deps) {
  const {
    fetchCoupons,
    state,
    fetchReferrals,
    couponDialog,
    renderCouponDialogContent,
    validateCouponPayload,
    saveCoupon,
    showMessage,
    referralCodeDialog,
    renderReferralCodeDialogContent,
    validateReferralCodePayload,
    createReferralCode,
    viewEl,
    renderCouponsPage,
    formatPrice,
    toggleCoupon,
  } = deps

  async function loadCoupons() {
    const res = await fetchCoupons()
    state.coupons = res.ok ? res.coupons : []
    state.couponSummary = res.summary || null
  }

  async function loadReferrals() {
    const res = await fetchReferrals()
    state.referrals = res.ok ? res.referrals : []
    state.referralSummary = res.summary || null
  }

  function openCouponDialog() {
    if (!couponDialog) return
    couponDialog.innerHTML = renderCouponDialogContent()
    const form = couponDialog.querySelector("#coupon-form")
    const closeBtn = couponDialog.querySelector("[data-dialog-close='coupon']")

    closeBtn?.addEventListener("click", () => couponDialog.close())

    form?.addEventListener("submit", async (e) => {
      e.preventDefault()
      const payload = {
        code: form.querySelector("#coupon-code")?.value,
        discount_type: form.querySelector("#coupon-discount-type")?.value,
        discount_value: form.querySelector("#coupon-discount-value")?.value,
        min_order_value: form.querySelector("#coupon-min-order")?.value,
        description: form.querySelector("#coupon-description")?.value,
        max_uses: form.querySelector("#coupon-max-uses")?.value,
        expires_at: form.querySelector("#coupon-expires-at")?.value || null,
        first_purchase_only: form.querySelector("#coupon-first-purchase")?.checked,
        is_active: form.querySelector("#coupon-is-active")?.checked
      }

      const validation = validateCouponPayload(payload)
      if (!validation.ok) {
        alert(validation.error)
        return
      }

      const submitBtn = form.querySelector("button[type='submit']")
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = "Salvando..."
      }

      const res = await saveCoupon(validation.data)
      if (!res.ok) {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = "Salvar Cupom"
        }
        alert(res.error || "Erro ao salvar o cupom.")
        return
      }

      couponDialog.close()
      showMessage(`Cupom "${validation.data.code}" criado com sucesso!`)
      await loadCoupons()
      paintCupons()
    })

    if (!couponDialog.open) couponDialog.showModal()
  }

  function openReferralCodeDialog() {
    if (!referralCodeDialog) return
    referralCodeDialog.innerHTML = renderReferralCodeDialogContent()
    const form = referralCodeDialog.querySelector("#referral-code-form")
    const closeBtn = referralCodeDialog.querySelector("[data-dialog-close='referral']")

    closeBtn?.addEventListener("click", () => referralCodeDialog.close())

    form?.addEventListener("submit", async (e) => {
      e.preventDefault()
      const payload = {
        referrer_name: form.querySelector("#ref-name")?.value,
        referrer_whatsapp: form.querySelector("#ref-whatsapp")?.value,
        discount_percent: form.querySelector("#ref-percent")?.value
      }

      const validation = validateReferralCodePayload(payload)
      if (!validation.ok) {
        alert(validation.error)
        return
      }

      const submitBtn = form.querySelector("button[type='submit']")
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = "Gerando..."
      }

      const res = await createReferralCode(validation.data)
      if (!res.ok) {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = "Criar Código de Indicação"
        }
        alert(res.error || "Erro ao gerar código de indicação.")
        return
      }

      referralCodeDialog.close()
      const generatedCode = res.data?.code || "indicação"
      showMessage(`Código ${generatedCode} criado com sucesso para ${validation.data.referrer_name}!`)
      await Promise.all([loadCoupons(), loadReferrals()])
      paintCupons()
    })

    if (!referralCodeDialog.open) referralCodeDialog.showModal()
  }

  function paintCupons() {
    viewEl.innerHTML = renderCouponsPage(state.coupons, state.referrals, {
      tab: state.couponTab,
      couponQuery: state.couponQuery,
      couponStatus: state.couponStatus,
      referralQuery: state.referralQuery,
      referralStatus: state.referralStatus,
      couponSummary: state.couponSummary,
      referralSummary: state.referralSummary,
      formatMoney: formatPrice
    })

    // Tab switching
    viewEl.querySelectorAll(".coupons-tab").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        state.couponTab = tabBtn.dataset.tab || "coupons"
        paintCupons()
      })
    })

    // Buttons for new dialogs
    viewEl.querySelector("#btn-new-coupon")?.addEventListener("click", openCouponDialog)
    viewEl.querySelector("#btn-new-referral")?.addEventListener("click", openReferralCodeDialog)

    // Coupon search
    const couponSearch = viewEl.querySelector("#coupon-search-input")
    couponSearch?.addEventListener("input", () => {
      state.couponQuery = couponSearch.value
      paintCupons()
      const newInput = viewEl.querySelector("#coupon-search-input")
      if (newInput) {
        newInput.focus()
        newInput.setSelectionRange(newInput.value.length, newInput.value.length)
      }
    })

    // Coupon filter chips
    viewEl.querySelectorAll("[data-status]").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.couponStatus = chip.dataset.status || "all"
        paintCupons()
      })
    })

    // Referral search
    const refSearch = viewEl.querySelector("#referral-search-input")
    refSearch?.addEventListener("input", () => {
      state.referralQuery = refSearch.value
      paintCupons()
      const newInput = viewEl.querySelector("#referral-search-input")
      if (newInput) {
        newInput.focus()
        newInput.setSelectionRange(newInput.value.length, newInput.value.length)
      }
    })

    // Referral filter chips
    viewEl.querySelectorAll("[data-ref-status]").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.referralStatus = chip.dataset.refStatus || "all"
        paintCupons()
      })
    })

    // Toggle active/inactive
    viewEl.querySelectorAll("[data-action='toggle']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.id)
        const isCurrentlyActive = btn.dataset.active === "true"
        btn.disabled = true
        const res = await toggleCoupon(id, !isCurrentlyActive)
        if (res.ok) {
          showMessage(!isCurrentlyActive ? "Cupom ativado." : "Cupom desativado.")
          await loadCoupons()
          paintCupons()
        } else {
          showMessage(res.error || "Não foi possível alterar a situação do cupom.", "error")
          btn.disabled = false
        }
      })
    })
  }

  return {
    loadCoupons,
    loadReferrals,
    openCouponDialog,
    openReferralCodeDialog,
    paintCupons,
  }
}
