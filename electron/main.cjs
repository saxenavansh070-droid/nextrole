/**
 * Next Role desktop app (Electron).
 *
 * Starts the bundled Node API server in-process (it also serves the built
 * client from client/dist), waits for its health endpoint, then opens the
 * app in a clean browser window. One double-clickable app, no terminals.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const http = require('node:http');

const PORT = Number(process.env.NEXTROLE_PORT || 4173);
const APP_URL = `http://127.0.0.1:${PORT}`;

function startServer() {
  try {
    // Must happen before the server reads env: it binds process.env.PORT.
    process.env.PORT = String(PORT);
    require(path.join(__dirname, '..', 'server', 'dist', 'index.js'));
  } catch (error) {
    console.error('[desktop] failed to start the bundled server:', error);
  }
}

function waitForServer(retriesLeft = 120) {
  return new Promise((resolve) => {
    const attempt = (left) => {
      const req = http.get(`${APP_URL}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve(true);
          return;
        }
        retry(left);
      });
      req.on('error', () => retry(left));
      req.setTimeout(1500, () => {
        req.destroy();
        retry(left);
      });
    };
    const retry = (left) => {
      if (left <= 0) {
        resolve(false);
        return;
      }
      setTimeout(() => attempt(left - 1), 250);
    };
    attempt(retriesLeft);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#f7f6f1',
    autoHideMenuBar: true,
    title: 'Next Role',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadURL(APP_URL);
  // Open external links (Google, docs) in the default browser, not in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
  return win;
}

app.whenReady().then(async () => {
  startServer();
  const ready = await waitForServer();
  if (!ready) {
    console.error('[desktop] server never became healthy; loading anyway');
  }
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
