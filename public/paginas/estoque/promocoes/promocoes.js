const { escapeHtml, setFeedback, bindDebouncedSearch } = window.MarisUI
const {
  PROMO_CATEGORIES,
  computePromotionStatus,
  formatDiscountDisplay,
  formatDateRange,
  toLocalDatetimeInput,
  formatUnitsLimit,
  parseProductCodes,
  validatePromotionPayload,
  filterPromotions,
} = window.MarisPromocoesLogic

const listEl = document.getElementById("promo-list")
const loadingEl = document.getElementById("promo-loading")
const feedbackEl = document.getElementById("promo-feedback")
const searchInput = document.getElementById("promo-search")
const statusFilterEl = document.querySelector(".promo-status-filter")
const newBtn = document.getElementById("promo-new-btn")

// Modal Dialog & Form
const dialogEl = document.getElementById("promo-dialog")
const dialogCloseBtn = document.getElementById("promo-dialog-close-btn")
const dialogCancelBtn = document.getElementById("promo-dialog-cancel")
const dialogSubmitBtn = document.getElementById("promo-dialog-submit")
const dialogTitleEl = document.getElementById("promo-dialog-title")
const dialogFeedbackEl = document.getElementById("promo-dialog-feedback")
const formEl = document.getElementById("promo-form")
const idInput = document.getElementById("promo-form-id")
const nameInput = document.getElementById("promo-form-name")
const scopeSelect = document.getElementById("promo-form-scope")
const groupCategory = document.getElementById("promo-group-category")
const categorySelect = document.getElementById("promo-form-category")
const groupProducts = document.getElementById("promo-group-products")
const codesInput = document.getElementById("promo-form-codes")
const discountTypeSelect = document.getElementById("promo-form-discount-type")
const valueLabel = document.getElementById("promo-value-label")
const valueInput = document.getElementById("promo-form-value")
const startsAtInput = document.getElementById("promo-form-starts-at")
const endsAtInput = document.getElementById("promo-form-ends-at")
const maxUnitsInput = document.getElementById("promo-form-max-units")
const activeCheckbox = document.getElementById("promo-form-active")

let allPromotions = []
let currentFilter = "all"
let searchTerm = ""

function showPageFeedback(text, type = "") {
  setFeedback(feedbackEl, text, type, { baseClass: "promo-feedback" })
}

function showDialogFeedback(text, type = "") {
  setFeedback(dialogFeedbackEl, text, type, { baseClass: "promo-feedback" })
}

