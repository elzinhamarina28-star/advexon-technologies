# ADVEXON: cada empresa com o próprio WhatsApp e atendimento por IA

Objetivo: cada empresa cliente liga o próprio número de WhatsApp e recebe atendimento automático da IA (Gemini, que já existe) dentro do app atual. Primeiro vem um protótipo sem custo. A parte oficial da Meta só entra depois.

## Ponto de partida (verificado)
- Hoje cada dado pertence a um usuário. Não existe o conceito de empresa, membros ou papéis.
- O Gemini já roda pelo servidor e conta as mensagens por mês e por usuário.
- O WhatsApp não está conectado.

## Etapa 1: Empresa e membros (sem custo)
- **O que muda:**
  - Novas tabelas `companies` e `company_members`, com o papel guardado em um tipo próprio (dono, atendente).
  - Funções de verificação `is_company_member` e `has_company_role`, que evitam regras de acesso em loop.
  - Coluna `company_id`, opcional de início, em `opportunities`, `tasks` e `diagnostics`.
  - Cada usuário atual vira dono de uma empresa com o nome de `profiles.company_name`, e os dados dele passam para essa empresa.
- **Arquivos:** nova migração; `features/client-app/data.ts`, com um ajudante para descobrir a empresa ativa; testes SQL em `src/test/`.
- **Riscos:**
  - O backfill pode falhar para um usuário sem perfil.
  - As regras antigas por usuário e as novas por empresa vão conviver por um tempo.
- **Critério de aceite:**
  - Um usuário de outra empresa não lê nem altera nada (teste de isolamento).
  - As telas atuais continuam funcionando sem mudança visível.

## Etapa 2: Plano e cotas por empresa
- **O que muda:** `subscriptions` ganha `company_id`; `get_effective_subscription`, `has_operational_access`, `reserve_ai_interaction` e `enforce_opportunity_limit` passam a usar a empresa. Os limites ficam iguais: START 100, GROWTH 1.000, PRO 5.000 interações; 500/2.000 oportunidades.
- **Arquivos:** migração; `entitlements.ts`; `metered-gemini.ts`; `kiwify.server.ts`, que continua associando a compra pelo e-mail do dono.
- **Risco:** mexer em pagamento. Os testes atuais de entitlement e Kiwify precisam continuar passando.
- **Critério de aceite:** dois membros da mesma empresa consomem a mesma cota, e os testes existentes passam.

## Etapa 3: Caixa de entrada e simulador (sem custo, sem Meta)
- **O que muda:**
  - Novas tabelas `wa_channels` (um por empresa, com status `simulado`, `pendente` ou `ativo`), `wa_contacts`, `wa_conversations` e `wa_messages`. Cada mensagem é única pelo id externo, o que evita duplicar.
  - Configurações do atendente em `wa_channels`: prompt, horário de funcionamento, IA ligada/desligada e mensagem de passagem para humano.
  - Uma função de servidor `simulateInbound`: só um membro autenticado pode usar, e ela grava a mensagem do mesmo jeito que o webhook real vai gravar.
  - Novas telas: `/app/atendimento` (caixa de entrada, conversa, botão "assumir" e IA por conversa) e `/app/atendimento/configurar`.
- **Arquivos:** `src/features/whatsapp/` com módulos de ingestão, atendente e envio (`sender`, que no modo simulado só grava); rotas `_authenticated/app.atendimento*.tsx`; o menu em `app.tsx`; `integrations.ts`, onde o WhatsApp aparece como "simulado".
- **Critério de aceite:** uma mensagem simulada aparece na caixa de entrada certa e só para a empresa dona dela.

## Etapa 4: Atendente de IA com Gemini
- **O que muda:** ao chegar uma mensagem, o atendente monta o contexto (prompt da empresa, últimas 10 mensagens e um resumo curto) e chama `meteredGemini` com a cota da empresa. A resposta é gravada como mensagem de saída. Ele não responde se a IA estiver desligada, se a conversa foi assumida por um humano ou se a cota acabou; nesses casos aparece um aviso no painel.
- **Economia:**
  - Usa o modelo Flash com respostas curtas.
  - Respostas prontas (horário, endereço) saem sem chamar a IA.
  - Uma mensagem repetida não gera nova chamada, porque a reserva atômica já evita isso.
- **Critério de aceite:**
  - A mesma mensagem enviada duas vezes gera só uma resposta e uma interação contada.
  - Com a cota esgotada, nada é chamado.
  - Os testes usam Gemini simulado. A chamada real é testada só uma vez, manualmente, e o resultado é informado com honestidade.

## Etapa 5: Webhook oficial preparado, mas desligado (sem custo)
- **O que muda:** rota `src/routes/api/public/whatsapp/webhook.ts`:
  - recebe o desafio de verificação (GET) com `WHATSAPP_VERIFY_TOKEN`;
  - no POST, confere a assinatura `X-Hub-Signature-256` com `META_APP_SECRET`;
  - encontra a empresa pelo `phone_number_id`;
  - entrega a mensagem para o mesmo processamento do simulador.
  
  Se os segredos não existirem, ela recusa tudo.
- **Critério de aceite:** testes com assinatura válida e inválida, payload repetido e número desconhecido. Nada é publicado.

## Etapa 6: Conexão oficial de cada empresa (depende da Meta)
- **O que muda:** botão "Conectar WhatsApp" em `/app/atendimento/configurar` com o **Embedded Signup** da Meta. O servidor troca o código pelo token do cliente, guarda o token criptografado com `INTEGRATION_TOKEN_ENCRYPTION_KEY` (já existe), registra `waba_id` e `phone_number_id` e inscreve o app no webhook. O envio real passa pela Graph API, respeitando a janela de 24 horas; fora dela, só com modelos de mensagem aprovados.
- **O que não posso fazer sem a Meta (ação externa da dona):**
  - Criar o app na Meta for Developers e ter um Business Manager verificado.
  - Tornar-se Tech Provider ou parceiro e configurar o Embedded Signup.
  - Conseguir a revisão do app com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`. Isso leva dias ou semanas e pode ser recusado.
  - Ter uma URL pública de webhook publicada, o que exige sua autorização para publicar.
  - Cadastrar a forma de pagamento da Meta. As conversas iniciadas pela empresa são cobradas pela Meta, não pelo app.
  - Antes da revisão, só números de teste da Meta podem ser usados.
- **Critério de aceite:** uma empresa piloto conecta o número, recebe uma mensagem real e responde pela IA. Isso só será declarado depois de um teste real.

## Etapa 7: Piloto e extras
- Uma empresa piloto, acompanhando custo e cota.
- Exportação opcional para Google Sheets só depois disso. O banco continua sendo a fonte da verdade.

## Ordem e custo
```text
1 Empresa -> 2 Cotas -> 3 Inbox+Simulador -> 4 IA -> 5 Webhook desligado   (custo zero)
                                                   -> 6 Meta oficial -> 7 Piloto (depende da Meta)
```

## Detalhes técnicos
- Todas as tabelas novas terão GRANT e regras por empresa via `is_company_member(company_id)`. Os papéis ficam em uma tabela separada.
- Nada de Edge Functions: só funções de servidor e rotas `/api/public/*`.
- Os tokens da Meta nunca chegam ao navegador nem aparecem nos registros.
- Cada etapa terá um teste por regra (isolamento, cota, duplicidade, assinatura) e uma verificação no navegador com uma conta autenticada.
- Fica registrado em `roadmap.md` quando o modo de implementação começar.
