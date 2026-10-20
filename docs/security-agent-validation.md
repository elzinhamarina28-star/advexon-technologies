# Validação de segurança dos planos e agentes — ADVEXON

**Última atualização:** 20/10/2026  
**Escopo:** branch de trabalho `feat/hero-tokens-scroll`; sem merge ou publicação por esta auditoria.

## Resultado automatizado

GitHub Actions — [última execução de validação](https://github.com/elzinhamarina28-star/advexon-technologies/actions/runs/39492290961), commit `6394ef647e392d8e9f7d8b9e7ae4e6a24bd37621`:

- Build da aplicação: aprovado.
- 171 testes aprovados em 20 arquivos.
- O workflow executou instalação de dependências, build e testes; todos os passos terminaram com sucesso.

Os testes automatizados usam respostas simuladas para o provedor Gemini. Portanto, o resultado não comprova que uma chave real esteja configurada nem que chamadas reais ao Google funcionem.

## Revisão da autorização dos agentes

A inspeção do código da branch confirmou:

- As funções de servidor exigem um token Bearer de sessão e validam as claims com Supabase Auth.
- ATHENA consulta `get_effective_subscription` e verifica a permissão `agent:athena` no servidor antes da chamada de IA.
- ETHAN e FOLLOW-UP consultam a assinatura e verificam suas permissões no servidor antes da chamada de IA; ambos exigem GROWTH ou PRO.
- A chamada passa por `reserve_ai_interaction`, que aplica a regra de acesso e a quota mensal antes da chamada ao modelo.
- A resposta é persistida pelo servidor para suportar idempotência; erros do provedor não são devolvidos como detalhes HTTP internos ao usuário.
- A função Gemini usa a variável de ambiente `GEMINI_API_KEY` no servidor. Nenhum valor de segredo foi exibido nesta auditoria.

O código configura o modelo `gemini-3.8-flash`. A documentação oficial do Google lista esse ID como modelo estável: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash. Essa confirmação de documentação não substitui uma chamada real.

## Regressão SQL no banco conectado ao projeto de trabalho

A migration `drizzle/migrations/0012_fail_closed_subscription_access.sql` foi aplicada à conexão de banco associada ao projeto Lovable de trabalho. Foram substituídas as definições de `reserve_ai_interaction`, `has_operational_access` e `enforce_opportunity_limit`; não houve alteração deliberada dos registros de clientes ou assinaturas.

Os testes SQL com identidade sintética passaram:

- Assinatura `active` sem data de fim de vigência: acesso negado.
- GROWTH `active` com vigência futura: acesso operacional e reserva de IA permitidos.
- Assinatura `canceled` com período expirado: acesso negado.
- Assinatura `canceled` com período pago ainda futuro: acesso permitido durante a vigência.
- Criação de oportunidade sem vigência válida: bloqueada.
- Limpeza ao final: zero registros de fixtures temporárias restantes.

## Limites e bloqueios restantes

- **Ambiente de produção:** a conexão de banco usada pertence ao projeto Lovable de trabalho. Não foi possível provar que é exatamente o backend que atende `advexon.tech`. A tentativa de consultar o domínio publicamente não retornou conteúdo acessível nesta sessão. Assim, a correção SQL está validada apenas no banco conectado ao projeto de trabalho, não certificada para produção.
- **Chave Gemini:** o arquivo de ambiente inspecionado contém configurações de Supabase, mas não uma entrada `GEMINI_API_KEY`. A chave pode estar configurada separadamente como segredo do servidor; esse estado não pôde ser consultado. Não foi lido nem exposto nenhum valor secreto.
- **Gemini real e agentes ponta a ponta:** nenhuma chamada autenticada real ao Gemini foi feita e ATHENA, ETHAN e FOLLOW-UP não foram testados em fluxo ponta a ponta contra o provedor real. O workspace Lovable reportou ausência de créditos e recusou iniciar a execução do agente.
- **Contas de teste:** a regressão usou identidade sintética apenas em transação de teste; não foi executado um fluxo de navegador autenticado com conta interna real. Não foram modificadas assinaturas de clientes.
- **Deploy/merge:** nenhum merge para `main`, deploy ou alteração de configuração de produção foi feito por esta auditoria.

## Próximos passos necessários para concluir

1. Adicionar créditos ao workspace Lovable e verificar, nas configurações seguras do servidor, se `GEMINI_API_KEY` está configurada sem revelar seu valor.
2. Confirmar o projeto/ref do backend usado por `advexon.tech` e compará-lo com o banco onde a migration foi aplicada.
3. Fazer uma chamada mínima real ao modelo `gemini-3.8-flash`, registrando apenas resultado e erro sanitizado.
4. Com contas de teste autorizadas, validar ATHENA no START e GROWTH/PRO; ETHAN e FOLLOW-UP apenas em GROWTH/PRO; e testar sessão sem autenticação, assinatura sem vigência, expirada e cancelada.
5. Confirmar quota mensal, persistência e estados de cobrança em ambiente de teste antes de autorizar qualquer alteração de produção.

**Estado final desta rodada:** build e testes automatizados aprovados; revisão estática de autorização concluída; regressão SQL aprovada no banco conectado de trabalho. A chamada real Gemini, os testes autenticados ponta a ponta e a confirmação do ambiente de produção continuam pendentes por falta de créditos e de evidência do backend público.
