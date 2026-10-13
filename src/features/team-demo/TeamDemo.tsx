import { useState } from 'react';
import { ArrowRight, Play, RotateCcw, Sparkles, ShieldCheck, MessageSquare, Target, Repeat2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { conversation, demoAgents, demoMetrics, demoOpportunities, flowSteps } from './demo-data';
import { plans } from '../pricing/config';

const icons = { athena: MessageSquare, ethan: Target, 'follow-up': Repeat2 } as const;
const growth = plans.find(p => p.id === 'growth');
const brl = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

export function TeamDemo() {
  const [shown, setShown] = useState(1);
  const done = shown >= conversation.length;
  return <>
    <section id="equipe-em-acao" className="section team-demo" aria-labelledby="team-demo-title">
      <div className="container">
        <div className="eyebrow"><Sparkles size={14}/>ADVEXON — SUA EQUIPE IA</div>
        <h2 id="team-demo-title" className="section-title">Sua equipe IA <span className="gradient-text">em ação.</span></h2>
        <p className="section-copy">A ADVEXON ajuda pequenas empresas a responder, qualificar e recuperar oportunidades automaticamente.</p>
        <ol className="demo-flow" aria-label="Fluxo da equipe IA">{flowSteps.map(s => <li key={s}>{s}</li>)}</ol>
        <div className="demo-agents">{demoAgents.map(a => { const Icon = icons[a.id]; return <article key={a.id} className="demo-agent"><Icon aria-hidden="true"/><h3>{a.name} <span>— {a.role}</span></h3><p>{a.description}</p></article>; })}</div>

        <div id="demo-conversa" className="demo-chat-wrap">
          <div className="demo-chat-head"><h3>Veja sua equipe IA em ação</h3><p>Uma oportunidade entra. Sua equipe IA organiza o próximo passo.</p></div>
          <div className="demo-chat" aria-live="polite">
            {conversation.slice(0, shown).map(m => <div key={m.from} className={`demo-msg ${m.from === 'Cliente' ? 'client' : 'agent'} reveal`}><span className="demo-from">{m.from}</span>{m.lines.map(l => <p key={l}>{l}</p>)}</div>)}
          </div>
          <div className="demo-chat-actions">
            {done
              ? <Button variant="ghost" onClick={() => setShown(1)}><RotateCcw/>Reiniciar demonstração</Button>
              : <Button variant="nexa" onClick={() => setShown(shown + 1)}><Play/>{shown === 1 ? 'Iniciar demonstração' : 'Próxima etapa'}</Button>}
          </div>
          <div className="demo-compare">
            <div className="before"><span>ANTES</span><p><XCircle size={14}/>Mensagem perdida</p></div>
            <div className="after"><span>DEPOIS</span><p>Atendimento → Qualificação → Follow-up</p></div>
          </div>
          <p className="demo-note"><ShieldCheck size={12}/>Demonstração da experiência ADVEXON. As integrações reais serão ativadas conforme o plano e a configuração da conta.</p>
          <div className="text-center"><Button variant="nexa" className="nexa-button-lg" asChild><a href="#central-demo">Ver a Central ADVEXON<ArrowRight/></a></Button></div>
        </div>
      </div>
    </section>

    <section id="central-demo" className="section central-demo" aria-labelledby="central-title">
      <div className="container">
        <div className="eyebrow"><span className="dot"/>CENTRAL ADVEXON — DEMO</div>
        <h2 id="central-title" className="section-title">Tudo organizado em um só lugar.</h2>
        <div className="central-panel">
          <div className="central-metrics">{demoMetrics.map(m => <div key={m.label}><strong>{m.value}</strong><span>{m.label}</span></div>)}</div>
          <div className="central-grid">
            <div><h3>Equipe IA</h3><ul className="central-list">{demoAgents.map(a => <li key={a.id}><span><b>{a.name}</b> — {a.area}</span><em className="status-on">{a.status}</em></li>)}</ul></div>
            <div><h3>Oportunidades</h3><ul className="central-list">{demoOpportunities.map(o => <li key={o.name}><span><b>{o.name}</b> — {o.type}</span><em>{o.status}</em></li>)}</ul></div>
          </div>
          <p className="demo-note"><ShieldCheck size={12}/>Dados demonstrativos.</p>
        </div>

        <div className="demo-final-cta">
          <h2 className="section-title">Isso é só o começo.</h2>
          <p className="section-copy">A ADVEXON transforma tarefas repetitivas e oportunidades esquecidas em uma operação mais organizada, rápida e inteligente.</p>
          <Button variant="nexa" className="nexa-button-lg" asChild><a href="#planos">CONHECER O ADVEXON GROWTH<ArrowRight/></a></Button>
          {growth && <p className="demo-price"><strong>R$ {brl(growth.price)}/mês</strong><span>Plano recomendado para começar.</span></p>}
        </div>
      </div>
    </section>
  </>;
}
