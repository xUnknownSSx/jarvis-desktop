const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');

let tray = null;

let win;
let transcriber = null;

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

// Route text prompt to Ollama
ipcMain.handle('ask-ollama', async (event, prompt) => {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gemma4:latest',
                prompt: `You are JARVIS, Tony Stark's witty, loyal, highly intelligent AI assistant. Keep responses brief (1-3 sentences) so they sound natural spoken aloud.\n\nUser: ${prompt}\nJARVIS:`,
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