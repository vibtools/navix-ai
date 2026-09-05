# Production Roadmap

## Objective

Move the frozen Navix AI baseline to production readiness in exactly four controlled phases while preserving existing UI/UX, stored data, public features, and workflows.

| Phase | Name | Outcome | Status |
| --- | --- | --- | --- |
| 01 | Deterministic Core and State Integrity | Stable build, sessions, storage, cancellation, selectors, and minimum quality gates | Completed — 2026-09-04 UTC |
| 02 | Unified Providers and Agent Reliability | One provider contract, reliable streaming/errors, and capability-correct agent execution | Completed — 2026-09-04 UTC |
| 03 | Security and Real Capability Completion | Safe actions, privacy/secret controls, prompt-injection defenses, and truthful features | Completed — 2026-09-05 UTC |
| 04 | Performance, Full QA, and Release | Optimized package, full regression evidence, restored build workflow, versioned release | Pending |

## Phase 01 — Deterministic Core and State Integrity

### Scope

- Commit deterministic dependency resolution and installation.
- Add real lint, syntax, unit, and build validation without altering rendered UI.
- Create a session-aware side-panel/background state contract.
- Repair New/Clear/Load/Delete chat and session switching.
- Preserve/migrate existing settings/history without data loss.
- Await/normalize storage operations and handle unavailable, invalid, and quota states.
- Make dynamic DOM action identifiers unique and stable.
- Implement real request cancellation and clean port lifecycle.
- Establish structured error codes used by later phases.

### Locked exclusions

No redesign, feature/provider removal, permission expansion, version bump, release artifact, provider tool parity, or confirmation UI.

### Exit criteria

Deterministic clean build passes; histories cannot leak; baseline data remains readable; DOM IDs do not collide; cancellation is consistent; new regression gates pass; required docs are synchronized.

### Completion evidence

Phase 01 closed F-001 through F-006 and the Phase 01 portion of F-007. ESLint passed, 19 focused tests passed, the production build and self-contained content-script check passed, the installed lockfile audit reported zero known vulnerabilities, and the local production server returned HTTP 200. Chrome extension E2E and bundle optimization remain explicitly assigned to Phase 04.

## Phase 02 — Unified Providers and Agent Reliability

### Scope

- Create one provider-adapter contract for Gemini, OpenAI, Hugging Face, and Ollama.
- Remove extension/server behavioral duplication without breaking web preview.
- Normalize buffered streams, responses, timeouts, retries, cancellation, and errors.
- Validate provider models/capabilities and safe fallback selection.
- Wire system/custom/language/context/screenshot/attachment inputs correctly.
- Normalize tool calls for supporting providers and truthfully report unsupported capabilities.
- Verify tool outcomes and recover boundedly from stale context.

### Locked exclusions

Preserve provider UI and stored records. Do not expand automatic sensitive actions before Phase 03. No broad redesign or unrelated features.

### Exit criteria

All providers pass supported response/error tests; tool-capable providers pass controlled action tests; split SSE records are preserved; fallback cannot mix credentials/history; extension/server behavior shares verified contracts.

### Completion evidence

Phase 02 closed F-008 through F-012 and the Phase 02 request-wiring portion of F-013. Gemini, OpenAI, Hugging Face, and Ollama now use shared provider execution, prompt, error, diagnostic, fallback, and browser-tool contracts. Buffered SSE and fragmented tool calls, isolated credential attempts, zero-output-only fallback, model diagnostics, timeouts, invalid/empty responses, tool schema validation, and bounded stale-context recovery are covered by the 44-test suite. Lint, deterministic build, offline dependency audit, production-server smoke, manifest/version/permission/storage compatibility, and the paused artifact workflow pass. Credentialed live-provider and Chrome E2E remain Phase 04 gates; Phase 03 security boundaries remain open.

## Phase 03 — Security and Real Capability Completion

### Scope

- Classify actions as read-only, state-changing, sensitive, or destructive.
- Add exact-action confirmation for sensitive/destructive operations.
- Enforce trusted policy versus untrusted page/file content.
- Validate URLs, origins, selectors, action arguments, and navigation targets.
- Apply least privilege/optional permissions where viable.
- Harden key storage lifecycle, masking, clearing, duplication, and redaction.
- Add consent for page context, screenshots, files, and external transmission.
- Convert prompt-only/static controls to real capabilities or clearly disable/mark them experimental.
- Complete approved image, artifacts, data, structured-file, generator, and email features under separate sub-scope acceptance.

### UI impact

A confirmation modal/drawer and privacy/capability indicators may be required. They must reuse the current visual system and cannot move/remove existing controls without approval.

### Exit criteria

Sensitive actions require valid approval; injection tests cannot bypass policy; secrets stay out of logs/errors/exports; permission/privacy behavior matches disclosures; every enabled visible capability is verified.

### Completion evidence

Phase 03 closed the scoped root causes in F-013 through F-018. Risk/action, approval replay/denial/cancellation, trust-boundary, encrypted/session credential, least-privilege manifest, structured-file/XLSX, local capability, image-provider, and regression tests bring the cumulative suite to 66 passing tests. Lint, build structure, offline dependency audit, secret/permission scan, and production-server smoke pass. Full installed-Chrome, live-credential provider/image/OCR, accessibility, performance, upgrade, and packaging evidence remains exclusively in Phase 04.

## Phase 04 — Performance, Full QA, and Release

### Scope

- Lazy-load/code-split heavy PDF, OCR, syntax, and optional modules.
- Remove proven-unused debug/dead/empty assets without user-visible loss.
- Separate extension artifacts from server-only output.
- Complete unit, integration, security, accessibility, performance, install, upgrade, and Chrome E2E suites.
- Finalize version policy, license decision, privacy, README, architecture, feature status, changelog, and release notes.
- Re-enable build/ZIP only after Phase 04 gates pass.
- Build and validate one release candidate, then create the approved tag/release.

### Exit criteria

All baseline/approved features pass; no Critical/High finding remains; budgets and stability pass; artifact installs/operates; documents agree; workflow is restored with test gates; final artifact/tag/release are approved.

## Transition rule

A phase starts only after an exact written plan is approved. It completes only after implementation, audit, regression tests, documentation synchronization, GitHub push, and a completion entry. Failed criteria keep the phase open.
