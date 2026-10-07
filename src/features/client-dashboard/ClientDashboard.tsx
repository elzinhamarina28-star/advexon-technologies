import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, Gauge, MessageSquare, Target, Repeat2, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '../shared/Brand';
import { recommend } from '../diagnostic/recommendations';
import { categories, type Answers } from '../diagnostic/score';
import { questions } from '../diagnostic/questions';
import { demoAgents, demoMetrics, demoOpportunities } from '../team-demo/demo-data';
import { plans, formatPrice } from '../pricing/config';

type Result = ReturnType<typeof recommend>;
const agentIcons = { athena: MessageSquare, ethan: Target, 'follow-up': Repeat2 } as const;

/** Reads the browser-local diagnostic session; returns null when incomplete or invalid. */
function readDiagnostic(): Result | null {
  try {
    const raw = sessionStorage.getItem('nexaop-diagnostic');
    if (!raw) return null;
    const d = JSON.parse(raw) as { answers?: Answers; finished?: boolean };
    if (!d.finished || !d.answers) return null;
    if (!questions.every(q => (d.answers![q.id] ?? []).length > 0)) return null;
    return recommend(d.answers);
  } catch { return null; }
}

export function ClientDashboard() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    try { setResult(readDiagnostic()); setState('ready'); } catch { setState('error'); }
  }, []);
  const growth = plans.find(p => p.id === 'growth');

  return <main className="athena-page">
    <header className="athena-top container">
      <Link to="/" className="athena-back"><ArrowLeft size={16}/>Voltar ao site</Link>
      <Brand/>
    </header>
    <section className="container cd-shell" aria-labelledby="cd-title">
      <div className="cd-head">
        <div>
          <div className="eyebrow"><span className="dot"/>CENTRAL NEXAOP</div>
          <h1 id="cd-title" className="section-title">Seu painel</h1>
        </div>
        <nav className="cd-nav" aria-label="Atalhos">
          <Link to="/" hash="diagnostico" className="nav-link">Diagnóstico</Link>
          <Link to="/agentes" className="nav-link">Agentes</Link>
          <Link to="/athena" className="nav-link">ATHENA</Link>
          <Link to="/" hash="planos" className="nav-link">Planos</Link>
        </nav>
      </div>
      <p className="cd-banner" role="note"><Info size={14}/>Versão de demonstração. O score vem do seu diagnóstico nesta sessão; oportunidades e indicadores são dados demonstrativos.</p>

      {state === 'loading' && <div className="cd-card cd-center" aria-live="polite"><Loader2 className="cd-spin"/>Carregando seu painel…</div>}
      {state === 'error' && <div className="cd-card cd-center" role="alert">Não foi possível ler o diagnóstico desta sessão. <Link to="/" hash="diagnostico" className="nav-link">Refazer diagnóstico</Link></div>}

      {state === 'ready' && <div className="cd-grid">
        <article className="cd-card cd-score">
          <h2><Gauge size={16}/>NEXAOP Score</h2>
          {result ? <>
            <strong className="cd-big gradient-text">{result.score}</strong>
            <span className="cd-class">{result.classification}</span>
            <ul className="cd-cats">{categories.map(c => <li key={c}><span>{c}</span><div className="cd-bar"><i style={{ width: `${result.categories[c]}%` }}/></div><b>{result.categories[c]}</b></li>)}</ul>
            <p className="cd-small">Primeiro agente recomendado: <b>{result.firstAgent}</b></p>
            <p className="cd-small">Maior potencial de ganho: <b>{result.weakest}</b> — estimativa qualitativa, não é previsão financeira.</p>
          </> : <div className="cd-empty">
            <p>Você ainda não concluiu o diagnóstico nesta sessão.</p>
            <Button asChild variant="nexa"><Link to="/" hash="diagnostico">Fazer meu diagnóstico<ArrowRight/></Link></Button>
            <span className="cd-small">Gratuito. Leva cerca de 2 minutos.</span>
          </div>}
        </article>

        <article className="cd-card">
          <h2>Indicadores <em className="cd-tag">Demonstração</em></h2>
          <div className="cd-metrics">{demoMetrics.map(m => <div key={m.label}><strong>{m.value}</strong><span>{m.label}</span></div>)}</div>
        </article>

        <article className="cd-card">
          <h2>Equipe IA</h2>
          <ul className="cd-list">{demoAgents.map(a => { const Icon = agentIcons[a.id]; return <li key={a.id}><Icon size={16}/><span><b>{a.name}</b> — {a.role}</span><em className="cd-status">{a.id === 'athena' ? 'Playground disponível' : 'Demonstração'}</em></li>; })}</ul>
          <Link to="/agentes" className="nav-link cd-more">Ver agentes<ArrowRight size={14}/></Link>
        </article>

        <article className="cd-card">
          <h2>Oportunidades <em className="cd-tag">Dados fictícios</em></h2>
          <ul className="cd-list">{demoOpportunities.map(o => <li key={o.name}><span><b>{o.name}</b> — {o.type}</span><em className="cd-status">{o.status}</em></li>)}</ul>
        </article>

        {result && <article className="cd-card cd-wide">
          <h2>Pontos de atenção e oportunidades de IA</h2>
          <div className="cd-two">
            <ul>{result.findings.map(f => <li key={f}>{f}</li>)}</ul>
            <ul>{result.opportunities.map(o => <li key={o}>{o}</li>)}</ul>
          </div>
        </article>}

        {growth && <article className="cd-card cd-wide cd-cta">
          <div><h2>Plano recomendado para começar: {growth.name}</h2><p className="cd-small">R$ {formatPrice(growth.price)}/mês · proposta atual, contratação ainda não disponível online.</p></div>
          <Button asChild variant="nexa"><Link to="/" hash="planos">Ver planos<ArrowRight/></Link></Button>
        </article>}
      </div>}
    </section>
  </main>;
}
