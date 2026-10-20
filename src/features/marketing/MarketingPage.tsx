import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Menu, X, MessageSquare, TrendingUp, Repeat2, FolderOpen, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '../shared/Brand';
import { brand, navigation } from '../shared/config';
import { Dashboard } from '../product-preview/Dashboard';
import { Agents } from '../agents/Agents';
import { Diagnostic } from '../diagnostic/Diagnostic';
import { Pricing } from '../pricing/Pricing';
import { TeamDemo } from '../team-demo/TeamDemo';
const faqs=[
 {q:'Preciso entender de IA para usar a ADVEXON?',a:'Não. A ADVEXON transforma IA em ferramentas práticas. Você não precisa dominar tecnologia para começar.'},
 {q:'A ADVEXON substitui minha equipe?',a:'Não. A proposta é trabalhar junto com sua equipe, reduzindo tarefas repetitivas e aumentando a capacidade da operação.'},
 {q:'A ADVEXON funciona para empresas pequenas?',a:'Sim. A plataforma foi pensada para permitir que empresas com diferentes níveis de estrutura comecem pelo que realmente precisam.'},
 {q:'Como funciona a cobrança?',a:'A cobrança recorrente será realizada pelo checkout oficial configurado para a ADVEXON. As condições finais serão apresentadas antes da confirmação.'},
 {q:'Posso cancelar minha assinatura?',a:'Os detalhes e condições de cancelamento serão apresentados no checkout e na política comercial da ADVEXON antes da contratação.'},
];
function HeroRibbon() {
  return (
    <svg
      className="hero-ribbon intro-ribbon"
      viewBox="0 0 1440 760"
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hr" x1="0" x2="1">
          <stop stopColor="var(--violet)" stopOpacity="0.08" />
          <stop offset=".3" stopColor="var(--violet)" stopOpacity=".82" />
          <stop offset=".65" stopColor="var(--primary)" stopOpacity=".82" />
          <stop offset="1" stopColor="var(--cyan)" stopOpacity=".08" />
        </linearGradient>
      </defs>
      <path
        pathLength={1000}
        className="nascent-line from-left"
        d="M-60 570 C190 550 360 230 590 250 S980 570 1500 310"
        stroke="url(#hr)"
      />
      <path
        pathLength={1000}
        className="nascent-line from-right"
        d="M-70 625 C210 590 390 300 630 315 S1010 610 1510 375"
        stroke="url(#hr)"
      />
      <path
        pathLength={1000}
        className="nascent-line from-left"
        d="M-50 470 C220 440 355 190 590 205 S970 485 1510 245"
        stroke="url(#hr)"
      />
      <path
        pathLength={1000}
        className="nascent-line from-right"
        d="M-70 390 C220 370 370 130 600 165 S1000 410 1510 190"
        stroke="url(#hr)"
      />
    </svg>
  );
}
export function MarketingPage() {
 const [menu,setMenu]=useState(false);

 useEffect(() => {
   const targets = document.querySelectorAll<HTMLElement>(
     '#conteudo .product-strip, #conteudo .agents-heading, #conteudo .agent-card, #conteudo .team-flow, #conteudo .editorial-heading, #conteudo .step, #conteudo .diagnostic-intro, #conteudo .diagnostic-tool, #conteudo .pricing-header, #conteudo .plan-card, #conteudo .comparison, #conteudo .faq-layout > div, #conteudo .final-cta .container, .footer .footer-main, .footer .footer-bottom, .footer .footer-links .nav-link'
   );

   const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if (reduceMotion) {
     targets.forEach((target) => target.classList.add('is-visible'));
     return;
   }

   const observer = new IntersectionObserver((entries) => {
     entries.forEach((entry) => {
       if (!entry.isIntersecting) return;
       entry.target.classList.add('is-visible');
       observer.unobserve(entry.target);
     });
   }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

   targets.forEach((target, index) => {
     target.classList.add('scroll-reveal');
     target.style.setProperty('--reveal-delay', `${(index % 4) * 85}ms`);
     observer.observe(target);
   });

   return () => observer.disconnect();
 }, []);
 return <><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><header className="header intro-header"><div className="container header-inner"><a href="#produto" aria-label="ADVEXON início"><Brand/></a><nav className="desktop-nav" aria-label="Navegação principal"><Link to="/auth" className="nav-link">Entrar</Link>{navigation.map(item=><a key={item.id} className="nav-link" href={`#${item.id}`}>{item.label}</a>)}</nav><Button variant="nexa" className="header-cta" asChild><Link to="/auth">Começar agora<ArrowRight/></Link></Button><Button variant="ghost" size="icon" className="menu-toggle" aria-expanded={menu} aria-controls="mobile-navigation" aria-label={menu?'Fechar menu':'Abrir menu'} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</Button></div>{menu&&<nav id="mobile-navigation" className="mobile-nav" aria-label="Navegação móvel"><Link to="/auth" className="nav-link" onClick={()=>setMenu(false)}>Entrar</Link><Link to="/auth" className="nav-link" onClick={()=>setMenu(false)}>Começar agora</Link>{navigation.map(item=><a key={item.id} className="nav-link" href={`#${item.id}`} onClick={()=>setMenu(false)}>{item.label}</a>)}</nav>}</header>
 <main id="conteudo"><section id="produto" className="hero"><HeroRibbon/><div className="container"><div className="hero-label intro-label"><Sparkles/>ADVEXON · Inteligência aplicada à sua operação</div><h1 className="reveal intro-title">Sua equipe IA<br/><em className="gradient-text">em ação.</em></h1><p className="hero-support intro-support">Você não precisa entender de IA.<br/>Precisa saber onde ela pode ajudar.</p><p className="hero-sub intro-sub">Atendimento, vendas, follow-up e organização trabalhando juntos para sua empresa.</p><div className="hero-actions intro-actions"><Button variant="ghost" asChild><Link to="/auth">Começar agora<ArrowRight/></Link></Button><Button variant="nexa" className="nexa-button-lg" asChild><a href="#diagnostico">Fazer meu diagnóstico<ArrowRight/></a></Button></div><p className="microcopy intro-microcopy">Gratuito. Leva cerca de 2 minutos.</p><div className="hero-mockup reveal intro-mockup"><Dashboard/><p className="mockup-caption"><ShieldCheck size={11}/>Dados demonstrativos.</p></div><div className="product-strip"><span><MessageSquare/>Atendimento</span><span><TrendingUp/>Vendas</span><span><Repeat2/>Follow-up</span><span><FolderOpen/>Organização</span></div></div></section>
 <Agents/>
 <section id="como-funciona" className="section editorial"><div className="container"><div className="editorial-heading"><div><div className="eyebrow">DO SEU MOMENTO AO PRÓXIMO PASSO</div><h2 className="section-title">Menos ruído.<br/>Mais direção.</h2></div><p className="section-copy">A tecnologia faz mais sentido quando resolve a prioridade certa. Comece entendendo o que a sua empresa precisa hoje.</p></div><div className="steps">{[{title:'Entenda seu momento',copy:'Um diagnóstico simples para olhar o atendimento, as vendas e a organização da sua empresa.'},{title:'Encontre sua prioridade',copy:'Identifique os pontos que pedem atenção e onde a IA pode ajudar primeiro.'},{title:'Conheça a proposta',copy:'Veja quais ferramentas e agentes fazem sentido para o próximo passo da sua operação.'}].map((step,i)=><article className="step" key={step.title}><span className="step-number">0{i+1}</span><h3>{step.title}</h3><p>{step.copy}</p></article>)}</div></div></section>
 <Diagnostic/><TeamDemo/><Pricing/>
 <section id="faq" className="section faq-section"><div className="container faq-layout"><div><div className="eyebrow"><span className="dot"/>PERGUNTAS FREQUENTES</div><h2 className="section-title">Clareza antes<br/>de começar.</h2><p className="section-copy">O que você precisa saber sobre a ADVEXON.</p></div><div className="faq-list">{faqs.map(faq=><details key={faq.q}><summary>{faq.q}<Plus/></summary><p>{faq.a}</p></details>)}</div></div></section>
 <section className="final-cta"><div className="container"><div className="eyebrow center"><Sparkles size={14}/>SEU PRÓXIMO PASSO</div><h2 className="section-title">Sua operação pode ir além.<br/><span className="gradient-text">Comece descobrindo como.</span></h2><p>Você não precisa ter todas as respostas. Só precisa dar o primeiro passo.</p><Button variant="nexa" className="nexa-button-lg" asChild><a href="#diagnostico">Fazer meu diagnóstico<ArrowRight/></a></Button><p className="microcopy">Gratuito. Leva cerca de 2 minutos.</p></div></section>
 </main><footer className="footer"><div className="container"><div className="footer-main"><div><Brand tagline/><p>Tecnologia que trabalha junto com você.</p></div><nav className="footer-links" aria-label="Navegação do rodapé">{navigation.map(item=><a className="nav-link" href={`#${item.id}`} key={item.id}>{item.label}</a>)}<Link className="nav-link" to="/agentes">Agentes</Link><Link className="nav-link" to="/painel">Meu painel</Link><Link className="nav-link" to="/athena">ATHENA</Link><Link className="nav-link" to="/planos">Planos</Link></nav></div><div className="footer-bottom"><span>© {brand.year} ADVEXON</span><a className="nav-link" href="mailto:suporteadvexon@gmail.com">suporteadvexon@gmail.com</a><span>Tecnologia que trabalha junto com você.</span></div></div></footer></>;
}
