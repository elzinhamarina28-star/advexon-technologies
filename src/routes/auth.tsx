import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
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

  return <main className="athena-page auth-page">
    <header className="athena-top container auth-top">
      <Link to="/" className="athena-back"><ArrowLeft size={16} /> Voltar ao site</Link>
      <Brand />
    </header>
    <section className="container auth-layout">
      <aside className="auth-story">
        <div className="auth-orbit" aria-hidden="true"><div className="auth-orbit-core"><Sparkles size={34}/></div><span/><span/><span/></div>
        <p className="auth-kicker"><span className="auth-live-dot"/> SUA OPERAÇÃO, MAIS INTELIGENTE</p>
        <h1>Sua equipe IA<br/><em>em ação.</em></h1>
        <p className="auth-story-copy">Entre para organizar demandas, acompanhar oportunidades e colocar sua operação em movimento.</p>
        <div className="auth-benefit"><ShieldCheck size={17}/><span>Seu espaço de trabalho, com acesso seguro.</span></div>
        <div className="auth-story-foot"><span>ATHENA</span><i/><span>ETHAN</span><i/><span>FOLLOW-UP</span></div>
      </aside>
      <section className="cd-card auth-card">
        <div className="auth-card-top"><span className="auth-mini-mark"><Sparkles size={16}/></span><div><p className="auth-eyebrow">BEM-VINDA À ADVEXON</p><h2>{mode === 'in' ? 'Que bom ter você de volta.' : mode === 'up' ? 'Vamos começar?' : 'Recupere seu acesso.'}</h2><p className="auth-card-sub">{mode === 'in' ? 'Entre na sua conta para continuar.' : mode === 'up' ? 'Crie sua conta e prepare sua operação para o próximo passo.' : 'Enviaremos um link para redefinir sua senha.'}</p></div></div>
        <div className="app-tabs auth-tabs" role="tablist" aria-label="Acesso à conta">
          <button type="button" role="tab" aria-selected={mode === 'in'} className={mode === 'in' ? 'active' : ''} onClick={() => { setMode('in'); setMsg(null); }}>Entrar</button>
          <button type="button" role="tab" aria-selected={mode === 'up'} className={mode === 'up' ? 'active' : ''} onClick={() => { setMode('up'); setMsg(null); }}>Criar conta</button>
        </div>
        <form className="app-form auth-form" noValidate onSubmit={submit}>
          {mode === 'up' && <label>Nome completo<input name="name" autoComplete="name" placeholder="Como podemos te chamar?" required /></label>}
          <label>E-mail<input name="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" required /></label>
          {mode !== 'forgot' && <label>Senha<input name="password" type="password" minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder={mode === 'in' ? 'Digite sua senha' : 'Crie uma senha segura'} required /></label>}
          {mode === 'in' && <div className="auth-form-options"><span>Protegemos o acesso à sua conta</span><button type="button" className="auth-text-button" onClick={() => { setMode('forgot'); setMsg(null); }}>Esqueci minha senha</button></div>}
          {mode === 'up' && <p className="auth-terms">Ao criar sua conta, você concorda em usar a plataforma de acordo com os termos aplicáveis.</p>}
          <Button variant="nexa" type="submit" className="auth-submit" disabled={busy}>{busy && <Loader2 className="cd-spin" />}{mode === 'in' ? <>Entrar na minha conta <ArrowRight size={16}/></> : mode === 'up' ? <>Criar minha conta <ArrowRight size={16}/></> : <>Enviar link de recuperação <ArrowRight size={16}/></>}</Button>
          {mode === 'forgot' && <button type="button" className="auth-text-button auth-back-login" onClick={() => { setMode('in'); setMsg(null); }}><ArrowLeft size={14}/> Voltar para Entrar</button>}
          {msg && <p id="auth-feedback" role={msg.type === 'error' ? 'alert' : 'status'} className={msg.type === 'error' ? 'app-error' : 'auth-success'}>{msg.text}</p>}
        </form>
        <p className="auth-secure-note"><ShieldCheck size={14}/> Acesso seguro à sua área ADVEXON</p>
      </section>
    </section>
  </main>;
}
