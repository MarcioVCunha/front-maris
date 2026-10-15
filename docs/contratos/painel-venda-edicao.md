# Edição de venda no painel admin

Componente reutilizável em `public/paginas/admin/venda-edicao.logic.js` (Início; Vendas e Vendedoras na Fase 2 passos 3–4).

Flag: `ADMIN_SALE_EDIT_ENABLED` (**desligada** neste PR de chips/foto). A liga fica no PR de edição. Back-maris PR #18 **publicado**.

## Campos separados (não misturar)

- `seller_name` / `seller_id` — vendedora
- `payment_status` — status (`paid` | `partial` | `receivable` | …)
- `payment_method` — método (`pix` | `dinheiro` | `cartao` | …)

## Edges (nomes exatos, back #18)

| Edge | Versão | Método | Query / corpo | Permissão |
| --- | --- | --- | --- | --- |
| `admin-recent-sales` | **v3** | GET | `limit`, `p_channel?` | `orders.read_all` |
| `admin-sale-get` | **v1** | GET | `order_id` | `orders.read_all` |
| `admin-sale-update` | **v1** | POST | `{ order_id, total?, items?: […] }` | `orders.write_all` |
| `admin-sale-cancel` | **v1** | POST | `{ order_id }` | `orders.write_all` |
| `admin-sale-mark-paid` | **v1** | POST | `{ order_id }` | `orders.write_all` |

### `admin-recent-sales` v3 (chips e foto)

Cada venda traz `seller_name`, `payment_status` e `payment_method` **separados**, mais `items[]` com `image_url` (capa = primeira foto das peças). Query opcional `p_channel` (`site` \| `equipe` \| `shopee` \| `mercado_livre` \| `tiktok`).

Neste PR o detalhe da venda no Início só lê essa lista (chips + foto). Mutações (`admin-sale-*`) entram quando a flag for ligada.
