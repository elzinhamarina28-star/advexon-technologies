# Recebimento Kiwify — implementação e pendências

## Produtos recorrentes da ADVEXON

Cada plano tem seu próprio produto recorrente na Kiwify:

- START — produto `a2a02780-ce26-11f1-9bfa-85be018fca64`, checkout `https://pay.kiwify.com.br/mvbyFpb`
- PRO — produto `efe1fc80-ce26-11f1-9bfa-85be018fca64`, checkout `https://pay.kiwify.com.br/9dDlNkl`
- GROWTH — produto `d8926d30-ce26-11f1-a270-0f56b2a713a8`, checkout `https://pay.kiwify.com.br/vOEnp57`

Os IDs foram obtidos da URL de edição dos produtos; os links de checkout foram fornecidos pela proprietária. Não confundir IDs de produto com códigos curtos de checkout.

## Autenticação correta do webhook

A Kiwify gera um token no formulário de criação do webhook. A entrega usa um parâmetro de consulta `signature`, calculado por HMAC-SHA1 com o token como segredo; o exemplo JSON documentado não exige um campo `token` no corpo. O servidor valida a assinatura antes de acessar o banco. Para compatibilidade, valida tanto a assinatura do JSON reserializado quanto a dos bytes originais, pois ambos dependem do mesmo segredo.

No ambiente de deploy, guardar os segredos no gerenciador de secrets, nunca no código ou neste chat:

- `KIWIFY_WEBHOOK_TOKEN`: o valor Token gerado pela Kiwify para o webhook configurado.
- `KIWIFY_PRODUCT_PLAN_MAP`: JSON que associa o ID de cada produto ao plano interno.

Exemplo do conteúdo de `KIWIFY_PRODUCT_PLAN_MAP`:

```json
{
  "products": {
    "a2a02780-ce26-11f1-9bfa-85be018fca64": "start",
    "efe1fc80-ce26-11f1-9bfa-85be018fca64": "pro",
    "d8926d30-ce26-11f1-a270-0f56b2a713a8": "growth"
  }
}
```

A configuração é recusada se não mapear START, GROWTH e PRO. O plano é selecionado exclusivamente pelo `Product.product_id` do webhook; produtos desconhecidos são rejeitados. O servidor não confia em nomes, preços, links de checkout nem num `plan_id` enviado pelo comprador.

## Endpoint e eventos

- Rota externa planejada: `POST /api/public/webhooks/kiwify`; só cadastrar após confirmar que a versão que contém esta implementação está publicada.
- Rota alternativa: `POST /api/webhooks/kiwify`; use somente se estiver comprovado que não exige sessão/autenticação do site.
- Configurar um webhook separado por produto, se a interface da Kiwify exigir a seleção de apenas um produto por webhook. START, GROWTH e PRO devem ter suas entregas mapeadas pelos IDs acima.
- Selecionar: compra aprovada, assinatura renovada, assinatura atrasada, assinatura cancelada, reembolso e chargeback. Eventos de Pix/boleto gerados e compra recusada são opcionais e não concedem acesso.

## Validações de segurança

- Assinatura verificada antes do banco; comparação de assinatura em tempo constante.
- Corpo limitado a 64 KiB; erros de validação não retornam dados pessoais.
- Compra aprovada/renovação só libera acesso com `order_status=paid`, período de acesso válido e futuro, e sem contradição de `customer_access.has_access=false`.
- Se `subscription_canceled` chegar com `order_status=refunded`, o evento é normalizado como reembolso; cancelamento comum permanece cancelamento.
- RPC do banco restrita a `service_role`; associação apenas a exatamente uma conta existente com e-mail confirmado.
- Idempotência e transação do banco protegem contra repetição de eventos, mas o fluxo completo de cancelamento/reembolso e o acesso durante período já pago ainda exigem teste ponta a ponta.

## Testes e limitações

`src/test/kiwify-webhook.test.ts` agora cobre a assinatura HMAC-SHA1 no parâmetro `signature`, JSON sem token no corpo, variação de espaços, assinatura inválida, mapeamento dos três produtos, evento de pagamento, datas, eventos não pagos, falhas transacionais e limite de tamanho.

Os testes e o build ainda precisam ser executados em CI/ambiente com dependências instaladas. Nenhuma compra real foi feita; a URL pública, os secrets do ambiente e as entregas da Kiwify ainda precisam ser validados antes de ativar as cobranças.

## Fontes

- Kiwify — Como funcionam os webhooks: https://ajuda.kiwify.com.br/pt-br/article/como-funcionam-os-webhooks-2ydtgl/
- Kiwify — documentação dos payloads: https://kiwify.notion.site/Webhooks-pt-br-c77eb84be10c42e6bb97cd391bca9dce
- Kiwify — Onde encontro a ID do produto?: https://ajuda.kiwify.com.br/pt-br/article/onde-encontro-a-id-do-produto-1li295v/
