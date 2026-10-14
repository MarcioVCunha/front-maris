# Venda de marketplace (Shopee, Mercado Livre, TikTok)

A tela `/vendas/nova` prepara o fluxo atrás da flag `MARKETPLACE_SALE_ENABLED` (desligada). O front **não** chama essas funções enquanto a flag estiver off. Não há edge function de marketplace no front hoje; `sale-create` exige `seller_id` e gera comissão de vendedora — não serve para este canal sem contrato novo.

Canal no resumo do painel já prevê `marketplace` (`admin-month-overview.channels`).

## POST marketplace-sale-create

Registra venda de marketplace: baixa estoque, **sem** `seller_id` e **sem** comissão.

`POST /functions/v1/marketplace-sale-create`  
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

`sale_ids` são as linhas canceláveis. `commission_amount` sempre `0` e `sem_comissao` sempre `true`.

### Erros

- `401` sem login; `403` sem permissão
- `400` validação (`marketplace` inválido, itens vazios, etc.)
- `409` `{ "ok": false, "error": "Algumas peças esgotaram.", "stock_issues": [...] }` (mesmo formato de `sale-create`)

## POST cancel-sale (estoque de volta)

Já existe em Contas vendedoras: devolve a peça ao estoque e marca cancelada.

Hoje o front de Contas manda só `{ "sale_id": number }` (uma linha).

Para cancelar a venda de marketplace inteira a partir de `/vendas/nova`, o backend precisa aceitar **um** destes (o front usa o primeiro que a função publicar):

### Opção A — por linhas (já alinhada ao Contas)

```json
{ "sale_id": 101 }
```

Repetir por cada id de `sale_ids`, ou aceitar:

```json
{ "sale_ids": [101, 102] }
```

### Opção B — por pedido

```json
{ "order_id": 55 }
```

Cancela todas as linhas do pedido marketplace e devolve o estoque de todas.

### Saída ok

```json
{ "ok": true, "stock_restored": true }
```

## Listagem

Enquanto não houver endpoint próprio, a tela continua em `seller-recent-sales` (só a vendedora da conta). Vendas marketplace **sem** vendedora precisam aparecer para o admin — contrato sugerido (opcional, mesma forma de `admin-recent-sales`):

`GET admin-recent-sales` já devolve `channel`. Incluir `"marketplace": "shopee"|"mercado_livre"|"tiktok"|null` em cada venda quando `channel === "marketplace"`.

## Colunas / dados

Se ainda não existirem no banco (não inventar no front):

- pedido/venda com `channel = marketplace`
- campo `marketplace` (`shopee` \| `mercado_livre` \| `tiktok`)
- `seller_id` nulo e comissão zero nesse canal
- cancelamento que reverte a baixa de estoque (como `cancel-sale` já faz nas vendas da equipe)
