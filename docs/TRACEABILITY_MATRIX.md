# Production Traceability Matrix

| Finding | Deliverable | Phase | Primary verification | Status |
| --- | --- | --- | --- | --- |
| F-001/F-002 | Session-aware history and clear/load protocol | 01 | Multi-session/tab regressions | Open |
| F-003 | Collision-free dynamic identity | 01 | Dynamic DOM mutation/action tests | Open |
| F-004 | Provider-aware cancellation/port lifecycle | 01 | Cancel before/mid stream/action | Open |
| F-005 | Awaited validated storage contract | 01 | Success/failure/quota/corruption/migration | Open |
| F-006 | Lockfile/deterministic install | 01 | Repeated clean install/build | Open |
| F-007 | Real quality gates | 01/04 | Lint/unit/build, then full E2E | Open |
| F-008 | Shared provider adapters | 02 | Extension/server contract tests | Open |
| F-009 | Buffered streaming | 02 | Fragmented/malformed SSE tests | Open |
| F-010 | Capability-aware tool execution | 02 | Per-provider capability/tool tests | Open |
| F-011/F-012 | HF/Ollama normalization | 02 | Auth/model/network/CORS tests | Open |
| F-013 | Effective setting wiring | 02/03 | Request snapshot/policy tests | Open |
| F-014 | Exact-action confirmation | 03 | Denial/approval/expiry tests | Open |
| F-015 | Trusted-content boundary | 03 | Adversarial injection suite | Open |
| F-016 | Secret lifecycle/redaction | 03 | Storage/log/error/export tests | Open |
| F-017 | Least privilege | 03 | Manifest/optional permission tests | Open |
| F-018 | Real or truthfully disabled capabilities | 03 | Capability functional/failure tests | Open |
| F-019 | Optimized artifact | 04 | Bundle/memory/startup/package budgets | Open |
| F-020 | Versioned release | 04 | Checklist/digest/tag/release evidence | Open |
| F-021 | Accurate documentation | 01-04 | Documentation review each phase | Open |
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
