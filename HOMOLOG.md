# Homolog — front-maris

Isolamento: **mesmo projeto Vercel**, segundo projeto Supabase. Sem segundo Vercel.

| | Produção | Homolog |
|---|----------|---------|
| Branch | `main` | `staging` |
| Vercel | Production (URL principal) | Preview da `staging` |
| Supabase | `epuvfjdyyzccsuafwopr` | `mebwwllktoqeycfaufkx` (`maris-homolog`) |
| URL API | `https://epuvfjdyyzccsuafwopr.supabase.co` | `https://mebwwllktoqeycfaufkx.supabase.co` |
| `APP_ENV` | `production` | `staging` |

## 1. Secrets das Edge Functions (homolog)

Dashboard: https://supabase.com/dashboard/project/mebwwllktoqeycfaufkx/functions/secrets

O service role **já é injetado** automaticamente (`SUPABASE_SERVICE_ROLE_KEY`); o código do back aceita esse fallback. Ainda configure:

| Secret | Valor sugerido |
|--------|----------------|
| `STAFF_SITE_PASSWORD` | `maris-homolog-test` (só homolog; troque se quiser) |
| `STAFF_JWT_SECRET` | `boytQKxdBNEwigfILGHRDJu9YhT2j4FAcXqW5C76lP1nazVM` (só homolog; pode trocar) |
| `WHATSAPP_ENABLED` | `false` |

Opcional: `SERVICE_ROLE_KEY` = service_role do homolog (só se quiser o nome antigo; não é obrigatório no homolog).

As 14 functions já estão deployadas no homolog.

## 2. Variáveis no Vercel (mesmo projeto)

Project → Settings → Environment Variables:

**Production** (só Production):

- `SUPABASE_URL` = `https://epuvfjdyyzccsuafwopr.supabase.co`
- `SUPABASE_ANON_KEY` = anon key de **prod** (Settings → API)
- `APP_ENV` = `production`

**Preview** (só Preview):

- `SUPABASE_URL` = `https://mebwwllktoqeycfaufkx.supabase.co`
- `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lYnd3bGxrdG9xZXljZmF1Zmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTk5ODMsImV4cCI6MjEwMDEzNTk4M30.F3iOT-wftzoKN64FhI0mO1wyfbKP7MqATzhWnU3lFeE`
- `APP_ENV` = `staging`

No build, `npm run build` → `node scripts/generate-env.js` sobrescreve `/env.js`.

## 3. Fluxo

1. Push na branch `staging`
2. Abrir o Preview URL do Vercel (badge **HOMOLOG** no painel)
3. Testar checklist abaixo
4. Merge `staging` → `main` → Production

## 4. Checklist de teste (Waves 1–3) no Preview

### Wave 1 — confiança
- [ ] Catálogo: produto com tipos (HOMO-002) mostra **Ver tipos**, não adiciona o pai
- [ ] Cesta compartilhada: merge + clamp de estoque; link sem id / inválido / vazio distintos
- [ ] Detalhe carrinho: venda parcial **não** remove o carrinho inteiro; confirmação; Pix; UI trava após sucesso
- [ ] `/vendas`: Enter na busca **não** registra venda; confirmação com total; faixa de selecionados
- [ ] `/tipos-produto`: HOMO-002 aparece disponível via tipos; wipe de tipos pede confirmação
- [ ] Contas: marcar pago pede confirmação (com 70% se repasse)

### Wave 2 — fricção
- [ ] Home Catálogo vai a `/catalog`; `/catalogo` redireciona
- [ ] **Sair** no painel; **Voltar ao painel** no catálogo (com token staff)
- [ ] Importar / adicionar peça: mensagens humanas (não JSON cru)
- [ ] Memória da vendedora no POS; busca por nome de tipo
- [ ] Carrinho: caminho primário “enviar à vendedora”

### Wave 3 — polimento
- [ ] Badge **HOMOLOG** visível no painel (`APP_ENV=staging`)
- [ ] Vocabulário **tipos**; cesta `(0)` sempre visível
- [ ] Gate `/equipe` com autofocus / next seguro

### Dados de seed
- Vendedoras: Homolog Vendedora A/B
- Produtos: HOMO-001 (estoque), HOMO-002 (tipos), HOMO-003 (sem estoque)
- Re-seed: [`../back-maris/supabase/seed-homolog.sql`](../back-maris/supabase/seed-homolog.sql) (path no monorepo local `D:\Maris\back-maris\supabase\seed-homolog.sql`)

## Cuidados

- Preview **nunca** com vars/banco de produção
- Não copiar dump de vendas/clientes reais
- Plano: `C:\Users\pedro\.cursor\plans\maris_homolog_staging_672b77d0.plan.md`
