// Busca e filtros do catálogo.
export function installFiltrosUi(deps) {
  const {
    catalogSearchSuggestionsEl,
    getSearchSuggestions,
    estado,
    renderSearchSuggestionsHtml,
    catalogSearchClearBtn,
    catalogSearchInput,
    colorFiltersEl,
    COLOR_FILTERS,
    parsePriceBound,
    minPriceInput,
    maxPriceInput,
    onlyAvailableInput,
    filterOnlyFavoritesInput,
    filterOnSaleInput,
    priceRangePresetsEl,
    countActiveFilters,
    catalogFiltersCountEl,
    catalogActiveFiltersBar,
    catalogActivePills,
    getActiveFilterPills,
    escapeHtml,
    catalogDrawer,
  } = deps

  function renderSearchSuggestions() {
    if (!catalogSearchSuggestionsEl) return
    const query = deps.getSearchTerm()
    const suggestions = getSearchSuggestions(estado.allGroups, query, 6)
    if (!suggestions.length) {
      catalogSearchSuggestionsEl.hidden = true
      catalogSearchSuggestionsEl.innerHTML = ""
      return
    }

    catalogSearchSuggestionsEl.innerHTML = renderSearchSuggestionsHtml(suggestions, query)
    catalogSearchSuggestionsEl.hidden = false
  }

  function closeSearchSuggestions() {
    if (catalogSearchSuggestionsEl) catalogSearchSuggestionsEl.hidden = true
  }

  function syncSearchClearButton() {
    if (catalogSearchClearBtn) catalogSearchClearBtn.hidden = !catalogSearchInput?.value
  }

  function renderColorFilters() {
    if (!colorFiltersEl) return
    const options = [{ id: "", label: "Todas as cores" }, ...COLOR_FILTERS]
    colorFiltersEl.innerHTML = options.map((item) => {
      const selected = item.id === estado.colorId
      return `<button type="button" class="catalog-filter${selected ? " is-selected" : ""}" data-color-filter="${item.id}" aria-pressed="${selected ? "true" : "false"}">${item.label}</button>`
    }).join("")
  }

  function readDrawerFilters() {
    estado.minPrice = parsePriceBound(minPriceInput?.value)
    estado.maxPrice = parsePriceBound(maxPriceInput?.value)
    estado.onlyAvailable = Boolean(onlyAvailableInput?.checked)
    estado.onlyFavorites = Boolean(filterOnlyFavoritesInput?.checked)
    estado.onSaleOnly = Boolean(filterOnSaleInput?.checked)
  }

  function syncDrawerInputs() {
    if (minPriceInput) minPriceInput.value = estado.minPrice != null ? String(estado.minPrice).replace(".", ",") : ""
    if (maxPriceInput) maxPriceInput.value = estado.maxPrice != null ? String(estado.maxPrice).replace(".", ",") : ""
    if (onlyAvailableInput) onlyAvailableInput.checked = Boolean(estado.onlyAvailable)
    if (filterOnlyFavoritesInput) filterOnlyFavoritesInput.checked = Boolean(estado.onlyFavorites)
    if (filterOnSaleInput) filterOnSaleInput.checked = Boolean(estado.onSaleOnly)

    if (priceRangePresetsEl) {
      priceRangePresetsEl.querySelectorAll(".price-preset-chip").forEach((chip) => {
        const pMin = chip.getAttribute("data-min") ? Number(chip.getAttribute("data-min")) : null
        const pMax = chip.getAttribute("data-max") ? Number(chip.getAttribute("data-max")) : null
        const isActive = estado.minPrice === pMin && estado.maxPrice === pMax
        chip.classList.toggle("is-active", isActive)
        chip.setAttribute("aria-pressed", isActive ? "true" : "false")
      })
    }
  }

  function renderActiveFilters() {
    const filters = deps.activeFilters()
    const count = countActiveFilters(filters)

    if (catalogFiltersCountEl) {
      catalogFiltersCountEl.textContent = String(count)
      catalogFiltersCountEl.hidden = count === 0
    }

    if (!catalogActiveFiltersBar || !catalogActivePills) return

    const pills = getActiveFilterPills(filters)
    if (!pills.length) {
      catalogActiveFiltersBar.hidden = true
      catalogActivePills.innerHTML = ""
      return
    }

    catalogActivePills.innerHTML = pills.map((p) => `
      <button type="button" class="catalog-active-pill" data-pill-type="${escapeHtml(p.type)}" aria-label="Remover filtro ${escapeHtml(p.label)}">
        <span>${escapeHtml(p.label)}</span>
        <span class="pill-remove" aria-hidden="true">×</span>
      </button>
    `).join("")
    catalogActiveFiltersBar.hidden = false
  }

  function clearAllFilters() {
    estado.selectedCategory = "Todos"
    estado.selectedCollectionSlug = ""
    estado.colorId = ""
    estado.minPrice = null
    estado.maxPrice = null
    estado.onlyAvailable = false
    estado.onlyFavorites = false
    estado.onSaleOnly = false
    if (catalogSearchInput) {
      catalogSearchInput.value = ""
      syncSearchClearButton()
    }
    syncDrawerInputs()
    renderColorFilters()
    deps.syncCollectionPressed()
    refreshAfterFilterChange()
  }

  function setDrawerOpen(open) {
    catalogDrawer?.classList.toggle("is-open", Boolean(open))
  }

  function refreshAfterFilterChange() {
    if (estado.pieceGroupKey) deps.closePiecePage()
    else {
      deps.syncCatalogUrl()
      deps.renderCatalogGrids()
    }
  }

  return {
    renderSearchSuggestions,
    closeSearchSuggestions,
    syncSearchClearButton,
    renderColorFilters,
    readDrawerFilters,
    syncDrawerInputs,
    renderActiveFilters,
    clearAllFilters,
    setDrawerOpen,
    refreshAfterFilterChange,
  }
}
