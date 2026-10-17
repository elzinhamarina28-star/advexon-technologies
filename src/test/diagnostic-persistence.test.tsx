import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route } from '@/routes/diagnostico';
import { questions } from '@/features/diagnostic/questions';
import type { Answers } from '@/features/diagnostic/score';
import { Pricing } from '@/features/pricing/Pricing';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-router')>();
  return { ...original, Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> };
});
vi.mock('@/features/shared/Brand', () => ({ Brand: () => null }));
// Exercise the existing unconfigured-checkout fallback, not an external payment.
vi.mock('@/features/pricing/config', async importOriginal => {
  const config = await importOriginal<typeof import('@/features/pricing/config')>();
  return { ...config, plans: config.plans.map(plan => ({ ...plan, checkoutUrl: null })) };
});

const Page = Route.options.component;
function mountPage() {
  if (!Page) throw new Error('Missing diagnostic route component');
  return render(<Page />);
}

describe('Diagnostic completion persistence', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });

  it('saves all 12 answers before showing the report and restores it on reload', async () => {
    const view = mountPage();
    const answers: Answers = {};
    for (const [index, question] of questions.entries()) {
      await screen.findByRole('group', { name: question.title });
      fireEvent.click(screen.getAllByRole('button').find(button => button.textContent === question.options[0]) ?? screen.getByRole('button', { name: question.options[0] ?? '' }));
      answers[question.id] = [0];
      fireEvent.click(screen.getByRole('button', { name: index === 11 ? 'Ver meu resultado' : 'Continuar' }));
    }
    await screen.findByRole('article', { name: 'Diagnóstico completo ADVEXON' });
    expect(JSON.parse(sessionStorage.getItem('nexaop-diagnostic') ?? 'null')).toEqual({ step: 11, answers, finished: true });

    view.unmount(); // Reload discards React state but retains same-tab sessionStorage.
    mountPage();
    await screen.findByRole('article', { name: 'Diagnóstico completo ADVEXON' });
    expect(screen.queryByRole('group', { name: 'Qual é o segmento do seu negócio?' })).not.toBeInTheDocument();

    const pricing = render(<Pricing/>);
    fireEvent.click(screen.getByRole('button', { name: 'Começar com Start' }));
    expect(screen.getByRole('link', { name: 'Fazer meu diagnóstico' })).toHaveAttribute('href', '/diagnostico');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    pricing.unmount();

    fireEvent.click(screen.getByRole('button', { name: 'Refazer diagnóstico' }));
    await screen.findByRole('group', { name: 'Qual é o segmento do seu negócio?' });
    await waitFor(() => expect(JSON.parse(sessionStorage.getItem('nexaop-diagnostic') ?? 'null')?.finished).not.toBe(true));
    expect(screen.queryByRole('article', { name: 'Diagnóstico completo ADVEXON' })).not.toBeInTheDocument();
  });
});