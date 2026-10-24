# WhatsApp Business Platform — configuração da ADVEXON

## Estado desta branch

- A caixa de entrada e as configurações de atendimento funcionam em **modo simulado**.
- O webhook público preparado está em `/api/public/webhooks/whatsapp`.
- O GET valida o token de verificação; o POST confere `X-Hub-Signature-256` antes de interpretar o evento.
- O webhook só registra mensagens de números cujo `phone_number_id` já esteja associado a um canal com status `ativo`. Não envia respostas reais nesta etapa.
- Esta implementação ainda não liga o Embedded Signup, não troca o código OAuth por token, não criptografa/guarda tokens de clientes e não envia mensagens pela Graph API. Essas etapas precisam da verificação/analise da Meta e serão feitas separadamente.

## Variáveis do servidor

Configure somente no ambiente de servidor (nunca no navegador ou Git):
- `WHATSAPP_VERIFY_TOKEN`: valor aleatório próprio usado para o GET de verificação do webhook.
- `META_APP_SECRET`: App Secret do aplicativo Meta, usado para verificar a assinatura HMAC do POST.
- As variáveis só devem ser cadastradas depois de obtidas no painel oficial da Meta.

A ausência dessas variáveis desativa o endpoint (503). Nunca coloque os valores em commits, issues ou no frontend.

## URL de callback

Depois de publicar com autorização, use:
`https://advexon.tech/api/public/webhooks/whatsapp`

Não configure esse endereço em produção até a rota estar implantada e testada no domínio final. O número de teste da Meta não foi disponibilizado no painel até o momento.

## Validação

Os testes unitários cobrem o challenge GET e a validação da assinatura. Antes de atender clientes reais, ainda será necessário testar: implantação da rota, vínculo de WABA/phone_number_id, eventos duplicados, processamento seguro por empresa, resposta IA/limites, envio real, janela de 24 horas, templates e permissões aprovadas.
