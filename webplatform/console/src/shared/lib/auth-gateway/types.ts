/**
 * AuthGateway seam (FS4 T-FS4.2). One interface, two implementations:
 *  - `real`    — proxies to the frozen `/api/v1/auth/*` contract (default);
 *  - `fixture` — deterministic per-role accounts, LEGAL ONLY in local/ci
 *                (triple kill-switch, T-FS4.3).
 * The gateway runs SERVER-SIDE only (BFF handlers + layout session
 * resolution). It never logs credentials and never exposes the session value.
 */
import type { LoginRequestDTO, SessionDTO } from '@/shared/types';

export type GatewayLoginResult =
  | {
      readonly ok: true;
      readonly session: SessionDTO;
      /** Verbatim Set-Cookie header values to forward to the browser. */
      readonly setCookies: readonly string[];
    }
  | {
      readonly ok: false;
      /** 401 invalid credentials · 429 rate-limited · 502 upstream failure. */
      readonly status: 401 | 429 | 502;
      readonly retryAfterSeconds?: number;
    };

export interface AuthGateway {
  login(request: LoginRequestDTO): Promise<GatewayLoginResult>;
  /** Resolve the session from a raw Cookie header; null = unauthenticated. */
  me(cookieHeader: string): Promise<SessionDTO | null>;
  /** Returns Set-Cookie values that expire the session server-side. */
  logout(cookieHeader: string): Promise<readonly string[]>;
}
