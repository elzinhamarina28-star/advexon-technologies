export type Category = 'Atendimento' | 'Vendas' | 'Organização' | 'Automação';
export type Question = { id: string; title: string; options: string[]; multiple?: boolean; scores?: number[]; weights: Partial<Record<Category, number>> };
export const questions: Question[] = [
 { id:'segment', title:'Qual é o seu segmento?', options:['Comércio','Serviços','E-commerce','Indústria','Profissional autônomo','Outro'], weights:{} },
 { id:'team', title:'Quantas pessoas trabalham na operação?', options:['Apenas eu','2–5','6–20','21–50','Mais de 50'], weights:{} },
 { id:'channels', title:'Por quais canais seus clientes entram em contato?', options:['WhatsApp','Instagram','Site','Telefone','E-mail','Marketplace','Loja física','Outros'], multiple:true, weights:{} },
 { id:'volume', title:'Quantos contatos sua empresa recebe por mês?', options:['Até 50','51–200','201–500','501–1000','Mais de 1000','Não sei'], scores:[100,85,65,45,25,20], weights:{Atendimento:1} },
 { id:'response', title:'Quanto tempo sua empresa normalmente leva para responder?', options:['Menos de 5 min','Até 30 min','Até 2 h','Algumas horas','Mais de 1 dia','Depende de quem está disponível'], scores:[100,80,60,35,5,20], weights:{Atendimento:4} },
 { id:'missed', title:'Com que frequência oportunidades ou contatos ficam sem resposta?', options:['Quase nunca','Às vezes','Frequentemente','Muito frequentemente','Não medimos'], scores:[100,65,30,5,20], weights:{Atendimento:3,Vendas:3} },
 { id:'followup', title:'Como o follow-up é feito?', options:['Organizado','Manual','Cada vendedor faz de um jeito','Costuma ser esquecido','Não fazemos'], scores:[100,55,35,15,0], weights:{Vendas:4,Organização:1} },
 { id:'repetitive', title:'Quanto tempo sua equipe perde com tarefas repetitivas?', options:['Muito pouco','Pouco','Moderado','Muito','Grande parte do dia','Não medimos'], scores:[100,80,55,25,0,20], weights:{Organização:2,Automação:3} },
 { id:'information', title:'Onde as informações da operação ficam?', options:['Sistema integrado','Vários sistemas','Planilhas','WhatsApp','Anotações','Depende de pessoas','Processo indefinido'], scores:[100,65,50,30,20,10,0], weights:{Organização:4,Automação:1} },
 { id:'ai', title:'Como sua empresa usa IA hoje?', options:['Não usa','Está começando','Algumas pessoas usam','Já possui algumas automações','IA já faz parte da operação'], scores:[0,25,45,75,100], weights:{Automação:5} },
 { id:'bottleneck', title:'Qual é o maior gargalo hoje?', options:['Demora no atendimento','Vendas perdidas','Falta de follow-up','Tarefas manuais','Organização','Equipe sobrecarregada','Dificuldade de crescer'], weights:{} },
 { id:'task', title:'Se uma IA pudesse assumir uma tarefa hoje, qual escolheria?', options:['Atendimento','Qualificar leads','Follow-up','Organizar informações','Conteúdo e marketing','Apoio a vendas','Administrativo'], weights:{} },
];
