# Configuração do envio de e-mails da ADVEXON

Este guia configura e-mails transacionais do Supabase Auth usando Resend como provedor SMTP. O envio real só deve ser ativado depois que o domínio estiver verificado e o SMTP for salvo no projeto certo.

## Identidade definida

- Nome do remetente: `ADVEXON Technologies`
- Remetente automático: `nao-responda@advexon.tech`
- Contato de atendimento exibido nos e-mails: `suporteadvexon@gmail.com`
- Site: `https://advexon.tech`

O endereço automático não precisa receber respostas. O endereço de suporte permanece visível na assinatura. Configure Reply-To para o Gmail de suporte somente se a configuração/provider escolhida suportar esse cabeçalho para os e-mails do Supabase Auth.

## Etapas no Resend

1. Abra [Resend](https://resend.com/) e entre/crie a conta da empresa.
2. Em Domains, adicione `advexon.tech` ou um subdomínio dedicado para e-mails transacionais. O painel mostrará os registros DNS exatos para essa conta.
3. Entre no serviço onde o DNS do domínio é administrado e adicione os registros que o Resend informar. Não invente valores, não remova registros DNS existentes nem substitua registros SPF sem verificar conflitos.
4. Aguarde até o Resend indicar que o domínio está verificado e autorizado a enviar e-mails.
5. Crie uma API Key do Resend com a menor permissão disponível necessária para envio. A chave será usada como senha SMTP; mantenha-a privada.

## Etapas no Supabase hospedado

Projeto esperado: `sldaxvsyttfqlqdlipwu`. Confirme visualmente que esse é o projeto correto antes de salvar qualquer alteração.

1. Abra o [Dashboard do Supabase](https://supabase.com/dashboard/project/sldaxvsyttfqlqdlipwu).
2. Em Authentication → SMTP Settings, ative o SMTP customizado e preencha:
   - Host: `smtp.resend.com`
   - Porta: `465` (SSL)
   - Usuário: `resend`
   - Senha: a API Key do Resend, inserida diretamente no painel
   - Sender email: `nao-responda@advexon.tech`
   - Sender name: `ADVEXON Technologies`
3. Em Authentication → Emails → Templates, aplique cada HTML de `supabase/templates/` no tipo correto e copie os assuntos definidos em `supabase/config.toml`.
4. Em Authentication → URL Configuration, confira o Site URL de produção e permita somente os callbacks oficiais necessários à aplicação, incluindo `/auth` e `/reset-password` no domínio aprovado e, separadamente, no ambiente de teste autorizado.
5. Salve as configurações. Nunca copie a API Key, senha SMTP ou segredo Supabase para o repositório, mensagens públicas ou código do frontend.

## Teste de aceitação

Com a conta de teste já cadastrada e uma caixa de entrada acessível:

1. Solicite recuperação de senha pela tela da ADVEXON.
2. Confirme que o e-mail chega com remetente/nome corretos, assinatura da empresa e link funcional.
3. Use o link e conclua a redefinição; depois teste login com a nova senha.
4. Faça um cadastro de teste controlado, confirme a mensagem de cadastro e teste o login.
5. Confira Spam, autenticação DNS no Resend e se os links levam ao domínio correto.

Não marque a etapa como concluída apenas porque o painel aceitou a configuração; a entrega de um e-mail e a conclusão do fluxo devem ser verificadas.

## O que permanece manual

Esta configuração depende de acesso autenticado ao Resend, ao painel que administra o DNS de `advexon.tech` e ao dashboard do Supabase. Sem essas autorizações, não é possível criar API Keys, publicar registros DNS ou gravar as configurações hospedadas com segurança.

A configuração SMTP não é incluída no GitHub. O `supabase/config.toml` deste repositório configura os assuntos e templates para desenvolvimento local; os templates do Supabase hospedado são aplicados pelo dashboard.
