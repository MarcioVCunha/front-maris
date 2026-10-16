# Changelog

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- Painel de Promoções por Campanhas (`/promocoes`): interface moderna conectada aos endpoints `admin-promotion-list`, `admin-promotion-save` e `admin-promotion-end` (back-maris PR #19); listagem em cards com badges de status (Ativa, Agendada, Encerrada, Esgotada), tipo e valor de desconto (% ou R$ fixo), alcance (categoria ou peças específicas), vigência e contador de peças vendidas com limite; diálogo modal para criar e editar campanhas com validação completa no client; botão de encerramento imediato de campanhas ativas com confirmação; busca rápida e abas de filtro por status; animação de carregamento integrada (`loading.css`).

- Selo "Novidade" e busca com sugestões inteligentes: selo atualizado para peças cadastradas há ≤ 15 dias (`NEW_DAYS = 15`) com etiqueta "Novidade"; busca rápida no catálogo agora com suporte a termos com ou sem acentuação (`foldText`) em nome, código e categoria; componente de sugestões rápidas (`#catalog-search-suggestions`) com atalhos de coleções (Novidades, Promoções), categorias e peças correspondentes direto ao digitar ou focar; botão de limpar busca (`×`) acessível e otimizado para celulares.

- Bloco "Combina com" na página da peça (`#piece-page` / `/catalog?peca=...`): quando o produto possui tipos/divisões de conjunto (`product_components`), exibe cards individuais das divisões com tag "Conjunto", badge de promoção, disponibilidade de estoque e botão "+ Adicionar à cesta" direto; quando o produto não possui tipos cadastrados, exibe sugestões de categorias complementares (ex.: Anel combina com Brinco/Colar/Pulseira) ordenadas com prioridade para peças disponíveis em estoque e que combinam com a cor/banho do metal da peça visualizada.

- Compartilhamento de peça no WhatsApp com prévia Open Graph: botão "Compartilhar no WhatsApp" na visualização da peça (`/catalog?peca=...`) e no modal do produto, gerando mensagem pré-formatada com nome, preço, desconto no Pix à vista e link direto; suporte nativo à Web Share API (`navigator.share`) no celular; metatags Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) e Twitter Cards configuradas e atualizadas dinamicamente conforme a peça em exibição.


- Faixa informativa no topo (anúncios) e página institucional de Trocas e Garantia (`/trocas`): faixa superior configurável em páginas do catálogo com destaques de envio pelas plataformas (Shopee, Mercado Livre, TikTok Shop), desconto de 5% no Pix à vista e link direto para as políticas da loja; página `/trocas` completa com políticas de garantia legal de 90 dias (CDC art. 26), prazo estendido de troca ou retorno em até 1 mês (30 dias corridos) para compras exclusivas realizadas no site, envio seguro com embalagem padronizada (80 g / 20 × 17 × 5 cm), guia prático de cuidados com semijoias e canal direto com o WhatsApp oficial; folha base unificada `compartilhado/imports.css` para centralizar estilos compartilhados e simplificar o HTML institucional; rotas limpas no `vercel.json` (`/trocas` rewrite, `/trocas.html` e `/garantia` redirects).

