// Conjuntos = divisões de peça (ex.: brinco/colar vendidos separados).
// Categoria = Anel/Brinco/Colar… ADMIN_CONJUNTOS_ENABLED off até back-maris PR #17.
import { escapeEntityHtml, entityPhotoHtml, renderEntityCard } from "./painel-entity.logic.js"
import { componentSku, isComponentSku } from "./painel.logic.js"

export const ADMIN_CONJUNTOS_ENABLED = false

export function shouldShowConjuntos(enabled = ADMIN_CONJUNTOS_ENABLED) {
  return enabled === true
}

export function normalizeDivision(item = {}) {
  return {
    id: item.id == null ? null : Number(item.id),
    name: String(item.name || "").trim(),
    sku: String(item.sku || "").trim(),
    quantity: Number.isFinite(Number(item.quantity)) ? Math.max(0, Math.trunc(Number(item.quantity))) : 0,
    price_percent: item.price_percent == null || item.price_percent === ""
      ? null
      : Number(item.price_percent),
    is_active: item.is_active !== false
  }
}

export function divisionsOf(piece) {
  const list = Array.isArray(piece?.components) ? piece.components : []
  return list.map(normalizeDivision).filter((row) => row.name || row.id)
}

export function piecesWithDivisions(products) {
  return (products || []).filter((piece) => divisionsOf(piece).length > 0)
}

export function piecesWithoutDivisions(products) {
  return (products || []).filter((piece) => divisionsOf(piece).length === 0)
}

export function filterPiecesByQuery(products, query) {
  const needle = String(query || "").trim().toLocaleLowerCase("pt-BR")
  if (!needle) return products || []
  return (products || []).filter((piece) => {
    const hay = [piece?.code, piece?.name, piece?.categoria].join(" ").toLocaleLowerCase("pt-BR")
    return hay.includes(needle)
  })
}

export function divisionSkuPayload(productCode, division) {
  const name = String(division?.name || "").trim()
  const sku = String(division?.sku || "").trim() || componentSku(productCode, name)
  return {
    id: division?.id == null ? null : Number(division.id),
    name,
    sku,
    quantity: Number.isInteger(Number(division?.quantity)) ? Number(division.quantity) : 0,
    price_percent: Number(division?.price_percent),
    is_active: division?.is_active !== false
  }
}

/** Corpo de admin-product-components (PR #17). */
export function saveDivisionsPayload(productCode, divisions) {
  return {
    product_code: String(productCode || "").trim(),
    components: (divisions || []).map((row) => {
      const item = divisionSkuPayload(productCode, row)
      const body = {
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        price_percent: item.price_percent,
        is_active: item.is_active
      }
      if (Number.isInteger(item.id) && item.id > 0) body.id = item.id
      return body
    })
  }
}

export function validateDivisionsPayload(payload) {
  if (!payload?.product_code) return "Informe o código da peça."
  const rows = payload.components || []
  if (!rows.length) return "Inclua ao menos uma divisão."
  for (const row of rows) {
    if (!row.name) return "Informe o nome de cada divisão."
    if (!Number.isFinite(row.price_percent) || row.price_percent <= 0 || row.price_percent > 999.99) {
      return `${row.name}: informe a % do preço (maior que zero).`
    }
    if (!Number.isInteger(row.quantity) || row.quantity < 0) {
      return `${row.name}: a quantidade precisa ser um inteiro ≥ 0.`
    }
    if (row.sku && !isComponentSku(row.sku, payload.product_code)) {
      return `${row.name}: o SKU precisa seguir ${payload.product_code}-DIVISAO.`
    }
  }
  return ""
}

function divisionSummary(divisions) {
  return (divisions || []).map((row) => {
    const pct = row.price_percent == null || Number.isNaN(Number(row.price_percent))
      ? "—"
      : `${String(row.price_percent).replace(".", ",")}%`
    return `${row.name || "Divisão"} · ${row.sku || "sem SKU"} · ${row.quantity} un. · ${pct}`
  })
}

