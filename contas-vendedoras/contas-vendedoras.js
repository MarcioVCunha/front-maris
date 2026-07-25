const utils = window.MarisUtils
if (!utils || typeof utils.createSupabaseClient !== "function") {
  document.getElementById("sales-grid").innerHTML =
    `<p class="empty-cell">Erro: utils.js não carregou. Abra pelo servidor (não use file://) ou verifique o caminho.</p>`
  throw new Error("MarisUtils ausente")
}

const { createSupabaseClient, formatMoneyBRL, roundMoney } = utils

let supabaseClient
try {
  supabaseClient = createSupabaseClient()
} catch (e) {
  console.error(e)
  document.getElementById("sales-grid").innerHTML =
    `<p class="empty-cell">Erro ao conectar ao Supabase (CDN ou chave).</p>`
  throw e
}

const filterPaidSelect = document.getElementById("filter-paid")
const searchInput = document.getElementById("search-input")
const salesGrid = document.getElementById("sales-grid")
const messageEl = document.getElementById("message")
const toolbarSelectedEl = document.getElementById("toolbar-selected")
const selectAllCheckbox = document.getElementById("select-all-visible")
const modoRepasseCheckbox = document.getElementById("modo-repasse")
const btnMarcarRepasse = document.getElementById("btn-marcar-repasse")
const btnDevolverSelecionadas = document.getElementById("btn-devolver-selecionadas")

const REPASSE_PERCENT = 0.7

/** @type {Set<string>} */
const selectedSaleIds = new Set()

const PAYMENT_LABELS = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
  transferencia: "Transferência"
}

/** @type {Array<Record<string, unknown>>} */
let loadedSales = []

/** @type {Record<string, string>} código do produto (uppercase) -> URL da capa */
let imageUrlByProductCode = Object.create(null)

const SALES_SELECT =
  "id, created_at, product_code, product_name, quantity, payment_method, total_value, seller_name, sale_item_type, parent_product_code, is_paid, status"

function isCancelledView() {
  return (filterPaidSelect?.value || "") === "cancelled"
}

function setMessage(text, type = "") {
  window.MarisUI.setFeedback(messageEl, text, type, { baseClass: "message", toggleHidden: false })
}

function paymentLabel(method) {
  const key = String(method || "").trim()
  return PAYMENT_LABELS[key] || key || "—"
}

function formatDate(iso) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function isPaidValue(row) {
  if (row.is_paid === true) return true
  if (row.is_paid === false) return false
  return false
}

function isActiveRow(row) {
  return String(row.status || "active") !== "cancelled"
}

function selectedAreAllPaidActive(rows) {
  let any = false
  for (const row of rows) {
    const id = saleIdKey(row)
    if (!id || !selectedSaleIds.has(id)) continue
    any = true
    if (!isActiveRow(row) || !isPaidValue(row)) return false
  }
  return any
}

function selectedHasUnpaidActive(rows) {
  for (const row of rows) {
    const id = saleIdKey(row)
    if (!id || !selectedSaleIds.has(id)) continue
    if (isActiveRow(row) && !isPaidValue(row)) return true
  }
  return false
}

function currentFilterMode() {
  return filterPaidSelect?.value || "unpaid"
}

function saleIdKey(row) {
  return String(row.id ?? "")
}

function catalogCodeForSale(row) {
  const parent = String(row.parent_product_code || "").trim()
  if (String(row.sale_item_type || "") === "component" && parent) {
    return parent.toUpperCase()
  }
  const code = String(row.product_code || "").trim()
  if (!code || code.toUpperCase().startsWith("COMP-")) return ""
  return code.toUpperCase()
}

function getSaleImageUrl(row) {
  const code = catalogCodeForSale(row)
  if (!code) return ""
  return imageUrlByProductCode[code] || ""
}

function escapeHtml(text) {
  return window.MarisUI.escapeHtml(text)
}

function renderProductPhoto(row) {
  const url = getSaleImageUrl(row)
  const name = String(row.product_name || "Produto")
  if (!url) {
    return `<div class="sale-card-photo sale-card-photo--empty" aria-hidden="true"><span>Sem foto</span></div>`
  }
  return `<img class="sale-card-photo" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'sale-card-photo sale-card-photo--empty',innerHTML:'<span>Sem foto</span>'}))">`
}

