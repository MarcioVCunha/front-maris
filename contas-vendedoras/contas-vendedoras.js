const utils = window.MarisUtils
if (!utils || typeof utils.createSupabaseClient !== "function") {
  document.getElementById("sales-tbody").innerHTML =
    `<tr><td colspan="7" class="empty-cell">Erro: utils.js não carregou. Abra pelo servidor (não use file://) ou verifique o caminho.</td></tr>`
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
    `<tr><td colspan="7" class="empty-cell">Erro ao conectar ao Supabase (CDN ou chave).</td></tr>`
  throw e
}

const filterPaidSelect = document.getElementById("filter-paid")
const searchInput = document.getElementById("search-input")
const salesTbody = document.getElementById("sales-tbody")
const messageEl = document.getElementById("message")
const toolbarSummaryEl = document.getElementById("toolbar-summary")

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

function renderRows(rows) {
  if (!salesTbody) return
  if (!rows.length) {
    salesTbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Nenhuma venda neste filtro.</td></tr>`
    if (toolbarSummaryEl) toolbarSummaryEl.innerHTML = ""
    return
  }

  const total = rows.reduce((acc, row) => acc + (Number(row.total_value) || 0), 0)
  if (toolbarSummaryEl) {
    toolbarSummaryEl.innerHTML = `Exibindo <strong>${rows.length}</strong> linha(s) · Total: <strong>${formatMoneyBRL(total)}</strong>`
  }

  salesTbody.innerHTML = rows
    .map((row) => {
      const paid = isPaidValue(row)
      const badgeClass = paid ? "badge-paid" : "badge-unpaid"
      const badgeText = paid ? "Paga" : "A receber"
      const type = String(row.sale_item_type || "product") === "component" ? "Componente" : "Produto"

      return `
        <tr>
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
}

function refreshDisplay() {
  const filtered = applySearchFilter(loadedSales)
  renderRows(filtered)
}

async function loadSales() {
  if (!salesTbody || !filterPaidSelect) return

  setMessage("")
  salesTbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Carregando…</td></tr>`
  if (toolbarSummaryEl) toolbarSummaryEl.textContent = ""

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
      salesTbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Erro ao carregar.</td></tr>`
      loadedSales = []
      return
    }

    loadedSales = data || []
    refreshDisplay()
  } catch (e) {
    console.error(e)
    setMessage(`Erro inesperado: ${e?.message || e}`, "error")
    salesTbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Erro ao carregar.</td></tr>`
    loadedSales = []
  }
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
