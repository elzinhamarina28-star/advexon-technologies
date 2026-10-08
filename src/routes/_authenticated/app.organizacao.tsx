import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { pageHead, requireUserId } from '@/features/client-app/data';
import { OperationMetrics, Status } from '@/features/shared/Operations';

export const Route = createFileRoute('/_authenticated/app/organizacao')({ head: pageHead('Organização'), component: Page });

function Page() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['tasks'], queryFn: async () => { const id = await requireUserId(); const { data, error } = await supabase.from('tasks').select('*').eq('user_id', id).order('done').order('due_date', { nullsFirst: false }); if (error) throw error; return data; } });
  const done = () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['dashboard-counts'] }); };
  const add = useMutation({ mutationFn: async (f: Record<string, string>) => { const user_id = await requireUserId(); const { error } = await supabase.from('tasks').insert({ user_id, title: f['title']!, due_date: f['due_date'] || null }); if (error) throw error; }, onSuccess: done });
  const toggle = useMutation({ mutationFn: async ({ id, value }: { id: string; value: boolean }) => { const { error } = await supabase.from('tasks').update({ done: value }).eq('id', id); if (error) throw error; }, onSuccess: done });
  const del = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('tasks').delete().eq('id', id); if (error) throw error; }, onSuccess: done });
  const today = new Date().toISOString().slice(0, 10);
  const pending = list.data?.filter(t => !t.done) ?? [];

  return <>
    <h1 className="section-title">Organização</h1>
    <p className="cd-small">Prioridades e pendências para manter a operação em movimento.</p>
    {list.data && list.data.length > 0 && <OperationMetrics items={[
      { label: 'Pendentes', value: pending.length, note: 'Próximos passos em aberto' },
      { label: 'Para hoje', value: pending.filter(t => t.due_date === today).length, note: 'Prioridades do dia' },
      { label: 'Atrasadas', value: pending.filter(t => t.due_date && t.due_date < today).length, note: 'Requer atenção' },
      { label: 'Concluídas', value: list.data.length - pending.length, note: 'Tarefas finalizadas' },
    ]}/>}
    <form className="cd-card app-form app-row app-gap" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; add.mutate(Object.fromEntries(new FormData(form)) as Record<string, string>, { onSuccess: () => form.reset() }); }}>
      <label>Tarefa<input name="title" required placeholder="Ex.: retornar orçamento" /></label>
      <label>Prazo<input name="due_date" type="date" /></label>
      <Button variant="nexa" type="submit" disabled={add.isPending}>Adicionar</Button>
      {add.isError && <p className="app-error" role="alert">Não foi possível adicionar.</p>}
    </form>
    <div className="ops-section app-gap">
      {list.isLoading ? <div className="cd-center"><Loader2 className="cd-spin" />Carregando…</div>
        : list.isError ? <p role="alert">Erro ao carregar tarefas.</p>
        : !list.data?.length ? <p>Nenhuma tarefa. Adicione a primeira pendência acima.</p>
        : ['Atrasadas', 'Hoje', 'Próximas / sem prazo', 'Concluídas'].map(group => { const items = list.data?.filter(t => (t.done ? 'Concluídas' : t.due_date && t.due_date < today ? 'Atrasadas' : t.due_date === today ? 'Hoje' : 'Próximas / sem prazo') === group) ?? []; return items.length > 0 && <section className="ops-section" key={group}><div className="ops-section-heading"><h2>{group}</h2><Status tone={group === 'Concluídas' ? 'success' : group === 'Atrasadas' ? 'attention' : 'neutral'}>{items.length}</Status></div><ul className="cd-list">{items.map(t => <li key={t.id} className="app-item">
          <label className="app-check"><input type="checkbox" checked={t.done} onChange={e => toggle.mutate({ id: t.id, value: e.target.checked })} /><span className={t.done ? 'app-done' : ''}>{t.title}</span>{t.due_date && <em className={`cd-tag ${!t.done && t.due_date < today ? 'app-late' : ''}`}>{t.due_date.split('-').reverse().join('/')}</em>}</label>
          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del.mutate(t.id)}><Trash2 /></Button></li>)}</ul></section>; })}
    </div>
  </>;
}
