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
