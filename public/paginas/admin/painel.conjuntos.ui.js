// Conjuntos do painel.
export function installConjuntosUi(deps) {
  const {
    isComponentSku,
    showMessage,
    updateComponentSku,
    componentUpdatePayload,
    state,
    conjuntoDialog,
    readDivisionRows,
    renderConjuntoEditDialog,
    shouldShowConjuntos,
    ADMIN_CONJUNTOS_ENABLED,
    saveDivisionsPayload,
    validateDivisionsPayload,
    saveProductDivisions,
    showView,
    renderConjuntoCreatePicker,
    viewEl,
  } = deps

  function bindLegacyConjuntos() {
    const form = document.getElementById("tipos-form")
    if (!form) return
    form.addEventListener("submit", async (event) => {
      event.preventDefault()
      const inputs = [...form.querySelectorAll("input[data-component-id]")]
      for (const input of inputs) {
        if (isComponentSku(input.value, input.dataset.productCode)) continue
        showMessage(`O SKU precisa seguir ${input.dataset.productCode}-DIVISAO.`, "error")
        return
      }
      showMessage("Salvando…")
      for (const input of inputs) {
        const result = await updateComponentSku(componentUpdatePayload({
          componentId: input.dataset.componentId,
          productCode: input.dataset.productCode,
          sku: input.value.trim()
        }))
        if (!result.ok) {
          showMessage(result.error, "error")
          return
        }
      }
      showMessage("SKUs salvos.")
      state.productsLoaded = false
    })
  }

  function bindConjuntoEditDialog(piece) {
    if (!conjuntoDialog || !piece) return
    conjuntoDialog.querySelector("#conjunto-edit-close")?.addEventListener("click", () => conjuntoDialog.close())
    conjuntoDialog.querySelector("#division-add")?.addEventListener("click", () => {
      const current = readDivisionRows(conjuntoDialog.querySelector("#division-rows"))
      current.push({ name: "", quantity: 0, price_percent: "" })
      conjuntoDialog.innerHTML = renderConjuntoEditDialog(piece, { divisions: current })
      bindConjuntoEditDialog(piece)
    })
    conjuntoDialog.querySelectorAll("[data-remove-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-remove-index"))
        const current = readDivisionRows(conjuntoDialog.querySelector("#division-rows"))
          .filter((_, i) => i !== idx)
        conjuntoDialog.innerHTML = renderConjuntoEditDialog(piece, {
          divisions: current.length ? current : [{ name: "", quantity: 0, price_percent: "" }]
        })
        bindConjuntoEditDialog(piece)
      })
    })
    conjuntoDialog.querySelector("#conjunto-edit-save")?.addEventListener("click", async () => {
      if (!shouldShowConjuntos(ADMIN_CONJUNTOS_ENABLED)) {
        showMessage("Salvar divisões completa depende do back-maris PR #17.", "error")
        return
      }
      const payload = saveDivisionsPayload(
        piece.code,
        readDivisionRows(conjuntoDialog.querySelector("#division-rows"))
      )
      const problem = validateDivisionsPayload(payload)
      if (problem) {
        showMessage(problem, "error")
        return
      }
      showMessage("Salvando…")
      const result = await saveProductDivisions(payload)
      if (!result.ok) {
        showMessage(result.error, "error")
        return
      }
      conjuntoDialog.close()
      state.productsLoaded = false
      showMessage("Divisões salvas.")
      showView()
    })
  }

  function openConjuntoEdit(piece, divisions) {
    if (!conjuntoDialog || !piece) return
    conjuntoDialog.innerHTML = renderConjuntoEditDialog(piece, { divisions })
    if (!conjuntoDialog.open) conjuntoDialog.showModal()
    bindConjuntoEditDialog(piece)
  }

  function openConjuntoCreate() {
    if (!conjuntoDialog) return
    const paint = () => {
      conjuntoDialog.innerHTML = renderConjuntoCreatePicker(state.products, state.conjuntoQuery)
      conjuntoDialog.querySelector("#conjunto-create-close")?.addEventListener("click", () => conjuntoDialog.close())
      conjuntoDialog.querySelector("#conjunto-search")?.addEventListener("submit", (event) => {
        event.preventDefault()
        state.conjuntoQuery = conjuntoDialog.querySelector("#conjunto-query")?.value || ""
        paint()
      })
      conjuntoDialog.querySelectorAll("[data-create-code]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const code = btn.getAttribute("data-create-code")
          const piece = state.products.find((item) => item.code === code)
          openConjuntoEdit(piece, [{ name: "", quantity: 0, price_percent: "" }])
        })
      })
    }
    if (!conjuntoDialog.open) conjuntoDialog.showModal()
    paint()
  }

  function bindConjuntos() {
    if (!shouldShowConjuntos()) {
      bindLegacyConjuntos()
      return
    }
    document.getElementById("conjunto-create-open")?.addEventListener("click", () => openConjuntoCreate())
    viewEl.querySelectorAll(".entity-card[data-product-code]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-product-code")
        const piece = state.products.find((item) => item.code === code)
        openConjuntoEdit(piece)
      })
    })
  }

  return {
    bindLegacyConjuntos,
    bindConjuntoEditDialog,
    openConjuntoEdit,
    openConjuntoCreate,
    bindConjuntos,
  }
}