async function loadProductImagesForSales(sales) {
  imageUrlByProductCode = Object.create(null)
  const codes = new Set()
  for (const row of sales) {
    const code = catalogCodeForSale(row)
    if (code) codes.add(code)
  }
  const codeList = [...codes]
  if (!codeList.length) return

  const { data: products, error: productsError } = await supabaseClient
    .from("products")
    .select("id, code, image_url")
    .in("code", codeList)

  if (productsError) {
    console.warn("Imagens: erro ao carregar produtos", productsError)
    return
  }

  const productIdByCode = Object.create(null)
  for (const product of products || []) {
    const code = String(product.code || "").trim().toUpperCase()
    if (!code) continue
    productIdByCode[code] = Number(product.id)
    const fallback = String(product.image_url || "").trim()
    if (fallback) imageUrlByProductCode[code] = fallback
  }

  const productIds = Object.values(productIdByCode).filter((id) => Number.isInteger(id) && id > 0)
  if (!productIds.length) return

  const { data: images, error: imagesError } = await supabaseClient
    .from("product_images")
    .select("product_id, image_url, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true })

  if (imagesError) {
    console.warn("Imagens: erro ao carregar galeria", imagesError)
    return
  }

  const firstImageByProductId = Object.create(null)
  for (const row of images || []) {
    const productId = Number(row.product_id)
    const imageUrl = String(row.image_url || "").trim()
    if (!Number.isInteger(productId) || !imageUrl || firstImageByProductId[productId]) continue
    firstImageByProductId[productId] = imageUrl
  }

  for (const [code, productId] of Object.entries(productIdByCode)) {
    const fromGallery = firstImageByProductId[productId]
    if (fromGallery) imageUrlByProductCode[code] = fromGallery
  }
}

function applySearchFilter(rows) {
  const term = (searchInput?.value || "").trim().toLowerCase()
  if (!term) return rows
  return rows.filter((row) => {
    const name = String(row.product_name || "").toLowerCase()
    const code = String(row.product_code || "").toLowerCase()
    const seller = String(row.seller_name || "").toLowerCase()
    return name.includes(term) || code.includes(term) || seller.includes(term)
  })
}

function selectionTotals(rows) {
  let lines = 0
  let pieces = 0
  let sum = 0
  for (const row of rows) {
    const id = saleIdKey(row)
    if (!id || !selectedSaleIds.has(id)) continue
    lines += 1
    pieces += Number(row.quantity) || 0
    sum += Number(row.total_value) || 0
  }
  return { lines, pieces, sum }
}

function rowsForSaleIds(ids) {
  const idSet = new Set(ids.map((id) => String(id)))
  return loadedSales.filter((row) => idSet.has(saleIdKey(row)))
}

function successfulReturnIds(requestedIds, errors) {
  if (!Array.isArray(errors) || !errors.length) return requestedIds
  const failed = new Set(errors.map((entry) => Number(entry.sale_id)))
  return requestedIds.filter((id) => !failed.has(id))
}

function showReturnCreditAlert(rows) {
  if (!rows.length) return

  let total = 0
  for (const row of rows) {
    total += Number(row.total_value) || 0
  }
  const totalRounded =
    typeof roundMoney === "function" ? roundMoney(total) : Math.round(total * 100) / 100

  const lines = [
    "Devolução concluída.",
    "",
    "Anote como crédito para quem devolveu:",
    `Total pago: ${formatMoneyBRL(totalRounded)}`,
    ""
  ]

  const bySeller = Object.create(null)
  for (const row of rows) {
    const seller = String(row.seller_name || "Sem vendedora").trim() || "Sem vendedora"
    if (!bySeller[seller]) bySeller[seller] = []
    bySeller[seller].push(row)
  }

  for (const [seller, sellerRows] of Object.entries(bySeller)) {
    let sellerSum = 0
    for (const row of sellerRows) sellerSum += Number(row.total_value) || 0
    const sellerRounded =
      typeof roundMoney === "function" ? roundMoney(sellerSum) : Math.round(sellerSum * 100) / 100
    lines.push(`${seller} — ${formatMoneyBRL(sellerRounded)}`)
    for (const row of sellerRows) {
      const name = String(row.product_name || "Produto").trim()
      const code = String(row.product_code || "").trim()
      const label = code ? `${name} (${code})` : name
      lines.push(`  · ${label}: ${formatMoneyBRL(row.total_value)}`)
    }
    lines.push("")
  }

  window.alert(lines.join("\n").trim())
}

function syncSelectAllCheckbox(rows) {
  if (!selectAllCheckbox || !rows.length) {
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false
      selectAllCheckbox.indeterminate = false
    }
    return
  }
  const visibleIds = rows.map(saleIdKey).filter(Boolean)
  const nSelected = visibleIds.filter((id) => selectedSaleIds.has(id)).length
  selectAllCheckbox.checked = nSelected === visibleIds.length
  selectAllCheckbox.indeterminate = nSelected > 0 && nSelected < visibleIds.length
}

