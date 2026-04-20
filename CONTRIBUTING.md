# Contributing to YavlGold

YavlGold Agro V1 is a Vanilla JS + Vite MPA app backed by Supabase. Keep changes small, reviewable, and aligned with `AGENTS.md`.

## Ground Rules

- Do not commit secrets, tokens, `.env` files, QA credentials, or real user data.
- Do not put `service_role` keys in frontend code.
- Do not introduce React, Vue, Svelte, Angular, Next, Nuxt, Astro, Tailwind, CSS-in-JS, or a SPA migration.
- Keep UI text in Spanish.
- Use CSS tokens from the V10 visual system instead of new hardcoded palettes.
- Do not grow `apps/gold/agro/agro.js` with new features; use separate `agro-*.js` modules unless the change is a surgical bugfix.

## Local Setup

```bash
pnpm install
cp apps/gold/.env.example apps/gold/.env
pnpm dev
```

Fill local values with placeholders or local Supabase values only. Never commit the resulting `.env`.

## Build

```bash
pnpm build:gold
```

The build runs the agent guard, active report check, Vite build, LLM context check, and UTF-8 dist check.

## Supabase

The canonical Supabase tree is the root `supabase/` directory. Do not recreate `apps/gold/supabase/`.

For local reset:

```bash
supabase db reset --workdir . --local --no-seed
```

Before changing RLS or Storage policies, document:

- tables or buckets touched;
- expected owner rule;
- manual abuse tests for user A vs user B;
- anon behavior;
- rollback path.

## Pull Request Checklist

- Scope is small and named by PR intent.
- Files touched are listed.
- Risk mitigated is explained.
- QA steps are exact commands or manual steps.
- `pnpm build:gold` passes.
- No secrets or real user data are printed, committed, or copied into docs.

## Security Reports

Do not discuss vulnerabilities in public issues. Follow `SECURITY.md`.
