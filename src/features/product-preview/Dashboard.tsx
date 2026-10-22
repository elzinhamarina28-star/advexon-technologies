import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LayoutDashboard, MessageSquare, TrendingUp, Repeat2, FolderOpen, Bot, Bell, ChevronDown, ArrowUpRight, Sparkles, Target, CheckCheck, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '../shared/Brand';
const tabs = [ {name:'Visão geral',icon:LayoutDashboard}, {name:'Atendimento',icon:MessageSquare}, {name:'Vendas/Oportunidades',icon:TrendingUp}, {name:'Follow-up',icon:Repeat2}, {name:'Organização',icon:FolderOpen}, {name:'Equipe IA',icon:Bot} ];
const details: Record<string, {title:string; status:string}[]> = {
 'Atendimento':[{title:'Conversa #024 — Primeiro atendimento',status:'Athena · Contexto organizado'},{title:'Conversa #025 — Dúvida sobre serviço',status:'Athena · Aguardando retorno'},{title:'Conversa #026 — Solicitação de proposta',status:'Encaminhada para qualificação'}],
 'Vendas/Oportunidades':[{title:'Oportunidade #012 — Interesse identificado',status:'Ethan · Qualificação'},{title:'Oportunidade #013 — Proposta em análise',status:'Próximo passo organizado'},{title:'Oportunidade #014 — Novo contato',status:'Ethan · Informações em revisão'}],
 'Follow-up':[{title:'Retomar conversa #018',status:'Próximo passo: enviar informações'},{title:'Acompanhar proposta #012',status:'Retorno programado · Demonstração'},{title:'Confirmar interesse #021',status:'Aguardando equipe'}],
 'Organização':[{title:'Informações de atendimento',status:'Contexto centralizado'},{title:'Prioridades da semana',status:'3 tarefas demonstrativas'},{title:'Próximos passos comerciais',status:'Organizados por oportunidade'}],
 'Equipe IA':[{title:'ATHENA — Atendimento IA',status:'Primeiro atendimento'},{title:'ETHAN — Qualificação IA',status:'Organização de oportunidades'},{title:'FOLLOW-UP — Continuidade',status:'Acompanhamento de conversas'}],
};
export function Dashboard({ initialTab = 'Visão geral' }: { initialTab?: string } = {}) {
  const [tab,setTab]=useState(initialTab); const [notifications,setNotifications]=useState(false);
 return <div className="dashboard" aria-label="Prévia demonstrativa do dashboard ADVEXON">
  <aside className="dashboard-side"><Brand/><div className="workspace"><span className="workspace-icon"><FolderOpen size={12}/></span><span>Minha empresa</span><ChevronDown size={10}/></div>
   <nav aria-label="Prévia do produto" className="dashboard-nav">{tabs.map(t=><Button variant="ghost" key={t.name} className={`dashboard-nav-item ${tab===t.name?'active':''}`} onClick={()=>setTab(t.name)}><t.icon/>{t.name}</Button>)}</nav>
   <div className="dashboard-side-footer"><Settings size={12}/><span>Ambiente demonstrativo</span></div>
  </aside>
  <div className="dashboard-main"><div className="dashboard-top"><span>Minha empresa / {tab}</span><div className="dashboard-tools"><Button variant="ghost" size="icon" aria-label="Notificações demonstrativas" title="Notificações" onClick={()=>setNotifications(!notifications)}><Bell size={13}/></Button><span className="avatar">NE</span></div></div>
   <div className="dashboard-content">
    {notifications&&<div className="notification-popover" role="status"><strong>Notificações · Dados demonstrativos</strong><p>Athena organizou uma nova conversa. Ethan identificou uma oportunidade.</p></div>}
    <div className="dashboard-heading"><div><h3>{tab==='Visão geral'?'Sua operação, em perspectiva.':tab}</h3><p>{tab==='Visão geral'?'Tudo o que importa. Organizado em um só lugar.':'Uma visão integrada dos próximos passos.'}</p></div><span className="demo-tag">Dados demonstrativos</span></div>
    {tab==='Visão geral'?<>
     <div className="metrics">{[{label:'Atendimentos',value:'128',note:'Conversas organizadas',icon:MessageSquare},{label:'Oportunidades',value:'34',note:'Em acompanhamento',icon:TrendingUp},{label:'Follow-ups',value:'21',note:'Próximos passos',icon:Repeat2},{label:'Tarefas organizadas',value:'46',note:'Na operação',icon:CheckCheck}].map(m=><div className="metric" key={m.label}><div className="metric-label">{m.label}<m.icon/></div><strong>{m.value}</strong><span className="metric-note">{m.note}</span></div>)}</div>
     <div className="dashboard-grid"><div className="chart-panel"><div className="panel-title">Movimento da operação<small>Últimos 7 dias</small></div><svg className="chart animated-chart" viewBox="0 0 400 120" role="img" aria-label="Gráfico demonstrativo de atendimentos e oportunidades em sete dias" preserveAspectRatio="none"><path className="chart-grid" d="M0 20H400 M0 50H400 M0 80H400 M0 110H400"/><path className="chart-area" d="M0 92C25 94 35 70 60 75S95 98 125 57S160 73 195 49S230 58 265 33S305 44 335 20S375 30 400 8V120H0Z"/><path className="chart-line" d="M0 92C25 94 35 70 60 75S95 98 125 57S160 73 195 49S230 58 265 33S305 44 335 20S375 30 400 8"/><path className="chart-line-secondary" d="M0 110C40 105 45 99 80 101S130 82 160 87S210 69 245 72S300 51 335 57S370 38 400 36"/></svg><div className="chart-labels">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=><span key={d}>{d}</span>)}</div></div>
      <div className="activity-panel"><div className="panel-title">Atividade recente<Sparkles size={12} className="text-violet"/></div>{[{icon:MessageSquare,title:'Athena organizou uma conversa',sub:'Primeiro atendimento · Contexto identificado',time:'Agora'},{icon:Target,title:'Ethan qualificou uma oportunidade',sub:'Informações prontas para o próximo passo',time:'5 min'},{icon:Repeat2,title:'Follow-up atualizado',sub:'Conversa adicionada ao acompanhamento',time:'12 min'}].map(a=><div className="activity-item" key={a.title}><span className="activity-icon"><a.icon/></span><div><strong>{a.title}</strong><p>{a.sub}</p></div><time>{a.time}</time></div>)}</div>
      </div><div className="dashboard-bottom"><span><Bot size={12}/>Sua equipe IA, conectada à operação.</span><Link to="/previa" search={{ view: 'dashboard' }} className="nav-link">Prévia ADVEXON<ArrowUpRight size={11}/></Link></div>
    </>:<div className="dashboard-detail">{details[tab]?.map(row=><div className="detail-row" key={row.title}><span>{row.title}</span><small>{row.status}</small></div>)}<Button variant="ghost" onClick={()=>setTab('Visão geral')} className="mt-4 text-xs"><LayoutDashboard/>Voltar à visão geral</Button></div>}
   </div>
  </div>
 </div>;
}
