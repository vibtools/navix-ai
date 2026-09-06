# Features Specification

> This file states product goals, not completion evidence. Use [Actual Implementation Status](ACTUAL_IMPLEMENTATION_STATUS.md) for verified working, partial, prompt-only/demo, and missing capabilities. Production work is controlled by the [four-phase roadmap](PRODUCTION_ROADMAP.md).

Phases 01-04 plus the scoped `v1.0.0.2.0` follow-on harden the product without redesigning the existing UI/UX. Session/storage/cancellation integrity, deterministic gates, unified providers, exact sensitive-action approval, untrusted-content boundaries, credential lifecycle, least-privilege page access, consent, real data/artifact/generator/email/image engines, lazy loading, bundle budgets, extension-only packaging, Website Intelligence, explicit site grants, multi-enabled model configurations, stable live chat activity, and strengthened browser targeting are implemented and automated-gate verified. Installed-Chrome/live-provider/OCR E2E, accessibility, upgrade, and store acceptance remain external runtime gates.

## Version 1 Goals

### AI Sidebar Chat

- Floating browser sidebar
- Natural language commands
- Conversation history
- One stable assistant row per request with compact read/map/capture/provider/action/write activity
- Prompt copy/retry/edit and assistant copy/retry

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
- Inferred page type and semantic sections
- Accessibility roles/names and stable action targets
- Form metadata and visible target bounds
- Optional visible-tab screenshot fused with structured page context

The provider envelope is compressed to at most 30,000 characters and includes open-shadow-root content. Page access is granted explicitly with **Allow This Site** or **Allow All Sites**; an existing all-sites grant is reused.

### Browser Actions

Supported actions:

- Open URL
- Click element
- Type text
- Scroll page
- Extract data
- Fill forms
- Select options and edit contenteditable controls
- Revalidate dynamic/open-shadow-root targets before mutation

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
- Task memory
- Automation workflows
