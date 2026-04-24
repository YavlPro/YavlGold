# Changelog

All notable YavlGold changes should be recorded here.

This file follows the spirit of Keep a Changelog and keeps release notes useful for humans instead of mirroring every commit.

## [Unreleased]

### Added

- Security/trust baseline planning for Supabase RLS, Storage, OSS governance, legal pages, and status/health.

### Changed

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
