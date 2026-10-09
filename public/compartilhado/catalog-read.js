// Leituras que o visitante anônimo continua podendo fazer.
// A lista de colunas fica aqui para nenhuma página pedir a coluna restrita de custo.
// O catálogo lê a view pública, que expõe categoria e não a coluna restrita.

function rejectRestrictedColumn(columns) {
  if (/\bcusto\b/i.test(String(columns || ""))) {
    throw new Error("Consulta pública não pode incluir a coluna restrita.")
  }
}

window.MarisCatalogRead = {
  PRODUCTS_RELATION: "products_public",
  PRODUCT_COLUMNS: "id, code, name, categoria, unit_price, quantity, image_url, is_on_sale, discount_percent, created_at",
  COMPONENTS_RELATION: "product_components_priced",
  COMPONENT_COLUMNS:
    "id, product_code, name, quantity, is_active, price_percent, computed_unit_price, parent_unit_price, parent_is_on_sale, parent_discount_percent",
  IMAGES_RELATION: "product_images",
  IMAGE_COLUMNS: "product_id, image_url, sort_order",
  SELLERS_RELATION: "sellers",
  SELLER_COLUMNS: "id, name",
  BASKETS_RELATION: "shared_baskets",
  BASKET_COLUMNS: "items",
  // Mesmo nome de MarisCatalogLogic.PIX_PRICE_FIELD. A view ainda pode não ter a coluna.
  PIX_PRICE_FIELD: "preco_pix",
  // View pública ainda pode não existir. Com a flag desligada, o catálogo não consulta.
  BESTSELLERS_ENABLED: false,
  BESTSELLERS_RELATION: "product_sales_counts",
  BESTSELLER_COLUMNS: "code, total_vendido",

  _select(client, relation, columns) {
    rejectRestrictedColumn(columns)
    return client.from(relation).select(columns)
  },

  columnsWithPixField(columns, field) {
    const name = String(field || "").trim()
    if (!name || /\bcusto\b/i.test(name)) return columns
    const names = String(columns || "").split(",").map((part) => part.trim())
    if (names.includes(name)) return columns
    return `${columns}, ${name}`
  },

  productColumns() {
    return this.columnsWithPixField(this.PRODUCT_COLUMNS, this.PIX_PRICE_FIELD)
  },

  missingPixColumn(error, field) {
    const text = `${error?.message || ""} ${error?.details || ""} ${error?.code || ""}`
    return text.toLowerCase().includes(String(field || "").toLowerCase())
  },

  queryWithColumnFallback(primary, fallback, field) {
    const read = this
    const calls = []
    const run = (factory) => {
      let query = factory()
      for (const entry of calls) query = query[entry.method](...entry.args)
      return query
    }
    const proxy = new Proxy({}, {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve, reject) => Promise.resolve(run(primary)).then((result) => {
            if (result?.error && read.missingPixColumn(result.error, field)) return run(fallback)
            return result
          }).then(resolve, reject)
        }
        if (prop === "catch") return (onReject) => proxy.then((value) => value, onReject)
        return (...args) => {
          calls.push({ method: prop, args })
          return proxy
        }
      }
    })
    return proxy
  },

  selectProducts(client) {
    const columns = this.productColumns()
    const primary = () => this._select(client, this.PRODUCTS_RELATION, columns)
    if (columns === this.PRODUCT_COLUMNS) return primary()
    const fallback = () => this._select(client, this.PRODUCTS_RELATION, this.PRODUCT_COLUMNS)
    return this.queryWithColumnFallback(primary, fallback, this.PIX_PRICE_FIELD)
  },

  selectPricedComponents(client) {
    return this._select(client, this.COMPONENTS_RELATION, this.COMPONENT_COLUMNS).eq("is_active", true)
  },

  selectImages(client) {
    return this._select(client, this.IMAGES_RELATION, this.IMAGE_COLUMNS)
  },

  // Carrinho público: a cliente escolhe a vendedora. Só id e nome, só ativas.
  selectActiveSellers(client) {
    return this._select(client, this.SELLERS_RELATION, this.SELLER_COLUMNS)
      .eq("is_active", true)
      .order("name")
  },

  selectSharedBasket(client, id) {
    return this._select(client, this.BASKETS_RELATION, this.BASKET_COLUMNS).eq("id", id).maybeSingle()
  },

  selectBestsellers(client) {
    if (!this.BESTSELLERS_ENABLED) return null
    const relation = String(this.BESTSELLERS_RELATION || "").trim()
    if (!relation) return null
    return this._select(client, relation, this.BESTSELLER_COLUMNS)
  }
}
