import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, CircleDashed, Cloud, FileSpreadsheet, Instagram, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { integrations } from '@/features/shared/integrations';
import { pageHead, requireUserId, useProfile } from '@/features/client-app/data';

export const Route = createFileRoute('/_authenticated/app/configuracoes')({ head: pageHead('Integrações e configurações'), component: Page });

const connectors = [
  { id: 'whatsapp', name: 'WhatsApp Business', group: 'Atendimento', icon: MessageCircle, description: 'Centralize o atendimento e prepare respostas para clientes.', needs: ['Conta WhatsApp Business', 'Aplicativo Meta e API oficial do WhatsApp Cloud', 'Webhook HTTPS e credenciais armazenadas no servidor'], phase: 'Prioridade inicial' },
  { id: 'sheets', name: 'Google Sheets', group: 'Dados e produtividade', icon: FileSpreadsheet, description: 'Consulte e atualize planilhas de clientes, leads e indicadores.', needs: ['Projeto no Google Cloud', 'OAuth consentimento e escopos mínimos', 'Fluxo seguro de autorização e armazenamento de tokens'], phase: 'Prioridade inicial' },
  { id: 'gmail', name: 'Gmail', group: 'Comunicação', icon: Mail, description: 'Encontrar solicitações e apoiar a elaboração de respostas por e-mail.', needs: ['OAuth Google aprovado', 'Escopos Gmail mínimos necessários', 'Política de privacidade e validação do fluxo de envio'], phase: 'Próxima etapa' },
  { id: 'outlook', name: 'Outlook / Microsoft 365', group: 'Comunicação', icon: Mail, description: 'Conectar e-mail e, futuramente, calendário do comerciante.', needs: ['Aplicativo registrado no Microsoft Entra', 'OAuth Microsoft Graph', 'Permissões e tokens protegidos no servidor'], phase: 'Próxima etapa' },
  { id: 'facebook', name: 'Facebook Pages', group: 'Marketing', icon: Cloud, description: 'Apoiar a gestão de páginas comerciais e mensagens permitidas pela Meta.', needs: ['Aplicativo Meta', 'Página comercial administrada pelo usuário', 'Permissões e revisão da Meta quando exigida'], phase: 'Fase posterior' },
  { id: 'instagram', name: 'Instagram profissional', group: 'Marketing', icon: Instagram, description: 'Conectar conta profissional para os recursos autorizados pela Meta.', needs: ['Conta profissional elegível', 'Vinculação e permissões Meta', 'Revisão de permissões e testes de API'], phase: 'Fase posterior' },
  { id: 'drive', name: 'Google Drive', group: 'Arquivos', icon: Cloud, description: 'Consultar documentos da empresa para apoiar respostas e processos.', needs: ['OAuth Google', 'Escopos de Drive limitados aos arquivos necessários', 'Indexação e controle de acesso por empresa'], phase: 'Fase posterior' },
  { id: 'onedrive', name: 'OneDrive / Excel', group: 'Arquivos', icon: FileSpreadsheet, description: 'Acessar arquivos e planilhas Microsoft autorizados.', needs: ['OAuth Microsoft Graph', 'Permissões mínimas de arquivos', 'Testes de isolamento entre empresas'], phase: 'Fase posterior' },
] as const;

const labels: Record<string, string> = { auth: 'Contas', database: 'Dados', checkout: 'Pagamentos (Kiwify)', whatsapp: 'WhatsApp Business', ai: 'IA (Gemini)', sheets: 'Google Sheets', gmail: 'Gmail', excel: 'Excel', instagram: 'Instagram' };

