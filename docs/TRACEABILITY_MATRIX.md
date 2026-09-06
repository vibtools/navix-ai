# Production Traceability Matrix

| Finding | Deliverable | Phase | Primary verification | Status |
| --- | --- | --- | --- | --- |
| F-001/F-002 | Session-aware history and clear/load protocol | 01 | Request-local history/static regression and protocol tests | Closed — Phase 01 |
| F-003 | Collision-free dynamic identity | 01 | Dynamic duplicate/new/repeated-scan tests | Closed — Phase 01 |
| F-004 | Provider-aware cancellation/port lifecycle | 01 | Lifecycle/delay tests plus signal wiring; live E2E retained in F-007 | Closed — Phase 01 root cause |
| F-005 | Awaited validated storage contract | 01 | Chrome success/failure, corrupt fallback, legacy prefix, listener tests | Closed — Phase 01 |
| F-006 | Lockfile/deterministic install | 01 | Exact pins, lockfile, `npm ci`, clean build | Closed — Phase 01 |
| F-007 | Real quality gates | 01/04 | ESLint + 71 tests + build budgets + package verification + audit + server smoke pass; full Chrome/provider/OCR/accessibility/upgrade E2E pending | Automated gates closed; runtime acceptance open |
| F-008 | Shared provider adapters | 02 | Shared extension/server registry and runner contract tests | Closed — Phase 02 |
| F-009 | Buffered streaming | 02 | Every-boundary fragmented, CRLF, done, and malformed SSE tests | Closed — Phase 02 |
| F-010 | Capability-aware tool execution | 02 | Gemini/OpenAI-compatible/Ollama tool normalization and validation tests | Closed — Phase 02 |
| F-011/F-012 | HF/Ollama normalization | 02 | Router/native endpoint, model, response, fallback, and failure tests | Closed — Phase 02 |
| F-013 | Effective setting/trust wiring | 02/03 | Single-application prompt tests plus bounded trusted/untrusted envelope tests | Closed — Phase 03 |
| F-014 | Exact-action confirmation | 03 | Classification, URL, masking, allow/deny/replay/mismatch/abort tests; target revalidation build check | Root cause closed — Phase 03; Chrome E2E Phase 04 |
| F-015 | Trusted-content boundary | 03 | Injection markers, explicit envelope, total limit, rendered-URL tests | Root cause closed — Phase 03; adversarial Chrome gate Phase 04 |
| F-016 | Secret lifecycle/redaction | 03 | Secretless config, crypto round-trip/wrong key, migration scrub/relock, error redaction tests | Root cause closed — Phase 03; upgrade/restart E2E Phase 04 |
| F-017 | Least privilege | 03 | Manifest/build assertions for removed `tabs`/`<all_urls>`, optional origins, programmatic content script | Root cause closed — Phase 03; installed permission matrix Phase 04 |
| F-018 | Real or truthfully disabled capabilities | 03 | CSV/XLSX/data/email/generator/artifact/image request and safe-failure tests | Root cause closed — Phase 03; live image/OCR E2E Phase 04 |
| F-019 | Optimized artifact | 04 | Side panel 312.54 kB; lazy chunks; build budgets; 45-file extension-only ZIP and checksum verification | Implementation closed; runtime performance/install acceptance open |
| F-020 | Versioned release | 04 | Candidate `v1.0.0.1.3`, deterministic checksum/release manifest, gated CI, and tag check | Release candidate; final tag/release approval open |
| F-021 | Accurate documentation | 01-04 | README, architecture, features, security, privacy, QA, status, changelog, and release-note synchronization | Controlled — release-candidate limitations documented |
| F-022 | Repository hygiene | 04 | Tracked-file/dead-code audit, empty-placeholder removal, and MIT license | Closed — Phase 04 implementation |
| F-023 | Website Intelligence and smart compression | v1.0.0.2.0 | Semantic/accessibility/action/form/bounds and 30k truncation tests | Closed — focused tests/build |
| F-024 | Repeated/missing site permission recovery | v1.0.0.2.0 | Current-origin/all-sites permission decision tests and Sidebar recovery wiring | Root cause closed; installed-Chrome gate external |
| F-025 | Multiple model enablement and unavailable-model recovery | v1.0.0.2.0 | Multiple-enabled/one-primary invariants plus model/capability fallback tests | Root cause closed; live-provider gate external |
| F-026 | Chat blink, duplicate bubble, and message action gaps | v1.0.0.2.0 | Request-bound row/status source audit, lint, build, prompt/response actions | Root cause closed; rendered-Chrome gate external |
| F-027 | Dynamic form/click target reliability | v1.0.0.2.0 | Shadow-root lookup, revalidation, native input/select/contenteditable handling, and contract regression | Root cause closed; complex-site E2E external |
| F-028 | Fake/demo context and stale built-in model entries | v1.0.0.2.0 | Source hygiene scan, provider model catalog update, package verification | Closed — no simulated page context |

## Required synchronization

| Event | Documents |
| --- | --- |
| Finding changes | Forensic report, traceability, phase log |
| Feature behavior changes | Actual status, features, architecture, README, changelog |
| Error behavior changes | Error matrix, tests, changelog |
| Security/permission changes | Security, privacy/README, changelog |
| Phase completion | Phase log, roadmap, actual status, traceability, changelog |
| Final release | Version docs, changelog, README, phase log, release notes, tag/release evidence |

A finding closes only when implementation, focused tests, regressions, documentation, and GitHub commit are recorded. Partial work is **In progress**, never **Closed**.
