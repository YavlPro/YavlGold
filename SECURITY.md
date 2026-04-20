# Security Policy

## Supported Versions

YavlGold Agro V1 is the only currently supported public product surface.

| Product | Supported |
| --- | --- |
| YavlGold Agro V1 | Yes |
| Historical V9.x references | No, historical context only |
| Archived modules | No |

## Reporting a Vulnerability

Do not open public GitHub issues for vulnerabilities.

Use one of these private channels:

- `SECURITY_EMAIL` [PENDIENTE]
- GitHub private vulnerability reporting [PENDIENTE: habilitar si el repo es publico]

Include:

- affected route, module, table, bucket, or function;
- steps to reproduce;
- expected impact;
- account role used for testing;
- screenshots or logs with secrets removed;
- whether user data, cross-user access, auth, storage, or billing-like confusion is involved.

## Scope

In scope:

- YavlGold Agro V1 web app;
- Supabase Auth, database policies, Storage policies, and Edge Functions;
- Vercel deployment configuration;
- public legal/trust/status pages;
- OSS governance files in this repository.

Out of scope:

- denial-of-service testing;
- social engineering;
- destructive tests;
- physical attacks;
- reports requiring access to another user's data;
- spam or automated scanning without a demonstrated security impact.

## Response Targets

These are operational targets, not legal guarantees:

- acknowledgement: 72 hours;
- first triage: 7 days;
- remediation target: based on severity and exploitability.

## Safe Harbor

Good-faith research that avoids data exfiltration, service degradation, persistence, and access to third-party accounts will be handled as coordinated disclosure.

## Security Baseline

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or other server secrets in frontend code.
- Supabase RLS must protect user-owned data by default.
- Storage buckets containing private Agro evidence must remain private and owner-scoped.
- Legal/compliance text is an operational template and should be reviewed by counsel before commercial rollout.
