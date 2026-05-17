const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, '../assets/icons/icon-512x512.png'),
    show: false,
    titleBarStyle: 'default',
    autoHideMenuBar: false
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Check for updates
    checkForUpdates();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window minimize to tray
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  // Create system tray
  createTray();

  // Create application menu
  createMenu();
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/icons/icon-32x32.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon);
  tray.setToolTip('Voice Time Manager');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Start Voice Tracking',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('start-voice-tracking');
      }
    },
    { type: 'separator' },
    {
      label: 'Export Data',
      click: () => {
        mainWindow.webContents.send('export-data');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Handle tray click
  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('export-data');
          }
        },
        {
          label: 'Import Data',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            importData();
          }
        },
        { type: 'separator' },
        {
          label: 'Clear All Data',
          click: () => {
            mainWindow.webContents.send('clear-all-data');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
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
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Voice',
      submenu: [
        {
          label: 'Start Voice Tracking',
          accelerator: 'CmdOrCtrl+Space',
          click: () => {
            mainWindow.webContents.send('start-voice-tracking');
          }
        },
        {
          label: 'Stop Voice Tracking',
          accelerator: 'CmdOrCtrl+Shift+Space',
          click: () => {
            mainWindow.webContents.send('stop-voice-tracking');
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Voice Time Manager',
          click: () => {
            showAboutDialog();
          }
        },
        {
          label: 'Check for Updates',
          click: () => {
            checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => {
            require('electron').shell.openExternal('https://github.com/your-repo/voice-time-manager/issues');
          }
        }
      ]
    }
  ];

  // Add macOS specific menu items
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function importData() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const data = fs.readFileSync(result.filePaths[0], 'utf8');
      const parsedData = JSON.parse(data);
      
      mainWindow.webContents.send('import-data', parsedData);
      
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Import Successful',
        message: 'Data imported successfully!'
      });
    } catch (error) {
      dialog.showErrorBox('Import Error', 'Failed to import data: ' + error.message);
    }
  }
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About Voice Time Manager',
    message: 'Voice Time Manager',
    detail: `Version: ${app.getVersion()}\n\nTrack your time by speaking and plan your ideal day with voice commands.\n\nBuilt with Electron and Web Technologies.`
  });
}

function checkForUpdates() {
  // Implement update checking logic here
  // For now, just show a message
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Check for Updates',
    message: 'You are using the latest version of Voice Time Manager.'
  });
}

// App event handlers
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

app.on('before-quit', () => {
  // Clean up any resources
  if (tray) {
    tray.destroy();
  }
});

// IPC handlers for communication with renderer process
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return app.getName();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Error', 'An unexpected error occurred: ' + error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  dialog.showErrorBox('Error', 'An unexpected error occurred: ' + reason);
});
