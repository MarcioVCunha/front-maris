// Início, vendas, vendedoras e compras do painel.
export function installHomeUi(deps) {
  const {
    currentMonthKey,
    state,
    fetchMonthOverview,
    normalizeOverview,
    viewEl,
    viewLoading,
    fetchRecentSales,
    normalizeRecentSales,
    saleDialog,
    shouldShowSaleEdit,
    ADMIN_SALE_EDIT_ENABLED,
    readSaleEditForm,
    saleUpdatePayload,
    showMessage,
    updateAdminSale,
    showView,
    markAdminSalePaid,
    saleMarkPaidPayload,
    commitPendingSaleCancel,
    saleCancelBox,
    undoCancelSale,
    renderSaleEditDialog,
    formatPrice,
    fetchAdminSale,
    normalizeAdminSale,
    renderInicio,
    renderSaleCards,
    stepMonth,
    setMonthlyGoal,
    triggerWeeklySummaryEmail,
    generateSalesCsv,
    downloadCsvFile,
    renderVendas,
    filterSalesByStatus,
    renderVendedoras,
    filterSalesBySeller,
    fetchSellersMonth,
    normalizeSellersMonth,
    sellersFromDirectory,
    renderCompras,
    fetchPurchasesOverview,
    dialog,
    escapeHtml,
  } = deps

  async function loadOverview() {
    const currentMonth = currentMonthKey()
    const targetMonth = state.selectedMonth || new URLSearchParams(location.search).get("month") || currentMonth
    if (state.overview !== undefined && state.overview?.month === targetMonth) return state.overview
    const result = await fetchMonthOverview({ month: targetMonth })
    state.overview = result.ok ? normalizeOverview(result.data) : null
    state.selectedMonth = targetMonth
    return state.overview
  }

  async function changeInicioMonth(nextMonth) {
    const currentMonth = currentMonthKey()
    const target = (nextMonth || currentMonth).trim()
    state.selectedMonth = target
    state.overview = undefined
    const url = new URL(location.href)
    if (target === currentMonth) {
      url.searchParams.delete("month")
    } else {
      url.searchParams.set("month", target)
    }
    const next = `${url.pathname}${url.search}`
    if (next !== `${location.pathname}${location.search}`) {
      history.pushState(null, "", next)
    }
    viewEl.innerHTML = viewLoading()
    await loadOverview()
    paintInicio()
  }

  let recentRequest = 0

  async function loadRecent(status = "all") {
    const normalized = status || "all"
    const requestId = ++recentRequest
    if (state.recent !== undefined && state.loadedStatus === normalized) return state.recent
    const queryStatus = normalized === "all" ? undefined : normalized
    const result = await fetchRecentSales({ limit: 50, status: queryStatus })
    if (requestId !== recentRequest) return state.recent
    state.recent = result.ok ? normalizeRecentSales(result.data) : null
    state.loadedStatus = normalized
    return state.recent
  }

  function markSaleStatusActive(status) {
    viewEl.querySelectorAll(".status-filter-btn[data-status]").forEach((chip) => {
      const on = (chip.getAttribute("data-status") || "all") === status
      chip.classList.toggle("status-filter-btn--active", on)
      chip.setAttribute("aria-selected", on ? "true" : "false")
    })
  }

  function showSalesResultsLoading() {
    const slot = viewEl.querySelector("#sales-results")
    if (!slot) return
    slot.setAttribute("aria-busy", "true")
    slot.innerHTML = `<div class="sales-results-loading" role="status" aria-label="Carregando vendas">
      <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
      <div class="maris-skeleton-admin__row maris-skeleton-shimmer"></div>
    </div>`
  }

  function bindSaleEditActions(sale) {
    saleDialog.querySelector("#sale-edit-close")?.addEventListener("click", () => saleDialog.close())
    if (!shouldShowSaleEdit(ADMIN_SALE_EDIT_ENABLED)) return

    saleDialog.querySelector("#sale-edit-save")?.addEventListener("click", async () => {
      const form = readSaleEditForm(saleDialog.querySelector(".sale-edit"))
      const body = saleUpdatePayload(sale.id, form)
      showMessage("Salvando…")
      const result = await updateAdminSale(body)
      if (!result.ok) {
        showMessage(result.error, "error")
        return
      }
      state.recent = undefined
      state.overview = undefined
      saleDialog.close()
      showMessage("Venda salva.")
      showView()
    })

    saleDialog.querySelector("#sale-edit-paid")?.addEventListener("click", async () => {
      showMessage("Marcando como paga…")
      const result = await markAdminSalePaid(saleMarkPaidPayload(sale.id))
      if (!result.ok) {
        showMessage(result.error, "error")
        return
      }
      state.recent = undefined
      state.overview = undefined
      saleDialog.close()
      showMessage("Venda marcada como paga.")
      showView()
    })

    saleDialog.querySelector("#sale-edit-cancel")?.addEventListener("click", async () => {
      if (!window.confirm("Cancelar esta venda e devolver o estoque?")) return
      await commitPendingSaleCancel()
      const orderId = sale.id
      const previousRecent = state.recent
      saleCancelBox.pending = { orderId, previousRecent }
      saleDialog.close()
      if (Array.isArray(state.recent)) {
        state.recent = state.recent.filter((s) => s.id !== orderId)
      }
      showView()
      showMessage("Venda cancelada.", "", {
        undo: {
          label: "Desfazer",
          ms: 8000,
          run: () => undoCancelSale()
        }
      })
    })
  }

  async function openSaleDialog(sale) {
    if (!saleDialog || !sale) return
    let detail = sale
    saleDialog.innerHTML = renderSaleEditDialog(detail, formatPrice, { enabled: ADMIN_SALE_EDIT_ENABLED })
    if (!saleDialog.open) saleDialog.showModal()
    bindSaleEditActions(detail)

    if (shouldShowSaleEdit(ADMIN_SALE_EDIT_ENABLED)) {
      const loaded = await fetchAdminSale({ orderId: sale.id })
      if (loaded.ok) {
        const normalized = normalizeAdminSale(loaded.data)
        if (normalized) {
          detail = normalized
          saleDialog.innerHTML = renderSaleEditDialog(detail, formatPrice, { enabled: true })
          bindSaleEditActions(detail)
        }
      }
    }
  }

  function paintInicio() {
    viewEl.classList.add("view--inicio")
    viewEl.innerHTML = renderInicio(state.overview, formatPrice, {
      selectedChannel: state.selectedChannel,
      sales: state.recent || [],
      renderSales: (rows, formatMoney) => renderSaleCards(rows, formatMoney, { clickable: true })
    })
    bindInicio()
  }

  function bindSaleCards() {
    viewEl.querySelectorAll(".sale-card[data-sale-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-sale-id")
        const sale = (state.recent || []).find((row) => String(row.id) === String(id))
        openSaleDialog(sale)
      })
    })
  }

  function bindInicio() {
    const monthInput = viewEl.querySelector("#inicio-month-input")
    const currentMonthVal = state.overview?.month || state.selectedMonth || currentMonthKey()

    viewEl.querySelector("#btn-prev-month")?.addEventListener("click", () => {
      changeInicioMonth(stepMonth(currentMonthVal, -1))
    })
    viewEl.querySelector("#btn-next-month")?.addEventListener("click", () => {
      changeInicioMonth(stepMonth(currentMonthVal, 1))
    })
    viewEl.querySelector("#btn-current-month")?.addEventListener("click", () => {
      changeInicioMonth(currentMonthKey())
    })
    monthInput?.addEventListener("change", (e) => {
      const val = e.target.value
      if (val && /^\d{4}-\d{2}$/.test(val)) {
        changeInicioMonth(val)
      }
    })

    viewEl.querySelectorAll("[data-origin]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const channel = btn.getAttribute("data-origin")
        state.selectedChannel = state.selectedChannel === channel ? null : channel
        paintInicio()
      })
    })
    viewEl.querySelector("#btn-edit-goal")?.addEventListener("click", async () => {
      const currentGoal = state.overview?.sales_goal || 10000
      const input = window.prompt("Defina a meta de vendas do mês (R$):", String(currentGoal))
      if (!input) return
      const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
      const newGoal = Number(cleaned)
      if (!Number.isFinite(newGoal) || newGoal <= 0) {
        showMessage("Valor inválido para a meta.", "error")
        return
      }
      showMessage("Salvando nova meta…")
      const res = await setMonthlyGoal(newGoal)
      if (state.overview) state.overview.sales_goal = res.ok && res.sales_goal ? res.sales_goal : newGoal
      showMessage(res.ok ? "Meta mensal atualizada!" : "Meta atualizada no painel.")
      paintInicio()
    })
    viewEl.querySelector("#btn-send-weekly-summary")?.addEventListener("click", async () => {
      showMessage("Enviando resumo semanal para seu e-mail…")
      const res = await triggerWeeklySummaryEmail({ days: 7 })
      if (res.ok) {
        showMessage(res.data?.message || "Resumo semanal enviado por e-mail com sucesso!")
      } else {
        showMessage(res.error || "Não foi possível enviar o resumo.", "error")
      }
    })
    viewEl.querySelector("#btn-export-sales-csv")?.addEventListener("click", () => {
      const csv = generateSalesCsv(state.recent || [])
      const month = state.overview?.month || new Date().toISOString().slice(0, 7)
      downloadCsvFile(csv, `vendas-maris-${month}.csv`)
      showMessage("Planilha de vendas exportada com sucesso.")
    })
    bindSaleCards()
  }

  function paintVendas() {
    viewEl.classList.remove("view--inicio")
    viewEl.innerHTML = renderVendas(state.recent, formatPrice, {
      selectedStatus: state.selectedSaleStatus || "all",
      filterSales: filterSalesByStatus,
      renderSales: (rows, formatMoney) => renderSaleCards(rows, formatMoney, {
        clickable: true,
        empty: "Nenhuma venda recente."
      })
    })
    bindSaleCards()
    viewEl.querySelector("#btn-export-sales-vendas")?.addEventListener("click", () => {
      const csv = generateSalesCsv(state.recent || [])
      const month = state.overview?.month || new Date().toISOString().slice(0, 7)
      downloadCsvFile(csv, `vendas-maris-${month}.csv`)
      showMessage("Planilha de vendas exportada com sucesso.")
    })
    viewEl.querySelectorAll(".status-filter-btn[data-status]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetStatus = btn.getAttribute("data-status") || "all"
        if (state.selectedSaleStatus === targetStatus && state.loadedStatus === targetStatus && !viewEl.querySelector(".sales-results-loading")) return
        state.selectedSaleStatus = targetStatus
        markSaleStatusActive(targetStatus)
        const cached = state.recent !== undefined && state.loadedStatus === targetStatus
        if (!cached) showSalesResultsLoading()
        await loadRecent(targetStatus)
        if (state.selectedSaleStatus !== targetStatus || state.loadedStatus !== targetStatus) return
        paintVendas()
      })
    })
  }

  function paintVendedoras() {
    viewEl.classList.remove("view--inicio")
    const currentMonth = currentMonthKey()
    const activeMonth = state.selectedMonth || (state.sellers && state.sellers.month) || currentMonth
    viewEl.innerHTML = renderVendedoras(state.sellers, formatPrice, {
      month: activeMonth,
      selectedSellerId: state.selectedSellerId,
      sales: state.recent || [],
      filterSales: filterSalesBySeller,
      renderSales: (rows, formatMoney) => renderSaleCards(rows, formatMoney, {
        clickable: true,
        empty: "Nenhuma venda desta vendedora."
      })
    })

    // Controles de navegação de período no topo de vendedoras
    const monthInput = viewEl.querySelector("#inicio-month-input")
    viewEl.querySelector("#btn-prev-month")?.addEventListener("click", () => {
      changeVendedorasMonth(stepMonth(activeMonth, -1))
    })
    viewEl.querySelector("#btn-next-month")?.addEventListener("click", () => {
      changeVendedorasMonth(stepMonth(activeMonth, 1))
    })
    viewEl.querySelector("#btn-current-month")?.addEventListener("click", () => {
      changeVendedorasMonth(currentMonthKey())
    })
    monthInput?.addEventListener("change", (e) => {
      const val = e.target.value
      if (val && /^\d{4}-\d{2}$/.test(val)) {
        changeVendedorasMonth(val)
      }
    })

    viewEl.querySelectorAll(".seller-card[data-seller-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-seller-id")
        state.selectedSellerId = state.selectedSellerId != null && String(state.selectedSellerId) === String(id)
          ? null
          : id
        paintVendedoras()
      })
    })
    bindSaleCards()
  }

  async function changeVendedorasMonth(nextMonth) {
    const currentMonth = currentMonthKey()
    const target = (nextMonth || currentMonth).trim()
    state.selectedMonth = target
    state.sellers = undefined
    state.sellersMonth = undefined
    const url = new URL(location.href)
    if (target === currentMonth) {
      url.searchParams.delete("month")
    } else {
      url.searchParams.set("month", target)
    }
    history.replaceState(null, "", url.toString())
    showMessage("Carregando vendedoras de " + formatMonthLabel(target) + "…")
    await loadSellers(target)
    paintVendedoras()
  }

  async function loadSellers(monthParam) {
    const urlParam = new URLSearchParams(location.search).get("month")
    const targetMonth = monthParam || state.selectedMonth || (urlParam && /^\d{4}-\d{2}$/.test(urlParam) ? urlParam : currentMonthKey())
    if (state.sellers !== undefined && state.sellersMonth === targetMonth) return state.sellers
    const result = await fetchSellersMonth({ month: targetMonth })
    if (result.ok) {
      state.sellers = normalizeSellersMonth(result.data)
      state.sellersMonth = targetMonth
      return state.sellers
    }
    const listed = await window.MarisStaffData?.listActiveSellers?.()
    state.sellers = listed && !listed.error ? sellersFromDirectory(listed.data) : null
    state.sellersMonth = targetMonth
    return state.sellers
  }

  function paintCompras() {
    viewEl.classList.remove("view--inicio")
    const currentMonth = currentMonthKey()
    const activeMonth = state.selectedMonth || (state.purchases && state.purchases.month) || currentMonth
    viewEl.innerHTML = renderCompras(state.purchases, formatPrice, {
      month: activeMonth
    })

    // Controles de navegação de período no topo de compras
    const monthInput = viewEl.querySelector("#inicio-month-input")
    viewEl.querySelector("#btn-prev-month")?.addEventListener("click", () => {
      changeComprasMonth(stepMonth(activeMonth, -1))
    })
    viewEl.querySelector("#btn-next-month")?.addEventListener("click", () => {
      changeComprasMonth(stepMonth(activeMonth, 1))
    })
    viewEl.querySelector("#btn-current-month")?.addEventListener("click", () => {
      changeComprasMonth(currentMonthKey())
    })
    monthInput?.addEventListener("change", (e) => {
      const val = e.target.value
      if (val && /^\d{4}-\d{2}$/.test(val)) {
        changeComprasMonth(val)
      }
    })

    // Diálogo de contatos da lista de espera
    viewEl.querySelectorAll("[data-view-contacts]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-view-contacts")
        const item = (state.purchases?.restock_requests || []).find((r) => String(r.code) === String(code))
        openComprasContactsDialog(item)
      })
    })
  }

  async function changeComprasMonth(nextMonth) {
    const currentMonth = currentMonthKey()
    const target = (nextMonth || currentMonth).trim()
    state.selectedMonth = target
    state.purchases = undefined
    state.purchasesMonth = undefined
    const url = new URL(location.href)
    if (target === currentMonth) {
      url.searchParams.delete("month")
    } else {
      url.searchParams.set("month", target)
    }
    history.replaceState(null, "", url.toString())
    showMessage("Carregando compras de " + formatMonthLabel(target) + "…")
    await loadPurchases(target)
    paintCompras()
  }

  async function loadPurchases(monthParam) {
    const urlParam = new URLSearchParams(location.search).get("month")
    const targetMonth = monthParam || state.selectedMonth || (urlParam && /^\d{4}-\d{2}$/.test(urlParam) ? urlParam : currentMonthKey())
    if (state.purchases !== undefined && state.purchasesMonth === targetMonth) return state.purchases
    const result = await fetchPurchasesOverview({ month: targetMonth })
    if (result.ok) {
      state.purchases = result.data || {}
      state.purchasesMonth = targetMonth
      return state.purchases
    }
    state.purchases = null
    state.purchasesMonth = targetMonth
    return null
  }

  function openComprasContactsDialog(item) {
    if (!item) return
    let dialog = document.getElementById("compras-contacts-dialog")
    if (!dialog) {
      dialog = document.createElement("dialog")
      dialog.id = "compras-contacts-dialog"
      dialog.className = "admin-dialog compras-contacts-dialog"
      document.body.appendChild(dialog)
    }
    const contacts = Array.isArray(item.contacts) ? item.contacts : []
    const contactsHtml = contacts.length === 0
      ? `<p class="empty">Nenhum dado de contato registrado para esta peça.</p>`
      : `<ul class="compras-contacts-list">${contacts.map((c) => {
          const telDigits = String(c.buyer_whatsapp || "").replace(/\D/g, "")
          const waLink = telDigits ? `<a href="https://wa.me/55${telDigits}" target="_blank" rel="noopener" class="btn-xs btn-whatsapp">💬 WhatsApp: ${escapeHtml(c.buyer_whatsapp)}</a>` : ""
          const emailLink = c.buyer_email ? `<a href="mailto:${escapeHtml(c.buyer_email)}" class="btn-xs btn-email">✉️ ${escapeHtml(c.buyer_email)}</a>` : ""
          const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : ""
          return `<li class="compras-contact-item">
            <div class="compras-contact-name"><strong>${escapeHtml(c.buyer_name || "Cliente")}</strong>${dateStr ? `<small class="hint">Pedido em ${dateStr}</small>` : ""}</div>
            <div class="compras-contact-links">${waLink}${emailLink}</div>
          </li>`
        }).join("")}</ul>`

    dialog.innerHTML = `<div class="dialog-content">
      <div class="dialog-header">
        <h2>Lista de Espera · ${escapeHtml(item.name || item.code)}</h2>
        <p class="hint">${escapeHtml(item.code)} · ${contacts.length} interessada(s)</p>
      </div>
      ${contactsHtml}
      <div class="dialog-actions">
        <button type="button" class="btn-ghost" id="compras-contacts-close">Fechar</button>
      </div>
    </div>`

    dialog.querySelector("#compras-contacts-close")?.addEventListener("click", () => dialog.close())
    if (!dialog.open) dialog.showModal()
  }

  return {
    loadOverview,
    changeInicioMonth,
    loadRecent,
    bindSaleEditActions,
    openSaleDialog,
    paintInicio,
    bindSaleCards,
    bindInicio,
    paintVendas,
    paintVendedoras,
    changeVendedorasMonth,
    loadSellers,
    paintCompras,
    changeComprasMonth,
    loadPurchases,
    openComprasContactsDialog,
  }
}
