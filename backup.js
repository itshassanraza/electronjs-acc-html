// Update the cleanDatabase function to properly handle all collections
async function cleanDatabase() {
    if (!confirm('WARNING: This will delete ALL data from the system. This action cannot be undone. Continue?')) {
        return;
    }
    
    try {
        showLoadingIndicator('Cleaning database...');
        
        // Set a flag to prevent immediate reinitialization (persists across page loads)
        localStorage.setItem('_justCleaned', 'true');
        sessionStorage.setItem('_justCleaned', 'true');
        window._justCleaned = true;
        
        // Create a special CLEAN_MODE flag for maximum compatibility with old code
        localStorage.setItem('CLEAN_MODE', 'true');
        window.CLEAN_MODE = true;
        
        console.log('⚠️ PERFORMING COMPLETE DATABASE CLEANUP ⚠️');
        
        // List of all collections to clean - include all possible variations of names
        const collections = [
            // Main collections
            'customers',
            'stock',
            'bills',
            'expenses',
            'purchases',
            'receipts',
            'payments',
            
            // Cash ledger variations
            'cashLedger',
            'cash_ledger',
            'cash_transactions',
            'cashTransactions',
            
            // Bank ledger variations
            'bankLedger',
            'bank_ledger',
            'bank_transactions',
            'bankTransactions',
            
            // Payables variations
            'payables',
            'tradePayable',
            'trade_payable',
            
            // Receivables variations
            'receivables',
            'tradeReceivable',
            'trade_receivable'
        ];
        
        // PHASE 1: Multi-method approach to clear all collections
        for (const collection of collections) {
            try {
                console.log(`Cleaning collection: ${collection}`);
                
                // Method 1: Using set to empty array
                if (window.db && typeof window.db.set === 'function') {
                    await window.db.set(collection, []);
                    console.log(`Cleared collection: ${collection} via set method`);
                }
                
                // Method 2: Using remove all
                if (window.db && typeof window.db.remove === 'function') {
                    try {
                        await window.db.remove(collection, {}, { multi: true });
                        console.log(`Cleared collection: ${collection} via remove method`);
                    } catch (e) {
                        console.warn(`Remove method failed for ${collection}, this is normal:`, e);
                    }
                }
                
                // Method 3: Clear localStorage
                localStorage.removeItem(collection);
                console.log(`Cleared ${collection} from localStorage`);
                
            } catch (error) {
                console.error(`Error clearing collection ${collection}:`, error);
            }
        }
        
        // PHASE 2: Direct aggressive ledger cleaning
        // Directly manipulate in-memory ledger variables if they exist
        if (typeof window.cashLedger !== 'undefined') window.cashLedger = [];
        if (typeof window.bankLedger !== 'undefined') window.bankLedger = [];
        if (typeof window.payables !== 'undefined') window.payables = [];
        if (typeof window.receivables !== 'undefined') window.receivables = [];
        if (typeof window.tradePayable !== 'undefined') window.tradePayable = [];
        if (typeof window.tradeReceivable !== 'undefined') window.tradeReceivable = [];
        
        // Clear any tracking arrays for deleted items
        localStorage.removeItem('deletedReceiptIds');
        localStorage.removeItem('deletedPaymentIds');
        localStorage.removeItem('deletedBillIds');
        localStorage.removeItem('deletedPurchaseIds');
        
        // PHASE 3: Use dedicated cleaning utility if available
        if (window.dbService && typeof window.dbService.resetLedgerData === 'function') {
            await window.dbService.resetLedgerData();
            console.log('Used specialized resetLedgerData utility for deep cleaning');
        }
        
        // PHASE 4: Disable auto-initialization temporarily by overriding methods
        if (window.dbService) {
            // Intercept cash transaction getter
            if (typeof window.dbService.getCashTransactions === 'function') {
                const originalGetCashTransactions = window.dbService.getCashTransactions;
                window.dbService.getCashTransactions = function() {
                    console.log('Intercept: Returning empty cash ledger after cleaning');
                    return Promise.resolve([]);
                };
                
                // Restore after 60 seconds
                setTimeout(() => {
                    window.dbService.getCashTransactions = originalGetCashTransactions;
                }, 60000);
            }
            
            // Intercept bank transaction getter
            if (typeof window.dbService.getBankTransactions === 'function') {
                const originalGetBankTransactions = window.dbService.getBankTransactions;
                window.dbService.getBankTransactions = function() {
                    console.log('Intercept: Returning empty bank ledger after cleaning');
                    return Promise.resolve([]);
                };
                
                // Restore after 60 seconds
                setTimeout(() => {
                    window.dbService.getBankTransactions = originalGetBankTransactions;
                }, 60000);
            }
            
            // Intercept initialization
            const originalInitializeData = window.dbService.initializeData;
            window.dbService.initializeData = function() {
                console.log('Initialization prevented after database cleaning');
                return Promise.resolve();
            };
            
            // Restore initialization after 60 seconds
            setTimeout(() => {
                window.dbService.initializeData = originalInitializeData;
            }, 60000);
        }
        
        // Clear the clean flags after a timeout
        setTimeout(() => {
            localStorage.removeItem('_justCleaned');
            localStorage.removeItem('CLEAN_MODE');
            sessionStorage.removeItem('_justCleaned');
            window._justCleaned = false;
            window.CLEAN_MODE = false;
        }, 60000); // 1 minute
        
        hideLoadingIndicator();
        showNotification('Database cleaned successfully', 'success');
        
        // Reload page after short delay with special parameters
        setTimeout(() => {
            window.location.href = window.location.pathname + '?cleaned=true&nocache=' + Date.now();
        }, 2000);
        
    } catch (error) {
        hideLoadingIndicator();
        console.error('Error cleaning database:', error);
        showNotification('Error cleaning database', 'error');
    }
}
