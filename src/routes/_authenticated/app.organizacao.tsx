import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { pageHead, requireUserId } from '@/features/client-app/data';

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
    {list.data && <p className="cd-small">{pending.length} pendente(s) · {pending.filter(t => t.due_date && t.due_date < today).length} atrasada(s) · {list.data.length - pending.length} concluída(s)</p>}
    <form className="cd-card app-form app-row app-gap" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; add.mutate(Object.fromEntries(new FormData(form)) as Record<string, string>, { onSuccess: () => form.reset() }); }}>
      <label>Tarefa<input name="title" required placeholder="Ex.: retornar orçamento" /></label>
      <label>Prazo<input name="due_date" type="date" /></label>
      <Button variant="nexa" type="submit" disabled={add.isPending}>Adicionar</Button>
      {add.isError && <p className="app-error" role="alert">Não foi possível adicionar.</p>}
    </form>
    <div className="cd-card app-gap">
      {list.isLoading ? <div className="cd-center"><Loader2 className="cd-spin" />Carregando…</div>
        : list.isError ? <p role="alert">Erro ao carregar tarefas.</p>
        : !list.data!.length ? <p>Nenhuma tarefa. Adicione a primeira pendência acima.</p>
        : <ul className="cd-list">{list.data!.map(t => <li key={t.id} className="app-item">
          <label className="app-check"><input type="checkbox" checked={t.done} onChange={e => toggle.mutate({ id: t.id, value: e.target.checked })} /><span className={t.done ? 'app-done' : ''}>{t.title}</span>{t.due_date && <em className={`cd-tag ${!t.done && t.due_date < today ? 'app-late' : ''}`}>{t.due_date.split('-').reverse().join('/')}</em>}</label>
          <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => del.mutate(t.id)}><Trash2 /></Button></li>)}</ul>}
    </div>
  </>;
}
