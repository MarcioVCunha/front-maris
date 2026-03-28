const utils = window.MarisUtils
if (!utils || typeof utils.createSupabaseClient !== "function") {
  document.getElementById("sales-tbody").innerHTML =
    `<tr><td colspan="8" class="empty-cell">Erro: utils.js não carregou. Abra pelo servidor (não use file://) ou verifique o caminho.</td></tr>`
  throw new Error("MarisUtils ausente")
}

const { createSupabaseClient, formatMoneyBRL, roundMoney } = utils
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
const toolbarSelectedEl = document.getElementById("toolbar-selected")
const selectAllCheckbox = document.getElementById("select-all-visible")
const modoRepasseCheckbox = document.getElementById("modo-repasse")
const btnMarcarRepasse = document.getElementById("btn-marcar-repasse")

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
      toolbarSelectedEl.innerHTML = `<span class="summary-line">Selecione linhas na tabela para ver <strong>peças</strong> e <strong>valor</strong>.</span>`
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
  syncRepasseButton(rows)
}

function syncRepasseButton(rows) {
  if (!btnMarcarRepasse) return
  if (btnMarcarRepasse.dataset.loading === "1") return
  const { lines } = selectionTotals(rows)
  btnMarcarRepasse.disabled = lines === 0
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

async function loadSales() {
  if (!salesTbody || !filterPaidSelect) return

  setMessage("")
  salesTbody.innerHTML = `<tr><td colspan="8" class="empty-cell">Carregando…</td></tr>`
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

if (modoRepasseCheckbox) {
  modoRepasseCheckbox.addEventListener("change", () => refreshDisplay())
}

if (btnMarcarRepasse) {
  btnMarcarRepasse.addEventListener("click", () => {
    marcarSelecionadasComoPagas()
  })
}

loadSales()
