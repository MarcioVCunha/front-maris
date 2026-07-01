const statusFilter = document.getElementById("status-filter")
const wrap = document.getElementById("waitlist-table-wrap")

async function loadWaitlist() {
  const status = statusFilter.value
  wrap.innerHTML = "Carregando…"

  const url = `${window.ENV.fn("list-waitlist")}?status=${encodeURIComponent(status)}`
  let result
  try {
    result = await window.MarisApi.callFunction(url, { method: "GET", auth: "staff" })
  } catch {
    wrap.innerHTML = `<p class="message error">Erro de conexão. Tente novamente.</p>`
    return
  }

  const { ok, data } = result
  if (!ok) {
    wrap.innerHTML = `<p class="message error">${data.error || "Erro."}</p>`
    return
  }

  const entries = data.entries || []
  if (!entries.length) {
    wrap.innerHTML = "<p>Nenhuma entrada.</p>"
    return
  }

  wrap.innerHTML = `
    <table class="waitlist-table" style="width:100%;border-collapse:collapse;background:#fff;">
      <thead>
        <tr>
          <th>Peça</th>
          <th>Cliente</th>
          <th>Contato</th>
          <th>Estoque</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${entries
          .map((e) => {
            const wa = e.buyer.whatsapp ? e.buyer.whatsapp.replace(/\D/g, "") : ""
            const contact = `
              ${e.buyer.email || ""}<br>
              ${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
            `
            const action =
              e.status === "waiting"
                ? `<button type="button" data-mark="${e.id}" class="btn-primary" style="padding:6px 10px;font-size:12px;">Marcar como avisado</button>`
                : `<span>${e.contacted_at ? new Date(e.contacted_at).toLocaleDateString("pt-BR") : "—"}</span>`
            return `
            <tr style="border-top:1px solid #eee;">
              <td style="padding:10px;">${e.piece_name}<br><small>${e.piece_code}</small>${e.in_stock ? ' <strong style="color:green;">· em estoque</strong>' : ""}</td>
              <td style="padding:10px;">${e.buyer.full_name || "—"}</td>
              <td style="padding:10px;">${contact}</td>
              <td style="padding:10px;">${e.in_stock ? "Sim" : "Não"}</td>
              <td style="padding:10px;">${action}</td>
            </tr>
          `
          })
          .join("")}
      </tbody>
    </table>
  `
}

wrap.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-mark]")
  if (!btn) return
  const entryId = Number(btn.getAttribute("data-mark"))
  btn.disabled = true
  try {
    const { ok } = await window.MarisApi.callFunction(window.ENV.fn("mark-waitlist-contacted"), {
      body: { entry_id: entryId },
      auth: "staff"
    })
    if (ok) loadWaitlist()
    else btn.disabled = false
  } catch {
    btn.disabled = false
  }
})

document.getElementById("reload-waitlist").addEventListener("click", loadWaitlist)
statusFilter.addEventListener("change", loadWaitlist)
loadWaitlist()