function Page() {
  const profile = useProfile(); const qc = useQueryClient(); const [msg, setMsg] = useState(''); const [connecting, setConnecting] = useState(false); const [connectionMap, setConnectionMap] = useState<Record<string, { status: string; account_label?: string }>>({}); const [expanded, setExpanded] = useState<string | null>('whatsapp');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      try {
        const response = await fetch('/api/integrations/status', { headers: { authorization: 'Bearer ' + token }, cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json() as { connections?: Array<{ provider: string; status: string; account_label?: string }> };
        if (alive) setConnectionMap(Object.fromEntries((result.connections ?? []).map(item => [item.provider, item])));
      } catch { /* Keep connectors unconnected if status is unavailable. */ }
    })();
    return () => { alive = false; };
  }, []);
  async function connectGoogle(endpoint: string, label: string) {
    setMsg('');
    setConnecting(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setMsg(`Entre novamente na sua conta para conectar o ${label}.`);
        return;
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: 'Bearer ' + sessionData.session.access_token },
      });
      const result = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) {
        setMsg(result.error ?? 'Não foi possível iniciar a conexão Google.');
        return;
      }
      window.location.assign(result.authorizationUrl);
    } catch {
      setMsg('Falha ao iniciar a conexão. Tente novamente.');
    } finally {
      setConnecting(false);
    }
  }
  async function connectMicrosoft(provider: 'outlook' | 'onedrive', label: string) {
    setMsg('');
    setConnecting(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setMsg(`Entre novamente na sua conta para conectar o ${label}.`);
        return;
      }
      const response = await fetch('/api/integrations/microsoft/start?provider=' + provider, {
        method: 'POST',
        headers: { authorization: 'Bearer ' + sessionData.session.access_token },
      });
      const result = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) {
        setMsg(result.error ?? 'Não foi possível iniciar a conexão Microsoft.');
        return;
      }
      window.location.assign(result.authorizationUrl);
    } catch {
      setMsg('Falha ao iniciar a conexão Microsoft. Tente novamente.');
    } finally {
      setConnecting(false);
    }
  }
  async function connectMeta(provider: 'facebook' | 'instagram', label: string) {
    setMsg('');
    setConnecting(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setMsg(`Entre novamente na sua conta para conectar ${label}.`);
        return;
      }
      const response = await fetch('/api/integrations/meta/start?provider=' + provider, {
        method: 'POST',
        headers: { authorization: 'Bearer ' + sessionData.session.access_token },
      });
      const result = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) {
        setMsg(result.error ?? 'Não foi possível iniciar a conexão Meta.');
        return;
      }
      window.location.assign(result.authorizationUrl);
    } catch {
      setMsg('Falha ao iniciar a conexão Meta. Tente novamente.');
    } finally {
      setConnecting(false);
    }
  }
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
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="section-title">Central de integrações</h1><p className="cd-small">Conecte as ferramentas do seu negócio para reunir atendimento, dados e tarefas na ADVEXON.</p></div>
      <span className="cd-tag">Conexões autorizadas por conta</span>
    </div>
    <div className="cd-card app-gap">
      <div className="flex items-start gap-3"><ShieldCheck size={24} /><div><h2>Suas contas, suas permissões</h2><p className="cd-small">As conexões aparecem como ativas somente depois da autorização oficial. Tokens são protegidos no servidor; nunca cole senhas ou chaves nesta tela.</p></div></div>
    </div>
    <div className="cd-grid app-gap">
      {connectors.map(item => {
        const Icon = item.icon; const providerKey = item.id === 'sheets' ? 'google_sheets' : item.id === 'drive' ? 'google_drive' : item.id; const connection = connectionMap[providerKey]; const connected = connection?.status === 'connected'; const status = integrations[item.id as keyof typeof integrations];
        const isExpanded = expanded === item.id;
        return <article className="cd-card" key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3"><div className="cd-integration-icon"><Icon size={22} /></div><div><h2>{item.name}</h2><p className="cd-small">{item.group}</p></div></div>
            <span className="cd-tag">{connected ? <><CheckCircle2 size={13}/> Conectado</> : <><CircleDashed size={13}/> Não conectado</>}</span>
          </div>
          <p className="app-gap">{item.description}</p>
          <p className="cd-small">{connected ? (connection.account_label ?? 'Conta conectada') : item.phase}</p>
          <div className="flex flex-wrap gap-2 app-gap">{item.id === 'sheets' && !connected && <Button variant="default" disabled={connecting} onClick={() => connectGoogle('/api/integrations/google/start', 'Google Sheets')}>{connecting ? 'Conectando…' : 'Conectar Google Sheets'}</Button>}{item.id === 'gmail' && !connected && <Button variant="default" disabled={connecting} onClick={() => connectGoogle('/api/integrations/gmail/start', 'Gmail')}>{connecting ? 'Conectando…' : 'Conectar Gmail (somente leitura)'}</Button>}{item.id === 'outlook' && !connected && <Button variant="default" disabled={connecting} onClick={() => connectMicrosoft('outlook', 'Outlook')}>{connecting ? 'Conectando…' : 'Conectar Outlook (somente leitura)'}</Button>}{item.id === 'onedrive' && !connected && <Button variant="default" disabled={connecting} onClick={() => connectMicrosoft('onedrive', 'OneDrive / Excel')}>{connecting ? 'Conectando…' : 'Conectar OneDrive / Excel'}</Button>}{item.id === 'drive' && !connected && <Button variant="default" disabled={connecting} onClick={() => connectGoogle('/api/integrations/google/drive-start', 'Google Drive')}>{connecting ? 'Conectando…' : 'Conectar Google Drive'}</Button>}{item.id === 'facebook' && !connected && <Button variant="default" disabled={connecting} onClick={() => connectMeta('facebook', 'Facebook Pages')}>{connecting ? 'Conectando…' : 'Conectar Facebook Pages'}</Button>}{item.id === 'instagram' && !connected && <Button variant="default" disabled={connecting} onClick={() => connectMeta('instagram', 'Instagram profissional')}>{connecting ? 'Conectando…' : 'Conectar Instagram'}</Button>}<Button variant="outline" onClick={() => setExpanded(isExpanded ? null : item.id)}>{isExpanded ? 'Ocultar requisitos' : 'Ver requisitos'} <ArrowUpRight size={15}/></Button></div>
          {isExpanded && <div className="app-gap"><b className="text-sm">Para ativar esta integração</b><ul className="cd-list">{item.needs.map(need => <li key={need}><span>{need}</span></li>)}</ul><p className="cd-small">Estado técnico: {status?.note ?? 'Planejada; a conexão oficial ainda precisa ser implementada.'}</p></div>}
        </article>;
      })}
    </div>
    <div className="cd-grid app-gap">
      <div className="cd-card">
        <h2>Preferências</h2>
        <label className="app-check"><input type="checkbox" checked={profile.data?.email_notifications ?? true} onChange={e => toggle(e.target.checked)} />Receber avisos por e-mail (quando disponíveis)</label>
        <Button variant="ghost" className="app-gap" onClick={clearDiagnostics}>Apagar histórico de diagnósticos</Button>
        {msg && <p className="cd-small" role="status">{msg}</p>}
      </div>
      <div className="cd-card">
        <h2>Serviços internos</h2>
        <ul className="cd-list">{Object.entries(integrations).filter(([k]) => ['auth', 'database', 'ai', 'checkout'].includes(k)).map(([k, v]) => <li key={k}><span><b>{labels[k] ?? k}</b><p className="cd-small">{v.note}</p></span><em className="cd-tag">{v.enabled ? <><CheckCircle2 size={13}/> Configurada</> : 'Pendente'}</em></li>)}</ul>
      </div>
    </div>
  </>;
}
