// payments.js - Payment management

// Pagination variables
let currentPage = 1;
let pageSize = 20;
let totalPayments = 0;
let filteredPayments = [];

document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM content loaded for payments page');
    
    // Set default dates
    initializeDateFields();
    
    // Update current date display
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        currentDateElement.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Load data from database
    await loadPaymentData();
    
    // Set up all event handlers
    setupModalEvents();
});

// Initialize date fields
function initializeDateFields() {
    const today = window.utils.getTodayDate();
    
    // Set date fields
    const dateFields = [
        'cashPaymentDate',
        'bankPaymentDate'
    ];
    
    dateFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.value = today;
        }
    });
}

async function loadPaymentData() {
    try {
        console.log('Loading payment data');
        
        // Ensure getPayments method exists
        if (!window.dbService.getPayments) {
            console.error('getPayments method not found in dbService');
            window.dbService.getPayments = async function() {
                // Try to get from localStorage as fallback
                const stored = localStorage.getItem('payments');
                return stored ? JSON.parse(stored) : [];
            };
        }
        
        // Get payments from database
        const payments = await window.dbService.getPayments();
        console.log(`Retrieved ${payments?.length || 0} payments`);
        
        // Store payments for pagination
        filteredPayments = payments || [];
        totalPayments = filteredPayments.length;
        
        // Update summary cards
        updateSummaryCards(payments);
        
        // Get customers for select boxes
        const customers = await window.dbService.getCustomers();
        
        // Populate customer selects
        setupCustomerSelects(customers);
        
        // Render payments table with pagination
        renderPaymentsTable();
        
        // Set up pagination controls
        setupPaginationControls();
    } catch (error) {
        console.error('Failed to load payment data:', error);
        window.utils.showNotification('Failed to load payment data', 'error');
    }
}

// Update summary cards with payment data
function updateSummaryCards(payments) {
    try {
        const today = window.utils.getTodayDate();
        payments = payments || [];
        
        // Calculate today's payments
        const todayPayments = payments
            .filter(payment => payment.date === today)
            .reduce((total, payment) => total + (payment.amount || 0), 0);
            
        // Calculate this month's payments
        const thisMonth = today.substring(0, 7); // Get YYYY-MM
        const monthPayments = payments
            .filter(payment => payment.date && payment.date.startsWith(thisMonth))
            .reduce((total, payment) => total + (payment.amount || 0), 0);
        
        // Update the UI for today and month payments
        const todayElement = document.getElementById('today-payments');
        const monthElement = document.getElementById('month-payments');
        
        if (todayElement) todayElement.textContent = window.utils.formatCurrency(todayPayments);
        if (monthElement) monthElement.textContent = window.utils.formatCurrency(monthPayments);
            
        // Get total payables
        const payablesElement = document.getElementById('total-payables');
        if (payablesElement && window.dbService.getPayables) {
            window.dbService.getPayables().then(payables => {
                const totalPayables = (payables || [])
                    .filter(payable => payable.status !== 'paid')
                    .reduce((total, payable) => total + (payable.amount || 0), 0);
                    
                payablesElement.textContent = window.utils.formatCurrency(totalPayables);
            }).catch(error => {
                console.error('Error getting payables:', error);
                if (payablesElement) payablesElement.textContent = window.utils.formatCurrency(0);
            });
        } else if (payablesElement) {
            payablesElement.textContent = window.utils.formatCurrency(0);
        }
    } catch (error) {
        console.error('Error updating summary cards:', error);
    }
}

