# Actual Implementation Status

## Status definitions

- **Verified:** focused audit evidence exists.
- **Implemented, unverified:** production code exists but full E2E acceptance is absent.
- **Partial:** only part of the promised behavior exists.
- **Prompt-only/demo:** UI/prompt describes a capability without a complete engine.
- **Missing:** no complete implementation exists.

| Capability | Baseline status | Evidence/gap | Phase |
| --- | --- | --- | --- |
| Manifest V3 build | Verified | Deterministic build, manifest references, and self-contained content script pass | 01/04 gate |
| Side-panel React UI | Verified | Declared entry builds | Regression each phase |
| Settings persistence | Verified | Awaited serialized Chrome/IndexedDB/localStorage writes; focused success/failure/corruption/legacy tests pass | 01 complete |
| Saved provider configs | Verified | Public records are secretless; credentials migrate to session storage or an optional PBKDF2/AES-GCM vault; legacy keys are scrubbed after migration | 03 complete |
| Chat history/sessions | Verified | Background state is request-local and correlated by session/request IDs | 01 complete |
| New/Clear/Load/Delete chat | Verified | Clear operations update durable UI state; background compatibility handler exists | 01 complete |
| Stop Generation | Implemented, contract-verified | Port/fetch/stream/retry/tool waits and image requests abort; live provider/Chrome E2E remains Phase 04 | 01/03/04 |
| DOM context | Verified | Dynamic interactive identifiers are stable, positive, and collision-free in focused tests | 01 complete |
| Navigation/web search | Implemented, contract-verified | HTTP(S) validation, selected Google/Bing/DuckDuckGo engine, cross-origin approval/permission, and false-success timeout are enforced | 03/04 live gate |
| Click/type/Enter | Implemented, contract-verified | Risk policy, exact single-use approval, ambiguity refusal, target fingerprint, and post-approval revalidation are present | 03/04 live gate |
| Gemini streaming/tools | Verified by contract tests | Shared streaming/tool/context runner; credentialed Chrome E2E remains Phase 04 | 02/04 |
| OpenAI streaming | Verified by contract tests | Stateful SSE buffering and fragmented streamed tool-call assembly pass | 02 complete |
| Hugging Face chat | Verified by contract tests | Current Inference Providers router, streaming, tools, model diagnostics, and normalized errors | 02/04 live gate |
| Ollama chat | Verified by contract tests | OpenAI-compatible path plus HTTP-aware native `/api/chat` fallback and installed-model diagnostics | 02/04 live gate |
| Non-Gemini browser tools | Implemented, contract-verified | OpenAI-compatible and Ollama tool calls normalized; model-specific support is reported, not simulated | 02/04 live gate |
| Auto fallback | Verified | One-provider credential envelope; retryable zero-output only; blocked after output/action/auth/model/cancellation | 02 complete |
| System prompt | Verified | Saved value is carried once through the shared prompt contract | 02 complete |
| Custom instruction/language | Verified | Applied once as trusted configuration; page/file/OCR content is serialized separately as untrusted data | 03 complete |
| Screenshot context | Verified wiring | Gemini/OpenAI-compatible/HF/Ollama adapter formats covered; model capability failures are explicit | 02/04 live gate |
| Text attachment | Verified by focused tests | Allowlist, 8-file/8 MB/120k-character limits, explicit transmission consent, and untrusted envelope | 03/04 live gate |
| PDF extraction | Implemented, build-verified | Local packaged PDF worker and 100-page/text limits; rendered Chrome/resource E2E remains | 03/04 |
| Image OCR | Implemented, build-verified | Worker/core code packaged locally, English data host explicit, 45-second timeout and worker cleanup; Chrome/network recognition E2E remains | 03/04 |
| Copy response | Verified in source/build | Clipboard API and fallback exist | Regression each phase |
| Search engine choice | Verified wiring | Google, Bing, and DuckDuckGo map to validated search URLs | 03 complete |
| Data analysis | Verified by focused tests | Local row/column/type/missing/unique/min/max/mean engine plus drawer output | 03 complete |
| Artifacts | Verified by focused tests | Fenced artifact discovery, preview drawer, safe text download | 03 complete |
| Image generation | Contract-verified | Real Gemini image interactions and OpenAI `gpt-image-2` requests, rendering/download, safe errors, timeout/cancel; live credentials remain Phase 04 | 03/04 |
| Name generator | Verified by focused tests | Local synthetic identity engine; data is explicitly marked synthetic | 03 complete |
| Address generator | Verified by focused tests | Local synthetic address engine; data is explicitly marked synthetic | 03 complete |
| CSV/Excel/TXT tool | Verified by focused tests | Quoted CSV, JSON/TXT/XLSX read, real CSV/XLSX export, and XLSX round-trip | 03 complete |
| Email grouper | Verified by focused tests | Local sender/domain/count/subject/latest grouping | 03 complete |
| Risky-action confirmation | Verified by focused tests | Exact details, one-time allow/deny, request/session binding, TTL, replay rejection, and cancellation | 03/04 live gate |
| Prompt-injection protection | Verified by focused tests | Trusted policy is separated from bounded, marked untrusted page/file content; external content cannot approve actions | 03/04 adversarial Chrome gate |
| Unit/integration/E2E tests | Partial | 66 focused Node regression/contract tests pass; credentialed provider, OCR, and installed-Chrome E2E remain | 01-04 |
| Real lint/type check | Verified | ESLint 10 gate passes source, scripts, server, and build configs | 01 complete |
| Optimized extension artifact | Partial | Builds; composition/bundle need work | 04 |
| Formal release | Missing | No tag/release | 04 |

After every phase, affected rows must record new evidence, tests, limitations, and commit references. UI presence, compilation, or one successful API response is insufficient for **Verified**.

Current completion count: **3 of 4 phases**. Phase 04 is the next approval-gated continuation point; production/release status remains **not ready**.
