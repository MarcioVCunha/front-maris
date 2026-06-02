;(function () {
  const { createSupabaseClient, formatMoneyBRL, roundMoney, onlyDigits } = window.MarisUtils
  const supabase = createSupabaseClient()
  const CART_STORAGE_KEY = "maris_catalog_cart_v2"
  const BUYER_STORAGE_KEY = "maris_buyer_profile_v1"

  let cartItems = []
  let productsByCode = Object.create(null)
  let componentsById = Object.create(null)
  let sellers = []

  const fab = document.getElementById("cart-fab")
  const panel = document.getElementById("cart-panel")
  const panelBackdrop = document.getElementById("cart-panel-backdrop")
  const panelClose = document.getElementById("cart-panel-close")
  const cartItemsEl = document.getElementById("cart-items-list")
  const cartSubtotalEl = document.getElementById("cart-subtotal")
  const cartCountEl = document.getElementById("cart-fab-count")
  const headerCartBtn = document.getElementById("header-cart-btn")
  const headerCartCount = document.getElementById("header-cart-count")
  const shareBtn = document.getElementById("cart-share-btn")
  const shareModal = document.getElementById("cart-share-modal")
  const shareStepStock = document.getElementById("share-step-stock")
  const shareStepSeller = document.getElementById("share-step-seller")
  const shareStockIssues = document.getElementById("share-stock-issues")
  const shareSellerSelect = document.getElementById("share-seller-select")
  const shareConfirmBtn = document.getElementById("share-confirm-btn")
  const shareContinueBtn = document.getElementById("share-continue-btn")
  const shareSuccess = document.getElementById("share-success")
  const shareMessage = document.getElementById("cart-share-message")

  function safeParseJson(value, fallback) {
    try {
      if (!value) return fallback
      const parsed = JSON.parse(value)
      return parsed ?? fallback
    } catch {
      return fallback
    }
  }

  function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null
    const quantity = Number(raw.quantity) || 0
    if (quantity <= 0) return null
    const productCode = raw.product_code ? String(raw.product_code) : null
    const componentId = Number(raw.component_id) || null
    if (!productCode && !componentId) return null
    if (productCode && componentId) return null
    return { product_code: productCode, component_id: componentId, quantity }
  }

  function loadCartFromStorage() {
    const rawList = safeParseJson(localStorage.getItem(CART_STORAGE_KEY), [])
    if (!Array.isArray(rawList)) {
      cartItems = []
      saveCart()
      return
    }
    cartItems = rawList.map(normalizeItem).filter(Boolean)
    saveCart()
  }

  function getBuyerProfile() {
    return safeParseJson(localStorage.getItem(BUYER_STORAGE_KEY), null)
  }

  function saveBuyerProfile(profile) {
    localStorage.setItem(BUYER_STORAGE_KEY, JSON.stringify(profile))
  }

  function ask(promptText, initial = "") {
    const value = window.prompt(promptText, initial)
    if (value === null) return null
    return value.trim()
  }

  function ensureBuyerProfile() {
    const existing = getBuyerProfile() || {}
    const name = ask("Seu nome completo:", String(existing.name || ""))
    if (!name) return null
    const whatsappInput = ask("Seu WhatsApp com DDD (somente números):", String(existing.whatsapp || ""))
    const whatsapp = onlyDigits(whatsappInput || "")
    if (whatsapp.length < 10) {
      alert("Informe um WhatsApp válido com DDD.")
      return null
    }
    const email = ask("Seu e-mail (opcional):", String(existing.email || "")) || ""
    const profile = { name, whatsapp, email }
    saveBuyerProfile(profile)
    return profile
  }

  function setShareMessage(text, type = "") {
    if (!shareMessage) return
    shareMessage.textContent = text
    shareMessage.className = `cart-share-message ${type}`.trim()
  }

  function updateFabCount() {
    const count = cartItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
    if (cartCountEl) cartCountEl.textContent = String(count)
    if (headerCartCount) headerCartCount.textContent = String(count)
    const show = count > 0
    if (fab) fab.hidden = !show
    if (headerCartBtn) headerCartBtn.hidden = !show
  }

  function lineLabel(item) {
    if (item.component_id) {
      const c = componentsById[item.component_id]
      return { name: c?.name || "Componente", code: c?.product_code || "" }
    }
    const p = productsByCode[item.product_code]
    return { name: p?.name || item.product_code, code: item.product_code }
  }

  function lineUnitPrice(item) {
    if (item.component_id) {
      return Number(componentsById[item.component_id]?.unit_price) || 0
    }
    return Number(productsByCode[item.product_code]?.unit_price) || 0
  }

  function renderCartPanel() {
    if (!cartItems.length) {
      cartItemsEl.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>'
      cartSubtotalEl.textContent = formatMoneyBRL(0)
      updateFabCount()
      return
    }

    let subtotal = 0
    cartItemsEl.innerHTML = cartItems
      .map((item) => {
        const { name, code } = lineLabel(item)
        const unit = lineUnitPrice(item)
        const qty = Number(item.quantity) || 0
        const total = roundMoney(unit * qty)
        subtotal += total
        const key = item.component_id ? `c-${item.component_id}` : `p-${item.product_code}`
        return `
          <div class="cart-line" data-key="${key}">
            <div class="cart-line-info">
              <strong>${name}</strong>
              <span class="cart-line-code">${code}</span>
            </div>
            <div class="cart-line-actions">
              <button type="button" class="cart-qty-minus" data-key="${key}" aria-label="Menos">−</button>
              <span class="cart-qty">${qty}</span>
              <button type="button" class="cart-qty-plus" data-key="${key}" aria-label="Mais">+</button>
              <button type="button" class="cart-remove" data-key="${key}">Remover</button>
            </div>
            <div class="cart-line-total">${formatMoneyBRL(total)}</div>
          </div>
        `
      })
      .join("")

    cartSubtotalEl.textContent = formatMoneyBRL(subtotal)
    updateFabCount()
    saveCart()
  }

  window.MarisCatalogCart = {
    setCatalogData({ products, components }) {
      productsByCode = Object.create(null)
      for (const p of products || []) productsByCode[p.code] = p
      componentsById = Object.create(null)
      for (const c of components || []) componentsById[c.id] = c
    },

    async init() {
      loadCartFromStorage()
      renderCartPanel()
      await this.loadSellers()
    },

    async loadSellers() {
      const { data } = await supabase.from("sellers").select("id, name").eq("is_active", true).order("name")
      sellers = data || []
    },

    async addProduct(productCode, quantity = 1) {
      const existing = cartItems.find((i) => i.product_code === productCode && !i.component_id)
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + quantity
      } else {
        const item = { product_code: productCode, component_id: null, quantity }
        cartItems.push(item)
      }
      renderCartPanel()
      return true
    },

    async addComponent(componentId, quantity = 1) {
      const existing = cartItems.find((i) => i.component_id === componentId)
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + quantity
      } else {
        const item = { product_code: null, component_id: componentId, quantity }
        cartItems.push(item)
      }
      renderCartPanel()
      return true
    },

    ensureBuyerProfile,

    openPanel() {
      if (panel) {
        panel.hidden = false
        document.body.classList.add("cart-panel-open")
      }
    },

    closePanel() {
      if (panel) {
        panel.hidden = true
        document.body.classList.remove("cart-panel-open")
      }
    }
  }

  function findItemByKey(key) {
    if (key.startsWith("c-")) {
      const id = Number(key.slice(2))
      return cartItems.find((i) => i.component_id === id)
    }
    const code = key.slice(2)
    return cartItems.find((i) => i.product_code === code && !i.component_id)
  }

  cartItemsEl?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button")
    if (!btn) return
    const key = btn.getAttribute("data-key")
    if (!key) return
    const item = findItemByKey(key)
    if (!item) return

    if (btn.classList.contains("cart-remove")) {
      cartItems = cartItems.filter((i) => i !== item)
      renderCartPanel()
      return
    }

    if (btn.classList.contains("cart-qty-plus")) {
      item.quantity = (Number(item.quantity) || 0) + 1
      renderCartPanel()
      return
    }

    if (btn.classList.contains("cart-qty-minus")) {
      item.quantity = Math.max(0, (Number(item.quantity) || 0) - 1)
      if (item.quantity <= 0) {
        cartItems = cartItems.filter((i) => i !== item)
      }
      renderCartPanel()
    }
  })

  fab?.addEventListener("click", () => MarisCatalogCart.openPanel())
  headerCartBtn?.addEventListener("click", () => MarisCatalogCart.openPanel())
  panelClose?.addEventListener("click", () => MarisCatalogCart.closePanel())
  panelBackdrop?.addEventListener("click", () => MarisCatalogCart.closePanel())

  shareBtn?.addEventListener("click", async () => {
    if (!cartItems.length) {
      setShareMessage("Adicione itens antes de compartilhar.", "error")
      return
    }
    setShareMessage("")
    shareStepStock.hidden = false
    shareStepSeller.hidden = true
    shareSuccess.hidden = true
    shareModal.hidden = false

    const buyer = ensureBuyerProfile()
    if (!buyer) return
    const lines = cartItems.map((item) => ({
      product_code: item.product_code || null,
      component_id: item.component_id || null,
      quantity: Number(item.quantity) || 0
    }))

    const res = await fetch(window.ENV.SUPABASE_CART_SHARE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyer_name: buyer.name,
        buyer_whatsapp: buyer.whatsapp,
        buyer_email: buyer.email,
        lines,
        seller_id: 0,
        dry_run: true
      })
    })
    const data = await res.json()
    if (!res.ok) {
      setShareMessage(data.error || "Não foi possível validar o carrinho.", "error")
      return
    }
    const issues = data.stock_issues || []
    if (issues.length) {
      shareStockIssues.innerHTML = issues
        .map((issue) => {
          if (issue.reason === "out_of_stock") {
            return `<li><strong>${issue.product_name}</strong> (${issue.product_code}) — sem estoque</li>`
          }
          return `<li><strong>${issue.product_name}</strong> — você pediu ${issue.requested}, restam ${issue.available}</li>`
        })
        .join("")
      shareStockIssues.parentElement.hidden = false
    } else {
      shareStockIssues.innerHTML = ""
      shareStockIssues.parentElement.hidden = true
    }
  })

  shareContinueBtn?.addEventListener("click", () => {
    shareStepStock.hidden = true
    shareStepSeller.hidden = false
    shareSellerSelect.innerHTML =
      '<option value="">Selecione a vendedora</option>' +
      sellers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("")
  })

  document.querySelectorAll("[data-close-share]").forEach((el) => {
    el.addEventListener("click", () => {
      shareModal.hidden = true
    })
  })

  shareConfirmBtn?.addEventListener("click", async () => {
    const sellerId = Number(shareSellerSelect.value)
    if (!sellerId) {
      setShareMessage("Selecione uma vendedora.", "error")
      return
    }

    shareConfirmBtn.disabled = true
    try {
      const buyer = ensureBuyerProfile()
      if (!buyer) return
      const lines = cartItems.map((item) => ({
        product_code: item.product_code || null,
        component_id: item.component_id || null,
        quantity: Number(item.quantity) || 0
      }))
      const res = await fetch(window.ENV.SUPABASE_CART_SHARE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: buyer.name,
          buyer_whatsapp: buyer.whatsapp,
          buyer_email: buyer.email,
          lines,
          seller_id: sellerId
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setShareMessage(data.error || "Erro ao compartilhar.", "error")
        return
      }
      shareStepSeller.hidden = true
      shareStepStock.hidden = true
      shareSuccess.hidden = false
      cartItems = []
      updateFabCount()
      renderCartPanel()
      MarisCatalogCart.closePanel()
    } catch {
      setShareMessage("Erro de conexão.", "error")
    } finally {
      shareConfirmBtn.disabled = false
    }
  })
})()
