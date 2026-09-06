<div align="center">
  <img src="public/logo/branding/navix-ai-light-icon.png" alt="Navix AI Logo" width="120" />
  <h1>🌐 Navix AI</h1>
  <p><em>Your fully autonomous AI web agent and ultimate browser assistant.</em></p>
</div>

---

## Production Hardening Status

`v1.0.0.2.0` is the scoped follow-on to the Phase 01–04 baseline. It adds a bounded Website Intelligence payload (semantic map, accessibility tree, actionable targets, form metadata, and visual bounds), screenshot/DOM fusion, explicit per-site or all-site consent, multiple enabled model configurations with one primary, capability-aware fallback, stable live activity rendering, prompt/response actions, and more reliable shadow-DOM-aware browser actions. The deterministic lint/test/build/security/package gates pass. Installed-Chrome, credentialed provider/OCR, accessibility, upgrade, and store-submission acceptance still require an appropriate runtime and are not inferred from compilation.

Current feature truth, open findings, phase progress, and approval rules are maintained in the [documentation index](docs/DOCUMENTATION_INDEX.md).

## 🎯 Our Mission

The core mission of this project is to build a **powerful, autonomous AI Browser Extension** that acts as your personal web agent. Through a simple, sleek sidebar chatbox, you can command the AI to browse, interact, and execute complex tasks on your behalf. 

Whether it's auditing a website, filling out dynamic forms, or conducting deep research, this extension ensures that the AI understands live DOM elements and acts upon them—turning your natural language commands into real browser actions.

## ✨ Core Capabilities

### 🧠 Bring Your Own AI (BYO-AI)
Flexibility is key. You can integrate any AI model you prefer:
- **Google Gemini** (Recommended)
- **OpenAI** (GPT-4, GPT-3.5)
- **Hugging Face** Models
- **Local AI** (Ollama) or custom self-hosted APIs

### 💬 Persistent Sidebar Chat
A seamless sidebar chat interface that stays with you as you browse. Talk to your AI agent directly while it reads, analyzes, and interacts with the current tab in real-time.

### 🚀 Autonomous Web Actions (Live AI)
Supported tools can act on the active page. Sensitive/destructive actions show their exact target, destination, and data and require one-time approval:
- **Navigation:** *"Open this website..."*
- **Form Filling & Interaction:** *"Input these details into the form,"* or *"Click the download button."*
- **Dynamic Element Understanding:** The AI is capable of reading live pages and understanding A-Z of dynamic web elements.

### 🕵️‍♂️ Research & Data Extraction
Let the AI do the heavy lifting for your research:
- **Site Audits:** *"Analyze this website and summarize its core features."*
- **Data Collection:** *"Extract all the relevant data/contacts from this page."*
- **Controlled Web Research:** Search with the selected Google, Bing, or DuckDuckGo engine; each external query/navigation remains governed by action approval and site permission.

### 🎨 Developer & Design Tools
- **Design Analysis & Cloning:** *"Analyze this site's UI and write the code to clone its design."*
- **Technical Breakdown:** *"Explain how this specific feature on the page was built."*

---

## 🏗️ Architecture

```text
Browser Extension (UI & Sidebar)
       │
       ├─► API Configuration Layer (Gemini, OpenAI, Ollama)
       │
       ├─► Website Intelligence Engine (Semantic DOM, accessibility, visual bounds)
       │
       └─► Action Execution Layer (Clicks, Inputs, Navigation)
```

## 🛠️ Development Phase
The scoped `v1.0.0.2.0` implementation and deterministic release artifact are complete. See the verification report for the exact pass evidence and the live-runtime gates that could not be executed in this environment.

## 📚 Production Documentation

- [Official Baseline Freeze](docs/OFFICIAL_BASELINE_FREEZE.md)
- [Production Readiness Forensic Report](docs/PRODUCTION_READINESS_FORENSIC_REPORT.md)
- [Four-Phase Production Roadmap](docs/PRODUCTION_ROADMAP.md)
- [Phase Completion Log](docs/PHASE_COMPLETION_LOG.md)
- [Actual Implementation Status](docs/ACTUAL_IMPLEMENTATION_STATUS.md)
- [Error Handling Matrix](docs/ERROR_HANDLING_MATRIX.md)
- [Production Traceability Matrix](docs/TRACEABILITY_MATRIX.md)
- [Development Governance and Approval Gates](docs/DEVELOPMENT_GOVERNANCE.md)
- [Phase 04 QA Matrix](docs/PHASE04_QA_MATRIX.md)
- [v1.0.0.2.0 Verification Report](docs/V1.0.0.2.0_VERIFICATION_REPORT.md)
- [Privacy](PRIVACY.md)
- [Release Notes](RELEASE_NOTES.md)
- [Changelog](CHANGELOG.md)
