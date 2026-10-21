# Instruções para Agentes Autônomos (Grok Bot / Cursor Agent)
- Antes de planejar ou editar qualquer código neste repositório, leia e siga estritamente as regras em `.cursor/rules/01-geral-loja.mdc`.
- Ao mexer em rotas de backend, banco de dados, estoque ou pagamentos, leia e aplique `.cursor/rules/02-negocio-loja.mdc`.
- Priorize economia de contexto: leia apenas os arquivos estritamente necessários para a tarefa atual.
- Domínio canônico de produção: `https://lojamaris.com.br`. Use-o em fallbacks de share/OG, `og:url`, canonical e exemplos de `redirect_url`. O host `front-maris.vercel.app` redireciona (308) para o domínio canônico via `vercel.json`; previews `*.vercel.app` não redirecionam.
