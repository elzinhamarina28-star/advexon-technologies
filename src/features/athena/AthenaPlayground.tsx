import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, MessageSquare, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '../shared/Brand';
import { askAthena } from './athena.functions';
import { ATHENA_MAX_CHARS, ATHENA_MAX_MESSAGES } from './persona';

type Msg = { role: 'user' | 'assistant'; content: string };
const KEY = 'nexaop-athena-session';
const suggestions = ['Olá, quero saber mais sobre os serviços.', 'Quanto custa?', 'Quero falar com um atendente.'];

export function AthenaPlayground() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const ask = useServerFn(askAthena);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { const s = sessionStorage.getItem(KEY); if (s) setMessages(JSON.parse(s)); } catch { /* ignore */ } setReady(true); }, []);
  useEffect(() => { if (ready) sessionStorage.setItem(KEY, JSON.stringify(messages)); endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, ready, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content) { setError('Escreva uma mensagem antes de enviar.'); return; }
    if (loading) return;
    const next = [...messages, { role: 'user' as const, content: content.slice(0, ATHENA_MAX_CHARS) }];
    setMessages(next); setInput(''); setError(null); setLoading(true);
    try {
      const res = await ask({ data: { requestId: crypto.randomUUID(), messages: next.slice(-ATHENA_MAX_MESSAGES) } });
      if (res.ok) setMessages([...next, { role: 'assistant', content: res.reply }]);
      else setError(res.error);
    } catch { setError('Não foi possível falar com a ATHENA. Tente novamente.'); }
    finally { setLoading(false); }
  }
  function reset() { setMessages([]); setError(null); setInput(''); sessionStorage.removeItem(KEY); }

  return <main className="athena-page">
    <header className="athena-top container">
      <Link to="/" className="athena-back"><ArrowLeft size={16}/>Voltar ao site</Link>
      <Brand/>
    </header>
    <section className="container athena-shell" aria-label="Playground ATHENA">
      <div className="athena-head">
        <div className="agent-icon"><MessageSquare size={22}/></div>
        <div><h1>ATHENA — Atendimento IA</h1><p><span className="status-dot"/>Playground · conversa real com IA</p></div>
        <Button variant="ghost" onClick={reset} disabled={loading} className="athena-reset"><RotateCcw/>Nova conversa</Button>
      </div>
      <div className="athena-log" aria-live="polite">
        {messages.length === 0 && <div className="athena-empty"><h2>Como a ATHENA pode ajudar?</h2><p>Simule a mensagem de um cliente. A ATHENA faz o primeiro atendimento, entende o contexto e encaminha para a equipe quando necessário.</p><div className="athena-suggestions">{suggestions.map(s => <button key={s} type="button" onClick={() => send(s)} disabled={loading}>{s}</button>)}</div></div>}
        {messages.map((m, i) => <div key={i} className={`athena-msg ${m.role}`}><span>{m.role === 'user' ? 'Você' : 'ATHENA'}</span><p>{m.content}</p></div>)}
        {loading && <div className="athena-msg assistant"><span>ATHENA</span><p className="athena-typing" aria-label="ATHENA está digitando"><i/><i/><i/></p></div>}
        {error && <div className="athena-error" role="alert">{error}</div>}
        <div ref={endRef}/>
      </div>
      <form className="athena-form" onSubmit={e => { e.preventDefault(); send(input); }}>
        <label htmlFor="athena-input" className="sr-only">Mensagem</label>
        <textarea id="athena-input" rows={1} value={input} maxLength={ATHENA_MAX_CHARS} placeholder="Escreva como se fosse um cliente…" onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}/>
        <Button variant="nexa" type="submit" disabled={loading} aria-label="Enviar"><Send/></Button>
      </form>
      <p className="athena-note"><ShieldCheck size={12}/>Histórico apenas nesta sessão do navegador. A ATHENA não inventa preços, prazos ou políticas.</p>
    </section>
  </main>;
}
