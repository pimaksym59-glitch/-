import type { Metadata } from 'next';
import { ChatView } from '@/widgets/chat';

export const metadata: Metadata = { title: 'AI Chat' };

/**
 * AI Chat (FS6 T-FS6.6). Conversations are LOCAL-FIRST (approved plan
 * deviation D1 — the frozen contract has no conversation endpoints), so there
 * is no RSC data to fetch: the server renders the shell and the client
 * hydrates threads from the single ConversationRepository.
 */
export default async function ChatPage({
  params,
}: {
  readonly params: Promise<{ id?: readonly string[] }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  return <ChatView conversationId={id?.[0] ?? null} />;
}
