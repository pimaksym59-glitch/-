/**
 * Public runtime config (Stage 2 §13). Only NEXT_PUBLIC_* values are exposed
 * to the client — NO secrets ever enter the client bundle (§F7.4). The schema
 * is validated with Zod; invalid values fail fast, missing values fall back to
 * safe defaults so the scaffold builds without a populated .env.
 */
import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(['local', 'ci', 'staging', 'production']).default('local'),
  NEXT_PUBLIC_API_BASE_URL: z.string().default('/api/v1'),
  NEXT_PUBLIC_ENABLE_DEVTOOLS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type PublicConfig = z.infer<typeof publicEnvSchema>;

let cached: PublicConfig | null = null;

/** Typed, validated public runtime config. Throws on INVALID values. */
export function getPublicConfig(): PublicConfig {
  if (cached) return cached;
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_ENABLE_DEVTOOLS: process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS,
  });
  if (!parsed.success) {
    throw new Error(`Invalid public environment config:\n${parsed.error.toString()}`);
  }
  cached = parsed.data;
  return cached;
}
