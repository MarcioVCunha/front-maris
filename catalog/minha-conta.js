const auth = window.MarisCustomerAuth
const messageEl = document.getElementById("profile-message")
const waitlistList = document.getElementById("waitlist-list")

function setMessage(text, isError = false) {
  messageEl.textContent = text
  messageEl.className = `auth-message ${isError ? "error" : ""}`.trim()
}

async function loadWaitlist() {
  const { data, error } = await auth.supabase
    .from("waitlist_entries")
    .select("id, product_code, component_id, status, created_at")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })

  if (error || !data?.length) {
    waitlistList.innerHTML = "<li>Nenhuma peça na lista de espera.</li>"
    return
  }

  const codes = data.filter((e) => e.product_code).map((e) => e.product_code)
  const compIds = data.filter((e) => e.component_id).map((e) => e.component_id)

  const productsByCode = Object.create(null)
  const componentsById = Object.create(null)

  if (codes.length) {
    const { data: products } = await auth.supabase.from("products").select("code, name").in("code", codes)
    for (const p of products || []) productsByCode[p.code] = p.name
  }
  if (compIds.length) {
    const { data: comps } = await auth.supabase.from("product_components").select("id, name").in("id", compIds)
    for (const c of comps || []) componentsById[c.id] = c.name
  }

  waitlistList.innerHTML = data
    .map((entry) => {
      const name = entry.component_id
        ? componentsById[entry.component_id] || `Componente ${entry.component_id}`
        : productsByCode[entry.product_code] || entry.product_code
      return `<li>${name} <button type="button" data-cancel="${entry.id}" class="link-btn">Remover</button></li>`
    })
    .join("")
}

waitlistList.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-cancel]")
  if (!btn) return
  const id = Number(btn.getAttribute("data-cancel"))
  await auth.supabase.from("waitlist_entries").update({ status: "cancelled" }).eq("id", id)
  loadWaitlist()
})

document.getElementById("profile-form").addEventListener("submit", async (e) => {
  e.preventDefault()
  const { error } = await auth.updateProfile({
    fullName: document.getElementById("profile-name").value,
    whatsapp: document.getElementById("profile-whatsapp").value
  })
  setMessage(error ? error.message : "Perfil atualizado.", Boolean(error))
})

document.getElementById("logout-btn").addEventListener("click", async () => {
  await auth.signOut()
  window.location.href = "catalog.html"
})

;(async () => {
  const session = await auth.requireAuth({ redirectTo: "auth.html" })
  if (!session) return

  const user = session.user
  document.getElementById("profile-email").value = user.email || ""

  const profile = await auth.getProfile()
  if (profile) {
    document.getElementById("profile-name").value = profile.full_name || ""
    document.getElementById("profile-whatsapp").value = profile.whatsapp || ""
  }

  loadWaitlist()
})()
