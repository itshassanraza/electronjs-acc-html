/**
 * backup-restore-update.js - Extension for backup-restore.js
 * Adds additional functionality to clear cash and bank ledger data
 */

// Extended clearAllData function
window.extendedClearAllData = async function() {
    try {
        // Function implementation
        // Force reload but with parameter to signal we're after a clean operation
        setTimeout(() => {
            window.location.href = window.location.pathname + '?cleaned=true&t=' + Date.now();
        }, 1500);
        
        return true;
    } catch (error) {
        console.error('Error in extended clearAllData function:', error);
        addLogEntry(`Error clearing data: ${error.message}`, 'error');
        throw error;
    }
};

// Add a specific function to aggressively clean trade ledger data
window.cleanTradeLedgerData = async function() {
    console.log('🧹 AGGRESSIVE TRADE LEDGER CLEANING INITIATED 🧹');
    
    // Specific ledger keys that must be removed
    const criticalKeys = [
        'payables', 'receivables', 'tradePayable', 'tradeReceivable',
        'cashLedger', 'bankLedger', 'cashTransactions', 'bankTransactions'
    ];
    
    // Remove all critical keys
    let removedCount = 0;
    criticalKeys.forEach(key => {
        try {
            if (localStorage.getItem(key)) {
                console.log(`🗑️ Removing ${key} from localStorage`);
                localStorage.removeItem(key);
                removedCount++;
            }
        } catch (e) {
            console.error(`Error removing ${key}:`, e);
        }
    });
    
    // Double check to make sure they're gone
    let remainingKeys = [];
    criticalKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            remainingKeys.push(key);
        }
    });
    
    if (remainingKeys.length > 0) {
        console.warn(`⚠️ These keys still exist and need manual cleaning: ${remainingKeys.join(', ')}`);
        // Try force cleaning approach
        try {
            console.log('🧨 Attempting force reset of stubborn keys');
            remainingKeys.forEach(key => {
                localStorage.setItem(key, '[]'); // Set to empty array as a last resort
            });
        } catch (e) {
            console.error('Force reset failed:', e);
        }
    } else {
        console.log('✅ All critical ledger keys successfully removed from localStorage');
    }
    
    // Return true if all keys were successfully removed
    return (remainingKeys.length === 0 || removedCount === criticalKeys.length);
};

// Update the existing clearAllData function to use our enhanced trade ledger cleaning
const originalClearAllData = window.clearAllData;
window.clearAllData = async function() {
    try {
        // Call the original clearAllData first if it exists
        if (typeof originalClearAllData === 'function') {
            await originalClearAllData();
        }
        
        // Now perform our enhanced trade ledger cleaning
        await window.cleanTradeLedgerData();
        
        // Set cleaning flag
        window._justCleaned = true;
        
        // Force reload page
        localStorage.setItem('_forceCleanReload', 'true');
        setTimeout(() => {
            window.location.href = window.location.pathname + '?cleaned=true&t=' + Date.now();
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('Error in clearAllData function:', error);
        return false;
    }
};

// Add this at the top level to catch post-reload initialization
if (sessionStorage.getItem('_forcedClean') === 'true' || window.location.search.includes('cleaned=true')) {
    console.log('Page loaded after database cleaning operation');
    window._justCleaned = true;
    
    // Clear the session storage flag
    setTimeout(() => {
        sessionStorage.removeItem('_forcedClean');
    }, 1000);
    
    // Prevent automatic reinitialization of data
    const originalInitializeData = window.dbService.initializeData;
    window.dbService.initializeData = function() {
        console.log('Skipping database initialization after clean');
        return Promise.resolve();
    };
}

// Add support for restoring ledger data if it exists in backup
const originalProcessRestore = window.processRestore;
if (originalProcessRestore) {
    window.processRestore = async function(backupData, isReplace, progressCallback) {
        await originalProcessRestore(backupData, isReplace, progressCallback);
        
        // Check for and restore ledger data if present in the backup
        try {
            const collections = ['cashLedger', 'bankLedger', 'tradeReceivableLedger', 'tradePayableLedger'];
            
            for (const collection of collections) {
                if (backupData.data && backupData.data[collection] && Array.isArray(backupData.data[collection])) {
                    const data = backupData.data[collection];
                    if (data.length) {
                        // Store in localStorage as a simple fallback
                        localStorage.setItem(collection, JSON.stringify(data));
                        addLogEntry(`Restored ${data.length} records to ${collection}`, 'success');
                    }
                }
            }
        } catch (e) {
            addLogEntry(`Error restoring ledger data: ${e.message}`, 'warning');
        }
    };
}

// Add the clean database button functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Setting up clean database button...');
    const cleanDbButton = document.getElementById('clean-db-btn');
    if (cleanDbButton) {
        console.log('Clean database button found, adding event listener');
        cleanDbButton.addEventListener('click', confirmCleanDatabase);
    } else {
        console.error('Clean database button not found in DOM');
        
        // Check if we need to add the button to the page
        setTimeout(() => {
            const systemInfo = document.querySelector('.mt-6.bg-white.rounded-lg.shadow-md.p-6');
            if (systemInfo && !document.getElementById('clean-db-btn')) {
                console.log('Adding clean database button to system info section');
                
                // Create danger zone section
                const dangerZone = document.createElement('div');
                dangerZone.className = 'mt-6 pt-4 border-t border-gray-200';
                dangerZone.innerHTML = `
                    <div class="flex flex-col md:flex-row items-center justify-between">
                        <div class="mb-4 md:mb-0">
                            <h4 class="font-semibold text-red-600">Danger Zone</h4>
                            <p class="text-sm text-gray-600">This action will permanently delete all data from the application.</p>
                        </div>
                        <button id="clean-db-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center">
                            <i class="fas fa-trash-alt mr-2"></i>
                            Clean Database
                        </button>
                    </div>
                `;
                
                // Add to page
                systemInfo.appendChild(dangerZone);
                
                // Add event listener
                document.getElementById('clean-db-btn').addEventListener('click', confirmCleanDatabase);
            }
        }, 500);
    }
});