function renderPaymentsTable() {
    const paymentsBody = document.getElementById('payments-body');
    if (!paymentsBody) {
        console.error('Payments table body element not found');
        return;
    }
    
    paymentsBody.innerHTML = '';
    
    if (!filteredPayments || filteredPayments.length === 0) {
        console.log('No payments found to display');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="px-4 py-2 text-center text-gray-500">No payments found</td>
        `;
        paymentsBody.appendChild(row);
        return;
    }

    console.log(`Rendering ${filteredPayments.length} payments`);

    // Sort by date (newest first)
    const sortedPayments = [...filteredPayments].sort((a, b) => {
        // First sort by date (newest first)
        if (!a.date) return 1;
        if (!b.date) return -1;
        
        const dateComparison = new Date(b.date) - new Date(a.date);
        
        // If dates are the same, sort by creation time if available
        if (dateComparison === 0 && a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        
        return dateComparison;
    });
    
    // Calculate paginated data
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, sortedPayments.length);
    const currentPagePayments = sortedPayments.slice(startIndex, endIndex);
    
    console.log(`Displaying payments ${startIndex+1}-${endIndex} of ${sortedPayments.length}`);
    
    currentPagePayments.forEach((payment, index) => {
        const row = document.createElement('tr');
        
        // Correctly format payment type display
        let paymentTypeDisplay = payment.type || 'Unknown';
        if (payment.chequeNumber) {
            paymentTypeDisplay = `${paymentTypeDisplay} (Cheque)`;
        }
        
        row.innerHTML = `
            <td class="px-4 py-2">${payment.id || `Payment-${index+1}`}</td>
            <td class="px-4 py-2">${payment.date || 'N/A'}</td>
            <td class="px-4 py-2">${payment.customer || 'N/A'}</td>
            <td class="px-4 py-2">${payment.title || 'N/A'}</td>
            <td class="px-4 py-2">${window.utils.formatCurrency(payment.amount || 0)}</td>
            <td class="px-4 py-2">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${payment.type === 'Cash' ? 'bg-green-100 text-green-800' : 
                    'bg-blue-100 text-blue-800'}">
                    ${paymentTypeDisplay}
                </span>
            </td>
            <td class="px-4 py-2">
                <button class="text-blue-600 hover:text-blue-800 mr-2 view-payment" data-id="${payment.id}" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="text-yellow-600 hover:text-yellow-800 mr-2 edit-payment" data-id="${payment.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="text-red-600 hover:text-red-800 delete-payment" data-id="${payment.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        paymentsBody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    addActionButtonListeners();
}

// Set up pagination controls
function setupPaginationControls() {
    const container = document.getElementById('pagination-controls');
    if (!container) {
        console.error('Pagination controls container not found');
        return;
    }
    
    container.innerHTML = '';
    
    // Total pages
    const totalPages = Math.ceil(totalPayments / pageSize);
    if (totalPages === 0) {
        return; // No need to render pagination for 0 pages
    }
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.className = `px-3 py-1 rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
    prevButton.disabled = currentPage === 1;
    if (currentPage > 1) {
        prevButton.addEventListener('click', () => {
            currentPage--;
            renderPaymentsTable();
            setupPaginationControls();
        });
    }
    container.appendChild(prevButton);
    
    // Page numbers
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons && startPage > 1) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = `px-3 py-1 mx-1 rounded ${i === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`;
        if (i !== currentPage) {
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderPaymentsTable();
                setupPaginationControls();
            });
        }
        container.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.className = `px-3 py-1 rounded ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
    nextButton.disabled = currentPage === totalPages;
    if (currentPage < totalPages) {
        nextButton.addEventListener('click', () => {
            currentPage++;
            renderPaymentsTable();
            setupPaginationControls();
        });
    }
    container.appendChild(nextButton);
    
    // Page size selector listener
    const pageSizeElement = document.getElementById('page-size');
    if (pageSizeElement) {
        pageSizeElement.addEventListener('change', function() {
            pageSize = parseInt(this.value);
            currentPage = 1;
            renderPaymentsTable();
            setupPaginationControls();
        });
    }
}

// Add action button event listeners
function addActionButtonListeners() {
    // View payment buttons
    document.querySelectorAll('.view-payment').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            try {
                const payments = await window.dbService.getPayments();
                const payment = payments.find(p => p.id === id);
                if (payment) {
                    viewPaymentDetails(payment);
                } else {
                    window.utils.showNotification('Payment not found', 'error');
                }
            } catch (error) {
                console.error('Error retrieving payment details:', error);
                window.utils.showNotification('Error retrieving payment details', 'error');
            }
        });
    });
    
    // Edit payment buttons
    document.querySelectorAll('.edit-payment').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            try {
                const payments = await window.dbService.getPayments();
                const payment = payments.find(p => p.id === id);
                if (payment) {
                    editPayment(payment);
                } else {
                    window.utils.showNotification('Payment not found', 'error');
                }
            } catch (error) {
                console.error('Error retrieving payment for editing:', error);
                window.utils.showNotification('Error retrieving payment for editing', 'error');
            }
        });
    });
    
    // Delete payment buttons
    document.querySelectorAll('.delete-payment').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            if (confirm(`Are you sure you want to delete payment ${id}?`)) {
                try {
                    await deletePayment(id);
                    window.utils.showNotification('Payment deleted successfully', 'success');
                    await loadPaymentData();
                } catch (error) {
                    console.error('Error deleting payment:', error);
                    window.utils.showNotification('Failed to delete payment', 'error');
                }
            }
        });
    });
}

// Add a function to handle editing payments
function editPayment(payment) {
    try {
        // Determine which modal to show based on payment type
        if (payment.type === 'Cash') {
            // Get form elements
            const form = document.getElementById('cash-payment-form');
            if (!form) {
                console.error('Cash payment form not found');
                return;
            }
            
            // Populate cash payment form with existing data
            document.getElementById('cashPaymentTitle').value = payment.title || '';
            document.getElementById('cashPaymentDescription').value = payment.description || '';
            document.getElementById('cashPaymentAmount').value = payment.amount || 0;
            document.getElementById('cashPaymentDate').value = payment.date || window.utils.getTodayDate();
            document.getElementById('cashPaymentReference').value = payment.reference || '';
            
            // Set customer dropdown if available
            if (payment.customerId) {
                document.getElementById('cashPaymentCustomer').value = payment.customerId;
                const searchInput = document.getElementById('cashVendorSearch');
                if (searchInput) {
                    searchInput.value = payment.customer || '';
                }
            }
            
            // Set edit mode flag and payment ID
            form.dataset.editMode = 'true';
            form.dataset.paymentId = payment.id;
            
            // Update submit button text
            const submitBtn = document.querySelector('#cash-payment-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Update Payment';
            }
            
            // Show the modal
            const modal = document.getElementById('cash-payment-modal');
            if (modal) {
                modal.classList.remove('opacity-0');
                modal.classList.remove('pointer-events-none');
            } else {
                console.error('Cash payment modal not found');
            }
        } else if (payment.type === 'Bank') {
            // Get form elements
            const form = document.getElementById('bank-payment-form');
            if (!form) {
                console.error('Bank payment form not found');
                return;
            }
            
            // Populate bank payment form with existing data
            document.getElementById('bankPaymentTitle').value = payment.title || '';
            document.getElementById('bankPaymentDescription').value = payment.description || '';
            document.getElementById('bankPaymentAmount').value = payment.amount || 0;
            document.getElementById('bankPaymentDate').value = payment.date || window.utils.getTodayDate();
            document.getElementById('bankPaymentReference').value = payment.reference || '';
            
            // Set customer dropdown if available
            if (payment.customerId) {
                document.getElementById('bankPaymentCustomer').value = payment.customerId;
                const searchInput = document.getElementById('bankVendorSearch');
                if (searchInput) {
                    searchInput.value = payment.customer || '';
                }
            }
            
            // Set cheque options if applicable
            const chequeCheckbox = document.getElementById('paymentTypeCheque');
            const chequeDetails = document.getElementById('chequeDetails');
            if (chequeCheckbox && chequeDetails) {
                if (payment.chequeNumber) {
                    chequeCheckbox.checked = true;
                    chequeDetails.classList.remove('hidden');
                    document.getElementById('bankChequeNumber').value = payment.chequeNumber;
                } else {
                    chequeCheckbox.checked = false;
                    chequeDetails.classList.add('hidden');
                    document.getElementById('bankChequeNumber').value = '';
                }
            }
            
            // Set edit mode flag and payment ID
            form.dataset.editMode = 'true';
            form.dataset.paymentId = payment.id;
            
            // Update submit button text
            const submitBtn = document.querySelector('#bank-payment-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Update Payment';
            }
            
            // Show the modal
            const modal = document.getElementById('bank-payment-modal');
            if (modal) {
                modal.classList.remove('opacity-0');
                modal.classList.remove('pointer-events-none');
            } else {
                console.error('Bank payment modal not found');
            }
        }
    } catch (error) {
        console.error('Error setting up payment edit:', error);
        window.utils.showNotification('Error preparing payment edit form', 'error');
    }
}

