# Pagamento InfinitePay (carrinho)

Contrato alinhado ao back-maris PR #46 (`cursor/infinitepay-checkout-dc11`), Edge Function `payment-create-link`.

O front **não** grava no banco nem pede coluna de custo. Preços e itens do link saem do pedido já criado em `create-order`. A escolha Pix/Cartão fica no checkout da InfinitePay.

## Fluxo na cesta

1. Em **Pagar**, o front chama `create-order` e, com o `order_id`, chama `payment-create-link` **sem** `payment_method`, depois redireciona para `checkout_url`.
2. A cesta mostra o total cheio e o total no Pix; abaixo de Pagar: “Pix com 5% off, cartão em até 3x sem juros ou até 12x com juros”.
3. Após o pagamento, a InfinitePay devolve a cliente a `/catalog/obrigado` (ou `/obrigado`) com query params (`order_nsu`, `receipt_url`, `slug`, `capture_method`, `transaction_nsu`).

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
| `payment_method` | **Não** enviar — o método é escolhido no checkout InfinitePay |
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
