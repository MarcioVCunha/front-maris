// Edição de venda reutilizável (Início, Vendas, Vendedoras).
// ADMIN_SALE_EDIT_ENABLED ligada ao back-maris PR #18 publicado:
// admin-recent-sales v3 (chips/foto: items[].image_url; seller_name,
// payment_status e payment_method separados), admin-sale-get /
// admin-sale-update / admin-sale-cancel / admin-sale-mark-paid v1
// (orders.read_all / orders.write_all). Ver docs/contratos/painel-venda-edicao.md.

export const ADMIN_SALE_EDIT_ENABLED = true

export function shouldShowSaleEdit(enabled = ADMIN_SALE_EDIT_ENABLED) {
  return enabled === true
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function money(value, formatMoney) {
  const number = Number(value)
  if (!Number.isFinite(number)) return formatMoney(0)
  return formatMoney(number)
}

function formatWhen(iso) {
  const date = new Date(iso || "")
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}

const STATUS_LABEL = {
  paid: "Paga",
  partial: "A confirmar",
  receivable: "A receber",
  cancelled: "Cancelada",
  canceled: "Cancelada",
  to_confirm: "A confirmar",
  pending: "A confirmar"
}

const STATUS_TONE = {
  paid: "paid",
  partial: "confirm",
  receivable: "receivable",
  cancelled: "cancelled",
  canceled: "cancelled",
  to_confirm: "confirm",
  pending: "confirm"
}

const METHOD_LABEL = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão"
}

const CHANNEL_LABEL = {
  site: "Site",
  equipe: "Equipe",
  marketplace: "Marketplace",
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  tiktok: "TikTok Shop"
}

export function saleChannelLabel(channel) {
  const key = String(channel || "").trim().toLowerCase()
  return CHANNEL_LABEL[key] || String(channel || "")
}

export function saleStatusKey(status) {
  return String(status || "").trim().toLowerCase()
}

export function saleStatusLabel(status) {
  const key = saleStatusKey(status)
  return STATUS_LABEL[key] || String(status || "")
}

export function saleStatusTone(status) {
  const key = saleStatusKey(status)
  return STATUS_TONE[key] || "neutral"
}

export function saleMethodLabel(method) {
  const key = String(method || "").trim().toLowerCase()
  return METHOD_LABEL[key] || ""
}

export function salePrimaryPhoto(sale) {
  const items = Array.isArray(sale?.items) ? sale.items : []
  for (const item of items) {
    const url = String(item?.image_url || item?.imageUrl || "").trim()
    if (url) return url
  }
  return String(sale?.image_url || "").trim()
}

function initialsFrom(value) {
  return String(value || "?").trim().slice(0, 2).toUpperCase() || "?"
}

export function salePhotoHtml(sale, options = {}) {
  const url = salePrimaryPhoto(sale)
  const klass = options.className || "sale-card__photo"
  if (url) {
    return `<img class="${klass}" src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async" width="56" height="56">`
  }
  const letters = initialsFrom(sale?.customer_name || sale?.channel)
  return `<span class="${klass} ${klass}--empty">${escapeHtml(letters)}</span>`
}

export function piecePhotoHtml(item) {
  const url = String(item?.image_url || item?.imageUrl || "").trim()
  if (url) {
    return `<img class="sale-edit__piece-photo" src="${escapeHtml(url)}" alt="" loading="lazy" decoding="async" width="44" height="44">`
  }
  const letters = initialsFrom(item?.code || item?.name)
  return `<span class="sale-edit__piece-photo sale-edit__piece-photo--empty">${escapeHtml(letters)}</span>`
}

export function isSaleOverdueReceivable(sale, now = new Date()) {
  if (!sale) return false
  const status = String(sale.payment_status || "").trim().toLowerCase()
  if (status !== "receivable") return false
  const createdDate = new Date(sale.created_at || "")
  if (Number.isNaN(createdDate.getTime())) return false
  const nowDate = now instanceof Date ? now : new Date(now)
  const diffMs = nowDate.getTime() - createdDate.getTime()
  return diffMs > 7 * 24 * 60 * 60 * 1000
}

