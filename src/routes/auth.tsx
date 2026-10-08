import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Brand } from '@/features/shared/Brand';

const title = 'Entrar ou criar conta | NEXAOP';
const description = 'Acesse sua área NEXAOP: diagnóstico, equipe IA, vendas e organização.';
export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: '/app' }); }); }, [navigate]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')); const password = String(f.get('password'));
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: '/app' });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: String(f.get('name') || '') } } });
        if (error) throw error;
        if (data.session) navigate({ to: '/app' });
        else setMsg({ type: 'ok', text: 'Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.' });
      }
    } catch (err) {
      const t = err instanceof Error ? err.message : '';
      setMsg({ type: 'error', text: /invalid login/i.test(t) ? 'E-mail ou senha incorretos.' : /registered/i.test(t) ? 'Este e-mail já tem conta. Use “Entrar”.' : /confirm/i.test(t) ? 'Confirme seu e-mail antes de entrar.' : t || 'Não foi possível continuar. Tente novamente.' });
    } finally { setBusy(false); }
  }

  return <main className="athena-page">
    <header className="athena-top container"><Link to="/" className="athena-back"><ArrowLeft size={16} />Voltar ao site</Link><Brand /></header>
    <section className="container app-auth">
      <div className="cd-card">
        <div className="app-tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'active' : ''} onClick={() => { setMode('in'); setMsg(null); }}>Entrar</button>
          <button role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'active' : ''} onClick={() => { setMode('up'); setMsg(null); }}>Criar conta</button>
        </div>
        <form className="app-form" onSubmit={submit}>
          {mode === 'up' && <label>Seu nome<input name="name" autoComplete="name" required /></label>}
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          <label>Senha<input name="password" type="password" minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required /></label>
          <Button variant="nexa" type="submit" disabled={busy}>{busy && <Loader2 className="cd-spin" />}{mode === 'in' ? 'Entrar' : 'Criar conta'}</Button>
          {msg && <p role={msg.type === 'error' ? 'alert' : 'status'} className={msg.type === 'error' ? 'app-error' : 'cd-small'}>{msg.text}</p>}
        </form>
      </div>
    </section>
  </main>;
}
