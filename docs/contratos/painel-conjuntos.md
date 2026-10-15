# Painel Conjuntos (divisões de peça)

Contrato alinhado ao back-maris PR #17 no ar:

- `GET admin-product-list` **v3**
- `POST admin-product-components` **v1** (`products.write`)

Na Maris:

| Termo | Significado |
| --- | --- |
| **Tipo** / divisão | Parte de uma peça de conjunto vendida separada (brinco, colar…) — `product_components` |
| **Categoria** | Anel, Brinco, Colar… — campo `categoria` do produto |

O front liga `ADMIN_CONJUNTOS_ENABLED`. O agrupamento **Estoque por tipo** soma quantidade por nome da divisão.

## GET admin-product-list (v3)

Cada produto traz `components[]` ativos e mantém `preco_marketplace`:

```json
{
  "code": "CJ100-O",
  "name": "Conjunto flor",
  "unit_price": 290,
  "preco_marketplace": 730.9,
  "image_url": "https://…",
  "categoria": "Conjunto",
  "quantity": 0,
  "components": [
    {
      "id": 12,
      "name": "Brinco",
      "sku": "CJ100-O-BRINCO",
      "quantity": 3,
      "price_percent": 45
    },
    {
      "id": 13,
      "name": "Colar",
      "sku": "CJ100-O-COLAR",
      "quantity": 2,
      "price_percent": 55
    }
  ]
}
```

Campos por divisão: `id`, `name`, `sku`, `quantity`, `price_percent` (só ativos).

## POST admin-product-components (v1)

Upsert das divisões de uma peça. Auth: staff admin (`products.write`).

```json
{
  "product_code": "CJ100-O",
  "components": [
    { "id": 12, "name": "Brinco", "quantity": 3, "price_percent": 45, "is_active": true },
    { "name": "Colar", "quantity": 2, "price_percent": 55, "is_active": true }
  ]
}
```

Regras do servidor:

- `is_active` é **boolean** obrigatório
- soma das `%` das divisões **ativas** = **100**
- SKU gerado no servidor (`<código>-<NOME>`); o cliente não precisa enviar
- itens omitidos da lista são **desativados** (`is_active: false`), não apagados
- resposta: `{ ok, product_code, components: [...] }` (lista completa da peça)
