# Changelog

All notable YavlGold changes should be recorded here.

This file follows the spirit of Keep a Changelog and keeps release notes useful for humans instead of mirroring every commit.

## [Unreleased]

### Added

- Test suite for pure financial logic: 125 new `node:test` cases across `agro-exchange`, `agro-unit-totals`, `agro-format`, `agro-report-format` and `agro-display-currency` (128 tests in total including the pre-existing calculator suite), with zero new dependencies and no production code touched. The runner is wired up in `turbo.json` (`test` task) and in the CI workflow (`pnpm test` between install and build), so the suite — previously orphaned, as neither Turbo nor CI executed it — now runs on every push. Three real defects were found and are parked as skipped tests pending fixes: asymmetric negative rounding in `toCents()`, a misplaced sign and a missing thousands separator in `formatCurrencyDisplay()`.
- Security/trust baseline planning for Supabase RLS, Storage, OSS governance, legal pages, and status/health.

### Changed

- Relicensing of the codebase from MIT to `AGPL-3.0-or-later`: root and `apps/gold` `LICENSE` files carry the 661-line verbatim GNU Affero General Public License v3.0 text (nothing prepended, so GitHub/licensee can assert the SPDX id — a preceding 31-line header had dropped the similarity score to 95.5% and forced `NOASSERTION`), copyright and the dual-license notice live in `NOTICE`, `package.json` files declare `AGPL-3.0-or-later`, public footers and the `/open-source` page point to AGPL-3.0, and `COMMERCIAL.md` (renamed from `LICENSE-COMMERCIAL.md`, which matched the `LICENSE*` detection pattern) documents the paid alternative for users who cannot publish derived source. GitHub now reports `spdx_id: "AGPL-3.0"`. **Not retroactive:** versions published before this change remain under MIT in perpetuity, and the AGPL text applies only from this commit forward.
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
