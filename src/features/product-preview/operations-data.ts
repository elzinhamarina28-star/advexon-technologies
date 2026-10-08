// Fictitious records, confined to the public preview. Not persisted or sent to agents.
export const opportunities = [
  { id: 'mariana', name: 'Mariana Costa', company: 'Studio Aurora', need: 'Instalação de duas unidades para o novo espaço', stage: 'Qualificado', value: 4800, temperature: 'Quente', probability: 65, origin: 'Formulário do site', owner: 'Camila', last: 'Hoje, 09:42', next: 'Confirmar medidas e preparar orçamento', intent: ['Pediu orçamento', 'Informou quantidade', 'Quer iniciar neste mês'], recommendation: 'Confirmar as medidas antes de finalizar a proposta. Mariana já informou a necessidade e o período desejado.' },
  { id: 'carlos', name: 'Carlos Almeida', company: 'Almeida & Filhos', need: 'Manutenção preventiva do escritório', stage: 'Proposta', value: 2400, temperature: 'Morna', probability: 40, origin: 'Indicação', owner: 'Rafael', last: 'Há 3 dias', next: 'Retomar proposta e entender se ficou alguma dúvida', intent: ['Recebeu a proposta', 'Ainda não respondeu'], recommendation: 'Retomar com uma pergunta breve sobre a proposta, sem assumir aprovação. Sem retorno há três dias.' },
  { id: 'juliana', name: 'Juliana Ribeiro', company: 'Casa Jardim', need: 'Entrega e instalação para uma nova loja', stage: 'Novo', value: 3200, temperature: 'Morna', probability: 25, origin: 'Site', owner: 'Camila', last: 'Hoje, 10:15', next: 'Verificar disponibilidade com a equipe', intent: ['Perguntou sobre prazo', 'Compartilhou a localização'], recommendation: 'A equipe precisa confirmar o prazo. Não prometer uma data antes dessa verificação.' },
  { id: 'bruno', name: 'Bruno Santos', company: 'Café Pátio', need: 'Revisão dos equipamentos da cafeteria', stage: 'Qualificado', value: 1800, temperature: 'Quente', probability: 70, origin: 'Cliente recorrente', owner: 'Rafael', last: 'Ontem, 16:30', next: 'Combinar avaliação técnica', intent: ['Descreveu o problema', 'Solicitou avaliação'], recommendation: 'Confirmar com a equipe a disponibilidade para a avaliação e apresentar as opções ao cliente.' },
  { id: 'renata', name: 'Renata Lima', company: 'Espaço Vértice', need: 'Instalação concluída no espaço de trabalho', stage: 'Ganho', value: 3600, temperature: 'Concluída', probability: 100, origin: 'Indicação', owner: 'Camila', last: 'Ontem, 14:00', next: 'Acompanhar satisfação após a instalação', intent: ['Serviço concluído', 'Recebimento confirmado'], recommendation: 'Fazer um contato breve para acompanhar a experiência após a instalação.' },
];

export const conversations = [
  { id: 'mariana', name: 'Mariana Costa', context: 'Studio Aurora · Novo espaço comercial', status: 'Em acompanhamento', intent: 'Pedido de orçamento', priority: 'Normal', sentiment: 'Receptiva', action: 'Confirmar medidas com Mariana', summary: 'Precisa de duas unidades. Deseja iniciar neste mês. Orçamento ainda não enviado.', messages: [
    { from: 'client', text: 'Oi! Preciso instalar duas unidades no meu studio. Vocês fazem orçamento?' },
    { from: 'agent', text: 'Podemos organizar seu pedido de orçamento. Você já tem as medidas do espaço?' },
    { from: 'client', text: 'Tenho sim. São duas salas de 25 m². Queria fazer neste mês.' },
    { from: 'agent', text: 'Obrigada, Mariana. Com as medidas e o período desejado, seu pedido já está mais completo. A equipe precisa avaliar a instalação para confirmar o valor.' },
  ] },
  { id: 'juliana', name: 'Juliana Ribeiro', context: 'Casa Jardim · Abertura de nova loja', status: 'Precisa de você', intent: 'Consulta de prazo', priority: 'Alta', sentiment: 'Objetiva', action: 'Equipe deve confirmar o prazo de entrega', summary: 'Abertura prevista para a próxima semana. Nenhum prazo foi prometido.', messages: [
    { from: 'client', text: 'A loja abre semana que vem. Conseguem entregar antes?' },
    { from: 'agent', text: 'Ainda não tenho um prazo confirmado para te passar. Em qual bairro fica a loja?' },
    { from: 'client', text: 'No Centro. Preciso dessa confirmação para me organizar.' },
    { from: 'agent', text: 'Entendi. A disponibilidade precisa ser confirmada por uma pessoa da equipe antes de combinarmos a entrega.' },
  ] },
  { id: 'paulo', name: 'Paulo Mendes', context: 'Cliente · Solicitação sobre cobrança', status: 'Precisa de você', intent: 'Revisão de cobrança', priority: 'Alta', sentiment: 'Insatisfeito', action: 'Solicitação de atendimento humano · não enviada', summary: 'Relata uma cobrança que não reconhece. Precisa de análise humana; nenhum dado financeiro solicitado.', messages: [
    { from: 'client', text: 'Veio uma cobrança que eu não reconheço. Preciso resolver isso.' },
    { from: 'agent', text: 'Sinto muito pelo transtorno, Paulo. Essa cobrança precisa ser analisada por uma pessoa da equipe. Não envie dados de cartão ou senha por aqui.' },
    { from: 'client', text: 'Certo, quero falar com alguém.' },
    { from: 'agent', text: 'Seu pedido de atendimento humano está identificado nesta conversa. A equipe ainda precisa assumir o caso.' },
  ] },
  { id: 'renata', name: 'Renata Lima', context: 'Espaço Vértice · Pós-instalação', status: 'Resolvido', intent: 'Confirmação de recebimento', priority: 'Normal', sentiment: 'Positiva', action: 'Acompanhar satisfação na próxima semana', summary: 'Confirmou que recebeu os equipamentos e que a instalação foi concluída.', messages: [
    { from: 'client', text: 'Passando para avisar que deu tudo certo com a instalação. Obrigada!' },
    { from: 'agent', text: 'Que bom saber, Renata! Obrigada pelo retorno. Se surgir alguma dúvida sobre o uso, pode nos contar.' },
  ] },
];

