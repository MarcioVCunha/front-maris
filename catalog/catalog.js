const supabaseClient = window.supabase.createClient(
    window.ENV.SUPABASE_URL,
    window.ENV.SUPABASE_ANON_KEY
  )
  
  const catalog = document.getElementById("catalog")
  
  async function loadProducts(){
  
    const { data, error } = await supabaseClient
    .from("products")
    .select("*")
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
  
    catalog.innerHTML = data.map(product => `
  
      <div class="product">
  
        <img src="${product.image_url}" alt="${product.name}">
  
        <h3>${product.name}</h3>
  
        <div class="code">
          Código: ${product.code}
        </div>
  
        <div class="price">
          R$ ${Number(product.unit_price).toFixed(2)}
        </div>
  
      </div>
  
    `).join("")
  }
  
  loadProducts()