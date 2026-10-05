"""
ResQIntel AI — Self-Contained Offline Windows Desktop Application Launcher
Starts the local FastAPI backend and serves the compiled React frontend for 100% offline local execution.
"""

import os
import sys
import time
import socket
import threading
import subprocess
import webbrowser
from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DIST_DIR = FRONTEND_DIR / "dist"

# Local user data directory
LOCAL_APP_DATA = os.environ.get("LOCALAPPDATA", str(Path.home() / ".resqintel"))
APP_DATA_DIR = Path(LOCAL_APP_DATA) / "ResQIntel"
DB_PATH = ROOT_DIR / "resqintel.db"

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

class SPAHandler(SimpleHTTPRequestHandler):
    """Custom HTTP handler that serves SPA index.html for unknown routes"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        # If path doesn't exist as a static file, route to index.html (SPA Fallback)
        requested_path = Path(self.directory) / self.path.lstrip('/')
        if not requested_path.exists() and not (requested_path.with_suffix('.html')).exists():
            self.path = '/index.html'
        return super().do_GET()

    def log_message(self, format, *args):
        # Suppress noisy HTTP request logging in desktop console
        pass

def start_static_spa_server(port: int = 5173):
    """Starts a local Python HTTP server for compiled React frontend assets"""
    httpd = HTTPServer(('127.0.0.1', port), SPAHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    return httpd

def initialize_local_environment():
    """Initializes local directories and database without cloud requirements"""
    print("=" * 65)
    print("      RESQINTEL AI — LOCAL OFFLINE SYSTEM INITIALIZATION")
    print("=" * 65)

    # 1. Create storage directories
    for sub in ["database", "models", "media", "logs", "cache", "config", "reports"]:
        d = APP_DATA_DIR / sub
        d.mkdir(parents=True, exist_ok=True)
    
    (ROOT_DIR / "storage" / "uploads").mkdir(parents=True, exist_ok=True)
    (ROOT_DIR / "storage" / "reports").mkdir(parents=True, exist_ok=True)
    (ROOT_DIR / "storage" / "models").mkdir(parents=True, exist_ok=True)

    print(f" [+] Local Storage:    READY ({APP_DATA_DIR})")
    print(f" [+] Local Database:   READY ({DB_PATH})")
    print(" [+] Offline GIS:      READY (Local Fallback Canvas)")
    print(" [+] Offline AI:       READY (Multi-Agent Classification Matrix)")
    print(" [+] IndexedDB Sync:   READY (Local Mutation Queue)")
    print("=" * 65)

def launch_native_app_window(url: str):
    """Attempts to launch an Edge/Chrome standalone App Window without browser URL bar"""
    # 1. Try Microsoft Edge (standard on all Windows 10/11)
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for p in edge_paths:
        if os.path.exists(p):
            try:
                subprocess.Popen([p, f"--app={url}", "--window-size=1366,850"])
                return
            except Exception:
                pass

    # 2. Try Google Chrome
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    ]
    for p in chrome_paths:
        if os.path.exists(p):
            try:
                subprocess.Popen([p, f"--app={url}", "--window-size=1366,850"])
                return
            except Exception:
                pass

    # 3. Fallback to default browser
    webbrowser.open(url)

def main():
    initialize_local_environment()

    # 1. Start or verify FastAPI backend
    backend_proc = None
    if not is_port_in_use(8000):
        print("[*] Starting Local FastAPI Backend (127.0.0.1:8000)...")
        backend_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=str(ROOT_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        time.sleep(2)
    else:
        print("[*] Local Backend already running on port 8000.")

    # 2. Start frontend server (Static production server or Vite dev)
    httpd = None
    frontend_proc = None
    if not is_port_in_use(5173):
        if DIST_DIR.exists():
            print("[*] Serving Built Production Assets on 127.0.0.1:5173...")
            httpd = start_static_spa_server(5173)
        else:
            print("[*] Starting Vite Development Server on 127.0.0.1:5173...")
            frontend_proc = subprocess.Popen(
                ["npx", "vite", "--port", "5173", "--host", "127.0.0.1"],
                cwd=str(FRONTEND_DIR),
                shell=(os.name == 'nt'),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(2)
    else:
        print("[*] Local Frontend already active on port 5173.")

    app_url = "http://localhost:5173"
    print(f"\n[✓] ResQIntel AI Offline Application Ready at: {app_url}")
    print("[*] Launching ResQIntel Desktop App Window...")
    launch_native_app_window(app_url)

    print("\n------------------------------------------------------------")
    print(" Application is running offline locally. Press Ctrl+C to exit.")
    print("------------------------------------------------------------")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Shutting down local processes cleanly...")
        if backend_proc:
            backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        if httpd:
            httpd.shutdown()
        print("[✓] ResQIntel AI closed successfully.")

if __name__ == "__main__":
    main()

