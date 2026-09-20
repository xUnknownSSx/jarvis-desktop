# 🤖 JARVIS Desktop AI Assistant

A 100% local, privacy-focused, standalone voice assistant desktop application inspired by Iron Man's JARVIS. Powered by **Electron**, **Ollama**, and **Local Whisper**, it runs completely offline with zero API fees or third-party cloud tracking.

---

## ✨ Features

- **🎙️ Local Speech-to-Text**: Voice recording processed natively using `@xenova/transformers` (OpenAI Whisper) locally on your GPU/CPU.
- **🧠 Local LLM Intelligence**: Connects to Ollama running local models (`gemma4`, `llama3.2`) for smart, witty, and immediate responses.
- **⚡ Global Hotkey Access**: Press `Alt + J` anywhere on Windows to quickly toggle or focus the interface.
- **🎨 Custom Arc Reactor UI**: Sleek, frameless, semi-transparent window with custom CSS glow animations and status feedback.
- **🔊 Text-to-Speech Output**: Integrated browser Speech Synthesis for instant voice responses.
- **📦 Standalone Packaging**: Built with `electron-builder` to package into a single Windows installer (`.exe`).

---

## 🛠️ Tech Stack

- **Framework**: Electron.js
- **Speech Recognition**: `@xenova/transformers` (`Xenova/whisper-tiny.en`)
- **Language Model**: Ollama (`gemma4:latest` / `llama3.2`)
- **Installer Tooling**: `electron-builder` + NSIS

---

## 📋 Prerequisites

Before running JARVIS, ensure you have the following installed:

1. **[Node.js](https://nodejs.org/)** (v18 or higher)
2. **[Ollama](https://ollama.com/)** running locally with your preferred model pulled:
   ```bash
   ollama run gemma4:latest


## 🚀 Quick Start

1. Clone the Repository:

git clone [https://github.com/xUnknownSSx/jarvis-desktop.git](https://github.com/xUnknownSSx/jarvis-desktop.git)
cd jarvis-desktop

2. Install Dependencies:

```bash
npm install
```

3. Run Application

```bash
npm start
```

## 📦 Building the Installer (.exe)

To generate a standalone Windows installer package (.exe):

```bash
npm start
```

The output setup file will be generated in the ./dist directory (JARVIS Setup 1.0.0.exe).

## ⌨️ Controls & Usage

Action                                    Control

Toggle Window:                            Alt + J, 
Start Listening:                          Click Activate Jarvis, 
Process Speech:                           Click Stop & Process, 