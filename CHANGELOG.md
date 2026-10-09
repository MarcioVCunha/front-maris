# Changelog

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- Fotos maiores no cartão, com fundo único, e segunda foto ao deslizar.
- Filtros de categoria, preço, cor (dourado, ródio, aço e aço dourado) e só disponíveis. No celular ficam numa gaveta.
- Ordenação por menor preço, maior preço e novidades.
- Preço de/por com percentual de desconto e preço no Pix (5% sobre o valor já final) no cartão, na peça e na cesta.
- Página da peça com galeria, cores, preços e peças da mesma categoria.
- Cesta fixa com total e total no Pix.
- Links `?categoria=` e `?peca=` que abrem a cor disponível, caem na categoria se a peça estiver esgotada e preservam `utm_source`.

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
