'use client';

/**
 * LoginForm (FS4 — feature `auth`, Stage 3 §3). A real credential form on
 * react-hook-form with feature-owned Zod validation, mapped 1:1 to the frozen
 * contract `POST /auth/login {email, password, otp?}`. Failure states follow
 * the D4 §8 recovery classes; 401 never reveals whether the email exists.
 * In local/ci the deterministic fixture accounts are documented inline —
 * honestly labelled, absent from staging/production builds by construction.
 */
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { getPublicConfig } from '@/shared/config/env';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/error-state';
import { Input } from '@/shared/ui/input';
import { loginSchema, toLoginRequest, type LoginValues } from '../model/schema';
import { useLogin } from '../model/useLogin';

export function LoginForm(): React.ReactElement {
  const params = useSearchParams();
  const { login, isPending, error } = useLogin(params.get('next'));
  const appEnv = getPublicConfig().NEXT_PUBLIC_APP_ENV;

  const form = useForm<LoginValues>({
    defaultValues: { email: '', password: '', otp: '' },
  });

  function onSubmit(values: LoginValues): void {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const seen = new Set<string>();
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === 'email' || field === 'password' || field === 'otp') && !seen.has(field)) {
          seen.add(field);
          form.setError(field, { type: 'zod', message: issue.message });
        }
      }
      return;
    }
    login(toLoginRequest(parsed.data));
  }

  const { errors } = form.formState;

  return (
    <main id="main-content" className="onyx-raised w-[min(400px,92vw)] rounded-2xl p-8">
      <h1 className="text-center text-2xl font-semibold text-primary">Sign in</h1>
      <p className="mt-2 text-center text-sm text-secondary">
        Your autonomous channels are waiting.
      </p>
      <form
        noValidate
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          void form.handleSubmit(onSubmit)(e);
        }}
      >
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...(errors.email?.message ? { error: errors.email.message } : {})}
          {...form.register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          {...(errors.password?.message ? { error: errors.password.message } : {})}
          {...form.register('password')}
        />
        <Input
          label="One-time code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          helper="Only if MFA is enabled on your account."
          {...(errors.otp?.message ? { error: errors.otp.message } : {})}
          {...form.register('otp')}
        />
        {error ? (
          <ErrorState
            scope="inline"
            title={error.message}
            {...(error.kind === 'network' || error.kind === 'server'
              ? { onRetry: () => form.handleSubmit(onSubmit)(), retryLabel: 'Retry' }
              : {})}
          />
        ) : null}
        <Button type="submit" size="lg" loading={isPending} className="w-full">
          Sign in
        </Button>
      </form>
      {appEnv === 'local' || appEnv === 'ci' ? (
        <p className="mt-4 rounded-lg bg-inset p-3 text-[13px] text-secondary">
          <span className="font-medium text-primary">Demo environment.</span> Sign in with{' '}
          <code className="font-mono">owner@console.local</code> (or admin/editor/analyst/viewer)
          and password <code className="font-mono">console-demo</code>.
        </p>
      ) : null}
    </main>
  );
}