export function daysSince(isoDate, now = new Date()) {
  const date = new Date(isoDate || "")
  if (Number.isNaN(date.getTime())) return 0
  const nowDate = now instanceof Date ? now : new Date(now)
  const diffMs = Math.max(0, nowDate.getTime() - date.getTime())
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

export function saleMetaChipsHtml(sale, now = new Date()) {
  const chips = []
  const seller = String(sale?.seller_name || "").trim()
  if (seller) {
    chips.push(`<span class="sale-chip sale-chip--seller">${escapeHtml(seller)}</span>`)
  }
  const status = saleStatusLabel(sale?.payment_status)
  if (status) {
    chips.push(
      `<span class="sale-chip sale-chip--status sale-chip--${saleStatusTone(sale?.payment_status)}">${escapeHtml(status)}</span>`
    )
  }
  if (isSaleOverdueReceivable(sale, now)) {
    const days = daysSince(sale?.created_at, now)
    chips.push(
      `<span class="sale-chip sale-chip--overdue" title="Venda a receber criada há mais de 7 dias">⏳ ${days}d em aberto</span>`
    )
  }
  const method = saleMethodLabel(sale?.payment_method)
  if (method) {
    chips.push(`<span class="sale-chip sale-chip--method">${escapeHtml(method)}</span>`)
  }
  if (!chips.length) return ""
  return `<div class="sale-edit__chips" role="list">${chips.join("")}</div>`
}

/** Lista filtrável por canal (site|equipe|shopee|mercado_livre|tiktok). */
export function filterSalesByChannel(sales, channel) {
  const key = String(channel || "").trim().toLowerCase()
  if (!key) return Array.isArray(sales) ? sales : []
  return (sales || []).filter((sale) => String(sale?.channel || "").toLowerCase() === key)
}

/** Filtra vendas de uma vendedora (seller_id; cai no nome se o id faltar). */
export function filterSalesBySeller(sales, seller) {
  if (!seller) return Array.isArray(sales) ? sales : []
  const id = seller.seller_id ?? seller.id
  const name = String(seller.name || seller.seller_name || "").trim().toLowerCase()
  return (sales || []).filter((sale) => {
    if (id != null && id !== "" && sale.seller_id != null && sale.seller_id !== "") {
      return String(sale.seller_id) === String(id)
    }
    if (name) return String(sale.seller_name || "").trim().toLowerCase() === name
    return false
  })
}

/** Filtra vendas por status (all|receivable|paid|partial|cancelled). */
export function filterSalesByStatus(sales, status) {
  const key = String(status || "").trim().toLowerCase()
  if (!key || key === "all" || key === "todas") {
    return (sales || []).filter((sale) => {
      const s = saleStatusKey(sale?.payment_status)
      return s !== "cancelled" && s !== "canceled"
    })
  }
  if (key === "receivable" || key === "a_receber") {
    return (sales || []).filter((sale) => saleStatusKey(sale?.payment_status) === "receivable")
  }
  if (key === "paid" || key === "paga" || key === "pagas") {
    return (sales || []).filter((sale) => saleStatusKey(sale?.payment_status) === "paid")
  }
  if (key === "partial" || key === "a_confirmar") {
    return (sales || []).filter((sale) => {
      const s = saleStatusKey(sale?.payment_status)
      return s === "partial" || s === "to_confirm" || s === "pending"
    })
  }
  if (key === "cancelled" || key === "cancelada" || key === "canceladas" || key === "canceled") {
    return (sales || []).filter((sale) => {
      const s = saleStatusKey(sale?.payment_status)
      return s === "cancelled" || s === "canceled"
    })
  }
  return (sales || []).filter((sale) => saleStatusKey(sale?.payment_status) === key)
}

export function normalizeSaleItems(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => ({
    id: item?.id ?? null,
    code: String(item?.code || item?.product_code || ""),
    name: String(item?.name || item?.product_name || ""),
    quantity: Number(item?.quantity) || 0,
    unit_price: item?.unit_price == null ? null : Number(item.unit_price),
    line_total: item?.line_total == null ? null : Number(item.line_total),
    image_url: String(item?.image_url || "").trim(),
    component_id: item?.component_id == null || item?.component_id === ""
      ? null
      : Number(item.component_id),
    legacy_sale_id: item?.legacy_sale_id == null ? null : Number(item.legacy_sale_id)
  }))
}

