# Navix AI Privacy Notes

Navix AI is a bring-your-own-provider browser extension. It does not include a
first-party analytics service, telemetry collector, advertising SDK, or remote
credential store.

## Data handling

- Chat history, settings, provider metadata, consent choices, and session state
  are stored locally in the browser. The legacy `AICopilotDB` and `copilot_`
  identifiers remain for compatibility.
- API keys are kept in Chrome session storage or in the optional encrypted
  PBKDF2-SHA-256/AES-GCM vault. Public provider configuration records do not
  contain keys.
- Page context, screenshots, attachments, OCR text, and image-generation
  prompts leave the browser only when the user enables the relevant feature and
  sends a request to the selected provider.
- Page and file data are bounded and marked as untrusted before they are added
  to a provider request. External page content cannot approve a browser action.
- OCR executable code and workers are packaged locally. English OCR language
  data is downloaded from the explicitly declared jsDelivr host when OCR is
  used.

## User controls

Users can disable page context, screenshots, search, file transmission, image
generation, and other optional capabilities in the existing settings. Sensitive
and destructive browser actions show their exact target and require one-time
approval. Revoking consent or clearing the credential vault removes the
corresponding local state.

## Provider responsibility

The selected Gemini, OpenAI, Hugging Face, Ollama, or compatible endpoint
receives only the request data required for the enabled feature. Provider
retention, logging, regional processing, and account policies are controlled by
that provider and should be reviewed before use.

This document describes the current implementation. It is not a legal privacy
policy or a guarantee about third-party provider practices.
