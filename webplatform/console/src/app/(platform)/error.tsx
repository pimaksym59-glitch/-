'use client';

import { SegmentError } from '@/app/_stub/StubStates';

export default function Error({ reset }: { error: Error; reset: () => void }): React.ReactElement {
  return <SegmentError reset={reset} />;
}