/**
 * Diálogo de venda. Com a flag off: só leitura.
 * Com a flag on: campos para valor, peças, cancelar e marcar como paga.
 */
export function renderSaleEditDialog(sale, formatMoney, options = {}) {
  if (!sale) return `<p class="empty">Venda não encontrada.</p>`
  const editable = shouldShowSaleEdit(options.enabled)
  const channel = saleChannelLabel(sale.channel)
  const when = formatWhen(sale.created_at)
  const items = normalizeSaleItems(sale.items)
  const itemRows = items.length
    ? items.map((item, index) => {
      const line = item.line_total != null
        ? item.line_total
        : (Number(item.unit_price) || 0) * (Number(item.quantity) || 0)
      if (!editable) {
        return `<article class="sale-edit__piece">
          ${piecePhotoHtml(item)}
          <span class="sale-edit__piece-copy"><strong>${escapeHtml(item.name || item.code || "Peça")}</strong>
            <small>${escapeHtml(item.code || "")} · ${Number(item.quantity) || 0} un.</small></span>
          <b>${escapeHtml(money(line, formatMoney))}</b>
        </article>`
      }
      return `<article class="sale-edit__piece" data-item-index="${index}" data-item-id="${escapeHtml(item.id ?? "")}" data-code="${escapeHtml(item.code || "")}" data-component-id="${escapeHtml(item.component_id ?? "")}">
        ${piecePhotoHtml(item)}
        <label class="field"><span>Peça</span>
          <input data-edit="name" value="${escapeHtml(item.name || "")}" readonly></label>
        <label class="field"><span>Qtd</span>
          <input data-edit="quantity" inputmode="numeric" value="${escapeHtml(item.quantity)}"></label>
        <label class="field"><span>Preço un.</span>
          <input data-edit="unit_price" inputmode="decimal" value="${escapeHtml(item.unit_price ?? "")}"></label>
      </article>`
    }).join("")
    : `<p class="hint">${sale.items_count ? `${Number(sale.items_count)} peça(s).` : "Sem peças listadas."}</p>`

  const totalField = editable
    ? `<label class="field"><span>Valor total</span>
        <input id="sale-edit-total" inputmode="decimal" value="${escapeHtml(sale.total ?? "")}"></label>`
    : `<p class="stat">${escapeHtml(money(sale.total, formatMoney))}</p>`

  const actions = editable
    ? `<div class="dialog-actions sale-edit__actions">
        <button type="button" class="btn-ghost" id="sale-edit-close">Fechar</button>
        <button type="button" class="btn-danger" id="sale-edit-cancel" data-sale-id="${escapeHtml(sale.id)}">Cancelar venda</button>
        <button type="button" class="btn-primary" id="sale-edit-paid" data-sale-id="${escapeHtml(sale.id)}">Marcar como paga</button>
        <button type="button" class="btn-primary" id="sale-edit-save" data-sale-id="${escapeHtml(sale.id)}">Salvar</button>
      </div>`
    : `<div class="dialog-actions">
        <button type="button" class="btn-ghost" id="sale-edit-close">Fechar</button>
      </div>`

  return `<div class="sale-edit" data-sale-id="${escapeHtml(sale.id)}">
    <p class="kicker">${escapeHtml([channel, when].filter(Boolean).join(" · "))}</p>
    <h2>${escapeHtml(sale.customer_name || "Cliente")}</h2>
    ${saleMetaChipsHtml(sale)}
    ${salePhotoHtml(sale)}
    ${totalField}
    <div class="sale-edit__pieces">${itemRows}</div>
    ${actions}
  </div>`
}

