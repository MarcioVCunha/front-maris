export function parseImportJsonText(text) {
  return JSON.parse(text)
}

if (typeof globalThis.window !== "undefined") {
  globalThis.window.MarisImportLogic = { parseImportJsonText }
}
