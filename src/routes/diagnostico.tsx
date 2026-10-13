import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Diagnostic } from '@/features/diagnostic/Diagnostic';
import { ExecutiveReport } from '@/features/diagnostic/ExecutiveReport';
import type { Answers } from '@/features/diagnostic/score';

export const Route = createFileRoute('/diagnostico')({
  head: () => ({ meta: [
    { title: 'Diagnóstico completo — Inteligência operacional ADVEXON' },
    { name: 'description', content: 'Seu mapa de maturidade operacional, descobertas explicáveis e plano de ação baseado nas suas respostas.' },
    { property: 'og:title', content: 'Diagnóstico completo — ADVEXON' },
    { property: 'og:description', content: 'Sua operação em perspectiva: prioridades, evidências e próximos passos.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }), component: ReportPage,
});
function ReportPage() {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try { const stored = JSON.parse(sessionStorage.getItem('nexaop-diagnostic') ?? 'null'); if (stored?.finished && stored.answers && typeof stored.answers === 'object') setAnswers(stored.answers); } catch { /* Start a new diagnostic if local data is unavailable. */ }
    setLoaded(true);
  }, []);
  const reset = () => { try { sessionStorage.removeItem('nexaop-diagnostic'); } catch { /* Local storage may be unavailable. */ } setAnswers(null); };
  return <main className="report-page">{!loaded ? <p role="status" className="container">Preparando seu diagnóstico…</p> : answers ? <ExecutiveReport answers={answers} onReset={reset}/> : <Diagnostic onFinish={setAnswers}/>}</main>;
}