function renderRows(rows) {
  if (!salesGrid) return
  if (!rows.length) {
    salesGrid.innerHTML = `<p class="empty-cell">Nenhuma venda neste filtro.</p>`
    if (toolbarSelectedEl) toolbarSelectedEl.textContent = ""
    syncSelectAllCheckbox([])
    return
  }

  const { lines: selLines, pieces: selPieces, sum: selSum } = selectionTotals(rows)
  const repasseOn = Boolean(modoRepasseCheckbox?.checked)
  const repasseVal =
    typeof roundMoney === "function" ? roundMoney(selSum * REPASSE_PERCENT) : Math.round(selSum * REPASSE_PERCENT * 100) / 100

  if (toolbarSelectedEl) {
    if (selLines === 0) {
      toolbarSelectedEl.innerHTML = `<span class="summary-line">Selecione vendas para ver <strong>peças</strong> e <strong>valor</strong>.</span>`
    } else {
      const lines = [
        `<span class="summary-line">Peças selecionadas: <strong>${selPieces}</strong> · Valor selecionado: <strong>${formatMoneyBRL(selSum)}</strong></span>`
      ]
      if (repasseOn && selSum > 0) {
        lines.push(
          `<span class="summary-line summary-repasse">Repasse ao titular (70%): <strong>${formatMoneyBRL(repasseVal)}</strong></span>`
        )
      }
      toolbarSelectedEl.innerHTML = lines.join("")
    }
  }

  salesGrid.innerHTML = rows
    .map((row) => {
      const cancelled = String(row.status || "active") === "cancelled"
      const paid = isPaidValue(row)
      const type = String(row.sale_item_type || "product") === "component" ? "Tipo" : "Produto"
      const id = saleIdKey(row)

      let badgeClass = paid ? "badge-paid" : "badge-unpaid"
      let badgeText = paid ? "Paga" : "A receber"
      if (cancelled) {
        badgeClass = "badge-cancelled"
        badgeText = "Cancelada"
      }

      const meta = `
        ${renderProductPhoto(row)}
        <h3 class="sale-card-title">${escapeHtml(row.product_name || "—")}</h3>
        <p class="sale-card-code">${type} · ${escapeHtml(row.product_code || "")}</p>
        <dl class="sale-card-meta">
          <div><dt>Data</dt><dd>${formatDate(row.created_at)}</dd></div>
          <div><dt>Quantidade</dt><dd>${Number(row.quantity) || 0}</dd></div>
          <div><dt>Vendedora</dt><dd>${escapeHtml(row.seller_name || "—")}</dd></div>
          <div><dt>Pagamento</dt><dd>${escapeHtml(paymentLabel(row.payment_method))}</dd></div>
        </dl>
        <div class="sale-card-footer">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <span class="sale-card-value">${formatMoneyBRL(row.total_value)}</span>
        </div>
      `

      if (cancelled) {
        return `
          <div class="sale-card sale-card--cancelled" role="listitem" data-sale-id="${escapeHtml(id)}">
            ${meta}
          </div>
        `
      }

      const checked = id && selectedSaleIds.has(id) ? "checked" : ""
      const selectedClass = checked ? "sale-card--selected" : ""
      const cancelBtn = paid
        ? `<button type="button" class="btn-return-sale" data-return-sale-id="${escapeHtml(id)}">Devolver venda</button>`
        : `<button type="button" class="btn-cancel-sale" data-cancel-sale-id="${escapeHtml(id)}">Cancelar venda</button>`

      return `
        <label class="sale-card ${selectedClass}" role="listitem" data-sale-id="${escapeHtml(id)}">
          <input type="checkbox" class="row-select sale-card-checkbox" data-sale-id="${escapeHtml(id)}" ${checked} aria-label="Selecionar venda de ${escapeHtml(row.product_name || "produto")}">
          ${meta}
          ${cancelBtn ? `<div class="sale-card-actions">${cancelBtn}</div>` : ""}
        </label>
      `
    })
    .join("")

  syncSelectAllCheckbox(rows)
  syncActionButtons(rows)
}

