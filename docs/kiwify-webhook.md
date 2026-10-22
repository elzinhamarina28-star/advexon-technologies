# Recebimento Kiwify — implementação e pendências

## Produtos separados da ADVEXON

Cada plano agora tem seu próprio produto recorrente na Kiwify:

- START — produto `a2a02780-ce26-11f1-9bfa-85be018fca64`, checkout `https://pay.kiwify.com.br/mvbyFpb`
- PRO — produto `efe1fc80-ce26-11f1-9bfa-85be018fca64`, checkout `https://pay.kiwify.com.br/9dDlNkl`
- GROWTH — produto `d8926d30-ce26-11f1-a270-0f56b2a713a8`, checkout `https://pay.kiwify.com.br/vOEnp57`

Os IDs foram obtidos da URL de edição de cada produto e os links de checkout foram fornecidos pela proprietária. Não confundir IDs de produto com os códigos curtos de checkout.

## Configuração segura

Manter os dois segredos no armazenamento seguro do ambiente publicado, nunca no código ou neste chat:

- `KIWIFY_WEBHOOK_TOKEN`: o mesmo token configurado no webhook Kiwify.
- `KIWIFY_PRODUCT_PLAN_MAP`: JSON que associa o ID de cada produto ao plano interno.

```json
{
  "products": {
    "a2a02780-ce26-11f1-9bfa-85be018fca64": "start",
    "efe1fc80-ce26-11f1-9bfa-85be018fca64": "pro",
    "d8926d30-ce26-11f1-a270-0f56b2a713a8": "growth"
  }
}
```

A configuração é recusada se não mapear os três planos. O código seleciona o plano usando exclusivamente `Product.product_id` vindo do webhook e rejeita produtos desconhecidos. Não usa nome, preço, código curto do checkout nem um `plan_id` enviado livremente para conceder acesso.

## Webhook e validação

- Rota interna: `POST /api/webhooks/kiwify`.
- Alias externo planejado: `POST /api/public/webhooks/kiwify`; só utilizar após verificar que a versão correta está publicada e que o endpoint público responde.
- Configurar os eventos de compra aprovada, renovação, atraso, cancelamento, reembolso e chargeback no painel da Kiwify.
- Teste do botão na Kiwify pode não gerar um log útil para inspecionar o payload. A documentação recomenda verificar logs e requisição/resposta; se necessário, usar um receptor de teste para observar o JSON.
- Aprovação/renovação exige `order_status=paid`, período válido/futuro e não pode contrariar `customer_access.has_access=false`.
- Se `subscription_canceled` chegar com `order_status=refunded`, o evento é normalizado como `refunded`; cancelamento comum continua `canceled`.
- Token validado antes de acessar banco; limite de corpo de 64 KiB; mensagens de erro sem dados pessoais.
- RPC de banco restrita a `service_role`; associação apenas a exatamente uma conta existente com e-mail confirmado.
- Idempotência e transação do banco tratam retries e mudanças de estado por pedido. Regras de período pago para cancelamento/reembolso ainda exigem verificação ponta a ponta antes de declarar a cobrança pronta para produção.

Fontes:
- https://ajuda.kiwify.com.br/pt-br/article/onde-encontro-a-id-do-produto-1li295v/
- https://ajuda.kiwify.com.br/pt-br/article/como-funcionam-os-webhooks-2ydtgl/
- https://kiwify.notion.site/Webhooks-pt-br-c77eb84be10c42e6bb97cd391bca9dce

## Testes e limitações

Testes unitários em `src/test/kiwify-webhook.test.ts` cobrem:
- os três IDs reais de produto separados mapeados para START, PRO e GROWTH;
- produto sem mapeamento;
- autenticação, status de pagamento, data/fuso e falha transacional;
- eventos de aprovação, renovação, atraso, cancelamento e reembolso.

Os testes ainda precisam ser executados em CI/ambiente de desenvolvimento. A execução de testes não equivale a um pagamento real. O fluxo real, a URL pública, as permissões do banco, os segredos do ambiente e os logs entregues pela Kiwify ainda precisam ser verificados antes da ativação.
