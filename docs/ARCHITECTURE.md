# Architecture

> Baseline note: this describes the high-level product design. Verified implementation status and production gaps are tracked in [Actual Implementation Status](ACTUAL_IMPLEMENTATION_STATUS.md) and [Production Readiness Forensic Report](PRODUCTION_READINESS_FORENSIC_REPORT.md).

## Overview

Navix AI is designed as a Chrome Extension based AI browser assistant.

## High Level Structure

```
Chrome Extension
|
|-- Sidebar UI
|
|-- Background Service Worker
|
|-- Content Script
|
|-- AI Provider Layer
|
|-- Browser Action Engine
```

## Components

### Sidebar UI

Responsible for:
- User conversation
- Command input
- AI response display

### Background Service Worker

Responsible for:
- Request-local conversation context
- Task handling
- Communication between components
- Abort-aware provider and browser-tool execution

### Content Script

Responsible for:
- Reading webpage data
- DOM analysis
- Executing browser actions
- Maintaining stable collision-free numeric action identities

### Core Contracts

- `sessionProtocol.js`: request/session identity, input validation, and provider history conversion.
- `requestLifecycle.js`: one-terminal-message port lifecycle, cancellation, and abortable delays.
- `appStorage.js`: serialized completion-aware Chrome/IndexedDB/localStorage access with legacy compatibility.
- `errorContract.js`: stable safe core error codes and payloads.
- `providerContract.js`: provider/model/credential isolation and normalized tool-call shapes.
- `promptContext.js`: single application of system/custom/language/page/file/screenshot inputs.
- `sseParser.js`: stateful fragmented Server-Sent Events parsing.
- `actionPolicy.js` and `confirmationProtocol.js`: risk classification, validated action details, expiring request-bound one-time approval, and fail-closed denial/replay behavior.
- `trustBoundary.js` and `filePolicy.js`: bounded untrusted page/file envelopes, injection-risk markers, rendered-URL policy, and upload limits.
- `credentialVault.js`: secretless public provider records, session credentials, and optional PBKDF2-SHA-256/AES-GCM persistent storage.

### Capability Engines

Local modules implement structured CSV/JSON/TXT/XLSX reading, real XLSX generation, data analysis, synthetic identity/address generation, email grouping, and artifact extraction/download. The image module maps the existing Gemini/OpenAI image choices to real provider requests. PDF, OCR, and capability modules are loaded only when used; OCR worker/core code is packaged locally while its English language-data download is restricted to the declared CDN host.

### AI Provider Layer

`providerRunner.js` is the single extension/server orchestrator. It performs bounded provider retries, zero-output-only fallback, capability checks, shared tool execution, and normalized completion. Provider-specific protocol handling is isolated in adapters:

- `geminiAdapter.js`
- `openAiAdapter.js`
- `huggingFaceAdapter.js` using the Inference Providers router
- `ollamaAdapter.js` using OpenAI compatibility with native `/api/chat` fallback

The background service worker injects the Chrome browser-tool executor. The web/server facade uses the same provider runner without Chrome tools, preserving one response/error contract rather than duplicating provider logic.

## Design Principle

Start as a single browser extension. Add external services only when required by advanced features.

The content script is built separately as a self-contained IIFE and injected programmatically under `activeTab` or a user-approved optional site origin. Background and side-panel entries retain module/chunk output. Extension artifact publication remains disabled until Phase 04.
