# Agent Toolkit

Central MCP and skill entrypoint for this repository.

## Structure

- `mcp.json`: default Kilo MCP config (safe, no hardcoded secrets).
- `mcp.example.json`: fallback template when env interpolation is not supported.
- `skills/README.md`: human catalog of installed skills.
- `skills/registry.json`: machine-readable skill index for agents.

## Quick Setup

1. Set Supabase MCP token in your user environment.

```powershell
[Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "<YOUR_TOKEN>", "User")
```

2. Restart terminal/IDE so the variable is loaded.
3. Keep `.kilocode/mcp.json` as-is (it reads `${env:SUPABASE_ACCESS_TOKEN}`).

## Fallback Setup (No Env Interpolation)

1. Copy `.kilocode/mcp.example.json` to `.kilocode/mcp.local.json`.
2. Replace `REPLACE_WITH_SUPABASE_ACCESS_TOKEN` with your token.
3. Point your MCP client to `.kilocode/mcp.local.json`.

## Security Rules

- Never commit tokens or API secrets.
- Keep service-role credentials out of frontend/runtime configs.
- If a token was exposed, rotate it in Supabase and update local env.

## Cross-Agent Notes

- Kilo uses `.kilocode/mcp.json`.
- Roo uses `.roo/mcp.json`.
- Both configs are repository-relative and portable across machines.
