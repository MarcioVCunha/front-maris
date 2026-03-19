const supabaseClient = window.supabase.createClient(
    window.ENV.SUPABASE_URL,
    window.ENV.SUPABASE_ANON_KEY
  )
  
  const catalog = document.getElementById("catalog")
  
  async function loadProducts(){
  
    const { data, error } = await supabaseClient
    .from("products")
    .select("*")
  .order("quantity", { ascending: false })
  .order("name")
  
    if(error){
      catalog.innerHTML = "Erro ao carregar produtos"
      console.log(error)
      return
    }
  
  if(!data.length){
      catalog.innerHTML = "Nenhum produto encontrado"
      return
    }
  
  const sortedProducts = [...data].sort((a, b) => {
    const stockA = Number(a.quantity) || 0
    const stockB = Number(b.quantity) || 0
    const outOfStockA = stockA <= 0 ? 1 : 0
    const outOfStockB = stockB <= 0 ? 1 : 0

    if (outOfStockA !== outOfStockB) {
      return outOfStockA - outOfStockB
    }

    return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR")
  })

  catalog.innerHTML = sortedProducts.map(product => `
  
      <div class="product">
  
        <img src="${product.image_url}" alt="${product.name}">
  
        <h3>${product.name}</h3>
  
        <div class="code">
          Código: ${product.code}
        </div>
  
        <div class="price">
          R$ ${Number(product.unit_price).toFixed(2)}
        </div>
  
        <div class="stock ${Number(product.quantity) <= 0 ? "zero" : ""}">
          Estoque: ${Number(product.quantity) || 0}
        </div>

      </div>
  
    `).join("")
  }
  
  loadProducts()