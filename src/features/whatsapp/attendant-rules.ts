// Browser-safe, provider-free rules for the WhatsApp attendant (unit tested).
export type ChannelSettings = { ai_enabled: boolean; prompt: string; business_hours: string; handoff_message: string };
export type StoredMessage = { direction: 'in' | 'out'; sender: 'contact' | 'ai' | 'human' | 'system'; body: string };

export const DEFAULT_CHANNEL: ChannelSettings = { ai_enabled: true, prompt: '', business_hours: '', handoff_message: 'Vou chamar uma pessoa da equipe para continuar seu atendimento.' };
export const CONTEXT_MESSAGES = 10;

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Answers obvious questions without spending an AI interaction. */
export function quickReply(body: string, ch: ChannelSettings): string | null {
  const t = norm(body);
  if (ch.business_hours.trim() && /\b(horario|funcionamento|abre|fecha|aberto)\b/.test(t)) return `Nosso horário de atendimento: ${ch.business_hours.trim()}`;
  if (/\b(atendente|humano|pessoa|falar com alguem)\b/.test(t)) return ch.handoff_message;
  return null;
}

export function wantsHuman(body: string) { return /\b(atendente|humano|pessoa|falar com alguem)\b/.test(norm(body)); }

/** Why the AI must stay silent, or null when it may answer. */
export function silenceReason(ch: ChannelSettings, aiPaused: boolean, hasPlan: boolean): string | null {
  if (!ch.ai_enabled) return 'IA desligada nas configurações.';
  if (aiPaused) return 'Conversa assumida por uma pessoa da equipe.';
  if (!hasPlan) return 'O atendente de IA está disponível nos planos GROWTH e PRO com acesso ativo.';
  return null;
}

export function buildSystemPrompt(companyName: string, ch: ChannelSettings) {
  return [
    `Você é o atendente virtual de WhatsApp da empresa "${companyName}". Responda em português do Brasil, com cordialidade, em no máximo 3 frases curtas.`,
    'Nunca invente preços, prazos, estoque ou políticas que não estejam nas instruções. Se não souber, diga que vai encaminhar para a equipe.',
    ch.business_hours.trim() ? `Horário de atendimento: ${ch.business_hours.trim()}.` : '',
    ch.prompt.trim() ? `Instruções da empresa:\n${ch.prompt.trim().slice(0, 3000)}` : '',
  ].filter(Boolean).join('\n');
}

/** Last N messages as chat turns; staff/AI replies are "assistant", contact messages are "user". */
export function buildContext(history: StoredMessage[]) {
  const turns = history.filter(m => m.sender !== 'system').slice(-CONTEXT_MESSAGES)
    .map(m => ({ role: m.direction === 'in' ? 'user' as const : 'assistant' as const, content: m.body.slice(0, 2000) }));
  while (turns.length && turns[0]!.role !== 'user') turns.shift();
  return turns;
}
