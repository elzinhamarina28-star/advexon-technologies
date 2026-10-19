import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowRight, Sparkles, Menu, X, MessageSquare, TrendingUp, Repeat2, FolderOpen, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Brand } from '../shared/Brand';
import { brand, navigation } from '../shared/config';
import { Dashboard } from '../product-preview/Dashboard';
import { Agents } from '../agents/Agents';
import { Diagnostic } from '../diagnostic/Diagnostic';
import { Pricing } from '../pricing/Pricing';
import { TeamDemo } from '../team-demo/TeamDemo';
import { Hero } from './Hero';

const faqs = [
  { q: 'Preciso entender de IA para usar a ADVEXON?', a: 'Não. A ADVEXON transforma IA em ferramentas práticas. Você não precisa dominar tecnologia para começar.' },
  { q: 'A ADVEXON substitui minha equipe?', a: 'Não. A proposta é trabalhar junto com sua equipe, reduzindo tarefas repetitivas e aumentando a capacidade da operação.' },
  { q: 'A ADVEXON funciona para empresas pequenas?', a: 'Sim. A plataforma foi pensada para permitir que empresas com diferentes níveis de estrutura comecem pelo que realmente precisam.' },
  { q: 'Como funciona a cobrança?', a: 'A cobrança recorrente será realizada pelo checkout oficial configurado para a ADVEXON. As condições finais serão apresentadas antes da confirmação.' },
  { q: 'Posso cancelar minha assinatura?', a: 'Os detalhes e condições de cancelamento serão apresentados no checkout e na política comercial da ADVEXON antes da contratação.' },
];

export function MarketingPage() {
  const [menu, setMenu] = useState(false);

  return (
    <>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>

      <header className="header">
        <div className="container header-inner">
          <a href="#produto" aria-label="ADVEXON início">
            <Brand />
          </a>

          <nav className="desktop-nav" aria-label="Navegação principal">
            <Link to="/auth" className="nav-link">Entrar</Link>
            {navigation.map((item) => (
              <a key={item.id} className="nav-link" href={`#${item.id}`}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <a className="nexa-button header-cta" href="#diagnostico">
              <span>Fazer diagnóstico</span>
            </a>
            <button className="menu-toggle" type="button" aria-expanded={menu} aria-label="Abrir menu" onClick={() => setMenu((v) => !v)}>
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menu && (
          <nav className="mobile-nav" aria-label="Navegação mobile">
            <Link to="/auth" className="nav-link" onClick={() => setMenu(false)}>Entrar</Link>
            <Link to="/auth" className="nav-link" onClick={() => setMenu(false)}>Começar agora</Link>
            {navigation.map((item) => (
              <a key={item.id} className="nav-link" href={`#${item.id}`} onClick={() => setMenu(false)}>
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main id="conteudo">
        <Hero />

        <div className="product-strip" aria-label="Recursos principais da ADVEXON">
          <span><MessageSquare size={12} /> Atendimento</span>
          <span><TrendingUp size={12} /> Vendas</span>
          <span><Repeat2 size={12} /> Follow-up</span>
          <span><FolderOpen size={12} /> Organização</span>
          <span><ShieldCheck size={12} /> Fluxo seguro</span>
        </div>

        <section id="equipe" className="section">
          <div className="container">
            <div className="agents-heading">
              <div>
                <div className="eyebrow">
                  <span className="dot" />
                  Sua equipe IA em ação
                </div>
                <h2 className="section-title">Agentes pensados para a operação real.</h2>
              </div>
              <p className="section-copy">
                Cada agente da ADVEXON é desenhado para reduzir ruído, acelerar decisões e manter a operação em movimento com clareza.
              </p>
            </div>

            <Agents />
          </div>
        </section>

        <section id="como-funciona" className="section editorial">
          <div className="container">
            <div className="editorial-heading">
              <div>
                <div className="eyebrow">Do seu momento ao próximo passo</div>
                <h2 className="section-title">Menos ruído. Mais direção.</h2>
              </div>
              <p className="section-copy">
                Entenda seu momento, identifique a prioridade e transforme a operação em um sistema mais inteligente.
              </p>
            </div>

            <div className="steps">
              <div className="step">
                <span className="step-number">01</span>
                <div>
                  <h3>Entenda seu momento</h3>
                  <p>Você identifica a necessidade da operação e a plataforma organiza a demanda de forma clara.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">02</span>
                <div>
                  <h3>Encontre sua prioridade</h3>
                  <p>O processo ajuda a separar urgência, oportunidade e contexto para que a ação aconteça no momento certo.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">03</span>
                <div>
                  <h3>Conheça a proposta</h3>
                  <p>A ADVEXON mostra como a IA pode apoiar a operação de forma prática, ágil e alinhada ao crescimento do negócio.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Diagnostic />
        <TeamDemo />
        <Pricing />

        <section id="faq" className="section faq-section">
          <div className="container faq-layout">
            <div>
              <div className="eyebrow">
                <span className="dot" />
                Perguntas frequentes
              </div>
              <h2 className="section-title">Tudo que você precisa saber antes de começar.</h2>
            </div>

            <div className="faq-list">
              {faqs.map((item) => (
                <details key={item.q}>
                  <summary>
                    <span>{item.q}</span>
                    <Plus size={16} />
                  </summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta">
          <div className="container">
            <div className="eyebrow center">
              <Sparkles size={14} />
              Seu próximo passo
            </div>
            <h2 className="section-title">Sua operação pode ir além.</h2>
            <p>Descubra como a ADVEXON pode trazer clareza, velocidade e organização ao seu negócio.</p>
            <a className="nexa-button nexa-button-lg" href="#diagnostico">
              Fazer meu diagnóstico
              <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-main">
            <div>
              <Brand tagline />
              <p>Tecnologia que trabalha junto com você.</p>
            </div>

            <nav className="footer-links" aria-label="Links do rodapé">
              {navigation?.map((item) => (
                <a key={item.id} className="nav-link" href={`#${item.id}`}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="footer-bottom">
            <span>© 2026 ADVEXON</span>
            <span>Seu time de IA em ação.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
