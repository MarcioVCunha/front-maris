# Edição de venda no painel admin

Componente reutilizável em `public/paginas/admin/venda-edicao.logic.js` (Início, depois Vendas e Vendedoras).

Flag: `ADMIN_SALE_EDIT_ENABLED` (**desligada**). Com ela off, clicar numa venda abre o diálogo só em leitura e sem ações.

## O que o front já usa (sem edição)

- `GET admin-month-overview` — totais e origens
- `GET admin-recent-sales?limit=` — lista recente com `channel` (filtro de origem no cliente)

## O que já existe no back, mas não cobre a edição completa

| Edge / RPC | Serve para | Lacuna no painel |
| --- | --- | --- |
| `mark-sales-paid` (`sale_ids`) | Marcar peças legadas da equipe | Não recebe `order_id`; marketplace/site não entram |
| `cancel-sale` (`sale_id`) | Cancelar peça legada não paga | Id de `sales`, não de `orders` |
| `return-sale` (`sale_ids`) | Devolver peça paga | Mesmo modelo legado |
| `cancel-marketplace-order` (`order_id`) | Cancelar Shopee/ML/TikTok | Só marketplace |
| `mark_order_paid` (RPC) | Marcar pedido pago | Sem edge admin exposta no painel |
| `order_payload` (RPC) | Detalhe do pedido com itens | Sem `image_url`; sem edge admin |

## O que o Banco / back precisa criar

1. **`admin_recent_sales` (RPC + edge)** — enriquecer cada venda com:
   - `items[]`: `{ id, code, name, quantity, unit_price, line_total, image_url, legacy_sale_id? }`
   - opcional `image_url` de capa (primeira peça)
   - opcional query `channel` / `p_channel` para filtrar no servidor

2. **`admin_sale_get(p_order_id)`** (RPC + edge `admin-sale-get`) — detalhe completo para o diálogo (itens com foto, status, método, vendedora, canal). Auth: staff admin (`orders.read_all`).

3. **`admin_sale_update`** (RPC + edge) — alterar valor e/ou peças do pedido:
   - corpo sugerido: `{ order_id, total?, items?: [{ id?, code, component_id?, quantity, unit_price? }] }`
   - recalcular totais, estoque e comissão no servidor
   - permissão admin dedicada (ex.: `orders.write_all`)

4. **`admin_sale_cancel`** (RPC + edge) — cancelar **qualquer** canal (`site` \| `equipe` \| `shopee` \| `mercado_livre` \| `tiktok`) por `order_id`, devolvendo estoque. Pode envelopar `cancel-sale` / `cancel-marketplace-order` / cancel de pedido do site.

5. **`admin_sale_mark_paid`** (RPC + edge) — marcar pedido (ou peças) como pago por `order_id` / `item_ids`, cobrindo equipe, site e marketplace. Pode envelopar `mark-sales-paid` e `mark_order_paid`.

Sem esses cinco itens, a flag permanece desligada: UI e testes do componente já existem, mas não chamam mutação.
