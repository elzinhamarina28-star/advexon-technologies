import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Brand } from '@/features/shared/Brand';
import { pageHead, requireUserId, useProfile } from '@/features/client-app/data';
import { InstallApp } from '@/features/client-app/InstallApp';
import '@/features/client-app/mobile.css';

export const Route = createFileRoute('/_authenticated/app')({ head: pageHead('Área do cliente'), component: AppLayout });

const nav = [
  { to: '/app', label: 'Dashboard' }, { to: '/app/diagnostico', label: 'Diagnóstico' }, { to: '/app/equipe', label: 'Equipe IA' },
  { to: '/app/agentes/athena' as '/app', label: 'ATHENA' }, { to: '/app/agentes/ethan' as '/app', label: 'ETHAN' }, { to: '/app/agentes/follow-up' as '/app', label: 'FOLLOW-UP' },
  { to: '/app/vendas', label: 'Vendas' }, { to: '/app/organizacao', label: 'Organização' }, { to: '/app/assinatura', label: 'Assinatura' },
  { to: '/app/conta', label: 'Minha conta' }, { to: '/app/configuracoes', label: 'Integrações' },
] as const;

function AppLayout() {
  const profile = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => { await supabase.auth.signOut(); qc.clear(); navigate({ to: '/auth' }); };
  return <main className="athena-page">
    <header className="athena-top container"><Link to="/"><Brand /></Link><div className="flex flex-wrap items-center gap-2"><InstallApp/><Button variant="ghost" onClick={signOut}><LogOut />Sair</Button></div></header>
    <div className="container app-shell ops-app">
      <nav className="app-nav ops-navigation" aria-label="Área do cliente">
        {nav.map(n => <Link key={n.label} to={n.to} className="nav-link" activeOptions={{ exact: n.to === '/app' }} activeProps={{ className: 'nav-link app-active' }}>{n.label}</Link>)}
      </nav>
      <section className="app-main">
        {profile.isLoading ? <div className="cd-card cd-center"><Loader2 className="cd-spin" />Carregando…</div>
          : profile.isError ? <div className="cd-card cd-center" role="alert">Não foi possível carregar sua conta. <Button variant="ghost" onClick={() => profile.refetch()}>Tentar novamente</Button></div>
          : !profile.data?.onboarded ? <Onboarding name={profile.data?.full_name ?? ''} />
          : <Outlet />}
      </section>
    </div>
  </main>;
}

function Onboarding({ name }: { name: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr('');
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      const id = await requireUserId();
      const { error } = await supabase.from('profiles').upsert({ id, full_name: f['full_name'] ?? null, company_name: f['company_name'] ?? null, segment: f['segment'] ?? null, team_size: f['team_size'] ?? null, main_goal: f['main_goal'] ?? null, onboarded: true, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ['profile'] });
    } catch { setErr('Não foi possível salvar sua conta. Tente novamente.'); setBusy(false); }
  }
  return <div className="cd-card">
    <h1 className="section-title">Vamos começar</h1>
    <p className="cd-small">Três informações para personalizar seu painel. Você pode alterar depois em Minha conta.</p>
    <form className="app-form" onSubmit={submit}>
      <label>Seu nome<input name="full_name" defaultValue={name} required /></label>
      <label>Empresa<input name="company_name" required /></label>
      <label>Segmento<input name="segment" placeholder="Ex.: clínica, loja, serviços" required /></label>
      <label>Tamanho da equipe<select name="team_size" defaultValue="1-5"><option>Só eu</option><option>1-5</option><option>6-20</option><option>21+</option></select></label>
      <label>Principal objetivo<select name="main_goal" defaultValue="Atender mais rápido"><option>Atender mais rápido</option><option>Vender mais</option><option>Organizar a operação</option><option>Automatizar tarefas</option></select></label>
      <Button variant="nexa" type="submit" disabled={busy}>{busy && <Loader2 className="cd-spin" />}Concluir e abrir painel</Button>
      {err && <p role="alert" className="app-error">{err}</p>}
    </form>
  </div>;
}
