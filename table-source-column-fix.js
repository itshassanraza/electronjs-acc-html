/**
 * Source column addition for trade ledger tables
 * This script enhances tables to show transaction sources
 */

(function() {
    console.log('🔄 Table source column enhancement loading...');
    
    // Helper to determine transaction source
    function determinePayableSource(payable) {
        // Check for specific properties to identify the source
        if (payable.purchaseId || (payable.description && payable.description.toLowerCase().includes('purchase'))) {
            return 'Purchasing';
        } else if (payable.paymentReference || 
                   payable.paymentMethod || 
                   (payable.description && payable.description.toLowerCase().includes('payment'))) {
            return 'Payments';
        } else if (payable.vendorId && payable.vendor) {
            return 'Purchasing';
        } else {
            return 'Unknown';
        }
    }
    
    function determineReceivableSource(receivable) {
        // Check for specific properties to identify the source
        if (receivable.billId || 
            (receivable.description && receivable.description.toLowerCase().includes('invoice')) ||
            receivable.invoiceId) {
            return 'Billing';
        } else if (receivable.receiptId || 
                  receivable.receiptType || 
                  (receivable.description && receivable.description.toLowerCase().includes('receipt'))) {
            return 'Receipts';
        } else if (receivable.customerId && receivable.customer) {
            return 'Billing';
        } else {
            return 'Unknown';
        }
    }
    
    // Function to add source column to trade payable table header
    function addPayableTableSourceColumn() {
        const table = document.querySelector('table:has(thead > tr > th:contains("VENDOR"))');
        if (!table) return false;
        
        const headerRow = table.querySelector('thead > tr');
        if (!headerRow) return false;
        
        // Check if source column already exists
        if (headerRow.querySelector('th:contains("SOURCE")')) return true;
        
        // Insert source column header before actions column
        const sourceHeader = document.createElement('th');
        sourceHeader.className = 'px-4 py-2';
        sourceHeader.textContent = 'SOURCE';
        
        // Find the action column (usually last)
        const actionHeader = headerRow.querySelector('th:last-child');
        if (actionHeader) {
            headerRow.insertBefore(sourceHeader, actionHeader);
            console.log('✅ Added SOURCE column to payable table header');
            return true;
        } else {
            // Append at the end if actions column not found
            headerRow.appendChild(sourceHeader);
            console.log('✅ Added SOURCE column to payable table header (at end)');
            return true;
        }
    }
    
    // Function to add source column to trade receivable table header
    function addReceivableTableSourceColumn() {
        const table = document.querySelector('table:has(thead > tr > th:contains("CUSTOMER"))');
        if (!table) return false;
        
        const headerRow = table.querySelector('thead > tr');
        if (!headerRow) return false;
        
        // Check if source column already exists
        if (headerRow.querySelector('th:contains("SOURCE")')) return true;
        
        // Insert source column header before actions column
        const sourceHeader = document.createElement('th');
        sourceHeader.className = 'px-4 py-2';
        sourceHeader.textContent = 'SOURCE';
        
        // Find the action column (usually last)
        const actionHeader = headerRow.querySelector('th:last-child');
        if (actionHeader) {
            headerRow.insertBefore(sourceHeader, actionHeader);
            console.log('✅ Added SOURCE column to receivable table header');
            return true;
        } else {
            // Append at the end if actions column not found
            headerRow.appendChild(sourceHeader);
            console.log('✅ Added SOURCE column to receivable table header (at end)');
            return true;
        }
    }
    
    // Function to add source data to payable table rows
    function enhancePayableTableRows() {
        const table = document.querySelector('table:has(thead > tr > th:contains("VENDOR"))');
        if (!table) return false;
        
        // Make sure the header has the source column
        if (!addPayableTableSourceColumn()) return false;
        
        // Process each row in the table
        const rows = table.querySelectorAll('tbody > tr');
        let modifiedCount = 0;
        
        rows.forEach(row => {
            // Skip rows that already have a source cell or are empty message rows
            if (row.querySelector('td[data-source]') || row.cells.length <= 1) return;
            
            // Get the payable ID from the row
            const idCell = row.cells[0];
            const payableId = idCell ? idCell.textContent.trim() : '';
            
            // Create source cell
            const sourceCell = document.createElement('td');
            sourceCell.className = 'px-4 py-2';
            sourceCell.setAttribute('data-source', 'added');
            
            // Try to determine source from data attributes or row content
            let source = 'Unknown';
            
            if (payableId) {
                // Try to find the payable object in window variables
                const foundPayable = findPayableById(payableId);
                if (foundPayable) {
                    source = determinePayableSource(foundPayable);
                } else {
                    // Try to infer from other row content
                    const vendorCell = row.cells[2] ? row.cells[2].textContent.trim() : '';
                    if (vendorCell && row.innerHTML.includes('purchase')) {
                        source = 'Purchasing';
                    } else if (row.innerHTML.includes('payment')) {
                        source = 'Payments';
                    }
                }
            }
            
            // Add source badge with appropriate color
            let badgeClass = 'bg-gray-100 text-gray-800';
            if (source === 'Purchasing') {
                badgeClass = 'bg-blue-100 text-blue-800';
            } else if (source === 'Payments') {
                badgeClass = 'bg-green-100 text-green-800';
            }
            
            sourceCell.innerHTML = `
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}">
                    ${source}
                </span>
            `;
            
            // Find where to insert the source cell (before actions column)
            const actionCell = row.querySelector('td:last-child');
            if (actionCell) {
                row.insertBefore(sourceCell, actionCell);
            } else {
                row.appendChild(sourceCell);
            }
            
            modifiedCount++;
        });
        
        console.log(`✅ Enhanced ${modifiedCount} payable table rows with source information`);
        return true;
    }
    
    // Function to add source data to receivable table rows
    function enhanceReceivableTableRows() {
        const table = document.querySelector('table:has(thead > tr > th:contains("CUSTOMER"))');
        if (!table) return false;
        
        // Make sure the header has the source column
        if (!addReceivableTableSourceColumn()) return false;
        
        // Process each row in the table
        const rows = table.querySelectorAll('tbody > tr');
        let modifiedCount = 0;
        
        rows.forEach(row => {
            // Skip rows that already have a source cell or are empty message rows
            if (row.querySelector('td[data-source]') || row.cells.length <= 1) return;
            
            // Get the receivable ID from the row
            const idCell = row.cells[0];
            const receivableId = idCell ? idCell.textContent.trim() : '';
            
            // Create source cell
            const sourceCell = document.createElement('td');
            sourceCell.className = 'px-4 py-2';
            sourceCell.setAttribute('data-source', 'added');
            
            // Try to determine source from data attributes or row content
            let source = 'Unknown';
            
            if (receivableId) {
                // Try to find the receivable object in window variables
                const foundReceivable = findReceivableById(receivableId);
                if (foundReceivable) {
                    source = determineReceivableSource(foundReceivable);
                } else {
                    // Try to infer from other row content
                    const customerCell = row.cells[2] ? row.cells[2].textContent.trim() : '';
                    if (customerCell && row.innerHTML.includes('invoice')) {
                        source = 'Billing';
                    } else if (row.innerHTML.includes('receipt')) {
                        source = 'Receipts';
                    }
                }
            }
            
            // Add source badge with appropriate color
            let badgeClass = 'bg-gray-100 text-gray-800';
            if (source === 'Billing') {
                badgeClass = 'bg-purple-100 text-purple-800';
            } else if (source === 'Receipts') {
                badgeClass = 'bg-green-100 text-green-800';
            }
            
            sourceCell.innerHTML = `
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}">
                    ${source}
                </span>
            `;
            
            // Find where to insert the source cell (before actions column)
            const actionCell = row.querySelector('td:last-child');
            if (actionCell) {
                row.insertBefore(sourceCell, actionCell);
            } else {
                row.appendChild(sourceCell);
            }
            
            modifiedCount++;
        });
        
        console.log(`✅ Enhanced ${modifiedCount} receivable table rows with source information`);
        return true;
    }
    
    // Helper function to find payable object by ID
    function findPayableById(id) {
        // Check in various possible data sources
        if (window.payableFilteredItems && Array.isArray(window.payableFilteredItems)) {
            const found = window.payableFilteredItems.find(p => p.id === id);
            if (found) return found;
        }
        
        // Try localStorage
        try {
            const storedPayables = localStorage.getItem('payables');
            if (storedPayables) {
                const payables = JSON.parse(storedPayables);
                const found = payables.find(p => p.id === id);
                if (found) return found;
            }
            
            const storedTradePayable = localStorage.getItem('tradePayable');
            if (storedTradePayable) {
                const tradePayables = JSON.parse(storedTradePayable);
                const found = tradePayables.find(p => p.id === id);
                if (found) return found;
            }
        } catch (e) {
            console.warn('Error accessing localStorage for payable:', e);
        }
        
        return null;
    }
    
    // Helper function to find receivable object by ID
    function findReceivableById(id) {
        // Check in various possible data sources
        if (window.receivableFilteredItems && Array.isArray(window.receivableFilteredItems)) {
            const found = window.receivableFilteredItems.find(r => r.id === id);
            if (found) return found;
        }
        
        // Try localStorage
        try {
            const storedReceivables = localStorage.getItem('receivables');
            if (storedReceivables) {
                const receivables = JSON.parse(storedReceivables);
                const found = receivables.find(r => r.id === id);
                if (found) return found;
            }
            
            const storedTradeReceivable = localStorage.getItem('tradeReceivable');
            if (storedTradeReceivable) {
                const tradeReceivables = JSON.parse(storedTradeReceivable);
                const found = tradeReceivables.find(r => r.id === id);
                if (found) return found;
            }
        } catch (e) {
            console.warn('Error accessing localStorage for receivable:', e);
        }
        
        return null;
    }
    
    // Override functions to ensure source column is added on table refresh
    function patchTableRenderingFunctions() {
        // For Payable table
        if (typeof window.renderPayablesTable === 'function') {
            const originalPayablesRender = window.renderPayablesTable;
            window.renderPayablesTable = function() {
                const result = originalPayablesRender.apply(this, arguments);
                // Add source column after original rendering completes
                setTimeout(enhancePayableTableRows, 0);
                return result;
            };
            console.log('✅ Patched renderPayablesTable function');
        }
        
        // For Receivable table
        if (typeof window.renderReceivablesTable === 'function') {
            const originalReceivablesRender = window.renderReceivablesTable;
            window.renderReceivablesTable = function() {
                const result = originalReceivablesRender.apply(this, arguments);
                // Add source column after original rendering completes
                setTimeout(enhanceReceivableTableRows, 0);
                return result;
            };
            console.log('✅ Patched renderReceivablesTable function');
        }
    }
    
    // Apply enhancements on page load
    function applyEnhancements() {
        // Check which page we're on
        const isPayablePage = window.location.href.includes('trade-payable-ledger');
        const isReceivablePage = window.location.href.includes('trade-receivable-ledger');
        
        if (isPayablePage) {
            console.log('🔍 Trade Payable Ledger page detected - adding source column');
            enhancePayableTableRows();
        } else if (isReceivablePage) {
            console.log('🔍 Trade Receivable Ledger page detected - adding source column');
            enhanceReceivableTableRows();
        }
        
        // Patch the render functions to ensure source column persists
        patchTableRenderingFunctions();
        
        // Apply enhancements periodically to catch any table updates
        setInterval(() => {
            if (isPayablePage) enhancePayableTableRows();
            if (isReceivablePage) enhanceReceivableTableRows();
        }, 2000);
    }
    
    // Apply when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyEnhancements);
    } else {
        // DOM already loaded, apply immediately
        applyEnhancements();
    }
    
    console.log('🔄 Table source column enhancement loaded successfully!');
})();
