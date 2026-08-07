'use client';

/**
 * useLogout (FS4). Ends the session via the BFF (which relays the contract
 * `POST /auth/logout` and clears the role hint), wipes the whole query cache
 * and returns to /login. Logout is best-effort — even when the upstream is
 * unreachable the local session state is discarded.
 */
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface UseLogoutResult {
  readonly logout: () => void;
  readonly isPending: boolean;
}

export function useLogout(): UseLogoutResult {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    },
    retry: false,
    onSettled: () => {
      queryClient.clear();
      router.push('/login');
      router.refresh();
    },
  });

  return { logout: () => mutation.mutate(), isPending: mutation.isPending };
}
