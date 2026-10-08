import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { pageHead, requireUserId } from '@/features/client-app/data';
import { OperationMetrics, Status } from '@/features/shared/Operations';
import { PaidAccess } from '@/features/client-app/PaidAccess';

export const Route = createFileRoute('/_authenticated/app/vendas')({ head: pageHead('Vendas'), component: () => <PaidAccess feature="pipeline"><Page /></PaidAccess> });
const stages = [['novo', 'Novo'], ['qualificado', 'Qualificado'], ['proposta', 'Proposta'], ['ganho', 'Ganho'], ['perdido', 'Perdido']] as const;
type Stage = typeof stages[number][0];

function Page() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['opportunities'], queryFn: async () => { const id = await requireUserId(); const { data, error } = await supabase.from('opportunities').select('*').eq('user_id', id).order('created_at', { ascending: false }); if (error) throw error; return data; } });
  const done = () => { qc.invalidateQueries({ queryKey: ['opportunities'] }); qc.invalidateQueries({ queryKey: ['dashboard-counts'] }); };
  const add = useMutation({ mutationFn: async (f: Record<string, string>) => { const user_id = await requireUserId(); const name = f['name']; if (!name?.trim()) throw new Error('Informe a oportunidade.'); const { error } = await supabase.from('opportunities').insert({ user_id, name, contact: f['contact'] || null, value: f['value'] ? Number(f['value']) : null, next_action: f['next_action'] || null }); if (error) throw error; }, onSuccess: done });
  const setStage = useMutation({ mutationFn: async ({ id, stage }: { id: string; stage: Stage }) => { const { error } = await supabase.from('opportunities').update({ stage, updated_at: new Date().toISOString() }).eq('id', id); if (error) throw error; }, onSuccess: done });
  const del = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('opportunities').delete().eq('id', id); if (error) throw error; }, onSuccess: done });

  return <>
    <h1 className="section-title">Vendas</h1>
    <p className="cd-small">Oportunidades com contexto, etapa e uma próxima ação.</p>
    {list.data && list.data.length > 0 && <OperationMetrics items={[
      { label: 'Em negociação', value: list.data.filter(o => !['ganho', 'perdido'].includes(o.stage)).length, note: 'Oportunidades abertas' },
      { label: 'Valor em negociação', value: `R$ ${list.data.filter(o => !['ganho', 'perdido'].includes(o.stage)).reduce((sum, o) => sum + Number(o.value ?? 0), 0).toLocaleString('pt-BR')}`, note: 'Valores registrados · não receita' },
      { label: 'Ganhas', value: list.data.filter(o => o.stage === 'ganho').length, note: 'Oportunidades concluídas' },
      { label: 'Sem próxima ação', value: list.data.filter(o => !['ganho', 'perdido'].includes(o.stage) && !o.next_action).length, note: 'Defina um próximo passo' },
    ]}/>}
    <form className="cd-card app-form app-row" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; add.mutate(Object.fromEntries(new FormData(form)) as Record<string, string>, { onSuccess: () => form.reset() }); }}>
      <label>Oportunidade<input name="name" required placeholder="Ex.: Orçamento — Maria" /></label>
      <label>Contato<input name="contact" placeholder="Telefone ou e-mail" /></label>
      <label>Valor (R$)<input name="value" type="number" min="0" step="0.01" /></label>
      <label>Próxima ação<input name="next_action" placeholder="Ex.: enviar proposta" /></label>
      <Button variant="nexa" type="submit" disabled={add.isPending}>Adicionar</Button>
      {add.isError && <p className="app-error" role="alert">Não foi possível adicionar.</p>}
    </form>
    {list.isLoading ? <div className="cd-card cd-center app-gap"><Loader2 className="cd-spin" />Carregando…</div>
      : list.isError ? <div className="cd-card app-gap" role="alert">Erro ao carregar oportunidades.</div>
      : !list.data?.length ? <div className="cd-card app-gap">Nenhuma oportunidade ainda. Registre a primeira acima.</div>
      : <div className="app-stages app-gap">{stages.map(([key, label]) => { const items = list.data?.filter(o => o.stage === key) ?? []; return <article key={key} className="cd-card">
        <h2>{label} <em className="cd-tag">{items.length}</em></h2>
        <ul className="cd-list">{items.map(o => <li key={o.id} className="app-item"><span><b>{o.name}</b>{o.value != null && <span className="ops-value">R$ {Number(o.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}<dl className="ops-card-meta"><div><dt>Contato</dt><dd>{o.contact || 'Não informado'}</dd></div><div><dt>Atualização do registro</dt><dd>{new Date(o.updated_at).toLocaleDateString('pt-BR')}</dd></div></dl><p className="ops-next-action">{o.next_action ? `Próximo: ${o.next_action}` : 'Próxima ação ainda não definida'}</p><Status tone={o.stage === 'ganho' ? 'success' : 'neutral'}>{label}</Status></span>
          <span className="app-actions"><select aria-label="Etapa" value={o.stage} onChange={e => setStage.mutate({ id: o.id, stage: e.target.value as Stage })}>{stages.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del.mutate(o.id)}><Trash2 /></Button></span></li>)}</ul>
      </article>; })}</div>}
  </>;
}