function viewPaymentDetails(payment) {
    try {
        // Get modal elements
        const modal = document.getElementById('view-payment-modal');
        const titleElem = document.getElementById('payment-details-title');
        const detailsContainer = document.getElementById('payment-details-content');
        
        if (!modal || !titleElem || !detailsContainer) {
            console.error('View payment modal elements not found');
            return;
        }
        
        // Update modal title
        titleElem.textContent = `Payment Details: ${payment.id || 'Unknown'}`;
        
        // Format payment details
        let paymentTypeDisplay = payment.type || 'Unknown';
        if (payment.chequeNumber) {
            paymentTypeDisplay += ` (Cheque #${payment.chequeNumber})`;
        }
        
        // Populate details
        detailsContainer.innerHTML = `
            <div class="border rounded-lg p-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-gray-500 text-sm">Vendor</p>
                        <p class="font-medium">${payment.customer || 'N/A'}</p>
                    </div>
                    
                    <div>
                        <p class="text-gray-500 text-sm">Date</p>
                        <p class="font-medium">${payment.date || 'N/A'}</p>
                    </div>
                    
                    <div>
                        <p class="text-gray-500 text-sm">Payment Method</p>
                        <p class="font-medium">${paymentTypeDisplay}</p>
                    </div>
                    
                    <div>
                        <p class="text-gray-500 text-sm">Amount</p>
                        <p class="font-medium">${window.utils.formatCurrency(payment.amount || 0)}</p>
                    </div>
                    
                    <div class="col-span-2">
                        <p class="text-gray-500 text-sm">Title/Purpose</p>
                        <p class="font-medium">${payment.title || 'N/A'}</p>
                    </div>
                    
                    ${payment.description ? `
                    <div class="col-span-2">
                        <p class="text-gray-500 text-sm">Description</p>
                        <p class="font-medium">${payment.description}</p>
                    </div>
                    ` : ''}
                    
                    ${payment.transactionRef ? `
                    <div class="col-span-2">
                        <p class="text-gray-500 text-sm">Transaction Reference</p>
                        <p class="font-medium">${payment.transactionRef}</p>
                    </div>
                    ` : ''}
                    
                    ${payment.reference ? `
                    <div class="col-span-2">
                        <p class="text-gray-500 text-sm">Reference</p>
                        <p class="font-medium">${payment.reference}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Show the modal
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
    } catch (error) {
        console.error('Error displaying payment details:', error);
        window.utils.showNotification('Error displaying payment details', 'error');
    }
}

async function deletePayment(id) {
    try {
        console.log(`Deleting payment with ID: ${id}`);
        
        // Get the payment to delete
        const payments = await window.dbService.getPayments();
        const payment = payments.find(p => p.id === id);
        if (!payment) throw new Error('Payment not found');
        
        // If it's a customer payment, update their account
        if (payment.customerId) {
            await updateCustomerLedger(payment);
        }
        
        // Delete payment from appropriate ledger
        if (payment.type === 'Cash') {
            await reverseCashTransaction(payment);
        } else if (payment.type === 'Bank') {
            await reverseBankTransaction(payment);
        }
        
        // Delete from trade payable if it exists
        if (payment.customerId) {
            await reverseTradePayable(payment);
        }
        
        // Delete the payment
        await window.dbService.deletePayment(id);
        console.log(`Payment ${id} successfully deleted`);
    } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
}

async function updateCustomerLedger(payment) {
    // This will debit customer account (reverse of credit payment)
    if (payment.customerId) {
        const customer = await window.dbService.getCustomerById(payment.customerId);
        if (customer) {
            const transaction = {
                date: window.utils.getTodayDate(),
                description: 'Payment Reversal',
                type: 'Reversal',
                debit: payment.amount || 0,
                credit: 0,
                balance: 0 // will be calculated by the service
            };
            
            await window.dbService.addCustomerTransaction(payment.customerId, transaction);
        }
    }
}

async function reverseCashTransaction(payment) {
    const transaction = {
        date: window.utils.getTodayDate(),
        description: `Payment reversal: ${payment.title || 'Cash Payment'}`,
        reference: `REV-${payment.id || ''}`,
        cashIn: payment.amount || 0, // Reverse the outflow
        cashOut: 0
    };
    
    await window.dbService.addCashTransaction(transaction);
}

