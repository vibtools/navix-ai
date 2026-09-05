# Features Specification

> This file states product goals, not completion evidence. Use [Actual Implementation Status](ACTUAL_IMPLEMENTATION_STATUS.md) for verified working, partial, prompt-only/demo, and missing capabilities. Production work is controlled by the [four-phase roadmap](PRODUCTION_ROADMAP.md).

Phases 01-03 hardened the product without redesigning the existing UI/UX. Session/storage/cancellation integrity, deterministic gates, unified providers, exact sensitive-action approval, untrusted-content boundaries, credential lifecycle, least-privilege page access, consent, and real data/artifact/generator/email/image engines are implemented and focused-test verified. Installed-Chrome/live-provider/OCR E2E, performance, packaging, upgrade, and release acceptance remain Phase 04 work.

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
