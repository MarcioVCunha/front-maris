# Painel admin — Início (Fase 2, Passo 1)

Contrato alinhado ao back-maris PR #16. No front a flag `ADMIN_HOME_CHANNELS_ENABLED` está **ligada**. Se a resposta ainda vier no formato antigo (`site`/`equipe`/`marketplace`), o Início cai nesse layout; sem `preco_marketplace` a edição não mostra o campo.

## GET admin-month-overview

`GET /functions/v1/admin-month-overview?month=YYYY-MM`  
Auth: staff admin (`orders.read_all`).

`month` vazio = mês atual em `America/Sao_Paulo`.

### Saída (Fase 2)

```json
{
  "ok": true,
  "month": "2026-10",
  "timezone": "America/Sao_Paulo",
  "paid_count": 12,
  "paid_orders_count": 7,
  "charged_total": 2400,
  "previous": {
    "month": "2026-09",
    "paid_count": 10,
    "paid_orders_count": 6,
    "charged_total": 2000
  },
  "channels": [
    {
      "channel": "site",
      "orders": 2,
      "charged_total": 400,
      "previous_orders": 1,
      "previous_charged_total": 300
    },
    {
      "channel": "equipe",
      "orders": 4,
      "charged_total": 1600,
      "previous_orders": 3,
      "previous_charged_total": 1200
    },
    {
      "channel": "shopee",
      "orders": 1,
      "charged_total": 200,
      "previous_orders": 0,
      "previous_charged_total": 0
    },
    {
      "channel": "mercado_livre",
      "orders": 0,
      "charged_total": 0,
      "previous_orders": 1,
      "previous_charged_total": 150
    },
    {
      "channel": "tiktok",
      "orders": 0,
      "charged_total": 0,
      "previous_orders": 0,
      "previous_charged_total": 0
    }
  ],
  "best_sellers": [
    {
      "code": "AN581-R",
      "name": "Anel rosa",
      "quantity": 5,
      "charged_total": 600,
      "channels": [
        { "channel": "site", "quantity": 2, "charged_total": 200 },
        { "channel": "shopee", "quantity": 3, "charged_total": 400 }
      ]
    }
  ]
}
```

| Campo | Regra |
| --- | --- |
| `channels[].channel` | `site` \| `equipe` \| `shopee` \| `mercado_livre` \| `tiktok` (sempre os cinco, mesmo com zero) |
| `previous` | Totais do mês anterior (mesmo fuso) |
| `channels[].previous_*` | Comparação por canal com o mês anterior |
| `best_sellers[].channels` | Divisão da peça por canal no mês |

Formato antigo (flag off / back ainda sem PR #16): `channels` com `site` \| `equipe` \| `marketplace` e `best_sellers` sem `channels`.

## preco_marketplace (estoque)

Em `admin-product-list` / view admin de produtos (PR #16), cada peça pode trazer `preco_marketplace` calculado no banco:

`ceil(2,5 × custo + 5)` até terminar em `,90` (ex.: bruto 47,20 → 47,90).

- Só leitura no front.
- O preço editável continua `unit_price` (preço do site).
- Enquanto a flag estiver off ou o campo não vier, a tela não mostra o preço marketplace.
