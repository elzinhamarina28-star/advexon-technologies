# Microsoft Graph OAuth — ADVEXON

## Estado
A branch de testes contém a base OAuth para Outlook e OneDrive/Excel. Não considere estes conectores prontos para clientes até concluir configuração, build/testes, consentimento real, leitura autorizada e isolamento entre contas.

## Registro no Microsoft Entra
1. Crie um registro de aplicativo em Microsoft Entra ID.
2. Configure a plataforma Web com o callback HTTPS exato:
   `https://SEU-DOMINIO/api/integrations/microsoft/callback`
3. Crie um client secret e guarde-o apenas no ambiente seguro do servidor.
4. Configure as permissões delegadas mínimas. Outlook: `openid`, `email`, `offline_access`, `User.Read`, `Mail.Read`. OneDrive/Excel: `openid`, `email`, `offline_access`, `User.Read`, `Files.Read`.
5. Restrinja o consentimento conforme as políticas da organização; permissões e consentimento podem exigir aprovação administrativa.

## Variáveis do servidor
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI` — deve corresponder exatamente ao callback registrado.
- `INTEGRATION_OAUTH_STATE_SECRET` — segredo aleatório forte do servidor.
- `INTEGRATION_TOKEN_ENCRYPTION_KEY` — base64 de 32 bytes aleatórios.
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e credenciais administrativas existentes do servidor.

Nunca coloque segredos em variáveis `VITE_*`, no frontend, no repositório ou em mensagens de chat.

## Endpoints
- `POST /api/integrations/microsoft/start?provider=outlook`
- `POST /api/integrations/microsoft/start?provider=onedrive`
- `GET /api/integrations/microsoft/callback`

O endpoint inicial exige sessão Supabase, usa estado HMAC de uso único com validade de 10 minutos e solicita apenas escopos do provedor selecionado. O callback troca o código, obtém o perfil Microsoft Graph e criptografa tokens com AES-GCM antes de armazená-los na conexão do usuário.

## Limitações atuais
- Não foi validado com tenant/conta Microsoft real.
- A tela de configurações ainda precisa expor os botões para iniciar as duas conexões.
- A migração `0009_allow_microsoft_oauth_state.sql` deve ser aplicada apenas no banco de desenvolvimento depois da revisão.
- Ainda faltam testes de unidade específicos, refresh/revogação de tokens e operações reais de Outlook/OneDrive/Excel.
- Não publicar nem aplicar migrações em produção sem autorização explícita.
