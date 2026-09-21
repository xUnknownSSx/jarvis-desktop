const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, clipboard } = require('electron');
const path = require('path');

let tray = null;

let win;
let transcriber = null;

const fs = require('fs');

// Path to store memory in the OS user data folder
const MEMORY_PATH = path.join(app.getPath('userData'), 'jarvis_memory.json');

// Read memory from file
function getMemory() {
    if (!fs.existsSync(MEMORY_PATH)) {
        const defaultData = { notes: [] };
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try {
        return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
    } catch (e) {
        return { notes: [] };
    }
}

// Save memory to file
function saveMemory(data) {
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));
}

async function loadWhisper() {
    // Dynamically import local Whisper pipeline
    const { pipeline } = await import('@xenova/transformers');
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
}

function createWindow() {
    win = new BrowserWindow({
        width: 450,
        height: 550,
        resizable: false,
        alwaysOnTop: true,
        frame: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');

    globalShortcut.register('Alt+J', () => {
        if (win.isVisible()) win.hide();
        else {
            win.show();
            win.focus();
        }
    });
}

// Handle audio transcription locally
ipcMain.handle('transcribe-audio', async (event, audioBuffer) => {
    try {
        if (!transcriber) {
            await loadWhisper();
        }
        // Decode audio array buffer to 16kHz Float32Array for Whisper
        const float32Audio = new Float32Array(audioBuffer);
        const result = await transcriber(float32Audio);
        return { text: result.text };
    } catch (err) {
        return { error: 'Speech Transcription Failed: ' + err.message };
    }
});

// Route text prompt to Ollama with Clipboard and Persistent Memory
ipcMain.handle('ask-ollama', async (event, prompt) => {
    try {
        const lowerText = prompt.toLowerCase();

        // --- 1. MEMORY: SAVE A NOTE ---
        if (lowerText.startsWith("remember that") || lowerText.startsWith("note that")) {
            const noteContent = prompt.replace(/^(remember that|note that)/i, '').trim();
            if (!noteContent) return { reply: "What would you like me to remember, sir?" };

            const memory = getMemory();
            memory.notes.push({
                text: noteContent,
                date: new Date().toLocaleDateString()
            });
            saveMemory(memory);

            return { reply: `I have saved that to my memory banks: "${noteContent}".` };
        }

        // --- 2. MEMORY: RECALL NOTES ---
        if (lowerText.includes("what do you remember") || lowerText.includes("read my notes")) {
            const memory = getMemory();
            if (memory.notes.length === 0) return { reply: "My memory logs are currently empty, sir." };

            const noteList = memory.notes.map((n, i) => `${i + 1}. ${n.text}`).join('; ');
            return { reply: `Here is what I have recorded in memory: ${noteList}` };
        }

        // --- 3. MEMORY: CLEAR LOGS ---
        if (lowerText.includes("clear memory") || lowerText.includes("wipe memory")) {
            saveMemory({ notes: [] });
            return { reply: "Local memory logs have been wiped clean, sir." };
        }

        // --- 4. CLIPBOARD: FIX CODE ---
        if (lowerText.includes("fix clipboard code") || lowerText.includes("optimize clipboard")) {
            const codeSnippet = clipboard.readText();
            if (!codeSnippet.trim()) return { reply: "Your clipboard is currently empty, sir." };

            const ollamaPrompt = `Fix syntax errors, optimize performance, and clean up formatting for this code. Return ONLY raw code without commentary:\n\n${codeSnippet}`;
            const res = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'gemma4:latest', prompt: ollamaPrompt, stream: false })
            });
            const data = await res.json();
            clipboard.writeText(data.response.trim());
            return { reply: "Code refactored and updated on your clipboard, sir." };
        }

        // --- 5. CLIPBOARD: REPHRASE TEXT ---
        if (lowerText.includes("rephrase clipboard") || lowerText.includes("polish clipboard")) {
            const textSnippet = clipboard.readText();
            if (!textSnippet.trim()) return { reply: "Your clipboard is currently empty, sir." };

            const ollamaPrompt = `Rephrase and polish the following text to make it professional and clear. Return only the revised text:\n\n${textSnippet}`;
            const res = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'gemma4:latest', prompt: ollamaPrompt, stream: false })
            });
            const data = await res.json();
            clipboard.writeText(data.response.trim());
            return { reply: "The revised text has been placed on your clipboard, sir." };
        }

        // --- 6. DEFAULT OLLAMA GENERATION (INJECTS SAVED MEMORY AS CONTEXT) ---
        const memory = getMemory();
        const storedContext = memory.notes.map(n => n.text).join('; ');

        const systemPrompt = `You are JARVIS, Tony Stark's witty, loyal, highly intelligent AI assistant. Keep responses concise.
User Stored Context/Memory: [${storedContext || 'No stored notes'}]`;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemma4:latest',
                prompt: `${systemPrompt}\n\nUser: ${prompt}\nJARVIS:`,
                stream: false
            })
        });

        const data = await response.json();
        return { reply: data.response };

    } catch (err) {
        return { error: 'Ollama Connection Failed: Ensure Ollama is running locally. ' + err.message };
    }
});

app.whenReady().then(() => {
    createWindow();
    loadWhisper();

    // Prevent quitting on close
    win.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            win.hide();
        }
        return false;
    });

    // Create the System Tray Icon
    tray = new Tray(path.join(__dirname, 'icon.png'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Wake JARVIS', click: () => win.show() },
        { label: 'Quit System', click: () => {
            app.isQuitting = true;
            app.quit();
        }}
    ]);
    tray.setToolTip('JARVIS AI Assistant');
    tray.setContextMenu(contextMenu);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});