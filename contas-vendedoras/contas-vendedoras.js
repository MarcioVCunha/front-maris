const { createSupabaseClient, formatMoneyBRL, debounce } = window.MarisUtils

const supabase = createSupabaseClient()

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
  if (!rows.length) {
    salesTbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Nenhuma venda neste filtro.</td></tr>`
    toolbarSummaryEl.innerHTML = ""
    return
  }

  const total = rows.reduce((acc, row) => acc + (Number(row.total_value) || 0), 0)
  toolbarSummaryEl.innerHTML = `Exibindo <strong>${rows.length}</strong> linha(s) · Total: <strong>${formatMoneyBRL(total)}</strong>`

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
  setMessage("")
  salesTbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Carregando…</td></tr>`
  toolbarSummaryEl.textContent = ""

  const mode = filterPaidSelect.value

  let query = supabase
    .from("sales")
    .select(
      "id, created_at, product_code, product_name, quantity, payment_method, total_value, seller_name, sale_item_type, is_paid"
    )
    .order("created_at", { ascending: false })

  if (mode === "unpaid") {
    query = query.or("is_paid.eq.false,is_paid.is.null")
  } else if (mode === "paid") {
    query = query.eq("is_paid", true)
  }

  const { data, error } = await query

  if (error) {
    console.error(error)
    setMessage("Erro ao carregar vendas. Verifique se a coluna is_paid existe e as permissões do Supabase.", "error")
    salesTbody.innerHTML = `<tr><td colspan="7" class="empty-cell">Erro ao carregar.</td></tr>`
    loadedSales = []
    return
  }

  loadedSales = data || []
  refreshDisplay()
}

filterPaidSelect.addEventListener("change", () => {
  loadSales()
})

searchInput.addEventListener("input", debounce(() => refreshDisplay(), 150))

loadSales()
