// Estoque, lote e histórico do painel.
export function installEstoqueUi(deps) {
  const {
    outOfStockProducts,
    state,
    inStockProducts,
    viewEl,
    visibleStock,
    renderStockBatchBar,
    historyDialog,
    loadingHtml,
    fetchProductHistory,
    renderProductHistoryDialog,
    batchDialog,
    renderBatchArchiveDialog,
    batchProducts,
    loadProducts,
    showMessage,
    renderBatchQuantityDialog,
    renderBatchPriceDialog,
    renderStockList,
    formatPrice,
    renderStockPage,
    openPieceDialog,
    STOCK_PAGE_SIZE,
  } = deps

  function stockPool(mode) {
    return mode === "esgotadas" ? outOfStockProducts(state.products) : inStockProducts(state.products)
  }

  function updateStockBatchBar() {
    const root = document.getElementById("stock-batch-bar-root")
    if (!root) return
    const mode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
    const pool = stockPool(mode)
    const isStaleFilter = mode !== "esgotadas" && state.staleOnly
    const { rows } = visibleStock(pool, state.stockQuery, state.stockLimit, { staleOnly: isStaleFilter })

    root.innerHTML = renderStockBatchBar(state.selectedStockCodes.size, rows.length)

    root.querySelector("#stock-batch-clear")?.addEventListener("click", () => {
      state.selectedStockCodes.clear()
      viewEl.querySelectorAll("[data-stock-select]").forEach((chk) => {
        chk.checked = false
        chk.closest(".stock-item-wrap")?.classList.remove("is-selected")
      })
      updateStockBatchBar()
    })

    root.querySelector("#stock-batch-select-all")?.addEventListener("click", () => {
      for (const row of rows) {
        if (row.code) state.selectedStockCodes.add(row.code)
      }
      viewEl.querySelectorAll("[data-stock-select]").forEach((chk) => {
        chk.checked = true
        chk.closest(".stock-item-wrap")?.classList.add("is-selected")
      })
      updateStockBatchBar()
    })

    root.querySelector("#stock-batch-archive-btn")?.addEventListener("click", () => {
      openBatchArchiveDialog()
    })

    root.querySelector("#stock-batch-quantity-btn")?.addEventListener("click", () => {
      openBatchQuantityDialog()
    })

    root.querySelector("#stock-batch-price-btn")?.addEventListener("click", () => {
      openBatchPriceDialog()
    })

    root.querySelector("#stock-batch-promo-btn")?.addEventListener("click", () => {
      openBatchPromo()
    })
  }

  async function openHistoryDialog(code = null) {
    if (!historyDialog) return
    const piece = code ? (state.products || []).find((p) => p.code === code) : null
    const productName = piece ? piece.name : null

    historyDialog.innerHTML = `<div class="history-dialog-inner"><div class="history-dialog-header"><h2>Carregando histórico…</h2><button type="button" class="btn-ghost" id="history-close-btn">✕</button></div><div class="history-dialog-content">${loadingHtml({ size: "md" })}</div></div>`
    if (!historyDialog.open) historyDialog.showModal()
    historyDialog.querySelector("#history-close-btn")?.addEventListener("click", () => historyDialog.close())

    const query = code ? { code, limit: 50 } : { limit: 50 }
    const res = await fetchProductHistory(query)
    if (!res.ok) {
      historyDialog.innerHTML = `<div class="history-dialog-inner">
        <div class="history-dialog-header"><h2>Histórico de Estoque</h2><button type="button" class="btn-ghost" id="history-close-btn">✕</button></div>
        <p class="empty">${res.error || "Não foi possível carregar o histórico."}</p>
      </div>`
      historyDialog.querySelector("#history-close-btn")?.addEventListener("click", () => historyDialog.close())
      return
    }

    historyDialog.innerHTML = renderProductHistoryDialog({
      code,
      events: res.events || [],
      productName
    })

    historyDialog.querySelector("#history-close-btn")?.addEventListener("click", () => historyDialog.close())
    historyDialog.querySelector("#history-close-bottom-btn")?.addEventListener("click", () => historyDialog.close())
  }

  function openBatchArchiveDialog() {
    if (!batchDialog || state.selectedStockCodes.size === 0) return
    const codes = Array.from(state.selectedStockCodes)
    batchDialog.innerHTML = renderBatchArchiveDialog(codes.length, codes)
    if (!batchDialog.open) batchDialog.showModal()

    batchDialog.querySelector("#batch-dialog-cancel")?.addEventListener("click", () => batchDialog.close())
    batchDialog.querySelector("#batch-archive-confirm")?.addEventListener("click", async () => {
      const btn = batchDialog.querySelector("#batch-archive-confirm")
      if (btn) {
        btn.disabled = true
        btn.textContent = "Arquivando…"
      }
      const res = await batchProducts({ action: "archive", codes })
      if (res.ok) {
        batchDialog.close()
        const count = res.count || codes.length
        state.selectedStockCodes.clear()
        state.productsLoaded = false
        await loadProducts()
        const mode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
        paintStock(mode)
        showMessage(`${count} ${count === 1 ? "peça arquivada" : "peças arquivadas"} com sucesso.`)
      } else {
        if (btn) {
          btn.disabled = false
          btn.textContent = "Confirmar arquivamento"
        }
        showMessage(res.error || "Erro ao arquivar peças em lote.", "error")
      }
    })
  }

  function openBatchQuantityDialog() {
    if (!batchDialog || state.selectedStockCodes.size === 0) return
    const codes = Array.from(state.selectedStockCodes)
    batchDialog.innerHTML = renderBatchQuantityDialog(codes.length)
    if (!batchDialog.open) batchDialog.showModal()

    const form = batchDialog.querySelector("#batch-quantity-form")
    const input = batchDialog.querySelector("#batch-quantity-input")
    const label = batchDialog.querySelector("#batch-quantity-label")
    const radios = batchDialog.querySelectorAll("input[name='quantity_mode']")

    function updateMode() {
      const checked = batchDialog.querySelector("input[name='quantity_mode']:checked")?.value || "set"
      if (checked === "set") {
        label.textContent = "Nova quantidade fixa"
        input.min = "0"
        input.placeholder = "Ex: 1"
      } else {
        label.textContent = "Quantidade a somar ou subtrair"
        input.removeAttribute("min")
        input.placeholder = "Ex: 1 ou -1"
      }
    }

    radios.forEach((r) => r.addEventListener("change", updateMode))

    batchDialog.querySelectorAll(".batch-qty-shortcut").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.qtyMode
        const val = btn.dataset.qtyVal
        const radio = batchDialog.querySelector(`input[name='quantity_mode'][value='${mode}']`)
        if (radio) radio.checked = true
        updateMode()
        if (input) input.value = val
      })
    })

    batchDialog.querySelector("#batch-dialog-cancel")?.addEventListener("click", () => batchDialog.close())

    form?.addEventListener("submit", async (e) => {
      e.preventDefault()
      const mode = batchDialog.querySelector("input[name='quantity_mode']:checked")?.value || "set"
      const val = Number(input.value)
      if (!Number.isInteger(val)) {
        showMessage("Informe um número inteiro.", "error")
        return
      }
      const submitBtn = batchDialog.querySelector("#batch-quantity-submit")
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = "Aplicando…"
      }

      const res = await batchProducts({
        action: "quantity",
        codes,
        value: val,
        quantity_mode: mode
      })

      if (res.ok) {
        batchDialog.close()
        const count = res.count || codes.length
        state.selectedStockCodes.clear()
        state.productsLoaded = false
        await loadProducts()
        const currentMode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
        paintStock(currentMode)
        showMessage(`Estoque atualizado de ${count} ${count === 1 ? "peça" : "peças"}.`)
      } else {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = "Aplicar ajuste"
        }
        showMessage(res.error || "Erro ao ajustar estoque em lote.", "error")
      }
    })
  }

  function openBatchPriceDialog() {
    if (!batchDialog || state.selectedStockCodes.size === 0) return
    const codes = Array.from(state.selectedStockCodes)
    batchDialog.innerHTML = renderBatchPriceDialog(codes.length)
    if (!batchDialog.open) batchDialog.showModal()

    const form = batchDialog.querySelector("#batch-price-form")
    const input = batchDialog.querySelector("#batch-price-input")
    const label = batchDialog.querySelector("#batch-price-label")
    const radios = batchDialog.querySelectorAll("input[name='price_mode']")

    function updateMode() {
      const checked = batchDialog.querySelector("input[name='price_mode']:checked")?.value || "percent"
      if (checked === "percent") {
        label.textContent = "Variação percentual (%)"
        input.placeholder = "Ex: 10 para +10%, ou -5 para desconto"
      } else {
        label.textContent = "Novo preço fixo (R$)"
        input.placeholder = "Ex: 49,90"
      }
    }

    radios.forEach((r) => r.addEventListener("change", updateMode))

    batchDialog.querySelectorAll(".batch-price-shortcut").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.priceMode
        const val = btn.dataset.priceVal
        const radio = batchDialog.querySelector(`input[name='price_mode'][value='${mode}']`)
        if (radio) radio.checked = true
        updateMode()
        if (input) input.value = val
      })
    })

    batchDialog.querySelector("#batch-dialog-cancel")?.addEventListener("click", () => batchDialog.close())

    form?.addEventListener("submit", async (e) => {
      e.preventDefault()
      const mode = batchDialog.querySelector("input[name='price_mode']:checked")?.value || "percent"
      const rawVal = input.value.replace(",", ".")
      const num = Number(rawVal)
      if (!Number.isFinite(num)) {
        showMessage("Informe um valor numérico válido.", "error")
        return
      }

      const submitBtn = batchDialog.querySelector("#batch-price-submit")
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.textContent = "Aplicando…"
      }

      const payload = mode === "percent"
        ? { action: "price_percent", codes, delta_percent: num }
        : { action: "price_fixed", codes, value: num }

      const res = await batchProducts(payload)

      if (res.ok) {
        batchDialog.close()
        const count = res.count || codes.length
        state.selectedStockCodes.clear()
        state.productsLoaded = false
        await loadProducts()
        const currentMode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
        paintStock(currentMode)
        showMessage(`Preço atualizado de ${count} ${count === 1 ? "peça" : "peças"}.`)
      } else {
        if (submitBtn) {
          submitBtn.disabled = false
          submitBtn.textContent = "Aplicar reajuste"
        }
        showMessage(res.error || "Erro ao reajustar preço em lote.", "error")
      }
    })
  }

  function openBatchPromo() {
    if (state.selectedStockCodes.size === 0) return
    const codes = Array.from(state.selectedStockCodes)
    deps.openPromoEditDialog({
      scope: "produto",
      product_codes: codes
    })
  }

  function paintStock(mode = "estoque") {
    const pool = stockPool(mode)
    const isStaleFilter = mode !== "esgotadas" && state.staleOnly
    const { rows, total } = visibleStock(pool, state.stockQuery, state.stockLimit, { staleOnly: isStaleFilter })
    const empty = mode === "esgotadas"
      ? (state.stockQuery.trim() ? "Nenhuma esgotada com esse nome." : "Nenhuma peça esgotada.")
      : (isStaleFilter
        ? (state.stockQuery.trim() ? "Nenhuma peça parada (+60d) com esse nome." : "Nenhuma peça parada (+60d) no estoque.")
        : (state.stockQuery.trim() ? "Nenhuma peça com esse nome." : "Nenhuma peça no estoque."))
    const listHtml = rows.length
      ? renderStockList(rows, formatPrice, { empty, selectedCodes: state.selectedStockCodes })
      : `<p class="empty">${empty}</p>`
    const list = document.getElementById("stock-list")
    if (!list || viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") !== mode) {
      viewEl.innerHTML = renderStockPage({
        rows,
        total,
        query: state.stockQuery,
        mode,
        typeBlock: "",
        staleOnly: state.staleOnly,
        selectedCodes: state.selectedStockCodes
      })
      const fresh = document.getElementById("stock-list")
      if (fresh) fresh.innerHTML = listHtml
      bindStockCards()
      updateStockBatchBar()
      return
    }
    list.innerHTML = listHtml
    bindStockCards()
    updateStockBatchBar()
    const meta = document.getElementById("stock-meta")
    if (meta) meta.textContent = total ? `${rows.length} de ${total}` : ""
    const more = document.getElementById("stock-more")
    if (total > rows.length) {
      if (!more) {
        const button = document.createElement("button")
        button.id = "stock-more"
        button.type = "button"
        button.className = "btn-ghost"
        button.textContent = mode === "esgotadas" ? "Mais esgotadas" : "Mais peças"
        viewEl.appendChild(button)
      }
    } else if (more) {
      more.remove()
    }
  }

  function bindStockCards() {
    viewEl.querySelectorAll(".entity-card[data-product-code]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        if (event.target.closest("[data-promo-shortcut]")) return
        if (event.target.closest("[data-history-code]")) return
        if (event.target.closest("[data-stock-select]")) return
        const code = btn.getAttribute("data-product-code")
        const piece = (state.products || []).find((row) => String(row.code) === String(code))
        openPieceDialog(piece)
      })
    })

    viewEl.querySelectorAll("[data-history-code]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation()
        const code = btn.getAttribute("data-history-code")
        openHistoryDialog(code)
      })
    })

    viewEl.querySelectorAll("[data-stock-select]").forEach((chk) => {
      chk.addEventListener("change", (event) => {
        event.stopPropagation()
        const code = chk.getAttribute("data-stock-select")
        if (chk.checked) {
          state.selectedStockCodes.add(code)
        } else {
          state.selectedStockCodes.delete(code)
        }
        chk.closest(".stock-item-wrap")?.classList.toggle("is-selected", chk.checked)
        updateStockBatchBar()
      })
    })
  }

  function bindStockOnce() {
    if (viewEl.dataset.stockBound === "1") return
    viewEl.dataset.stockBound = "1"
    viewEl.addEventListener("input", (event) => {
      if (event.target.id !== "stock-query") return
      state.stockQuery = event.target.value
      state.stockLimit = STOCK_PAGE_SIZE
      const mode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
      paintStock(mode)
    })
    viewEl.addEventListener("click", (event) => {
      if (event.target.closest("#stock-general-history-btn")) {
        openHistoryDialog(null)
        return
      }
      const filterBtn = event.target.closest("[data-stock-filter]")
      if (filterBtn) {
        const filter = filterBtn.getAttribute("data-stock-filter")
        state.staleOnly = filter === "stale"
        state.stockLimit = STOCK_PAGE_SIZE
        const mode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
        paintStock(mode)
        return
      }
      if (event.target.id !== "stock-more") return
      state.stockLimit += STOCK_PAGE_SIZE
      const mode = viewEl.querySelector("[data-stock-mode]")?.getAttribute("data-stock-mode") || "estoque"
      paintStock(mode)
    })
    viewEl.addEventListener("submit", (event) => {
      if (event.target.id === "stock-search") event.preventDefault()
    })
  }

  return {
    stockPool,
    updateStockBatchBar,
    openHistoryDialog,
    openBatchArchiveDialog,
    openBatchQuantityDialog,
    openBatchPriceDialog,
    openBatchPromo,
    paintStock,
    bindStockCards,
    bindStockOnce,
  }
}
