# Recebimento Kiwify — implementação e pendências

## Estado atual

- Rota interna: `POST /api/webhooks/kiwify`.
- Alias para chamadas externas após publicação: `POST /api/public/webhooks/kiwify`. Só `/api/public/*` contorna a autenticação do site publicado.
- O webhook **não deve ser ativado em produção ainda**. É necessário configurar os segredos, obter os três IDs reais de plano de assinatura e testar uma entrega real pelo recurso de teste/logs da Kiwify.
- Os links dos checkouts START, GROWTH e PRO ficam em `src/features/pricing/config.ts`; os códigos de checkout não são IDs do produto ou do plano da assinatura.

## Como a Kiwify diferencia os planos

O produto ADVEXON informado pela proprietária tem o ID `ba82eac0-c702-11f1-959f-65f905c149d6`. Esse único ID serve para confirmar que o evento veio do produto esperado. Ele **não** escolhe START, GROWTH ou PRO.

A documentação oficial de eventos de assinatura da Kiwify informa:
- `subscription_id` na raiz e `Subscription.id` para identificar a assinatura;
- `Subscription.plan.id` e `Subscription.plan.name` para descrever o plano de assinatura;
- `Subscription.customer_access.access_until` para indicar até quando o cliente deve ter acesso;
- `Subscription.next_payment` como data da próxima cobrança/fim do período atual (UTC).

Portanto, o código mapeia **`Subscription.plan.id`** para `start`, `growth` ou `pro`, e valida separadamente `Product.product_id`. Não usa nome, preço, texto de checkout nem um `plan_id` recebido livremente no evento para conceder acesso.

Fonte: https://docs.kiwify.com.br/api-reference/webhooks/subscription-events

## Configuração segura

Manter os dois segredos no armazenamento seguro do ambiente publicado, nunca no código ou neste chat:

- `KIWIFY_WEBHOOK_TOKEN`: o mesmo token configurado no webhook Kiwify.
- `KIWIFY_PRODUCT_PLAN_MAP`: JSON neste formato, substituindo os três valores `ID_REAL_DO_PLANO_...` pelos IDs de `Subscription.plan.id` obtidos nos logs/testes oficiais da Kiwify.

```json
{
  "product_id": "ba82eac0-c702-11f1-959f-65f905c149d6",
  "subscription_plans": {
    "ID_REAL_DO_PLANO_START": "start",
    "ID_REAL_DO_PLANO_GROWTH": "growth",
    "ID_REAL_DO_PLANO_PRO": "pro"
  }
}
```

A configuração é recusada se não mapear os três planos. O código também rejeita eventos de outro produto e planos sem mapeamento; não tenta adivinhar pelo preço ou pelo nome. Até que os IDs sejam conhecidos, o webhook deve permanecer sem configuração e retornar 503.

Não cadastrar URL presumida. Após verificar que a versão correta foi publicada e que o caminho público responde, usar a URL HTTPS verificada correspondente a `/api/public/webhooks/kiwify`.

## Contrato e proteção

- Token validado antes de acessar banco; limite de corpo de 64 KiB; mensagens de erro sem dados pessoais.
- Aprovação/renovação exige `order_status=paid`, período válido/futuro e não pode contrariar `customer_access.has_access=false`.
- `customer_access.access_until` é preferido a `next_payment`; a data precisa ter fuso explícito. Não é inferida duração de assinatura.
- Eventos sem produto/plano reconhecido não alteram a assinatura.
- RPC de banco restrita a `service_role`; associação apenas a exatamente uma conta existente com e-mail confirmado.
- Idempotência e transação do banco tratam retries e mudanças de estado por pedido. Regras de período pago para cancelamento/reembolso ainda exigem verificação ponta a ponta antes de declarar a cobrança pronta para produção.

## Testes e limitações

Testes unitários em `src/test/kiwify-webhook.test.ts` cobrem:
- os três IDs de plano mapeados dentro do mesmo ID de produto;
- produto incorreto e plano não mapeado;
- autenticação, status de pagamento, data/fuso e falha transacional;
- eventos de aprovação, renovação, atraso, cancelamento e reembolso.

A execução dos testes não equivale a um pagamento real. O fluxo real, a URL pública, as permissões do banco, os segredos do ambiente e os logs entregues pela Kiwify ainda precisam ser verificados antes da ativação.
