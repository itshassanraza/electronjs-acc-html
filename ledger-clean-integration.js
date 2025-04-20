/**
 * ledger-clean-integration.js
 * Provides integration for the Clean Database button in backup/restore page
 * and ensures all ledger data is properly cleared
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Ledger clean integration loading...');
    
    // Function to modify the clean database button behavior
    function enhanceCleanDatabaseButton() {
        // Find any clean database buttons
        const cleanButtons = document.querySelectorAll(
            'button[data-action="clean-database"], #clean-database-btn, .clean-database-btn'
        );
        
        if (cleanButtons.length === 0) {
            console.log('No clean database buttons found');
            return;
        }
        
        console.log(`Found ${cleanButtons.length} clean database button(s)`);
        
        cleanButtons.forEach(button => {
            // Store the original onclick handler
            const originalClickHandler = button.onclick;
            
            // Replace with our enhanced handler
            button.onclick = async function(e) {
                console.log('Clean database button clicked, showing confirmation dialog');
                
                if (window.confirm('This will clean ALL database data including ledgers. This cannot be undone. Continue?')) {
                    try {
                        console.log('Cleaning database and ledgers...');
                        
                        // First, attempt to call dashboard ledger cleaning function
                        if (window.clearLedgerData && typeof window.clearLedgerData === 'function') {
                            await window.clearLedgerData();
                            console.log('Ledger data cleared via dashboard integration');
                        }
                        
                        // For redundancy, also dispatch a custom event that dashboard might listen for
                        document.dispatchEvent(new CustomEvent('database-cleanup-needed'));
                        
                        // Direct approach - force clean critical keys
                        const criticalKeys = [
                            'payables', 'receivables', 'tradePayable', 'tradeReceivable',
                            'cashLedger', 'bankLedger'
                        ];
                        
                        criticalKeys.forEach(key => {
                            try {
                                localStorage.removeItem(key);
                                console.log(`Removed ${key} directly`);
                            } catch (e) {
                                console.error(`Error removing ${key}:`, e);
                                // Last resort - set to empty array
                                try {
                                    localStorage.setItem(key, '[]');
                                } catch (innerError) {
                                    console.error(`Failed to reset ${key}:`, innerError);
                                }
                            }
                        });
                        
                        // Call original handler if it exists
                        if (typeof originalClickHandler === 'function') {
                            originalClickHandler.call(this, e);
                        }
                        
                        alert('Database and ledgers cleaned successfully! The page will now reload.');
                        
                        // Force page reload to apply changes
                        setTimeout(() => {
                            window.location.href = window.location.pathname + '?cleaned=true&t=' + Date.now();
                        }, 500);
                    } catch (error) {
                        console.error('Error during database cleaning:', error);
                        alert('An error occurred during database cleaning. See console for details.');
                    }
                }
            };
        });
    }
    
    // Try multiple times to find and enhance the button
    // (in case it's added to the DOM after our script runs)
    setTimeout(enhanceCleanDatabaseButton, 500);
    setTimeout(enhanceCleanDatabaseButton, 1500);
    
    // Add app diagnostics function to help with build issues
    function runAppDiagnostics() {
        try {
            console.log('Running app diagnostics...');
            
            // Check localStorage accessibility
            try {
                localStorage.setItem('_test_key', 'test_value');
                localStorage.removeItem('_test_key');
                console.log('✅ localStorage is accessible');
            } catch (e) {
                console.error('❌ localStorage access error:', e);
            }
            
            // Check for corrupt JSON in localStorage items
            let corruptItems = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                try {
                    const value = localStorage.getItem(key);
                    if (value && value[0] === '{' || value[0] === '[') {
                        JSON.parse(value); // Try to parse any JSON-like values
                    }
                } catch (e) {
                    console.error(`❌ Corrupt JSON found in localStorage key: ${key}`);
                    corruptItems.push(key);
                }
            }
            
            // Fix any corrupt items by resetting them
            if (corruptItems.length > 0) {
                console.warn(`Found ${corruptItems.length} corrupt items in localStorage. Attempting to fix...`);
                corruptItems.forEach(key => {
                    try {
                        localStorage.setItem(key, '[]');
                        console.log(`Reset corrupt key: ${key}`);
                    } catch (e) {
                        console.error(`Failed to reset corrupt key ${key}:`, e);
                    }
                });
            }
            
            // Get app version and environment info for debugging
            const appInfo = {
                userAgent: navigator.userAgent,
                platformName: navigator.platform,
                language: navigator.language,
                screenSize: `${window.screen.width}x${window.screen.height}`,
                windowSize: `${window.innerWidth}x${window.innerHeight}`,
                localStorage: localStorage.length,
                timestamp: new Date().toISOString()
            };
            console.log('App info:', appInfo);
            
            console.log('App diagnostics complete');
        } catch (e) {
            console.error('Error running app diagnostics:', e);
        }
    }
    
    // Run diagnostics after a delay to ensure app is loaded
    setTimeout(runAppDiagnostics, 2000);
    
    // Create a safer version of localStorage operations
    window.safeStorage = {
        get: function(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                if (value === null) return defaultValue;
                try {
                    return JSON.parse(value);
                } catch (e) {
                    console.warn(`Error parsing JSON for key ${key}, returning raw value`);
                    return value;
                }
            } catch (e) {
                console.error(`Error getting ${key} from localStorage:`, e);
                return defaultValue;
            }
        },
        
        set: function(key, value) {
            try {
                const stringValue = typeof value === 'string' ? 
                    value : JSON.stringify(value);
                localStorage.setItem(key, stringValue);
                return true;
            } catch (e) {
                console.error(`Error setting ${key} in localStorage:`, e);
                return false;
            }
        }
    };
    
    console.log('Ledger clean integration loaded successfully');
});
