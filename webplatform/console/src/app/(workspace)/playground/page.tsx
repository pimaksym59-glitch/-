import type { Metadata } from 'next';
import { PageStub } from '@/app/_stub/PageStub';

export const metadata: Metadata = { title: 'Playground' };

export default function PlaygroundPage(): React.ReactElement {
  return <PageStub routeKey="playground" />;
}
