function asFailure(item) {
  if (!item || typeof item !== "object") return null
  const code = String(item.code ?? "").trim()
  const reason = String(item.reason ?? "").trim()
  if (!code && !reason) return null
  return { code: code || "—", reason: reason || "—" }
}

function groupLines(failures) {
  const groups = new Map()
  for (const failure of failures) {
    if (!groups.has(failure.code)) groups.set(failure.code, [])
    groups.get(failure.code).push(failure.reason)
  }
  const lines = []
  for (const [code, reasons] of groups) {
    if (lines.length) lines.push("")
    lines.push(code)
    lines.push(...reasons)
  }
  return lines
}

// Devolve texto puro. A tela coloca em textContent, sem innerHTML.
export function formatImageFailuresWarning(data, { groupByCode = false } = {}) {
  if (!data || typeof data !== "object" || !Object.hasOwn(data, "image_failures")) return ""
  const raw = data.image_failures
  if (!Array.isArray(raw) || raw.length === 0) return ""
  const failures = raw.map(asFailure).filter(Boolean)
  if (!failures.length) return ""
  const header =
    `A peça foi salva, mas ${failures.length} foto(s) não foram copiadas para o nosso armazenamento e continuam vindo do fornecedor:`
  const lines = groupByCode
    ? groupLines(failures)
    : failures.map((failure) => `${failure.code} — ${failure.reason}`)
  return [header, ...lines].join("\n")
}
