// Coleções do painel.
export function installColecoesUi(deps) {
  const {
    fetchCollectionList,
    state,
    collectionDialog,
    renderCollectionEditDialog,
    slugify,
    filterProductsForPicker,
    renderCollectionPieceSuggestions,
    renderSelectedPieceChips,
    validateCollectionPayload,
    saveCollection,
    showMessage,
    viewEl,
    renderCollectionsPage,
    formatPrice,
    deleteCollection,
  } = deps

  async function loadCollections() {
    const result = await fetchCollectionList()
    if (result.ok && Array.isArray(result.data?.collections)) {
      state.collections = result.data.collections
      state.collectionsError = null
      return
    }
    state.collections = null
    state.collectionsError = result.error || "Não foi possível carregar as coleções."
    showMessage(state.collectionsError, "error")
  }

  function openCollectionEditDialog(collection) {
    if (!collectionDialog) return
    state.collectionEditing = collection
    state.collectionSelectedCodes = Array.isArray(collection?.product_codes)
      ? [...collection.product_codes]
      : []

    function bindDialogForm() {
      collectionDialog.innerHTML = renderCollectionEditDialog(
        state.collectionEditing,
        state.products || [],
        { selectedCodes: state.collectionSelectedCodes }
      )

      const form = collectionDialog.querySelector("#collection-form")
      const nameInput = collectionDialog.querySelector("#collection-name-input")
      const slugInput = collectionDialog.querySelector("#collection-slug-input")
      const pieceSearch = collectionDialog.querySelector("#collection-piece-search")
      const suggestionsEl = collectionDialog.querySelector("#collection-piece-suggestions")
      const chipsContainer = collectionDialog.querySelector("#collection-selected-pieces")
      const errorEl = collectionDialog.querySelector("#collection-form-error")
      const cancelBtn = collectionDialog.querySelector("#collection-cancel-btn")
      const closeX = collectionDialog.querySelector("#collection-close-x")

      const closeDialog = () => collectionDialog.close()
      cancelBtn?.addEventListener("click", closeDialog)
      closeX?.addEventListener("click", closeDialog)

      // Slug acompanha o nome enquanto estiver vazio ou ainda for o gerado automaticamente
      let lastAutoSlug = slugify(nameInput?.value || "")
      nameInput?.addEventListener("input", () => {
        if (!slugInput) return
        if (!slugInput.value || slugInput.value === lastAutoSlug) {
          lastAutoSlug = slugify(nameInput.value)
          slugInput.value = lastAutoSlug
        }
      })

      // Busca de peças no seletor
      pieceSearch?.addEventListener("input", () => {
        const term = pieceSearch.value.trim()
        if (!term) {
          if (suggestionsEl) {
            suggestionsEl.innerHTML = ""
            suggestionsEl.hidden = true
          }
          return
        }
        const matches = filterProductsForPicker(state.products || [], term, state.collectionSelectedCodes, 6)
        if (!matches.length) {
          if (suggestionsEl) {
            suggestionsEl.innerHTML = `<div class="collection-piece-suggestion-item"><span>Nenhuma peça encontrada</span></div>`
            suggestionsEl.hidden = false
          }
          return
        }
        suggestionsEl.innerHTML = renderCollectionPieceSuggestions(matches)
        suggestionsEl.hidden = false
      })

      // Adicionar peça das sugestões
      suggestionsEl?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-add-piece]")
        if (!btn) return
        const code = btn.getAttribute("data-add-piece")
        if (code && !state.collectionSelectedCodes.includes(code)) {
          state.collectionSelectedCodes.push(code)
          if (chipsContainer) {
            chipsContainer.innerHTML = renderSelectedPieceChips(state.collectionSelectedCodes, state.products || [])
          }
          pieceSearch.value = ""
          suggestionsEl.innerHTML = ""
          suggestionsEl.hidden = true
        }
      })

      // Remover peça dos chips selecionados
      chipsContainer?.addEventListener("click", (e) => {
        const removeBtn = e.target.closest("[data-remove-code]")
        if (!removeBtn) return
        const code = removeBtn.getAttribute("data-remove-code")
        state.collectionSelectedCodes = state.collectionSelectedCodes.filter((c) => c !== code)
        chipsContainer.innerHTML = renderSelectedPieceChips(state.collectionSelectedCodes, state.products || [])
      })

      // Submit
      form?.addEventListener("submit", async (e) => {
        e.preventDefault()
        if (errorEl) errorEl.hidden = true
        const fd = new FormData(form)
        const rawPayload = {
          id: fd.get("id") || null,
          name: fd.get("name"),
          slug: fd.get("slug"),
          description: fd.get("description"),
          badge_text: fd.get("badge_text"),
          max_price: fd.get("max_price"),
          sort_order: fd.get("sort_order"),
          starts_at: fd.get("starts_at"),
          ends_at: fd.get("ends_at"),
          is_active: fd.get("is_active") === "on",
          product_codes: state.collectionSelectedCodes,
        }
        const validated = validateCollectionPayload(rawPayload)
        if (!validated.ok) {
          if (errorEl) {
            errorEl.textContent = validated.error
            errorEl.hidden = false
          }
          return
        }

        const saveBtn = form.querySelector("#collection-save-btn")
        if (saveBtn) {
          saveBtn.disabled = true
          saveBtn.textContent = "Salvando..."
        }

        const res = await saveCollection(validated.data)
        if (!res.ok) {
          if (saveBtn) {
            saveBtn.disabled = false
            saveBtn.textContent = "Salvar Coleção"
          }
          if (errorEl) {
            errorEl.textContent = res.error || "Erro ao salvar coleção."
            errorEl.hidden = false
          }
          return
        }

        collectionDialog.close()
        showMessage(state.collectionEditing?.id ? "Coleção atualizada." : "Coleção criada com sucesso.")
        await loadCollections()
        paintColecoes()
      })
    }

    bindDialogForm()
    if (!collectionDialog.open) collectionDialog.showModal()
  }

  function paintColecoes() {
    if (state.collections == null) {
      viewEl.innerHTML = `<p class="empty">${state.collectionsError || "Não foi possível carregar as coleções."}</p>`
      return
    }
    viewEl.innerHTML = renderCollectionsPage(state.collections, {
      query: state.collectionQuery,
      formatMoney: formatPrice,
    })

    // Botões de nova coleção
    viewEl.querySelector("#btn-nova-colecao")?.addEventListener("click", () => openCollectionEditDialog(null))
    viewEl.querySelector("#btn-nova-colecao-empty")?.addEventListener("click", () => openCollectionEditDialog(null))

    // Busca de coleções
    const searchInput = viewEl.querySelector("#collection-search-input")
    searchInput?.addEventListener("input", () => {
      state.collectionQuery = searchInput.value
      paintColecoes()
      const newInput = viewEl.querySelector("#collection-search-input")
      if (newInput) {
        newInput.focus()
        newInput.setSelectionRange(newInput.value.length, newInput.value.length)
      }
    })

    // Editar coleção
    viewEl.querySelectorAll("[data-edit-collection]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-edit-collection"))
        const collection = (state.collections || []).find((c) => Number(c.id) === id)
        if (collection) openCollectionEditDialog(collection)
      })
    })

    // Excluir coleção
    viewEl.querySelectorAll("[data-delete-collection]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-delete-collection"))
        const collection = (state.collections || []).find((c) => Number(c.id) === id)
        if (!collection) return
        const ok = confirm(`Tem certeza que deseja excluir a coleção "${collection.name}"?`)
        if (!ok) return
        const res = await deleteCollection(id)
        if (res.ok) {
          showMessage(`Coleção "${collection.name}" excluída.`)
          await loadCollections()
          paintColecoes()
        } else {
          showMessage(res.error || "Erro ao excluir coleção.", "error")
        }
      })
    })
  }

  return {
    loadCollections,
    openCollectionEditDialog,
    paintColecoes,
  }
}
