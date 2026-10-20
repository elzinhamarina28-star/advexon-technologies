# E-mails transacionais da ADVEXON

Os HTMLs nesta pasta são modelos de e-mail com a identidade visual da ADVEXON para usar no Supabase Auth.

## Modelos disponíveis

- `confirmation.html`: confirmação de cadastro.
- `password-recovery.html`: recuperação de senha.
- `email-change.html`: confirmação de alteração de e-mail.
- `invite.html`: convite de integrante.

Os modelos usam variáveis nativas do Supabase Auth, como `{{ .ConfirmationURL }}` e `{{ .Email }}`.

## Configuração necessária no Supabase

1. Abra o projeto de produção correto no Supabase Dashboard.
2. Em **Authentication → Emails → Templates**, copie o HTML correspondente de cada arquivo e salve no modelo correspondente.
3. Em **Authentication → SMTP Settings**, configure um provedor SMTP transacional. Não coloque senhas, tokens SMTP ou chaves privadas no GitHub.
4. Configure o nome do remetente como `ADVEXON` e, após verificar o domínio `advexon.tech` no provedor, use um remetente desse domínio, por exemplo `nao-responda@advexon.tech`.
5. Configure o endereço de resposta para `suporteadvexon@gmail.com` enquanto esse for o canal de suporte escolhido.
6. No provedor de e-mail, publique os registros DNS exigidos (SPF, DKIM e DMARC) e confirme que o domínio está verificado antes de enviar e-mails reais.
7. Em **Authentication → URL Configuration**, confira a URL principal e a lista de URLs de redirecionamento permitidas. Inclua apenas os endereços oficiais usados pela aplicação, incluindo `/auth` e `/reset-password` no domínio de produção e no ambiente de teste autorizado.

## Personalização do texto e assinatura

Consulte `supabase/templates/EMAIL_COPY_GUIDELINES.md` para o prompt padrão de redação, regras de personalização segura e assinatura oficial da marca. Os modelos do Supabase Auth aceitam variáveis de template, mas não executam prompts de IA nem geram um texto novo a cada envio. A personalização fica limitada aos dados que o Supabase disponibiliza no evento.

## Teste de aceitação

- Solicitar cadastro com uma caixa de teste acessível e receber o e-mail de confirmação.
- Confirmar o endereço e fazer login.
- Solicitar recuperação de senha e receber o e-mail personalizado.
- Abrir o link recebido e salvar uma nova senha.
- Confirmar que o remetente, o nome exibido, os links, o layout mobile e a resposta ao suporte estão corretos.
- Conferir SPF/DKIM/DMARC e a entrega na caixa de entrada, não apenas no spam.

**Importante:** adicionar os HTMLs ao repositório não configura automaticamente o Supabase. A aplicação dos modelos, o remetente SMTP e a verificação de domínio precisam ser configurados no painel do Supabase/provedor de e-mail. Não usar um remetente `@advexon.tech` antes de verificar que ele pode enviar e receber/responder conforme esperado.
