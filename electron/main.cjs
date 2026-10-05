const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 5173;
const BACKEND_PORT = 8000;

function checkServerReady(port, callback) {
  const check = () => {
    const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
      callback();
    });
    req.on('error', () => {
      setTimeout(check, 500);
    });
  };
  check();
}

function startBackend() {
  console.log('[Electron] Starting local FastAPI backend...');
  backendProcess = spawn('python', ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: ROOT_DIR,
    stdio: 'ignore',
    shell: true,
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'ResQIntel AI — Emergency Response Intelligence Platform',
    icon: path.join(ROOT_DIR, 'frontend', 'public', 'shield.svg'),
    backgroundColor: '#0E2119',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL('http://localhost:5173');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  // Wait for frontend and backend to be accessible, then create window
  setTimeout(() => {
    createWindow();
  }, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
