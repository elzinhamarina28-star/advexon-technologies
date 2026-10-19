# Auditoria de lançamento ADVEXON — relatório e ordem de correção

Nenhum arquivo, banco, segredo ou publicação foi alterado. Execuções feitas agora: testes automáticos (91 de 91 passando, 9 arquivos), checagem de tipos (sem erros), lint (2.087 problemas, quase todos de formatação corrigível automaticamente). Nenhum teste real de cadastro, e-mail, pagamento ou IA foi feito.

## 1. Verificado por código/testes
- Preços e links: START 9,99, GROWTH 89,99, PRO 229,99 com os três links Kiwify informados (confirmado em código e teste).
- Acesso pago decidido só pelo servidor (assinatura efetiva); clicar no checkout não libera nada.
- Agentes ATHENA/ETHAN/FOLLOW-UP: exigem login, plano GROWTH/PRO ativo e reserva de quota antes de chamar a IA; chave da IA fica no servidor; tempo limite de 25s; logs sem conteúdo do provedor.
- Quotas mensais: GROWTH 1.000 e PRO 5.000 interações; pedido repetido devolve a resposta salva sem nova cobrança; falha libera a quota (testes simulados).
- Webhook Kiwify: token comparado com segurança, tamanho limitado, produto mapeado só por configuração do servidor, eventos deduplicados por pedido+status, reembolso/cancelamento não são sobrescritos por aprovação repetida (testes unitários).
- Tabelas privadas protegidas por dono; funções pagas (vendas, tarefas) exigem plano GROWTH/PRO no próprio banco.
- Rotas privadas sob área autenticada; mensagens de login/cadastro em PT-BR sem revelar se o e-mail existe.

## 2. Implementado, mas precisa de teste real
- Cadastro, e-mail de confirmação, login, recuperação e troca de senha (nenhuma conta da proprietária disponível para teste).
- Isolamento entre duas contas reais.
- Resposta real do Gemini (modelo configurado "gemini-3.7-flash" nunca foi chamado de verdade; se o nome não existir, todos os agentes falham).
- Instalação do app e aviso offline (no teste anterior o offline mostrou página vazia).
- Painel autenticado no celular.

## 3. Incompleto / bugs encontrados
- P0 — START vendido sem entregar: a página promete "IA Central básica" e "100 interações IA/mês", mas o servidor bloqueia toda IA para START. Quem pagar START recebe só o diagnóstico.
- P0 — Promessas falsas em GROWTH/PRO: "até 3/10 usuários", "1 empresa", "até 3/6 agentes", "equipe IA ampliada", "automações avançadas", "analytics avançado" não existem (só há conta individual e 3 agentes).
- P0 — Data de renovação Kiwify: só aceita data com fuso no formato ISO. Se a Kiwify enviar outro formato ou não enviar a próxima cobrança na primeira compra, toda aprovação é rejeitada e o cliente paga sem receber acesso. Não confirmado sem um evento real.
- P1 — Cancelamento corta o acesso imediatamente, mesmo com o mês já pago (decisão comercial a confirmar).
- P1 — Reservas de IA presas: se o servidor cair entre reservar e registrar, a interação fica "pendente" e conta na quota para sempre (não há expiração).
- P1 — Usuário pode chamar a reserva direto e gastar a própria quota sem receber resposta (não burla limite, só desperdiça).
- P1 — "Contatos" contados como oportunidades de venda; não há contagem de contatos únicos.
- P1 — Recuperação de senha: a página aceita qualquer sessão ativa (não só o link de recuperação); conferir se "Confirmar senha" realmente é comparada.
- P2 — Dois endereços do webhook (um não público); lint com 2.087 itens de formatação; integrações (Sheets, Gmail, WhatsApp, Excel, Instagram) só aparecem como "não conectadas".

## 4. Bloqueios externos
- Kiwify: token do webhook, IDs reais dos produtos, um evento real de exemplo, compra de teste, publicação do endereço do webhook.
- Conta de teste autorizada pela proprietária para validar login e painel.
- Contas Google/Microsoft/Meta/WhatsApp Business e aprovações para as integrações.
- Envio automático de testes no GitHub não configurável daqui.

## Ordem segura de correção
1. Decidir com você: o que START inclui (liberar IA básica com 100 interações ou retirar a promessa) e ajustar textos de GROWTH/PRO ao que existe — sem mexer em preços ou links.
2. Obter um evento real da Kiwify e adaptar a leitura de datas; testar com o token e IDs reais.
3. Definir cancelamento (fim imediato ou ao fim do período pago).
4. Expiração de reservas de IA pendentes e reserva só pelo servidor.
5. Endurecer a recuperação de senha.
6. Testes reais com conta autorizada (cadastro, isolamento, agentes, instalação/offline).
7. Formatação/lint e limpeza do webhook duplicado.

Status: NÃO PRONTA PARA VENDER.
