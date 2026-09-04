# Changelog

## Unreleased — Production hardening program

### Documentation and governance

- Froze product baseline `v1.0.0.1.2` at `f8f0817c93fa2cfa4ccca85c2cad051a2ca43e6f`.
- Added the forensic finding register and four-phase roadmap.
- Added phase, implementation, error, traceability, and approval controls.
- Paused extension build/ZIP generation until Phase 04 release acceptance.

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

### Verification

- `npm run lint` — passed.
- `npm test` — 44/44 passed.
- `npm run build` — passed, including extension structure/content-script validation.
- `npm audit --offline --audit-level=high` — 0 known vulnerabilities in the installed lockfile resolution.
- Local production server smoke — HTTP 200.
- Provider tests use deterministic mocked protocols; credentialed live-provider and Chrome extension E2E remain a Phase 04 release gate.

## v1.0.0.1.2 — Frozen baseline

- Rebranded the project/assets to Navix AI.
- Preserved legacy storage identifiers for compatibility.
- Established the buildable source baseline for production hardening.
