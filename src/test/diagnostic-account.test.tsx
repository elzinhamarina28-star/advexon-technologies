import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route } from '@/routes/_authenticated/app.diagnostico';
import { questions } from '@/features/diagnostic/questions';

const state = vi.hoisted(() => ({ user: 'account-a', saved: null as null | { answers: Record<string, number[]> }, save: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/features/client-app/data', () => ({
  pageHead: () => () => ({}), saveDiagnostic: state.save,
  useAuthUser: () => ({ data: { id: state.user }, isLoading: false, refetch: vi.fn() }),
  useLatestDiagnostic: () => ({ data: state.saved, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/features/shared/Brand', () => ({ Brand: () => null }));
vi.mock('@tanstack/react-router', async (original) => ({ ...await original<typeof import('@tanstack/react-router')>(), Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a> }));
function mount() {
  const Page = Route.options.component;
  if (!Page) throw new Error('Missing page');
  return render(<QueryClientProvider client={new QueryClient()}><Page/></QueryClientProvider>);
}
afterEach(() => { cleanup(); sessionStorage.clear(); state.saved = null; state.user = 'account-a'; state.save.mockClear(); });
describe('Account diagnostic continuity', () => {
  it('reuses saved database answers without starting the questionnaire or writing a duplicate', async () => {
    state.saved = { answers: Object.fromEntries(questions.map(q => [q.id, [0]])) };
    mount();
    await screen.findByRole('article', { name: 'Diagnóstico completo ADVEXON' });
    expect(screen.queryByRole('group', { name: questions[0]?.title })).toBeNull();
    expect(state.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Refazer diagnóstico' }));
    await screen.findByRole('group', { name: questions[0]?.title });
  });
  it('does not load another account or anonymous answers when starting a first diagnostic', async () => {
    const finished = JSON.stringify({ step: 11, answers: Object.fromEntries(questions.map(q => [q.id, [0]])), finished: true });
    sessionStorage.setItem('nexaop-diagnostic', finished);
    sessionStorage.setItem('advexon-diagnostic:account-a', finished);
    state.user = 'account-b';
    mount();
    await screen.findByRole('group', { name: questions[0]?.title });
    expect(screen.queryByRole('article', { name: 'Diagnóstico completo ADVEXON' })).toBeNull();
    expect(state.save).not.toHaveBeenCalled();
  });
  it('saves all twelve answers on the first completed account diagnostic', async () => {
    mount();
    for (const [i, q] of questions.entries()) {
      await screen.findByRole('group', { name: q.title });
      fireEvent.click(screen.getByRole('button', { name: q.options[0], exact: true }));
      fireEvent.click(screen.getByRole('button', { name: i === 11 ? 'Ver meu resultado' : 'Continuar' }));
    }
    await screen.findByRole('article', { name: 'Diagnóstico completo ADVEXON' });
    expect(state.save).toHaveBeenCalledExactlyOnceWith(Object.fromEntries(questions.map(q => [q.id, [0]])));
    expect(JSON.parse(sessionStorage.getItem('advexon-diagnostic:account-a') ?? 'null').finished).toBe(true);
  });
});