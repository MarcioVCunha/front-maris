# Changelog

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- Ordenação e coleção "Mais vendidas", ligadas na view `product_sales_counts`. Se a view falhar ou vier vazia, a opção some e o catálogo segue.
- Tela nova de registrar venda em `/vendas/nova`, desligada (`NEW_SALE_ENABLED`). Card do mês com 30% de comissão só sobre vendas pagas (zero para Marcio e Marineide), fluxo em três passos e as vendas recentes da própria vendedora. A tela atual em `/vendas` não muda.
- Toque numa venda recente abre o detalhe só de leitura: data, peças, cliente, WhatsApp, pagamento e total, com desconto no Pix quando for o caso. Sem editar nem cancelar.

### Alterado

- A tela nova de venda segue o contrato do servidor: comissão do mês, preço Pix (`preco_pix`), WhatsApp sem o 55 e o total devolvido depois de criar. Peça esgotada (409) mostra a mensagem e deixa ajustar. A flag continua desligada.
- Nas vendas recentes e no detalhe, a venda pode estar paga, parcial ou a receber. A linha mostra "X de Y peças pagas" e o parcial tem um selo próprio. Cada peça do detalhe indica paga (com a data) ou a receber. Pedido ainda a receber entra na lista quando alguma peça já foi paga.
- O card do mês diz quantas peças foram pagas e em quantas vendas. A comissão mostrada é o `commission_amount` do servidor.
- A venda nova manda só `piece_id` e quantidade, sem preço. O detalhe usa o total do servidor: subtotal das linhas, desconto do Pix e o `total` recebido.

### Removido

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

[1.2.0]: https://github.com/MarcioVCunha/front-maris/commit/0b26bf8
[1.1.0]: https://github.com/MarcioVCunha/front-maris/commit/690694e
[1.0.0]: https://github.com/MarcioVCunha/front-maris/commit/ffa162d
