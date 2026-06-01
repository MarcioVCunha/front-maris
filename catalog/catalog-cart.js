;(function () {
  const { formatMoneyBRL, roundMoney, onlyDigits } = window.MarisUtils
  const auth = window.MarisCustomerAuth

  let draftCartId = null
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

  function setShareMessage(text, type = "") {
    if (!shareMessage) return
    shareMessage.textContent = text
    shareMessage.className = `cart-share-message ${type}`.trim()
  }

  function updateFabCount() {
    const count = cartItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
    if (cartCountEl) cartCountEl.textContent = String(count)
    if (fab) fab.hidden = count <= 0
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
  }

  async function getOrCreateDraftCart() {
    const user = await auth.getUser()
    if (!user) return null

    if (draftCartId) return draftCartId

    const { data: existing } = await auth.supabase
      .from("customer_carts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .maybeSingle()

    if (existing?.id) {
      draftCartId = existing.id
      return draftCartId
    }

    const { data: created, error } = await auth.supabase
      .from("customer_carts")
      .insert({ user_id: user.id, status: "draft" })
      .select("id")
      .single()

    if (error) throw error
    draftCartId = created.id
    return draftCartId
  }

  async function loadDraftItems() {
    const cartId = await getOrCreateDraftCart()
    if (!cartId) return

    const { data, error } = await auth.supabase
      .from("customer_cart_items")
      .select("id, product_code, component_id, quantity")
      .eq("cart_id", cartId)

    if (error) throw error
    cartItems = data || []
    renderCartPanel()
  }

  async function persistItem(item) {
    const cartId = await getOrCreateDraftCart()
    if (!cartId) return

    const row = {
      cart_id: cartId,
      product_code: item.product_code || null,
      component_id: item.component_id || null,
      quantity: item.quantity
    }

    if (item.id) {
      await auth.supabase.from("customer_cart_items").update({ quantity: item.quantity }).eq("id", item.id)
      return
    }

    const { data, error } = await auth.supabase
      .from("customer_cart_items")
      .insert(row)
      .select("id")
      .single()

    if (error) throw error
    item.id = data.id
  }

  async function removeItemFromDb(item) {
    if (!item.id) return
    await auth.supabase.from("customer_cart_items").delete().eq("id", item.id)
  }

  window.MarisCatalogCart = {
    setCatalogData({ products, components }) {
      productsByCode = Object.create(null)
      for (const p of products || []) productsByCode[p.code] = p
      componentsById = Object.create(null)
      for (const c of components || []) componentsById[c.id] = c
    },

    async init() {
      const session = await auth.getSession()
      if (!session?.user) {
        if (fab) fab.hidden = true
        return
      }
      await loadDraftItems()
      await this.loadSellers()
    },

    async loadSellers() {
      const { data } = await auth.supabase.from("sellers").select("id, name").eq("is_active", true).order("name")
      sellers = data || []
    },

    async requireLoginForAction() {
      const session = await auth.requireAuth()
      return Boolean(session)
    },

    async addProduct(productCode, quantity = 1) {
      if (!(await this.requireLoginForAction())) return false

      const existing = cartItems.find((i) => i.product_code === productCode && !i.component_id)
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + quantity
        await persistItem(existing)
      } else {
        const item = { product_code: productCode, component_id: null, quantity }
        await persistItem(item)
        cartItems.push(item)
      }
      renderCartPanel()
      return true
    },

    async addComponent(componentId, quantity = 1) {
      if (!(await this.requireLoginForAction())) return false

      const existing = cartItems.find((i) => i.component_id === componentId)
      if (existing) {
        existing.quantity = (Number(existing.quantity) || 0) + quantity
        await persistItem(existing)
      } else {
        const item = { product_code: null, component_id: componentId, quantity }
        await persistItem(item)
        cartItems.push(item)
      }
      renderCartPanel()
      return true
    },

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
      await removeItemFromDb(item)
      cartItems = cartItems.filter((i) => i !== item)
      renderCartPanel()
      return
    }

    if (btn.classList.contains("cart-qty-plus")) {
      item.quantity = (Number(item.quantity) || 0) + 1
      await persistItem(item)
      renderCartPanel()
      return
    }

    if (btn.classList.contains("cart-qty-minus")) {
      item.quantity = Math.max(0, (Number(item.quantity) || 0) - 1)
      if (item.quantity <= 0) {
        await removeItemFromDb(item)
        cartItems = cartItems.filter((i) => i !== item)
      } else {
        await persistItem(item)
      }
      renderCartPanel()
    }
  })

  fab?.addEventListener("click", () => MarisCatalogCart.openPanel())
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

    const session = await auth.getSession()
    const token = session?.access_token
    const cartId = await getOrCreateDraftCart()

    const res = await fetch(window.ENV.SUPABASE_CART_SHARE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ cart_id: cartId, seller_id: 0, dry_run: true })
    })
    const data = await res.json()
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
      const session = await auth.getSession()
      const cartId = await getOrCreateDraftCart()
      const res = await fetch(window.ENV.SUPABASE_CART_SHARE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ cart_id: cartId, seller_id: sellerId })
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
      draftCartId = null
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
