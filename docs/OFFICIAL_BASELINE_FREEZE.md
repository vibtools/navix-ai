# Official Baseline Freeze

## Freeze declaration

Navix AI production hardening is anchored to this verified product baseline. It is immutable regression evidence, not a claim that the product is production-ready.

| Field | Frozen value |
| --- | --- |
| Repository | `vibtools/navix-ai` |
| Branch | `main` |
| Source commit | `f8f0817c93fa2cfa4ccca85c2cad051a2ca43e6f` |
| Source tree | `5edf3d8f24cd03d0c003a73734ad06ce790c436c` |
| Product version | `v1.0.0.1.2` |
| Chrome manifest version | `1.0.0.1` |
| ZIP SHA-256 | `f98982b53f06623f063ec57d364d7e94973e28a143b356693c94cd461f8861da` |
| ZIP/GitHub comparison | 37/37 blobs identical; no missing, extra, or changed source files |
| Latest baseline CI | Build Chrome Extension run 30: successful |
| Audit date | 2026-09-04 UTC |

## Verified baseline state

- Fresh dependency installation and the production build passed during the audit.
- The production server returned HTTP 200.
- Every manifest-declared entry/icon exists in the built package.
- GitHub has no tag, release, or pull request for this version.
- `main` is the only branch and is not protected; the Phase-6 issue remains open.
- Build success proves compilation/package structure, not browser-runtime or provider E2E acceptance.

## Frozen compatibility contracts

These must remain compatible unless an approved phase plan explicitly changes them:

1. Existing side-panel layout, visual identity, branding, and user flows.
2. Existing saved settings, provider configurations, chat history, and sessions.
3. Legacy `AICopilotDB` and `copilot_` identifiers, retained for user-data compatibility.
4. Gemini chat and existing Gemini browser actions.
5. Existing OpenAI, Hugging Face, and Ollama configuration fields and choices.
6. Page context, screenshots, file upload, PDF extraction, OCR, copy, history, and model controls.
7. Current extension identity, homepage, manifest identity, and Navix AI assets.

## Permitted pre-phase changes

- Add/correct planning, audit, governance, status, and traceability documentation.
- Cross-link the new documentation from existing Markdown.
- Strictly pause extension build/ZIP generation until Phase 04 release validation.

No runtime source, UI, provider, data schema, feature behavior, or product version may change during this pre-phase step.

## Regression and authority rules

Every phase must compare affected behavior with this baseline. A phase cannot complete while an existing feature is removed, silently changed, or unverified. Compatibility migrations must be tested before acceptance.

When documents conflict, authority is: verified source/test evidence; this freeze plus approved phase scope; `ACTUAL_IMPLEMENTATION_STATUS.md`; forensic/traceability records; then roadmap and descriptive documents. Unverified claims never override verified behavior.
