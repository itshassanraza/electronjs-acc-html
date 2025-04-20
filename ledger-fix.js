/**
 * ledger-fix.js - Fixes for Trade Receivable and Trade Payable ledger pages
 * This script ensures proper data loading and display on the ledger pages
 */

(function() {
    console.log('Loading ledger fixes...');
    
    // Helper function to detect current page
    function getCurrentPage() {
        const url = window.location.href;
        if (url.includes('trade-payable-ledger')) return 'payable';
        if (url.includes('trade-receivable-ledger')) return 'receivable';
        return null;
    }
    
    // Fix for loadPayables function - replace or patch it if it exists
    if (typeof loadPayables === 'function') {
        console.log('Found loadPayables function, patching it for reliability');
        const originalLoadPayables = loadPayables;
        
        window.loadPayables = async function() {
            console.log('Enhanced loadPayables called');
            
            try {
                // First try to load with the enhanced method
                let payables = await window.dbService.getPayables();
                
                // If no payables were found, try direct retrieval methods as fallback
                if (!payables || payables.length === 0) {
                    console.log('No payables found with enhanced method, trying direct access');
                    
                    // Try direct localStorage access
                    try {
                        const storedPayables = localStorage.getItem('payables');
                        const storedTradePayable = localStorage.getItem('tradePayable');
                        
                        if (storedPayables) {
                            payables = JSON.parse(storedPayables);
                            console.log(`Found ${payables.length} payables in localStorage.payables`);
                        } else if (storedTradePayable) {
                            payables = JSON.parse(storedTradePayable);
                            console.log(`Found ${payables.length} payables in localStorage.tradePayable`);
                        }
                    } catch (e) {
                        console.warn('Error accessing localStorage for payables:', e);
                    }
                    
                    // Try direct DB access if still no results
                    if ((!payables || payables.length === 0) && window.db) {
                        try {
                            payables = await window.db.get('tradePayable') || [];
                            console.log(`Direct DB access found ${payables.length} payables`);
                        } catch (e) {
                            console.warn('Error with direct DB access for payables:', e);
                        }
                    }
                }
                
                // Store payables for rendering
                if (window.payableFilteredItems !== undefined) {
                    window.payableFilteredItems = payables;
                }
                if (window.payableTotalItems !== undefined) {
                    window.payableTotalItems = payables.length;
                }
                
                // Debug info
                console.log(`Enhanced loadPayables found ${payables?.length || 0} payables`);
                
                // Call the UI update functions
                if (typeof updatePayablesSummary === 'function') {
                    updatePayablesSummary(payables);
                }
                if (typeof renderPayablesTable === 'function') {
                    renderPayablesTable();
                }
                if (typeof setupPayablePaginationControls === 'function') {
                    setupPayablePaginationControls();
                }
                
                return payables;
            } catch (error) {
                console.error('Error in enhanced loadPayables:', error);
                
                // Try original function as last resort
                try {
                    return await originalLoadPayables();
                } catch (e) {
                    console.error('Original loadPayables also failed:', e);
                    return [];
                }
            }
        };
    }
    
    // Similar fix for loadReceivables function
    if (typeof loadReceivables === 'function') {
        console.log('Found loadReceivables function, patching it for reliability');
        const originalLoadReceivables = loadReceivables;
        
        window.loadReceivables = async function() {
            console.log('Enhanced loadReceivables called');
            
            try {
                // First try to load with the enhanced method
                let receivables = await window.dbService.getReceivables();
                
                // If no receivables were found, try direct retrieval methods as fallback
                if (!receivables || receivables.length === 0) {
                    console.log('No receivables found with enhanced method, trying direct access');
                    
                    // Try direct localStorage access
                    try {
                        const storedReceivables = localStorage.getItem('receivables');
                        const storedTradeReceivable = localStorage.getItem('tradeReceivable');
                        
                        if (storedReceivables) {
                            receivables = JSON.parse(storedReceivables);
                            console.log(`Found ${receivables.length} receivables in localStorage.receivables`);
                        } else if (storedTradeReceivable) {
                            receivables = JSON.parse(storedTradeReceivable);
                            console.log(`Found ${receivables.length} receivables in localStorage.tradeReceivable`);
                        }
                    } catch (e) {
                        console.warn('Error accessing localStorage for receivables:', e);
                    }
                    
                    // Try direct DB access if still no results
                    if ((!receivables || receivables.length === 0) && window.db) {
                        try {
                            receivables = await window.db.get('tradeReceivable') || [];
                            console.log(`Direct DB access found ${receivables.length} receivables`);
                        } catch (e) {
                            console.warn('Error with direct DB access for receivables:', e);
                        }
                    }
                }
                
                // Store receivables for rendering
                if (window.receivableFilteredItems !== undefined) {
                    window.receivableFilteredItems = receivables;
                }
                if (window.receivableTotalItems !== undefined) {
                    window.receivableTotalItems = receivables.length;
                }
                
                // Debug info
                console.log(`Enhanced loadReceivables found ${receivables?.length || 0} receivables`);
                
                // Call the UI update functions
                if (typeof updateReceivablesSummary === 'function') {
                    updateReceivablesSummary(receivables);
                }
                if (typeof renderReceivablesTable === 'function') {
                    renderReceivablesTable();
                }
                if (typeof setupReceivablePaginationControls === 'function') {
                    setupReceivablePaginationControls();
                }
                
                return receivables;
            } catch (error) {
                console.error('Error in enhanced loadReceivables:', error);
                
                // Try original function as last resort
                try {
                    return await originalLoadReceivables();
                } catch (e) {
                    console.error('Original loadReceivables also failed:', e);
                    return [];
                }
            }
        };
    }
    
    // Execute immediate fixes based on current page
    document.addEventListener('DOMContentLoaded', function() {
        const currentPage = getCurrentPage();
        
        if (currentPage) {
            console.log(`Applying immediate fixes for ${currentPage} ledger page`);
            
            // Force data synchronization and reload after a short delay
            setTimeout(async function() {
                await window.dbService.syncLedgerData();
                
                if (currentPage === 'payable' && typeof loadPayables === 'function') {
                    console.log('Forcing payables data reload');
                    loadPayables();
                } else if (currentPage === 'receivable' && typeof loadReceivables === 'function') {
                    console.log('Forcing receivables data reload');
                    loadReceivables();
                }
            }, 300);
        }
    });
    
    console.log('Ledger fixes loaded successfully');
})();
