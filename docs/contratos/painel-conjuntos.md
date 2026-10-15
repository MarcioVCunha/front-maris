# Painel Conjuntos (divisões de peça)

Contrato alinhado ao back-maris PR #17 (`admin-product-list` + `admin-product-components`).

Na Maris:

| Termo antigo na UI | Significado |
| --- | --- |
| Tipo | **Divisão** de uma peça de conjunto (ex.: brinco e colar vendidos separados) |
| Categoria | Anel, Brinco, Colar… (campo `categoria` do produto) |

No front a tela **Conjuntos** (antes “Tipos”) fica atrás de `ADMIN_CONJUNTOS_ENABLED` (**desligada**) até o PR #17 estar no ar. Com a flag off, o painel mantém o editor legado de SKU (com textos de divisão).

## GET admin-product-list

Cada produto com divisões traz:

```json
{
  "code": "CJ100-O",
  "name": "Conjunto flor",
  "unit_price": 290,
  "image_url": "https://…",
  "categoria": "Conjunto",
  "quantity": 0,
  "components": [
    {
      "id": 12,
      "name": "Brinco",
      "sku": "CJ100-O-BRINCO",
      "quantity": 3,
      "price_percent": 45,
      "is_active": true
    },
    {
      "id": 13,
      "name": "Colar",
      "sku": "CJ100-O-COLAR",
      "quantity": 2,
      "price_percent": 55,
      "is_active": true
    }
  ]
}
```

`sku` segue `<código>-<DIVISAO>` (ex.: `CJ100-O-BRINCO`). `price_percent` é a % do preço da peça-mãe.

## POST admin-product-components

Upsert das divisões de uma peça (equivalente ao `save-product-components` legado, no painel admin).

```json
{
  "product_code": "CJ100-O",
  "components": [
    { "id": 12, "name": "Brinco", "sku": "CJ100-O-BRINCO", "quantity": 3, "price_percent": 45, "is_active": true },
    { "name": "Colar", "sku": "CJ100-O-COLAR", "quantity": 2, "price_percent": 55, "is_active": true }
  ]
}
```

- Itens com `id` atualizam; sem `id` criam; ids omitidos da lista são removidos.
- Auth: staff admin (`products.write` / `components.write`).
- Resposta: `{ ok, deleted_ids, updated_ids, inserted }`.

Enquanto `admin-product-components` não existir, o front pode cair em `save-product-components` (sem `sku` no corpo legado) só para testes locais — a flag permanece off em produção até o #17.
