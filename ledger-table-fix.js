/**
 * ledger-table-fix.js - Direct fixes for trade ledger tables not showing data
 * This script patches the table rendering functions to ensure data is displayed
 */

(function() {
    console.log('🔧 Ledger Table Fix loading...');
    
    // Helper to detect current page
    function getCurrentPage() {
        const url = window.location.href;
        if (url.includes('trade-payable-ledger')) return 'payable';
        if (url.includes('trade-receivable-ledger')) return 'receivable';
        return null;
    }
    
    // Helper to safely parse JSON from localStorage
    function safeParseJSON(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn(`Failed to parse ${key} from localStorage:`, e);
            return [];
        }
    }
    
    // Function to directly render payables table
    function directRenderPayablesTable(payables) {
        console.log('🔄 Direct rendering payables table with data:', payables);
        
        // Get the table body element
        const tbody = document.getElementById('payables-body');
        if (!tbody) {
            console.error('❌ Payables table body not found!');
            return;
        }
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // If no data, show empty message
        if (!payables || !payables.length) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" class="px-4 py-2 text-center text-gray-500">No payables found</td>`;
            tbody.appendChild(row);
            return;
        }
        
        // Today for status calculation
        const today = new Date();
        
        // Sort payables by date (newest first)
        const sortedPayables = [...payables].sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
        
        // Render each payable
        sortedPayables.forEach(payable => {
            let status = 'current';
            let statusClass = 'bg-green-100 text-green-800';
            
            // Determine status based on payment status or due date
            if (payable.status === 'paid') {
                status = 'paid';
                statusClass = 'bg-gray-100 text-gray-800';
            } else if (payable.status === 'reversed') {
                status = 'reversed';
                statusClass = 'bg-gray-100 text-gray-800';
            } else if (payable.dueDate && new Date(payable.dueDate) < today) {
                status = 'overdue';
                statusClass = 'bg-red-100 text-red-800';
            }
            
            // Create row
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            // Format amount for display
            const amount = typeof payable.amount === 'number' 
                ? payable.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                : '₹0.00';
                
            // Populate row with payable data
            row.innerHTML = `
                <td class="px-4 py-2">${payable.id || payable.purchaseId || 'N/A'}</td>
                <td class="px-4 py-2">${payable.date || 'N/A'}</td>
                <td class="px-4 py-2">${payable.vendor || 'N/A'}</td>
                <td class="px-4 py-2">${payable.dueDate || '-'}</td>
                <td class="px-4 py-2">${amount}</td>
                <td class="px-4 py-2">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                <td class="px-4 py-2">
                    <button class="text-blue-600 hover:text-blue-800 mr-2 view-details" data-id="${payable.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${status !== 'paid' && status !== 'reversed' ? `
                        <button class="text-green-600 hover:text-green-800 make-payment" data-id="${payable.id}" title="Make Payment">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Re-attach event listeners if needed
        if (typeof attachPayableActionListeners === 'function') {
            attachPayableActionListeners();
        } else {
            // Add minimal event handlers for view details and make payment
            document.querySelectorAll('.view-details').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    console.log(`View details clicked for payable: ${id}`);
                    // Try to find and call the showPayableDetailsModal function
                    if (typeof showPayableDetailsModal === 'function') {
                        const payable = sortedPayables.find(p => p.id === id);
                        if (payable) {
                            showPayableDetailsModal(payable);
                        }
                    }
                });
            });
            
            document.querySelectorAll('.make-payment').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    console.log(`Make payment clicked for payable: ${id}`);
                    // Try to find and call the showPayablePaymentModal function
                    if (typeof showPayablePaymentModal === 'function') {
                        const payable = sortedPayables.find(p => p.id === id);
                        if (payable) {
                            showPayablePaymentModal(payable);
                        }
                    }
                });
            });
        }
        
        console.log('✅ Payables table rendered successfully!');
    }
    
    // Function to directly render receivables table
    function directRenderReceivablesTable(receivables) {
        console.log('🔄 Direct rendering receivables table with data:', receivables);
        
        // Get the table body element
        const tbody = document.getElementById('receivables-body');
        if (!tbody) {
            console.error('❌ Receivables table body not found!');
            return;
        }
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // If no data, show empty message
        if (!receivables || !receivables.length) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" class="px-4 py-2 text-center text-gray-500">No receivables found</td>`;
            tbody.appendChild(row);
            return;
        }
        
        // Today for status calculation
        const today = new Date();
        
        // Sort receivables by date (newest first)
        const sortedReceivables = [...receivables].sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
        
        // Render each receivable
        sortedReceivables.forEach(receivable => {
            let status = 'current';
            let statusClass = 'bg-green-100 text-green-800';
            
            // Determine status based on payment status or due date
            if (receivable.status === 'paid') {
                status = 'paid';
                statusClass = 'bg-gray-100 text-gray-800';
            } else if (receivable.status === 'reversed') {
                status = 'reversed';
                statusClass = 'bg-gray-100 text-gray-800';
            } else if (receivable.dueDate && new Date(receivable.dueDate) < today) {
                status = 'overdue';
                statusClass = 'bg-red-100 text-red-800';
            }
            
            // Create row
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            // Format amount for display
            const amount = typeof receivable.amount === 'number' 
                ? receivable.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                : '₹0.00';
                
            // Populate row with receivable data
            row.innerHTML = `
                <td class="px-4 py-2">${receivable.id || receivable.billId || 'N/A'}</td>
                <td class="px-4 py-2">${receivable.date || 'N/A'}</td>
                <td class="px-4 py-2">${receivable.customer || 'N/A'}</td>
                <td class="px-4 py-2">${receivable.dueDate || '-'}</td>
                <td class="px-4 py-2">${amount}</td>
                <td class="px-4 py-2">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                <td class="px-4 py-2">
                    <button class="text-blue-600 hover:text-blue-800 mr-2 view-details" data-id="${receivable.id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${status !== 'paid' && status !== 'reversed' ? `
                        <button class="text-green-600 hover:text-green-800 record-payment" data-id="${receivable.id}" title="Record Payment">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Re-attach event listeners if needed
        if (typeof attachReceivableActionListeners === 'function') {
            attachReceivableActionListeners();
        } else {
            // Add minimal event handlers for view details and record payment
            document.querySelectorAll('.view-details').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    console.log(`View details clicked for receivable: ${id}`);
                    // Try to find and call the showReceivableDetailsModal function
                    if (typeof showReceivableDetailsModal === 'function') {
                        const receivable = sortedReceivables.find(r => r.id === id);
                        if (receivable) {
                            showReceivableDetailsModal(receivable);
                        }
                    }
                });
            });
            
            document.querySelectorAll('.record-payment').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    console.log(`Record payment clicked for receivable: ${id}`);
                    // Try to find and call the showReceivablePaymentModal function
                    if (typeof showReceivablePaymentModal === 'function') {
                        const receivable = sortedReceivables.find(r => r.id === id);
                        if (receivable) {
                            showReceivablePaymentModal(receivable);
                        }
                    }
                });
            });
        }
        
        console.log('✅ Receivables table rendered successfully!');
    }
    
    // Function to force load and render payables
    async function forceLoadPayables() {
        console.log('🔄 Force loading payables data...');
        
        try {
            // Sync data first
            await window.dbService.syncLedgerData();
            
            // Get payables from all possible sources
            let payables = [];
            
            // Try dbService methods first
            if (window.dbService && typeof window.dbService.getPayables === 'function') {
                try {
                    payables = await window.dbService.getPayables();
                    console.log(`📊 Found ${payables.length} payables via dbService.getPayables`);
                } catch (e) {
                    console.warn('⚠️ Error getting payables via dbService:', e);
                }
            }
            
            // If no payables, try direct database access
            if ((!payables || payables.length === 0) && window.db) {
                try {
                    const tradePayables = await window.db.get('tradePayable') || [];
                    const regularPayables = await window.db.get('payables') || [];
                    
                    // Combine without duplicates
                    const allPayables = [...tradePayables];
                    const ids = new Set(allPayables.map(p => p.id));
                    
                    for (const p of regularPayables) {
                        if (p.id && !ids.has(p.id)) {
                            allPayables.push(p);
                            ids.add(p.id);
                        }
                    }
                    
                    payables = allPayables;
                    console.log(`📊 Found ${payables.length} payables via direct DB access`);
                } catch (e) {
                    console.warn('⚠️ Error with direct DB access:', e);
                }
            }
            
            // If still no payables, try localStorage
            if (!payables || payables.length === 0) {
                const storedPayables = safeParseJSON('payables');
                const storedTradePayable = safeParseJSON('tradePayable');
                
                // Combine without duplicates
                const allPayables = [...storedTradePayable];
                const ids = new Set(allPayables.map(p => p.id));
                
                for (const p of storedPayables) {
                    if (p.id && !ids.has(p.id)) {
                        allPayables.push(p);
                        ids.add(p.id);
                    }
                }
                
                payables = allPayables;
                console.log(`📊 Found ${payables.length} payables in localStorage`);
            }
            
            // If we have payables data, update the table and summary
            if (payables && payables.length > 0) {
                // Update window variables for compatibility with existing code
                if (typeof window.payableFilteredItems !== 'undefined') {
                    window.payableFilteredItems = payables;
                }
                if (typeof window.payableTotalItems !== 'undefined') {
                    window.payableTotalItems = payables.length;
                }
                
                // Try standard rendering functions first
                let rendered = false;
                if (typeof updatePayablesSummary === 'function') {
                    try {
                        updatePayablesSummary(payables);
                        console.log('✓ Updated payables summary via existing function');
                    } catch (e) {
                        console.warn('⚠️ Error updating payables summary:', e);
                    }
                }
                
                if (typeof renderPayablesTable === 'function') {
                    try {
                        renderPayablesTable();
                        console.log('✓ Rendered payables table via existing function');
                        rendered = true;
                    } catch (e) {
                        console.warn('⚠️ Error rendering payables table via existing function:', e);
                    }
                }
                
                // If standard rendering failed, use our direct render
                if (!rendered) {
                    directRenderPayablesTable(payables);
                }
                
                // Setup pagination if available
                if (typeof setupPayablePaginationControls === 'function') {
                    try {
                        setupPayablePaginationControls();
                    } catch (e) {
                        console.warn('⚠️ Error setting up pagination:', e);
                    }
                }
                
                console.log('✅ Payables data loaded and rendered successfully!');
                return true;
            } else {
                console.log('⚠️ No payables data found in any storage location');
                directRenderPayablesTable([]);
                return false;
            }
        } catch (error) {
            console.error('❌ Error in forceLoadPayables:', error);
            return false;
        }
    }
    
    // Function to force load and render receivables
    async function forceLoadReceivables() {
        console.log('🔄 Force loading receivables data...');
        
        try {
            // Sync data first
            await window.dbService.syncLedgerData();
            
            // Get receivables from all possible sources
            let receivables = [];
            
            // Try dbService methods first
            if (window.dbService && typeof window.dbService.getReceivables === 'function') {
                try {
                    receivables = await window.dbService.getReceivables();
                    console.log(`📊 Found ${receivables.length} receivables via dbService.getReceivables`);
                } catch (e) {
                    console.warn('⚠️ Error getting receivables via dbService:', e);
                }
            }
            
            // If no receivables, try direct database access
            if ((!receivables || receivables.length === 0) && window.db) {
                try {
                    const tradeReceivables = await window.db.get('tradeReceivable') || [];
                    const regularReceivables = await window.db.get('receivables') || [];
                    
                    // Combine without duplicates
                    const allReceivables = [...tradeReceivables];
                    const ids = new Set(allReceivables.map(r => r.id));
                    
                    for (const r of regularReceivables) {
                        if (r.id && !ids.has(r.id)) {
                            allReceivables.push(r);
                            ids.add(r.id);
                        }
                    }
                    
                    receivables = allReceivables;
                    console.log(`📊 Found ${receivables.length} receivables via direct DB access`);
                } catch (e) {
                    console.warn('⚠️ Error with direct DB access:', e);
                }
            }
            
            // If still no receivables, try localStorage
            if (!receivables || receivables.length === 0) {
                const storedReceivables = safeParseJSON('receivables');
                const storedTradeReceivable = safeParseJSON('tradeReceivable');
                
                // Combine without duplicates
                const allReceivables = [...storedTradeReceivable];
                const ids = new Set(allReceivables.map(r => r.id));
                
                for (const r of storedReceivables) {
                    if (r.id && !ids.has(r.id)) {
                        allReceivables.push(r);
                        ids.add(r.id);
                    }
                }
                
                receivables = allReceivables;
                console.log(`📊 Found ${receivables.length} receivables in localStorage`);
            }
            
            // If we have receivables data, update the table and summary
            if (receivables && receivables.length > 0) {
                // Update window variables for compatibility with existing code
                if (typeof window.receivableFilteredItems !== 'undefined') {
                    window.receivableFilteredItems = receivables;
                }
                if (typeof window.receivableTotalItems !== 'undefined') {
                    window.receivableTotalItems = receivables.length;
                }
                
                // Try standard rendering functions first
                let rendered = false;
                if (typeof updateReceivablesSummary === 'function') {
                    try {
                        updateReceivablesSummary(receivables);
                        console.log('✓ Updated receivables summary via existing function');
                    } catch (e) {
                        console.warn('⚠️ Error updating receivables summary:', e);
                    }
                }
                
                if (typeof renderReceivablesTable === 'function') {
                    try {
                        renderReceivablesTable();
                        console.log('✓ Rendered receivables table via existing function');
                        rendered = true;
                    } catch (e) {
                        console.warn('⚠️ Error rendering receivables table via existing function:', e);
                    }
                }
                
                // If standard rendering failed, use our direct render
                if (!rendered) {
                    directRenderReceivablesTable(receivables);
                }
                
                // Setup pagination if available
                if (typeof setupReceivablePaginationControls === 'function') {
                    try {
                        setupReceivablePaginationControls();
                    } catch (e) {
                        console.warn('⚠️ Error setting up pagination:', e);
                    }
                }
                
                console.log('✅ Receivables data loaded and rendered successfully!');
                return true;
            } else {
                console.log('⚠️ No receivables data found in any storage location');
                directRenderReceivablesTable([]);
                return false;
            }
        } catch (error) {
            console.error('❌ Error in forceLoadReceivables:', error);
            return false;
        }
    }
    
    // Execute appropriate fix based on current page
    function applyFix() {
        const currentPage = getCurrentPage();
        console.log(`🔍 Detected page: ${currentPage || 'unknown'}`);
        
        if (currentPage === 'payable') {
            forceLoadPayables();
            
            // Add reload button for convenience
            const headerEl = document.querySelector('h1');
            if (headerEl) {
                const reloadBtn = document.createElement('button');
                reloadBtn.className = 'ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700';
                reloadBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Reload Data';
                reloadBtn.onclick = forceLoadPayables;
                headerEl.appendChild(reloadBtn);
            }
        } else if (currentPage === 'receivable') {
            forceLoadReceivables();
            
            // Add reload button for convenience
            const headerEl = document.querySelector('h1');
            if (headerEl) {
                const reloadBtn = document.createElement('button');
                reloadBtn.className = 'ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700';
                reloadBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Reload Data';
                reloadBtn.onclick = forceLoadReceivables;
                headerEl.appendChild(reloadBtn);
            }
        }
    }
    
    // Apply the fix once DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFix);
    } else {
        // DOM already loaded, apply fix immediately
        applyFix();
        
        // Also try again after a short delay to ensure all other scripts have run
        setTimeout(applyFix, 1000);
    }
    
    // Make our functions available globally for debugging
    window.ledgerTableFix = {
        forceLoadPayables,
        forceLoadReceivables,
        directRenderPayablesTable,
        directRenderReceivablesTable
    };
    
    console.log('✅ Ledger Table Fix loaded successfully!');
})();
