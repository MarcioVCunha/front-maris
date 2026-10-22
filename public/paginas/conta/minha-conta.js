import { createCustomerClient } from "../../compartilhado/cliente-auth.js"
import {
  accountSavedMessage,
  applyCepResult,
  buildExportDownload,
  customerMeRequest,
  customerPutBody,
  dataErrorMessage,
  deleteAddress,
  deleteConfirmed,
  formatCep,
  formatCpf,
  isCustomerLoginEnabled,
  listAddresses,
  listMyOrders,
  lookupCep,
  marketingOptInFromCustomer,
  passwordUpdateMessage,
  readCustomerMe,
  renderAddressCard,
  renderOrderCard,
  saveAddress,
  signOut,
  updatePassword,
  validateCustomer
} from "../../compartilhado/cliente-login.logic.js"
import { bindPasswordFields, guardCustomerLogin, publicEnv, setMessage } from "./conta-ui.js"

let customerId = null
let editingId = null

function tokenOf(session) {
  return session?.access_token || ""
}

function addressFromForm() {
  return {
    id: editingId,
    customerId,
    cep: document.getElementById("endereco-cep").value,
    rua: document.getElementById("endereco-rua").value,
    numero: document.getElementById("endereco-numero").value,
    complemento: document.getElementById("endereco-complemento").value,
    bairro: document.getElementById("endereco-bairro").value,
    cidade: document.getElementById("endereco-cidade").value,
    uf: document.getElementById("endereco-uf").value,
    isDefault: document.getElementById("endereco-padrao").checked
  }
}

function fillAddress(address) {
  document.getElementById("endereco-cep").value = formatCep(address?.cep || "")
  document.getElementById("endereco-rua").value = address?.rua || ""
  document.getElementById("endereco-numero").value = address?.numero || ""
  document.getElementById("endereco-complemento").value = address?.complemento || ""
  document.getElementById("endereco-bairro").value = address?.bairro || ""
  document.getElementById("endereco-cidade").value = address?.cidade || ""
  document.getElementById("endereco-uf").value = address?.uf || ""
  document.getElementById("endereco-padrao").checked = address?.isDefault === true
}

function clearAddressForm(preferDefault) {
  editingId = null
  fillAddress({ isDefault: preferDefault })
  document.getElementById("endereco-cancelar").hidden = true
  document.getElementById("endereco-salvar").textContent = "Salvar endereço"
}

function paintAddresses(addresses) {
  const slot = document.getElementById("endereco-lista")
  slot.innerHTML = addresses.map(renderAddressCard).join("")
  document.getElementById("endereco-vazio").hidden = addresses.length > 0
}

function paintOrders(orders) {
  const slot = document.getElementById("pedidos-lista")
  slot.innerHTML = orders.map(renderOrderCard).join("")
  document.getElementById("pedidos-vazio").hidden = orders.length > 0
}

