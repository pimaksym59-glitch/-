import type { Metadata } from 'next';
import { ProfileHonesty, ProfileView } from '@/widgets/profile';

export const metadata: Metadata = { title: 'Profile' };

/**
 * Profile (FS13 T-FS13.8 — D3 §24). An RSC shell with no server fetch: the
 * identity is already in the session the account layout re-checked, and the
 * activity records are read client-side through FS12's audit slice when the
 * Activity tab opens.
 *
 * The Sessions content is rendered HERE, on the server, and passed as a slot —
 * static honesty markup does not belong in a client bundle (FS12 lesson).
 */
export default function ProfilePage(): React.ReactElement {
  return <ProfileView sessionsSlot={<ProfileHonesty />} />;
}
