import { questions, type Category } from './questions';
export type Answers = Record<string, number[]>;
export const categories: Category[] = ['Atendimento','Vendas','Organização','Automação'];
export function classify(score: number) {
 if (score <= 25) return 'Operação Manual';
 if (score <= 50) return 'Operação Sobrecarregada';
 if (score <= 75) return 'Negócio em Crescimento';
 return 'Operação Inteligente';
}
export function calculateScore(answers: Answers) {
 const values = {} as Record<Category, number>;
 for (const category of categories) {
  let total = 0; let weight = 0;
  for (const q of questions) {
   const picked = answers[q.id] ?? [];
   const selected = picked[0];
   const w = q.weights[category] ?? 0;
   if (selected === undefined || !q.scores || !w) continue;
   const value = q.scoreMultiple ? q.scoreMultiple(picked) : q.scores[selected];
   if (value === undefined) continue;
   total += value * w; weight += w;
  }
  values[category] = weight ? Math.round(total / weight) : 0;
 }
 const score = Math.round(categories.reduce((sum, category) => sum + values[category], 0) / 4);
 return { score, classification: classify(score), categories: values };
}