export function renderConjuntoCard(piece) {
  const divisions = divisionsOf(piece)
  const photo = entityPhotoHtml({
    image_url: Array.isArray(piece.image_urls) ? piece.image_urls[0] : piece.image_url,
    code: piece.code,
    name: piece.name
  })
  const meta = [
    [piece.code, piece.categoria].filter(Boolean).join(" · "),
    ...divisionSummary(divisions).slice(0, 3)
  ]
  if (divisions.length > 3) meta.push(`+${divisions.length - 3} divisões`)
  return `<li>${renderEntityCard({
    title: piece.name || piece.code || "Peça",
    meta,
    sideTitle: `${divisions.length} div.`,
    sideMeta: "Editar",
    photo,
    attrs: `data-product-code="${escapeEntityHtml(piece.code || "")}"`,
    clickable: true
  })}</li>`
}

export function renderConjuntosList(products) {
  const rows = piecesWithDivisions(products)
  if (!rows.length) {
    return `<p class="empty">Nenhuma peça com divisões ainda. Use “Criar divisões” para começar.</p>`
  }
  return `<ul class="entity-card-list">${rows.map(renderConjuntoCard).join("")}</ul>`
}

function divisionRowHtml(division, productCode, index) {
  const row = normalizeDivision(division)
  const suggested = row.sku || componentSku(productCode, row.name)
  return `<article class="division-row" data-division-index="${index}">
    <input type="hidden" data-field="id" value="${escapeEntityHtml(row.id ?? "")}">
    <label class="field"><span>Nome da divisão</span>
      <input data-field="name" value="${escapeEntityHtml(row.name)}" placeholder="Ex.: Brinco" required></label>
    <label class="field"><span>SKU</span>
      <input data-field="sku" value="${escapeEntityHtml(suggested)}" placeholder="${escapeEntityHtml(componentSku(productCode, "DIVISAO"))}"></label>
    <label class="field"><span>Qtd</span>
      <input data-field="quantity" inputmode="numeric" value="${escapeEntityHtml(row.quantity)}"></label>
    <label class="field"><span>% preço</span>
      <input data-field="price_percent" inputmode="decimal" value="${escapeEntityHtml(row.price_percent ?? "")}" placeholder="Ex.: 45"></label>
    <button type="button" class="btn-ghost division-remove" data-remove-index="${index}">Remover</button>
  </article>`
}

export function renderConjuntoEditDialog(piece, options = {}) {
  const code = String(piece?.code || "").trim()
  const divisions = options.divisions || divisionsOf(piece)
  const rows = divisions.length
    ? divisions.map((row, index) => divisionRowHtml(row, code, index)).join("")
    : divisionRowHtml({ name: "", quantity: 0, price_percent: "" }, code, 0)
  return `<div class="conjunto-edit" data-product-code="${escapeEntityHtml(code)}">
    <p class="kicker">${escapeEntityHtml(code)}</p>
    <h2>${escapeEntityHtml(piece?.name || "Peça")}</h2>
    <p class="hint">Divisões do conjunto (não confundir com a categoria ${escapeEntityHtml(piece?.categoria || "—")}).</p>
    <div id="division-rows" class="division-rows">${rows}</div>
    <div class="dialog-actions conjunto-edit__toolbar">
      <button type="button" class="btn-ghost" id="division-add">Adicionar divisão</button>
      <button type="button" class="btn-ghost" id="conjunto-edit-close">Fechar</button>
      <button type="button" class="btn-primary" id="conjunto-edit-save">Salvar divisões</button>
    </div>
  </div>`
}

