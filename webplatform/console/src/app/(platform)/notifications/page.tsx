import type { Metadata } from 'next';
import { NotificationsSeam } from '@/widgets/platform-seams';

export const metadata: Metadata = { title: 'Notifications' };

/**
 * Notifications (FS12 T-FS12.13 — D3 §22). No notifications endpoint and no
 * notifications table exist (plan §5.2 D5), so the "record" half of D1 §6.7's
 * model has nothing to read. Toasts — the "immediate" half — already work and
 * are untouched. Per the owner's D1 sub-ruling, notification PREFERENCES belong
 * to the Settings stage, not here.
 */
export default function NotificationsPage(): React.ReactElement {
  return <NotificationsSeam />;
}
