;(function () {
  const CART_STORAGE_KEY = "maris_catalog_cart_v2"
  const BUYER_STORAGE_KEY = "maris_buyer_profile_v1"
  const cartCountEl = document.getElementById("header-cart-count")
  const headerCartBtn = document.getElementById("header-cart-btn")

  let cartItems = []
  let productsByCode = Object.create(null)
  let componentsById = Object.create(null)

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
    return item.component_id ? `c-${item.component_id}` : `p-${item.product_code}`
  }

  function upsertItem({ productCode = null, componentId = null, quantity = 1 }) {
    const delta = Number(quantity) || 0
    if (!delta) return false
    const target = cartItems.find((item) =>
      componentId ? item.component_id === componentId : item.product_code === productCode && !item.component_id
    )
    if (target) {
      target.quantity = Math.max(0, (Number(target.quantity) || 0) + delta)
      if (target.quantity <= 0) {
        cartItems = cartItems.filter((item) => item !== target)
      }
    } else if (delta > 0) {
      cartItems.push({
        product_code: productCode,
        component_id: componentId,
        quantity: delta
      })
    }
    saveCart()
    return true
  }

  function removeItem(key) {
    cartItems = cartItems.filter((item) => itemKey(item) !== key)
    saveCart()
  }

  function setQuantity(key, quantity) {
    const next = Math.max(0, Number(quantity) || 0)
    const item = cartItems.find((line) => itemKey(line) === key)
    if (!item) return
    if (next <= 0) {
      removeItem(key)
      return
    }
    item.quantity = next
    saveCart()
  }

  function clearCart() {
    cartItems = []
    saveCart()
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
    if (item.component_id) {
      const component = componentsById[item.component_id]
      return {
        name: component?.name || "Componente",
        code: component?.product_code || `COMP-${item.component_id}`,
        unitPrice: Number(component?.unit_price) || 0
      }
    }
    const product = productsByCode[item.product_code]
    return {
      name: product?.name || item.product_code || "Produto",
      code: item.product_code || "",
      unitPrice: Number(product?.unit_price) || 0
    }
  }

  window.MarisCatalogCart = {
    setCatalogData({ products, components }) {
      productsByCode = Object.create(null)
      for (const p of products || []) productsByCode[p.code] = p
      componentsById = Object.create(null)
      for (const c of components || []) componentsById[c.id] = c
    },

    async init() {
      loadCart()
    },

    getItems() {
      return cartItems.map((item) => ({ ...item }))
    },

    getCount() {
      return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
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
          total: info.unitPrice * (Number(item.quantity) || 0)
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
      setQuantity(key, quantity)
    },

    clear() {
      clearCart()
    },

    getBuyerProfile,

    saveBuyerProfile
  }

  loadCart()
})()