// Function to confirm and handle database cleaning
function confirmCleanDatabase() {
    console.log('Clean database confirmation dialog triggered');
    
    // Make sure we have access to the modal functions
    if (typeof closeConfirmModal !== 'function') {
        // Define it if not available
        window.closeConfirmModal = function() {
            const modal = document.getElementById('confirm-modal');
            if (modal) {
                modal.classList.add('opacity-0');
                modal.classList.add('pointer-events-none');
            } else {
                console.error('Confirm modal element not found');
            }
        };
    }
    
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalTitle = document.getElementById('confirm-modal-title');
    const confirmModalContent = document.getElementById('confirm-modal-content');
    const confirmProceedBtn = document.getElementById('confirm-proceed-btn');
    
    if (!confirmModal || !confirmModalTitle || !confirmModalContent || !confirmProceedBtn) {
        console.error('Confirmation modal elements not found!');
        alert('Cannot display confirmation dialog. Please try refreshing the page.');
        return;
    }
    
    confirmModalTitle.textContent = 'Clean Database';
    confirmModalContent.innerHTML = `
        <div class="bg-red-50 border-l-4 border-red-400 p-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-red-600"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-red-700">
                        <strong>Warning:</strong> This will permanently delete ALL data from the application.
                    </p>
                    <p class="text-sm text-red-700 mt-2">
                        This action cannot be undone. Please create a backup first if needed.
                    </p>
                </div>
            </div>
        </div>
        <p class="mt-4">Are you absolutely sure you want to delete all application data?</p>
    `;
    
    confirmProceedBtn.textContent = 'Delete All Data';
    confirmProceedBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
    confirmProceedBtn.classList.add('bg-red-700', 'hover:bg-red-800');
    
    // Open modal
    confirmModal.classList.remove('opacity-0');
    confirmModal.classList.remove('pointer-events-none');
    
    // Set confirm action
    confirmProceedBtn.onclick = async function() {
        console.log('Clean database confirmed, starting cleanup...');
        window.closeConfirmModal();
        
        // Show loading state
        const cleanDbBtn = document.getElementById('clean-db-btn');
        if (cleanDbBtn) {
            cleanDbBtn.disabled = true;
            cleanDbBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Cleaning...';
        }
        
        try {
            // Call the clearAllData function
            await window.clearAllData();
            
            // Update system info
            if (typeof loadSystemInfo === 'function') {
                loadSystemInfo();
            }
            
            // Show success message
            if (window.utils && typeof window.utils.showNotification === 'function') {
                window.utils.showNotification('Database has been cleaned successfully', 'success');
            } else {
                alert('Database has been cleaned successfully');
            }
        } catch (error) {
            console.error('Error cleaning database:', error);
            
            if (window.utils && typeof window.utils.showNotification === 'function') {
                window.utils.showNotification('Error cleaning database: ' + error.message, 'error');
            } else {
                alert('Error cleaning database: ' + error.message);
            }
        } finally {
            // Reset button state
            if (cleanDbBtn) {
                cleanDbBtn.disabled = false;
                cleanDbBtn.innerHTML = '<i class="fas fa-trash-alt mr-2"></i>Clean Database';
            }
            
            // Reset confirm button style
            confirmProceedBtn.classList.remove('bg-red-700', 'hover:bg-red-800');
            confirmProceedBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        }
    };
}

console.log('Backup & restore functionality enhanced with complete ledger data reset support');