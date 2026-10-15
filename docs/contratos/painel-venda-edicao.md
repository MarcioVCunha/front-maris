# Edição de venda no painel admin

Componente reutilizável em `public/paginas/admin/venda-edicao.logic.js` (Início, Vendas e Vendedoras — Fase 2 passos 3–4).

Flag: `ADMIN_SALE_EDIT_ENABLED` (**ligada**). Back-maris PR #18 **publicado**.

## Campos separados (não misturar)

- `seller_name` / `seller_id` — vendedora
- `payment_status` — status (`paid` | `partial` | `receivable` | …)
- `payment_method` — método (`pix` | `dinheiro` | `cartao` | …)

## Edges (nomes exatos, back #18)

| Edge | Versão | Método | Query / corpo | Permissão |
| --- | --- | --- | --- | --- |
| `admin-recent-sales` | **v3** | GET | `limit`, `p_channel?` | `orders.read_all` |
| `admin-sale-get` | **v1** | GET | `order_id` | `orders.read_all` |
| `admin-sale-update` | **v1** | POST | `{ order_id, total?, items?: [{ id?, code, component_id?, quantity, unit_price? }] }` | `orders.write_all` |
| `admin-sale-cancel` | **v1** | POST | `{ order_id }` | `orders.write_all` |
| `admin-sale-mark-paid` | **v1** | POST | `{ order_id }` | `orders.write_all` |

### `admin-recent-sales` v3

Cada venda traz `seller_name`, `payment_status` e `payment_method` **separados**, mais `items[]`:

`{ id, code, name, quantity, unit_price, line_total, image_url, component_id?, legacy_sale_id? }`

Query opcional `p_channel` filtra no servidor (`site` \| `equipe` \| `shopee` \| `mercado_livre` \| `tiktok`).

Capa da venda no front: primeira `image_url` dos itens (ou `image_url` no nível da venda, se vier). Chips de vendedora/status/método e foto por peça no diálogo usam esses campos.
