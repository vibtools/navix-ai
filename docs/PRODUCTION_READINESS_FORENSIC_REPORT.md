# Production Readiness Forensic Report

## Executive verdict

Navix AI is a buildable Manifest V3 browser assistant with shared Gemini/OpenAI/Hugging Face/Ollama execution, guarded browser tools, local persistence, and document/image/data capabilities. Phases 01-03 closed the scoped core-state, deterministic-build, provider, streaming, action-policy, trusted-content, secret-lifecycle, least-privilege, and prompt-only capability root causes. It is still not production-ready because installed-Chrome/live-provider/OCR E2E, accessibility/performance/upgrade/package evidence, repository hygiene, and release controls remain Phase 04 work.

This report uses the official frozen baseline. Findings do not authorize implementation outside an approved phase.

## Evidence reviewed

- Validated uploaded `navix-ai.zip`.
- GitHub `main` at `f8f0817c93fa2cfa4ccca85c2cad051a2ca43e6f`.
- Commits, branch, issue, Actions runs/artifact, tags, releases, and pull requests.
- Source, manifest, configuration, documentation, diagnostic scripts, build output, and server smoke test.
- Accessible decisions covering Navix AI naming, `navix.vib.tools`, rebranding, compatibility, and production-hardening constraints.

## Verified strengths

- ZIP and remote source are identical at the freeze.
- Clean install/build and HTTP 200 server smoke test passed.
- The audit-time dependency resolution reported zero known npm vulnerabilities.
- Manifest entries/assets exist; common provider/private-key secret patterns were not found.
- Gemini streaming and a bounded browser-action loop are implemented.
- Page context, navigation/search, click/type/Enter, screenshots, attachments, PDF extraction, OCR, and copy/history controls have implementation code.
- Phase 01 now has exact dependency pins/lockfile, ESLint, 19 focused tests, self-contained content-script validation, and request-local session state.
- Phase 02 provides one extension/server provider runner, buffered SSE, normalized provider errors/diagnostics, isolated fallback attempts, structured prompt/context inputs, and shared capability-aware browser tools.
- Phase 03 adds exact action approval, target revalidation, explicit untrusted-content envelopes, session/encrypted credential storage, optional per-origin page permissions, external-data consent, and real structured-data/artifact/generator/email/image engines; the cumulative suite now contains 66 focused tests.

## Findings register

| ID | Severity | Finding | Evidence/impact | Phase |
| --- | --- | --- | --- | --- |
| F-001 | High | UI/background history divergence | Closed in Phase 01: provider history is reconstructed per request/session; no global history owner | 01 |
| F-002 | High | Clear/New Chat propagation missing | Closed in Phase 01: durable clear/new/load/delete state plus stateless background acknowledgement | 01 |
| F-003 | High | Dynamic DOM ID collisions | Closed in Phase 01: unique stable positive IDs with duplicate/dynamic regression tests | 01 |
| F-004 | Medium | Cancellation is incomplete | Phase 01 root cause closed: abort reaches I/O, streams, retries, ports, web fallback, and tool waits; live E2E remains F-007 | 01/04 |
| F-005 | Medium | Storage completion is ambiguous | Closed in Phase 01: serialized awaited writes and stable failures with legacy compatibility | 01 |
| F-006 | High | Build is non-deterministic | Closed in Phase 01: exact direct pins, lockfile, and future workflow `npm ci` | 01 |
| F-007 | High | Quality gates are absent | Phase 01-03 gates closed: lint, 66 tests, build-structure validation; full provider/Chrome/OCR E2E remains Phase 04 | 01/04 |
| F-008 | High | Provider logic is duplicated | Closed in Phase 02: extension/server use one registry, runner, adapters, prompt, error, retry, and fallback contract | 02 |
| F-009 | High | OpenAI SSE parser is fragile | Closed in Phase 02: stateful every-boundary buffering; malformed events fail explicitly | 02 |
| F-010 | High | Browser tools are Gemini-only | Closed in Phase 02: Gemini/OpenAI-compatible/Ollama tool calls share validation/execution; model limitations are explicit | 02 |
| F-011 | Medium | Hugging Face contract is narrow | Closed in Phase 02: current router, streaming/OpenAI-compatible shapes, tools, diagnostics, and safe errors | 02 |
| F-012 | Medium | Ollama diagnostics are incomplete | Closed in Phase 02: installed-model probe, OpenAI-compatible/native paths, HTTP-aware fallback, and normalized failures | 02 |
| F-013 | Medium | Settings are not fully wired | Closed in Phase 03: trusted settings/capabilities are separated from bounded untrusted page/file data | 02/03 |
| F-014 | Critical | No risky-action confirmation | Root cause closed in Phase 03: classified actions, exact expiring one-time approval, denial/replay binding, ambiguous/stale target refusal; Chrome E2E remains F-007 | 03/04 |
| F-015 | Critical | Weak prompt-injection boundary | Root cause closed in Phase 03: external content is marked/bounded data and cannot authorize tools; adversarial Chrome E2E remains F-007 | 03/04 |
| F-016 | High | Secrets stored as plaintext values | Root cause closed in Phase 03: secretless configs plus session/encrypted vault migration, relock and legacy scrub; upgrade/restart E2E remains F-007 | 03/04 |
| F-017 | Medium | Permissions are broad | Root cause closed in Phase 03: required `tabs`/`<all_urls>`/static injection removed; active-tab or contextual optional origin used | 03/04 |
| F-018 | High | Visible features are prompt-only/static | Root cause closed in Phase 03: image/artifact/data/generator/CSV/XLSX/email engines and focused tests added; live image/OCR E2E remains F-007 | 03/04 |
| F-019 | Medium | Performance/package debt | >1 MB side-panel bundle; heavy eager modules; mixed server/extension output | 04 |
| F-020 | Medium | Release governance missing | No tag/release/store validation or signed acceptance evidence | 04 |
| F-021 | Medium | Documentation overstates behavior | Claims exceed verified provider/action capability | 01-04 |
| F-022 | Low | Repository hygiene gaps | Debug/log files, empty icons, unused modules, and no license decision | 04 |

## Production acceptance

1. All Critical/High findings are closed with focused and regression evidence.
2. Medium findings are closed or explicitly accepted with rationale.
3. Existing baseline features pass automated and manual browser tests.
4. Provider capability and failure behavior match UI/documentation.
5. Sensitive actions require exact informed confirmation; page content cannot override policy.
6. Installation/build is deterministic.
7. Final artifact passes manifest, permission, privacy, package, upgrade, and Chrome-runtime checks.
8. Phase log, actual status, error matrix, traceability, README, security, changelog, and release notes are synchronized.

## Non-goals

- No visual redesign without explicit approval.
- No removal of providers, settings, history, attachments, OCR, or actions.
- No compatibility identifier rename without tested migration.
- No unrelated scope while production blockers remain.
- No release artifact before Phase 04 acceptance.
