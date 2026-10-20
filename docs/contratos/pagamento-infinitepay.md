# Pagamento InfinitePay (carrinho)

Contrato alinhado ao back-maris PR #46 (`cursor/infinitepay-checkout-dc11`), Edge Function `payment-create-link`.

O front **não** grava no banco nem pede coluna de custo. Preços e itens do link saem do pedido já criado em `create-order`.

## Fluxo na cesta

1. `create-order` confirma o pedido (`order_id`).
2. A cliente escolhe **Pagar agora** (InfinitePay) ou **Combinar pelo WhatsApp**.
3. Em “Pagar agora”, o front chama `payment-create-link` com `order_id` + `redirect_url` e redireciona para `checkout_url`.
4. Após o pagamento, a InfinitePay devolve a cliente a `/catalog/obrigado` com query params (`order_nsu`, `receipt_url`, `slug`, `capture_method`, `transaction_nsu`).

## POST payment-create-link

`POST /functions/v1/payment-create-link`  
Auth: pública (mesmo padrão de `create-order`; sem staff token).

### Entrada

```json
{
  "order_id": 123,
  "redirect_url": "https://front-maris.vercel.app/catalog/obrigado?order_id=123"
}
```

| Campo | Regra |
| --- | --- |
| `order_id` | Obrigatório; id do pedido site já criado |
| `redirect_url` | Obrigatório; URL absoluta da página de obrigado (host front-maris / preview / localhost) |
| preços / itens / custo | **Não** enviar — o back monta a partir do pedido |

### Saída ok

```json
{
  "ok": true,
  "order_id": 123,
  "checkout_url": "https://checkout.infinitepay.io/..."
}
```

O front aceita `checkout_url`, e como alias `payment_url` ou `url`, se o back usar outro nome.

### Erro

`{ "ok": false, "error": "…" }` ou `{ "error": "…" }` com status HTTP apropriado.

## Página `/catalog/obrigado` (e `/obrigado`)

Rewrites em `vercel.json` → `public/paginas/catalogo/obrigado.html` para `/catalog/obrigado` e `/obrigado` (retorno do back com `?order_nsu=…`; a query é preservada).

Mostra o status do pedido a partir de:

1. Query da InfinitePay (`transaction_nsu` ⇒ pagamento confirmado; `capture_method`; `receipt_url`).
2. `order_id` / `order_nsu` na URL.
3. Chamada pública `order-status` (`POST` com `{ "order_id" }`) quando disponível no back; se falhar, mantém o status inferido da query (sem escrita no banco).

Labels de status alinhadas ao domínio: `a_confirmar`, `a_receber`, `pago`, `cancelado`.
