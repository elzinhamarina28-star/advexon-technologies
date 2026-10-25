# WhatsApp Business Platform — configuração da ADVEXON

## Estado atual

- A caixa de entrada e as configurações do atendente funcionam em **modo simulado**.
- O webhook público está preparado em `/api/public/webhooks/whatsapp`.
- O GET valida o token de verificação; o POST confere `X-Hub-Signature-256` antes de interpretar o evento.
- O webhook só registra mensagens de números cujo `phone_number_id` esteja associado a um canal com status `ativo`. Ele ainda **não aciona a IA nem envia respostas reais**.
- `src/features/whatsapp/graph-api.server.ts` contém um helper server-side para envio de texto pela Graph API, com validação de entrada e tratamento de erros. **Ainda não é chamado pelo fluxo de atendimento**: não o ligue à produção até haver autorização OAuth por cliente, armazenamento criptografado do token, regras de plano/consentimento e testes ponta a ponta.
- Embedded Signup, troca do código OAuth por token, armazenamento dos tokens dos clientes e resposta automática do webhook ainda não estão implementados. A liberação de produção depende das verificações e permissões da Meta.

## Variáveis do servidor

Configure somente no ambiente seguro do servidor, nunca no navegador ou Git:

- `WHATSAPP_VERIFY_TOKEN`: segredo aleatório usado no GET de verificação do webhook.
- `META_APP_SECRET`: App Secret da aplicação Meta, usado para validar a assinatura HMAC do POST.
- `META_GRAPH_API_VERSION`: opcional; versão da Graph API aprovada para o aplicativo (o helper usa `v25.0` como padrão).

Não registre tokens nem segredos em logs, commits, issues ou mensagens de erro. O endpoint do webhook responde 503 quando os segredos necessários não estão configurados.

## URL de callback

Após publicar e validar a rota no domínio final, a URL prevista é:

`https://advexon.tech/api/public/webhooks/whatsapp`

Não a cadastre para produção até confirmar que o domínio aponta para a implantação correta e que os testes de callback passaram. O painel da Meta ainda não forneceu o número de teste.

## Próximas etapas antes de clientes reais

1. Implementar Embedded Signup e OAuth com `state` validado e callback protegido contra CSRF.
2. Armazenar tokens por empresa com criptografia autenticada no servidor; não expor tokens ao navegador ou a usuários de outras empresas.
3. Ligar o webhook à lógica de atendimento com limites de plano, idempotência e isolamento por empresa.
4. Usar o helper da Graph API para respostas reais após validar a janela de atendimento de 24 horas, templates aprovados, consentimento e tratamento de falhas.
5. Validar permissões, callback, número de teste e revisão da Meta em ambiente de teste antes da liberação.

## Testes

Os testes unitários verificam a validação do challenge, assinatura HMAC, validação de entrada do remetente e tratamento de erros da Graph API. Eles não substituem um teste ponta a ponta com um número de WhatsApp autorizado.
