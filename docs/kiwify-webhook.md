# Recebimento Kiwify — implementação e pendências

- Rota solicitada: `POST /api/webhooks/kiwify`.
- Alias para chamadas externas após publicação: `POST /api/public/webhooks/kiwify`. Só `/api/public/*` contorna a autenticação do site publicado. Ambos usam o mesmo processamento, com token obrigatório antes de qualquer acesso privilegiado.
- Não foi publicado. Nenhuma URL HTTPS de recebimento foi confirmada; não cadastrar uma URL presumida.
- Checkout permanece desligado. Nenhum segredo foi criado.

## Configuração manual necessária

Depois de publicar e verificar o endereço público, crie um valor aleatório forte em um gerenciador de senhas e use o MESMO valor no campo token do webhook Kiwify e em **Project Settings → Secrets**, como `KIWIFY_WEBHOOK_TOKEN`. Não enviar pelo chat. Esta implementação exige `token` no JSON; confirmar isso no primeiro payload oficial. Não confundir SHA1 público do corpo com autenticação nem utilizar as assinaturas da API bancária.

Salvar também `KIWIFY_PRODUCT_PLAN_MAP`: objeto JSON dos IDs reais dos produtos Kiwify para `start`, `growth` ou `pro`. Não usar nomes, preços ou IDs inventados. Sem ambas as configurações, a rota retorna 503 e não modifica assinaturas.

## Contrato conservador e limitações

Campos esperados: `order_id`, `webhook_event_type`, `order_status`, `Customer.email`, `Product.product_id`, `Subscription.id` e `Subscription.next_payment_date` ou `next_payment`. Aprovação/renovação requer `order_status=paid` e próxima data ISO-8601 com fuso explícito, futura. Não adivinhamos duração ou fuso; payload em outro formato retorna 422, sem liberar acesso. **O formato de entrega, campo de evento e data precisam de confirmação com um payload oficial real antes da ativação.**

Eventos oficiais de configuração: `compra_aprovada`, `compra_reembolsada`, `chargeback`, `subscription_canceled`, `subscription_late`, `subscription_renewed`, `pix_gerado`, `boleto_gerado`, `compra_recusada`. Aliases de entrega `order_approved`/`order_refunded` também aceitos. Outros são ignorados. Fonte: https://docs.kiwify.com.br/api-reference/webhooks/create . A documentação consultada não especifica completamente a autenticação e todos os campos do payload recebido; a compatibilidade real não está declarada como verificada.

Associação somente a exatamente uma conta com e-mail confirmado em auth, nunca por perfil editável. Conta inexistente/ambígua retorna falha genérica para retry, sem cadastro automático. Registro mínimo sem token, e-mail ou dados sensíveis. RPC exclusiva de `service_role`; usuários comuns não podem processar eventos. Log e assinatura são gravados na mesma transação com bloqueio por conta.

Idempotência por `order_id` + estado normalizado: aprovação repetida não duplica, mas reembolso posterior da mesma compra é processado. Eventos antigos não estendem vigência para trás; reembolso de compra anterior não revoga renovação mais recente; cancelamento da assinatura impede reativação por replay. Cancelamento/reembolso retiram acesso imediatamente; pagamentos pendentes não liberam nem derrubam assinatura válida. Assinaturas de outros provedores não são sobrescritas.

## Verificação

Testes locais em `src/test/kiwify-webhook.test.ts`; regressão transacional do banco em `src/test/kiwify-idempotency.sql` (somente com BEGIN/ROLLBACK). Fluxo real autenticado, entregas oficiais, retries concorrentes e URL pública dependem de configuração e publicação; não foram simulados como pagamentos reais.