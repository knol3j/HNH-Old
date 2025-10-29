const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow;
let miner = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#1a1a2e',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    if (miner && miner.isRunning) {
      miner.stop();
    }
    mainWindow = null;
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://hashnhedge.com/docs');
          }
        },
        {
          label: 'Discord Community',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://discord.gg/hashnhedge');
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About HashNHedge Miner',
              message: 'HashNHedge Miner v2.0',
              detail: 'Decentralized GPU Computing Network\n\nBuilt with Electron\n© 2025 HashNHedge'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-config', () => {
  return {
    walletAddress: store.get('walletAddress', ''),
    poolUrl: store.get('poolUrl', 'https://hashnhedge-pool.onrender.com'),
    workerName: store.get('workerName', require('os').hostname())
  };
});

ipcMain.handle('save-config', (event, config) => {
  store.set('walletAddress', config.walletAddress);
  store.set('poolUrl', config.poolUrl);
  store.set('workerName', config.workerName);
  return true;
});

ipcMain.handle('start-mining', async (event, config) => {
  try {
    // Import the miner class
    const { HashNHedgeMiner } = require('./miner');

    if (miner && miner.isRunning) {
      return { success: false, error: 'Miner already running' };
    }

    miner = new HashNHedgeMiner(config, (stats) => {
      // Send stats updates to renderer
      if (mainWindow) {
        mainWindow.webContents.send('mining-stats', stats);
      }
    });

    await miner.startMining();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-mining', () => {
  if (miner && miner.isRunning) {
    miner.stop();
    miner = null;
    return { success: true };
  }
  return { success: false, error: 'Miner not running' };
});

ipcMain.handle('get-mining-status', () => {
  if (miner) {
    return {
      isRunning: miner.isRunning,
      stats: miner.getStats()
    };
  }
  return {
    isRunning: false,
    stats: null
  };
});
