import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Route as AuthRoute } from '@/routes/auth';
import { Route as ResetPasswordRoute } from '@/routes/reset-password';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: state.getSession,
      signInWithPassword: state.signInWithPassword,
      signUp: state.signUp,
      resetPasswordForEmail: state.resetPasswordForEmail,
      updateUser: state.updateUser,
      onAuthStateChange: state.onAuthStateChange,
    },
  },
}));

vi.mock('@/features/shared/Brand', () => ({ Brand: () => null }));

vi.mock('@tanstack/react-router', async (original) => ({
  ...await original<typeof import('@tanstack/react-router')>(),
  useNavigate: () => state.navigate,
  Link: ({ children, to, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}));

function mount(route: typeof AuthRoute | typeof ResetPasswordRoute) {
  const Page = route.options.component;
  if (!Page) throw new Error('Missing route component');
  return render(<Page />);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.getSession.mockResolvedValue({ data: { session: null }, error: null });
  state.signInWithPassword.mockResolvedValue({ error: null });
  state.signUp.mockResolvedValue({ data: { session: null, user: { id: 'test-user' } }, error: null });
  state.resetPasswordForEmail.mockResolvedValue({ error: null });
  state.updateUser.mockResolvedValue({ error: null });
  state.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: state.unsubscribe } },
  }));
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('ADVEXON account access flows', () => {
  it('logs in with valid credentials and routes to the app', async () => {
    mount(AuthRoute);
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'pessoa@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar na minha conta/i }));

    await waitFor(() => expect(state.signInWithPassword).toHaveBeenCalledWith({
      email: 'pessoa@example.com',
      password: 'Senha123!',
    }));
    expect(state.navigate).toHaveBeenCalledWith({ to: '/app' });
  });

  it('validates signup fields and sends a confirmation email request', async () => {
    mount(AuthRoute);
    fireEvent.click(screen.getByRole('tab', { name: 'Criar conta' }));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Maria Teste' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@example.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'Senha123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Criar minha conta/i }));

    await waitFor(() => expect(state.signUp).toHaveBeenCalledWith({
      email: 'maria@example.com',
      password: 'Senha123!',
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: 'Maria Teste' },
      },
    }));
    expect(await screen.findByRole('status')).toHaveTextContent(/confirmação/i);
    expect(state.navigate).not.toHaveBeenCalled();
  });

  it('uses a generic recovery response and redirects the provider back to reset-password', async () => {
    mount(AuthRoute);
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'pessoa@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar link de recuperação/i }));

    await waitFor(() => expect(state.resetPasswordForEmail).toHaveBeenCalledWith(
      'pessoa@example.com',
      { redirectTo: `${window.location.origin}/reset-password` },
    ));
    expect(await screen.findByRole('status')).toHaveTextContent(/se houver uma conta/i);
  });

  it('does not update a password when the recovery confirmation does not match', async () => {
    window.history.replaceState({}, '', '/reset-password#access_token=test-token&type=recovery');
    state.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token', user: { id: 'test-user' } } },
      error: null,
    });
    mount(ResetPasswordRoute);

    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: 'NovaSenha123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'SenhaDiferente123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar nova senha/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/senhas não coincidem/i);
    expect(state.updateUser).not.toHaveBeenCalled();
  });

  it('saves a new password only inside a recovery session', async () => {
    window.history.replaceState({}, '', '/reset-password#access_token=test-token&type=recovery');
    state.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token', user: { id: 'test-user' } } },
      error: null,
    });
    mount(ResetPasswordRoute);

    fireEvent.change(await screen.findByLabelText('Nova senha'), { target: { value: 'NovaSenha123!' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'NovaSenha123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar nova senha/i }));

    await waitFor(() => expect(state.updateUser).toHaveBeenCalledWith({ password: 'NovaSenha123!' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/senha redefinida/i);
  });

  it('does not show the password form for an ordinary non-recovery session', async () => {
    state.getSession.mockResolvedValue({
      data: { session: { access_token: 'ordinary-token', user: { id: 'test-user' } } },
      error: null,
    });
    mount(ResetPasswordRoute);

    expect(await screen.findByText(/abra esta página pelo link de recuperação/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(state.updateUser).not.toHaveBeenCalled();
  });
});
