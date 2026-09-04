# Error Handling Matrix

## Purpose

This matrix separates existing handlers from required production behavior. “Present” means code exists, not that browser/provider E2E acceptance is complete.

## Current handlers

| Area | Current handling | Gap |
| --- | --- | --- |
| Missing credentials | Provider paths return missing key/token/URL errors | Messages/codes are inconsistent |
| Gemini rate/server errors | Retries 429/500/503 with backoff and partial `Retry-After` support | No unified budget/telemetry |
| Provider HTTP failures | Some HTTP bodies become messages | Shapes/redaction are not centralized |
| Background failures | Port listener posts error/done | Lifecycle can complete inconsistently |
| Protected/missing tab | Context error is logged and chat continues | Action eligibility is not centralized |
| Missing selector | Content script returns `Element not found` | No stale/duplicate/ambiguous recovery |
| Click/type errors | Exceptions are caught; typed value is checked | Navigation/state outcome checking is limited |
| PDF/OCR failures | Per-file extraction errors are surfaced | Size/time/memory policies are incomplete |
| Connection tests | Settings shows success/failure | Provider diagnostics remain shallow |
| Gemini action loop | Stops after 15 iterations | No action-risk/cost budget |

## Required production handlers

| Error family | Required behavior | Phase |
| --- | --- | --- |
| `STATE_SESSION_MISMATCH` | Reject/reconcile mismatched sessions without history leakage | 01 |
| `STORAGE_UNAVAILABLE` | Keep UI usable and avoid false save success | 01 |
| `STORAGE_QUOTA_EXCEEDED` | Preserve last valid state and avoid partial writes | 01 |
| `STORAGE_DATA_INVALID` | Validate/migrate and quarantine bad records without deleting compatible data | 01 |
| `REQUEST_CANCELLED` | Abort stream/network/tool work and finalize state once | 01 |
| `PORT_DISCONNECTED` | Stop dead-port posts and preserve recoverable state | 01 |
| `DOM_TARGET_STALE` | Refresh and re-resolve within a bounded retry | 01/02 |
| `DOM_TARGET_AMBIGUOUS` | Refuse ambiguity and request clarification/confirmation | 01/03 |
| `PROVIDER_UNAVAILABLE` | Normalize network/CORS/private-network failures with guidance | 02 |
| `PROVIDER_AUTH_FAILED` | Report invalid credentials without exposing them | 02/03 |
| `PROVIDER_RATE_LIMITED` | Honor retry metadata; bound retries; prevent duplicate fallback output | 02 |
| `PROVIDER_MODEL_UNSUPPORTED` | Report model/capability mismatch and valid configured alternatives | 02 |
| `STREAM_PROTOCOL_ERROR` | Buffer fragmented events and avoid silent output loss | 02 |
| `TOOL_CALL_INVALID` | Validate tool name/schema/arguments before execution | 02/03 |
| `TOOL_RESULT_UNVERIFIED` | Stop/retry safely when outcome cannot be confirmed | 02 |
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
