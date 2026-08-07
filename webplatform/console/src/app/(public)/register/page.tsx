import type { Metadata } from 'next';
import { RegisterNotice } from '@/features/auth';

export const metadata: Metadata = { title: 'Register', robots: { index: false } };

/** The contract has no /auth/register — this screen is honest (FS4 §R4). */
export default function RegisterPage(): React.ReactElement {
  return <RegisterNotice />;
}
