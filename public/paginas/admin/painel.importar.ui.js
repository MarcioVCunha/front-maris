// Importação de peças do painel.
export function installImportarUi(deps) {
  const {
    state,
    viewEl,
    renderImportResultView,
    formatImportSuccessMessage,
    validatePreviewItems,
    renderImportPreviewView,
    updatePreviewItem,
    escapeHtml,
    removePreviewItem,
    showMessage,
    buildImportPayloadFromPreview,
    importProducts,
    formatImportErrorMessage,
    formatImageFailuresWarning,
    renderImportUploadBlock,
    parseImportFileContent,
  } = deps

  function paintImportar() {
    if (state.importResult) {
      viewEl.innerHTML = renderImportResultView({
        successMessage: formatImportSuccessMessage(state.importResult.data),
        warningText: state.importResult.warning,
      })
      document.getElementById("import-btn-restart")?.addEventListener("click", () => {
        state.importItems = null
        state.importResult = null
        state.importQuery = ""
        paintImportar()
      })
      return
    }

    if (Array.isArray(state.importItems)) {
      const validation = validatePreviewItems(state.importItems)
      viewEl.innerHTML = renderImportPreviewView({
        items: state.importItems,
        query: state.importQuery,
        validation,
        isSubmitting: state.importIsSubmitting,
      })

      const searchInput = document.getElementById("import-search-input")
      const searchClear = document.getElementById("import-search-clear")
      searchInput?.addEventListener("input", (e) => {
        state.importQuery = e.target.value
        paintImportar()
        const reSearch = document.getElementById("import-search-input")
        if (reSearch) {
          reSearch.focus()
          reSearch.setSelectionRange(reSearch.value.length, reSearch.value.length)
        }
      })
      searchClear?.addEventListener("click", () => {
        state.importQuery = ""
        paintImportar()
      })

      viewEl.querySelectorAll(".import-input, .import-select").forEach((el) => {
        const handler = (e) => {
          const id = e.target.getAttribute("data-id")
          const field = e.target.getAttribute("data-field")
          const val = e.target.value
          state.importItems = updatePreviewItem(state.importItems, id, field, val)

          const updatedVal = validatePreviewItems(state.importItems)
          const confirmBtn = document.getElementById("import-btn-confirm")
          if (confirmBtn) {
            confirmBtn.disabled = !updatedVal.isValid || state.importIsSubmitting
            confirmBtn.textContent = state.importIsSubmitting ? "Gravando peças…" : `Confirmar Importação (${state.importItems.length})`
          }

          const cardEl = e.target.closest(".import-card")
          if (cardEl) {
            const cardErrors = updatedVal.errorsByRow[id] || []
            cardEl.classList.toggle("is-invalid", cardErrors.length > 0)
            let errorsContainer = cardEl.querySelector(".import-card__errors")
            if (cardErrors.length) {
              if (!errorsContainer) {
                errorsContainer = document.createElement("div")
                errorsContainer.className = "import-card__errors"
                cardEl.querySelector(".import-card__body")?.appendChild(errorsContainer)
              }
              errorsContainer.innerHTML = cardErrors.map((err) => `<span class="import-card__error-msg">⚠️ ${escapeHtml(err)}</span>`).join("")
            } else if (errorsContainer) {
              errorsContainer.remove()
            }
          }
        }
        el.addEventListener("input", handler)
        el.addEventListener("change", handler)
      })

      viewEl.querySelectorAll("[data-action='remove-item']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-id")
          state.importItems = removePreviewItem(state.importItems, id)
          if (!state.importItems.length) {
            showMessage("Todas as peças foram removidas.")
            state.importItems = null
            state.importQuery = ""
          }
          paintImportar()
        })
      })

      document.getElementById("import-btn-cancel")?.addEventListener("click", () => {
        state.importItems = null
        state.importQuery = ""
        paintImportar()
      })

      document.getElementById("import-btn-confirm")?.addEventListener("click", async () => {
        const check = validatePreviewItems(state.importItems)
        if (!check.isValid) {
          showMessage("Corrija as peças com pendências antes de salvar.", "error")
          return
        }

        state.importIsSubmitting = true
        paintImportar()
        showMessage(IMPORT_LOADING_MESSAGE)

        const payload = buildImportPayloadFromPreview(state.importItems)
        const result = await importProducts(payload)

        state.importIsSubmitting = false
        if (!result.ok) {
          showMessage(formatImportErrorMessage(result.error, result.status), "error")
          paintImportar()
          return
        }

        const warning = formatImageFailuresWarning(result.data)
        state.importResult = { data: result.data, warning }
        state.importItems = null
        state.productsLoaded = false
        paintImportar()
        showMessage(formatImportSuccessMessage(result.data))
      })

      return
    }

    viewEl.innerHTML = renderImportUploadBlock()
    const fileInput = document.getElementById("fileInput")
    const dropZone = document.getElementById("dropZone")
    const fileNameEl = document.getElementById("fileName")

    const handleFile = async (file) => {
      if (!file) return
      if (fileNameEl) {
        fileNameEl.textContent = file.name
        fileNameEl.classList.add("has-file")
      }

      try {
        const text = await file.text()
        const parsed = parseImportFileContent(text)
        if (!parsed.ok) {
          showMessage(parsed.error, "error")
          if (fileNameEl) fileNameEl.textContent = "Nenhum arquivo selecionado"
          return
        }
        state.importItems = parsed.rows
        state.importQuery = ""
        state.importResult = null
        paintImportar()
      } catch {
        showMessage("Não foi possível ler o arquivo ou o JSON está inválido.", "error")
      }
    }

    fileInput?.addEventListener("change", () => {
      handleFile(fileInput.files?.[0])
    })

    dropZone?.addEventListener("dragover", (e) => {
      e.preventDefault()
      dropZone.classList.add("is-dragover")
    })
    dropZone?.addEventListener("dragleave", () => {
      dropZone.classList.remove("is-dragover")
    })
    dropZone?.addEventListener("drop", (e) => {
      e.preventDefault()
      dropZone.classList.remove("is-dragover")
      const file = e.dataTransfer?.files?.[0]
      if (file) handleFile(file)
    })
  }

  return {
    paintImportar,
  }
}
