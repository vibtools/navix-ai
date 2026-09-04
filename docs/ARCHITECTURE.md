# Architecture

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
- Extension state
- Task handling
- Communication between components

### Content Script

Responsible for:
- Reading webpage data
- DOM analysis
- Executing browser actions

### AI Provider Layer

Supports:
- Gemini
- GPT
- Custom AI endpoints

## Design Principle

Start as a single browser extension. Add external services only when required by advanced features.