export function renderConjuntoCreatePicker(products, query = "") {
  const candidates = filterPiecesByQuery(piecesWithoutDivisions(products), query)
  const list = candidates.length
    ? `<ul class="entity-card-list">${candidates.slice(0, 20).map((piece) => {
      const photo = entityPhotoHtml({
        image_url: Array.isArray(piece.image_urls) ? piece.image_urls[0] : piece.image_url,
        code: piece.code,
        name: piece.name
      })
      return `<li>${renderEntityCard({
        title: piece.name || piece.code || "Peça",
        meta: [[piece.code, piece.categoria].filter(Boolean).join(" · ")],
        sideTitle: "Criar",
        photo,
        attrs: `data-create-code="${escapeEntityHtml(piece.code || "")}"`,
        clickable: true
      })}</li>`
    }).join("")}</ul>`
    : `<p class="empty">Nenhuma peça sem divisões encontrada.</p>`
  return `<div class="conjunto-create">
    <h2>Criar divisões</h2>
    <p class="hint">Busque uma peça (por código ou nome) que ainda não tem divisões.</p>
    <form id="conjunto-search" class="stock-tools" role="search">
      <label class="field"><span>Buscar peça</span>
        <input id="conjunto-query" type="search" value="${escapeEntityHtml(query)}" placeholder="Nome ou código"></label>
    </form>
    <div id="conjunto-picker-list">${list}</div>
    <div class="dialog-actions">
      <button type="button" class="btn-ghost" id="conjunto-create-close">Fechar</button>
    </div>
  </div>`
}

export function renderConjuntosPage(products, options = {}) {
  if (!shouldShowConjuntos(options.enabled)) {
    return renderLegacyConjuntos(products)
  }
  return `<section class="report report--conjuntos">
    <header class="conjuntos-hero">
      <h2>Conjuntos</h2>
      <p class="hint">Peças com divisões (brinco, colar…) vendidas separadas. A categoria da peça continua Anel, Brinco, Colar…</p>
      <button type="button" class="btn-primary" id="conjunto-create-open">Criar divisões</button>
    </header>
    ${renderConjuntosList(products)}
  </section>`
}

/** Fallback com a flag off: editor de SKU legado, textos de divisão. */
export function renderLegacyConjuntos(products) {
  const blocks = []
  for (const piece of products || []) {
    const components = divisionsOf(piece)
    if (!components.length) continue
    const rows = components.map((item) => {
      const suggested = item.sku || componentSku(piece.code, item.name)
      return `<label class="sku-row">
        <span>${escapeEntityHtml(item.name || "Divisão")}</span>
        <input data-component-id="${escapeEntityHtml(item.id)}" data-product-code="${escapeEntityHtml(piece.code)}" value="${escapeEntityHtml(suggested)}" placeholder="${escapeEntityHtml(componentSku(piece.code, item.name))}">
      </label>`
    }).join("")
    blocks.push(`<section class="tipo-block">
      <h2>${escapeEntityHtml(piece.name || piece.code)}</h2>
      <p class="hint">${escapeEntityHtml(piece.code)}-<span>DIVISAO</span> · categoria ${escapeEntityHtml(piece.categoria || "—")}</p>
      ${rows}
    </section>`)
  }
  if (!blocks.length) {
    return `<section class="report">
      <h2>Conjuntos</h2>
      <p class="empty">Nenhuma peça com divisões. A tela completa (cards + criar divisões) liga com ADMIN_CONJUNTOS_ENABLED quando o back-maris PR #17 estiver no ar.</p>
    </section>`
  }
  return `<section class="report">
    <h2>Conjuntos</h2>
    <p class="hint">Editor de SKU das divisões. Cards e criação completa ficam atrás de ADMIN_CONJUNTOS_ENABLED (back PR #17).</p>
    <form id="tipos-form" class="stack">${blocks.join("")}<button class="btn-primary" type="submit">Salvar SKUs</button></form>
  </section>`
}

export function readDivisionRows(root) {
  if (!root) return []
  return [...root.querySelectorAll(".division-row")].map((node) => {
    const idRaw = node.querySelector('[data-field="id"]')?.value
    const id = idRaw === "" || idRaw == null ? null : Number(idRaw)
    return {
      id: Number.isInteger(id) && id > 0 ? id : null,
      name: node.querySelector('[data-field="name"]')?.value ?? "",
      sku: node.querySelector('[data-field="sku"]')?.value ?? "",
      quantity: node.querySelector('[data-field="quantity"]')?.value ?? "0",
      price_percent: node.querySelector('[data-field="price_percent"]')?.value ?? "",
      is_active: true
    }
  })
}
