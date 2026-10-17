import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { integrations } from '@/features/shared/integrations';
import { pageHead, requireUserId, useProfile } from '@/features/client-app/data';

export const Route = createFileRoute('/_authenticated/app/configuracoes')({ head: pageHead('Configurações'), component: Page });
const labels: Record<string, string> = { auth: 'Contas', database: 'Dados', checkout: 'Pagamentos (Kiwify)', whatsapp: 'WhatsApp Business', ai: 'IA (Gemini)', sheets: 'Google Sheets', gmail: 'Gmail', excel: 'Excel', instagram: 'Instagram' };

function Page() {
  const profile = useProfile(); const qc = useQueryClient(); const [msg, setMsg] = useState('');
  async function toggle(value: boolean) {
    const id = await requireUserId();
    const { error } = await supabase.from('profiles').update({ email_notifications: value }).eq('id', id);
    setMsg(error ? 'Erro ao salvar.' : 'Preferência salva.'); qc.invalidateQueries({ queryKey: ['profile'] });
  }
  async function clearDiagnostics() {
    if (!confirm('Apagar todo o histórico de diagnósticos?')) return;
    const id = await requireUserId();
    const { error } = await supabase.from('diagnostics').delete().eq('user_id', id);
    setMsg(error ? 'Erro ao apagar.' : 'Histórico apagado.'); qc.invalidateQueries({ queryKey: ['diagnostic-latest'] });
  }
  return <>
    <h1 className="section-title">Configurações</h1>
    <div className="cd-grid app-gap">
      <div className="cd-card">
        <h2>Preferências</h2>
        <label className="app-check"><input type="checkbox" checked={profile.data?.email_notifications ?? true} onChange={e => toggle(e.target.checked)} />Receber avisos por e-mail (quando disponíveis)</label>
        <Button variant="ghost" className="app-gap" onClick={clearDiagnostics}>Apagar histórico de diagnósticos</Button>
        {msg && <p className="cd-small" role="status">{msg}</p>}
      </div>
      <div className="cd-card">
        <h2>Integrações</h2>
        <ul className="cd-list">{Object.entries(integrations).filter(([k]) => k !== 'auth' && k !== 'database').map(([k, v]) => <li key={k}><span><b>{labels[k] ?? k}</b><p className="cd-small">{v.note}</p></span><em className="cd-tag">{v.enabled ? 'Configurada' : 'Não conectada'}</em></li>)}</ul>
      </div>
    </div>
  </>;
}
