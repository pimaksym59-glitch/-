/**
 * QueryClient factory. A fresh client per browser session (and per request on
 * the server, to avoid cross-request leakage) — created in QueryProvider.
 */
import { QueryClient } from '@tanstack/react-query';
import { queryDefaults } from './defaults';

export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: queryDefaults });
}
