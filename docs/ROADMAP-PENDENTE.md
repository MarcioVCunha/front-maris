# Maris — o que falta

Atualizado: 2026-10-23 (America/Sao_Paulo).  
Repos: `front-maris`, `back-maris`, `webScrapping-Maris`.  
Domínio: https://lojamaris.com.br

Use este arquivo como contexto na IDE do Cursor para continuar o trabalho.

---

## Feito neste ciclo (não refazer)

- [x] Role `compras` (Marineide) — painel só Compras + Vendedoras
- [x] Login de cliente ligado (`CUSTOMER_LOGIN_ENABLED`)
- [x] `labels_enabled = true` em produção
- [x] PRs mergeados: back #62, front #98
- [x] Migration `staff_role_compras` + deploy das edges de reports
- [x] Defaults de peso/medidas (sem backfill peça a peça)
- [x] Acabamentos (Fase 5) — **adiado**
- [x] Bling / MEI (Fase 4) — **adiado até o site 100%**

---

## P0 — Site público (cliente / venda)

Prioridade máxima. Impacta catálogo, checkout e conta.

### Smoke agora (5 min)

- [ ] Login Marineide → cai em `/admin/compras` (não vê estoque/admin completo)
- [ ] Aba Compras: mais vendidas + “Quero essa peça”
- [ ] Aba Vendedoras: ranking do mês
- [ ] Cliente: cadastro / login / Minha conta no site
- [ ] Pedido com frete + etiqueta (se `shipping_enabled` já estiver on)

### Frete e checkout (Fase B)

Código existe no back; validar o que já está aplicado/ligado em prod.

- [ ] Conta + token Melhor Envio com escopos de carrinho/checkout (não só cotação)
- [ ] Ligar `shipping_enabled` em prod quando cotação estiver ok
- [ ] Retirada para convidadas
- [ ] Página “Acompanhar pedido” por link/token público
- [ ] Página Obrigado com status real (`order-status`) — tirar estado incompleto / “Em breve” se ainda houver

### Etiquetas e pós-venda (Fase B2)

Flag `labels_enabled` já ligada; falta operação real.

- [ ] UI admin: criar/imprimir etiqueta com um clique
- [ ] Sync de rastreio + e-mail “Pedido enviado”
- [ ] Token Melhor Envio com escopos de geração/impressão/rastreio
- [ ] Fluxo de devolução e reembolso

### Catálogo / conversão

- [ ] Selo “Última unidade” (hoje off; falta campo de quantidade inicial ou regra clara)
- [ ] Promoção “Paradas há X dias” — tirar “Em breve” e ligar `scope=parada` de ponta a ponta
- [ ] Lista de espera: confirmar aviso por e-mail de reposição em produção (Resend + `admin-waitlist-notify`)

### Conta cliente

- [ ] Juntar cadastros duplicados do Marcio (ids 6 e 12) pela tela “Revisar cadastros”
- [ ] Encaminhar `contato@lojamaris.com.br` → Gmail (`resend-inbound-forward` + webhook Resend)

---

## P1 — Operação / painel

### Vendas

- [ ] Status “A confirmar” + confirmar pedido no painel
- [ ] Devolver peça por item (volta ao estoque)
- [ ] Remover resíduos de funções antigas (`list-orders`, `mark-order-paid` se ainda referenciados no front/docs)

### Limpeza / banco

- [ ] Aplicar migration de limpeza (`limpeza_status_parada` e afins) se ainda não estiver em prod
- [ ] Remover restos de RPCs/funções legadas documentadas no CHANGELOG como “ainda não aplicado”

### Observabilidade

- [ ] Deploy + secrets de alerta interno (`ALERT_EMAIL_TO`, etc.)
- [ ] Confirmar logs JSON e `sendStaffAlert` em cotação/pedido/webhook

---

## P2 — Segurança e LGPD (ligar com cuidado)

Muitas migrations existem no repo com nota “ainda não aplicado em produção”. Auditar o que já rodou antes de reaplicar.

- [ ] Fase R — retenção LGPD: dry-run → ok humano → agendar cron
- [ ] Advisor segurança/performance (`security_invoker`, schema `private`, backups)
- [ ] RLS/grants auditoria (se ainda pendente em prod)
- [ ] Endurecimento `is_staff` / default privileges (se ainda pendente)

Não abrir `custo`, `unit_cost` nem `sales` para anon/authenticated.

---

## P3 — Depois do site 100%

### Fase 4 — Bling / MEI

Só depois do site estável.

- [ ] Abrir MEI
- [ ] Cadastro Bling + certificado A1
- [ ] Sync estoque / NF / marketplaces

### Fase 5 — Acabamentos

- [ ] Modelo de acabamentos no produto
- [ ] UI catálogo + admin
- [ ] Impacto em preço/estoque

---

## Dívida técnica conhecida (backlog curto)

- [ ] CHANGELOG do back ainda fala em `labels_enabled` desligada / “sem deploy” — atualizar docs após o ciclo
- [ ] Conferir se migrations “ainda não aplicado” do CHANGELOG já foram aplicadas (lista longa de 14–23/10)
- [ ] Peso/medidas: defaults ok; backfill real fica para quando for mexer em frete fino
- [ ] webScrapping-Maris: fora deste ciclo (só se alimentar catálogo)

---

## Ordem sugerida na próxima sessão

1. Smoke Marineide + login cliente  
2. Frete: token Melhor Envio + `shipping_enabled` + Obrigado/acompanhar  
3. Etiqueta na UI admin (B2)  
4. Promoção paradas + waitlist e-mail  
5. Limpeza funções/banco + observabilidade  
6. LGPD retenção (com ok explícito)  
7. Bling / Acabamentos — só com site 100%

---

## Comandos úteis

```bash
# Front
cd front-maris && git pull origin main

# Back
cd back-maris && git pull origin main

# Deploy edges (exemplo)
supabase functions deploy <nome> --project-ref epuvfjdyyzccsuafwopr

# Flags em prod (SQL Editor Supabase)
# select shipping_enabled, labels_enabled from public.staff_settings where id = 1;
```

## PRs deste ciclo

- https://github.com/MarcioVCunha/back-maris/pull/62  
- https://github.com/MarcioVCunha/front-maris/pull/98  
