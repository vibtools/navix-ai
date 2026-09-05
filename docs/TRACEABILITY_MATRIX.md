# Production Traceability Matrix

| Finding | Deliverable | Phase | Primary verification | Status |
| --- | --- | --- | --- | --- |
| F-001/F-002 | Session-aware history and clear/load protocol | 01 | Request-local history/static regression and protocol tests | Closed — Phase 01 |
| F-003 | Collision-free dynamic identity | 01 | Dynamic duplicate/new/repeated-scan tests | Closed — Phase 01 |
| F-004 | Provider-aware cancellation/port lifecycle | 01 | Lifecycle/delay tests plus signal wiring; live E2E retained in F-007 | Closed — Phase 01 root cause |
| F-005 | Awaited validated storage contract | 01 | Chrome success/failure, corrupt fallback, legacy prefix, listener tests | Closed — Phase 01 |
| F-006 | Lockfile/deterministic install | 01 | Exact pins, lockfile, `npm ci`, clean build | Closed — Phase 01 |
| F-007 | Real quality gates | 01/04 | ESLint + 66 tests + build verification pass; full Chrome/provider/OCR E2E pending | Phase 01-03 gates closed; Phase 04 open |
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
| F-019 | Optimized artifact | 04 | Bundle/memory/startup/package budgets | Open |
| F-020 | Versioned release | 04 | Checklist/digest/tag/release evidence | Open |
| F-021 | Accurate documentation | 01-04 | Documentation review each phase | Phase 01-03 synchronized; ongoing |
| F-022 | Repository hygiene | 04 | Tracked-file/license/dead-code audit | Open |

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
