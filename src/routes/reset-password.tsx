import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' || session) setReady(true); });
    supabase.auth.getSession().then(({ data: d, error }) => { if (error) setMsg({ type: 'error', text: authErrorMessage(error) }); else if (d.session) setReady(true); }).catch(error => setMsg({ type: 'error', text: authErrorMessage(error) }));
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
      setMsg({ type: 'ok', text: 'Senha redefinida. Abrindo seu painel…' }); setTimeout(() => navigate({ to: '/app' }), 1200);
    } catch (error) { setMsg({ type: 'error', text: authErrorMessage(error) }); }
    finally { setBusy(false); }
  }
  return <main className="athena-page">
    <header className="athena-top container"><Link to="/auth" className="athena-back">Voltar ao login</Link><Brand /></header>
    <section className="container app-auth"><div className="cd-card">
      <h1 className="section-title">Nova senha</h1>
      {!ready ? <p className="cd-small">Abra esta página pelo link enviado ao seu e-mail. Se o link expirou, <Link to="/auth" className="nav-link">solicite outro</Link>.</p> :
        <form className="app-form" noValidate onSubmit={submit}>
          <label>Nova senha<input name="password" type="password" minLength={6} autoComplete="new-password" required /></label>
          <label>Confirmar senha<input name="confirm" type="password" minLength={6} autoComplete="new-password" required /></label>
          <Button variant="nexa" type="submit" disabled={busy}>{busy && <Loader2 className="cd-spin" />}Salvar nova senha</Button>
        </form>}
      {msg && <p id="reset-feedback" role={msg.type === 'error' ? 'alert' : 'status'} className={msg.type === 'error' ? 'app-error' : 'cd-small'}>{msg.text}</p>}
    </div></section>
  </main>;
}
