/**
 * Lógica pura para gestão de favoritos salvos no aparelho (localStorage)
 * e formulário de aviso de reposição por e-mail.
 */

export const FAVORITES_STORAGE_KEY = "maris_favoritos";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Carrega a lista de códigos favoritados salvos no storage.
 * @param {Storage} [storage=localStorage]
 * @returns {string[]} Lista de códigos únicos favoritados
 */
export function loadStoredFavorites(storage) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const set = new Set();
    for (const item of parsed) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed) set.add(trimmed);
      }
    }
    return Array.from(set);
  } catch {
    return [];
  }
}

/**
 * Salva a lista de favoritos no storage.
 * @param {string[]} favorites
 * @param {Storage} [storage=localStorage]
 */
export function saveStoredFavorites(favorites, storage) {
  if (!storage) return;
  try {
    const list = Array.isArray(favorites)
      ? Array.from(new Set(favorites.filter((c) => typeof c === "string" && c.trim())))
      : [];
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignora erros de quota ou storage desabilitado
  }
}

/**
 * Verifica se um código específico está nos favoritos.
 * @param {string} code
 * @param {string[]} favorites
 * @returns {boolean}
 */
export function isProductFavorite(code, favorites) {
  if (!code || !Array.isArray(favorites)) return false;
  const target = String(code).trim().toUpperCase();
  return favorites.some((fav) => String(fav).trim().toUpperCase() === target);
}

/**
 * Adiciona ou remove um produto dos favoritos.
 * @param {string} code
 * @param {string[]} favorites
 * @returns {{ favorites: string[], isFav: boolean }}
 */
export function toggleFavoriteItem(code, favorites) {
  const target = String(code || "").trim();
  if (!target) return { favorites: Array.isArray(favorites) ? favorites : [], isFav: false };

  const current = Array.isArray(favorites) ? [...favorites] : [];
  const normalizedTarget = target.toUpperCase();
  const index = current.findIndex((item) => item.trim().toUpperCase() === normalizedTarget);

  if (index >= 0) {
    current.splice(index, 1);
    return { favorites: current, isFav: false };
  } else {
    current.push(target);
    return { favorites: current, isFav: true };
  }
}

/**
 * Retorna o número de itens favoritados.
 * @param {string[]} favorites
 * @returns {number}
 */
export function countFavorites(favorites) {
  return Array.isArray(favorites) ? favorites.length : 0;
}

/**
 * Verifica se um grupo do catálogo corresponde aos favoritos salvos
 * (verifica se o código principal ou qualquer uma de suas variantes está favoritada).
 * @param {object} group
 * @param {string[]} favorites
 * @returns {boolean}
 */
export function isGroupFavorite(group, favorites) {
  if (!group || !Array.isArray(favorites) || favorites.length === 0) return false;
  if (isProductFavorite(group.code, favorites)) return true;
  if (Array.isArray(group.variants)) {
    return group.variants.some((v) => isProductFavorite(v?.code, favorites));
  }
  return false;
}

/**
 * Valida formato de e-mail.
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Monta o payload seguro para a chamada customer-waitlist-add.
 * @param {object} params
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} [params.whatsapp]
 * @param {string} [params.productCode]
 * @param {number} [params.componentId]
 * @returns {object}
 */
export function formatRestockAlertPayload({ email, name, whatsapp, productCode, componentId }) {
  const trimmedEmail = String(email || "").trim().toLowerCase();
  const trimmedName = String(name || "").trim();
  const digitsWhatsapp = String(whatsapp || "").replace(/\D/g, "");

  return {
    buyer_email: trimmedEmail,
    buyer_name: trimmedName || (trimmedEmail ? "Cliente" : ""),
    buyer_whatsapp: digitsWhatsapp,
    product_code: productCode ? String(productCode).trim() : null,
    component_id: componentId ? Number(componentId) : null,
  };
}

if (typeof window !== "undefined") {
  window.MarisFavoritesLogic = {
    FAVORITES_STORAGE_KEY,
    EMAIL_REGEX,
    loadStoredFavorites,
    saveStoredFavorites,
    isProductFavorite,
    toggleFavoriteItem,
    countFavorites,
    isGroupFavorite,
    validateEmail,
    formatRestockAlertPayload,
  };
}

