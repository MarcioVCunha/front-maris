// Padrão compartilhado de card + foto para o painel (Conjuntos agora;
// unificar com venda-edicao do PR #33 quando ele entrar na main).

export function escapeEntityHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function entityPhotoHtml({ image_url, code, name } = {}) {
  const url = String(image_url || "").trim()
  if (url) {
    return `<img class="entity-card__photo" src="${escapeEntityHtml(url)}" alt="" loading="lazy" decoding="async" width="56" height="56">`
  }
  const letters = String(code || name || "?").trim().slice(0, 2).toUpperCase() || "?"
  return `<span class="entity-card__photo entity-card__photo--empty">${escapeEntityHtml(letters)}</span>`
}

/**
 * Card clicável ou estático. Compatível visualmente com .sale-card do PR #33.
 * attrs: string de atributos extras (ex.: data-product-code="X").
 */
export function renderEntityCard({
  title,
  meta = [],
  sideTitle = "",
  sideMeta = "",
  photo,
  attrs = "",
  clickable = true
} = {}) {
  const tag = clickable ? "button" : "article"
  const type = clickable ? ` type="button"` : ""
  const klass = clickable ? "entity-card" : "entity-card entity-card--static"
  const metaHtml = (Array.isArray(meta) ? meta : [meta])
    .filter(Boolean)
    .map((line) => `<small>${escapeEntityHtml(line)}</small>`)
    .join("")
  return `<${tag}${type} class="${klass}" ${attrs}>
    ${photo || entityPhotoHtml({})}
    <span class="entity-card__copy">
      <strong>${escapeEntityHtml(title || "Item")}</strong>
      ${metaHtml}
    </span>
    <span class="entity-card__side">
      ${sideTitle ? `<b>${escapeEntityHtml(sideTitle)}</b>` : ""}
      ${sideMeta ? `<small>${escapeEntityHtml(sideMeta)}</small>` : ""}
    </span>
  </${tag}>`
}
