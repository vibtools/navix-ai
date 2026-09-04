# Features Specification

> This file states product goals, not completion evidence. Use [Actual Implementation Status](ACTUAL_IMPLEMENTATION_STATUS.md) for verified working, partial, prompt-only/demo, and missing capabilities. Production work is controlled by the [four-phase roadmap](PRODUCTION_ROADMAP.md).

Phases 01 and 02 changed internal reliability without redesigning the existing UI/UX. Session/storage/cancellation integrity and deterministic gates are implemented. Gemini, OpenAI, Hugging Face, and Ollama now share provider, streaming, error, context, diagnostics, fallback, and capability-aware tool contracts. Sensitive-action confirmation, trust boundaries, secret lifecycle, permission hardening, and prompt-only capability completion remain Phase 03 work.

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
