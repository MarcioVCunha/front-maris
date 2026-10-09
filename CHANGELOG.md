# Changelog

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- A cesta pode virar pedido. A cliente informa nome e WhatsApp e escolhe a vendedora se quiser. A confirmação mostra os itens, o total e o total no Pix devolvidos por `create-order`, e a frase com o prazo lido de `reserved_until`. A reserva é de 7 dias. Um envio repetido mostra o mesmo pedido. Peça esgotada sai da cesta, com nome, quantidade disponível e motivo.
- A chamada `create-order` fica num módulo só, atrás da flag `ORDERS_ENABLED` desligada. Com a flag desligada, a cesta segue como hoje. Com ela ligada, o link de compartilhar a cesta some. Esse código fica isolado para ser apagado nesse dia.
- O Pix do catálogo usa a coluna de `products_public` quando `PIX_PRICE_FIELD` tiver nome. Enquanto a constante está vazia, o preço no Pix continua o cálculo local.
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

[1.0.0]: https://github.com/MarcioVCunha/front-maris/commit/ffa162d
