# Catálogo e peças arquivadas

Contrato alinhado ao back-maris (PR #15 / migration `marketplace_admin_archive_views`).

## POST admin-product-archive

`POST /functions/v1/admin-product-archive`  
Auth: staff com permissão `products.write` (admin).

### Entrada

```json
{ "code": "AN581-R", "archive": true }
```

| Campo | Regra |
| --- | --- |
| `code` | Obrigatório |
| `archive` | Opcional. Padrão `true` (arquivar). `false` desarquiva (`archived_at = null`). Tem de ser boolean se enviado. |

O painel envia `{ "code" }` para arquivar (equivale a `archive: true`).

### Saída ok (arquivar)

```json
{ "ok": true, "code": "AN581-R", "archived_at": "2026-10-14T15:00:00.000Z", "already_archived": false }
```

Se já estava arquivada: `already_archived: true` e o `archived_at` atual.

### Saída ok (desarquivar, `archive: false`)

```json
{ "ok": true, "code": "AN581-R", "archived_at": null, "already_archived": false, "already_unarchived": false }
```

Se já estava ativa: `already_unarchived: true`.

### Erros

- `400` código vazio / `archive` não boolean / tentativa de mandar custo
- `404` peça não encontrada
- `401` / `403` auth

## Como o catálogo esconde arquivadas

A view pública já filtra no banco:

```sql
CREATE OR REPLACE VIEW public.products_public AS
SELECT
  id, created_at, code, name, unit_price, image_url, quantity, alterado_at,
  is_on_sale, discount_percent, categoria,
  ... AS preco_efetivo,
  ... AS preco_pix
FROM products
WHERE catalog_product_visible(code);
```

`catalog_product_visible(code)` é `true` só quando `products.archived_at IS NULL`.

A view **não** expõe a coluna `archived_at`. O catálogo anônimo lê só `products_public`, então peças arquivadas não aparecem.

### Front

`catalog-read.js` ainda aplica `withoutArchivedProducts` se alguma linha vier com `archived_at` preenchido (defesa). A exclusão efetiva é a da view / `catalog_product_visible`.
