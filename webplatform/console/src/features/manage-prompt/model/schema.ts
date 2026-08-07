/**
 * Version-composer validation (FS10 T-FS10.6). Feature-owned Zod schema (the
 * FS4 `features/auth` precedent) mirroring what `POST /prompts` accepts:
 * a prompt `type` and the version `text`. Nothing else is sent — the backend
 * assigns `version`, `author` and `created_at` (§R10.6).
 */
import { z } from 'zod';

export const versionSchema = z.object({
  type: z
    .string()
    .trim()
    .min(1, 'Choose a prompt type.')
    .max(64, 'Prompt types are short identifiers.'),
  text: z
    .string()
    .trim()
    .min(1, 'A version needs text.')
    .max(20_000, 'This version is too long to save.'),
});

export type VersionFormValues = z.infer<typeof versionSchema>;
