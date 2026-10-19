import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Brand } from '@/features/shared/Brand';
import { authErrorMessage, validateAuthForm } from '@/features/client-app/auth-messages';

const title = 'Redefinir senha | ADVEXON';
const description = 'Defina uma nova senha para sua conta ADVEXON.';
export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' && session) setReady(true); });
    // Only a recovery link opens the form; an ordinary signed-in session does not.
    const recovering = /type=recovery/.test(window.location.hash + window.location.search);
    if (recovering) supabase.auth.getSession().then(({ data: d, error }) => { if (error) setMsg({ type: 'error', text: authErrorMessage(error) }); else if (d.session) setReady(true); }).catch(error => setMsg({ type: 'error', text: authErrorMessage(error) }));
    return () => data.subscription.unsubscribe();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg(null);
    const validation = validateAuthForm(e.currentTarget, 'reset-feedback');
    if (validation) { setMsg({ type: 'error', text: validation }); return; }
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg({ type: 'ok', text: 'Senha redefinida. Abrindo seu painel…' }); setReady(false); setTimeout(() => navigate({ to: '/app' }), 1200);
    } catch (error) { setMsg({ type: 'error', text: authErrorMessage(error) }); }
    finally { setBusy(false); }
  }
  return <main className="athena-page auth-page">
    <header className="athena-top container auth-top"><Link to="/auth" className="athena-back"><ArrowLeft size={16}/> Voltar ao login</Link><Brand/></header>
    <section className="container auth-layout auth-layout-reset">
      <aside className="auth-story">
        <div className="auth-orbit" aria-hidden="true"><div className="auth-orbit-core"><ShieldCheck size={34}/></div><span/><span/><span/></div>
        <p className="auth-kicker"><span className="auth-live-dot"/> RECUPERAÇÃO SEGURA</p>
        <h1>Seu acesso.<br/><em>De volta.</em></h1>
        <p className="auth-story-copy">Crie uma nova senha para voltar ao seu espaço de trabalho e continuar de onde parou.</p>
        <div className="auth-benefit"><ShieldCheck size={17}/><span>Use uma senha única e difícil de adivinhar.</span></div>
      </aside>
      <section className="cd-card auth-card auth-reset-card">
        <div className="auth-card-top"><span className="auth-mini-mark"><ShieldCheck size={16}/></span><div><p className="auth-eyebrow">RECUPERAÇÃO DE CONTA</p><h2>Defina uma nova senha.</h2><p className="auth-card-sub">Escolha uma senha segura para proteger seu acesso.</p></div></div>
        {!ready ? <div className="auth-recovery-empty"><div className="auth-recovery-icon"><ShieldCheck size={24}/></div><p>Abra esta página pelo link de recuperação enviado ao seu e-mail. Se o link expirou, solicite um novo.</p><Link to="/auth" className="nexa-button auth-recovery-link">Solicitar novo link <ArrowRight size={15}/></Link></div> :
          <form className="app-form auth-form" noValidate onSubmit={submit}>
            <label>Nova senha<input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Mínimo de 8 caracteres" required /></label>
            <label>Confirmar nova senha<input name="confirm" type="password" minLength={8} autoComplete="new-password" placeholder="Digite a senha novamente" required /></label>
            <p className="auth-terms">Use pelo menos 8 caracteres e evite senhas que você já utiliza em outros serviços.</p>
            <Button variant="nexa" type="submit" className="auth-submit" disabled={busy}>{busy && <Loader2 className="cd-spin" />}Salvar nova senha <ArrowRight size={16}/></Button>
          </form>}
        {msg && <p id="reset-feedback" role={msg.type === 'error' ? 'alert' : 'status'} className={msg.type === 'error' ? 'app-error' : 'auth-success'}>{msg.text}</p>}
        <p className="auth-secure-note"><ShieldCheck size={14}/> Sua conta continua protegida</p>
      </section>
    </section>
  </main>;
}
