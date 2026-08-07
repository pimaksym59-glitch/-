/**
 * LoginForm per state (FS4 T-FS4.7): validation, 401, 429, success redirect.
 * The BFF surface is MSW-mocked; navigation is mocked (jsdom).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth';
import { expectNoAxeViolations } from '../setup/axe';

const push = vi.fn();
const refresh = vi.fn();
let nextParam: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(nextParam ? { next: nextParam } : {}),
}));

function renderForm(): void {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LoginForm />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  nextParam = null;
});

describe('LoginForm (FS4)', () => {
  it('is labelled, keyboard-complete and passes axe', async () => {
    renderForm();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('One-time code')).toBeInTheDocument();
    await expectNoAxeViolations(screen.getByRole('main'));
  });

  it('client validation blocks an empty submit with field errors', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('401 shows the safe message without user enumeration', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText('Email'), 'test@console.local');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(push).not.toHaveBeenCalled();
  });

  it('429 shows the rate-limit recovery message', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText('Email'), 'ratelimited@console.local');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts');
  });

  it('success navigates to the validated next target', async () => {
    nextParam = '/knowledge';
    renderForm();
    await userEvent.type(screen.getByLabelText('Email'), 'test@console.local');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/knowledge'));
  });

  it('an absolute next target is rejected (open-redirect guard)', async () => {
    nextParam = 'https://evil.example/phish';
    renderForm();
    await userEvent.type(screen.getByLabelText('Email'), 'test@console.local');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('documents the demo accounts in the local environment', () => {
    renderForm();
    expect(screen.getByText(/Demo environment/)).toBeInTheDocument();
    expect(screen.getByText('owner@console.local')).toBeInTheDocument();
  });
});
