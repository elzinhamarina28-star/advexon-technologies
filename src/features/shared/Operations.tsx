import { ArrowRight, CheckCircle2, MessageSquare, Target, Repeat2, UserRound, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';

export function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'attention' | 'brand' }) {
  return <span className={`ops-status ops-status-${tone}`}>{children}</span>;
}

export function OperationMetrics({ items }: { items: { label: string; value: string | number; note: string; icon?: ReactNode }[] }) {
  return <div className="ops-metrics">{items.map(item => <article className="ops-kpi" key={item.label}><div>{item.label}{item.icon}</div><strong>{item.value}</strong><small>{item.note}</small></article>)}</div>;
}

const flow = [
  { name: 'Atendimento', agent: 'ATHENA', icon: MessageSquare },
  { name: 'Qualificação', agent: 'ETHAN', icon: Target },
  { name: 'Venda', agent: 'Equipe', icon: UserRound },
  { name: 'Follow-up', agent: 'FOLLOW-UP', icon: Repeat2 },
  { name: 'Organização', agent: 'Equipe', icon: ListChecks },
];
export function OperationFlow() {
  return <div className="ops-flow" aria-label="Fluxo integrado da operação">{flow.map((step, index) => <div key={step.name}><step.icon size={17}/><span><b>{step.name}</b><small>{step.agent}</small></span>{index < flow.length - 1 && <ArrowRight size={14}/>}</div>)}</div>;
}

export function OperationTimeline({ items }: { items: { agent: string; title: string; detail: string; time: string }[] }) {
  return <ol className="ops-timeline">{items.map(item => <li key={`${item.time}-${item.title}`}><span className="ops-timeline-dot"><CheckCircle2 size={14}/></span><div><small>{item.agent} <time>{item.time}</time></small><b>{item.title}</b><p>{item.detail}</p></div></li>)}</ol>;
}