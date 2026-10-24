import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/features/client-app/data';

export const Route = createFileRoute('/_authenticated/app/atendimento/configurar')({ head: pageHead('Configurar atendimento'), component: Settings });

function Settings() {
  const qc = useQueryClient();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [hours, setHours] = useState('');
  const [handoff, setHandoff] = useState('Vou chamar uma pessoa da equipe para continuar seu atendimento.');
  const [notice, setNotice] = useState('');
  const company = useQuery({ queryKey: ['wa-company-id'], queryFn: async () => {
    const { data, error } = await supabase.rpc('my_company_id');
    if (error || !data) throw new Error('Não foi possível identificar sua empresa.');
    return data;
  }});
  const channel = useQuery({ queryKey: ['wa-channel', company.data], enabled: !!company.data, queryFn: async () => {
    const { data, error } = await supabase.from('wa_channels').select('ai_enabled,prompt,business_hours,handoff_message,status').eq('company_id', company.data!).maybeSingle();
    if (error) throw error;
    return data;
  }});
  useEffect(() => {
    if (!channel.data) return;
    setAiEnabled(channel.data.ai_enabled);
    setPrompt(channel.data.prompt);
    setHours(channel.data.business_hours);
    setHandoff(channel.data.handoff_message);
  }, [channel.data]);
  const save = useMutation({ mutationFn: async () => {
    if (!company.data) throw new Error('Empresa não identificada.');
    const { error } = await supabase.from('wa_channels').upsert({ company_id: company.data, ai_enabled: aiEnabled, prompt: prompt.trim().slice(0, 3000), business_hours: hours.trim().slice(0, 500), handoff_message: handoff.trim().slice(0, 500), updated_at: new Date().toISOString() }, { onConflict: 'company_id' });
    if (error) throw error;
  }, onSuccess: () => {
    setNotice('Configurações salvas no simulador.');
    qc.invalidateQueries({ queryKey: ['wa-channel'] });
  }, onError: () => setNotice('Não foi possível salvar. Confirme se seu usuário é o proprietário da empresa.') });
  return <>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="section-title">Configurar atendimento</h1><p className="cd-small">Defina como a IA responde às mensagens simuladas da sua empresa.</p></div><Button variant="outline" asChild><Link to="/app/atendimento"><ArrowLeft size={16}/> Voltar ao atendimento</Link></Button></div>
    {company.isLoading || channel.isLoading ? <div className="cd-card"><Loader2 className="cd-spin"/> Carregando configurações…</div>
      : company.isError || channel.isError ? <p role="alert" className="cd-card">Não foi possível carregar as configurações.</p>
      : <form className="cd-card app-form app-gap" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2>Atendente de IA</h2><label className="flex items-center gap-2"><input type="checkbox" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)}/> IA ligada</label></div>
        <label>Instruções para a IA<textarea value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={3000} rows={5} placeholder="Ex.: somos uma clínica odontológica; responda com cordialidade, não forneça diagnósticos e encaminhe urgências para a equipe." /></label>
        <label>Horário de atendimento<textarea value={hours} onChange={e => setHours(e.target.value)} maxLength={500} rows={2} placeholder="Ex.: segunda a sexta, 9h às 18h." /></label>
        <label>Mensagem de encaminhamento para humano<textarea value={handoff} onChange={e => setHandoff(e.target.value)} required maxLength={500} rows={2}/></label>
        <div className="cd-card"><b>Conexão oficial: ainda não configurada</b><p className="cd-small">O botão de conexão será habilitado depois da verificação do negócio, da configuração de Embedded Signup e da aprovação das permissões pela Meta. Estas configurações só controlam o simulador.</p></div>
        <Button variant="nexa" type="submit" disabled={save.isPending || !company.data}>{save.isPending ? <Loader2 className="cd-spin"/> : <Save size={16}/>} Salvar configurações</Button>
      </form>}
    {notice && <p role="status" className="cd-card app-gap">{notice}</p>}
  </>;
}
