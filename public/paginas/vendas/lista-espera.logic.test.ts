import { assert, assertEquals } from "jsr:@std/assert@1"
import { renderWaitlistEntryCard, waitlistNotifyPayload } from "./lista-espera.logic.js"

Deno.test("lista de espera avisa por e-mail com entry_id", () => {
  const html = renderWaitlistEntryCard({
    id: 15,
    status: "waiting",
    piece_name: "Anel",
    piece_code: "AN01",
    buyer: { full_name: "Lia", email: "lia@exemplo.com" },
  })
  assert(html.includes("Avisar por e-mail"))
  assert(html.includes('data-notify="15"'))
  assert(html.includes("Marcar como avisado"))
  assert(html.includes("waitlist-notify-btn"))
  assertEquals(html.includes("width:100%"), false)
  assertEquals(waitlistNotifyPayload(15), { entry_id: 15 })
  assertEquals(waitlistNotifyPayload("15"), { entry_id: 15 })
  assertEquals(waitlistNotifyPayload(0), null)

  const done = renderWaitlistEntryCard({ id: 15, status: "contacted", piece_name: "Anel" })
  assertEquals(done.includes("Avisar por e-mail"), false)
})
