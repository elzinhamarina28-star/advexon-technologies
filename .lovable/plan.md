# Auditoria ADVEXON: rumo a SaaS multiempresa + atendente de WhatsApp por cliente

Auditoria somente de leitura. Nada foi alterado, conectado ou publicado.

## 1) O que já existe e funciona estruturalmente
- Login e área do cliente protegida (`/app/*`), com perfil por usuário (`profiles`: nome, empresa, segmento, tamanho da equipe).
- Banco real com regras de acesso por linha em todas as tabelas: `opportunities`, `tasks`, `diagnostics`, `profiles`, `subscriptions`, `ai_requests`, `billing_events`, `internal_test_accounts`.
- Acesso por plano decidido no servidor/banco (`get_effective_subscription`, `has_operational_access`, regras restritivas), e não só pela tela.
- Agentes ATHENA, ETHAN e FOLLOW-UP chamam o Gemini pelo servidor (a chave fica guardada). Cada mensagem é reservada antes de forma atômica e contada por mês (START 100 / GROWTH 1.000 / PRO 5.000), sem cobrar duas vezes a mesma mensagem.
- Limite de oportunidades no banco (500/2.000).
- Recebimento Kiwify: rotas e função de banco idempotente já prontas, mas desligadas por falta de token, IDs de produto e envio oficial.

## 2) Demo/estático x backend real
- Real: autenticação, perfil, vendas/oportunidades, tarefas (Organização), diagnóstico salvo, assinatura, quotas de IA.
- Demo/isolado: `/previa`, `/painel` público, `team-demo`, dashboard da página inicial, dados de `operations-data.ts`.
- Não conectado: WhatsApp, Sheets, Gmail, Excel, Instagram (`integrations.ts` marca todos com `enabled: false`). Nenhuma conexão de WhatsApp está ativa.
- Histórico dos chats: guardado só no navegador da sessão. Não fica salvo no servidor.

## 3) Multiempresa hoje
- O isolamento é **por usuário** (`user_id = auth.uid()`). Não há tabela de empresa, membros ou papéis. `company_name` é só um texto no perfil.
- Para um único dono por empresa, o isolamento atual é seguro. Mas ele **não** permite equipe (3–10 usuários), papéis (dono/atendente) nem dados compartilhados dentro da mesma empresa.
- Assinatura, quotas e limites estão ligados ao usuário, não à empresa.

## 4) O que falta para cada empresa ligar o próprio WhatsApp (rota oficial)
- Modelo de empresa: `companies`, `company_members` (com papel), `user_roles`/função de verificação e `company_id` nas tabelas operacionais.
- Cadastro do número de cada empresa pela WhatsApp Cloud API da Meta: um app Meta da ADVEXON (Tech Provider) com **Embedded Signup**. Cada cliente autoriza o próprio WABA e o próprio número. Hoje não existe app, configuração nem tela para isso.
- Guardar com segurança, por empresa: `waba_id`, `phone_number_id` e token criptografado. A chave `INTEGRATION_TOKEN_ENCRYPTION_KEY` já existe como segredo.
- Webhook público `/api/public/whatsapp/webhook`:
  - aceitar o desafio GET de verificação;
  - conferir a assinatura `X-Hub-Signature-256` (App Secret);
  - identificar a empresa pelo `phone_number_id`;
  - gravar `wa_conversations` e `wa_messages` sem duplicar (usando o `message.id`).
- Atendente: resposta do Gemini por empresa, com prompt e configuração próprios, contando na quota da empresa. Envio pela Graph API, respeitando a janela de 24 h e usando modelos aprovados fora dela.
- Caixa de entrada no painel, botão de passar para um humano e opção de desligar a IA por conversa.
- Pendências externas da Meta: verificação do negócio, revisão do app e permissões `whatsapp_business_messaging` e `whatsapp_business_management`.

## 5) Arquitetura econômica recomendada
- Usar o que já existe: o banco atual (multiempresa com regras por empresa), funções de servidor e rotas públicas. Não precisa de Edge Functions.
- Usar a mesma estrutura de reservas atômicas que já existe (`ai_requests`), mudando a chave para a empresa.
- Gemini Flash com histórico curto (últimas N mensagens mais um resumo) e respostas curtas. Respostas prontas para perguntas frequentes, sem chamar a IA.
- Cloud API direto da Meta, sem intermediários pagos (como Twilio). As conversas iniciadas pelo cliente são baratas ou gratuitas dentro da janela.
- Google Sheets/Apps Script só depois, como exportação opcional. O banco continua sendo a fonte da verdade, então não vale montar planilha como backend.

## 6) Plano em etapas pequenas
1. **Inspeção (sem custo):** confirmar no banco que não existem dados de empresa e mapear as tabelas que vão ganhar `company_id`.
2. **Protótipo do modelo de empresa:** criar empresa e membros e um backfill (cada usuário atual vira dono da própria empresa). Regras por empresa e testes de isolamento.
3. **Migrar entitlements e quotas** de usuário para empresa, mantendo os limites atuais.
4. **Caixa de entrada simulada:** tabelas de conversas e mensagens e uma tela de inbox alimentada por um simulador de webhook interno (sem Meta e sem custo). O atendente Gemini responde com quota.
5. **Webhook real em modo verificação:** rota pública com verificação GET e assinatura, sem envio, ainda desligada.
6. **Embedded Signup:** depende do app Meta, da verificação do negócio e da revisão. É ação externa da dona.
7. **Envio real e piloto** com 1 empresa. Depois disso, monitorar custos.
8. **Opcional:** exportar para Sheets.

## Detalhes técnicos
- Evidências: `entitlements.ts`, `metered-gemini.ts`, `agent.functions.ts`, `integrations.ts`, `app.organizacao.tsx`, as funções e regras de banco listadas e `roadmap.md`.
- Ainda não confirmado: dados reais no banco e o estado das configurações hospedadas.
- Nenhuma etapa será executada sem aprovação.