function syncActionButtons(rows) {
  const mode = currentFilterMode()
  const cancelledView = isCancelledView()
  const canMarkPaid = !cancelledView && mode !== "paid"
  const canReturn = !cancelledView && mode !== "unpaid"

  if (btnMarcarRepasse) {
    btnMarcarRepasse.hidden = !canMarkPaid
    if (btnMarcarRepasse.dataset.loading === "1") {
      btnMarcarRepasse.disabled = true
    } else {
      btnMarcarRepasse.disabled = !canMarkPaid || !selectedHasUnpaidActive(rows)
    }
  }

  if (btnDevolverSelecionadas) {
    btnDevolverSelecionadas.hidden = !canReturn
    if (btnDevolverSelecionadas.dataset.loading === "1") {
      btnDevolverSelecionadas.disabled = true
    } else {
      btnDevolverSelecionadas.disabled = !canReturn || !selectedAreAllPaidActive(rows)
    }
  }
}

function selectedIdsInView(rows) {
  const ids = []
  for (const row of rows) {
    const id = saleIdKey(row)
    if (!id || !selectedSaleIds.has(id)) continue
    const n = Number(id)
    if (Number.isInteger(n) && n > 0) ids.push(n)
  }
  return ids
}

async function marcarSelecionadasComoPagas() {
  const filtered = applySearchFilter(loadedSales)
  const ids = selectedIdsInView(filtered)
  if (!ids.length) {
    setMessage("Selecione ao menos uma venda na lista.", "error")
    return
  }

  const { lines, pieces, sum } = selectionTotals(filtered)
  const repasseVal =
    typeof roundMoney === "function" ? roundMoney(sum * REPASSE_PERCENT) : Math.round(sum * REPASSE_PERCENT * 100) / 100
  const repasseOn = Boolean(modoRepasseCheckbox?.checked)
  const confirmMsg = repasseOn
    ? `Marcar ${lines} venda(s) como paga(s)?\n` +
      `Peças: ${pieces} · Valor: ${formatMoneyBRL(sum)}\n` +
      `Repasse ao titular (70%): ${formatMoneyBRL(repasseVal)}`
    : `Marcar ${lines} venda(s) como paga(s)?\n` +
      `Peças: ${pieces} · Valor: ${formatMoneyBRL(sum)}`
  if (!window.confirm(confirmMsg)) return

  if (btnMarcarRepasse) {
    btnMarcarRepasse.dataset.loading = "1"
    btnMarcarRepasse.disabled = true
  }
  setMessage("Salvando…", "")

  try {
    const { error } = await supabaseClient.from("sales").update({ is_paid: true }).in("id", ids)

    if (error) {
      console.error(error)
      const detail = error.message || error.code || String(error)
      setMessage(`Não foi possível atualizar: ${detail}`, "error")
      if (btnMarcarRepasse) {
        delete btnMarcarRepasse.dataset.loading
      }
      refreshDisplay()
      return
    }

    const n = ids.length
    await loadSales()
    setMessage(`${n} venda(s) marcada(s) como paga(s).`, "success")
  } catch (e) {
    console.error(e)
    setMessage(`Erro inesperado: ${e?.message || e}`, "error")
  } finally {
    if (btnMarcarRepasse) {
      delete btnMarcarRepasse.dataset.loading
    }
    refreshDisplay()
  }
}

function refreshDisplay() {
  const filtered = applySearchFilter(loadedSales)
  renderRows(filtered)
}

