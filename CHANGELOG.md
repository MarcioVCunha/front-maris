# Changelog

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- Painel do administrador em `/admin`, ligado (`ADMIN_DASHBOARD_ENABLED`). O menu é Início, Estoque, Vendas, Vendedoras e Promoções. O estoque lista as peças, edita preço, quantidade, categoria, fotos e os dados fiscais, e arquiva com confirmação. Adicionar peça e Importar ficam nesse painel, e a aba Tipos grava o SKU no padrão código-TIPO. Os nomes e os corpos ficam em `painel.api.js`.
- Brilho de carregamento (`compartilhado/loading.js`): estrela de 4 pontas ✦ que enche e esvazia nas cores da Maris. Usado no catálogo, na cesta e no painel (boot e troca de aba), com `role="status"`, `aria-label="Carregando"` e sem animação quando `prefers-reduced-motion`.
- Venda de marketplace (Shopee, Mercado Livre, TikTok) preparada em `/vendas/nova` atrás de `MARKETPLACE_SALE_ENABLED` (desligada). Contrato em `docs/contratos/venda-marketplace.md` (back-maris PR #15): `register-marketplace-order` com `channel` + itens `product_code`/`component_id`, sempre pago e sem comissão; `cancel-marketplace-order` com `order_id` e `reason?` devolvendo estoque.

### Alterado

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
