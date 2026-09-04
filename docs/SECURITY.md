# Security

> Security hardening is not complete. Current verified risks, required error behavior, and Phase 03 controls are tracked in [Production Readiness Forensic Report](PRODUCTION_READINESS_FORENSIC_REPORT.md), [Error Handling Matrix](ERROR_HANDLING_MATRIX.md), and [Production Roadmap](PRODUCTION_ROADMAP.md).

## Principles

- Never expose API keys in source code
- Store sensitive data securely
- Request confirmation for risky browser actions

## Permissions

The extension should request only required Chrome permissions.

## User Control

Users should always know:

- What action AI will perform
- What data is shared
- Which AI provider is active

## Phase 01-02 controls

- Background conversation history is request-local, preventing the former cross-session global-state leak.
- Request and session correlation IDs are carried through the stream protocol.
- Cancellation stops dead-port writes and propagates to provider I/O, retry delays, and tool waits.
- Storage failures use safe stable messages; existing database/key identifiers remain compatible.
- Build checks assert that version, permissions, workflow lock, and content-script packaging remain unchanged.
- Provider attempts carry only the selected provider credential/configuration; public diagnostics omit API credentials.
- Safe fallback is limited to retryable failures before output or browser-tool execution, preventing mixed-provider output and repeated actions.
- Provider errors use stable safe messages instead of upstream response bodies; malformed streams and empty responses cannot report success.
- Tool names and argument schemas are validated before dispatch, stale-context refresh is bounded, and unverified navigation timeout is reported as failure.

These controls do not complete security hardening. Risky-action confirmation, prompt-injection isolation, stored-secret lifecycle/redaction, consent, and least-privilege permissions remain locked to Phase 03.
