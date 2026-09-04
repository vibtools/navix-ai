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

### AI Provider Layer

Supports:
- Gemini
- GPT
- Custom AI endpoints

## Design Principle

Start as a single browser extension. Add external services only when required by advanced features.

The content script is built separately as a self-contained IIFE because manifest-declared content scripts cannot depend on runtime ES-module imports. Background and side-panel entries retain module/chunk output. Extension artifact publication remains disabled until Phase 04.
