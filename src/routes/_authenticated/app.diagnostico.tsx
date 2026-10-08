import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Diagnostic } from '@/features/diagnostic/Diagnostic';
import type { Answers } from '@/features/diagnostic/score';
import { pageHead, saveDiagnostic } from '@/features/client-app/data';

export const Route = createFileRoute('/_authenticated/app/diagnostico')({ head: pageHead('Diagnóstico IA'), component: Page });

function Page() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const onFinish = async (answers: Answers) => {
    setStatus('saving');
    try { await saveDiagnostic(answers); setStatus('saved'); qc.invalidateQueries({ queryKey: ['diagnostic-latest'] }); }
    catch { setStatus('error'); }
  };
  return <>
    {status !== 'idle' && <p className={status === 'error' ? 'app-error' : 'cd-small'} role="status">
      {status === 'saving' ? 'Salvando resultado no seu painel…' : status === 'saved' ? 'Resultado salvo no seu painel.' : 'Não foi possível salvar o resultado. Refaça a última etapa para tentar de novo.'}
    </p>}
    <div className="app-embed"><Diagnostic onFinish={onFinish} /></div>
  </>;
}
