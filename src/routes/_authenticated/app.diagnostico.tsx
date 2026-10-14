import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Diagnostic } from '@/features/diagnostic/Diagnostic';
import type { Answers } from '@/features/diagnostic/score';
import { ExecutiveReport } from '@/features/diagnostic/ExecutiveReport';
import { Button } from '@/components/ui/button';
import { pageHead, saveDiagnostic, useLatestDiagnostic, useAuthUser } from '@/features/client-app/data';

export const Route = createFileRoute('/_authenticated/app/diagnostico')({ head: pageHead('Diagnóstico IA'), component: Page });

function Page() {
  const qc = useQueryClient();
  const user = useAuthUser();
  const diagnostic = useLatestDiagnostic();
  const [repeating, setRepeating] = useState(false);
  const [completed, setCompleted] = useState<Answers | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const onFinish = async (answers: Answers) => {
    setCompleted(answers);
    setStatus('saving');
    try { await saveDiagnostic(answers); setStatus('saved'); qc.invalidateQueries({ queryKey: ['diagnostic-latest'] }); }
    catch { setStatus('error'); }
  };
  const storageKey = user.data ? `advexon-diagnostic:${user.data.id}` : null;
  const reset = () => {
    if (storageKey) sessionStorage.removeItem(storageKey);
    setCompleted(null); setRepeating(true); setStatus('idle');
  };
  if (user.isLoading || diagnostic.isLoading) return <p role="status">Carregando seu diagnóstico…</p>;
  if (diagnostic.isError || !storageKey) return <p role="alert">Não foi possível carregar seu diagnóstico. <Button variant="ghost" onClick={() => { user.refetch(); diagnostic.refetch(); }}>Tentar novamente</Button></p>;
  const answers = completed ?? (!repeating ? diagnostic.data?.answers : null);
  return <>
    {status !== 'idle' && <p className={status === 'error' ? 'app-error' : 'cd-small'} role="status">
      {status === 'saving' ? 'Salvando resultado no seu painel…' : status === 'saved' ? 'Resultado salvo no seu painel.' : 'Não foi possível salvar o resultado.'}
      {status === 'error' && completed && <Button variant="ghost" onClick={() => onFinish(completed)}>Tentar salvar novamente</Button>}
    </p>}
    <div className="app-embed">{answers ? <ExecutiveReport answers={answers} authenticated onReset={reset}/> : <Diagnostic key={storageKey} storageKey={storageKey} onFinish={onFinish} authenticated />}</div>
  </>;
}
