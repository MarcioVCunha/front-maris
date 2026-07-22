export function parseImportJsonText(text) {
  return JSON.parse(text)
}

export function formatImportSuccessMessage(data) {
  if (data == null) return "Importação concluída."
  if (typeof data === "string" && data.trim()) return data.trim()

  const created = Number(data.created ?? data.created_count ?? data.inserted)
  const updated = Number(data.updated ?? data.updated_count)
  const failed = Number(data.failed ?? data.errors_count ?? data.error_count)
  const total = Number(data.total ?? data.count ?? data.processed)

  const parts = []
  if (Number.isFinite(created) && created > 0) {
    parts.push(`${created} criado${created === 1 ? "" : "s"}`)
  }
  if (Number.isFinite(updated) && updated > 0) {
    parts.push(`${updated} atualizado${updated === 1 ? "" : "s"}`)
  }
  if (Number.isFinite(failed) && failed > 0) {
    parts.push(`${failed} com erro`)
  }
  if (parts.length) return `Importação concluída: ${parts.join(", ")}.`
  if (Number.isFinite(total) && total > 0) {
    return `Importação concluída: ${total} produto${total === 1 ? "" : "s"} processado${total === 1 ? "" : "s"}.`
  }
  if (data.ok === true || data.success === true) return "Importação concluída com sucesso."
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim()
  return "Importação concluída com sucesso."
}

export function formatImportErrorMessage(data, status) {
  if (typeof data === "string" && data.trim()) return data.trim()
  if (data?.error && typeof data.error === "string") return data.error
  if (data?.message && typeof data.message === "string") return data.message
  if (Number.isFinite(status) && status > 0) return `Não foi possível importar (erro HTTP ${status}).`
  return "Não foi possível importar os produtos."
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisImportLogic = {
    parseImportJsonText,
    formatImportSuccessMessage,
    formatImportErrorMessage,
  }
}
