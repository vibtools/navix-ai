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
| Saved provider configs | Verified | Active configuration is the runtime source; legacy provider keys remain mirrored/readable for compatibility; isolated-attempt tests pass | 02 complete |
| Chat history/sessions | Verified | Background state is request-local and correlated by session/request IDs | 01 complete |
| New/Clear/Load/Delete chat | Verified | Clear operations update durable UI state; background compatibility handler exists | 01 complete |
| Stop Generation | Implemented, unverified | Port/fetch/stream/retry/tool waits now abort; live provider/Chrome E2E remains Phase 04 | 01/04 |
| DOM context | Verified | Dynamic interactive identifiers are stable, positive, and collision-free in focused tests | 01 complete |
| Navigation/Google search | Implemented, unverified | Shared tool-capable provider loop; timeout no longer claims success; sensitive-action policy remains | 02/03 |
| Click/type/Enter | Implemented, unverified | Ambiguity/confirmation protections absent | 01-03 |
| Gemini streaming/tools | Verified by contract tests | Shared streaming/tool/context runner; credentialed Chrome E2E remains Phase 04 | 02/04 |
| OpenAI streaming | Verified by contract tests | Stateful SSE buffering and fragmented streamed tool-call assembly pass | 02 complete |
| Hugging Face chat | Verified by contract tests | Current Inference Providers router, streaming, tools, model diagnostics, and normalized errors | 02/04 live gate |
| Ollama chat | Verified by contract tests | OpenAI-compatible path plus HTTP-aware native `/api/chat` fallback and installed-model diagnostics | 02/04 live gate |
| Non-Gemini browser tools | Implemented, contract-verified | OpenAI-compatible and Ollama tool calls normalized; model-specific support is reported, not simulated | 02/04 live gate |
| Auto fallback | Verified | One-provider credential envelope; retryable zero-output only; blocked after output/action/auth/model/cancellation | 02 complete |
| System prompt | Verified | Saved value is carried once through the shared prompt contract | 02 complete |
| Custom instruction/language | Verified wiring | Applied once when enabled; enforceable trusted-content boundary remains Phase 03 | 02/03 |
| Screenshot context | Verified wiring | Gemini/OpenAI-compatible/HF/Ollama adapter formats covered; model capability failures are explicit | 02/04 live gate |
| Text attachment | Implemented, unverified | Limits/privacy/error contract incomplete | 03 |
| PDF extraction | Implemented, unverified | E2E/resource tests missing | 03/04 |
| Image OCR | Implemented, unverified | Resource/failure tests missing | 03/04 |
| Copy response | Verified in source/build | Clipboard API and fallback exist | Regression each phase |
| Search engine choice | Partial | Browser action is Google-specific | 02/03 |
| Data analysis | Prompt-only/demo | No computation engine | 03 |
| Artifacts | Prompt-only/demo | No lifecycle/preview/export engine | 03 |
| Image generation | Prompt-only/demo | No provider execution | 03 |
| Name generator | Prompt-only/demo | Static sample data | 03 |
| Address generator | Prompt-only/demo | Static sample data | 03 |
| CSV/Excel/TXT tool | Prompt-only/demo | No complete read/write/export engine | 03 |
| Email grouper | Prompt-only/demo | Prompt flag only | 03 |
| Risky-action confirmation | Missing | Security principle not implemented | 03 |
| Prompt-injection protection | Missing | No enforceable trust layer | 03 |
| Unit/integration/E2E tests | Partial | 44 focused Node regression/contract tests pass; credentialed provider and Chrome E2E remain | 01-04 |
| Real lint/type check | Verified | ESLint 10 gate passes source, scripts, server, and build configs | 01 complete |
| Optimized extension artifact | Partial | Builds; composition/bundle need work | 04 |
| Formal release | Missing | No tag/release | 04 |

After every phase, affected rows must record new evidence, tests, limitations, and commit references. UI presence, compilation, or one successful API response is insufficient for **Verified**.

Current completion count: **2 of 4 phases**. Phase 03 is the next approval-gated continuation point.
