# Security

> Phase 03 security root causes are implemented and focused-test verified. Production security acceptance is not complete until Phase 04 installed-Chrome, live-provider, upgrade, privacy, and release gates pass.

## Principles

- Never expose API keys in source code
- Store sensitive data securely
- Request confirmation for risky browser actions

## Phase 03 controls

- Browser actions are classified as read-only, state-changing, sensitive, or destructive.
- Type/Enter/search and risky submit/navigation/click actions require exact, request/session-bound, single-use approval with a 30-second expiry.
- Target details are inspected before approval and fingerprint-revalidated immediately before execution; ambiguous, hidden, disabled, changed, or missing targets fail closed.
- Page, attachment, email, and OCR text is bounded and serialized as explicitly untrusted data. It cannot grant permission, bypass confirmation, or override the external action policy.
- Navigation accepts only absolute HTTP(S) URLs without embedded credentials; rendered Markdown blocks executable/local protocols and remote response images.
- Required `tabs`, `<all_urls>`, and static page-wide injection are removed. `activeTab` and contextual per-origin optional grants govern page access.
- Provider records persisted through `AppStorage` contain no API key. Secrets migrate to `chrome.storage.session`, or to an optional PBKDF2-SHA-256/AES-GCM encrypted local vault that must be unlocked into session memory.
- Relock/restart clears runtime credentials; legacy individual key fields are scrubbed after migration. Provider/error diagnostics never include upstream bodies or authorization values.
- First use of page/file/screenshot/image-provider transmission requires remembered consent, which can be revoked in Settings.
- Uploads enforce an allowlist, eight files per request, 8 MB per file, 100 PDF pages, 120,000 extracted characters, and bounded OCR execution.
- OCR worker/core executable code is packaged locally; only English language data is fetched from the explicit `cdn.jsdelivr.net` host.

## User Control

Users should always know:

- What action AI will perform
- What data is shared
- Which AI provider is active

## Earlier controls retained

- Background conversation history is request-local, preventing the former cross-session global-state leak.
- Request and session correlation IDs are carried through the stream protocol.
- Cancellation stops dead-port writes and propagates to provider I/O, retry delays, and tool waits.
- Storage failures use safe stable messages; existing database/key identifiers remain compatible.
- Build checks assert version/identity, the new least-privilege manifest, workflow lock, local OCR code, and content-script packaging.
- Provider attempts carry only the selected provider credential/configuration; public diagnostics omit API credentials.
- Safe fallback is limited to retryable failures before output or browser-tool execution, preventing mixed-provider output and repeated actions.
- Provider errors use stable safe messages instead of upstream response bodies; malformed streams and empty responses cannot report success.
- Tool names and argument schemas are validated before dispatch, stale-context refresh is bounded, and unverified navigation timeout is reported as failure.

Remaining Phase 04 evidence: installed Chrome permission/action/injection testing; credentialed live provider and image requests; OCR runtime/network behavior; accessibility and privacy review; storage upgrade/restart/quota cases; performance budgets; signed package and release controls.