- Paridade de preços no catálogo, carrinho e Nova venda: `selectPricedComponents` passa a solicitar `preco_efetivo` e `preco_pix` da view `product_components_priced`; `effectivePrice` e `hasPromo` dão precedência ao valor promocional do banco (`preco_efetivo`) tanto em produtos quanto em divisões/componentes; `offerFromProduct` reconhece campanhas ativas do banco sem depender da flag legada `is_on_sale`; `togglePiece` em Nova venda prioriza `preco_efetivo` nas seleções de venda.
- Botão "Desfazer" ao cancelar uma venda na edição de venda do painel: fecha o diálogo, oculta a venda da listagem imediatamente e exibe aviso com botão "Desfazer" (buffer de 8 segundos) antes de confirmar o cancelamento no servidor.
- Filtro por status na aba Vendas do painel (`/admin/vendas`): barra com botões de filtro (Todas, A receber, Pagas, Canceladas) que reflete o status ativo, consulta o back-maris com o parâmetro `status` e filtra os cards na tela.
- Painel do administrador em `/admin`, ligado (`ADMIN_DASHBOARD_ENABLED`). O menu é Início, Estoque, Vendas, Vendedoras e Promoções. O estoque lista as peças, edita preço, quantidade, categoria, fotos e os dados fiscais, e arquiva com confirmação. Adicionar peça e Importar ficam nesse painel. A aba **Conjuntos** (antes Tipos) grava divisões no padrão código-DIVISAO; a tela completa de cards/edição/criação usa `ADMIN_CONJUNTOS_ENABLED` (ligada com back-maris PR #17). Contrato em `docs/contratos/painel-conjuntos.md`. Os nomes e os corpos ficam em `painel.api.js`.
- Brilho de carregamento (`compartilhado/loading.js`): estrela de 4 pontas ✦ que enche e esvazia nas cores da Maris. Usado no catálogo, na cesta e no painel (boot e troca de aba), com `role="status"`, `aria-label="Carregando"` e sem animação quando `prefers-reduced-motion`.
- Catálogo alinhado ao back-maris PR #15: `products_public` esconde arquivadas via `catalog_product_visible` (`archived_at IS NULL`); `catalog-read.js` ainda descarta `archived_at` se vier na linha. `admin-product-archive` documentado com `{ code, archive? }` (ver `docs/contratos/catalogo-arquivadas.md`).
- Venda de marketplace em `/vendas/nova` ligada (`MARKETPLACE_SALE_ENABLED`): Shopee, Mercado Livre e TikTok Shop. Contrato em `docs/contratos/venda-marketplace.md` (back-maris PR #15): `register-marketplace-order` com `channel` + itens `product_code`/`component_id`, sempre pago e sem comissão; `cancel-marketplace-order` com `order_id` e `reason?` devolvendo estoque.
- Painel Início Fase 2 (back-maris PR #16), ligada (`ADMIN_HOME_CHANNELS_ENABLED`): totais do mês por canal (`site`, `equipe`, `shopee`, `mercado_livre`, `tiktok`) com comparação ao mês anterior e mais vendidas com divisão por canal. No estoque/edição, preço do site editável e `preco_marketplace` só leitura (2,5×custo+5, ceil até `,90`). Contrato em `docs/contratos/painel-admin-inicio.md`. Se a resposta ainda vier no formato antigo (`marketplace` agregado), a tela cai nesse layout.
- Início do painel redesenhado: largura útil da área (PC e celular), origens em cards numa faixa com scroll horizontal, toque filtra vendas daquele canal no lugar de Mais vendidas (toque de novo volta). Cards de venda com foto (quando o back mandar), valor, data, vendedora e status. Componente reutilizável de edição em `venda-edicao.logic.js`.
- Edição de venda no painel ligada (`ADMIN_SALE_EDIT_ENABLED`) ao back-maris PR #18 publicado: `admin-recent-sales` v3 (`p_channel`, `items[]` com `image_url`, `seller_name` / `payment_status` / `payment_method` separados) e `admin-sale-get` / `admin-sale-update` / `admin-sale-cancel` / `admin-sale-mark-paid` v1 (`orders.read_all` / `orders.write_all`). Contrato em `docs/contratos/painel-venda-edicao.md`.
- Vendas e Vendedoras do painel usam os mesmos cards e o mesmo diálogo de venda do Início (chips de status com as cores do plano). Em Vendedoras, toque numa vendedora lista as vendas dela; toque de novo fecha.
- Estoque Fase 2 passo 5: Peças em cards (mesmo padrão `entity-card` / edição em diálogo), aba **Esgotadas** separada, quantidade **1** por padrão ao adicionar peça, e **Estoque por tipo** na lista de Peças (agrupa `components[]` do `admin-product-list` v3).
- Painel Fase 2 passo 7: botão **+** fixo (Nova peça / Nova venda), toast com **Desfazer** após arquivar peça, e redirects das rotas antigas `/adicionar-peca` e `/importar` (e hubs `addProduct` / `importJson`) para `/admin/adicionar` e `/admin/importar`.
- Painel **Conjuntos** (`/admin/conjuntos`, alias `/admin/tipos`): um card por peça com divisões (foto, código, nome, SKU/qtd/% preço); clique abre edição; botão para criar divisões a partir de busca de peça; agrupamento **Estoque por tipo** (tipo = divisão de conjunto). Flag `ADMIN_CONJUNTOS_ENABLED` ligada ao back-maris PR #17 (`admin-product-list` + `admin-product-components`). Anel/Brinco etc. continuam **categoria**.

### Alterado

- Layout do painel e páginas avulsas centralizados: container único com largura máxima e centralização automática em todas as abas do admin (Início, Estoque, Vendas, Vendedoras, Conjuntos e formulários), sem saltos de largura entre abas; cabeçalhos e páginas avulsas (/vendas/nova, /contas-vendedoras e tema interno) alinhados com o mesmo padrão.
- No detalhe da venda do Início: vendedora, status e método viram etiquetas coloridas (status no plano: A confirmar, A receber, Paga, Cancelada); some o aviso técnico da flag/`docs/contratos`; a foto da peça usa `items[].image_url` de `admin-recent-sales` v3 (back-maris PR #18; `seller_name` / `payment_status` / `payment_method` separados; iniciais só como fallback).
- `/admin` abre o painel. Promoções continua em `/promocoes`, com atalho no menu.
- Entrar em `/admin` espera o perfil do administrador. Um `staff-me` interrompido pela troca de página não manda mais para a mensagem de sem permissão.
- `/admin` abre direto o painel, com o brilho de carregamento no lugar da página antiga. O perfil fica na sessão e as abas do painel trocam sem recarregar a página. O estoque busca e mostra as peças aos poucos. Início, Vendas e Vendedoras leem o resumo do mês quando o servidor responde.
- No computador (≥1024px e ≥1440px), o catálogo, a peça, a cesta e o painel ganham layout largo: filtros ao lado, grade mais ampla, menu lateral no admin e listas mais espaçosas. No celular o visual continua o de sempre.
- Em Adicionar peça, a embalagem já vem com peso 80 g, comprimento 20 cm, largura 17 cm e altura 5 cm. Os padrões por categoria vêm de `category-defaults` (tabela `category_defaults`); se a leitura falhar, fica o fallback fixo, sem apagar o que foi editado à mão.

### Alterado

- Em Contas vendedoras, "A receber" continua peça a peça. Marcar uma venda como paga não marca as outras do mesmo pedido. A peça paga some na hora e as que ainda estão a receber ficam na lista. A frase "pedido #N: 1 de 3 peças pagas" só aparece se a listagem já trouxer o pedido e as contagens.

### Removido

## [1.3.0] - 2026-10-14

### Adicionado

- Ordenação e coleção "Mais vendidas", ligadas na view `product_sales_counts`. Se a view falhar ou vier vazia, a opção some e o catálogo segue.
- Tela de registrar venda em `/vendas/nova`, ligada (`NEW_SALE_ENABLED`). Card do mês com a comissão do servidor, fluxo em três passos (peças, cliente e pagamento) e as vendas recentes da própria vendedora. Toque numa venda abre o detalhe só de leitura.

### Alterado

- A venda segue o contrato do servidor: preço Pix (`preco_pix`), WhatsApp nacional sem o 55, e o total devolvido depois de criar. O card diz quantas peças foram pagas e em quantas vendas. A lista mostra paga, parcial ou a receber. Peça esgotada (409) mostra a mensagem e deixa ajustar.
- Quem entra em `/equipe` com papel `vendedora` (sem ser admin) cai direto em `/vendas/nova`. O `seller_id` sai do perfil da equipe, como a Marineide ligada à vendedora 2.
- A venda manda só `piece_id` e quantidade, sem preço. O detalhe usa o total do servidor: subtotal das linhas, desconto do Pix e o `total` recebido.

### Removido

- Sai a tela antiga de registrar venda, que chamava `register-sale`, com o formulário, os testes e o atalho. `/vendas`, `/sales/sales.html` e `/paginas/vendas/vendas.html` redirecionam para `/vendas/nova`.
- Saem as cestas compartilhadas. O site não chama mais `create-shared-basket`, `customer-cart-share`, `list-shared-carts`, `discard-shared-cart` nem `mark-cart-converted`. Somem o link de compartilhar na cesta, a página `/catalog/cesta` e as telas `/carrinhos-clientes` e `/carrinho-cliente`.
- Links antigos `/catalog/cesta` (com qualquer query, como `?id=`) e `/catalog/cesta-compartilhada.html` redirecionam para `/catalog`.

## [1.2.0] - 2026-10-14

### Adicionado

- A cesta vira pedido. A cliente informa nome e WhatsApp e pode escolher a vendedora. A confirmação mostra os itens, o `subtotal`, o total no Pix (`total_pix`) e a frase com o prazo lido de `reserved_until`.
- Peça esgotada sai da cesta, com o nome e a quantidade disponível. Peça composta esgotada cita o componente (`component_id`) e sai só essa linha.
- O preço com promoção lê `products_public.preco_efetivo` e o Pix do catálogo lê `products_public.preco_pix` quando o valor vem preenchido. Se a coluna não existir ou vier nula, continua o cálculo local.

### Alterado

- O link de compartilhar a cesta sai da tela. A flag `ORDERS_ENABLED` está ligada.

## [1.1.0] - 2026-10-09

### Adicionado

- Fotos maiores no cartão, com fundo único, e segunda foto ao deslizar.
- Filtros de categoria, preço, cor (dourado, ródio, aço e aço dourado) e só disponíveis. No celular ficam numa gaveta.
- Ordenação por menor preço, maior preço e novidades.
- Preço de/por com percentual de desconto e preço no Pix (5% sobre o valor já final) no cartão, na peça e na cesta.
- Página da peça com galeria, cores, preços, peças da mesma categoria e o texto de cuidados aprovado. No aço, entra uma linha a mais.
- Selo "Novo" até 30 dias depois do cadastro (`NEW_DAYS`).
- Selo "Última unidade" pronto para quando a peça tiver exatamente 1 em estoque e 3 ou mais no cadastro. A flag fica desligada: a view pública não guarda essa quantidade inicial.
- Coleção "Mais vendidas" preparada para a view `product_sales_counts` (`code` e `total_vendido`), somando as cores do cartão. Empate fica com o `created_at` mais recente. A flag fica desligada. Se a view não existir, o catálogo segue sem erro.
- Cesta fixa com total e total no Pix.
- Links `?categoria=` e `?peca=` que abrem a cor disponível, caem na categoria se a peça estiver esgotada e preservam `utm_source`.
- A página da peça fechada não aparece mais no computador.

## [1.0.0] - 2026-10-09

### Adicionado

- Catálogo público com banner, frase da loja e WhatsApp único.
- Filtro de categorias lido da coluna gravada no banco, com volta ao nome da peça quando a categoria está vazia ou é desconhecida.
- Cores dourado, ródio, aço e aço dourado agrupadas no mesmo cartão. Peças esgotadas ficam no fim.
- Login individual da equipe. Vendedora acessa vendas, cestas e tipos; o restante da administração fica com o admin.
- Aviso amarelo no cadastro e na importação quando uma foto não é copiada e continua no fornecedor.
- A importação espera o processamento das fotos e avisa que pode levar até 2 minutos.
- Testes em Deno e build de verificação em todo pull request e na `main`.

[1.3.0]: https://github.com/MarcioVCunha/front-maris/compare/545c35d...cursor/liga-venda-nova-9fa9
[1.2.0]: https://github.com/MarcioVCunha/front-maris/commit/0b26bf8
[1.1.0]: https://github.com/MarcioVCunha/front-maris/commit/690694e
[1.0.0]: https://github.com/MarcioVCunha/front-maris/commit/ffa162d
