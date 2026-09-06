# Phase 04 QA and Release Matrix

## Automated gates

| Gate | Command/evidence | Acceptance |
| --- | --- | --- |
| Clean dependency install | `npm ci --ignore-scripts --no-audit --no-fund` | Completes from the committed lockfile |
| Lint | `npm run lint` | Zero ESLint errors |
| Unit/contract regression | `npm test` | All focused tests pass |
| Production build | `npm run build` | Extension, content script, and server bundles build |
| Production dependency audit | `npm audit --omit=dev --audit-level=high` | No high/critical production vulnerabilities |
| Build structure/budgets | `scripts/verify-build.mjs` | Manifest references, local workers, and size budgets pass |
| Extension packaging | `npm run package:extension` | Deterministic extension-only ZIP is created |
| Artifact validation | `npm run verify:release` | ZIP contents, permissions, version, and SHA-256 pass |
| Server smoke | `npm run smoke:server` | Production UI and safe provider failure response pass |

## Release controls

- Product version: `1.0.0.2.0`
- Chrome manifest version: `1.0.0.3`
- Expected Git tag after approval: `v1.0.0.2.0`
- License: MIT
- Candidate ZIP SHA-256: `c3cb7d2738538487a10326508fcab6e7301d025784e9c23b54ace9e495c281cd`
- Artifact must contain no server bundle, source map, package manifest, local
  environment file, test file, or documentation file.
- The tagged workflow publishes the release only after the quality job passes.

## Runtime acceptance matrix

The following must be executed against the packaged ZIP before Chrome Web Store
submission. These checks require an installed Chrome runtime and user-approved
provider credentials, so they are intentionally kept separate from deterministic
Node tests:

| Area | Required check | Result field |
| --- | --- | --- |
| Install | Load the ZIP unpacked; side panel opens; manifest has no broad required hosts | Release operator records pass/fail |
| Upgrade | Install v1.0.0.1.2/v1.0.0.1.3 data, install v1.0.0.2.0, verify settings/history/session migration | Release operator records pass/fail |
| Providers | Gemini, OpenAI, Hugging Face, and Ollama success/error/cancellation paths | Release operator records pass/fail |
| Browser actions | Read-only action, sensitive approval, denial, replay, stale target, and navigation permission | Release operator records pass/fail |
| Trust boundary | Adversarial page text/file/OCR content cannot approve actions or create unsafe links | Release operator records pass/fail |
| Capabilities | PDF, OCR, CSV/JSON/TXT/XLSX, artifacts, image generation, data analysis, and email grouping | Release operator records pass/fail |
| Accessibility | Keyboard focus, dialog labels, escape/close behavior, contrast, and screen-reader names | Release operator records pass/fail |
| Performance | Side panel startup, first response, memory after PDF/OCR, and repeated session switching | Release operator records pass/fail |

No runtime or credentialed result is inferred from compilation alone. A failed
runtime row blocks full runtime/store acceptance and must be documented. An
explicitly approved GitHub source release may publish the deterministic artifact
only when unavailable runtime rows and limitations are disclosed in its notes.

## v1.0.0.2.0 deterministic evidence

The scoped follow-on passed lint, 80/80 focused tests, production build and bundle budgets, production high-severity dependency audit, 45-file extension-only packaging, SHA-256/release-manifest verification, and server smoke. The unavailable installed-Chrome and credentialed-provider rows above remain visibly unclaimed rather than being inferred from those passes.
