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

## Requisitos de segurança
- Tokens de provedores são segredos; criptografar em repouso com chave exclusiva do servidor.
- Ativar RLS e associar cada conexão ao ID do usuário/empresa autenticado.
- Solicitar somente os escopos necessários, permitir desconectar/revogar, registrar erros sem registrar tokens ou conteúdo sensível.
- Validar estado OAuth e proteger contra CSRF/replay; verificar assinatura de webhooks.
- Não responder automaticamente a clientes nem enviar mensagens de marketing sem consentimento e regras do provedor.
- Testar isolamento entre duas contas diferentes antes de ativar para clientes.

## Critério de conclusão
Build verde não é prova de integração. Marcar como conectada somente após OAuth/API real, leitura/escrita controlada, refresh de token, revogação, isolamento entre contas e testes de falha. Não publicar nem alterar produção sem aprovação explícita.
