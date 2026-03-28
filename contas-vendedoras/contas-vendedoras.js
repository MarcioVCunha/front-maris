const utils = window.MarisUtils
if (!utils || typeof utils.createSupabaseClient !== "function") {
  document.getElementById("sales-tbody").innerHTML =
    `<tr><td colspan="8" class="empty-cell">Erro: utils.js não carregou. Abra pelo servidor (não use file://) ou verifique o caminho.</td></tr>`
  throw new Error("MarisUtils ausente")
}

const { createSupabaseClient, formatMoneyBRL } = utils
const debounce =
  typeof utils.debounce === "function"
    ? utils.debounce
    : (fn, _ms) => {
        return (...args) => fn(...args)
      }

let supabaseClient
try {
  supabaseClient = createSupabaseClient()
} catch (e) {
  console.error(e)
  document.getElementById("sales-tbody").innerHTML =
    `<tr><td colspan="8" class="empty-cell">Erro ao conectar ao Supabase (CDN ou chave).</td></tr>`
  throw e
}

const filterPaidSelect = document.getElementById("filter-paid")
const searchInput = document.getElementById("search-input")
const salesTbody = document.getElementById("sales-tbody")
const messageEl = document.getElementById("message")
const toolbarSummaryEl = document.getElementById("toolbar-summary")
const toolbarSelectedEl = document.getElementById("toolbar-selected")
const selectAllCheckbox = document.getElementById("select-all-visible")

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

function setMessage(text, type = "") {
  if (!messageEl) return
  messageEl.textContent = text
  messageEl.className = `message ${type}`.trim()
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

function saleIdKey(row) {
  return String(row.id ?? "")
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
  let count = 0
  let sum = 0
  for (const row of rows) {
    const id = saleIdKey(row)
    if (!id || !selectedSaleIds.has(id)) continue
    count += 1
    sum += Number(row.total_value) || 0
  }
  return { count, sum }
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
  if (!salesTbody) return
  if (!rows.length) {
    salesTbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Nenhuma venda neste filtro.</td></tr>`
    if (toolbarSummaryEl) toolbarSummaryEl.innerHTML = ""
    if (toolbarSelectedEl) toolbarSelectedEl.textContent = ""
    syncSelectAllCheckbox([])
    return
  }

  const total = rows.reduce((acc, row) => acc + (Number(row.total_value) || 0), 0)
  if (toolbarSummaryEl) {
    toolbarSummaryEl.innerHTML = `<span class="summary-line">Exibindo <strong>${rows.length}</strong> linha(s) · Total listado: <strong>${formatMoneyBRL(total)}</strong></span>`
  }

  const { count: selCount, sum: selSum } = selectionTotals(rows)
  if (toolbarSelectedEl) {
    toolbarSelectedEl.innerHTML =
      selCount > 0
        ? `<span class="summary-line">Selecionadas: <strong>${selCount}</strong> · Total selecionado: <strong>${formatMoneyBRL(selSum)}</strong></span>`
        : `<span class="summary-line">Nenhuma linha selecionada · Total selecionado: <strong>${formatMoneyBRL(0)}</strong></span>`
  }

  salesTbody.innerHTML = rows
    .map((row) => {
      const paid = isPaidValue(row)
      const badgeClass = paid ? "badge-paid" : "badge-unpaid"
      const badgeText = paid ? "Paga" : "A receber"
      const type = String(row.sale_item_type || "product") === "component" ? "Componente" : "Produto"
      const id = saleIdKey(row)
      const checked = id && selectedSaleIds.has(id) ? "checked" : ""
      const rowClass = checked ? "row-selected" : ""

      return `
        <tr class="${rowClass}">
          <td class="col-check">
            <input type="checkbox" class="row-select" data-sale-id="${id}" ${checked} aria-label="Selecionar linha">
          </td>
          <td>${formatDate(row.created_at)}</td>
          <td>
            <span>${String(row.product_name || "—")}</span>
            <span class="code-muted">${type} · ${String(row.product_code || "")}</span>
          </td>
          <td>${Number(row.quantity) || 0}</td>
          <td>${String(row.seller_name || "—")}</td>
          <td>${paymentLabel(row.payment_method)}</td>
          <td class="num">${formatMoneyBRL(row.total_value)}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        </tr>
      `
    })
    .join("")

  syncSelectAllCheckbox(rows)
}

function refreshDisplay() {
  const filtered = applySearchFilter(loadedSales)
  renderRows(filtered)
}

async function loadSales() {
  if (!salesTbody || !filterPaidSelect) return

  setMessage("")
  salesTbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Carregando…</td></tr>`
  if (toolbarSummaryEl) toolbarSummaryEl.textContent = ""
  if (toolbarSelectedEl) toolbarSelectedEl.textContent = ""

  const mode = filterPaidSelect.value

  try {
    let query = supabaseClient.from("sales").select(
      "id, created_at, product_code, product_name, quantity, payment_method, total_value, seller_name, sale_item_type, is_paid"
    )

    if (mode === "unpaid") {
      query = query.or("is_paid.eq.false,is_paid.is.null")
    } else if (mode === "paid") {
      query = query.eq("is_paid", true)
    }

    query = query.order("created_at", { ascending: false })

    let { data, error } = await query

    if (error && mode === "unpaid") {
      const retry = await supabaseClient
        .from("sales")
        .select(
          "id, created_at, product_code, product_name, quantity, payment_method, total_value, seller_name, sale_item_type, is_paid"
        )
        .eq("is_paid", false)
        .order("created_at", { ascending: false })
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error(error)
      const detail = error.message || error.code || String(error)
      setMessage(`Erro ao carregar vendas: ${detail}`, "error")
      salesTbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Erro ao carregar.</td></tr>`
      loadedSales = []
      selectedSaleIds.clear()
      return
    }

    selectedSaleIds.clear()
    loadedSales = data || []
    refreshDisplay()
  } catch (e) {
    console.error(e)
    setMessage(`Erro inesperado: ${e?.message || e}`, "error")
    salesTbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Erro ao carregar.</td></tr>`
    loadedSales = []
    selectedSaleIds.clear()
  }
}

if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener("change", () => {
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

if (salesTbody) {
  salesTbody.addEventListener("change", (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement) || !target.classList.contains("row-select")) return
    const id = target.dataset.saleId
    if (!id) return
    if (target.checked) selectedSaleIds.add(id)
    else selectedSaleIds.delete(id)
    refreshDisplay()
  })
}

if (filterPaidSelect) {
  filterPaidSelect.addEventListener("change", () => {
    loadSales()
  })
}

if (searchInput) {
  searchInput.addEventListener(
    "input",
    debounce(() => refreshDisplay(), 150)
  )
}

loadSales()
