import type { Metadata } from 'next';
import { PageStub } from '@/app/_stub/PageStub';

// Public docs are indexable (Stage 3 §5); scoped runbooks gate later.
export const metadata: Metadata = { title: 'Docs', robots: { index: true, follow: true } };

export default function DocsPage(): React.ReactElement {
  return <PageStub routeKey="docs" />;
}