async function reverseBankTransaction(payment) {
    const transaction = {
        date: window.utils.getTodayDate(),
        description: `Payment reversal: ${payment.title || 'Bank Payment'}`,
        reference: `REV-${payment.id || ''}`,
        deposit: payment.amount || 0, // Reverse the withdrawal
        withdrawal: 0,
        chequeNumber: payment.chequeNumber ? `REV-${payment.chequeNumber}` : undefined
    };
    
    await window.dbService.addBankTransaction(transaction);
}

async function reverseTradePayable(payment) {
    try {
        // Find payables related to this payment
        const payables = await window.dbService.getPayables() || [];
        const relatedPayable = payables.find(p => 
            (p.paymentReference === payment.id) || (p.reference === payment.id)
        );
        
        if (relatedPayable) {
            // Update status to 'reversed'
            await window.dbService.updatePayable(relatedPayable.id, {
                ...relatedPayable,
                status: 'reversed',
                reversalDate: window.utils.getTodayDate()
            });
        }
    } catch (error) {
        console.error('Error reversing trade payable:', error);
        // Continue with other operations even if this fails
    }
}

async function filterPayments() {
    try {
        console.log('Filtering payments');
        const searchTerm = document.getElementById('search-payments')?.value?.toLowerCase() || '';
        const filterType = document.getElementById('filter-payments')?.value || 'all';
        
        const payments = await window.dbService.getPayments() || [];
        console.log(`Total payments before filtering: ${payments.length}`);
        
        let filtered = [...payments];
        
        // Filter by payment type
        if (filterType !== 'all') {
            console.log(`Filtering by type: ${filterType}`);
            if (filterType === 'bank') {
                // Include both bank and cheque payments
                filtered = filtered.filter(payment => payment.type === 'Bank');
            } else {
                filtered = filtered.filter(payment => 
                    payment.type && payment.type.toLowerCase() === filterType.toLowerCase()
                );
            }
        }
        
        // Filter by search term
        if (searchTerm) {
            console.log(`Filtering by search term: ${searchTerm}`);
            filtered = filtered.filter(payment => 
                (payment.id && payment.id.toLowerCase().includes(searchTerm)) || 
                (payment.customer && payment.customer.toLowerCase().includes(searchTerm)) || 
                (payment.title && payment.title.toLowerCase().includes(searchTerm)) || 
                (payment.description && payment.description.toLowerCase().includes(searchTerm)) || 
                (payment.date && payment.date.includes(searchTerm))
            );
        }
        
        console.log(`Filtered payments: ${filtered.length}`);
        
        // Update filtered payments
        filteredPayments = filtered;
        totalPayments = filteredPayments.length;
        currentPage = 1; // Reset to first page when filtering
        
        renderPaymentsTable();
        setupPaginationControls();
    } catch (error) {
        console.error('Error filtering payments:', error);
    }
}

async function setupCustomerSelects(customers) {
    try {
        const selects = [
            document.getElementById('cashPaymentCustomer'),
            document.getElementById('bankPaymentCustomer')
        ];
        
        selects.forEach(select => {
            if (!select) return;
            
            select.innerHTML = '<option value="">Select Vendor</option>';
            
            if (customers && customers.length > 0) {
                customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer._id;
                    option.textContent = customer.name;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Error setting up customer selects:', error);
    }
}

function setupModalEvents() {
    console.log('Setting up modal events');
    
    // Payment buttons
    const cashPaymentBtn = document.getElementById('cash-payment-btn');
    const bankPaymentBtn = document.getElementById('bank-payment-btn');
    
    // Payment modals
    const cashPaymentModal = document.getElementById('cash-payment-modal');
    const bankPaymentModal = document.getElementById('bank-payment-modal');
    const viewPaymentModal = document.getElementById('view-payment-modal');
    
    // Open modals
    if (cashPaymentBtn && cashPaymentModal) {
        cashPaymentBtn.addEventListener('click', () => {
            cashPaymentModal.classList.remove('opacity-0');
            cashPaymentModal.classList.remove('pointer-events-none');
        });
    } else {
        console.warn('Cash payment button or modal not found');
    }
    
    if (bankPaymentBtn && bankPaymentModal) {
        bankPaymentBtn.addEventListener('click', () => {
            bankPaymentModal.classList.remove('opacity-0');
            bankPaymentModal.classList.remove('pointer-events-none');
        });
    } else {
        console.warn('Bank payment button or modal not found');
    }
    
    // Close payment modals
    document.querySelectorAll('.close-payment-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            if (cashPaymentModal) {
                cashPaymentModal.classList.add('opacity-0');
                cashPaymentModal.classList.add('pointer-events-none');
            }
            if (bankPaymentModal) {
                bankPaymentModal.classList.add('opacity-0');
                bankPaymentModal.classList.add('pointer-events-none');
            }
        });
    });
    
    // Close view payment modal
    const closeViewModalBtn = document.getElementById('close-view-modal');
    const closeDetailsBtn = document.getElementById('close-details-btn');
    
    if (closeViewModalBtn && viewPaymentModal) {
        closeViewModalBtn.addEventListener('click', closeViewModal);
    }
    
    if (closeDetailsBtn && viewPaymentModal) {
        closeDetailsBtn.addEventListener('click', closeViewModal);
    }
    
    function closeViewModal() {
        if (viewPaymentModal) {
            viewPaymentModal.classList.add('opacity-0');
            viewPaymentModal.classList.add('pointer-events-none');
        }
    }
    
    // Form submissions
    const cashPaymentForm = document.getElementById('cash-payment-form');
    if (cashPaymentForm) {
        cashPaymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processCashPayment();
        });
    } else {
        console.warn('Cash payment form not found');
    }
    
    const bankPaymentForm = document.getElementById('bank-payment-form');
    if (bankPaymentForm) {
        bankPaymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processBankPayment();
        });
    } else {
        console.warn('Bank payment form not found');
    }
    
    // Add this to handle form reset when closing modals
    document.querySelectorAll('.close-payment-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            // Reset forms and edit mode
            if (cashPaymentForm) {
                cashPaymentForm.dataset.editMode = 'false';
                cashPaymentForm.dataset.paymentId = '';
                cashPaymentForm.reset();
                const cashDateField = document.getElementById('cashPaymentDate');
                if (cashDateField) cashDateField.value = window.utils.getTodayDate();
                
                const cashVendorSearch = document.getElementById('cashVendorSearch');
                if (cashVendorSearch) cashVendorSearch.value = '';
                
                // Reset submit button text
                const cashSubmitBtn = document.querySelector('#cash-payment-form button[type="submit"]');
                if (cashSubmitBtn) {
                    cashSubmitBtn.textContent = 'Make Payment';
                }
            }
            
            if (bankPaymentForm) {
                bankPaymentForm.dataset.editMode = 'false';
                bankPaymentForm.dataset.paymentId = '';
                bankPaymentForm.reset();
                
                const bankDateField = document.getElementById('bankPaymentDate');
                if (bankDateField) bankDateField.value = window.utils.getTodayDate();
                
                const chequeDetails = document.getElementById('chequeDetails');
                if (chequeDetails) chequeDetails.classList.add('hidden');
                
                const bankVendorSearch = document.getElementById('bankVendorSearch');
                if (bankVendorSearch) bankVendorSearch.value = '';
                
                // Reset submit button text
                const bankSubmitBtn = document.querySelector('#bank-payment-form button[type="submit"]');
                if (bankSubmitBtn) {
                    bankSubmitBtn.textContent = 'Make Payment';
                }
            }
        });
    });
    
    // Cheque checkbox toggle
    const chequeCheckbox = document.getElementById('paymentTypeCheque');
    const chequeDetails = document.getElementById('chequeDetails');
    if (chequeCheckbox && chequeDetails) {
        chequeCheckbox.addEventListener('change', function() {
            chequeDetails.classList.toggle('hidden', !this.checked);
        });
    }
    
    // Filter payments
    const filterPaymentsSelect = document.getElementById('filter-payments');
    if (filterPaymentsSelect) {
        filterPaymentsSelect.addEventListener('change', filterPayments);
    }
    
    const searchPayments = document.getElementById('search-payments');
    if (searchPayments) {
        searchPayments.addEventListener('input', filterPayments);
    }
    
    // Set up vendor search functionality
    setupVendorSearch('cashVendorSearch', 'cashVendorDropdown', 'cashPaymentCustomer');
    setupVendorSearch('bankVendorSearch', 'bankVendorDropdown', 'bankPaymentCustomer');
}

