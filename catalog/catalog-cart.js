;(function () {
  const CART_STORAGE_KEY = "maris_catalog_cart_v2"
  const BUYER_STORAGE_KEY = "maris_buyer_profile_v1"
  const cartCountEl = document.getElementById("header-cart-count")
  const headerCartBtn = document.getElementById("header-cart-btn")

  let cartItems = []
  let productsByCode = Object.create(null)
  let componentsById = Object.create(null)
  let productImagesByCode = Object.create(null)

  function safeParseJson(value, fallback) {
    try {
      if (!value) return fallback
      const parsed = JSON.parse(value)
      return parsed ?? fallback
    } catch {
      return fallback
    }
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

  function emitUpdate() {
    const count = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    if (cartCountEl) cartCountEl.textContent = String(count)
    if (headerCartBtn) headerCartBtn.hidden = count <= 0
    window.dispatchEvent(new CustomEvent("maris-cart-updated", { detail: { count } }))
  }

  function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
    emitUpdate()
  }

  function loadCart() {
    const rawList = safeParseJson(localStorage.getItem(CART_STORAGE_KEY), [])
    cartItems = Array.isArray(rawList) ? rawList.map(normalizeItem).filter(Boolean) : []
    saveCart()
  }

  function itemKey(item) {
    return window.MarisCart.itemKey(item)
  }

  function getAvailableQty({ productCode = null, componentId = null }) {
    if (componentId) {
      const component = componentsById[componentId]
      return Math.max(0, Number(component?.quantity) || 0)
    }
    const product = productsByCode[productCode]
    return Math.max(0, Number(product?.quantity) || 0)
  }

  function upsertItem({ productCode = null, componentId = null, quantity = 1 }) {
    const delta = Number(quantity) || 0
    if (!delta) return { ok: false, reason: "invalid_quantity" }
    const available = getAvailableQty({ productCode, componentId })
    if (available <= 0) return { ok: false, reason: "out_of_stock", available: 0 }

    const target = cartItems.find((item) =>
      componentId ? item.component_id === componentId : item.product_code === productCode && !item.component_id
    )

    if (target) {
      const requested = Math.max(0, (Number(target.quantity) || 0) + delta)
      target.quantity = Math.min(available, requested)
      if (target.quantity <= 0) {
        cartItems = cartItems.filter((item) => item !== target)
      }
    } else if (delta > 0) {
      cartItems.push({
        product_code: productCode,
        component_id: componentId,
        quantity: Math.min(available, delta)
      })
    } else {
      return { ok: false, reason: "negative_new_item" }
    }
    saveCart()
    const currentQty = target
      ? Number(target.quantity) || 0
      : Number(cartItems.find((item) =>
          componentId ? item.component_id === componentId : item.product_code === productCode && !item.component_id
        )?.quantity) || 0
    return {
      ok: true,
      clamped: currentQty >= available && delta > 0,
      available,
      quantity: currentQty
    }
  }

  function removeItem(key) {
    cartItems = cartItems.filter((item) => itemKey(item) !== key)
    saveCart()
  }

  function setQuantity(key, quantity) {
    const item = cartItems.find((line) => itemKey(line) === key)
    if (!item) return { ok: false, reason: "not_found" }
    const available = getAvailableQty({ productCode: item.product_code, componentId: item.component_id })
    const next = Math.max(0, Number(quantity) || 0)
    if (next <= 0) {
      removeItem(key)
      return { ok: true, removed: true, available }
    }
    item.quantity = Math.min(next, available)
    saveCart()
    return { ok: true, clamped: next > available, available, quantity: item.quantity }
  }

  function getBuyerProfile() {
    const profile = safeParseJson(localStorage.getItem(BUYER_STORAGE_KEY), null)
    if (!profile || typeof profile !== "object") return null
    const name = String(profile.name || "").trim()
    const whatsapp = String(profile.whatsapp || "").replace(/\D/g, "")
    const email = String(profile.email || "").trim()
    if (!name || whatsapp.length < 10) return null
    return { name, whatsapp, email }
  }

  function saveBuyerProfile(profile) {
    const name = String(profile?.name || "").trim()
    const whatsapp = String(profile?.whatsapp || "").replace(/\D/g, "")
    const email = String(profile?.email || "").trim()
    localStorage.setItem(BUYER_STORAGE_KEY, JSON.stringify({ name, whatsapp, email }))
  }

  function lineLabel(item) {
    return window.MarisCart.resolveLine(
      item,
      { productsByCode, componentsById, productImagesByCode },
      "cart"
    )
  }

  window.MarisCatalogCart = {
    setCatalogData({ products, components, imagesByCode = null }) {
      productsByCode = Object.create(null)
      for (const p of products || []) productsByCode[p.code] = p
      componentsById = Object.create(null)
      for (const c of components || []) componentsById[c.id] = c
      productImagesByCode = Object.create(null)
      for (const product of products || []) {
        const code = String(product?.code || "")
        if (!code) continue
        const fallback = String(product?.image_url || "").trim()
        if (fallback) productImagesByCode[code] = fallback
      }
      if (imagesByCode && typeof imagesByCode === "object") {
        for (const [code, imageUrl] of Object.entries(imagesByCode)) {
          const value = String(imageUrl || "").trim()
          if (code && value) productImagesByCode[code] = value
        }
      }
    },

    async init() {
      loadCart()
    },

    getItems() {
      return cartItems.map((item) => ({ ...item }))
    },

    getLineDetails() {
      return cartItems.map((item) => {
        const info = lineLabel(item)
        return {
          key: itemKey(item),
          ...info,
          product_code: item.product_code,
          component_id: item.component_id,
          quantity: Number(item.quantity) || 0,
          total: info.unitPrice * (Number(item.quantity) || 0),
          available: info.available,
          image_url: info.imageUrl
        }
      })
    },

    addProduct(productCode, quantity = 1) {
      return upsertItem({ productCode, quantity })
    },

    addComponent(componentId, quantity = 1) {
      return upsertItem({ componentId, quantity })
    },

    removeByKey(key) {
      removeItem(key)
    },

    setQuantityByKey(key, quantity) {
      return setQuantity(key, quantity)
    },

    getBuyerProfile,

    saveBuyerProfile
  }

  loadCart()
})()
