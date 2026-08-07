import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default function LoginPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