export const followUps = [
  { id: 'carlos', name: 'Carlos Almeida', company: 'Almeida & Filhos', group: 'Hoje', reason: 'Proposta sem resposta', last: 'Há 3 dias', next: 'Retomar a proposta enviada', priority: 'Alta', suggestion: 'Carlos, conseguiu avaliar a proposta? Se ficou alguma dúvida, posso ajudar a organizar as informações.', history: ['Segunda, 14:20 · Proposta enviada por Rafael', 'Terça, 11:00 · Próximo passo registrado', 'Hoje, 09:00 · Retomada pendente'] },
  { id: 'bruno', name: 'Bruno Santos', company: 'Café Pátio', group: 'Atrasados', reason: 'Avaliação técnica ainda sem horário', last: 'Ontem, 16:30', next: 'Confirmar disponibilidade com Rafael', priority: 'Alta', suggestion: 'Verificar primeiro os horários com a equipe; depois apresentar opções ao Bruno.', history: ['Ontem, 16:30 · Interesse identificado por ETHAN', 'Ontem, 17:00 · Avaliação ficou pendente'] },
  { id: 'mariana', name: 'Mariana Costa', company: 'Studio Aurora', group: 'Próximos', reason: 'Aguardar medidas para o orçamento', last: 'Hoje, 09:42', next: 'Acompanhar retorno amanhã', priority: 'Normal', suggestion: 'Mariana, ficou faltando algum detalhe das medidas? Podemos seguir com seu pedido assim que estiverem confirmadas.', history: ['Hoje, 09:42 · ATHENA organizou o contexto', 'Amanhã, 10:00 · Próximo contato sugerido'] },
  { id: 'renata', name: 'Renata Lima', company: 'Espaço Vértice', group: 'Concluídos', reason: 'Confirmar recebimento', last: 'Ontem, 14:00', next: 'Recebimento confirmado', priority: 'Normal', suggestion: 'Nenhuma ação pendente neste contato.', history: ['Ontem, 13:40 · Contato de acompanhamento', 'Ontem, 14:00 · Cliente confirmou recebimento'] },
];

export const tasks = [
  { id: 't1', title: 'Confirmar prazo para abertura da loja', client: 'Juliana · Casa Jardim', owner: 'Camila', group: 'Hoje', due: 'Hoje, 11:30', source: 'ATHENA · Precisa de você', next: 'Consultar disponibilidade de entrega', done: false },
  { id: 't2', title: 'Preparar orçamento de instalação', client: 'Mariana · Studio Aurora', owner: 'Camila', group: 'Hoje', due: 'Hoje, 15:00', source: 'ETHAN · Oportunidade qualificada', next: 'Revisar medidas e escopo', done: false },
  { id: 't3', title: 'Definir horário da avaliação técnica', client: 'Bruno · Café Pátio', owner: 'Rafael', group: 'Atrasadas', due: 'Ontem, 17:00', source: 'FOLLOW-UP · Retorno pendente', next: 'Verificar agenda técnica', done: false },
  { id: 't4', title: 'Retomar proposta comercial', client: 'Carlos · Almeida & Filhos', owner: 'Rafael', group: 'Esta semana', due: 'Hoje, 16:00', source: 'FOLLOW-UP · Sem resposta', next: 'Perguntar se há dúvidas na proposta', done: false },
  { id: 't5', title: 'Revisar solicitação de cobrança', client: 'Paulo Mendes', owner: 'Camila', group: 'Hoje', due: 'Hoje, 12:00', source: 'ATHENA · Análise humana', next: 'Analisar o caso sem solicitar dados sensíveis', done: false },
  { id: 't6', title: 'Registrar confirmação de recebimento', client: 'Renata · Espaço Vértice', owner: 'Camila', group: 'Concluídas', due: 'Ontem, 14:00', source: 'Equipe · Pós-venda', next: 'Concluída', done: true },
];

export const activity = [
  { agent: 'ATHENA', title: 'Organizou o pedido de Mariana', detail: 'Necessidade, quantidade e período reunidos.', time: '09:42' },
  { agent: 'ETHAN', title: 'Identificou uma oportunidade', detail: 'Studio Aurora · Instalação · Interesse alto.', time: '09:44' },
  { agent: 'Vendas', title: 'Oportunidade entrou no pipeline', detail: 'Mariana · Etapa de qualificação.', time: '09:45' },
  { agent: 'FOLLOW-UP', title: 'Próximo passo ficou definido', detail: 'Acompanhar a confirmação das medidas.', time: '09:46' },
  { agent: 'Equipe', title: 'Tarefa visível para Camila', detail: 'Preparar orçamento após revisar o escopo.', time: '09:47' },
];
export const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });