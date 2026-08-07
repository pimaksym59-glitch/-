import type { Metadata } from 'next';
import { PageStub } from '@/app/_stub/PageStub';

export const metadata: Metadata = { title: 'Channels' };

export default function ChannelsPage(): React.ReactElement {
  return <PageStub routeKey="channels" />;
}
