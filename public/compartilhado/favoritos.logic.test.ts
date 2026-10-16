import { assertEquals } from "jsr:@std/assert@1";
import {
  countFavorites,
  formatRestockAlertPayload,
  isGroupFavorite,
  isProductFavorite,
  loadStoredFavorites,
  saveStoredFavorites,
  toggleFavoriteItem,
  validateEmail,
} from "./favoritos.logic.js";

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

Deno.test("loadStoredFavorites: storage vazio ou nulo retorna array vazio", () => {
  assertEquals(loadStoredFavorites(null), []);
  assertEquals(loadStoredFavorites(createMockStorage()), []);
  assertEquals(loadStoredFavorites(createMockStorage({ maris_favoritos: "" })), []);
});

Deno.test("loadStoredFavorites: JSON inválido ou não-array retorna array vazio", () => {
  assertEquals(loadStoredFavorites(createMockStorage({ maris_favoritos: "invalid_json" })), []);
  assertEquals(loadStoredFavorites(createMockStorage({ maris_favoritos: '{"code":"P1"}' })), []);
});

Deno.test("loadStoredFavorites: remove duplicatas e itens vazios", () => {
  const storage = createMockStorage({
    maris_favoritos: JSON.stringify(["MR01", "MR02", "MR01", "", "  ", "MR03"]),
  });
  const favs = loadStoredFavorites(storage);
  assertEquals(favs, ["MR01", "MR02", "MR03"]);
});

Deno.test("saveStoredFavorites e persistência", () => {
  const storage = createMockStorage();
  saveStoredFavorites(["MR01", "MR02"], storage);
  assertEquals(loadStoredFavorites(storage), ["MR01", "MR02"]);
});

Deno.test("isProductFavorite: compara sem case sensitive", () => {
  const favs = ["MR01-O", "MR02-R"];
  assertEquals(isProductFavorite("MR01-O", favs), true);
  assertEquals(isProductFavorite("mr01-o", favs), true);
  assertEquals(isProductFavorite("MR03", favs), false);
  assertEquals(isProductFavorite("", favs), false);
});

Deno.test("toggleFavoriteItem: adiciona e remove corretamente", () => {
  let favs = ["MR01"];

  // Adiciona novo
  let res = toggleFavoriteItem("MR02", favs);
  assertEquals(res.isFav, true);
  assertEquals(res.favorites, ["MR01", "MR02"]);
  favs = res.favorites;

  // Remove existente
  res = toggleFavoriteItem("MR01", favs);
  assertEquals(res.isFav, false);
  assertEquals(res.favorites, ["MR02"]);
  favs = res.favorites;

  // Remove insensível a maiúsculas
  res = toggleFavoriteItem("mr02", favs);
  assertEquals(res.isFav, false);
  assertEquals(res.favorites, []);
});

Deno.test("countFavorites retorna quantidade", () => {
  assertEquals(countFavorites([]), 0);
  assertEquals(countFavorites(["A", "B", "C"]), 3);
  assertEquals(countFavorites(null), 0);
});

Deno.test("isGroupFavorite: verifica código principal ou variantes", () => {
  const favs = ["MR05-R"];
  const group1 = { code: "MR05-O", variants: [{ code: "MR05-O" }, { code: "MR05-R" }] };
  const group2 = { code: "MR10-O", variants: [{ code: "MR10-O" }] };

  assertEquals(isGroupFavorite(group1, favs), true);
  assertEquals(isGroupFavorite(group2, favs), false);
  assertEquals(isGroupFavorite(null, favs), false);
  assertEquals(isGroupFavorite(group1, []), false);
});

Deno.test("validateEmail: valida e-mails válidos e inválidos", () => {
  assertEquals(validateEmail("cliente@maris.com.br"), true);
  assertEquals(validateEmail("maria.silva@email.com"), true);
  assertEquals(validateEmail("invalido"), false);
  assertEquals(validateEmail("cliente@semdominio"), false);
  assertEquals(validateEmail(""), false);
  assertEquals(validateEmail(null), false);
});

Deno.test("formatRestockAlertPayload: monta payload sanitizado", () => {
  const payload = formatRestockAlertPayload({
    email: " Maria@Exemplo.com ",
    name: "Maria",
    whatsapp: "(11) 99999-8888",
    productCode: " MR01 ",
  });
  assertEquals(payload.buyer_email, "maria@exemplo.com");
  assertEquals(payload.buyer_name, "Maria");
  assertEquals(payload.buyer_whatsapp, "11999998888");
  assertEquals(payload.product_code, "MR01");
  assertEquals(payload.component_id, null);

  const payloadSemNome = formatRestockAlertPayload({
    email: "cliente@teste.com",
    productCode: "MR02",
  });
  assertEquals(payloadSemNome.buyer_name, "Cliente");
});
