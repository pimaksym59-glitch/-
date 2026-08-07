'use client';

/**
 * useLogin (FS4). Posts credentials to the BFF login handler, and on success
 * clears the ENTIRE query cache (Stage 3 §8: login/logout invalidate all —
 * nothing from a previous identity may survive) before navigating to the
 * validated `next=` target. Failures map to AppError kinds → D4 §8 recovery.
 * Credentials never enter URLs, logs or query keys.
 */
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppError } from '@/shared/lib/errors';
import type { LoginRequestDTO, SessionDTO } from '@/shared/types';
import { safeNextPath } from './schema';

async function postLogin(request: LoginRequestDTO): Promise<SessionDTO> {
  let res: Response;
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'same-origin',
    });
  } catch {
    throw new AppError({
      kind: 'network',
      message: 'You appear to be offline. Check your connection and retry.',
    });
  }
  if (res.ok) return (await res.json()) as SessionDTO;

  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  const message = body?.message ?? 'Sign-in failed.';
  if (res.status === 401) {
    throw new AppError({ kind: 'permission', status: 401, message });
  }
  if (res.status === 429) {
    throw new AppError({ kind: 'rateLimit', status: 429, message });
  }
  if (res.status === 400) {
    throw new AppError({ kind: 'validation', status: 400, message });
  }
  throw new AppError({ kind: 'server', status: res.status, message });
}

export interface UseLoginResult {
  readonly login: (request: LoginRequestDTO) => void;
  readonly isPending: boolean;
  readonly error: AppError | null;
}

export function useLogin(next: string | null): UseLoginResult {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation<SessionDTO, AppError, LoginRequestDTO>({
    mutationFn: postLogin,
    retry: false, // Stage 3 §8: no retry on auth.
    onSuccess: () => {
      queryClient.clear();
      router.push(safeNextPath(next));
      router.refresh();
    },
  });

  return {
    login: (request) => mutation.mutate(request),
    isPending: mutation.isPending,
    error: mutation.error ?? null,
  };
}
