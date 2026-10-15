# Edição de venda no painel admin

Componente reutilizável em `public/paginas/admin/venda-edicao.logic.js` (Início; Vendas e Vendedoras na Fase 2 passos 3–4).

Flag: `ADMIN_SALE_EDIT_ENABLED` (**ligada**). Contrato alinhado ao back-maris PR #18.

## Campos separados (não misturar)

- `seller_name` / `seller_id` — vendedora
- `payment_status` — status (`paid` | `partial` | `receivable` | …)
- `payment_method` — método (`pix` | `dinheiro` | `cartao` | …)

## Edges / RPCs (back #18)

| Edge | Método | Corpo / query | Uso no front |
| --- | --- | --- | --- |
| `admin-recent-sales` | GET `?limit=` | — | Lista com `items[]` (foto por peça) |
| `admin-sale-get` | GET `?order_id=` | — | Detalhe ao abrir o diálogo |
| `admin-sale-update` | POST | `{ order_id, total?, items?: [{ id?, code, component_id?, quantity, unit_price? }] }` | Salvar |
| `admin-sale-cancel` | POST | `{ order_id }` | Cancelar (qualquer canal) |
| `admin-sale-mark-paid` | POST | `{ order_id }` | Marcar como paga |

### `items[]` (lista e detalhe)

Cada item: `{ id, code, name, quantity, unit_price, line_total, image_url, component_id?, legacy_sale_id? }`.

Capa da venda: primeira `image_url` dos itens, ou `image_url` no nível da venda.

### Auth

Staff admin (`orders.read_all` / `orders.write_all` conforme o back).

Sem o deploy do back #18, as mutações falham na rede; a UI e os payloads já estão prontos para aprovação.
