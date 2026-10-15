# Venda de marketplace (Shopee, Mercado Livre, TikTok Shop)

Contrato alinhado ao back-maris (PR #15 / migration `marketplace_admin_archive_views` + edges `register-marketplace-order` e `cancel-marketplace-order`).

A tela `/vendas/nova` liga o fluxo com `MARKETPLACE_SALE_ENABLED` (**ligada**). Só `admin` registra e cancela. Os rótulos na UI são Shopee, Mercado Livre e TikTok Shop (`channel` no contrato continua `tiktok`).

Pedido marketplace no banco: `source = marketplace`, `status = pago`, `seller_id` nulo, `commission_percent = 0`, `payment_method` nulo. O campo `orders.channel` guarda a plataforma (`shopee` | `mercado_livre` | `tiktok`).

## POST register-marketplace-order

`POST /functions/v1/register-marketplace-order`  
Auth: staff com papel `admin` (permission `orders.create`; o use-case exige `role === "admin"`).

### Entrada

```json
{
  "channel": "shopee",
  "items": [
    { "product_code": "AN581-R", "quantity": 1 },
    { "component_id": 12, "quantity": 2 }
  ],
  "client_request_id": "uuid-por-tentativa",
  "notes": "opcional até 500 caracteres"
}
```

| Campo | Regra |
| --- | --- |
| `channel` | Obrigatório: `shopee` \| `mercado_livre` \| `tiktok` |
| `items` | Igual a `create-order`: cada item tem `product_code` **ou** `component_id`, mais `quantity` (1–10). Opcional `item_type` (`product` \| `component`). Máx. 30 itens. Sem preço. |
| `client_request_id` | UUID opcional; mesma tentativa devolve o pedido com `duplicate: true` |
| `notes` | Opcional, até 500 caracteres |
| `seller_id`, `customer`, `payment_*`, `marketplace` | **Não** enviar |

### Saída ok

`order_payload` + `channel` (plataforma) + `duplicate`:

```json
{
  "ok": true,
  "order_id": 55,
  "source": "marketplace",
  "status": "pago",
  "subtotal": 200,
  "total": 200,
  "total_pix": 190,
  "reserved_until": null,
  "payment_method": null,
  "seller_id": null,
  "seller_name": null,
  "commission_percent": 0,
  "customer_name": null,
  "customer_whatsapp": null,
  "items": [
    {
      "id": 1,
      "code": "AN581-R",
      "name": "Anel",
      "item_type": "product",
      "component_id": null,
      "quantity": 1,
      "unit_price": 200,
      "line_total": 200,
      "status": "ativo"
    }
  ],
  "channel": "shopee",
  "duplicate": false
}
```

### Erros

- `401` sem login; `403` sem permissão (não-admin)
- `400` validação (`channel` inválido, itens vazios, notes longo, etc.)
- `409` `{ "ok": false, "error": "Algumas peças esgotaram.", "stock_issues": [...] }`

## POST cancel-marketplace-order

Cancela o pedido marketplace e devolve as peças ao estoque (`adjust_item_stock`).

`POST /functions/v1/cancel-marketplace-order`  
Auth: staff `admin` (permission `orders.cancel`; use-case exige `role === "admin"`).

### Entrada

```json
{ "order_id": 55, "reason": "opcional até 500 caracteres" }
```

### Saída ok

Mesmo formato de `order_payload` + `channel` (plataforma do pedido) + `duplicate: false`. O pedido fica `status: cancelado`.

### Erros

- `400` pedido inválido / não é marketplace / já cancelado / motivo longo
- `404` pedido não encontrado
- `401` / `403` auth

`cancel-sale` (Contas vendedoras) **não** é usado neste fluxo.

## Listagem

Enquanto a tela de vendedora usa `seller-recent-sales`, vendas marketplace (sem vendedora) aparecem no painel via `admin-recent-sales` com `channel: "marketplace"` (`admin_dashboard_channel(source)`). A plataforma específica (`shopee` etc.) vem na resposta de register/cancel (`channel` = plataforma) e em `orders.channel`.