async function boot() {
  if (!guardCustomerLogin(isCustomerLoginEnabled(publicEnv(), window.sessionStorage, window.location))) return
  const client = createCustomerClient()
  if (!client) {
    setMessage(document.getElementById("dados-msg"), dataErrorMessage(0), "error")
    return
  }
  const sessionResult = await client.auth.getSession().catch(() => null)
  const session = sessionResult?.data?.session
  if (!tokenOf(session)) {
    const next = encodeURIComponent("/minha-conta")
    window.location.replace(`/entrar?next=${next}`)
    return
  }

  const email = session.user?.email || ""
  document.getElementById("conta-email").textContent = email

  document.getElementById("conta-sair").addEventListener("click", async () => {
    await signOut(client)
    window.location.replace("/catalog")
  })

  const env = publicEnv()
  const dadosMsg = document.getElementById("dados-msg")
  const enderecoMsg = document.getElementById("endereco-msg")
  const pedidosMsg = document.getElementById("pedidos-msg")

  async function reload() {
    const token = tokenOf((await client.auth.getSession()).data?.session)
    const profile = await readCustomerMe(fetch, customerMeRequest({
      baseUrl: env.SUPABASE_URL,
      token,
      method: "GET"
    }))
    if (!profile.ok) setMessage(dadosMsg, dataErrorMessage(profile.status || profile.error, profile.data), "error")
    const customer = profile.customer
    customerId = customer?.id ?? null
    document.getElementById("dados-nome").value = customer?.name || ""
    document.getElementById("dados-whatsapp").value = customer?.whatsapp || ""
    document.getElementById("dados-cpf").value = customer?.cpf ? formatCpf(customer.cpf) : ""
    document.getElementById("dados-marketing").checked = marketingOptInFromCustomer(customer)

    const addresses = await listAddresses(client)
    if (!addresses.ok) setMessage(enderecoMsg, "Não foi possível carregar os endereços.", "error")
    else {
      paintAddresses(addresses.addresses || [])
      if (!editingId) clearAddressForm(!(addresses.addresses || []).length)
    }

    const orders = await listMyOrders(client)
    if (!orders.ok) setMessage(pedidosMsg, "Não foi possível carregar os pedidos.", "error")
    else paintOrders(orders.orders || [])
  }

  await reload()

  document.getElementById("dados-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    const input = {
      name: document.getElementById("dados-nome").value,
      whatsapp: document.getElementById("dados-whatsapp").value,
      cpf: document.getElementById("dados-cpf").value,
      marketingOptIn: document.getElementById("dados-marketing").checked
    }
    const invalid = validateCustomer(input)
    if (invalid) {
      setMessage(dadosMsg, invalid, "error")
      return
    }
    const button = document.getElementById("dados-salvar")
    button.disabled = true
    const token = tokenOf((await client.auth.getSession()).data?.session)
    const saved = await readCustomerMe(fetch, customerMeRequest({
      baseUrl: env.SUPABASE_URL,
      token,
      method: "POST",
      body: customerPutBody(input)
    }))
    button.disabled = false
    if (!saved.ok) {
      setMessage(dadosMsg, dataErrorMessage(saved.status || saved.error, saved.data), "error")
      return
    }
    customerId = saved.customer?.id ?? customerId
    setMessage(dadosMsg, accountSavedMessage(saved.data), "success")
  })

  document.getElementById("endereco-buscar").addEventListener("click", async () => {
    const current = addressFromForm()
    const found = await lookupCep(current.cep)
    if (!found.ok) {
      setMessage(enderecoMsg, found.error, "error")
      return
    }
    fillAddress({ ...applyCepResult(current, found.address), numero: current.numero, complemento: current.complemento, isDefault: current.isDefault })
    setMessage(enderecoMsg, "", "")
  })

  document.getElementById("endereco-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    const button = document.getElementById("endereco-salvar")
    button.disabled = true
    const saved = await saveAddress(client, addressFromForm())
    button.disabled = false
    if (!saved.ok) {
      setMessage(enderecoMsg, saved.error || "Não foi possível salvar o endereço.", "error")
      return
    }
    setMessage(enderecoMsg, "Endereço salvo.", "success")
    editingId = null
    const addresses = await listAddresses(client)
    paintAddresses(addresses.addresses || [])
    clearAddressForm(!(addresses.addresses || []).some((item) => item.isDefault))
  })

  document.getElementById("endereco-cancelar").addEventListener("click", async () => {
    const addresses = await listAddresses(client)
    clearAddressForm(!(addresses.addresses || []).length)
    setMessage(enderecoMsg, "", "")
  })

  document.getElementById("endereco-lista").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]")
    if (!button) return
    const id = button.getAttribute("data-id")
    const addresses = await listAddresses(client)
    const current = (addresses.addresses || []).find((item) => String(item.id) === String(id))
    if (button.getAttribute("data-action") === "edit" && current) {
      editingId = current.id
      fillAddress(current)
      document.getElementById("endereco-cancelar").hidden = false
      document.getElementById("endereco-salvar").textContent = "Atualizar"
      return
    }
    if (button.getAttribute("data-action") === "remove") {
      if (!window.confirm("Apagar este endereço?")) return
      const removed = await deleteAddress(client, id)
      if (!removed.ok) {
        setMessage(enderecoMsg, "Não foi possível apagar o endereço.", "error")
        return
      }
      const fresh = await listAddresses(client)
      paintAddresses(fresh.addresses || [])
      if (String(editingId) === String(id)) clearAddressForm(!(fresh.addresses || []).length)
    }
  })

  const senhaNova = document.getElementById("senha-nova")
  const senhaConfirm = document.getElementById("senha-confirm")
  const senhaMismatch = document.getElementById("senha-mismatch")
  const paintPassword = bindPasswordFields({
    input: senhaNova,
    toggle: document.getElementById("senha-toggle"),
    confirm: senhaConfirm,
    checks: document.getElementById("senha-checks"),
    button: document.getElementById("senha-salvar")
  })
  const showMismatch = () => {
    senhaMismatch.hidden = !senhaConfirm.value || senhaConfirm.value === senhaNova.value
  }
  senhaConfirm.addEventListener("input", showMismatch)
  senhaNova.addEventListener("input", showMismatch)
  document.getElementById("senha-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    if (document.getElementById("senha-salvar").disabled) return
    document.getElementById("senha-salvar").disabled = true
    const result = await updatePassword(client, senhaNova.value)
    const feedback = passwordUpdateMessage(result.error)
    setMessage(document.getElementById("senha-msg"), feedback.text, feedback.type)
    if (result.ok) {
      senhaNova.value = ""
      senhaConfirm.value = ""
    }
    paintPassword()
  })

  document.getElementById("baixar-dados").addEventListener("click", async () => {
    const privacidadeMsg = document.getElementById("privacidade-msg")
    const token = tokenOf((await client.auth.getSession()).data?.session)
    const result = await readCustomerMe(fetch, customerMeRequest({
      baseUrl: env.SUPABASE_URL,
      token,
      method: "POST",
      body: { op: "export" }
    }))
    if (!result.ok) {
      setMessage(privacidadeMsg, dataErrorMessage(result.status || result.error, result.data), "error")
      return
    }
    const file = buildExportDownload(result)
    const blob = new Blob([file.json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = file.filename
    anchor.click()
    URL.revokeObjectURL(url)
    setMessage(privacidadeMsg, "Download iniciado.", "success")
  })

  const excluirInput = document.getElementById("excluir-confirm")
  const excluirBtn = document.getElementById("excluir-conta")
  excluirInput.addEventListener("input", () => {
    excluirBtn.disabled = !deleteConfirmed(excluirInput.value)
  })
  document.getElementById("excluir-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!deleteConfirmed(excluirInput.value)) return
    excluirBtn.disabled = true
    const token = tokenOf((await client.auth.getSession()).data?.session)
    const result = await readCustomerMe(fetch, customerMeRequest({
      baseUrl: env.SUPABASE_URL,
      token,
      method: "POST",
      body: { op: "delete" }
    }))
    if (!result.ok) {
      excluirBtn.disabled = !deleteConfirmed(excluirInput.value)
      setMessage(document.getElementById("privacidade-msg"), dataErrorMessage(result.status || result.error, result.data), "error")
      return
    }
    await signOut(client)
    window.location.replace("/catalog")
  })
}

boot()
