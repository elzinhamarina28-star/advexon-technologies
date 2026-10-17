import { describe, expect, it } from 'vitest';
import { calculateScore, classify } from '../features/diagnostic/score';
import { questions } from '../features/diagnostic/questions';
import { plans } from '../features/pricing/config';
import { agents } from '../features/agents/definitions';
import { recommend } from '../features/diagnostic/recommendations';
describe('Diagnostic rules',()=>{
 it('has twelve questions and supports multiple channels',()=>{expect(questions).toHaveLength(12);expect(questions.find(q=>q.id==='channels')?.multiple).toBe(true);});
 it.each([[0,'Operação Manual'],[25,'Operação Manual'],[26,'Operação Sobrecarregada'],[50,'Operação Sobrecarregada'],[51,'Negócio em Crescimento'],[75,'Negócio em Crescimento'],[76,'Operação Inteligente'],[100,'Operação Inteligente']])('classifies %s deterministically',(value,label)=>expect(classify(Number(value))).toBe(label));
 it('calculates concrete category scores and total with no randomness',()=>{const answers={volume:[0],response:[0],missed:[0],followup:[0],repetitive:[0],information:[0],ai:[4]};expect(calculateScore(answers)).toEqual({score:100,classification:'Operação Inteligente',categories:{Atendimento:100,Vendas:100,Organização:100,Automação:100}});expect(calculateScore(answers)).toEqual(calculateScore(answers));});
 it('returns the same reset baseline for empty answers',()=>expect(calculateScore({})).toEqual({score:0,classification:'Operação Manual',categories:{Atendimento:0,Vendas:0,Organização:0,Automação:0}}));
 it('gives bounded categories for every valid answer option',()=>{for(const q of questions)for(let i=0;i<q.options.length;i++){const result=calculateScore({[q.id]:[i]});expect(result.score).toBeGreaterThanOrEqual(0);expect(result.score).toBeLessThanOrEqual(100);for(const value of Object.values(result.categories)){expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(100);}}});
 it('recommends the official initial agents with 3–5 findings',()=>{expect(recommend({task:[0]}).firstAgent).toBe('ATHENA — Atendimento IA');expect(recommend({task:[1]}).firstAgent).toBe('ETHAN — Qualificação IA');expect(recommend({task:[2]}).firstAgent).toBe('FOLLOW-UP — Continuidade / Follow-up');expect(recommend({}).findings.length).toBeGreaterThanOrEqual(3);expect(recommend({}).findings.length).toBeLessThanOrEqual(5);});
});
describe('ADVEXON commercial rules',()=>{
 it('START costs R$ 9.99 with 1 user and 100 interactions',()=>{expect(plans[0]?.price).toBe(9.99);expect(plans[0]?.limits).toEqual({companies:1,users:1,interactions:100,contacts:null,agents:null});});
 it('GROWTH costs R$ 89.99 with requested limits',()=>{expect(plans[1]?.price).toBe(89.99);expect(plans[1]?.limits).toEqual({companies:1,users:3,interactions:1000,contacts:500,agents:3});});
 it('PRO costs R$ 229.99 with requested limits',()=>{expect(plans[2]?.price).toBe(229.99);expect(plans[2]?.limits).toEqual({companies:1,users:10,interactions:5000,contacts:2000,agents:6});});
 it.each([['start','https://pay.kiwify.com.br/5tsqOdv'],['growth','https://pay.kiwify.com.br/5IvKxZs'],['pro','https://pay.kiwify.com.br/gZ4lqrv']])('%s preserves its official checkout', (id, url) => expect(plans.find(plan => plan.id === id)?.checkoutUrl).toBe(url));
 it('only Athena and Ethan are initial agents',()=>expect(agents.filter(a=>a.status==='initial').map(a=>a.name)).toEqual(['ATHENA','ETHAN']));
});
