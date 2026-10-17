# Painel admin — Início (Fase 2, Passo 1)

Contrato alinhado ao back-maris PR #16. No front a flag `ADMIN_HOME_CHANNELS_ENABLED` está **ligada**. Se a resposta ainda vier no formato antigo (`site`/`equipe`/`marketplace`), o Início cai nesse layout; sem `preco_marketplace` a edição não mostra o campo.

## GET admin-month-overview

`GET /functions/v1/admin-month-overview?month=YYYY-MM`  
Auth: staff admin (`orders.read_all`).

`month` vazio = mês atual em `America/Sao_Paulo`.

### Saída (Fase 2)

```json
{
  "ok": true,
  "month": "2026-10",
  "timezone": "America/Sao_Paulo",
  "paid_count": 12,
  "paid_orders_count": 7,
  "charged_total": 2400,
  "profit_total": 1400,
  "sales_goal": 10000,
  "receivables_overdue": {
    "count": 2,
    "total": 350
  },
  "conversion": {
    "orders_created": 10,
    "orders_paid": 7,
    "conversion_rate": 70.0,
    "site_orders_created": 3,
    "site_orders_paid": 2,
    "site_conversion_rate": 66.7
  },
  "category_ranking": [
    {
      "category": "Brincos",
      "profit_total": 800,
      "charged_total": 1300,
      "quantity": 8,
      "margin_percent": 61.5
    }
  ],
  "previous": {
    "month": "2026-09",
    "paid_count": 10,
    "paid_orders_count": 6,
    "charged_total": 2000,
    "profit_total": 1200,
    "conversion": {
      "orders_created": 9,
      "orders_paid": 6,
      "conversion_rate": 66.7
    }
  },
  "channels": [
    {
      "channel": "site",
      "orders": 2,
      "charged_total": 400,
      "profit_total": 250,
      "previous_orders": 1,
      "previous_charged_total": 300
    },
    {
      "channel": "equipe",
      "orders": 4,
      "charged_total": 1600,
      "profit_total": 900,
      "previous_orders": 3,
      "previous_charged_total": 1200
    },
    {
      "channel": "shopee",
      "orders": 1,
      "charged_total": 200,
      "profit_total": 120,
      "previous_orders": 0,
      "previous_charged_total": 0
    },
    {
      "channel": "mercado_livre",
      "orders": 0,
      "charged_total": 0,
      "profit_total": 0,
      "previous_orders": 1,
      "previous_charged_total": 150
    },
    {
      "channel": "tiktok",
      "orders": 0,
      "charged_total": 0,
      "profit_total": 0,
      "previous_orders": 0,
      "previous_charged_total": 0
    }
  ],
  "best_sellers": [
    {
      "code": "AN581-R",
      "name": "Anel rosa",
      "quantity": 5,
      "charged_total": 600,
      "channels": [
        { "channel": "site", "quantity": 2, "charged_total": 200 },
        { "channel": "shopee", "quantity": 3, "charged_total": 400 }
      ]
    }
  ]
}
```

| Campo | Regra |
| --- | --- |
| `profit_total` | Lucro total bruto do mês (só admin) |
| `sales_goal` | Meta mensal configurada |
| `conversion` | Taxa de conversão de pedidos criados no mês em pedidos pagos (`conversion_rate` geral e do site) |
| `category_ranking` | Lista de categorias ordenadas pelo maior lucro (`profit_total`, `charged_total`, `quantity`, `margin_percent`) |
| `receivables_overdue` | `{ count, total }` de vendas a receber com mais de 7 dias |
| `channels[].channel` | `site` \| `equipe` \| `shopee` \| `mercado_livre` \| `tiktok` (sempre os cinco, mesmo com zero) com `profit_total` |
| `previous` | Totais do mês anterior (mesmo fuso) com `profit_total` e `conversion` |
| `channels[].previous_*` | Comparação por canal com o mês anterior |
| `best_sellers[].channels` | Divisão da peça por canal no mês |

Formato antigo (flag off / back ainda sem PR #16): `channels` com `site` \| `equipe` \| `marketplace` e `best_sellers` sem `channels`.

No front atual, `previous.channels` (quando vier) é mesclado em `channels[].previous_*` para a comparação por origem.

A UI do Início usa faixa horizontal de origens; toque filtra `admin-recent-sales` por `channel` no cliente. Edição de venda: `docs/contratos/painel-venda-edicao.md`.

## preco_marketplace (estoque)

Em `admin-product-list` / view admin de produtos (PR #16), cada peça pode trazer `preco_marketplace` calculado no banco:

`ceil(2,5 × custo + 5)` até terminar em `,90` (ex.: bruto 47,20 → 47,90).

- Só leitura no front.
- O preço editável continua `unit_price` (preço do site).
- Enquanto a flag estiver off ou o campo não vier, a tela não mostra o preço marketplace.

## Navegação por Período e Ticket Médio (Etapa 3)

- **Filtro de período:** Barra no topo do Início com navegação mês a mês (`◀`, `input type="month"`, `▶`, botão `Mês atual`). Sincronizado com query string `?month=YYYY-MM`.
- **Ticket Médio:** Card no cabeçalho calculando `charged_total / paid_orders_count` com comparação delta vs mês anterior (`+R$ X vs mês anterior` ou `−R$ X vs mês anterior`).
- **Margem Bruta:** Exibida no card de Lucro do Mês (`Math.round((profit_total / charged_total) * 100)% de margem bruta`).
- **Desempenho de Promoções:** A tela de promoções (`/admin/promocoes`) exibe box de desempenho para cada campanha com pedidos, peças vendidas, faturamento gerado, descontos concedidos e lucro estimado calculado no servidor pela RPC `admin_promotion_list`.
- **Exportar vendas em planilha (CSV):** Botão no Início e na aba de Vendas para download instantâneo de arquivo CSV formatado segundo os padrões brasileiros (separador `;`, formatação monetária com vírgula e codificação UTF-8 com BOM).
- **Disparo de Resumo Semanal por E-mail:** Botão `📧 Resumo semanal por e-mail` no topo do Início (`.inicio-actions-bar`) que aciona a edge function `admin-weekly-summary` com confirmação e feedback visual, enviando o fechamento dos últimos 7 dias diretamente para o e-mail do administrador.

