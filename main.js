const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb');

// Ensure data directory exists
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize databases
const db = {
  stock: new Datastore({ 
    filename: path.join(dataDir, 'stock.db'), 
    autoload: true 
  }),
  customers: new Datastore({ 
    filename: path.join(dataDir, 'customers.db'), 
    autoload: true 
  }),
  bills: new Datastore({ 
    filename: path.join(dataDir, 'bills.db'), 
    autoload: true 
  }),
  payments: new Datastore({ 
    filename: path.join(dataDir, 'payments.db'), 
    autoload: true 
  }),
  cashLedger: new Datastore({ 
    filename: path.join(dataDir, 'cashLedger.db'), 
    autoload: true 
  }),
  bankLedger: new Datastore({ 
    filename: path.join(dataDir, 'bankLedger.db'), 
    autoload: true 
  }),
  tradeReceivable: new Datastore({ 
    filename: path.join(dataDir, 'tradeReceivable.db'), 
    autoload: true 
  }),
  tradePayable: new Datastore({ 
    filename: path.join(dataDir, 'tradePayable.db'), 
    autoload: true 
  }),
  purchases: new Datastore({ 
    filename: path.join(dataDir, 'purchases.db'), 
    autoload: true 
  }),
  // Add the new collections
  receipts: new Datastore({ 
    filename: path.join(dataDir, 'receipts.db'), 
    autoload: true 
  }),
  expenses: new Datastore({ 
    filename: path.join(dataDir, 'expenses.db'), 
    autoload: true 
  }),
  expenseCategories: new Datastore({ 
    filename: path.join(dataDir, 'expenseCategories.db'), 
    autoload: true 
  })
};

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"]
      }
    });
  });

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile('index.html');

  // Open DevTools if in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Initialize cash and bank balance records if none exist
  db.cashLedger.count({}, (err, count) => {
    if (count === 0) {
      db.cashLedger.insert({
        date: new Date().toISOString().split('T')[0],
        description: 'Initial Cash Balance',
        reference: 'INIT-001',
        cashIn: 0,
        cashOut: 0,
        balance: 0,
        createdAt: new Date().toISOString()
      });
    }
  });

  db.bankLedger.count({}, (err, count) => {
    if (count === 0) {
      db.bankLedger.insert({
        date: new Date().toISOString().split('T')[0],
        description: 'Initial Bank Balance',
        reference: 'INIT-001',
        deposit: 0,
        withdrawal: 0,
        balance: 0,
        createdAt: new Date().toISOString()
      });
    }
  });
  
  // Initialize default expense categories if none exist
  db.expenseCategories.count({}, (err, count) => {
    if (count === 0) {
      const defaultCategories = [
        { name: 'shop', createdAt: new Date().toISOString() },
        { name: 'home', createdAt: new Date().toISOString() },
        { name: 'salary', createdAt: new Date().toISOString() },
        { name: 'rent', createdAt: new Date().toISOString() },
        { name: 'utilities', createdAt: new Date().toISOString() },
        { name: 'travel', createdAt: new Date().toISOString() },
        { name: 'office', createdAt: new Date().toISOString() },
        { name: 'other', createdAt: new Date().toISOString() }
      ];
      
      defaultCategories.forEach(category => {
        db.expenseCategories.insert(category);
      });
    }
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Database operations for IPC
ipcMain.handle('db-get', async (event, collection, query = {}) => {
  return new Promise((resolve, reject) => {
    db[collection].find(query, (err, docs) => { // Line 166
      if (err) reject(err);
      else resolve(docs);
    });
  });
});

ipcMain.handle('db-get-one', async (event, collection, query = {}) => {
  return new Promise((resolve, reject) => {
    db[collection].findOne(query, (err, doc) => {
      if (err) reject(err);
      else resolve(doc);
    });
  });
});

ipcMain.handle('db-insert', async (event, collection, doc) => {
  return new Promise((resolve, reject) => {
    db[collection].insert(doc, (err, newDoc) => {
      if (err) reject(err);
      else resolve(newDoc);
    });
  });
});

ipcMain.handle('db-update', async (event, collection, query, update, options = {}) => {
  return new Promise((resolve, reject) => {
    db[collection].update(query, update, options, (err, numReplaced) => {
      if (err) reject(err);
      else resolve(numReplaced);
    });
  });
});

ipcMain.handle('db-remove', async (event, collection, query, options = {}) => {
  return new Promise((resolve, reject) => {
    db[collection].remove(query, options, (err, numRemoved) => {
      if (err) reject(err);
      else resolve(numRemoved);
    });
  });
});

ipcMain.handle('db-count', async (event, collection, query = {}) => {
  return new Promise((resolve, reject) => {
    if (!db[collection]) {
      reject(new Error(`Collection '${collection}' does not exist`));
      return;
    }
    
    db[collection].count(query, (err, count) => {
      if (err) reject(err);
      else resolve(count);
    });
  });
});

// Path access
ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});