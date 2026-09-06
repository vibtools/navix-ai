# Navix AI v1.0.0.2.0

Navix AI v1.0.0.2.0 is the scoped Website Intelligence and browser-automation stabilization release built on the completed Phase 01–04 baseline.

## Included

- Website Intelligence JSON combining semantic page structure, actionable targets, forms, accessibility nodes, visible text, and element bounds within a 30,000-character provider envelope.
- Optional visible-tab screenshot fusion with the structured page context.
- User-facing **Allow This Site** and **Allow All Sites** decisions, with persisted all-site consent preventing repeated prompts on normal HTTP(S) pages.
- Multiple simultaneously enabled model configurations, one primary configuration, enabled-only fallback, and bounded fallback when a selected model or capability is unavailable before any output or action.
- Stable request-bound assistant messages with compact live activity updates, plus prompt copy/retry/edit and response copy/retry.
- More reliable click and form automation across open shadow roots, select controls, contenteditable fields, and dynamically changing targets.
- Current built-in Gemini 3.x and stable Gemini 2.5 model identifiers, with provider model synchronization retained.

## Compatibility and safety

Existing storage identifiers, sessions, history, providers, settings, capability controls, approval policy, trust boundaries, and least-privilege manifest design are retained. The Chrome-compatible version is `1.0.0.3`; the product version name and Git tag are `v1.0.0.2.0`.

## Artifact

- File: `navix-ai-v1.0.0.2.0.zip`
- Files: 45
- Size: 9,518,960 bytes
- SHA-256: `40209512eb22e8ceac89994d1b477f7a3f38357a3588d4c1a835f88b13cfb528`

The ZIP uses stored entries with fixed metadata, and Tailwind scans only runtime source, so documentation/workspace text and zlib versions cannot change the artifact.

## Verification boundary

The deterministic repository gates pass: lint, 80 focused tests, production build, high-severity production dependency audit, extension packaging/verification, and server smoke. This environment did not contain an installed Chrome/Chromium runtime or live provider credentials, so installed-extension UI, credentialed provider/image/OCR, accessibility, upgrade, and store-submission checks are not represented as passed.

## Install

1. Download and extract `navix-ai-v1.0.0.2.0.zip`.
2. Open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
3. Select the extracted folder.
4. Configure a provider, open Navix AI, and explicitly grant page access when requested.
