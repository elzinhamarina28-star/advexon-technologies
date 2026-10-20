# Validação de segurança dos planos e agentes — ADVEXON

## Resultado desta rodada

- Regras de acesso fecham por padrão: uma assinatura real precisa ter status `active` ou `canceled` e uma data de fim de vigência válida e futura.
- Uma conta interna só usa vigência sem data final quando a função autenticada retorna explicitamente `internal_test: true`; o cliente não escolhe essa designação.
- A autorização é repetida no servidor: ATHENA aceita START, GROWTH e PRO; ETHAN e FOLLOW-UP exigem GROWTH ou PRO.
- A reserva de uso de IA mantém idempotência, quotas por mês e persistência de resposta pelo servidor. O webhook de cobrança continua sendo o caminho para atualizar a assinatura.
- O adaptador Gemini normaliza erros do provedor e não devolve detalhes internos da resposta HTTP para o usuário.
- O ID do modelo foi atualizado para `gemini-3.8-flash`, substituindo o identificador anterior `gemini-3.7-flash`, que a documentação atual do Google marca como descontinuado.

## Validação automatizada

GitHub Actions — [execução de validação](https://github.com/elzinhamarina28-star/advexon-technologies/actions/runs/39452383811):

- Build da aplicação: aprovado.
- 170 testes aprovados em 20 arquivos.
- Cobertura adicionada para matriz de permissões por plano, vigência ausente/expirada, conta interna de teste, autorização nos handlers dos agentes, validação de entradas, configuração de modelo e tratamento de falhas HTTP do adaptador Gemini.

## Limites desta validação

Os testes de Gemini usam chave fictícia e resposta HTTP simulada. Eles validam o contrato do adaptador, não provam que uma chave real está configurada nem que o provedor devolve respostas ao vivo. Os handlers são testados com o serviço de IA simulado para comprovar que a autorização acontece antes da chamada.

A migration `0012_fail_closed_subscription_access.sql` foi criada no repositório e **não foi aplicada ao Supabase hospedado** nesta rodada. Também não foram executadas consultas de regressão SQL em um banco real. Isso requer acesso autorizado ao projeto e deve ocorrer antes de considerar a correção ativa no ambiente hospedado.

## Próximos testes necessários para concluir

1. Aplicar e validar a migration no projeto Supabase correto, após revisão.
2. Confirmar `GEMINI_API_KEY` nas configurações seguras do ambiente de servidor (nunca em arquivo público ou código do navegador).
3. Entrar com uma conta autorizada e testar ao vivo ATHENA no START; ETHAN e FOLLOW-UP apenas no GROWTH/PRO; além de assinatura expirada, cancelada e reembolso.
4. Confirmar quota mensal e persistência/resposta na base de testes.

**Estado:** validação automatizada aprovada; teste real com provedor e aplicação no Supabase ainda pendentes. Nenhum merge, deploy ou alteração direta no banco de produção foi feito.