async function devolverVendas(saleIds, triggerBtn, creditSnapshot) {
  const ids = [...new Set(saleIds.map((id) => Number(id)).filter((n) => Number.isInteger(n) && n > 0))]
  if (!ids.length) return

  const creditRows = creditSnapshot || rowsForSaleIds(ids)

  const url = window.ENV?.fn?.("return-sale")
  if (!url) {
    setMessage("Configuração ausente para devolver venda.", "error")
    return
  }

  if (triggerBtn) triggerBtn.disabled = true
  if (btnDevolverSelecionadas) {
    btnDevolverSelecionadas.dataset.loading = "1"
    btnDevolverSelecionadas.disabled = true
  }
  setMessage(ids.length === 1 ? "Devolvendo venda…" : "Devolvendo vendas…", "")

  try {
    const { ok, status, data } = await window.MarisApi.callFunction(url, {
      body: { sale_ids: ids }
    })

    if (!ok || !data.ok) {
      const detail = data.error || `Erro ${status}`
      setMessage(`Não foi possível devolver: ${detail}`, "error")
      if (triggerBtn) triggerBtn.disabled = false
      refreshDisplay()
      return
    }

    for (const id of ids) selectedSaleIds.delete(String(id))
    await loadSales()

    const count = Number(data.count) || ids.length
    const partial =
      Array.isArray(data.errors) && data.errors.length
        ? ` (${data.errors.length} não processada(s))`
        : ""
    const returnedIds = successfulReturnIds(ids, data.errors)
    const creditedRows = creditRows.filter((row) =>
      returnedIds.includes(Number(saleIdKey(row)))
    )
    if (creditedRows.length) showReturnCreditAlert(creditedRows)

    setMessage(
      count === 1
        ? "Venda devolvida e item reposto no catálogo."
        : `${count} venda(s) devolvida(s) e itens repostos no catálogo.${partial}`,
      "success"
    )
  } catch (e) {
    console.error(e)
    setMessage(`Erro inesperado: ${e?.message || e}`, "error")
    if (triggerBtn) triggerBtn.disabled = false
  } finally {
    if (btnDevolverSelecionadas) {
      delete btnDevolverSelecionadas.dataset.loading
    }
    refreshDisplay()
  }
}

async function devolverSelecionadas() {
  const filtered = applySearchFilter(loadedSales)
  if (!selectedAreAllPaidActive(filtered)) {
    setMessage("Selecione apenas vendas pagas e ativas para devolver.", "error")
    return
  }

  const ids = selectedIdsInView(filtered)
  const creditSnapshot = rowsForSaleIds(ids)
  const { lines, pieces, sum } = selectionTotals(filtered)
  const ok = window.confirm(
    `Devolver ${lines} venda(s) pagas ao catálogo?\n` +
      `Peças: ${pieces} · Valor: ${formatMoneyBRL(sum)}\n\n` +
      "O estoque será reposto e a venda ficará como cancelada. Esta ação não pode ser desfeita."
  )
  if (!ok) return

  await devolverVendas(ids, null, creditSnapshot)
}

async function cancelarVenda(saleId, triggerBtn) {
  const id = Number(saleId)
  if (!Number.isInteger(id) || id <= 0) return

  const ok = window.confirm(
    "Cancelar esta venda e devolver o item ao catálogo? Esta ação não pode ser desfeita."
  )
  if (!ok) return

  const url = window.ENV?.fn?.("cancel-sale")
  if (!url) {
    setMessage("Configuração ausente para cancelar venda.", "error")
    return
  }

  if (triggerBtn) triggerBtn.disabled = true
  setMessage("Cancelando venda…", "")

  try {
    const { ok, status, data } = await window.MarisApi.callFunction(url, {
      body: { sale_id: id }
    })

    if (!ok || !data.ok) {
      const detail = data.error || `Erro ${status}`
      setMessage(`Não foi possível cancelar: ${detail}`, "error")
      if (triggerBtn) triggerBtn.disabled = false
      return
    }

    selectedSaleIds.delete(String(id))
    await loadSales()
    setMessage("Venda cancelada e item devolvido ao catálogo.", "success")
  } catch (e) {
    console.error(e)
    setMessage(`Erro inesperado: ${e?.message || e}`, "error")
    if (triggerBtn) triggerBtn.disabled = false
  }
}

