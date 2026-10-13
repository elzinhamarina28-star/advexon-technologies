import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Brand } from '@/features/shared/Brand';
import { authErrorKind, authErrorMessage, recoveryNotice, signupNotice, validateAuthForm } from '@/features/client-app/auth-messages';

const title = 'Entrar ou criar conta | ADVEXON';
const description = 'Acesse sua área ADVEXON: diagnóstico, equipe IA, vendas e organização.';
export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data, error }) => { if (error) setMsg({ type: 'error', text: authErrorMessage(error) }); else if (data.session) navigate({ to: '/app' }); }).catch(error => setMsg({ type: 'error', text: authErrorMessage(error) })); }, [navigate]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(null);
    const validation = validateAuthForm(e.currentTarget, 'auth-feedback');
    if (validation) { setMsg({ type: 'error', text: validation }); return; }
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')).trim(); const password = String(f.get('password') ?? '');
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMsg({ type: 'ok', text: recoveryNotice });
      } else if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: '/app' });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: String(f.get('name') || '') } } });
        if (error) throw error;
        if (data.session) navigate({ to: '/app' });
        else setMsg({ type: 'ok', text: signupNotice });
      }
    } catch (err) {
      const kind = authErrorKind(err);
      if (mode === 'forgot' && ['existing-account', 'session', 'credentials'].includes(kind)) setMsg({ type: 'ok', text: recoveryNotice });
      else setMsg({ type: mode === 'up' && kind === 'existing-account' ? 'ok' : 'error', text: authErrorMessage(err) });
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
        <form className="app-form" noValidate onSubmit={submit}>
          {mode === 'up' && <label>Seu nome<input name="name" autoComplete="name" required /></label>}
          <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
          {mode !== 'forgot' && <label>Senha<input name="password" type="password" minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required /></label>}
          <Button variant="nexa" type="submit" disabled={busy}>{busy && <Loader2 className="cd-spin" />}{mode === 'in' ? 'Entrar' : mode === 'up' ? 'Criar conta' : 'Enviar link de recuperação'}</Button>
          {mode === 'in' && <button type="button" className="nav-link" onClick={() => { setMode('forgot'); setMsg(null); }}>Esqueci minha senha</button>}
          {mode === 'forgot' && <button type="button" className="nav-link" onClick={() => { setMode('in'); setMsg(null); }}>Voltar para Entrar</button>}
          {msg && <p id="auth-feedback" role={msg.type === 'error' ? 'alert' : 'status'} className={msg.type === 'error' ? 'app-error' : 'cd-small'}>{msg.text}</p>}
        </form>
      </div>
    </section>
  </main>;
}
