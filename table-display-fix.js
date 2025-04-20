/**
 * Emergency fix for table display issues in trade ledger pages
 * This script directly manipulates the DOM to ensure data is displayed
 */

(function() {
    console.log('🚨 EMERGENCY TABLE DISPLAY FIX LOADING');
    
    // Wait for DOM to be ready
    function whenReady(callback) {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    }
    
    // Force display of payables data
    function forceDisplayPayables() {
        console.log('🔄 Forcing display of payables data');
        
        // Get payables data from all possible sources
        let payables = [];
        
        try {
            // Try localStorage first as it's most reliable
            const storedPayables = localStorage.getItem('payables');
            const storedTradePayable = localStorage.getItem('tradePayable');
            
            if (storedTradePayable) {
                const parsed = JSON.parse(storedTradePayable);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    payables = parsed;
                    console.log(`📊 Found ${payables.length} payables in localStorage.tradePayable`);
                }
            }
            
            if (payables.length === 0 && storedPayables) {
                const parsed = JSON.parse(storedPayables);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    payables = parsed;
                    console.log(`📊 Found ${payables.length} payables in localStorage.payables`);
                }
            }
            
            // If still no data, check window variables that might have been set by other scripts
            if (payables.length === 0 && window.payableFilteredItems && Array.isArray(window.payableFilteredItems) && window.payableFilteredItems.length > 0) {
                payables = window.payableFilteredItems;
                console.log(`📊 Found ${payables.length} payables in window.payableFilteredItems`);
            }
            
            // Last resort - try to call the API directly
            if (payables.length === 0 && window.dbService && typeof window.dbService.getPayables === 'function') {
                window.dbService.getPayables().then(results => {
                    if (results && Array.isArray(results) && results.length > 0) {
                        payables = results;
                        console.log(`📊 Found ${payables.length} payables via API call`);
                        renderPayablesDirectly(payables);
                    }
                }).catch(err => {
                    console.error('Error fetching payables:', err);
                });
            }
            
            // If we have payables data, render it immediately
            if (payables && payables.length > 0) {
                renderPayablesDirectly(payables);
            }
        } catch (error) {
            console.error('❌ Error in forceDisplayPayables:', error);
        }
    }
    
    // Force display of receivables data
    function forceDisplayReceivables() {
        console.log('🔄 Forcing display of receivables data');
        
        // Get receivables data from all possible sources
        let receivables = [];
        
        try {
            // Try localStorage first as it's most reliable
            const storedReceivables = localStorage.getItem('receivables');
            const storedTradeReceivable = localStorage.getItem('tradeReceivable');
            
            if (storedTradeReceivable) {
                const parsed = JSON.parse(storedTradeReceivable);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    receivables = parsed;
                    console.log(`📊 Found ${receivables.length} receivables in localStorage.tradeReceivable`);
                }
            }
            
            if (receivables.length === 0 && storedReceivables) {
                const parsed = JSON.parse(storedReceivables);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                    receivables = parsed;
                    console.log(`📊 Found ${receivables.length} receivables in localStorage.receivables`);
                }
            }
            
            // If still no data, check window variables that might have been set by other scripts
            if (receivables.length === 0 && window.receivableFilteredItems && Array.isArray(window.receivableFilteredItems) && window.receivableFilteredItems.length > 0) {
                receivables = window.receivableFilteredItems;
                console.log(`📊 Found ${receivables.length} receivables in window.receivableFilteredItems`);
            }
            
            // Last resort - try to call the API directly
            if (receivables.length === 0 && window.dbService && typeof window.dbService.getReceivables === 'function') {
                window.dbService.getReceivables().then(results => {
                    if (results && Array.isArray(results) && results.length > 0) {
                        receivables = results;
                        console.log(`📊 Found ${receivables.length} receivables via API call`);
                        renderReceivablesDirectly(receivables);
                    }
                }).catch(err => {
                    console.error('Error fetching receivables:', err);
                });
            }
            
            // If we have receivables data, render it immediately
            if (receivables && receivables.length > 0) {
                renderReceivablesDirectly(receivables);
            }
        } catch (error) {
            console.error('❌ Error in forceDisplayReceivables:', error);
        }
    }
    
    // Render payables directly to the table
    function renderPayablesDirectly(payables) {
        console.log('🖌️ Directly rendering payables to table:', payables);
        
        // First try the expected table body ID
        let tbody = document.getElementById('payables-body');
        
        // If not found, try to find by other means
        if (!tbody) {
            const payablesTables = Array.from(document.querySelectorAll('table')).filter(table => {
                return table.innerHTML.includes('VENDOR') && table.innerHTML.includes('INVOICE #');
            });
            
            if (payablesTables.length > 0) {
                tbody = payablesTables[0].querySelector('tbody');
                console.log('📌 Found payables table by content search');
            }
        }
        
        // If still not found, create a message to display
        if (!tbody) {
            console.error('❌ Could not find payables table body');
            const container = document.querySelector('.container') || document.body;
            const message = document.createElement('div');
            message.className = 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4';
            message.innerHTML = `
                <p class="font-bold">Table Display Error</p>
                <p>Could not find the payables table element, but found ${payables.length} payables in data.</p>
            `;
            container.appendChild(message);
            return;
        }
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // Today for status calculation
        const today = new Date();
        
        // Sort by date (newest first)
        const sortedPayables = [...payables].sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
        
        // If no data, show empty message
        if (sortedPayables.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" class="px-4 py-2 text-center text-gray-500">No payables found</td>`;
            tbody.appendChild(row);
            return;
        }
        
        // Render each payable
        sortedPayables.forEach((payable, index) => {
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
            row.setAttribute('data-index', index);
            row.setAttribute('data-id', payable.id || '');
            
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
        
        // Add click handlers
        tbody.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (typeof window.showPayableDetailsModal === 'function') {
                    const payable = sortedPayables.find(p => p.id === id);
                    if (payable) {
                        window.showPayableDetailsModal(payable);
                    }
                } else {
                    console.log('View details clicked for payable:', id);
                    alert(`Payable Details: ${id}`);
                }
            });
        });
        
        tbody.querySelectorAll('.make-payment').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (typeof window.showPayablePaymentModal === 'function') {
                    const payable = sortedPayables.find(p => p.id === id);
                    if (payable) {
                        window.showPayablePaymentModal(payable);
                    }
                } else {
                    console.log('Make payment clicked for payable:', id);
                    alert(`Make Payment: ${id}`);
                }
            });
        });
        
        console.log(`✅ Successfully rendered ${sortedPayables.length} payables to table`);
    }
    
    // Render receivables directly to the table
    function renderReceivablesDirectly(receivables) {
        console.log('🖌️ Directly rendering receivables to table:', receivables);
        
        // First try the expected table body ID
        let tbody = document.getElementById('receivables-body');
        
        // If not found, try to find by other means
        if (!tbody) {
            const receivablesTables = Array.from(document.querySelectorAll('table')).filter(table => {
                return table.innerHTML.includes('CUSTOMER') && table.innerHTML.includes('INVOICE #');
            });
            
            if (receivablesTables.length > 0) {
                tbody = receivablesTables[0].querySelector('tbody');
                console.log('📌 Found receivables table by content search');
            }
        }
        
        // If still not found, create a message
        if (!tbody) {
            console.error('❌ Could not find receivables table body');
            const container = document.querySelector('.container') || document.body;
            const message = document.createElement('div');
            message.className = 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4';
            message.innerHTML = `
                <p class="font-bold">Table Display Error</p>
                <p>Could not find the receivables table element, but found ${receivables.length} receivables in data.</p>
            `;
            container.appendChild(message);
            return;
        }
        
        // Clear existing content
        tbody.innerHTML = '';
        
        // Today for status calculation
        const today = new Date();
        
        // Sort by date (newest first)
        const sortedReceivables = [...receivables].sort((a, b) => {
            return new Date(b.date || 0) - new Date(a.date || 0);
        });
        
        // If no data, show empty message
        if (sortedReceivables.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" class="px-4 py-2 text-center text-gray-500">No receivables found</td>`;
            tbody.appendChild(row);
            return;
        }
        
        // Render each receivable
        sortedReceivables.forEach((receivable, index) => {
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
            row.setAttribute('data-index', index);
            row.setAttribute('data-id', receivable.id || '');
            
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
        
        // Add click handlers
        tbody.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (typeof window.showReceivableDetailsModal === 'function') {
                    const receivable = sortedReceivables.find(r => r.id === id);
                    if (receivable) {
                        window.showReceivableDetailsModal(receivable);
                    }
                } else {
                    console.log('View details clicked for receivable:', id);
                    alert(`Receivable Details: ${id}`);
                }
            });
        });
        
        tbody.querySelectorAll('.record-payment').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (typeof window.showReceivablePaymentModal === 'function') {
                    const receivable = sortedReceivables.find(r => r.id === id);
                    if (receivable) {
                        window.showReceivablePaymentModal(receivable);
                    }
                } else {
                    console.log('Record payment clicked for receivable:', id);
                    alert(`Record Payment: ${id}`);
                }
            });
        });
        
        console.log(`✅ Successfully rendered ${sortedReceivables.length} receivables to table`);
    }
    
    // Add UI controls to manually refresh data
    function addRefreshButtons() {
        // Create a floating refresh button
        const button = document.createElement('button');
        button.className = 'fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-50 hover:bg-blue-700';
        button.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Table';
        button.onclick = function() {
            if (window.location.href.includes('trade-payable-ledger')) {
                forceDisplayPayables();
            } else if (window.location.href.includes('trade-receivable-ledger')) {
                forceDisplayReceivables();
            }
        };
        document.body.appendChild(button);
    }
    
    // Apply the fix for the current page
    whenReady(function() {
        // First add refresh button
        addRefreshButtons();
        
        // Detect page type and apply corresponding fix
        if (window.location.href.includes('trade-payable-ledger')) {
            console.log('🔍 Detected Trade Payable Ledger page');
            
            // Try to render immediately
            forceDisplayPayables();
            
            // Also try again after a short delay to ensure everything is loaded
            setTimeout(forceDisplayPayables, 1000);
            
            // And once more a bit later for good measure
            setTimeout(forceDisplayPayables, 2500);
        } 
        else if (window.location.href.includes('trade-receivable-ledger')) {
            console.log('🔍 Detected Trade Receivable Ledger page');
            
            // Try to render immediately
            forceDisplayReceivables();
            
            // Also try again after a short delay to ensure everything is loaded
            setTimeout(forceDisplayReceivables, 1000);
            
            // And once more a bit later for good measure
            setTimeout(forceDisplayReceivables, 2500);
        }
    });
    
    console.log('🚨 EMERGENCY TABLE DISPLAY FIX LOADED');
})();
