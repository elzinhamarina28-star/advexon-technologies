import { ArrowRight, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function Hero() {
  const headingRef = useRef<HTMLDivElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);

  useScrollReveal(headingRef);
  useScrollReveal(visualRef);

  return (
    <section id="produto" className="hero hero-cinematic" aria-label="Introdução da ADVEXON">
      <div className="hero-glow" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy reveal-in" ref={headingRef}>
          <div className="hero-label">
            <Sparkles size={12} />
            ADVEXON · Inteligência aplicada à sua operação
          </div>

          <h1>
            IA que organiza a rotina, acelera decisões e fortalece a operação.
          </h1>

          <p className="hero-support">
            A ADVEXON conecta atendimento, organização e acompanhamento em um fluxo inteligente para sua empresa.
          </p>

          <p className="hero-sub">
            Transformamos demandas em processo claro, com agentes de IA trabalhando juntos para reduzir ruído, responder antes e manter cada oportunidade em movimento.
          </p>

          <div className="hero-actions">
            <a className="nexa-button nexa-button-lg" href="#como-funciona">
              Conhecer a solução
              <ArrowRight size={16} />
            </a>
            <a className="nexa-outline nexa-button-lg" href="#equipe">
              Explorar recursos
            </a>
          </div>

          <div className="microcopy">
            Estrutura pensada para operação real, com processo claro e decisão mais rápida.
          </div>
        </div>

        <div className="hero-visual reveal-in" ref={visualRef} aria-hidden="true">
          <div className="hero-panel">
            <div className="hero-panel-header">
              <span className="hero-panel-pill">Fluxo ativo</span>
              <span className="hero-panel-status" />
            </div>

            <div className="hero-network">
              <div className="node node-primary">
                <span>Atendimento</span>
                <small>IA</small>
              </div>
              <div className="node node-secondary">
                <span>Qualificação</span>
                <small>IA</small>
              </div>
              <div className="node node-accent">
                <span>Follow-up</span>
                <small>IA</small>
              </div>
            </div>

            <div className="hero-metrics">
              <div>
                <strong>24/7</strong>
                <span>respostas</span>
              </div>
              <div>
                <strong>3x</strong>
                <span>mais rapidez</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>organização</span>
              </div>
            </div>
          </div>

          <div className="floating-card floating-card-left">
            <span>Demandas</span>
            <strong>24 pendentes</strong>
          </div>

          <div className="floating-card floating-card-right">
            <span>Resultado</span>
            <strong>Fluxo em execução</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
