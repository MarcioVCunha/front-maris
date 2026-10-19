// Atalhos, FAB e rotas antigas do painel.
export function resolveKeyboardShortcut(event, context = {}) {
  const key = event.key
  const targetTag = (event.target?.tagName || "").toLowerCase()
  const isInput = targetTag === "input" || targetTag === "textarea" || targetTag === "select" || Boolean(event.target?.isContentEditable)

  if (key === "Escape") {
    return { action: "escape" }
  }

  if (isInput) {
    return { action: "none" }
  }

  if (key === "/" || (key === "k" && (event.ctrlKey || event.metaKey))) {
    return { action: "focus-search" }
  }

  if ((key === "n" || key === "N") && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (event.shiftKey) {
      return { action: "new-sale" }
    }
    return { action: "new-piece" }
  }

  if ((key === "v" || key === "V") && !event.ctrlKey && !event.metaKey && !event.altKey) {
    return { action: "new-sale" }
  }

  if (key === "?" && !event.ctrlKey && !event.metaKey) {
    return { action: "toggle-shortcuts-help" }
  }

  return { action: "none" }
}

export function renderShortcutsDialog() {
  return `<div class="shortcuts-dialog__content">
    <div class="shortcuts-dialog__header">
      <h2>Atalhos de Teclado</h2>
      <button type="button" class="btn-close-dialog" id="shortcuts-dialog-close" aria-label="Fechar">✕</button>
    </div>
    <div class="shortcuts-dialog__list">
      <div class="shortcut-row">
        <kbd class="shortcut-key">/</kbd>
        <span class="shortcut-desc">Focar campo de busca de peças</span>
      </div>
      <div class="shortcut-row">
        <kbd class="shortcut-key">n</kbd>
        <span class="shortcut-desc">Adicionar nova peça</span>
      </div>
      <div class="shortcut-row">
        <kbd class="shortcut-key">v</kbd>
        <span class="shortcut-desc">Registrar nova venda</span>
      </div>
      <div class="shortcut-row">
        <kbd class="shortcut-key">Esc</kbd>
        <span class="shortcut-desc">Fechar modal ou limpar busca</span>
      </div>
      <div class="shortcut-row">
        <kbd class="shortcut-key">?</kbd>
        <span class="shortcut-desc">Abrir / fechar esta ajuda de atalhos</span>
      </div>
    </div>
  </div>`
}

/** Atalho flutuante (+) do painel — esconde na tela de adicionar peça. */
export function shouldShowFab(view) {
  return view !== "adicionar"
}

export function fabMenuHtml() {
  return `<div class="fab-menu" id="fab-menu" hidden>
    <a class="fab-menu__item" href="/admin/adicionar" data-fab="peca">Nova peça</a>
    <a class="fab-menu__item" href="/vendas/nova" data-fab="venda">Nova venda</a>
  </div>`
}

/** Mensagem com botão Desfazer (HTML seguro: texto escapado; botão via JS). */
export function feedbackParts(text, options = {}) {
  return {
    text: String(text || ""),
    undoLabel: options.undo ? String(options.undo.label || "Desfazer") : "",
    undoMs: options.undo?.ms == null ? 8000 : Number(options.undo.ms)
  }
}

/** Rotas antigas de admin que o Vercel manda para as telas novas do painel. */
export const LEGACY_ADMIN_REDIRECTS = [
  { from: "/adicionar-peca", to: "/admin/adicionar" },
  { from: "/importar", to: "/admin/importar" },
  { from: "/addProduct/add-product.html", to: "/admin/adicionar" },
  { from: "/importJson/import.html", to: "/admin/importar" }
]
