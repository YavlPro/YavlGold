# Changelog

All notable YavlGold changes should be recorded here.

This file follows the spirit of Keep a Changelog and keeps release notes useful for humans instead of mirroring every commit.

## [Unreleased]

### Added

- Security/trust baseline planning for Supabase RLS, Storage, OSS governance, legal pages, and status/health.

### Changed

- Relicensing of the codebase from MIT to `AGPL-3.0-or-later`: root and `apps/gold` `LICENSE` files now carry the full GNU Affero General Public License v3.0 plus a commercial-license notice, `package.json` files declare `AGPL-3.0-or-later`, public footers and the `/open-source` page point to AGPL-3.0, and a new `LICENSE-COMMERCIAL.md` documents the paid alternative for users who cannot publish derived source. **Not retroactive:** versions published before this change remain under MIT in perpetuity, and the AGPL text applies only from this commit forward.
- Documented production trust defaults: security contact `soporte@yavlgold.com`, public repository `https://github.com/YavlPro/YavlGold`, Venezuelan applicable-law wording, and operational response targets.

### Fixed

- Removed visible trust-page placeholders and added a public security page to the Vite MPA build.

### Security

- Added reproducible RLS/Storage validation runbook and smoke-test script for two-user A/B checks.

## [1.0.0] - 2026-04-20

### Added

- YavlGold Agro V1 public baseline.
- Root OSS files: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, and `CHANGELOG.md`.

### Security

- Supabase RLS and Storage hardening are tracked as first-class release work.
