# Error Handling Matrix

## Purpose

This matrix separates existing handlers from required production behavior. “Present” means code exists, not that browser/provider E2E acceptance is complete.

## Current handlers

| Area | Current handling | Gap |
| --- | --- | --- |
| Missing credentials | Shared provider contract returns safe auth/unavailable errors; locked encrypted vault opens recovery UI | Live-provider E2E remains Phase 04 |
| Provider rate/server errors | Shared bounded retry honors numeric/date `Retry-After` up to one minute and cannot repeat after output/action | Live-provider E2E remains Phase 04 |
| Provider HTTP failures | Auth/rate/model/capability/unavailable responses use centralized safe codes/messages; upstream bodies are omitted | Live-provider E2E remains Phase 04 |
| Background failures | Stable safe core/provider payload and one terminal lifecycle per live request | Live-provider/Chrome E2E remains Phase 04 |
| Protected/missing tab | Context failure is safe; `activeTab` injection or contextual optional-origin grant is used | Chrome protected-page matrix remains Phase 04 |
| Missing/ambiguous selector | Missing targets refresh once; ambiguous targets fail closed; approved targets are fingerprint-rechecked | Rendered dynamic-site E2E remains Phase 04 |
| Click/type errors | Exceptions are caught; typed value and target fingerprint are checked | Complex site outcome checking remains Phase 04 |
| PDF/OCR failures | Per-file errors, file/page/text limits, 45-second OCR timeout, and worker cleanup are enforced | Memory/performance/runtime matrix remains Phase 04 |
| Connection tests | Shared provider/model diagnostics cover Gemini, OpenAI, Hugging Face, and installed Ollama models | Rich recovery guidance remains Phase 03 |
| Provider action loop | Shared schema validation, 15-step bound, centralized risk policy, and exact action approval | Installed-Chrome action E2E remains Phase 04 |
| Storage failures | Awaited writes reject false success; secretless public configs use session or encrypted vault recovery | Storage quota/upgrade Chrome E2E remains Phase 04 |
| Request cancellation | Port/web abort propagates through streams, fetches, retry waits, and tool waits | Live provider/Chrome E2E remains Phase 04 |
| Clear/history protocol | Background is stateless and acknowledges `CLEAR_HISTORY`; provider history is request-local | Cross-device sync is not implemented |

## Required production handlers

| Error family | Required behavior | Phase |
| --- | --- | --- |
| `STATE_SESSION_MISMATCH` | Request/session correlation and request-local history prevent cross-session ownership across provider attempts | 01-02 implemented |
| `STORAGE_UNAVAILABLE` | Keep UI usable and reject false configuration-save success | 01 implemented |
| `STORAGE_QUOTA_EXCEEDED` | Return stable storage failure without claiming success | 01 implemented |
| `STORAGE_DATA_INVALID` | Return safe empty read and retain compatible database/prefix | 01 implemented |
| `REQUEST_CANCELLED` | Abort stream/network/tool/retry work without duplicate terminal messages | 01 implemented |
| `PORT_DISCONNECTED` | Stop dead-port posts and abort active work | 01 implemented |
| `DOM_TARGET_STALE` | Refresh context once per request and return a structured stale result | 02-03 implemented |
| `DOM_TARGET_AMBIGUOUS` | Refuse ambiguity and request a unique target | 03 implemented |
| `PROVIDER_UNAVAILABLE` | Normalize network/local-provider/timeout failures with safe retry classification | 02 implemented |
| `PROVIDER_AUTH_FAILED` | Report invalid/missing credentials without upstream bodies | 02-03 implemented |
| `PROVIDER_RATE_LIMITED` | Honor bounded retry metadata; prevent duplicate output/action | 02 implemented |
| `PROVIDER_MODEL_UNSUPPORTED` | Reject missing/unavailable selected models without blind fallback | 02 implemented |
| `PROVIDER_CAPABILITY_UNSUPPORTED` | Reject unsupported screenshot/tool behavior instead of simulating success | 02 implemented |
| `PROVIDER_RESPONSE_INVALID` | Reject malformed JSON and empty/invalid chat responses | 02 implemented |
| `STREAM_PROTOCOL_ERROR` | Buffer fragmented events and surface malformed records | 02 implemented |
| `TOOL_CALL_INVALID` | Validate tool name/schema/arguments before execution | 02-03 implemented |
| `TOOL_RESULT_UNVERIFIED` | Navigation timeout returns failure rather than likely success | 02 implemented |
| `ACTION_CONFIRMATION_REQUIRED` | Block sensitive/destructive actions pending exact approval | 03 implemented |
| `ACTION_CONFIRMATION_EXPIRED` | Reject stale, replayed, or request/session-mismatched approvals | 03 implemented |
| `ACTION_DENIED` | Stop the proposed action without fallback or simulated success | 03 implemented |
| `UNSAFE_URL` | Reject dangerous/unsupported protocols, credentials, and invalid navigation targets | 03 implemented |
| `UNTRUSTED_CONTENT_BLOCKED` | Preserve trusted policy and bounded external-data treatment | 03 implemented |
| `PERMISSION_REQUIRED` | Request only the active destination origin with user context | 03 implemented |
| `FILE_TYPE_UNSUPPORTED` | Reject before parsing without damaging chat state | 03 implemented |
| `FILE_TOO_LARGE` | Enforce file/count/page/text limits before heavy parsing/OCR | 03 implemented; performance gate 04 |
| `CAPABILITY_UNAVAILABLE` | Report disabled/unsupported behavior; never simulate success | 03 implemented |
| `BUILD_VALIDATION_FAILED` | Block artifact publication and retain diagnostics | 04 |
| `RELEASE_GATE_FAILED` | Prevent workflow restoration/tag/release | 04 |

## Error contract

Every production error must include a stable code, safe user message, redacted diagnostic detail, recoverability flag, retry policy, source component, session/request correlation ID, and focused tests. Secrets, page/file content, and authorization headers must not enter logs.

## UX rules

- Preserve completed streamed output when recovery is safe.
- Never show success before durable storage or verified action completion.
- Avoid duplicate errors during retry/fallback.
- Keep settings/chat usable after provider failure.
- Require approval again when action target, arguments, or page context changes.
- Reuse the existing Navix AI visual language for error/recovery/confirmation.
