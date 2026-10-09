# Maris Semijoias

Site da loja familiar de semijoias. O visitante vê o catálogo e monta a cesta. A equipe entra por login individual para vender, cuidar do estoque e administrar a loja.

O site é estático: HTML, CSS e JavaScript em `public/`, publicado na Vercel. Os dados ficam no Supabase, acessados pelo navegador com a chave pública e por funções no servidor. Nada sobe para produção sem a aprovação do Marcio.

## Páginas

| Endereço | Quem usa | O que faz |
|---|---|---|
| `/catalog` | Visitante | Catálogo, filtros, cesta |
| `/catalog/carrinho` | Visitante | Revisão da cesta e envio à vendedora |
| `/catalog/cesta` | Visitante | Cesta compartilhada por link |
| `/equipe` | Equipe | Login com e-mail e senha |
| `/equipe/nova-senha` | Equipe | Nova senha a partir do e-mail |
| `/admin` | Administração | Atalhos da administração |
| `/vendedoras` | Equipe | Atalhos da vendedora |
| `/vendas` | Equipe | Registrar venda |
| `/carrinhos-clientes` | Equipe | Cestas enviadas pelas clientes |
| `/carrinho-cliente` | Equipe | Detalhe de uma cesta |
| `/lista-espera` | Administração | Lista de espera |
| `/adicionar-peca` | Administração | Cadastrar uma peça |
| `/importar` | Administração | Importar várias peças por JSON |
| `/tipos-produto` | Equipe | Tipos de uma peça |
| `/promocoes` | Administração | Promoções |
| `/contas-vendedoras` | Administração | Contas da equipe |
| `/` | Equipe | Painel inicial |

As rotas curtas vêm do `vercel.json`. No servidor local elas só funcionam se o servidor aplicar esses rewrites.

## Stack

- Páginas estáticas, sem framework
- Deno para os testes
- Node para gerar `public/env.js` no build
- Supabase no navegador (leitura do catálogo e login da equipe)
- Vercel para publicar, com Web Analytics e Speed Insights

## Rodar no computador

```bash
npm ci
npm run build
```

O build precisa destas variáveis. Use valores de teste, não os de produção:

```bash
SUPABASE_URL=https://exemplo.supabase.co \
SUPABASE_ANON_KEY=chave-publica-de-teste \
APP_ENV=staging \
npm run build
```

Depois sirva a pasta `public/`. Um jeito simples:

```bash
python3 -m http.server 8765 --directory public
```

Abra `http://127.0.0.1:8765/paginas/catalogo/catalogo.html`. O endereço `/catalog` depende dos rewrites da Vercel.

## Testar

```bash
deno task test
```

O mesmo build do CI, com valores fictícios:

```bash
SUPABASE_URL=https://ci.invalid.supabase.co \
SUPABASE_ANON_KEY=ci-dummy-anon-key \
APP_ENV=staging \
npm run build
```

O `public/env.js` gerado não deve ser commitado com dados reais. O CI confere que o build de teste não gravou o projeto de produção.

## CI

O workflow em `.github/workflows/ci.yml` roda em todo pull request e em todo push na `main`. Ele instala as dependências, roda `deno task test` e o build com as variáveis fictícias acima. O merge só segue com esses checks verdes, e ainda assim só com a aprovação do Marcio.

## Deploy

A Vercel publica o que está na `main` a partir de `public/`. Preview de pull request também passa pelo mesmo build. Não fazer merge nem publicar nada sem a aprovação do Marcio.

## O que o catálogo já faz

Está resumido no `CHANGELOG.md`, na seção `[Unreleased]`.

Nesta etapa o visitante vê fotos maiores, desliza para a segunda foto, filtra por categoria, preço, cor e disponibilidade (no celular, dentro de uma gaveta) e ordena por menor preço, maior preço ou novidades. O preço promocional aparece como de/por com o percentual, e o Pix é 5% sobre o preço já final, também na cesta fixa. A página da peça tem galeria, cores e peças da mesma categoria. Os links `?categoria=` e `?peca=` abrem direto no catálogo e guardam `utm_source`.

Ainda sem regra definida, e por isso desligados: os selos "Últimas unidades" e "Novo", o texto de cuidados com a peça e a coleção "Mais vendidas".
