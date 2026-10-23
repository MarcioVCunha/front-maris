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
  pending: "A confirmar",
  a_confirmar: "A confirmar"
}

const STATUS_TONE = {
  paid: "paid",
  partial: "confirm",
  receivable: "receivable",
  cancelled: "cancelled",
  canceled: "cancelled",
  to_confirm: "confirm",
  pending: "confirm",
  a_confirmar: "confirm"
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

export function copyDeliveryFields(raw) {
  const source = raw || {}
  return {
    delivery_type: source.delivery_type || "",
    ship_to: source.ship_to && typeof source.ship_to === "object" ? source.ship_to : null,
    shipping_service: source.shipping_service || "",
    shipping_service_id: source.shipping_service_id ?? null,
    shipping_cost: source.shipping_cost == null || source.shipping_cost === "" ? null : Number(source.shipping_cost),
    shipping_deadline_days: source.shipping_deadline_days == null || source.shipping_deadline_days === ""
      ? null
      : Number(source.shipping_deadline_days),
    tracking_code: source.tracking_code || "",
    tracking_url: source.tracking_url || "",
    shipped_at: source.shipped_at || "",
    delivered_at: source.delivered_at || "",
    customer_email: source.customer_email || "",
    customer_cpf_masked: source.customer_cpf_masked || ""
  }
}

export function formatShipTo(ship) {
  if (!ship || typeof ship !== "object") return ""
  const line = [ship.rua, ship.numero].filter(Boolean).join(", ")
  const extra = [ship.complemento, ship.bairro, ship.cidade, ship.uf, ship.cep].filter(Boolean).join(" · ")
  return [line, extra].filter(Boolean).join(" · ")
}

export function renderSaleDelivery(sale) {
  const delivery = copyDeliveryFields(sale)
  if (!delivery.delivery_type && delivery.shipping_cost == null && !delivery.customer_cpf_masked && !delivery.ship_to) {
    return ""
  }
  const type = delivery.delivery_type === "envio"
    ? "Envio"
    : delivery.delivery_type === "retirada"
      ? "Retirada"
      : ""
  const cost = delivery.shipping_cost == null ? "" : formatBrlLoose(delivery.shipping_cost)
  const days = delivery.shipping_deadline_days == null ? "" : `${delivery.shipping_deadline_days} dias`
  const rows = [
    type ? ["Entrega", type] : null,
    delivery.shipping_service ? ["Serviço", delivery.shipping_service] : null,
    cost ? ["Frete", cost] : null,
    days ? ["Prazo", days] : null,
    formatShipTo(delivery.ship_to) ? ["Endereço", formatShipTo(delivery.ship_to)] : null,
    delivery.customer_cpf_masked ? ["CPF", delivery.customer_cpf_masked] : null,
    delivery.tracking_code ? ["Rastreio", delivery.tracking_code] : null
  ].filter(Boolean)
  if (!rows.length) return ""
  return `<section class="sale-delivery">${rows.map(([label, value]) =>
    `<p><span>${escapeHtml(label)}</span> ${escapeHtml(value)}</p>`
  ).join("")}${delivery.tracking_url ? `<p><a href="${escapeHtml(delivery.tracking_url)}" target="_blank" rel="noopener">Abrir rastreio</a></p>` : ""}</section>`
}

function formatBrlLoose(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ""
  return `R$ ${number.toFixed(2).replace(".", ",")}`
}

export function renderShippingToggle(enabled) {
  const checked = enabled ? "checked" : ""
  return `<label class="ship-settings"><input id="shipping-enabled-toggle" type="checkbox" ${checked}><span>Envio pelo Melhor Envio</span></label>`
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
  if (key === "a_enviar" || key === "retirada") return sales || []
  if (key === "partial" || key === "a_confirmar") {
    return (sales || []).filter((sale) => {
      const s = saleStatusKey(sale?.payment_status)
      return s === "partial" || s === "to_confirm" || s === "pending" || s === "a_confirmar"
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
    legacy_sale_id: item?.legacy_sale_id == null ? null : Number(item.legacy_sale_id),
    status: String(item?.status || item?.item_status || "").trim()
  }))
}

export function canReturnItem(item) {
  const id = Number(item?.id)
  if (!Number.isInteger(id) || id <= 0) return false
  const status = String(item?.status || "").trim().toLowerCase()
  if (!status) return true
  return status === "ativo" || status === "active"
}

function returnItemButton(item) {
  if (!canReturnItem(item)) return ""
  return `<button type="button" class="btn-ghost sale-return-btn" data-return-item="${escapeHtml(item.id)}">Devolver peça</button>`
}

export function isSaleBugged(sale) {
  if (!sale) return false
  const pieces = Array.isArray(sale.items) ? sale.items.length : 0
  const count = pieces || Number(sale.items_count) || 0
  return count === 0 || (Number(sale.total) || 0) === 0
}

const SALE_BUG_TEXT = "Venda sem peças ou com total zerado"

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
          ${returnItemButton(item)}
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
        ${returnItemButton(item)}
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

  const bugBanner = isSaleBugged(sale)
    ? `<p class="sale-bug-warning" role="alert">⚠️ ${SALE_BUG_TEXT}</p>`
    : ""

  return `<div class="sale-edit" data-sale-id="${escapeHtml(sale.id)}">
    <p class="kicker">${escapeHtml([channel, when].filter(Boolean).join(" · "))}</p>
    <h2>${escapeHtml(sale.customer_name || "Cliente")}</h2>
    ${bugBanner}
    ${saleMetaChipsHtml(sale)}
    ${renderSaleDelivery(sale)}
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
  return `<ul class="sale-card-list ui-card-grid">${rows.map((sale) => {
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
    const bugChip = isSaleBugged(sale)
      ? `<span class="sale-chip sale-chip--bug" title="${SALE_BUG_TEXT}">⚠️ Revisar</span>`
      : ""
    return `<li><${tag}${attrs}>
      ${salePhotoHtml(sale)}
      <span class="sale-card__copy">
        <strong>${escapeHtml(sale.customer_name || "Cliente")}</strong>
        <small>${escapeHtml(who)}</small>
        <small>${escapeHtml(when)}</small>
        ${statusChip}${bugChip}
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

export function confirmOrderPayload(orderId) {
  const id = Number(orderId)
  if (!Number.isInteger(id) || id <= 0) return null
  return { order_id: id }
}

export function returnOrderItemsPayload(orderId, itemId) {
  const order = Number(orderId)
  const item = Number(itemId)
  if (!Number.isInteger(order) || order <= 0) return null
  if (!Number.isInteger(item) || item <= 0) return null
  return { order_id: order, item_ids: [item], restore_stock: true }
}

export function reserveHint(hoursLeft) {
  const hours = Number(hoursLeft)
  if (!Number.isFinite(hours)) return { urgent: true, text: "Reserva perto de vencer" }
  if (hours <= 0) return { urgent: true, text: "Reserva vencendo" }
  const rounded = Math.round(hours * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",")
  return {
    urgent: hours <= 6,
    text: `Reserva acaba em ${text} h`
  }
}

export function normalizeExpiringOrders(data) {
  if (!data || data.ok === false || !Array.isArray(data.orders)) return null
  return data.orders.map((order) => {
    const items = normalizeSaleItems(order.items)
    const hours = Number(order.hours_left)
    return {
      id: order.id,
      created_at: order.reserved_until || "",
      seller_id: order.seller_id == null || order.seller_id === "" ? null : Number(order.seller_id),
      seller_name: order.seller_name || "",
      channel: "",
      customer_name: order.customer_name || "",
      customer_whatsapp: order.customer_whatsapp || "",
      total: order.total,
      payment_status: "a_confirmar",
      payment_method: "",
      ...copyDeliveryFields(order),
      reserved_until: order.reserved_until || "",
      expiry_notice_at: order.expiry_notice_at || "",
      hours_left: Number.isFinite(hours) ? hours : null,
      items_count: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      items
    }
  })
}

export function renderExpiringOrderCards(orders) {
  const rows = Array.isArray(orders) ? orders : []
  if (!rows.length) return `<p class="empty">Nenhum pedido a confirmar.</p>`
  return `<ul class="sale-card-list ui-card-grid">${rows.map((order) => {
    const hint = reserveHint(order.hours_left)
    const pieces = (order.items || []).map((item) => item.name || item.code).filter(Boolean).slice(0, 2).join(", ")
    const urgent = hint.urgent ? " sale-card--expiring" : ""
    return `<li><article class="sale-card sale-card--stack${urgent}" data-sale-id="${escapeHtml(order.id)}">
      <span class="sale-card__row">
        ${salePhotoHtml(order)}
        <span class="sale-card__copy">
          <strong>${escapeHtml(order.customer_name || "Cliente")}</strong>
          <small>${escapeHtml(order.seller_name || "")}</small>
          <small>${escapeHtml(pieces)}</small>
          <span class="sale-chip sale-chip--status sale-chip--confirm">A confirmar</span>
        </span>
      </span>
      <p class="sale-card__reserve">${escapeHtml(hint.text)}</p>
      <div class="sale-card__actions">
        <button type="button" class="btn-primary sale-confirm-btn" data-confirm-order="${escapeHtml(order.id)}">Confirmar pedido</button>
      </div>
    </article></li>`
  }).join("")}</ul>`
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
    ...copyDeliveryFields(sale),
    items_count: Number(sale.items_count) || (Array.isArray(sale.items) ? sale.items.length : 0),
    image_url: String(sale.image_url || "").trim(),
    items: normalizeSaleItems(sale.items).map((item, index) => ({
      ...item,
      component_id: sale.items?.[index]?.component_id ?? item.component_id ?? null
    }))
  }
}
