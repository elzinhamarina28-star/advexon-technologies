# Recebimento Kiwify — implementação e pendências

- Rota solicitada: `POST /api/webhooks/kiwify`.
- Alias para chamadas externas após publicação: `POST /api/public/webhooks/kiwify`. Só `/api/public/*` contorna a autenticação do site publicado. Ambos usam o mesmo processamento, com token obrigatório antes de qualquer acesso privilegiado.
- Não foi publicado. Nenhuma URL HTTPS de recebimento foi confirmada; não cadastrar uma URL presumida.
- Os três links oficiais estão associados aos planos no código. Isso permite abrir o checkout, mas NÃO comprova recorrência, pagamento ou liberação automática. Nenhum segredo Kiwify foi criado.

## Configuração manual necessária

Depois de autorização explícita para publicar e da verificação do endereço público, configure o MESMO token na Kiwify e no armazenamento seguro como `KIWIFY_WEBHOOK_TOKEN`, usando o formulário seguro de segredo compartilhado. Não enviar pelo chat. Esta implementação exige `token` no JSON; a documentação de criação oficial possui token, mas a entrega real precisa ser confirmada com um payload oficial. Não confundir SHA1 público do corpo com autenticação nem utilizar as assinaturas da API bancária.

Salvar também `KIWIFY_PRODUCT_PLAN_MAP`: objeto JSON dos IDs reais dos produtos Kiwify para `start`, `growth` ou `pro`. Não usar nomes, preços ou IDs inventados. Sem ambas as configurações, a rota retorna 503 e não modifica assinaturas.

## Contrato conservador e limitações

Campos esperados: `order_id`, `webhook_event_type`, `order_status`, `Customer.email`, `Product.product_id`, `Subscription.id` e `Subscription.next_payment_date` ou `next_payment`. Aprovação/renovação requer `order_status=paid` e próxima data ISO-8601 com fuso explícito, futura. Não adivinhamos duração ou fuso; payload em outro formato retorna 422, sem liberar acesso. **O formato de entrega, campo de evento e data precisam de confirmação com um payload oficial real antes da ativação.**

Eventos oficiais de configuração: `compra_aprovada`, `compra_reembolsada`, `chargeback`, `subscription_canceled`, `subscription_late`, `subscription_renewed`, `pix_gerado`, `boleto_gerado`, `compra_recusada`. Aliases de entrega `order_approved`/`order_refunded` também aceitos. Outros são ignorados. Fonte: https://docs.kiwify.com.br/api-reference/webhooks/create . A documentação consultada não especifica completamente a autenticação e todos os campos do payload recebido; a compatibilidade real não está declarada como verificada.

Associação somente a exatamente uma conta com e-mail confirmado em auth, nunca por perfil editável. Conta inexistente/ambígua retorna falha genérica para retry, sem cadastro automático. Registro mínimo sem token, e-mail ou dados sensíveis. RPC exclusiva de `service_role`; usuários comuns não podem processar eventos. Log e assinatura são gravados na mesma transação com bloqueio por conta.

Idempotência por `order_id` + estado normalizado: aprovação repetida não duplica, mas reembolso posterior da mesma compra é processado. Eventos antigos não estendem vigência para trás; reembolso de compra anterior não revoga renovação mais recente; cancelamento da assinatura impede reativação por replay. Cancelamento/reembolso retiram acesso imediatamente; pagamentos pendentes não liberam nem derrubam assinatura válida. Assinaturas de outros provedores não são sobrescritas.

## Verificação

Testes locais em `src/test/kiwify-webhook.test.ts`; regressão transacional do banco em `src/test/kiwify-idempotency.sql` (somente com BEGIN/ROLLBACK). Fluxo real autenticado, entregas oficiais, retries concorrentes e URL pública dependem de configuração e publicação; não foram simulados como pagamentos reais.

## Bloqueios de lançamento confirmados

- Não há token ou mapa de IDs Kiwify entre os segredos configurados. URLs de checkout NÃO são IDs dos produtos.
- Recorrência mensal e disponibilidade dos produtos não foram verificadas dentro da conta Kiwify.
- Compra antes do cadastro atualmente depende de retry: não existe armazenamento/associação posterior automática. Não declarar provisionamento desse caso concluído.
- Cancelamento e atraso hoje suspendem imediatamente; faltam regras comerciais confirmadas para preservar período já pago. Reembolso parcial também não possui regra validada. Não alterar esses comportamentos com suposições.
- START anuncia IA básica que ainda não tem função disponível; PRO anuncia até seis agentes, mas apenas três chats existem. Não declarar entrega comercial completa.
- O banco tem isolamento por usuário, não colaboração entre membros da mesma empresa. Limites de 3/10 usuários e empresa compartilhada ainda não estão implementados.
- As regressões SQL com reversão foram tentadas, mas bloqueadas por permissões da sessão de teste; nenhuma compra real foi executada.
## Atualização (cancelamento)
Cancelamento mantém o status `canceled` sem alterar `current_period_end`; o acesso continua só até essa data já paga. Reembolso e atraso encerram o acesso. O formato real de datas da Kiwify continua não confirmado: sem payload oficial, token e IDs de produto, o webhook permanece desativado.
