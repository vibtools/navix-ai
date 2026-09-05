# Navix AI v1.0.0.1.3

Navix AI v1.0.0.1.3 is the Phase 04 production-hardening release candidate.

## Included

- Reduced initial side-panel JavaScript from roughly 1.06 MB to roughly 312 KB
  by lazy-loading Markdown/syntax rendering, PDF/OCR processing, structured
  capabilities, and the capability drawer.
- Added local PDF/OCR worker modules with bounded extraction and deterministic
  cleanup.
- Added a deterministic extension-only ZIP packager; server bundles and source
  maps are excluded from the Chrome artifact.
- Added release verification for manifest identity, permissions, required
  extension files, artifact contents, checksums, and bundle budgets.
- Restored CI gates for install, lint, tests, build, release packaging, release
  verification, and production-server smoke testing.
- Added MIT licensing and privacy notes, removed proven debug/dead/empty
  repository assets, and synchronized Phase 04 documentation.

## Compatibility

The existing Navix AI UI, providers, settings, stored-data identifiers,
sessions, history, attachments, OCR, actions, and least-privilege permission
model are retained. The Chrome-compatible version is `1.0.0.2`; the product
version name and Git tag are `v1.0.0.1.3`.

## Verification

The release workflow runs the full deterministic local gate before publishing
a tagged GitHub release. Credentialed live-provider, installed-Chrome, and
visual accessibility checks must be completed in the release environment with
real provider accounts and a Chrome runtime; the repository workflow is the
authoritative repeatable gate for those checks.
