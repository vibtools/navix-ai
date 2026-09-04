<div align="center">
  <img src="public/logo/branding/AI-Browser-Copilot-light-icon.png" alt="AI Browser Copilot Logo" width="120" />
  <h1>🌐 AI Browser Copilot</h1>
  <p><em>Your fully autonomous AI web agent and ultimate browser assistant.</em></p>
</div>

---

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
Just tell the AI what to do, and watch it work:
- **Navigation:** *"Open this website..."*
- **Form Filling & Interaction:** *"Input these details into the form,"* or *"Click the download button."*
- **Dynamic Element Understanding:** The AI is capable of reading live pages and understanding A-Z of dynamic web elements.

### 🕵️‍♂️ Research & Data Extraction
Let the AI do the heavy lifting for your research:
- **Site Audits:** *"Analyze this website and summarize its core features."*
- **Data Collection:** *"Extract all the relevant data/contacts from this page."*
- **Autonomous Google Research:** *"Search Google for [Topic], visit the top results, and find the best platforms for me."*

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
       ├─► Live DOM Context Engine (Reads HTML, CSS, visual elements)
       │
       └─► Action Execution Layer (Clicks, Inputs, Navigation)
```

## 🛠️ Development Phase
Currently in active development: Integrating context-aware chat, local storage persistence, and core LLM prompt chaining for autonomous browsing.
