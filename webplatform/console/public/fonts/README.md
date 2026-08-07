# Self-hosted fonts

FS1 loads **Inter** and **JetBrains Mono** via `next/font/google`, which
self-hosts and subsets them at build time (served from `/_next/static`, no
runtime CDN — CSP-safe). See `src/shared/config/fonts.ts`.

To pin the exact binaries (fully offline builds), drop the `.woff2` files here
and switch `fonts.ts` to `next/font/local`:

- `Inter.woff2` (or per-weight files)
- `JetBrainsMono.woff2`

This is a drop-in with **no architecture change** (Stage 3 §9 already specifies
self-hosted fonts).
