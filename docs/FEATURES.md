# Features Specification

> This file states product goals, not completion evidence. Use [Actual Implementation Status](ACTUAL_IMPLEMENTATION_STATUS.md) for verified working, partial, prompt-only/demo, and missing capabilities. Production work is controlled by the [four-phase roadmap](PRODUCTION_ROADMAP.md).

Phases 01-04 harden the product without redesigning the existing UI/UX. Session/storage/cancellation integrity, deterministic gates, unified providers, exact sensitive-action approval, untrusted-content boundaries, credential lifecycle, least-privilege page access, consent, real data/artifact/generator/email/image engines, lazy loading, bundle budgets, and extension-only packaging are implemented and automated-gate verified. Installed-Chrome/live-provider/OCR E2E, accessibility, upgrade, and store/release acceptance remain final runtime gates for release candidate `v1.0.0.1.3`.

## Version 1 Goals

### AI Sidebar Chat

- Floating browser sidebar
- Natural language commands
- Conversation history

### Website Understanding

AI can analyze:

- Page title
- URL
- Text content
- Headings
- Links
- Forms
- Buttons
- Tables

### Browser Actions

Supported actions:

- Open URL
- Click element
- Type text
- Scroll page
- Extract data
- Fill forms

### Website Analysis

Capabilities:

- Feature discovery
- UI/UX analysis
- Design explanation
- Basic audit

### AI Providers

- Gemini
- OpenAI
- Hugging Face Inference Providers
- Ollama (OpenAI-compatible with native API fallback)

## Future Features

- Advanced research mode
- Visual understanding
- Task memory
- Automation workflows
