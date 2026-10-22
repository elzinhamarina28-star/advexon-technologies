# Recebimento Kiwify — implementação e pendências

## Produtos recorrentes da ADVEXON

Cada plano tem seu próprio produto recorrente na Kiwify:

- START — produto `a2a02780-ce26-11f1-9bfa-85be018fca64`, checkout `https://pay.kiwify.com.br/mvbyFpb`
- PRO — produto `efe1fc80-ce26-11f1-9bfa-85be018fca64`, checkout `https://pay.kiwify.com.br/9dDlNkl`
- GROWTH — produto `d8926d30-ce26-11f1-a270-0f56b2a713a8`, checkout `https://pay.kiwify.com.br/vOEnp57`

Os IDs foram obtidos da URL de edição dos produtos; os links de checkout foram fornecidos pela proprietária. Não confundir IDs de produto com códigos curtos de checkout.

## Autenticação correta do webhook

A implementação desta branch valida o parâmetro de consulta `signature` usando HMAC-SHA1 com o token como segredo; o corpo JSON não precisa conter um campo `token`. A validação considera tanto o JSON reserializado quanto os bytes originais. **Antes de ativar cobranças, validar esse formato com uma entrega real de teste da Kiwify**, pois a confirmação de CI não substitui a validação de integração externa.

Guardar segredos somente no gerenciador de secrets do ambiente de execução, nunca no código ou neste chat:

- `KIWIFY_WEBHOOK_TOKEN`: token novo gerado na Kiwify para o webhook.
- `KIWIFY_PRODUCT_PLAN_MAP`: JSON que associa cada ID de produto ao plano interno.

Exemplo de `KIWIFY_PRODUCT_PLAN_MAP`:

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

- Endpoint previsto: `POST /api/public/webhooks/kiwify`. Só cadastrar quando a versão contendo esta implementação estiver realmente implantada.
- Rota alternativa: `POST /api/webhooks/kiwify`; usar somente se for confirmado que não exige sessão/autenticação.
- Configurar um webhook por produto caso a interface da Kiwify exija selecionar apenas um produto por webhook.
- Selecionar compra aprovada, assinatura renovada, assinatura atrasada, assinatura cancelada, reembolso e chargeback. Pix/boleto gerados e compra recusada são opcionais e não concedem acesso.

## Validações de segurança e lógica

- Assinatura verificada antes de processar o evento; comparação em tempo constante.
- Corpo limitado a 64 KiB; erros de validação não retornam dados pessoais.
- Compra aprovada/renovação só libera acesso com `order_status=paid`, período de acesso futuro e sem contradição de `customer_access.has_access=false`.
- Evento `subscription_canceled` com `order_status=refunded` é normalizado como reembolso.
- RPC do banco restrita a `service_role`; associação apenas a exatamente uma conta existente com e-mail confirmado.
- Idempotência/transação protegem contra eventos repetidos. O fluxo de cancelamento, reembolso e acesso até o fim do período pago ainda exige teste ponta a ponta.

## Estado de validação

Na branch `fix/kiwify-subscription-plan-mapping`, o CI passou em **108 testes distribuídos por 9 arquivos**, e o build de produção passou para client, SSR e Nitro/Cloudflare. Isso valida a branch no GitHub, **não** a versão atualmente publicada no Lovable.

Ainda pendente:
1. Sincronizar esta branch com o código do projeto Lovable antes de publicar.
2. Configurar `KIWIFY_WEBHOOK_TOKEN` e `KIWIFY_PRODUCT_PLAN_MAP` como secrets no ambiente real.
3. Confirmar a URL pública e a autenticação do endpoint.
4. Fazer entrega de teste da Kiwify e validar compra aprovada, renovação, atraso, cancelamento, reembolso e chargeback.
5. Confirmar que o banco concede/revoga acesso corretamente para contas reais de teste.

Não ativar a venda recorrente em produção até concluir essas verificações. Nenhuma compra real foi feita nesta validação.

## Fontes

- Kiwify — Como funcionam os webhooks: https://ajuda.kiwify.com.br/pt-br/article/como-funcionam-os-webhooks-2ydtgl/
- Kiwify — documentação dos payloads: https://kiwify.notion.site/Webhooks-pt-br-c77eb84be10c42e6bb97cd391bca9dce
- Kiwify — Onde encontro a ID do produto?: https://ajuda.kiwify.com.br/pt-br/article/onde-encontro-a-id-do-produto-1li295v/