/** Cards de venda para Início / Vendas / Vendedoras. */
export function renderSaleCards(sales, formatMoney, options = {}) {
  const rows = Array.isArray(sales) ? sales : []
  if (!rows.length) {
    return `<p class="empty">${escapeHtml(options.empty || "Nenhuma venda neste canal.")}</p>`
  }
  const clickable = options.clickable !== false
  return `<ul class="sale-card-list">${rows.map((sale) => {
    const status = saleStatusLabel(sale.payment_status)
    const tone = saleStatusTone(sale.payment_status)
    const who = [sale.seller_name, saleChannelLabel(sale.channel)].filter(Boolean).join(" · ")
    const when = formatWhen(sale.created_at)
    const tag = clickable ? "button" : "article"
    const attrs = clickable
      ? ` type="button" class="sale-card" data-sale-id="${escapeHtml(sale.id)}"`
      : ` class="sale-card sale-card--static"`
    const statusChip = status
      ? `<span class="sale-chip sale-chip--status sale-chip--${tone}">${escapeHtml(status)}</span>`
      : ""
    return `<li><${tag}${attrs}>
      ${salePhotoHtml(sale)}
      <span class="sale-card__copy">
        <strong>${escapeHtml(sale.customer_name || "Cliente")}</strong>
        <small>${escapeHtml(who)}</small>
        <small>${escapeHtml(when)}</small>
        ${statusChip}
      </span>
      <span class="sale-card__side">
        <b>${escapeHtml(money(sale.total, formatMoney))}</b>
        <small>${Number(sale.items_count) || (sale.items || []).length || 0} un.</small>
      </span>
    </${tag}></li>`
  }).join("")}</ul>`
}

export function readSaleEditForm(root) {
  if (!root) return null
  const totalRaw = root.querySelector("#sale-edit-total")?.value
  const pieces = [...root.querySelectorAll(".sale-edit__piece[data-item-index]")].map((node) => ({
    id: node.getAttribute("data-item-id") || null,
    code: node.getAttribute("data-code") || "",
    component_id: node.getAttribute("data-component-id") || null,
    name: node.querySelector('[data-edit="name"]')?.value ?? "",
    quantity: node.querySelector('[data-edit="quantity"]')?.value ?? "",
    unit_price: node.querySelector('[data-edit="unit_price"]')?.value ?? ""
  }))
  return {
    id: root.getAttribute("data-sale-id"),
    total: totalRaw,
    pieces
  }
}

/**
 * Aceita "882,55", "1.234,56", "R$ 882,55" e também "882.55" (o campo vem
 * preenchido com o número do banco, com ponto decimal). Antes, "882.55" virava
 * 88255 e "882.6" virava 8826 (bug da venda #146).
 */
export function parseMoneyInput(raw) {
  if (raw == null || raw === "") return null
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  let text = String(raw).trim().replace(/\s/g, "").replace(/^R\$/i, "")
  if (!text) return null
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".")
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "")
  }
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null
  const number = Number(text)
  return Number.isFinite(number) ? number : null
}

/** Corpo de POST admin-sale-update (back PR #18). */
export function saleUpdatePayload(orderId, form) {
  const items = (form?.pieces || []).map((piece) => {
    const item = {
      code: String(piece.code || "").trim(),
      quantity: Math.max(0, Math.trunc(Number(piece.quantity) || 0))
    }
    const id = Number(piece.id)
    if (Number.isInteger(id) && id > 0) item.id = id
    const componentId = Number(piece.component_id)
    if (Number.isInteger(componentId) && componentId > 0) item.component_id = componentId
    const unit = parseMoneyInput(piece.unit_price)
    if (unit != null) item.unit_price = unit
    return item
  }).filter((item) => item.code || item.id || item.component_id)
  const body = { order_id: Number(orderId) }
  const total = parseMoneyInput(form?.total)
  if (total != null) body.total = total
  if (items.length) body.items = items
  return body
}

export function saleCancelPayload(orderId) {
  return { order_id: Number(orderId) }
}

export function saleMarkPaidPayload(orderId) {
  return { order_id: Number(orderId) }
}

/** Normaliza a resposta de admin-sale-get. */
export function normalizeAdminSale(data) {
  const sale = data?.sale || data
  if (!sale || sale.id == null) return null
  return {
    id: sale.id,
    created_at: sale.created_at || "",
    seller_name: sale.seller_name || "",
    channel: sale.channel || "",
    customer_name: sale.customer_name || "",
    total: sale.total,
    payment_status: sale.payment_status || "",
    payment_method: sale.payment_method || "",
    items_count: Number(sale.items_count) || (Array.isArray(sale.items) ? sale.items.length : 0),
    image_url: String(sale.image_url || "").trim(),
    items: normalizeSaleItems(sale.items).map((item, index) => ({
      ...item,
      component_id: sale.items?.[index]?.component_id ?? item.component_id ?? null
    }))
  }
}
