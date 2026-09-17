# front-maris

Front estático da Maris Semijoias (HTML/CSS/JS), publicado na Vercel.

## Estrutura

```
front-maris/
├── public/                 # o que a Vercel serve
│   ├── index.html          # painel inicial
│   ├── env.js              # gerado no build
│   ├── assets/             # CSS global (tema, home)
│   ├── compartilhado/      # api, utils, ui, staff-auth…
│   └── paginas/
│       ├── admin/          # hubs + login da equipe
│       ├── estoque/        # importar, adicionar peça, tipos, promoções
│       ├── vendas/         # vendas, carrinhos, lista de espera
│       ├── vendedoras/     # contas / repasse
│       └── catalogo/       # catálogo público + cesta
├── scripts/                # generate-env.js
├── package.json
├── vercel.json
└── README.md
```

## Rotas públicas (não mudaram)

| URL | Página |
|-----|--------|
| `/` | Painel |
| `/admin` | Administração |
| `/vendedoras` | Hub vendedoras |
| `/vendas` | Registrar vendas |
| `/carrinhos-clientes` | Carrinhos compartilhados |
| `/lista-espera` | Lista de espera |
| `/contas-vendedoras` | Contas |
| `/importar` | Importar JSON |
| `/adicionar-peca` | Cadastrar peça |
| `/tipos-produto` | Tipos / subtipos |
| `/promocoes` | Promoções |
| `/catalog` | Catálogo público |
| `/catalog/carrinho` | Cesta do cliente |
| `/equipe` | Login da equipe |

## Desenvolvimento local

```bash
npm run generate-env
npx serve public
```

Ou abra `public/` com qualquer servidor estático. As rotas “bonitas” (`/vendas`, etc.) dependem dos rewrites do `vercel.json`.

## Testes

```bash
deno task test
```

## Homolog

Ver `HOMOLOG.md`.
