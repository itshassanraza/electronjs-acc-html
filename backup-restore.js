// backup-restore.js - Handles backup and restore functionality

document.addEventListener('DOMContentLoaded', async function() {
    // Update current date
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    // Initialize page
    await loadSystemInfo();
    await loadBackupHistory();
    setupEventListeners();
});

// Load system information
async function loadSystemInfo() {
    try {
        // Get database statistics
        const stats = await calculateDBStats();
        
        // Update UI
        document.getElementById('db-version').textContent = 'v1.0'; // Could be fetched from config
        document.getElementById('total-records').textContent = stats.totalRecords;
        document.getElementById('storage-used').textContent = formatBytes(stats.storageUsed);
        
        // Get last backup date from localStorage
        const lastBackup = localStorage.getItem('lastBackup');
        document.getElementById('last-backup').textContent = lastBackup ? new Date(lastBackup).toLocaleString() : 'Never';
    } catch (error) {
        console.error('Error loading system info:', error);
        document.getElementById('total-records').textContent = 'Error';
        document.getElementById('storage-used').textContent = 'Error';
    }
}

// Calculate database statistics
async function calculateDBStats() {
    let totalRecords = 0;
    let storageUsed = 0;
    
    try {
        // Load collections safely with error handling
        const collections = [];
        
        // Stock items
        try {
            const stockItems = await window.dbService.getStockItems() || [];
            collections.push({ name: 'stock', data: stockItems });
            console.log(`Loaded ${stockItems.length} stock items`);
        } catch (e) {
            console.error('Error loading stock items:', e);
            collections.push({ name: 'stock', data: [] });
        }
        
        // Customers
        try {
            const customers = await window.dbService.getCustomers() || [];
            collections.push({ name: 'customers', data: customers });
            console.log(`Loaded ${customers.length} customers`);
        } catch (e) {
            console.error('Error loading customers:', e);
            collections.push({ name: 'customers', data: [] });
        }
        
        // Bills
        try {
            const bills = await window.dbService.getBills() || [];
            collections.push({ name: 'bills', data: bills });
            console.log(`Loaded ${bills.length} bills`);
        } catch (e) {
            console.error('Error loading bills:', e);
            collections.push({ name: 'bills', data: [] });
        }
        
        // Purchases
        try {
            const purchases = await safeGetCollection('purchases');
            collections.push({ name: 'purchases', data: purchases });
            console.log(`Loaded ${purchases.length} purchases`);
        } catch (e) {
            console.error('Error loading purchases:', e);
            collections.push({ name: 'purchases', data: [] });
        }
        
        // Calculate statistics
        collections.forEach(collection => {
            if (Array.isArray(collection.data)) {
                totalRecords += collection.data.length;
                storageUsed += new Blob([JSON.stringify(collection.data)]).size;
            }
        });
        
        return {
            totalRecords,
            storageUsed
        };
    } catch (error) {
        console.error('Error calculating database stats:', error);
        return {
            totalRecords: 0,
            storageUsed: 0
        };
    }
}

// Safe get collection helper
async function safeGetCollection(collectionName) {
    try {
        if (window.db && typeof window.db.get === 'function') {
            try {
                return await window.db.get(collectionName) || [];
            } catch (e) {
                console.error(`Error in db.get for ${collectionName}:`, e);
                return [];
            }
        } else if (window.dbService && typeof window.dbService[`get${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}`] === 'function') {
            // Try to use a getter method with capitalized collection name
            const methodName = `get${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}`;
            return await window.dbService[methodName]() || [];
        } else {
            console.warn(`No method found for getting ${collectionName}`);
            return [];
        }
    } catch (error) {
        console.error(`Failed to get ${collectionName}:`, error);
        return [];
    }
}

