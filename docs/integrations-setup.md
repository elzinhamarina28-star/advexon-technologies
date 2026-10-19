# Integrações da ADVEXON — implementação e ativação

## Estado atual
A Central de Integrações está no painel do cliente, mas os conectores externos ainda NÃO estão autenticados. Não mostrar nenhum conector como conectado até validar OAuth/API de ponta a ponta.

## Ordem de implementação
1. Google Sheets: OAuth 2.0 com escopo mínimo `https://www.googleapis.com/auth/spreadsheets`; callback HTTPS; refresh token guardado apenas no servidor; operações de planilha limitadas ao usuário autenticado.
2. WhatsApp Business Cloud API: app Meta, número de WhatsApp Business, token de acesso duradouro protegido no servidor, webhook HTTPS com verificação GET e validação da assinatura de eventos POST. Registrar mensagens recebidas com tenant/user associado ao phone_number_id.
3. Gmail e Microsoft Graph; depois Facebook Pages, Instagram profissional, Google Drive e OneDrive.

## Configuração Google Sheets
No Google Cloud Console:
- Criar/selecionar um projeto.
- Ativar Google Sheets API.
- Configurar OAuth consent screen e cadastrar usuários de teste enquanto o app estiver em modo de teste.
- Criar credencial OAuth tipo Web application.
- Cadastrar redirect URI HTTPS que será informado pelo endpoint de callback.
- Configurar no ambiente de servidor: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `INTEGRATION_TOKEN_ENCRYPTION_KEY`.

Não colocar essas variáveis em `VITE_*`, no frontend, no repositório ou em mensagens de chat. O segredo de criptografia deve ser um segredo aleatório de alta entropia, guardado apenas no ambiente do servidor.

## Configuração WhatsApp
No Meta for Developers:
- Criar aplicativo empresarial e habilitar WhatsApp.
- Configurar WhatsApp Business Account, número e permissões.
- Definir `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e `WHATSAPP_BUSINESS_ACCOUNT_ID` no ambiente de servidor.
- Configurar o webhook HTTPS e verificar assinatura de cada evento. Não aceitar eventos apenas porque o verify token é conhecido.
- Para uso por várias empresas/clientes, cada conta deve ter conexão e credenciais isoladas por tenant; não reutilizar um único número global para todos.

## Primeira etapa técnica: webhook WhatsApp Cloud API

A branch de testes inclui `GET/POST /api/integrations/whatsapp/webhook`:
- GET valida `hub.verify_token` e devolve o challenge exigido pela Meta.
- POST valida `X-Hub-Signature-256` com HMAC-SHA256 sobre o corpo bruto usando `WHATSAPP_APP_SECRET`, rejeita assinatura inválida e verifica o tipo de evento.
- Nesta etapa, eventos assinados são apenas reconhecidos; ainda NÃO são persistidos, encaminhados a agentes ou respondidos. O endpoint devolve `processed: false` para não dar a entender que mensagens foram processadas.
- Configure `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` somente nos secrets do servidor. Depois, informe no painel Meta a URL HTTPS `https://SEU-DOMINIO/api/integrations/whatsapp/webhook`.

Antes de ativar para clientes, ainda é necessário mapear com segurança cada `phone_number_id` para a empresa/conta ADVEXON correta, persistir eventos com idempotência, tratar mensagens recebidas e testar envio apenas com consentimento e dentro das regras da Meta. Não configurar um único token/número global para vários clientes.

## Requisitos de segurança
- Tokens de provedores são segredos; criptografar em repouso com chave exclusiva do servidor.
- Ativar RLS e associar cada conexão ao ID do usuário/empresa autenticado.
- Solicitar somente os escopos necessários, permitir desconectar/revogar, registrar erros sem registrar tokens ou conteúdo sensível.
- Validar estado OAuth e proteger contra CSRF/replay; verificar assinatura de webhooks.
- Não responder automaticamente a clientes nem enviar mensagens de marketing sem consentimento e regras do provedor.
- Testar isolamento entre duas contas diferentes antes de ativar para clientes.

## Critério de conclusão
Build verde não é prova de integração. Marcar como conectada somente após OAuth/API real, leitura/escrita controlada, refresh de token, revogação, isolamento entre contas e testes de falha. Não publicar nem alterar produção sem aprovação explícita.

## Primeira implementação: Google Sheets OAuth
A branch de testes inclui endpoints:
- `POST /api/integrations/google/start`: exige token Supabase do usuário autenticado e cria estado OAuth de uso único com validade de 10 minutos.
- `GET /api/integrations/google/callback`: valida assinatura/estado, troca o código no Google, criptografa os tokens com AES-GCM e guarda a conexão por usuário.
- `GET /api/integrations/status`: devolve somente estado e rótulo das conexões do usuário autenticado, nunca tokens.

Antes de testar, aplicar a migração `drizzle/migrations/0004_integration_connections.sql` no projeto Supabase de desenvolvimento. Configure somente no ambiente de servidor:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` — deve ser exatamente `https://SEU-DOMINIO/api/integrations/google/callback` e estar cadastrado nas credenciais OAuth do Google
- `INTEGRATION_OAUTH_STATE_SECRET` — segredo aleatório forte, exclusivo do servidor
- `INTEGRATION_TOKEN_ENCRYPTION_KEY` — base64 de 32 bytes aleatórios, exclusivo do servidor
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já precisam estar configurados no ambiente servidor

Gerar segredos localmente sem os compartilhar: em Node.js, `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Gere valores separados para o segredo OAuth e a chave de criptografia. Não colocar nenhum desses valores em `VITE_*`, arquivos versionados, frontend ou mensagens.

O OAuth solicita acesso a planilhas; a autorização real depende de cadastrar o redirect URI correto, configurar a tela de consentimento Google e adicionar a conta como usuário de teste enquanto o app não for publicado. O callback usa o domínio atual e exige HTTPS em produção.

## Checklist antes de declarar pronto
- [ ] Aplicar migração em Supabase de desenvolvimento e verificar permissões/RLS.
- [ ] Configurar variáveis do servidor e credenciais OAuth do Google.
- [ ] Build e testes de integração aprovados.
- [ ] Autorizar uma conta Google de teste e confirmar que o rótulo aparece na Central.
- [ ] Confirmar que tokens não aparecem em respostas, logs ou no navegador.
- [ ] Confirmar isolamento: a segunda conta de teste não consegue ver a conexão da primeira.
- [ ] Testar desconexão/revogação e renovação de token antes de liberar a clientes.
