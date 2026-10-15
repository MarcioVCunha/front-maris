# Dados do painel admin

O painel já usa o que existe e não chama de novo o que devolveria a loja inteira.

- Estoque: `GET admin-product-list`. A função devolve todas as peças. A tela busca e mostra 20 por vez, e guarda a lista enquanto a aba fica aberta.
- Nomes das vendedoras, se o resumo do mês ainda não existe: `GET list-sellers`.
- `GET seller-month-summary` e `GET seller-recent-sales` existem, mas só devolvem a vendedora da conta que entrou. O painel não usa essas duas para ver a loja toda.

As três funções abaixo ainda não existem. São `GET`, com o login da equipe, só para papel `admin`. A resposta não traz coluna de custo, nem preço de compra, nem lucro. Enquanto a função não responde `ok: true`, a tela mostra "sem dados ainda".

## GET admin-month-overview

Início: vendas do mês, origem e mais vendidas.

`GET /functions/v1/admin-month-overview?month=YYYY-MM`

`month` vazio significa o mês atual em `America/Sao_Paulo`.

```json
{
  "ok": true,
  "month": "2026-10",
  "timezone": "America/Sao_Paulo",
  "paid_count": 12,
  "paid_orders_count": 7,
  "charged_total": 2400,
  "channels": [
    { "channel": "site", "orders": 2, "charged_total": 400 },
    { "channel": "equipe", "orders": 4, "charged_total": 1600 },
    { "channel": "marketplace", "orders": 1, "charged_total": 400 }
  ],
  "best_sellers": [
    { "code": "AN581-R", "name": "Anel rosa", "quantity": 5, "charged_total": 600 }
  ]
}
```

`paid_count` é o número de peças. `channel` é `site`, `equipe` ou `marketplace`.

Fase 2 (back-maris PR #16): totais por canal `site` \| `equipe` \| `shopee` \| `mercado_livre` \| `tiktok`, campo `previous`, comparação por canal e `best_sellers[].channels`. Contrato em `docs/contratos/painel-admin-inicio.md`. No front `ADMIN_HOME_CHANNELS_ENABLED` está ligada.

## GET admin-recent-sales

Vendas: as últimas vendas de todas as vendedoras.

`GET /functions/v1/admin-recent-sales?limit=20`

`limit` padrão 20, máximo 50.

```json
{
  "ok": true,
  "sales": [
    {
      "id": 10,
      "created_at": "2026-10-14T15:00:00Z",
      "seller_name": "Marineide",
      "channel": "equipe",
      "customer_name": "Lia",
      "total": 190,
      "payment_status": "paid",
      "payment_method": "pix",
      "items_count": 2
    }
  ]
}
```

`payment_status` é `paid`, `partial` ou `receivable`. `payment_method` é `pix`, `dinheiro` ou `cartao`.

## GET admin-sellers-month

Vendedoras: resumo do mês e saldo a receber de cada uma.

`GET /functions/v1/admin-sellers-month?month=YYYY-MM`

```json
{
  "ok": true,
  "month": "2026-10",
  "timezone": "America/Sao_Paulo",
  "sellers": [
    {
      "seller_id": 2,
      "name": "Marineide",
      "paid_count": 4,
      "paid_orders_count": 3,
      "charged_total": 890.5,
      "commission_amount": 89.05,
      "commission_percent": 10,
      "balance": 120
    }
  ]
}
```

`balance` é o que ainda está a receber. `paid_count` é o número de peças.