// Format bytes to human readable size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Load backup history from localStorage
async function loadBackupHistory() {
    try {
        const backupHistory = JSON.parse(localStorage.getItem('backupHistory')) || [];
        const tbody = document.getElementById('backup-history-body');
        
        if (backupHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="px-4 py-2 text-center text-gray-500">No backup history found</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        // Sort history by date (newest first)
        backupHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Show only last 5 entries
        const recentHistory = backupHistory.slice(0, 5);
        
        recentHistory.forEach(backup => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-2 text-sm">${new Date(backup.date).toLocaleString()}</td>
                <td class="px-4 py-2 text-sm">${backup.size}</td>
                <td class="px-4 py-2 text-sm">
                    <button class="text-blue-600 hover:text-blue-800 download-backup" data-filename="${backup.filename}">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners to download buttons
        document.querySelectorAll('.download-backup').forEach(button => {
            button.addEventListener('click', function() {
                const filename = this.getAttribute('data-filename');
                const backupData = localStorage.getItem(`backup_${filename}`);
                if (backupData) {
                    downloadJSON(backupData, filename);
                } else {
                    window.utils.showNotification('Backup file not found', 'error');
                }
            });
        });
    } catch (error) {
        console.error('Error loading backup history:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Backup button click
    const backupBtn = document.getElementById('backup-btn');
    backupBtn.addEventListener('click', startBackup);
    
    // File drop area
    const fileDropArea = document.getElementById('file-drop-area');
    const fileInput = document.getElementById('restore-file-input');
    
    // Drag and drop events
    fileDropArea.addEventListener('dragover', e => {
        e.preventDefault();
        fileDropArea.classList.add('active');
    });
    
    fileDropArea.addEventListener('dragleave', () => {
        fileDropArea.classList.remove('active');
    });
    
    fileDropArea.addEventListener('drop', e => {
        e.preventDefault();
        fileDropArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', e => {
        if (e.target.files.length) {
            handleFileSelection(e.target.files[0]);
        }
    });
    
    // Remove selected file button
    document.getElementById('remove-file-btn').addEventListener('click', () => {
        resetRestoreUI();
        addLogEntry('Restore file removed', 'info');
    });
    
    // Restore button click
    document.getElementById('restore-btn').addEventListener('click', confirmRestore);
    
    // Restore done button
    document.getElementById('restore-done-btn').addEventListener('click', () => {
        resetRestoreUI();
        addLogEntry('Restore process completed. Ready for new restore.', 'info');
    });
    
    // Clear log button
    document.getElementById('clear-log-btn').addEventListener('click', () => {
        document.getElementById('restore-log').innerHTML = '';
        addLogEntry('Log cleared', 'info');
    });
    
    // Confirmation modal events
    document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirmModal);
    document.getElementById('close-confirm-modal').addEventListener('click', closeConfirmModal);
}

// Start the backup process
async function startBackup() {
    try {
        const backupBtn = document.getElementById('backup-btn');
        const progressContainer = document.getElementById('backup-progress-container');
        const progressBar = document.getElementById('backup-progress-bar');
        const progressText = document.getElementById('backup-progress');
        
        // Determine what to backup based on selected option
        let backupType = 'all';
        document.querySelectorAll('input[name="backup-option"]').forEach(input => {
            if (input.checked) {
                backupType = input.id.replace('backup-', '');
            }
        });
        
        // Disable button and show progress bar
        backupBtn.disabled = true;
        backupBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Backing up...';
        progressContainer.style.display = 'flex';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        
        // Start backup process
        const data = await collectBackupData(backupType, updateBackupProgress);
        
        // Create a JSON string with formatted data
        const jsonString = JSON.stringify(data, null, 2);
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `inventory_backup_${backupType}_${timestamp}.json`;
        
        // Save backup to localStorage for history
        saveBackupToHistory(fileName, jsonString);
        
        // Complete progress bar
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        
        // Update last backup date
        localStorage.setItem('lastBackup', new Date().toISOString());
        
        // Generate download
        downloadJSON(jsonString, fileName);
        
        // Reset UI
        setTimeout(() => {
            backupBtn.disabled = false;
            backupBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Create Backup';
            progressContainer.style.display = 'none';
            loadSystemInfo();
            loadBackupHistory();
        }, 1000);
        
        window.utils.showNotification('Backup created successfully', 'success');
    } catch (error) {
        console.error('Backup error:', error);
        window.utils.showNotification('Error creating backup', 'error');
        
        const backupBtn = document.getElementById('backup-btn');
        backupBtn.disabled = false;
        backupBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Create Backup';
        document.getElementById('backup-progress-container').style.display = 'none';
    }
}

// Update backup progress UI
function updateBackupProgress(progress) {
    const progressBar = document.getElementById('backup-progress-bar');
    const progressText = document.getElementById('backup-progress');
    
    const percentage = Math.round(progress * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
}

// Collect data for backup
async function collectBackupData(type, progressCallback) {
    try {
        // Define a structure to hold all data
        const backupData = {
            metadata: {
                version: '1.0',
                date: new Date().toISOString(),
                type: type
            },
            data: {}
        };
        
        // Define collections to backup based on type
        const collections = [];
        
        if (type === 'all' || type === 'stock') {
            collections.push({ 
                id: 'stock', 
                getter: async () => await window.dbService.getStockItems() 
            });
        }
        
        if (type === 'all' || type === 'customers') {
            collections.push({ 
                id: 'customers', 
                getter: async () => await window.dbService.getCustomers() 
            });
        }
        
        if (type === 'all' || type === 'transactions') {
            collections.push({ 
                id: 'bills', 
                getter: async () => await window.dbService.getBills() 
            });
            
            collections.push({ 
                id: 'purchases', 
                getter: async () => await safeGetCollection('purchases')
            });
        }
        
        // Fetch data from each collection with progress reporting
        for (let i = 0; i < collections.length; i++) {
            const collection = collections[i];
            try {
                const data = await collection.getter() || [];
                backupData.data[collection.id] = data;
                
                // Update progress (divide by number of collections)
                if (progressCallback) {
                    progressCallback((i + 1) / collections.length);
                }
            } catch (error) {
                console.error(`Error backing up ${collection.id}:`, error);
                backupData.data[collection.id] = [];
            }
        }
        
        return backupData;
    } catch (error) {
        console.error('Error collecting backup data:', error);
        throw error;
    }
}

// Save backup to localStorage history
function saveBackupToHistory(filename, jsonData) {
    try {
        // Get existing history
        const backupHistory = JSON.parse(localStorage.getItem('backupHistory')) || [];
        
        // Add new entry
        const newBackup = {
            date: new Date().toISOString(),
            filename: filename,
            size: formatBytes(new Blob([jsonData]).size)
        };
        
        // Add to history
        backupHistory.push(newBackup);
        
        // Keep only last 10 entries
        while (backupHistory.length > 10) {
            const oldestBackup = backupHistory.shift();
            localStorage.removeItem(`backup_${oldestBackup.filename}`);
        }
        
        // Save updated history
        localStorage.setItem('backupHistory', JSON.stringify(backupHistory));
        
        // Save the actual backup data (limited by localStorage size, approximately 5MB)
        try {
            localStorage.setItem(`backup_${filename}`, jsonData);
        } catch (e) {
            console.warn('Could not save backup to localStorage - too large');
        }
    } catch (error) {
        console.error('Error saving backup to history:', error);
    }
}

// Download JSON data as a file
function downloadJSON(jsonData, filename) {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Handle file selection for restore
function handleFileSelection(file) {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        addLogEntry(`Invalid file type: ${file.type}. Please select a JSON file.`, 'error');
        return;
    }
    
    document.getElementById('restore-step-1').classList.add('hidden');
    document.getElementById('restore-step-2').classList.remove('hidden');
    
    document.getElementById('selected-file-name').textContent = file.name;
    document.getElementById('selected-file-info').textContent = `${formatBytes(file.size)} • ${file.type}`;
    
    // Store file for later use
    window.selectedBackupFile = file;
    
    addLogEntry(`File selected: ${file.name} (${formatBytes(file.size)})`, 'info');
}

// Reset restore UI to initial state
function resetRestoreUI() {
    document.getElementById('restore-step-1').classList.remove('hidden');
    document.getElementById('restore-step-2').classList.add('hidden');
    document.getElementById('restore-step-3').classList.add('hidden');
    
    document.getElementById('restore-progress-container').style.display = 'none';
    document.getElementById('restore-file-input').value = '';
    
    window.selectedBackupFile = null;
}

// Confirm restore action
function confirmRestore() {
    if (!window.selectedBackupFile) {
        addLogEntry('No backup file selected', 'error');
        return;
    }
    
    const restoreOption = document.querySelector('input[name="restore-option"]:checked').id;
    const isReplace = restoreOption === 'restore-replace';
    
    document.getElementById('confirm-modal-title').textContent = 'Confirm Restore';
    document.getElementById('confirm-modal-content').innerHTML = `
        <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-yellow-700">
                        <strong>Warning:</strong> ${isReplace ? 'This will replace all existing data!' : 'This will merge with your existing data.'}
                    </p>
                    <p class="text-sm text-yellow-700 mt-2">
                        Make sure you have a backup of your current data before proceeding.
                    </p>
                </div>
            </div>
        </div>
        <p class="mt-4">Are you sure you want to ${isReplace ? 'replace all existing data' : 'merge data'} with the selected backup file?</p>
    `;
    
    document.getElementById('confirm-proceed-btn').textContent = 'Restore Data';
    
    // Open modal
    document.getElementById('confirm-modal').classList.remove('opacity-0');
    document.getElementById('confirm-modal').classList.remove('pointer-events-none');
    
    // Set confirm action
    document.getElementById('confirm-proceed-btn').onclick = function() {
        closeConfirmModal();
        startRestore();
    };
}

// Close confirmation modal
function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
}

// Start the restore process
function startRestore() {
    if (!window.selectedBackupFile) {
        addLogEntry('No backup file selected', 'error');
        return;
    }
    
    const reader = new FileReader();
    const restoreOption = document.querySelector('input[name="restore-option"]:checked').id;
    const isReplace = restoreOption === 'restore-replace';
    
    // Show progress
    const progressContainer = document.getElementById('restore-progress-container');
    const progressBar = document.getElementById('restore-progress-bar');
    const progressText = document.getElementById('restore-progress');
    const restoreBtn = document.getElementById('restore-btn');
    
    progressContainer.style.display = 'flex';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    restoreBtn.disabled = true;
    restoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Restoring...';
    
    addLogEntry(`Starting ${isReplace ? 'replace' : 'merge'} restore process...`, 'info');
    
    reader.onload = async function(e) {
        try {
            let backupData;
            
            try {
                backupData = JSON.parse(e.target.result);
            } catch (error) {
                throw new Error('Invalid JSON format in backup file');
            }
            
            // Validate backup data structure
            if (!backupData.metadata || !backupData.data) {
                throw new Error('Invalid backup file format - missing metadata or data');
            }
            
            // Log metadata
            addLogEntry(`Backup file metadata: Version ${backupData.metadata.version}, created on ${new Date(backupData.metadata.date).toLocaleString()}, type: ${backupData.metadata.type}`, 'info');
            
            // Start restore process
            await processRestore(backupData, isReplace, updateRestoreProgress);
            
            // Complete progress
            progressBar.style.width = '100%';
            progressText.textContent = '100%';
            
            // Show success UI
            setTimeout(() => {
                document.getElementById('restore-step-2').classList.add('hidden');
                document.getElementById('restore-step-3').classList.remove('hidden');
                
                addLogEntry('Restore completed successfully', 'success');
                window.utils.showNotification('Data restored successfully', 'success');
                
                // Update system info
                loadSystemInfo();
            }, 1000);
        } catch (error) {
            console.error('Restore error:', error);
            addLogEntry(`Error during restore: ${error.message}`, 'error');
            window.utils.showNotification('Error restoring data', 'error');
            
            // Reset UI
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
            progressContainer.style.display = 'none';
            restoreBtn.disabled = false;
            restoreBtn.innerHTML = '<i class="fas fa-upload mr-2"></i>Start Restore';
        }
    };
    
    reader.readAsText(window.selectedBackupFile);
}

// Update restore progress UI
function updateRestoreProgress(progress, message) {
    const progressBar = document.getElementById('restore-progress-bar');
    const progressText = document.getElementById('restore-progress');
    
    const percentage = Math.round(progress * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    
    if (message) {
        addLogEntry(message, 'info');
    }
}

// Process the restore operation
async function processRestore(backupData, isReplace, progressCallback) {
    try {
        // If replacing, clear existing data first
        if (isReplace) {
            await clearAllData();
            progressCallback(0.1, 'Existing data cleared');
        }
        
        // Get collections to restore
        const collections = Object.keys(backupData.data);
        let totalProcessed = 0;
        
        // Process each collection
        for (const collection of collections) {
            const data = backupData.data[collection];
            
            if (!Array.isArray(data)) {
                addLogEntry(`Skipping ${collection}: invalid data format`, 'warning');
                continue;
            }
            
            progressCallback(0.1 + (totalProcessed / collections.length) * 0.9, `Restoring ${collection} (${data.length} records)`);
            
            // Process collection
            await restoreCollection(collection, data, isReplace);
            
            totalProcessed++;
            progressCallback(0.1 + (totalProcessed / collections.length) * 0.9, `Completed ${collection} (${data.length} records)`);
        }
        
        return true;
    } catch (error) {
        console.error('Error in restore process:', error);
        addLogEntry(`Error processing restore: ${error.message}`, 'error');
        throw error;
    }
}

// Clear all data from the database
async function clearAllData() {
    // List of collections to clear
    const collections = [
        'stock',
        'customers',
        'bills',
        'purchases'
    ];
    
    try {
        // Clear each collection
        for (const collection of collections) {
            try {
                // For custom service methods
                if (collection === 'stock') {
                    const items = await window.dbService.getStockItems();
                    for (const item of items || []) {
                        if (typeof window.dbService.deleteStockItem === 'function') {
                            await window.dbService.deleteStockItem(item._id);
                        }
                    }
                    addLogEntry(`Cleared stock items`, 'info');
                }
                else if (collection === 'customers') {
                    const customers = await window.dbService.getCustomers();
                    for (const customer of customers || []) {
                        if (typeof window.dbService.deleteCustomer === 'function') {
                            await window.dbService.deleteCustomer(customer._id);
                        }
                    }
                    addLogEntry(`Cleared customers`, 'info');
                }
                else if (collection === 'bills') {
                    const bills = await window.dbService.getBills();
                    for (const bill of bills || []) {
                        if (typeof window.dbService.deleteBill === 'function') {
                            await window.dbService.deleteBill(bill.id);
                        }
                    }
                    addLogEntry(`Cleared bills`, 'info');
                }
                else if (collection === 'purchases') {
                    // This might need a custom approach based on your database structure
                    addLogEntry(`Skipping clearing purchases - please implement custom logic if needed`, 'warning');
                }
            } catch (e) {
                addLogEntry(`Error clearing ${collection}: ${e.message}`, 'warning');
            }
        }
    } catch (error) {
        console.error('Error clearing data:', error);
        addLogEntry(`Error clearing database: ${error.message}`, 'error');
        throw error;
    }
}

// Restore a specific collection
async function restoreCollection(collection, data, isReplace) {
    if (!data.length) {
        addLogEntry(`No data to restore for ${collection}`, 'info');
        return;
    }
    
    try {
        // Handle based on collection type
        switch (collection) {
            case 'stock':
                await restoreStock(data, isReplace);
                break;
                
            case 'customers':
                await restoreCustomers(data, isReplace);
                break;
                
            case 'bills':
                await restoreBills(data, isReplace);
                break;
                
            case 'purchases':
                await restorePurchases(data, isReplace);
                break;
                
            default:
                addLogEntry(`Unknown collection: ${collection}, skipping`, 'warning');
                break;
        }
        
        addLogEntry(`Restored ${data.length} records to ${collection}`, 'success');
        return true;
    } catch (error) {
        console.error(`Error restoring ${collection}:`, error);
        addLogEntry(`Error restoring ${collection}: ${error.message}`, 'error');
        throw error;
    }
}

// Restore stock items
async function restoreStock(items, isReplace) {
    try {
        // Process in batches for better performance
        const batchSize = 10;
        
        // If not replacing, we need to merge with existing items
        let existingItems = [];
        if (!isReplace) {
            existingItems = await window.dbService.getStockItems() || [];
            
            // Create a map of existing IDs for faster lookups
            const existingIds = new Map();
            existingItems.forEach(item => {
                if (item._id) {
                    existingIds.set(item._id, true);
                }
            });
            
            // Filter out items that already exist
            items = items.filter(item => {
                return !item._id || !existingIds.has(item._id);
            });
            
            addLogEntry(`Filtered out ${existingItems.length - items.length} duplicate items`, 'info');
        }
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            // Process batch
            for (const item of batch) {
                // Generate new ID if not present
                if (!item._id) {
                    item._id = generateUniqueId();
                }
                
                await window.dbService.addStockItem(item);
            }
            
            // Log progress for large batches
            if (i % 100 === 0 && i > 0) {
                addLogEntry(`Processed ${i}/${items.length} stock items...`, 'info');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error restoring stock:', error);
        throw error;
    }
}

// Restore customers
async function restoreCustomers(customers, isReplace) {
    try {
        // Process in batches
        const batchSize = 10;
        
        // If not replacing, we need to merge with existing customers
        let existingCustomers = [];
        if (!isReplace) {
            existingCustomers = await window.dbService.getCustomers() || [];
            
            // Create a map of existing IDs for faster lookups
            const existingIds = new Map();
            existingCustomers.forEach(customer => {
                if (customer._id) {
                    existingIds.set(customer._id, true);
                }
            });
            
            // Filter out customers that already exist
            customers = customers.filter(customer => {
                return !customer._id || !existingIds.has(customer._id);
            });
            
            addLogEntry(`Filtered out ${existingCustomers.length - customers.length} duplicate customers`, 'info');
        }
        
        for (let i = 0; i < customers.length; i += batchSize) {
            const batch = customers.slice(i, i + batchSize);
            
            // Process batch
            for (const customer of batch) {
                // Generate new ID if not present
                if (!customer._id) {
                    customer._id = generateUniqueId();
                }
                
                await window.dbService.addCustomer(customer);
            }
            
            // Log progress for large batches
            if (i % 50 === 0 && i > 0) {
                addLogEntry(`Processed ${i}/${customers.length} customers...`, 'info');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error restoring customers:', error);
        throw error;
    }
}

// Restore bills
async function restoreBills(bills, isReplace) {
    try {
        // If not replacing, we need to merge with existing bills
        let existingBills = [];
        if (!isReplace) {
            existingBills = await window.dbService.getBills() || [];
            
            // Create a map of existing IDs for faster lookups
            const existingIds = new Map();
            existingBills.forEach(bill => {
                if (bill.id) {
                    existingIds.set(bill.id, true);
                }
            });
            
            // Filter out bills that already exist
            bills = bills.filter(bill => {
                return !bill.id || !existingIds.has(bill.id);
            });
            
            addLogEntry(`Filtered out ${existingBills.length - bills.length} duplicate bills`, 'info');
        }
        
        // Process each bill
        for (let i = 0; i < bills.length; i++) {
            const bill = bills[i];
            await window.dbService.addBill(bill);
            
            // Log progress for large numbers
            if (i % 50 === 0 && i > 0) {
                addLogEntry(`Processed ${i}/${bills.length} bills...`, 'info');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error restoring bills:', error);
        throw error;
    }
}

// Restore purchases
async function restorePurchases(purchases, isReplace) {
    try {
        addLogEntry(`Purchases restoration not fully implemented - your database structure needs custom implementation`, 'warning');
        return true;
    } catch (error) {
        console.error('Error restoring purchases:', error);
        throw error;
    }
}

// Generate unique ID for records that don't have one
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}

// Add a log entry to the restore log
function addLogEntry(message, type = 'info') {
    const log = document.getElementById('restore-log');
    const timestamp = new Date().toLocaleTimeString();
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${timestamp}] ${message}`;
    
    log.appendChild(entry);
    
    // Scroll to bottom
    log.scrollTop = log.scrollHeight;
}