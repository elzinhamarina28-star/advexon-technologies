# ADVEXON — Auditoria e consolidação de branches (22/10/2026)

## Estado confirmado
- Branch principal e fonte de verdade: `main`.
- Commit atual da `main`: `de4a40bdaf3669d9e9aef55646dad8bc4029bc5a`.
- PR #2 integrada: mapeamento dos três produtos e correção de assinatura do webhook Kiwify.
- PR #3 integrada: refinamento da landing page e divulgação explícita de recursos em preparação.
- PR #4 integrada: hero cinematográfico e refinamentos visuais, preservando a configuração de planos da `main`.
- PR #1 fechada como substituída pela PR #4. Ela não foi mesclada integralmente, porque continha migrações, autenticação, integrações OAuth e alterações de acesso que exigem revisão independente.

## Higiene de branches
Em 22/10/2026, as quatro branches de trabalho antigas foram alinhadas ao mesmo commit da `main` para reduzir divergência acidental:
- `feat/cinematic-landing-preserve-main`
- `feat/hero-tokens-scroll`
- `fix/kiwify-subscription-plan-mapping`
- `fix/marketing-scroll-and-pricing-accuracy`

A comparação GitHub confirmou que todas estão idênticas à `main` (zero commits à frente e zero atrás). Elas permanecem como referências, mas não são linhas de desenvolvimento separadas. Novas alterações devem partir de `main` e voltar para `main` via PR. Não apagar histórico antigo sem revisar o conteúdo exclusivo original.

## Validação
- CI da PR #3: testes automatizados e build de produção passaram.
- CI da PR #4: job “Tests and production build” terminou com sucesso, incluindo testes unitários e build de produção.
- Isso não comprova publicação do site, entrega real do webhook Kiwify, autenticação SMTP real, aplicação de migrações no Supabase hospedado ou chamada ao vivo do Gemini.

## Pendências externas antes de declarar lançamento pronto
1. Configurar `GEMINI_API_KEY` como secret do repositório GitHub (Settings → Secrets and variables → Actions) para o smoke test. Não gravar a chave no código nem em arquivos.
2. Executar novamente o workflow de smoke test e confirmar sucesso da chamada real ao Gemini.
3. Confirmar que a versão publicada/preview Lovable está efetivamente servindo o commit atual da `main`.
4. Configurar segredos Kiwify no ambiente de deploy e validar entrega de teste, compra aprovada, renovação, atraso, cancelamento, reembolso e chargeback.
5. Aplicar e validar migrações no ambiente de destino somente após revisão específica e backup.
6. Configurar SMTP/DNS e testar cadastro/recuperação com uma conta de teste.
7. Confirmar que o site atualizado foi publicado pelo provedor.

## Regra de trabalho daqui em diante
- Usar `main` como única fonte de verdade.
- Não desenvolver diretamente em branches antigas que já foram realinhadas.
- Para cada lote de trabalho futuro: branch curta a partir da `main`, testes e build, PR, merge após CI verde.
- Nunca tratar um CI verde como prova de integração externa em produção.
