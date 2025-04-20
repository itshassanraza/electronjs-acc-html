/**
 * dashboard-ledger-fix.js
 * Provides integration between dashboard.js and the backup-restore cleaning functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard ledger fix loading...');
    
    // Register a handler for database cleanup events
    document.addEventListener('database-cleanup-needed', async function(event) {
        console.log('Database cleanup event received in dashboard');
        if (window.clearLedgerData && typeof window.clearLedgerData === 'function') {
            await window.clearLedgerData();
            console.log('Ledger data cleared via dashboard integration');
        }
    });

    // Create a global function to clear ledger data from localStorage 
    window.clearLedgerData = async function() {
        console.log('Dashboard clearing ledger data...');
        
        try {
            // First try the aggressive trade ledger cleaner if available
            if (window.cleanTradeLedgerData && typeof window.cleanTradeLedgerData === 'function') {
                await window.cleanTradeLedgerData();
            }
            
            // Direct approach - remove all trade and ledger related keys
            const keysToRemove = [
                // Trade ledgers
                'payables', 'receivables', 'tradePayable', 'tradeReceivable',
                
                // Cash and bank ledgers
                'cashLedger', 'bankLedger', 'cashTransactions', 'bankTransactions',
                
                // Any other ledger-related keys
                'ledgerData', 'ledgerEntries'
            ];
            
            // Remove all keys
            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                    console.log(`Removed ${key} from localStorage`);
                } catch (e) {
                    console.error(`Error removing ${key}:`, e);
                }
            });
            
            // Verification step
            let failed = false;
            ['payables', 'receivables', 'tradePayable', 'tradeReceivable'].forEach(key => {
                if (localStorage.getItem(key)) {
                    console.warn(`⚠️ ${key} still exists in localStorage after removal attempt`);
                    failed = true;
                    
                    // Last resort - set to empty array
                    try {
                        localStorage.setItem(key, '[]');
                        console.log(`Reset ${key} to empty array as fallback`);
                    } catch (e) {
                        console.error(`Failed to reset ${key}:`, e);
                    }
                }
            });
            
            if (failed) {
                console.warn('Some keys could not be fully removed - used reset as fallback');
            } else {
                console.log('✅ All ledger keys successfully removed from localStorage');
            }
            
            // Reset dashboard balances
            try {
                await loadBalances();
                console.log('Dashboard balances reloaded');
            } catch (e) {
                console.error('Error reloading balances:', e);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to clear ledger data:', error);
            return false;
        }
    };
    
    // Initialize function to ensure no old data persists
    const checkForCleanFlag = () => {
        if (localStorage.getItem('_forceCleanReload') === 'true') {
            console.log('Clean reload detected, ensuring ledgers are cleared');
            localStorage.removeItem('_forceCleanReload');
            window.clearLedgerData();
        }
    };
    
    // Run the check after a short delay to ensure other scripts have loaded
    setTimeout(checkForCleanFlag, 1000);
    
    console.log('Dashboard ledger fix loaded successfully');
});
