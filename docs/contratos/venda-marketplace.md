# Venda de marketplace (Shopee, Mercado Livre, TikTok)

A tela `/vendas/nova` prepara o fluxo atrás da flag `MARKETPLACE_SALE_ENABLED` (desligada). O front **não** chama essas funções enquanto a flag estiver off.

Endpoints **ainda não estão no ar**. Nomes e corpos abaixo são o contrato assumido até o PR do back-maris; se o back divergir, ajustar o front na hora de ligar a flag.

Canal no resumo do painel já prevê `marketplace` (`admin-month-overview.channels`).

## POST register-marketplace-order

Registra venda de marketplace: baixa estoque, **sem** `seller_id` e **sem** comissão.

`POST /functions/v1/register-marketplace-order`  
Auth: equipe (staff). Preferência: só `admin`.

### Entrada

```json
{
  "marketplace": "shopee",
  "payment_status": "paid",
  "payment_method": "pix",
  "items": [{ "piece_id": 12, "quantity": 1 }],
  "client_request_id": "uuid-por-tentativa",
  "external_order_id": "opcional-id-no-marketplace",
  "customer": null
}
```

| Campo | Regra |
| --- | --- |
| `marketplace` | Obrigatório: `shopee` \| `mercado_livre` \| `tiktok` |
| `payment_status` | `paid` \| `receivable` |
| `payment_method` | `pix` \| `dinheiro` \| `cartao` |
| `items` | Igual a `sale-create`: `piece_id` número, `"c:N"` ou código; sem preço |
| `client_request_id` | UUID; mesma tentativa reusa a chave (idempotência) |
| `external_order_id` | Opcional, texto do pedido no marketplace |
| `customer` | Opcional: `null`, `{ "id" }` ou `{ "name", "whatsapp" }` |
| `seller_id` | **Não** enviar |

### Saída ok

```json
{
  "ok": true,
  "order_id": 55,
  "sale_ids": [101, 102],
  "channel": "marketplace",
  "marketplace": "shopee",
  "total": 190,
  "subtotal": 200,
  "total_pix": 190,
  "items": [],
  "customer": null,
  "paid_at": "2026-10-14T15:00:00Z",
  "created_at": "2026-10-14T15:00:00Z",
  "duplicate": false,
  "stock_updated": true,
  "payment_method": "pix",
  "payment_status": "paid",
  "commission_amount": 0,
  "sem_comissao": true
}
```

`sale_ids` são as linhas do pedido. `commission_amount` sempre `0` e `sem_comissao` sempre `true`.

### Erros

- `401` sem login; `403` sem permissão
- `400` validação (`marketplace` inválido, itens vazios, etc.)
- `409` `{ "ok": false, "error": "Algumas peças esgotaram.", "stock_issues": [...] }` (mesmo formato de `sale-create`)

## POST cancel-marketplace-order

Cancela o pedido de marketplace e **devolve as peças ao estoque**.

`POST /functions/v1/cancel-marketplace-order`  
Auth: equipe (staff). Preferência: só `admin`.

### Entrada

```json
{ "order_id": 55 }
```

Alternativa aceitável (se o back preferir linhas):

```json
{ "sale_ids": [101, 102] }
```

### Saída ok

```json
{ "ok": true, "stock_restored": true }
```

`cancel-sale` (Contas vendedoras) **não** é usado para este fluxo.

## Listagem

Enquanto não houver endpoint próprio, a tela continua em `seller-recent-sales` (só a vendedora da conta). Vendas marketplace **sem** vendedora precisam aparecer para o admin — contrato sugerido: `GET admin-recent-sales` com `"marketplace": "shopee"|"mercado_livre"|"tiktok"|null` quando `channel === "marketplace"`.

## Colunas / dados

Se ainda não existirem no banco:

- pedido/venda com `channel = marketplace`
- campo `marketplace` (`shopee` \| `mercado_livre` \| `tiktok`)
- `seller_id` nulo e comissão zero nesse canal
- cancelamento que reverte a baixa de estoque
