# Error Handling Matrix

## Purpose

This matrix separates existing handlers from required production behavior. “Present” means code exists, not that browser/provider E2E acceptance is complete.

## Current handlers

| Area | Current handling | Gap |
| --- | --- | --- |
| Missing credentials | Shared provider contract returns `PROVIDER_AUTH_FAILED` or `PROVIDER_UNAVAILABLE` for required local URL | User-facing recovery UI remains Phase 03 |
| Provider rate/server errors | Shared bounded retry honors numeric/date `Retry-After` up to one minute and cannot repeat after output/action | Live-provider E2E remains Phase 04 |
| Provider HTTP failures | Auth/rate/model/capability/unavailable responses use centralized safe codes/messages | Stored-secret lifecycle remains Phase 03 |
| Background failures | Stable safe core/provider payload and one terminal lifecycle per live request | Live-provider/Chrome E2E remains Phase 04 |
| Protected/missing tab | Context error is logged and chat continues | Action eligibility is not centralized |
| Missing selector | Content script returns `Element not found` | No stale/duplicate/ambiguous recovery |
| Click/type errors | Exceptions are caught; typed value is checked | Navigation/state outcome checking is limited |
| PDF/OCR failures | Per-file extraction errors are surfaced | Size/time/memory policies are incomplete |
| Connection tests | Shared provider/model diagnostics cover Gemini, OpenAI, Hugging Face, and installed Ollama models | Rich recovery guidance remains Phase 03 |
| Provider action loop | Shared tool schema/argument validation and 15-step bound across tool-capable adapters | No action-risk/confirmation policy |
| Storage failures | Awaited serialized writes return stable read/write errors; configuration save refuses false success | User-facing recovery UI and secret policy remain Phase 03 |
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
| `DOM_TARGET_STALE` | Refresh context once per request and return a structured stale result | 02 implemented; ambiguity policy Phase 03 |
| `DOM_TARGET_AMBIGUOUS` | Refuse ambiguity and request clarification/confirmation | 01/03 |
| `PROVIDER_UNAVAILABLE` | Normalize network/local-provider/timeout failures with safe retry classification | 02 implemented |
| `PROVIDER_AUTH_FAILED` | Report invalid/missing credentials without upstream bodies | 02 implemented; secret storage Phase 03 |
| `PROVIDER_RATE_LIMITED` | Honor bounded retry metadata; prevent duplicate output/action | 02 implemented |
| `PROVIDER_MODEL_UNSUPPORTED` | Reject missing/unavailable selected models without blind fallback | 02 implemented |
| `PROVIDER_CAPABILITY_UNSUPPORTED` | Reject unsupported screenshot/tool behavior instead of simulating success | 02 implemented |
| `PROVIDER_RESPONSE_INVALID` | Reject malformed JSON and empty/invalid chat responses | 02 implemented |
| `STREAM_PROTOCOL_ERROR` | Buffer fragmented events and surface malformed records | 02 implemented |
| `TOOL_CALL_INVALID` | Validate tool name/schema/arguments before execution | 02 implemented; sensitive policy Phase 03 |
| `TOOL_RESULT_UNVERIFIED` | Navigation timeout returns failure rather than likely success | 02 implemented |
| `ACTION_CONFIRMATION_REQUIRED` | Block sensitive/destructive actions pending exact approval | 03 |
| `ACTION_CONFIRMATION_EXPIRED` | Reject stale or modified approvals | 03 |
| `UNSAFE_URL` | Reject dangerous/unsupported protocols and policy-blocked origins | 03 |
| `PROMPT_INJECTION_BLOCKED` | Preserve trusted policy and record a redacted event | 03 |
| `PERMISSION_REQUIRED` | Request only the minimum optional permission with context | 03 |
| `FILE_TYPE_UNSUPPORTED` | Reject before parsing without damaging chat state | 03 |
| `FILE_TOO_LARGE` | Enforce documented limits before heavy parsing/OCR | 03/04 |
| `CAPABILITY_NOT_IMPLEMENTED` | Disable/label truthfully; never simulate success | 03 |
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