// Setup vendor search functionality
function setupVendorSearch(searchId, dropdownId, selectId) {
    const searchInput = document.getElementById(searchId);
    const dropdown = document.getElementById(dropdownId);
    const select = document.getElementById(selectId);
    
    if (!searchInput || !dropdown || !select) {
        console.warn(`Vendor search elements not found for: ${searchId}`);
        return;
    }
    
    searchInput.addEventListener('input', async function() {
        const searchTerm = this.value.toLowerCase();
        if (!searchTerm) {
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
            return;
        }
        
        try {
            const vendors = await window.dbService.getCustomers() || [];
            const filteredVendors = vendors.filter(vendor => 
                (vendor.name && vendor.name.toLowerCase().includes(searchTerm)) || 
                (vendor.phone && vendor.phone.includes(searchTerm))
            );
            
            dropdown.innerHTML = '';
            
            if (filteredVendors.length === 0) {
                dropdown.innerHTML = '<div class="p-2 text-gray-500">No vendors found</div>';
            } else {
                filteredVendors.slice(0, 5).forEach(vendor => {
                    const item = document.createElement('div');
                    item.className = 'customer-search-item';
                    item.textContent = vendor.name;
                    item.addEventListener('click', function() {
                        select.value = vendor._id;
                        searchInput.value = vendor.name;
                        dropdown.classList.remove('active');
                    });
                    dropdown.appendChild(item);
                });
            }
            
            dropdown.classList.add('active');
        } catch (error) {
            console.error('Error searching vendors:', error);
        }
    });
    
    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (searchInput && dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // Show dropdown when focusing on search
    searchInput.addEventListener('focus', function() {
        if (this.value.length > 0) {
            dropdown.classList.add('active');
        }
    });
}

async function processCashPayment() {
  try {
      const form = document.getElementById('cash-payment-form');
      if (!form) {
          console.error('Cash payment form not found');
          return;
      }
      
      const isEditMode = form.dataset.editMode === 'true';
      const paymentId = isEditMode ? form.dataset.paymentId : null;
      
      console.log(`Processing cash payment. Edit mode: ${isEditMode}, Payment ID: ${paymentId}`);
      
      const customerSelect = document.getElementById('cashPaymentCustomer');
      if (!customerSelect) {
          console.error('Cash payment customer select not found');
          window.utils.showNotification('Form error: Customer select not found', 'error');
          return;
      }
      
      const customerId = customerSelect.value;
      
      if (!customerId) {
          window.utils.showNotification('Please select a vendor', 'error');
          return;
      }
      
      // Get customer name from select options
      const customerName = customerSelect.options[customerSelect.selectedIndex].text;
      
      // Get other form values
      const title = document.getElementById('cashPaymentTitle')?.value;
      const description = document.getElementById('cashPaymentDescription')?.value;
      const amount = parseFloat(document.getElementById('cashPaymentAmount')?.value);
      const date = document.getElementById('cashPaymentDate')?.value;
      const reference = document.getElementById('cashPaymentReference')?.value;
      
      if (!title || !amount || isNaN(amount) || amount <= 0) {
          window.utils.showNotification('Please enter valid payment details', 'error');
          return;
      }
      
      // Make sure getPayments method exists
      if (!window.dbService.getPayments) {
          window.dbService.getPayments = async function() {
              const stored = localStorage.getItem('payments');
              return stored ? JSON.parse(stored) : [];
          };
      }
      
      // Make sure addPayment method exists
      if (!window.dbService.addPayment) {
          window.dbService.addPayment = async function(payment) {
              const payments = await window.dbService.getPayments() || [];
              payments.push(payment);
              localStorage.setItem('payments', JSON.stringify(payments));
              return payment;
          };
      }
      
      // Make sure updatePayment method exists
      if (!window.dbService.updatePayment) {
          window.dbService.updatePayment = async function(id, updatedPayment) {
              const payments = await window.dbService.getPayments() || [];
              const index = payments.findIndex(p => p.id === id);
              if (index !== -1) {
                  payments[index] = { ...payments[index], ...updatedPayment };
                  localStorage.setItem('payments', JSON.stringify(payments));
                  return payments[index];
              }
              throw new Error(`Payment with id ${id} not found`);
          };
      }
      
      if (isEditMode && paymentId) {
          // Get the existing payment
          const payments = await window.dbService.getPayments();
          const existingPayment = payments.find(p => p.id === paymentId);
          
          if (!existingPayment) {
              window.utils.showNotification('Payment not found for editing', 'error');
              return;
          }
          
          // Handle updates of related records
          if (existingPayment.amount !== amount || existingPayment.customerId !== customerId) {
              console.log('Major changes detected, recreating related records');
              
              // Delete old records
              await deletePayment(paymentId);
              
              // Create new payment object
              const updatedPayment = {
                  id: paymentId,
                  customerId: customerId,
                  customer: customerName,
                  title: title,
                  description: description || undefined,
                  amount: amount,
                  date: date,
                  reference: reference || undefined,
                  type: 'Cash',
                  createdAt: existingPayment.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
              };
              
              // Add to cash ledger
              await addCashPaymentTransaction(updatedPayment);
              
              // Update customer account
              await updateCustomerPayment(customerId, amount, updatedPayment);
              
              // Add to trade payable ledger
              await addTradePayable(updatedPayment);
              
              // Save payment to database
              await window.dbService.addPayment(updatedPayment);
          } else {
              console.log('Simple update without changing related records');
              // Simple update without changing related records
              const updatedPayment = {
                  ...existingPayment,
                  customerId: customerId,
                  customer: customerName,
                  title: title,
                  description: description || undefined,
                  date: date,
                  reference: reference || undefined,
                  updatedAt: new Date().toISOString()
              };
              
              await window.dbService.updatePayment(paymentId, updatedPayment);
          }
          
          window.utils.showNotification('Payment updated successfully', 'success');
      } else {
          // Generate a unique payment ID for new payments
          const payments = await window.dbService.getPayments();
          const paymentNumber = (payments?.length || 0) + 1;
          const newPaymentId = `PAY-${String(paymentNumber).padStart(3, '0')}`;
          
          console.log(`Creating new payment with ID: ${newPaymentId}`);
          
          // Create payment object
          const payment = {
              id: newPaymentId,
              customerId: customerId,
              customer: customerName,
              title: title,
              description: description || undefined,
              amount: amount,
              date: date,
              reference: reference || undefined,
              type: 'Cash',
              createdAt: new Date().toISOString()
          };
          
          // Add to cash ledger
          await addCashPaymentTransaction(payment);
          
          // Update customer account
          await updateCustomerPayment(customerId, amount, payment);
          
          // Add to trade payable ledger
          await addTradePayable(payment);
          
          // Save payment to database
          await window.dbService.addPayment(payment);
          
          window.utils.showNotification('Cash payment processed successfully', 'success');
      }
      
      // Close modal
      const modal = document.getElementById('cash-payment-modal');
      if (modal) {
          modal.classList.add('opacity-0');
          modal.classList.add('pointer-events-none');
      }
      
      // Reset form and edit mode
      form.dataset.editMode = 'false';
      form.dataset.paymentId = '';
      form.reset();
      
      const dateField = document.getElementById('cashPaymentDate');
      if (dateField) dateField.value = window.utils.getTodayDate();
      
      const searchField = document.getElementById('cashVendorSearch');
      if (searchField) searchField.value = '';
      
      // Reset submit button text
      const submitBtn = document.querySelector('#cash-payment-form button[type="submit"]');
      if (submitBtn) {
          submitBtn.textContent = 'Make Payment';
      }
      
      // Reload data
      await loadPaymentData();
  } catch (error) {
      console.error('Error processing cash payment:', error);
      window.utils.showNotification('Failed to process payment', 'error');
  }
}

async function processBankPayment() {
  try {
      const form = document.getElementById('bank-payment-form');
      if (!form) {
          console.error('Bank payment form not found');
          return;
      }
      
      const isEditMode = form.dataset.editMode === 'true';
      const paymentId = isEditMode ? form.dataset.paymentId : null;
      
      console.log(`Processing bank payment. Edit mode: ${isEditMode}, Payment ID: ${paymentId}`);
      
      const customerSelect = document.getElementById('bankPaymentCustomer');
      if (!customerSelect) {
          console.error('Bank payment customer select not found');
          window.utils.showNotification('Form error: Customer select not found', 'error');
          return;
      }
      
      const customerId = customerSelect.value;
      
      if (!customerId) {
          window.utils.showNotification('Please select a vendor', 'error');
          return;
      }
      
      // Get customer name from select options
      const customerName = customerSelect.options[customerSelect.selectedIndex].text;
      
      // Get other form values
      const title = document.getElementById('bankPaymentTitle')?.value;
      const description = document.getElementById('bankPaymentDescription')?.value;
      const amount = parseFloat(document.getElementById('bankPaymentAmount')?.value);
      const date = document.getElementById('bankPaymentDate')?.value;
      const reference = document.getElementById('bankPaymentReference')?.value;
      
      // Check if it's a cheque payment
      const isCheque = document.getElementById('paymentTypeCheque')?.checked || false;
      const chequeNumber = isCheque ? document.getElementById('bankChequeNumber')?.value : undefined;
      
      if (!title || !amount || isNaN(amount) || amount <= 0) {
          window.utils.showNotification('Please enter valid payment details', 'error');
          return;
      }
      
      if (isCheque && !chequeNumber) {
          window.utils.showNotification('Please enter cheque number', 'error');
          return;
      }
      
      // Make sure necessary methods exist
      if (!window.dbService.getPayments) {
          window.dbService.getPayments = async function() {
              const stored = localStorage.getItem('payments');
              return stored ? JSON.parse(stored) : [];
          };
      }
      
      if (!window.dbService.addPayment) {
          window.dbService.addPayment = async function(payment) {
              const payments = await window.dbService.getPayments() || [];
              payments.push(payment);
              localStorage.setItem('payments', JSON.stringify(payments));
              return payment;
          };
      }
      
      if (!window.dbService.updatePayment) {
          window.dbService.updatePayment = async function(id, updatedPayment) {
              const payments = await window.dbService.getPayments() || [];
              const index = payments.findIndex(p => p.id === id);
              if (index !== -1) {
                  payments[index] = { ...payments[index], ...updatedPayment };
                  localStorage.setItem('payments', JSON.stringify(payments));
                  return payments[index];
              }
              throw new Error(`Payment with id ${id} not found`);
          };
      }
      
      if (isEditMode && paymentId) {
          // Get the existing payment
          const payments = await window.dbService.getPayments();
          const existingPayment = payments.find(p => p.id === paymentId);
          
          if (!existingPayment) {
              window.utils.showNotification('Payment not found for editing', 'error');
              return;
          }
          
          // Handle updates of related records
          if (existingPayment.amount !== amount || existingPayment.customerId !== customerId || 
              existingPayment.chequeNumber !== chequeNumber) {
              
              console.log('Major changes detected, recreating related records');
              
              // Delete old records
              await deletePayment(paymentId);
              
              // Create new payment object
              const updatedPayment = {
                  id: paymentId,
                  customerId: customerId,
                  customer: customerName,
                  title: title,
                  description: description || undefined,
                  amount: amount,
                  date: date,
                  reference: reference || undefined,
                  type: 'Bank',
                  chequeNumber: chequeNumber,
                  createdAt: existingPayment.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
              };
              
              // Add to bank ledger
              await addBankPaymentTransaction(updatedPayment);
              
              // Update customer account
              await updateCustomerPayment(customerId, amount, updatedPayment);
              
              // Add to trade payable ledger
              await addTradePayable(updatedPayment);
              
              // Save payment to database
              await window.dbService.addPayment(updatedPayment);
          } else {
              console.log('Simple update without changing related records');
              // Simple update without changing related records
              const updatedPayment = {
                  ...existingPayment,
                  customerId: customerId,
                  customer: customerName,
                  title: title,
                  description: description || undefined,
                  date: date,
                  reference: reference || undefined,
                  chequeNumber: chequeNumber,
                  updatedAt: new Date().toISOString()
              };
              
              await window.dbService.updatePayment(paymentId, updatedPayment);
          }
          
          window.utils.showNotification('Payment updated successfully', 'success');
      } else {
          // Generate a unique payment ID for new payments
          const payments = await window.dbService.getPayments();
          const paymentNumber = (payments?.length || 0) + 1;
          const newPaymentId = `PAY-${String(paymentNumber).padStart(3, '0')}`;
          
          console.log(`Creating new payment with ID: ${newPaymentId}`);
          
          // Create payment object
          const payment = {
              id: newPaymentId,
              customerId: customerId,
              customer: customerName,
              title: title,
              description: description || undefined,
              amount: amount,
              date: date,
              reference: reference || undefined,
              type: 'Bank',
              chequeNumber: chequeNumber,
              createdAt: new Date().toISOString()
          };
          
          // Add to bank ledger
          await addBankPaymentTransaction(payment);
          
          // Update customer account
          await updateCustomerPayment(customerId, amount, payment);
          
          // Add to trade payable ledger
          await addTradePayable(payment);
          
          // Save payment to database
          await window.dbService.addPayment(payment);
          
          window.utils.showNotification('Bank payment processed successfully', 'success');
      }
      
      // Close modal
      const modal = document.getElementById('bank-payment-modal');
      if (modal) {
          modal.classList.add('opacity-0');
          modal.classList.add('pointer-events-none');
      }
      
      // Reset form and edit mode
      form.dataset.editMode = 'false';
      form.dataset.paymentId = '';
      form.reset();
      
      const dateField = document.getElementById('bankPaymentDate');
      if (dateField) dateField.value = window.utils.getTodayDate();
      
      const chequeDetails = document.getElementById('chequeDetails');
      if (chequeDetails) chequeDetails.classList.add('hidden');
      
      const searchField = document.getElementById('bankVendorSearch');
      if (searchField) searchField.value = '';
      
      // Reset submit button text
      const submitBtn = document.querySelector('#bank-payment-form button[type="submit"]');
      if (submitBtn) {
          submitBtn.textContent = 'Make Payment';
      }
      
      // Reload data
      await loadPaymentData();
  } catch (error) {
      console.error('Error processing bank payment:', error);
      window.utils.showNotification('Failed to process payment', 'error');
  }
}

async function addTradePayable(payment) {
  try {
      console.log(`Adding trade payable for payment: ${payment.id}`);
      
      // Make sure the required methods exist
      if (!window.dbService.getPayables) {
          window.dbService.getPayables = async function() {
              try {
                  if (window.db && typeof window.db.get === 'function') {
                      return await window.db.get('payables') || [];
                  } else {
                      const stored = localStorage.getItem('payables');
                      return stored ? JSON.parse(stored) : [];
                  }
              } catch (error) {
                  console.error('Error getting payables:', error);
                  return [];
              }
          };
      }
      
      if (!window.dbService.addPayablePayment) {
          window.dbService.addPayablePayment = async function(payable) {
              console.log('Adding payable payment:', payable);
              const payables = await window.dbService.getPayables() || [];
              
              // Check if payable already exists
              const existingIndex = payables.findIndex(p => p.id === payable.id);
              
              if (existingIndex >= 0) {
                  payables[existingIndex] = {
                      ...payables[existingIndex],
                      ...payable
                  };
              } else {
                  payables.push(payable);
              }
              
              // Ensure we're using localStorage directly to avoid potential issues
              localStorage.setItem('payables', JSON.stringify(payables));
              
              // Also try the DB method if available
              if (window.db && typeof window.db.set === 'function') {
                  try {
                      await window.db.set('payables', payables);
                  } catch (e) {
                      console.warn('Error saving to db, but saved to localStorage');
                  }
              }
              
              return payable;
          };
      }
      
      // Create payable transaction - ensure all required fields are present
      const payable = {
          id: payment.id,
          date: payment.date,
          vendorId: payment.customerId,
          vendor: payment.customer,
          amount: payment.amount,
          paymentMethod: payment.chequeNumber ? 'Cheque' : payment.type,
          reference: payment.reference || payment.id,
          chequeNumber: payment.chequeNumber,
          status: 'paid',
          paymentDate: payment.date,
          paymentReference: payment.id,
          createdAt: payment.createdAt || new Date().toISOString(),
          // Important: Add fields that the trade payable ledger might be looking for
          dueDate: payment.date, // No due date for direct payments
          purchaseId: payment.reference || payment.id,
          description: payment.description || `Payment to ${payment.customer}`,
          // Ensure all IDs are strings (sometimes a cause of filtering issues)
          id: String(payment.id)
      };
      
      // Temporarily log all existing payables for debugging
      const existingPayables = await window.dbService.getPayables();
      console.log(`Current payables count: ${existingPayables.length}`);
      
      // Add to payables
      await window.dbService.addPayablePayment(payable);
      
      // Verify payable was added
      const updatedPayables = await window.dbService.getPayables();
      console.log(`Updated payables count: ${updatedPayables.length}`);
      
      // Check if our payable is in the list
      const addedPayable = updatedPayables.find(p => p.id === payment.id);
      if (addedPayable) {
          console.log(`Payable successfully added: ${payment.id}`);
      } else {
          console.error(`Failed to add payable: ${payment.id}`);
      }
      
      return true;
  } catch (error) {
      console.error('Error adding trade payable:', error);
      window.utils.showNotification('Failed to add trade payable record', 'error');
      throw error;
  }
}

async function addCashPaymentTransaction(payment) {
    try {
        console.log(`Adding cash transaction for payment: ${payment.id}`);
        
        const transaction = {
            date: payment.date,
            description: `Payment to ${payment.customer}: ${payment.title}`,
            reference: payment.reference || payment.id,
            cashIn: 0,
            cashOut: payment.amount,
            vendorId: payment.customerId
        };
        
        await window.dbService.addCashTransaction(transaction);
    } catch (error) {
        console.error('Error adding cash transaction:', error);
        throw error;
    }
}

async function addBankPaymentTransaction(payment) {
    try {
        console.log(`Adding bank transaction for payment: ${payment.id}`);
        
        const transaction = {
            date: payment.date,
            description: `Payment to ${payment.customer}: ${payment.title}`,
            reference: payment.reference || payment.id,
            deposit: 0,
            withdrawal: payment.amount,
            vendorId: payment.customerId,
            chequeNumber: payment.chequeNumber
        };
        
        await window.dbService.addBankTransaction(transaction);
    } catch (error) {
        console.error('Error adding bank transaction:', error);
        throw error;
    }
}

async function updateCustomerPayment(customerId, amount, payment) {
    try {
        console.log(`Updating customer payment for ID: ${customerId}`);
        
        const customer = await window.dbService.getCustomerById(customerId);
        if (!customer) {
            console.warn(`Customer not found with ID: ${customerId}`);
            return;
        }
        
        // Add transaction to customer
        const transaction = {
            date: payment.date,
            description: payment.title || 'Payment',
            type: 'Payment',
            debit: 0,
            credit: amount,
            reference: payment.id,
            balance: 0 // Will be calculated by service
        };
        
        await window.dbService.addCustomerTransaction(customerId, transaction);
    } catch (error) {
        console.error('Error updating customer payment:', error);
        throw error;
    }
}



// Make sure deletePayment method exists
window.dbService.deletePayment = window.dbService.deletePayment || async function(id) {
    try {
        const payments = await window.dbService.getPayments() || [];
        const updatedPayments = payments.filter(p => p.id !== id);
        
        // Save to storage
        if (window.db && typeof window.db.set === 'function') {
            await window.db.set('payments', updatedPayments);
        } else {
            localStorage.setItem('payments', JSON.stringify(updatedPayments));
        }
        
        return true;
    } catch (error) {
        console.error(`Error deleting payment ${id}:`, error);
        throw error;
    }
};