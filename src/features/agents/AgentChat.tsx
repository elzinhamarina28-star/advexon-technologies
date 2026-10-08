import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { askAgent } from './agent.functions';

type Msg = { role: 'user' | 'assistant'; content: string };

export function AgentChat({ agentId, name }: { agentId: 'ethan' | 'follow-up'; name: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ask = useServerFn(askAgent);
  async function send() {
    const content = input.trim(); if (!content || loading) return;
    const next = [...messages, { role: 'user' as const, content: content.slice(0, 2000) }];
    setMessages(next); setInput(''); setError(null); setLoading(true);
    try {
      const res = await ask({ data: { agentId, messages: next.slice(-30) } });
      if (res.ok) setMessages([...next, { role: 'assistant', content: res.reply }]); else setError(res.error);
    } catch { setError(`Não foi possível falar com ${name}. Tente novamente.`); } finally { setLoading(false); }
  }
  return <article className="cd-card app-gap">
    <h2>Conversar com {name}</h2>
    <div className="athena-log" aria-live="polite">
      {messages.length === 0 && <p className="cd-small">Escreva uma mensagem para começar.</p>}
      {messages.map((m, i) => <div key={i} className={`athena-msg ${m.role}`}><span>{m.role === 'user' ? 'Você' : name}</span><p>{m.content}</p></div>)}
      {loading && <div className="athena-msg assistant"><span>{name}</span><p className="athena-typing"><i/><i/><i/></p></div>}
      {error && <div className="athena-error" role="alert">{error}</div>}
    </div>
    <form className="athena-form" onSubmit={e => { e.preventDefault(); send(); }}>
      <textarea rows={1} value={input} maxLength={2000} placeholder="Escreva sua mensagem…" onChange={e => setInput(e.target.value)} />
      <Button variant="nexa" type="submit" disabled={loading} aria-label="Enviar"><Send /></Button>
    </form>
  </article>;
}
