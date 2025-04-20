const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('db', {
  get: async (collection, query) => {
    try {
      return await ipcRenderer.invoke('db-get', collection, query);
    } catch (error) {
      console.error(`Error in db.get for ${collection}:`, error);
      return [];
    }
  },
  getOne: async (collection, query) => {
    try {
      return await ipcRenderer.invoke('db-get-one', collection, query);
    } catch (error) {
      console.error(`Error in db.getOne for ${collection}:`, error);
      return null;
    }
  },
  insert: (collection, doc) => ipcRenderer.invoke('db-insert', collection, doc),
  update: (collection, query, update, options) => 
    ipcRenderer.invoke('db-update', collection, query, update, options),
  remove: (collection, query, options) => 
    ipcRenderer.invoke('db-remove', collection, query, options),
  count: async (collection, query) => {
    try {
      return await ipcRenderer.invoke('db-count', collection, query);
    } catch (error) {
      console.error(`Error in db.count for ${collection}:`, error);
      return 0;
    }
  }
});

// Also expose a way to get app paths
contextBridge.exposeInMainWorld('electron', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path')
});