async function loadSales() {
  if (!salesGrid || !filterPaidSelect) return

  setMessage("")
  salesGrid.innerHTML = `<p class="empty-cell">Carregando…</p>`
  if (toolbarSelectedEl) toolbarSelectedEl.textContent = ""

  const mode = filterPaidSelect.value

  try {
    let query = supabaseClient.from("sales").select(SALES_SELECT)

    if (mode === "cancelled") {
      query = query.eq("status", "cancelled")
    } else {
      query = query.eq("status", "active")
      if (mode === "unpaid") {
        query = query.or("is_paid.eq.false,is_paid.is.null")
      } else if (mode === "paid") {
        query = query.eq("is_paid", true)
      }
    }

    query = query.order("created_at", { ascending: false })

    let { data, error } = await query

    if (error && mode === "unpaid") {
      const retry = await supabaseClient
        .from("sales")
        .select(SALES_SELECT)
        .eq("status", "active")
        .eq("is_paid", false)
        .order("created_at", { ascending: false })
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error(error)
      const detail = error.message || error.code || String(error)
      setMessage(`Erro ao carregar vendas: ${detail}`, "error")
      salesGrid.innerHTML = `<p class="empty-cell">Erro ao carregar.</p>`
      loadedSales = []
      selectedSaleIds.clear()
      imageUrlByProductCode = Object.create(null)
      return
    }

    selectedSaleIds.clear()
    loadedSales = data || []
    await loadProductImagesForSales(loadedSales)
    refreshDisplay()
  } catch (e) {
    console.error(e)
    setMessage(`Erro inesperado: ${e?.message || e}`, "error")
    salesGrid.innerHTML = `<p class="empty-cell">Erro ao carregar.</p>`
    loadedSales = []
    selectedSaleIds.clear()
    imageUrlByProductCode = Object.create(null)
  }
}

if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener("change", () => {
    if (isCancelledView()) {
      selectAllCheckbox.checked = false
      return
    }
    const filtered = applySearchFilter(loadedSales)
    if (selectAllCheckbox.checked) {
      for (const row of filtered) {
        const id = saleIdKey(row)
        if (id) selectedSaleIds.add(id)
      }
    } else {
      for (const row of filtered) {
        const id = saleIdKey(row)
        if (id) selectedSaleIds.delete(id)
      }
    }
    refreshDisplay()
  })
}

if (salesGrid) {
  salesGrid.addEventListener("change", (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.classList.contains("row-select")) return
    const id = target.dataset.saleId
    if (!id) return
    if (target.checked) selectedSaleIds.add(id)
    else selectedSaleIds.delete(id)
    refreshDisplay()
  })

  salesGrid.addEventListener("click", (event) => {
    const cancelBtn = event.target instanceof Element ? event.target.closest(".btn-cancel-sale") : null
    if (cancelBtn) {
      event.preventDefault()
      event.stopPropagation()
      cancelarVenda(cancelBtn.dataset.cancelSaleId, cancelBtn)
      return
    }

    const returnBtn = event.target instanceof Element ? event.target.closest(".btn-return-sale") : null
    if (!returnBtn) return
    event.preventDefault()
    event.stopPropagation()

    const id = Number(returnBtn.dataset.returnSaleId)
    if (!Number.isInteger(id) || id <= 0) return

    const row = loadedSales.find((sale) => saleIdKey(sale) === String(id))
    const valueLabel = row ? formatMoneyBRL(row.total_value) : ""
    const ok = window.confirm(
      valueLabel
        ? `Devolver esta venda paga (${valueLabel}) e repor o item no catálogo? Esta ação não pode ser desfeita.`
        : "Devolver esta venda paga e repor o item no catálogo? Esta ação não pode ser desfeita."
    )
    if (!ok) return
    devolverVendas([id], returnBtn, row ? [row] : [])
  })
}

if (filterPaidSelect) {
  filterPaidSelect.addEventListener("change", () => {
    loadSales()
  })
}

if (searchInput) {
  window.MarisUI.bindDebouncedSearch(searchInput, () => refreshDisplay(), { debounceMs: 150 })
}

if (modoRepasseCheckbox) {
  modoRepasseCheckbox.addEventListener("change", () => refreshDisplay())
}

if (btnMarcarRepasse) {
  btnMarcarRepasse.addEventListener("click", () => {
    marcarSelecionadasComoPagas()
  })
}

if (btnDevolverSelecionadas) {
  btnDevolverSelecionadas.addEventListener("click", () => {
    devolverSelecionadas()
  })
}

loadSales()
