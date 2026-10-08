import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { authErrorMessage, validateAuthForm } from '@/features/client-app/auth-messages';
import { pageHead, requireUserId, useAuthUser, useProfile } from '@/features/client-app/data';

export const Route = createFileRoute('/_authenticated/app/conta')({ head: pageHead('Minha conta'), component: Page });

function Page() {
  const profile = useProfile(); const user = useAuthUser(); const qc = useQueryClient(); const navigate = useNavigate();
  const [msg, setMsg] = useState(''); const [pwMsg, setPwMsg] = useState('');
  const p = profile.data;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMsg('');
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const id = await requireUserId();
    const { error } = await supabase.from('profiles').update({ full_name: f['full_name'] ?? null, company_name: f['company_name'] ?? null, segment: f['segment'] ?? null, team_size: f['team_size'] ?? null, updated_at: new Date().toISOString() }).eq('id', id);
    setMsg(error ? 'Erro ao salvar.' : 'Dados salvos.'); qc.invalidateQueries({ queryKey: ['profile'] });
  }
  async function changePw(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget;
    setPwMsg('');
    const validation = validateAuthForm(form, 'password-feedback');
    if (validation) { setPwMsg(validation); return; }
    try {
      const { error } = await supabase.auth.updateUser({ password: String(new FormData(form).get('password')) });
      if (error) throw error;
      setPwMsg('Senha alterada.'); form.reset();
    } catch (error) { setPwMsg(authErrorMessage(error)); }
  }
  async function signOutAll() { try { const { error } = await supabase.auth.signOut({ scope: 'global' }); if (error) throw error; qc.clear(); navigate({ to: '/auth' }); } catch (error) { setPwMsg(authErrorMessage(error)); } }
  if (!p) return null;
  return <>
    <h1 className="section-title">Minha conta</h1>
    <div className="cd-grid app-gap">
      <form className="cd-card app-form" onSubmit={save}>
        <h2>Conta e empresa</h2>
        <label>E-mail<input value={user.data?.email ?? ''} disabled /></label>
        <label>Nome<input name="full_name" defaultValue={p.full_name ?? ''} required /></label>
        <label>Empresa<input name="company_name" defaultValue={p.company_name ?? ''} /></label>
        <label>Segmento<input name="segment" defaultValue={p.segment ?? ''} /></label>
        <label>Tamanho da equipe<input name="team_size" defaultValue={p.team_size ?? ''} /></label>
        <Button variant="nexa" type="submit">Salvar</Button>{msg && <p className="cd-small" role="status">{msg}</p>}
      </form>
      <div className="cd-card">
        <h2>Segurança e sessão</h2>
        <form className="app-form" noValidate onSubmit={changePw}><label>Nova senha<input name="password" type="password" minLength={6} autoComplete="new-password" required /></label><Button variant="nexa" type="submit">Alterar senha</Button>{pwMsg && <p id="password-feedback" className="cd-small" role="status">{pwMsg}</p>}</form>
        <Button variant="ghost" className="app-gap" onClick={signOutAll}>Sair de todos os dispositivos</Button>
      </div>
    </div>
  </>;
}
