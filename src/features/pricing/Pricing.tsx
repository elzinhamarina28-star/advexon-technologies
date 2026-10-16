import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, ArrowRight, ChevronDown, X, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { plans, formatPrice, type Plan } from './config';
import { comparison } from '../comparison/config';

export function Pricing() {
  const [chosen, setChosen] = useState<Plan | null>(null);

  return (
    <section id="planos" className="section">
      <div className="container">
        <div className="pricing-header">
          <div className="eyebrow center">
            <span className="dot" />PLANOS ADVEXON
          </div>
          <h2 className="section-title">Comece no seu ritmo.<br />
            <span className="gradient-text">Escolha um plano</span>
          </h2>
        </div>

        <div className="pricing-grid">
          {plans.filter(p => p.active).map(plan => (
            <article key={plan.id} className={`plan-card ${plan.id === 'growth' ? 'featured' : ''}`}>
              {plan.id === 'growth' && <span className="plan-badge">MAIS ESCOLHIDO</span>}
              <header className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">R$ {formatPrice(plan.price)} <span className="billing">/ {plan.billingPeriod}</span></div>
              </header>

              <ul className="plan-features">
                {plan.features.map((f, i) => (
                  <li key={i} className="feature"><Check size={16} /> {f}</li>
                ))}
              </ul>

              <div className="plan-footer">
                {/* If checkoutUrl exists, open external Kiwify checkout; otherwise fall back to modal */}
                {plan.checkoutUrl ? (
                  <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    <Button aria-label={`Começar com ${plan.name}`}>
                      Começar com {plan.name}
                    </Button>
                  </a>
                ) : (
                  <Button onClick={() => setChosen(plan)} aria-label={`Começar com ${plan.name}`}>
                    Começar com {plan.name}
                  </Button>
                )}

                <div className="plan-limits">
                  <small>{plan.limits.users} usuário(s) • {plan.limits.interactions} interações/mês</small>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="pricing-note">Alguns módulos estão em desenvolvimento e serão ativados progressivamente.</p>

        <div className="comparison">
          <h3>Compare os planos</h3>
          <table className="comparison-table">
            <caption className="sr-only">Recursos e limites dos planos ADVEXON</caption>
            {/* simplified: keep compatibility with existing CSS */}
            <thead>
              <tr>
                <th>Plano</th>
                <th>Usuários</th>
                <th>Interações</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.limits.users}</td>
                  <td>{p.limits.interactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog.Root open={chosen !== null} onOpenChange={open => { if (!open) setChosen(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="modal-backdrop" />
            <Dialog.Content className="commercial-modal fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="modal-header">
                <h4>Checkout</h4>
                <button className="close" onClick={() => setChosen(null)} aria-label="Fechar"><X /></button>
              </div>
              <div className="modal-body">
                <p>O checkout oficial será disponibilizado em breve.</p>
                <p>Enquanto isso, entre em contato com a equipe para ativação.</p>
              </div>
              <div className="modal-actions">
                <Button onClick={() => setChosen(null)}>Fechar</Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

      </div>
    </section>
  );
}
