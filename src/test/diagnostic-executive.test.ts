import { describe, expect, it } from 'vitest';
import { buildExecutive, isMeasured } from '@/features/diagnostic/executive';
import { calculateScore } from '@/features/diagnostic/score';
const answers = { segment:[1],team:[1],channels:[0,1,2],volume:[5],response:[3],missed:[4],followup:[1],repetitive:[1,3],information:[2],ai:[0],bottleneck:[2],task:[4] };
describe('Executive diagnostic rules', () => {
 it('preserves the original score and all four category values', () => { const r=buildExecutive(answers); expect(r.score).toBe(calculateScore(answers).score); expect(r.categories).toEqual(calculateScore(answers).categories); expect(r.classification).toBe(calculateScore(answers).classification); });
 it('treats unknown volume as missing rather than zero',()=>{expect(isMeasured(answers,'volume')).toBe(false);expect(buildExecutive(answers).missing.map(x=>x.id)).toContain('volume');});
 it('does not treat unknown lost opportunities as negative evidence',()=>{expect(isMeasured(answers,'missed')).toBe(false);expect(buildExecutive(answers).areas.find(x=>x.name==='Vendas')?.evidence).not.toContain('Não sei dizer');});
 it('keeps marketing preference without inventing a marketing agent',()=>{const r=buildExecutive(answers);expect(r.declaredGoal).toBe('Conteúdo e marketing');expect(['athena','ethan','follow-up']).toContain(r.agentId);});
 it.each([[0,'athena'],[1,'ethan'],[2,'follow-up']])('uses declared task %s separately from operational priority',(task,id)=>{const r=buildExecutive({...answers,task:[Number(task)]});expect(r.agentId).toBe(id);expect(r.weakest).toBe('Automação');});
 it('marks all channel connections as future opportunities',()=>{const r=buildExecutive(answers);expect(r.opportunities).toHaveLength(3);expect(r.opportunities.every(o=>o.state==='Oportunidade a explorar')).toBe(true);});
 it('produces three discoveries and four ordered actions',()=>{const r=buildExecutive(answers);expect(r.discoveries).toHaveLength(3);expect(r.steps).toHaveLength(4);});
 it('does not interpret an unanswered area as poor performance',()=>{expect(buildExecutive({}).areas.every(a=>!a.measured)).toBe(true);expect(buildExecutive({}).weakest).toBeNull();});
 it('does not request measurement when both indicators are provided',()=>{expect(buildExecutive({...answers,volume:[0],missed:[0]}).missing).toHaveLength(0);});
});
