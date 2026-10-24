import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageCircle, Settings2, UserRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/features/client-app/data';
import { simulateInbound, sendHumanReply } from '@/features/whatsapp/whatsapp.functions';

export const Route = createFileRoute('/_authenticated/app/atendimento')({ head: pageHead('Atendimento WhatsApp'), component: Inbox });

function Inbox() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [incoming, setIncoming] = useState('');
  const [humanReply, setHumanReply] = useState('');
  const [notice, setNotice] = useState('');

  const company = useQuery({
    queryKey: ['wa-company-id'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_company_id');
      if (error || !data) throw new Error('Não foi possível identificar sua empresa.');
      return data;
    },
  });
  const channel = useQuery({
    queryKey: ['wa-channel', company.data],
    enabled: !!company.data,
    queryFn: async () => {
      const { data, error } = await supabase.from('wa_channels').select('status,display_phone,ai_enabled').eq('company_id', company.data!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const conversations = useQuery({
    queryKey: ['wa-conversations', company.data],
    enabled: !!company.data,
    queryFn: async () => {
      const { data, error } = await supabase.from('wa_conversations').select('id,contact_id,ai_paused,last_message_at').eq('company_id', company.data!).order('last_message_at', { ascending: false });
      if (error) throw error;
      const contactIds = [...new Set(data.map(x => x.contact_id))];
      if (!contactIds.length) return [];
      const { data: contacts, error: contactError } = await supabase.from('wa_contacts').select('id,name,wa_id').in('id', contactIds);
      if (contactError) throw contactError;
      const byId = new Map((contacts ?? []).map(c => [c.id, c]));
      return data.map(c => ({ ...c, contact: byId.get(c.contact_id) ?? null }));
    },
  });
  const messages = useQuery({
    queryKey: ['wa-messages', selectedId],
    enabled: !!selectedId && !!company.data,
    queryFn: async () => {
      const { data, error } = await supabase.from('wa_messages').select('id,direction,sender,body,created_at').eq('company_id', company.data!).eq('conversation_id', selectedId!).order('created_at', { ascending: true }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  const active = useMemo(() => conversations.data?.find(c => c.id === selectedId) ?? null, [conversations.data, selectedId]);

  const inbound = useMutation({
    mutationFn: async () => {
      const result = await simulateInbound({ data: { waId: phone, name: name.trim() || undefined, body: incoming, externalId: crypto.randomUUID() } });
      return result;
    },
    onSuccess: result => {
      setNotice(result.notice ?? (result.replied ? 'Mensagem simulada recebida; resposta registrada no modo de teste.' : 'Mensagem simulada registrada.'));
      setIncoming('');
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
      qc.invalidateQueries({ queryKey: ['wa-messages'] });
    },
    onError: () => setNotice('Não foi possível simular a mensagem. Confira o número e tente novamente.'),
  });
  const reply = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('Selecione uma conversa.');
      return sendHumanReply({ data: { conversationId: selectedId, body: humanReply } });
    },
    onSuccess: () => {
      setHumanReply('');
      setNotice('Resposta registrada no simulador. Ela ainda não foi enviada pelo WhatsApp real.');
      qc.invalidateQueries({ queryKey: ['wa-messages', selectedId] });
      qc.invalidateQueries({ queryKey: ['wa-conversations'] });
    },
    onError: () => setNotice('Não foi possível registrar a resposta.'),
  });

  return <>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="section-title">Atendimento WhatsApp</h1><p className="cd-small">Caixa de entrada da sua empresa. Até a aprovação da Meta, use o simulador.</p></div>
      <Button variant="outline" asChild><a href="/app/atendimento/configurar"><Settings2 size={16}/> Configurar</a></Button>
    </div>
    <div className="cd-card app-gap">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2"><MessageCircle size={18}/> Canal WhatsApp</h2><span className="cd-tag">{channel.data?.status === 'ativo' ? 'Ativo' : channel.data?.status === 'pendente' ? 'Pendente' : 'Simulador'}</span></div>
      <p className="cd-small">{channel.data?.status === 'ativo' ? `Número conectado: ${channel.data.display_phone ?? 'configurado'}` : 'A conexão oficial será habilitada depois da verificação e aprovação da Meta. As mensagens abaixo são somente de teste.'}</p>
    </div>

    <div className="cd-grid app-gap">
      <section className="cd-card">
        <h2>Simular mensagem recebida</h2>
        <p className="cd-small">Use um número fictício no formato internacional, com 8 a 15 dígitos. Nenhuma mensagem será enviada para o WhatsApp.</p>
        <form className="app-form" onSubmit={e => { e.preventDefault(); inbound.mutate(); }}>
          <label>Número do contato<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="5511999999999" inputMode="tel" required pattern="\\+?\\d{8,15}" /></label>
          <label>Nome (opcional)<input value={name} onChange={e => setName(e.target.value)} maxLength={80} /></label>
          <label>Mensagem<input value={incoming} onChange={e => setIncoming(e.target.value)} required maxLength={2000} placeholder="Olá, gostaria de saber mais." /></label>
          <Button variant="nexa" type="submit" disabled={inbound.isPending}>{inbound.isPending && <Loader2 className="cd-spin"/>}Receber no simulador</Button>
        </form>
      </section>
      <section className="cd-card">
        <h2>Conversas</h2>
        {conversations.isLoading || company.isLoading ? <p><Loader2 className="cd-spin"/> Carregando conversas…</p>
          : conversations.isError || company.isError ? <p role="alert">Não foi possível carregar as conversas.</p>
          : !conversations.data?.length ? <div className="cd-empty"><UserRound size={25}/><p>Nenhuma conversa. Envie uma mensagem pelo simulador.</p></div>
          : <ul className="cd-list">{conversations.data.map(c => <li key={c.id} className="app-item"><button type="button" className="text-left flex-1 min-w-0" onClick={() => setSelectedId(c.id)} aria-pressed={selectedId === c.id}><b>{c.contact?.name || c.contact?.wa_id || 'Contato'}</b><p className="cd-small">{c.ai_paused ? 'Atendimento humano' : 'IA habilitada na conversa'} · {new Date(c.last_message_at).toLocaleString('pt-BR')}</p></button></li>)}</ul>}
      </section>
    </div>

    <section className="cd-card app-gap">
      <h2>{active ? `Conversa com ${active.contact?.name || active.contact?.wa_id || 'contato'}` : 'Mensagens da conversa'}</h2>
      {!active ? <p className="cd-small">Selecione uma conversa para ver as mensagens.</p>
        : messages.isLoading ? <p><Loader2 className="cd-spin"/> Carregando mensagens…</p>
        : messages.isError ? <p role="alert">Não foi possível carregar as mensagens.</p>
        : <><ol className="cd-list">{messages.data?.map(m => <li key={m.id} className="app-item"><div><span className="cd-tag">{m.direction === 'in' ? 'Contato' : m.sender === 'human' ? 'Equipe' : 'ADVEXON'}</span><p>{m.body}</p><small className="cd-small">{new Date(m.created_at).toLocaleString('pt-BR')}</small></div></li>)}</ol>
          <form className="app-form app-gap" onSubmit={e => { e.preventDefault(); reply.mutate(); }}><label>Resposta da equipe<input value={humanReply} onChange={e => setHumanReply(e.target.value)} required maxLength={2000} placeholder="Digite uma resposta de teste" /></label><Button type="submit" variant="nexa" disabled={reply.isPending}>{reply.isPending && <Loader2 className="cd-spin"/>}Registrar resposta</Button></form>
        </>}
    </section>
    {notice && <p role="status" className="cd-card app-gap">{notice}</p>}
  </>;
}
