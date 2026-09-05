# Changelog

## v1.0.0.1.3 — Phase 04 release candidate

### Runtime and packaging

- Lazy-loaded PDF/OCR extraction, Markdown/syntax rendering, and optional capability modules to reduce initial side-panel work.
- Removed tracked debug/dead files and empty icon placeholders without removing user-facing capabilities.
- Added deterministic extension-only ZIP packaging that excludes server bundles and source maps.
- Added package/checksum/release-manifest verification, server smoke testing, version/tag checks, and gated CI artifact/release jobs.
- Bumped the release-candidate package version to `1.0.0.1.3`; the Chrome manifest remains `1.0.0.2` with `version_name` `v1.0.0.1.3`.

### Documentation and verification

- Added the MIT license, privacy policy, release notes, and Phase 04 QA matrix; synchronized product and production-readiness documents.
- Automated local gates pass: lint, 71 focused tests, build/bundle budgets, offline production audit, extension package verification, and server smoke.
- Release-candidate ZIP SHA-256: `721ed373700fa5796828cce8627108f15807f1c1f4a996e13ef59a838ffd7875`.
- Final production approval still requires installed-Chrome, credentialed provider/OCR, accessibility, upgrade, store, and explicit tag/release acceptance.

## Unreleased — Production hardening program

### Documentation and governance

- Froze product baseline `v1.0.0.1.2` at `f8f0817c93fa2cfa4ccca85c2cad051a2ca43e6f`.
- Added the forensic finding register and four-phase roadmap.
- Added phase, implementation, error, traceability, and approval controls.
- Restored extension build/ZIP generation behind Phase 04 lint/test/build/package/verify/smoke gates; final release remains approval-gated.

### Runtime

- Completed Phase 01 deterministic core and state-integrity implementation.
- Replaced global background conversation history with request-local, session-correlated history.
- Repaired New/Clear/Load/Delete persistence behavior and added the `CLEAR_HISTORY` compatibility protocol.
- Added real cancellation across extension ports, provider fetches, Gemini streams, retry delays, browser-tool waits, and web-preview requests.
- Added awaited Chrome/IndexedDB/localStorage persistence with stable storage errors while preserving `AICopilotDB` and `copilot_` compatibility.
- Added collision-free stable `data-ai-id` allocation for dynamic pages.
- Pinned dependencies, committed `package-lock.json`, switched the paused workflow to `npm ci`, and added ESLint, Node tests, and build-structure validation.
- Split the content-script build into a self-contained IIFE so the Manifest V3 content script contains no unsupported module imports.
- Preserved UI layout, provider controls, permissions, product version, and paused build/ZIP publication policy.
- Completed Phase 02 unified provider and agent-reliability implementation.
- Replaced duplicated extension/server provider branches with one shared provider registry and runner for Gemini, OpenAI, Hugging Face, and Ollama.
- Added buffered SSE parsing, fragmented OpenAI-compatible tool-call assembly, normalized provider timeouts/retries/errors, and the current Hugging Face Inference Providers router contract.
- Added OpenAI-compatible and Ollama-native tool loops while preserving Gemini tool execution; unsupported model/capability failures no longer simulate success.
- Wired saved system prompt, custom instructions, response language, page context, attachments, screenshots, and history through a structured request contract.
- Isolated every fallback attempt to one provider credential/configuration; fallback is limited to retryable zero-output failures and cannot continue after a browser action.
- Replaced shallow duplicated connection checks with shared credential/model diagnostics and made stale DOM refresh/outcome verification bounded.
- Completed Phase 03 security and real-capability implementation without changing the frozen product version.
- Added risk classification plus exact, expiring, single-use approval for sensitive/destructive type, Enter, search, navigation, submit, purchase, publish, and delete-class browser actions.
- Added target fingerprints, post-approval target revalidation, ambiguous-target refusal, HTTP(S) navigation validation, and user-selected Google/Bing/DuckDuckGo search execution.
- Isolated page/file/OCR data in explicit untrusted envelopes that cannot override system action policy; unsafe rendered links and remote response images are blocked.
- Removed required `tabs`, `<all_urls>`, and static all-page injection; page context/actions now use `activeTab`, programmatic injection, and per-origin optional grants.
- Migrated provider credentials out of public configuration records into session storage or an optional PBKDF2-SHA-256/AES-GCM persistent vault, with unlock/relock/clear and legacy-key scrubbing.
- Moved Gemini model-list/probe credentials from query strings to the `x-goog-api-key` header.
- Added first-use external-transmission consent and bounded file count, size, PDF page, OCR timeout, and extracted-text limits.
- Added real CSV/JSON/TXT/XLSX parsing, CSV/XLSX export, local data analysis, email grouping, synthetic name/address generation, artifact preview/download, and Gemini/OpenAI image generation with cancellation and safe failures.
- Packaged OCR worker/core code locally for Manifest V3 and restricted its external fetch to English language data from the explicitly declared host.

### Verification

- `npm run lint` — passed.
- `npm test` — 71/71 passed.
- `npm run build` — passed, including extension structure/content-script validation.
- `npm audit --offline --audit-level=high` — 0 known vulnerabilities in the installed lockfile resolution.
- `npm run package:extension` and `npm run verify:release` — passed; extension-only ZIP and checksum verified.
- Local production server smoke — HTTP 200 and safe provider-auth failure behavior.
- Provider/image tests use deterministic mocked protocols; credentialed live-provider, rendered Chrome extension, OCR network/runtime, and full action E2E remain Phase 04 release gates.

## v1.0.0.1.2 — Frozen baseline

- Rebranded the project/assets to Navix AI.
- Preserved legacy storage identifiers for compatibility.
- Established the buildable source baseline for production hardening.
