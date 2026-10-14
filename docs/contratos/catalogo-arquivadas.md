# Catálogo e peças arquivadas

Arquivar no painel usa `POST admin-product-archive` com `{ "code": "AN581-R" }` e grava `products.archived_at`.

## Problema

A view `public.products_public` (lida pelo catálogo anônimo) é hoje:

```sql
SELECT ... FROM products;
```

Sem `WHERE archived_at IS NULL`. Peça arquivada continua no catálogo público.

## Correção no banco (back-maris / SQL)

Recriar a view filtrando arquivadas. Manter as colunas atuais (`preco_efetivo`, `preco_pix`, etc.):

```sql
CREATE OR REPLACE VIEW public.products_public AS
SELECT
  id,
  created_at,
  code,
  name,
  unit_price,
  image_url,
  quantity,
  alterado_at,
  is_on_sale,
  discount_percent,
  categoria,
  effective_unit_price(
    unit_price::numeric,
    CASE WHEN COALESCE(is_on_sale, false) THEN discount_percent ELSE 0::numeric END
  )::numeric(10,2) AS preco_efetivo,
  pix_price(
    effective_unit_price(
      unit_price::numeric,
      CASE WHEN COALESCE(is_on_sale, false) THEN discount_percent ELSE 0::numeric END
    )
  )::numeric(10,2) AS preco_pix
FROM products
WHERE archived_at IS NULL;
```

Opcional: expor `archived_at` na view (sempre null com o filtro) — o front já descarta linhas com `archived_at` preenchido se a coluna aparecer.

## Front

`catalog-read.js` aplica `withoutArchivedProducts` na resposta. Enquanto a view não filtrar, a coluna não vem e o filtro no cliente não consegue esconder — a correção efetiva é a view.
