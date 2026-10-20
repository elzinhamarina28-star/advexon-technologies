# Auditoria WhatsApp webhook (somente leitura)

Nada foi editado, publicado ou configurado. Nenhum valor secreto foi lido nem exibido.

## 1. As variáveis estão configuradas?
Sim, dá para conferir só os nomes. A lista de segredos do projeto **não tem** `WHATSAPP_VERIFY_TOKEN` nem `WHATSAPP_APP_SECRET`. Existem só GEMINI, GOOGLE_*, INTEGRATION_* e as chaves gerenciadas.
A resposta local confirma isso: um GET sem parâmetros em localhost retornou **503 "Webhook não configurado."**, o que o código faz quando o token está ausente.

## 2. Qual URL usar para testar
- Preview: `https://id-preview--...lovable.app` retornou **401**, porque o preview exige login no Lovable. A Meta não consegue chamar essa URL.
- Produção `https://advexon.tech`: retornou **404**. A versão publicada é anterior a essa rota.
- URL certa para a Meta (depois de publicar): `https://advexon.tech/api/integrations/whatsapp/webhook`. Também serve a URL estável de produção `project--420a7472-760c-4081-a030-1b489d84781c.lovable.app`.

## 3. A rota está no build?
Sim. Ela está registrada no roteamento gerado e responde no servidor local. Isso impede um teste HTTP real hoje:
- os segredos não existem (resposta 503);
- o preview fica atrás do login;
- produção ainda não tem a rota (é preciso publicar com sua aprovação);
- o caminho não começa com `/api/public/`. Pela regra da plataforma, só esse prefixo dispensa autenticação depois de publicado. Então a Meta pode ser bloqueada mesmo após publicar. Isso precisa ser confirmado com um GET público depois da publicação. Se for bloqueada, criar um alias em `/api/public/integrations/whatsapp/webhook`, igual ao que já existe para a Kiwify.
- Eventos assinados são só reconhecidos (`processed: false`). Ainda não há mapeamento por empresa.

## 4. Passos mínimos seguros, sem cadastrar na Meta
1. Você cria um verify token aleatório e adiciona `WHATSAPP_VERIFY_TOKEN` em Project Settings → Secrets. `WHATSAPP_APP_SECRET` vem do app Meta e pode esperar.
2. Teste local de GET:
   - sem parâmetros: resposta 403;
   - token errado: resposta 403;
   - token correto com `hub.mode=subscribe` e `hub.challenge=123`: resposta 200 com corpo "123".
3. Teste local de POST sem assinatura: resposta 401 (ou 503 sem o app secret). Com um segredo de teste, um corpo assinado com HMAC deve dar 200 e `processed:false`.
4. Só com a sua aprovação: publicar e repetir o GET 403/200 em advexon.tech. Se aparecer bloqueio de autenticação, adicionar o alias `/api/public`.
5. Só depois disso cadastrar a URL na Meta.

## Testes realizados
- Leitura do roteamento gerado.
- GET sem parâmetros em produção (404), preview (401) e local (503).
- Listagem dos nomes de segredos (sem valores).

Nenhuma chamada da Meta e nenhum evento assinado foram testados.