function initCategoryOptions() {
  if (!categorySelect) return
  categorySelect.innerHTML = PROMO_CATEGORIES.map(
    (cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
  ).join("")
}

function syncScopeVisibility() {
  const isCategory = scopeSelect.value === "categoria"
  groupCategory.hidden = !isCategory
  groupProducts.hidden = isCategory
}

function syncDiscountType() {
  const isPercent = discountTypeSelect.value === "percent"
  if (isPercent) {
    valueLabel.textContent = "Desconto (% OFF) *"
    valueInput.placeholder = "Ex: 15"
    valueInput.max = "100"
  } else {
    valueLabel.textContent = "Desconto (R$ OFF) *"
    valueInput.placeholder = "Ex: 25.00"
    valueInput.removeAttribute("max")
  }
}

function renderCard(promo) {
  const status = computePromotionStatus(promo)
  const discount = formatDiscountDisplay(promo)
  const dates = formatDateRange(promo.starts_at, promo.ends_at)
  const units = formatUnitsLimit(promo.units_sold, promo.max_units)

  const isScopeProduct = promo.scope === "produto"
  const codes = Array.isArray(promo.product_codes) ? promo.product_codes : parseProductCodes(promo.product_codes)

  const scopeHtml = isScopeProduct
    ? `<span>🏷️ Peças (${codes.length}): <span class="promo-codes-list">${
        codes.length
          ? codes.map((c) => `<code class="promo-code-chip">${escapeHtml(c)}</code>`).join(" ")
          : '<em class="field-hint">Nenhuma peça informada</em>'
      }</span></span>`
    : `<span>📂 Categoria: <strong>${escapeHtml(promo.category || "-")}</strong></span>`

  const canEnd = promo.is_active !== false && status.tone !== "ended"

  return `
    <article class="promo-card" data-id="${promo.id}">
      <div class="promo-card-header">
        <div class="promo-card-title-group">
          <h2 class="promo-card-title">${escapeHtml(promo.name || "Sem nome")}</h2>
          <div class="promo-card-badges">
            <span class="promo-badge promo-badge--${status.tone}">${status.label}</span>
            <span class="promo-discount-tag">${discount}</span>
          </div>
        </div>
      </div>

      <div class="promo-card-meta">
        <div class="promo-meta-row">${scopeHtml}</div>
        <div class="promo-meta-row"><span>📅 ${dates}</span></div>
        <div class="promo-meta-row"><span>🛍️ ${units}</span></div>
      </div>

      <div class="promo-card-actions">
        <button type="button" class="promo-btn-secondary promo-btn-sm" data-action="edit" data-id="${promo.id}">Editar</button>
        ${
          canEnd
            ? `<button type="button" class="promo-btn-secondary promo-btn-danger promo-btn-sm" data-action="end" data-id="${promo.id}">Encerrar</button>`
            : ""
        }
      </div>
    </article>
  `
}

function render() {
  const filtered = filterPromotions(allPromotions, { term: searchTerm, status: currentFilter })

  if (!allPromotions.length) {
    listEl.innerHTML = `
      <div class="promo-empty">
        <p>Nenhuma campanha promocional cadastrada.</p>
        <p class="field-hint">Clique em "+ Nova promoção" para criar a primeira campanha da loja.</p>
      </div>
    `
    return
  }

  if (!filtered.length) {
    listEl.innerHTML = `
      <div class="promo-empty">
        <p>Nenhuma promoção encontrada para os filtros atuais.</p>
      </div>
    `
    return
  }

  listEl.innerHTML = filtered.map(renderCard).join("")
}

async function loadPromotions() {
  if (loadingEl) {
    loadingEl.hidden = false
    loadingEl.innerHTML = window.MarisLoading?.html
      ? window.MarisLoading.html({ block: true, size: "lg" })
      : '<p class="promo-empty">Carregando promoções…</p>'
  }
  listEl.innerHTML = ""

  try {
    const { ok, data } = await window.MarisApi.callFunction(
      window.ENV.fn("admin-promotion-list"),
      { auth: "staff" }
    )

    if (!ok || !data?.ok) {
      showPageFeedback(data?.error || "Não foi possível carregar as promoções.", "error")
      allPromotions = []
    } else {
      allPromotions = data.promotions || []
    }
  } catch (err) {
    showPageFeedback("Erro de conexão ao carregar as promoções.", "error")
    allPromotions = []
  } finally {
    if (loadingEl) loadingEl.hidden = true
    render()
  }
}

function openCreateModal() {
  idInput.value = ""
  dialogTitleEl.textContent = "Nova promoção"
  nameInput.value = ""
  scopeSelect.value = "categoria"
  categorySelect.value = PROMO_CATEGORIES[0] || "Anel"
  codesInput.value = ""
  discountTypeSelect.value = "percent"
  valueInput.value = "10"
  maxUnitsInput.value = ""
  activeCheckbox.checked = true

  const now = new Date()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  startsAtInput.value = toLocalDatetimeInput(now)
  endsAtInput.value = toLocalDatetimeInput(in30Days)

  syncScopeVisibility()
  syncDiscountType()
  showDialogFeedback("")

  dialogEl.showModal()
  nameInput.focus()
}

function openEditModal(promo) {
  if (!promo) return
  idInput.value = promo.id || ""
  dialogTitleEl.textContent = "Editar promoção"
  nameInput.value = promo.name || ""
  scopeSelect.value = promo.scope || "categoria"
  categorySelect.value = promo.category || PROMO_CATEGORIES[0] || "Anel"

  const codes = Array.isArray(promo.product_codes) ? promo.product_codes : parseProductCodes(promo.product_codes)
  codesInput.value = codes.join(", ")

  discountTypeSelect.value = promo.discount_type || "percent"
  valueInput.value = promo.value != null ? promo.value : ""
  startsAtInput.value = toLocalDatetimeInput(promo.starts_at)
  endsAtInput.value = toLocalDatetimeInput(promo.ends_at)
  maxUnitsInput.value = promo.max_units != null ? promo.max_units : ""
  activeCheckbox.checked = promo.is_active !== false

  syncScopeVisibility()
  syncDiscountType()
  showDialogFeedback("")

  dialogEl.showModal()
  nameInput.focus()
}

async function handleSavePromotion(event) {
  event.preventDefault()

  const formData = {
    id: idInput.value ? Number(idInput.value) : null,
    name: nameInput.value,
    scope: scopeSelect.value,
    category: categorySelect.value,
    product_codes: codesInput.value,
    discount_type: discountTypeSelect.value,
    value: Number(valueInput.value),
    starts_at: startsAtInput.value,
    ends_at: endsAtInput.value,
    max_units: maxUnitsInput.value,
    is_active: activeCheckbox.checked,
  }

  const validation = validatePromotionPayload(formData)
  if (!validation.ok) {
    showDialogFeedback(validation.error, "error")
    return
  }

  dialogSubmitBtn.disabled = true
  const prevLabel = dialogSubmitBtn.textContent
  dialogSubmitBtn.textContent = "Salvando…"

  try {
    const { ok, data } = await window.MarisApi.callFunction(
      window.ENV.fn("admin-promotion-save"),
      {
        method: "POST",
        auth: "staff",
        body: validation.payload,
      }
    )

    if (!ok || !data?.ok) {
      showDialogFeedback(data?.error || "Erro ao salvar a promoção.", "error")
      return
    }

    dialogEl.close()
    showPageFeedback("Promoção salva com sucesso!", "success")
    await loadPromotions()
  } catch {
    showDialogFeedback("Erro de conexão ao salvar promoção.", "error")
  } finally {
    dialogSubmitBtn.disabled = false
    dialogSubmitBtn.textContent = prevLabel
  }
}

async function handleEndPromotion(id) {
  const promo = allPromotions.find((p) => p.id === id)
  if (!promo) return

  const confirmed = window.confirm(`Deseja realmente encerrar a promoção "${promo.name}"?`)
  if (!confirmed) return

  try {
    const { ok, data } = await window.MarisApi.callFunction(
      window.ENV.fn("admin-promotion-end"),
      {
        method: "POST",
        auth: "staff",
        body: { id: promo.id },
      }
    )

    if (!ok || !data?.ok) {
      showPageFeedback(data?.error || "Não foi possível encerrar a promoção.", "error")
      return
    }

    showPageFeedback(
      data.already_ended ? "Esta promoção já estava encerrada." : "Promoção encerrada com sucesso!",
      "success"
    )
    await loadPromotions()
  } catch {
    showPageFeedback("Erro de conexão ao encerrar promoção.", "error")
  }
}

// Event Listeners
scopeSelect.addEventListener("change", syncScopeVisibility)
discountTypeSelect.addEventListener("change", syncDiscountType)
newBtn.addEventListener("click", openCreateModal)
dialogCloseBtn.addEventListener("click", () => dialogEl.close())
dialogCancelBtn.addEventListener("click", () => dialogEl.close())
formEl.addEventListener("submit", handleSavePromotion)

dialogEl.addEventListener("click", (event) => {
  if (event.target === dialogEl) dialogEl.close()
})

statusFilterEl?.addEventListener("click", (event) => {
  const btn = event.target.closest(".status-filter-btn")
  if (!btn) return
  statusFilterEl.querySelectorAll(".status-filter-btn").forEach((b) => {
    b.classList.remove("status-filter-btn--active")
    b.setAttribute("aria-selected", "false")
  })
  btn.classList.add("status-filter-btn--active")
  btn.setAttribute("aria-selected", "true")
  currentFilter = btn.dataset.status || "all"
  render()
})

listEl.addEventListener("click", (event) => {
  const actionBtn = event.target.closest("button[data-action]")
  if (!actionBtn) return
  const action = actionBtn.dataset.action
  const id = Number(actionBtn.dataset.id)
  if (action === "edit") {
    const promo = allPromotions.find((p) => p.id === id)
    if (promo) openEditModal(promo)
  } else if (action === "end") {
    handleEndPromotion(id)
  }
})

if (searchInput) {
  bindDebouncedSearch(searchInput, (value) => {
    searchTerm = value
    render()
  })
}

initCategoryOptions()
loadPromotions()
