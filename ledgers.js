// ledgers.js - Ledgers Management

// Pagination variables for Cash Ledger
let cashCurrentPage = 1;
let cashPageSize = 20;
let cashTotalTransactions = 0;
let cashFilteredTransactions = [];

// Pagination variables for Bank Ledger
let bankCurrentPage = 1;
let bankPageSize = 20;
let bankTotalTransactions = 0;
let bankFilteredTransactions = [];

// Pagination variables for Trade Receivable
let receivableCurrentPage = 1;
let receivablePageSize = 20;
let receivableTotalItems = 0;
let receivableFilteredItems = [];

// Pagination variables for Trade Payable
let payableCurrentPage = 1;
let payablePageSize = 20;
let payableTotalItems = 0;
let payableFilteredItems = [];

// Cash Ledger Functions
async function loadCashLedger() {
    try {
        console.log('Loading cash ledger data');
        
        // Get cash transactions from database
        const cashTransactions = await window.dbService.getCashTransactions() || [];
        
        // Store for pagination
        cashFilteredTransactions = cashTransactions;
        cashTotalTransactions = cashFilteredTransactions.length;
        
        // Update cash summary
        updateCashSummary(cashTransactions);
        
        // Render cash ledger table with pagination
        renderCashLedgerTable();
        
        // Set up pagination controls
        setupCashPaginationControls();
        
        // Set today's date as default for filter end date
        const today = window.utils.getTodayDate();
        // Set 30 days ago as default for filter start date
        const thirtyDaysAgo = window.utils.getDateDaysAgo(30);
        
        const startDateInput = document.getElementById('filter-date-start');
        const endDateInput = document.getElementById('filter-date-end');
        
        if (startDateInput && !startDateInput.value) startDateInput.value = thirtyDaysAgo;
        if (endDateInput && !endDateInput.value) endDateInput.value = today;
    } catch (error) {
        console.error('Failed to load cash ledger data:', error);
        window.utils.showNotification('Failed to load cash ledger data', 'error');
    }
}

function updateCashSummary(cashTransactions) {
    // Calculate totals
    cashTransactions = cashTransactions || [];
    const totalCashIn = cashTransactions.reduce((sum, tx) => sum + (tx.cashIn || 0), 0);
    const totalCashOut = cashTransactions.reduce((sum, tx) => sum + (tx.cashOut || 0), 0);
    const cashBalance = totalCashIn - totalCashOut;
    
    // Update UI
    const cashBalanceEl = document.getElementById('cash-balance');
    const cashInEl = document.getElementById('cash-in');
    const cashOutEl = document.getElementById('cash-out');
    
    if (cashBalanceEl) cashBalanceEl.textContent = window.utils.formatCurrency(cashBalance);
    if (cashInEl) cashInEl.textContent = window.utils.formatCurrency(totalCashIn);
    if (cashOutEl) cashOutEl.textContent = window.utils.formatCurrency(totalCashOut);
}

function renderCashLedgerTable() {
    const ledgerBody = document.getElementById('cash-ledger-body');
    if (!ledgerBody) return;
    
    ledgerBody.innerHTML = '';
    
    if (!cashFilteredTransactions || cashFilteredTransactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="px-4 py-2 text-center text-gray-500">No transactions found</td>
        `;
        ledgerBody.appendChild(row);
        return;
    }
    
    // Sort by date (newest first)
    const sortedTransactions = [...cashFilteredTransactions].sort((a, b) => {
        // First sort by date
        const dateComparison = new Date(b.date) - new Date(a.date);
        
        // If dates are the same, sort by recent additions first (if available)
        if (dateComparison === 0 && a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        
        return dateComparison;
    });
    
    // Calculate items for current page
    const startIndex = (cashCurrentPage - 1) * cashPageSize;
    const endIndex = Math.min(startIndex + cashPageSize, sortedTransactions.length);
    const currentPageItems = sortedTransactions.slice(startIndex, endIndex);
    
    // Calculate running balance
    let runningBalance = 0;
    if (startIndex > 0) {
        // Calculate the balance up to the current page
        for (let i = 0; i < startIndex; i++) {
            runningBalance += (sortedTransactions[i].cashIn || 0) - (sortedTransactions[i].cashOut || 0);
        }
    }
    
    currentPageItems.forEach(tx => {
        // Update running balance for this transaction
        runningBalance += (tx.cashIn || 0) - (tx.cashOut || 0);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-2">${tx.date}</td>
            <td class="px-4 py-2">${tx.description || 'N/A'}</td>
            <td class="px-4 py-2">${tx.reference || '-'}</td>
            <td class="px-4 py-2 text-green-600">${tx.cashIn > 0 ? window.utils.formatCurrency(tx.cashIn) : '-'}</td>
            <td class="px-4 py-2 text-red-600">${tx.cashOut > 0 ? window.utils.formatCurrency(tx.cashOut) : '-'}</td>
            <td class="px-4 py-2 font-semibold">${window.utils.formatCurrency(runningBalance)}</td>
        `;
        ledgerBody.appendChild(row);
    });
}

// Set up pagination controls for cash ledger
function setupCashPaginationControls() {
    const container = document.getElementById('cash-pagination-controls');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Total pages
    const totalPages = Math.ceil(cashTotalTransactions / cashPageSize);
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.className = `px-3 py-1 rounded ${cashCurrentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
    prevButton.disabled = cashCurrentPage === 1;
    if (cashCurrentPage > 1) {
        prevButton.addEventListener('click', () => {
            cashCurrentPage--;
            renderCashLedgerTable();
            setupCashPaginationControls();
        });
    }
    container.appendChild(prevButton);
    
    // Page numbers
    const maxPageButtons = 5;
    let startPage = Math.max(1, cashCurrentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons && startPage > 1) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = `px-3 py-1 mx-1 rounded ${i === cashCurrentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`;
        if (i !== cashCurrentPage) {
            pageButton.addEventListener('click', () => {
                cashCurrentPage = i;
                renderCashLedgerTable();
                setupCashPaginationControls();
            });
        }
        container.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.className = `px-3 py-1 rounded ${cashCurrentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
    nextButton.disabled = cashCurrentPage === totalPages;
    if (cashCurrentPage < totalPages) {
        nextButton.addEventListener('click', () => {
            cashCurrentPage++;
            renderCashLedgerTable();
            setupCashPaginationControls();
        });
    }
    container.appendChild(nextButton);
    
    // Page size selector listener
    const pageSizeElement = document.getElementById('cash-page-size');
    if (pageSizeElement) {
        pageSizeElement.addEventListener('change', function() {
            cashPageSize = parseInt(this.value);
            cashCurrentPage = 1;
            renderCashLedgerTable();
            setupCashPaginationControls();
        });
    }
}
async function addCashTransaction(transaction) {
  try {
      // Add timestamp for sorting
      transaction.createdAt = new Date().toISOString();
      
      // Save to database
      await window.dbService.addCashTransaction(transaction);
      
      // Reload data
      await loadCashLedger();
      
      // Show notification
      window.utils.showNotification('Cash transaction added successfully', 'success');
  } catch (error) {
      console.error('Error adding cash transaction:', error);
      window.utils.showNotification('Failed to add cash transaction', 'error');
  }
}

// Bank Ledger Functions
async function loadBankLedger() {
  try {
      console.log('Loading bank ledger data');
      
      // Get bank transactions from database
      const bankTransactions = await window.dbService.getBankTransactions() || [];
      
      // Store for pagination
      bankFilteredTransactions = bankTransactions;
      bankTotalTransactions = bankFilteredTransactions.length;
      
      // Update bank summary
      updateBankSummary(bankTransactions);
      
      // Render bank ledger table with pagination
      renderBankLedgerTable();
      
      // Set up pagination controls
      setupBankPaginationControls();
      
      // Set today's date as default for filter end date
      const today = window.utils.getTodayDate();
      // Set 30 days ago as default for filter start date
      const thirtyDaysAgo = window.utils.getDateDaysAgo(30);
      
      const startDateInput = document.getElementById('filter-date-start');
      const endDateInput = document.getElementById('filter-date-end');
      
      if (startDateInput && !startDateInput.value) startDateInput.value = thirtyDaysAgo;
      if (endDateInput && !endDateInput.value) endDateInput.value = today;
  } catch (error) {
      console.error('Failed to load bank ledger data:', error);
      window.utils.showNotification('Failed to load bank ledger data', 'error');
  }
}

function updateBankSummary(bankTransactions) {
  // Calculate totals
  bankTransactions = bankTransactions || [];
  const totalDeposits = bankTransactions.reduce((sum, tx) => sum + (tx.deposit || 0), 0);
  const totalWithdrawals = bankTransactions.reduce((sum, tx) => sum + (tx.withdrawal || 0), 0);
  const bankBalance = totalDeposits - totalWithdrawals;
  
  // Update UI
  const bankBalanceEl = document.getElementById('bank-balance');
  const totalDepositsEl = document.getElementById('total-deposits');
  const totalWithdrawalsEl = document.getElementById('total-withdrawals');
  
  if (bankBalanceEl) bankBalanceEl.textContent = window.utils.formatCurrency(bankBalance);
  if (totalDepositsEl) totalDepositsEl.textContent = window.utils.formatCurrency(totalDeposits);
  if (totalWithdrawalsEl) totalWithdrawalsEl.textContent = window.utils.formatCurrency(totalWithdrawals);
}

function renderBankLedgerTable() {
  const ledgerBody = document.getElementById('bank-ledger-body');
  if (!ledgerBody) return;
  
  ledgerBody.innerHTML = '';
  
  if (!bankFilteredTransactions || bankFilteredTransactions.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td colspan="6" class="px-4 py-2 text-center text-gray-500">No transactions found</td>
      `;
      ledgerBody.appendChild(row);
      return;
  }
  
  // Sort by date (newest first)
  const sortedTransactions = [...bankFilteredTransactions].sort((a, b) => {
      // First sort by date
      const dateComparison = new Date(b.date) - new Date(a.date);
      
      // If dates are the same, sort by recent additions first (if available)
      if (dateComparison === 0 && a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
      
      return dateComparison;
  });
  
  // Calculate items for current page
  const startIndex = (bankCurrentPage - 1) * bankPageSize;
  const endIndex = Math.min(startIndex + bankPageSize, sortedTransactions.length);
  const currentPageItems = sortedTransactions.slice(startIndex, endIndex);
  
  // Calculate running balance
  let runningBalance = 0;
  if (startIndex > 0) {
      // Calculate the balance up to the current page
      for (let i = 0; i < startIndex; i++) {
          runningBalance += (sortedTransactions[i].deposit || 0) - (sortedTransactions[i].withdrawal || 0);
      }
  }
  
  currentPageItems.forEach(tx => {
      // Update running balance for this transaction
      runningBalance += (tx.deposit || 0) - (tx.withdrawal || 0);
      
      const row = document.createElement('tr');
      row.innerHTML = `
          <td class="px-4 py-2">${tx.date}</td>
          <td class="px-4 py-2">${tx.description || 'N/A'}</td>
          <td class="px-4 py-2">${tx.reference || '-'}</td>
          <td class="px-4 py-2 text-green-600">${tx.deposit > 0 ? window.utils.formatCurrency(tx.deposit) : '-'}</td>
          <td class="px-4 py-2 text-red-600">${tx.withdrawal > 0 ? window.utils.formatCurrency(tx.withdrawal) : '-'}</td>
          <td class="px-4 py-2 font-semibold">${window.utils.formatCurrency(runningBalance)}</td>
      `;
      ledgerBody.appendChild(row);
  });
}

// Set up pagination controls for bank ledger
function setupBankPaginationControls() {
  const container = document.getElementById('bank-pagination-controls');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Total pages
  const totalPages = Math.ceil(bankTotalTransactions / bankPageSize);
  if (totalPages <= 0) return;
  
  // Previous button
  const prevButton = document.createElement('button');
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.className = `px-3 py-1 rounded ${bankCurrentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
  prevButton.disabled = bankCurrentPage === 1;
  if (bankCurrentPage > 1) {
      prevButton.addEventListener('click', () => {
          bankCurrentPage--;
          renderBankLedgerTable();
          setupBankPaginationControls();
      });
  }
  container.appendChild(prevButton);
  
  // Page numbers
  const maxPageButtons = 5;
  let startPage = Math.max(1, bankCurrentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  
  if (endPage - startPage + 1 < maxPageButtons && startPage > 1) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.className = `px-3 py-1 mx-1 rounded ${i === bankCurrentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`;
      if (i !== bankCurrentPage) {
          pageButton.addEventListener('click', () => {
              bankCurrentPage = i;
              renderBankLedgerTable();
              setupBankPaginationControls();
          });
      }
      container.appendChild(pageButton);
  }
  
  // Next button
  const nextButton = document.createElement('button');
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.className = `px-3 py-1 rounded ${bankCurrentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
  nextButton.disabled = bankCurrentPage === totalPages;
  if (bankCurrentPage < totalPages) {
      nextButton.addEventListener('click', () => {
          bankCurrentPage++;
          renderBankLedgerTable();
          setupBankPaginationControls();
      });
  }
  container.appendChild(nextButton);
  
  // Page size selector listener
  const pageSizeElement = document.getElementById('bank-page-size');
  if (pageSizeElement) {
      pageSizeElement.addEventListener('change', function() {
          bankPageSize = parseInt(this.value);
          bankCurrentPage = 1;
          renderBankLedgerTable();
          setupBankPaginationControls();
      });
  }
}

async function addBankTransaction(transaction) {
  try {
      // Add timestamp for sorting
      transaction.createdAt = new Date().toISOString();
      
      // Save to database
      await window.dbService.addBankTransaction(transaction);
      
      // Reload data
      await loadBankLedger();
      
      // Show notification
      window.utils.showNotification('Bank transaction added successfully', 'success');
  } catch (error) {
      console.error('Error adding bank transaction:', error);
      window.utils.showNotification('Failed to add bank transaction', 'error');
  }
}

// Trade Receivable Ledger Functions
// Update loadReceivables function to fix data loading
async function loadReceivables() {
  try {
      console.log('Loading receivables data');
      
      // First try localStorage directly for reliability
      let receivables = [];
      const storedReceivables = localStorage.getItem('receivables');
      if (storedReceivables) {
          receivables = JSON.parse(storedReceivables);
          console.log(`Found ${receivables.length} receivables in localStorage`);
      } else {
          // Try db if localStorage is empty
          try {
              if (window.db && typeof window.db.get === 'function') {
                  receivables = await window.db.get('receivables') || [];
                  console.log(`Found ${receivables.length} receivables in DB`);
              }
          } catch (error) {
              console.warn("Error getting receivables from DB:", error);
          }
      }
      
      // Debug: Log all receivables for inspection
      console.log('All loaded receivables:', receivables);
      
      // Store for pagination
      receivableFilteredItems = receivables;
      receivableTotalItems = receivableFilteredItems.length;
      
      // Update receivables summary
      updateReceivablesSummary(receivables);
      
      // Set up filters
      await setupCustomerFilter(receivables);
      
      // Render receivables table with pagination
      renderReceivablesTable();
      
      // Setup pagination controls
      setupReceivablePaginationControls();
      
      // Set today's date as default for filter end date
      const today = window.utils.getTodayDate();
      // Set 30 days ago as default for filter start date
      const thirtyDaysAgo = window.utils.getDateDaysAgo(30);
      
      const dateFromInput = document.getElementById('date-from-filter');
      const dateToInput = document.getElementById('date-to-filter');
      
      if (dateFromInput && !dateFromInput.value) dateFromInput.value = thirtyDaysAgo;
      if (dateToInput && !dateToInput.value) dateToInput.value = today;
      
      // Add event listeners for filter buttons
      setupReceivableFilterEvents();
  } catch (error) {
      console.error('Failed to load receivables data:', error);
      window.utils.showNotification('Failed to load receivables data', 'error');
  }
}

function updateReceivablesSummary(receivables) {
    const today = new Date();
    receivables = receivables || [];
    
    try {
        // Only include active receivables (not paid or reversed) in the totals
        const activeReceivables = receivables.filter(rx => rx.status !== 'paid' && rx.status !== 'reversed');
        
        const totalReceivables = activeReceivables.reduce((sum, rx) => sum + (parseFloat(rx.amount) || 0), 0);
        
        const currentReceivables = activeReceivables
            .filter(rx => !rx.dueDate || new Date(rx.dueDate) >= today)
            .reduce((sum, rx) => sum + (parseFloat(rx.amount) || 0), 0);
            
        const overdueReceivables = activeReceivables
            .filter(rx => rx.dueDate && new Date(rx.dueDate) < today)
            .reduce((sum, rx) => sum + (parseFloat(rx.amount) || 0), 0);
        
        // Update UI
        const totalEl = document.getElementById('total-receivables');
        const currentEl = document.getElementById('current-receivables');
        const overdueEl = document.getElementById('overdue-receivables');
        
        if (totalEl) totalEl.textContent = window.utils.formatCurrency(totalReceivables);
        if (currentEl) currentEl.textContent = window.utils.formatCurrency(currentReceivables);
        if (overdueEl) currentEl.textContent = window.utils.formatCurrency(overdueReceivables);
        
        console.log(`Receivables summary - Total: ${totalReceivables}, Current: ${currentReceivables}, Overdue: ${overdueReceivables}`);
    } catch (error) {
        console.error('Error updating receivables summary:', error);
    }
}

async function setupCustomerFilter(receivables) {
  const filter = document.getElementById('customer-filter');
  if (!filter) return;
  
  filter.innerHTML = '<option value="">All Customers</option>';
  
  try {
      // Get unique customers
      const customerIds = [...new Set(receivables
          .filter(rx => rx.customerId)
          .map(rx => rx.customerId))];
      
      if (customerIds.length > 0) {
          console.log(`Found ${customerIds.length} unique customers in receivables`);
          
          // Get customer details and sort alphabetically
          const customers = [];
          for (const customerId of customerIds) {
              try {
                  const customer = await window.dbService.getCustomerById(customerId);
                  if (customer && customer.name) {
                      customers.push(customer);
                  }
              } catch (error) {
                  console.warn(`Error getting customer ${customerId}:`, error);
              }
          }
          
          customers.sort((a, b) => a.name.localeCompare(b.name));
          
          // Add options to dropdown
          customers.forEach(customer => {
              const option = document.createElement('option');
              option.value = customer._id;
              option.textContent = customer.name;
              filter.appendChild(option);
          });
      }
  } catch (error) {
      console.error('Error setting up customer filter:', error);
  }
}

function renderReceivablesTable() {
  const tbody = document.getElementById('receivables-body');
  if (!tbody) {
      console.warn('Receivables table body not found');
      return;
  }
  
  tbody.innerHTML = '';
  
  if (!receivableFilteredItems || receivableFilteredItems.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td colspan="7" class="px-4 py-2 text-center text-gray-500">No receivables found</td>
      `;
      tbody.appendChild(row);
      return;
  }
  
  console.log(`Rendering ${receivableFilteredItems.length} receivables out of ${receivableTotalItems} total`);
  
  // Sort by date (newest first)
  const sortedReceivables = [...receivableFilteredItems].sort((a, b) => {
      // First sort by date
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      const dateComparison = dateB - dateA;
      
      // If dates are same, use creation date if available
      if (dateComparison === 0) {
          if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
          }
      }
      
      return dateComparison;
  });
  
  // Calculate items for current page
  const startIndex = (receivableCurrentPage - 1) * receivablePageSize;
  const endIndex = Math.min(startIndex + receivablePageSize, sortedReceivables.length);
  const currentPageItems = sortedReceivables.slice(startIndex, endIndex);
  
  console.log(`Displaying receivables ${startIndex+1}-${endIndex} of ${sortedReceivables.length}`);
  
  // Debug: Log all receivables for troubleshooting
  console.log('All filtered receivables:', receivableFilteredItems);
  console.log('Current page receivables:', currentPageItems);
  
  // Process items for this page
  const today = new Date();
  
  currentPageItems.forEach(receivable => {
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
      
      const row = document.createElement('tr');
      row.innerHTML = `
          <td class="px-4 py-2">${receivable.id || receivable.billId || 'N/A'}</td>
          <td class="px-4 py-2">${receivable.date || 'N/A'}</td>
          <td class="px-4 py-2">${receivable.customer || 'N/A'}</td>
          <td class="px-4 py-2">${receivable.dueDate || '-'}</td>
          <td class="px-4 py-2">${window.utils.formatCurrency(receivable.amount || 0)}</td>
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
  
  // Add event listeners to action buttons
  attachReceivableActionListeners();
}

function setupReceivablePaginationControls() {
  const container = document.getElementById('receivable-pagination-controls');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Total pages
  const totalPages = Math.ceil(receivableTotalItems / receivablePageSize);
  if (totalPages <= 0) return;
  
  // Previous button
  const prevButton = document.createElement('button');
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.className = `px-3 py-1 rounded ${receivableCurrentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
  prevButton.disabled = receivableCurrentPage === 1;
  if (receivableCurrentPage > 1) {
      prevButton.addEventListener('click', () => {
          receivableCurrentPage--;
          renderReceivablesTable();
          setupReceivablePaginationControls();
      });
  }
  container.appendChild(prevButton);
  
  // Page numbers
  const maxPageButtons = 5;
  let startPage = Math.max(1, receivableCurrentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  
  if (endPage - startPage + 1 < maxPageButtons && startPage > 1) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.className = `px-3 py-1 mx-1 rounded ${i === receivableCurrentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`;
      if (i !== receivableCurrentPage) {
          pageButton.addEventListener('click', () => {
              receivableCurrentPage = i;
              renderReceivablesTable();
              setupReceivablePaginationControls();
          });
      }
      container.appendChild(pageButton);
  }
  
  // Next button
  const nextButton = document.createElement('button');
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.className = `px-3 py-1 rounded ${receivableCurrentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
  nextButton.disabled = receivableCurrentPage === totalPages;
  if (receivableCurrentPage < totalPages) {
      nextButton.addEventListener('click', () => {
          receivableCurrentPage++;
          renderReceivablesTable();
          setupReceivablePaginationControls();
      });
  }
  container.appendChild(nextButton);
  
  // Page size selector listener
  const pageSizeElement = document.getElementById('receivable-page-size');
  if (pageSizeElement) {
      pageSizeElement.addEventListener('change', function() {
          receivablePageSize = parseInt(this.value);
          receivableCurrentPage = 1;
          renderReceivablesTable();
          setupReceivablePaginationControls();
      });
  }
}

function setupReceivableFilterEvents() {
  const applyFilterBtn = document.getElementById('apply-filter');
  const resetFilterBtn = document.getElementById('reset-filter');
  const searchInput = document.getElementById('search-receivables');
  const customerFilter = document.getElementById('customer-filter');
  const statusFilter = document.getElementById('status-filter');
  
  if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', filterReceivables);
  }
  
  if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', resetReceivableFilters);
  }
  
  // Immediate filtering for search
  if (searchInput) {
      searchInput.addEventListener('input', filterReceivables);
  }
  
  // Filter changes
  if (customerFilter) {
      customerFilter.addEventListener('change', filterReceivables);
  }
  
  if (statusFilter) {
      statusFilter.addEventListener('change', filterReceivables);
  }
}

async function filterReceivables() {
  try {
      console.log('Filtering receivables');
      const searchTerm = document.getElementById('search-receivables')?.value?.toLowerCase();
      const customerId = document.getElementById('customer-filter')?.value;
      const status = document.getElementById('status-filter')?.value;
      const dateFrom = document.getElementById('date-from-filter')?.value;
      const dateTo = document.getElementById('date-to-filter')?.value;
      
      console.log(`Filter criteria - Customer: ${customerId}, Status: ${status}, Date range: ${dateFrom} to ${dateTo}, Search: ${searchTerm}`);
      
      // Get all receivables
      const allReceivables = await window.dbService.getReceivables() || [];
      let filtered = [...allReceivables];
      
      // Filter by customer
      if (customerId) {
          filtered = filtered.filter(rx => rx.customerId === customerId);
      }
      
      // Filter by status
      if (status) {
          if (status === 'current') {
              filtered = filtered.filter(rx => {
                  // Not paid or reversed, and not overdue
                  if (rx.status === 'paid' || rx.status === 'reversed') return false;
                  return !rx.dueDate || new Date(rx.dueDate) >= new Date();
              });
          } else if (status === 'overdue') {
              filtered = filtered.filter(rx => {
                  // Not paid or reversed, and overdue
                  if (rx.status === 'paid' || rx.status === 'reversed') return false;
                  return rx.dueDate && new Date(rx.dueDate) < new Date();
              });
          } else {
              // Filter by status directly
              filtered = filtered.filter(rx => rx.status === status);
          }
      }
      
      // Filter by date range
      if (dateFrom && dateTo) {
          filtered = filtered.filter(rx => rx.date >= dateFrom && rx.date <= dateTo);
      } else if (dateFrom) {
          filtered = filtered.filter(rx => rx.date >= dateFrom);
      } else if (dateTo) {
          filtered = filtered.filter(rx => rx.date <= dateTo);
      }
      
      // Filter by search term
      if (searchTerm) {
          filtered = filtered.filter(rx => 
              (rx.id && rx.id.toLowerCase().includes(searchTerm)) || 
              (rx.billId && rx.billId.toLowerCase().includes(searchTerm)) || 
              (rx.customer && rx.customer.toLowerCase().includes(searchTerm)) || 
              (rx.reference && rx.reference.toLowerCase().includes(searchTerm))
          );
      }
      
      console.log(`Filtered receivables: ${filtered.length} of ${allReceivables.length}`);
      
      // Update filtered items
      receivableFilteredItems = filtered;
      receivableTotalItems = receivableFilteredItems.length;
      receivableCurrentPage = 1; // Reset to first page
      
      // Update UI
      renderReceivablesTable();
      setupReceivablePaginationControls();
  } catch (error) {
      console.error('Error filtering receivables:', error);
      window.utils.showNotification('Error applying filters', 'error');
  }
}

function resetReceivableFilters() {
  // Reset all filter inputs
  const searchInput = document.getElementById('search-receivables');
  const customerFilter = document.getElementById('customer-filter');
  const statusFilter = document.getElementById('status-filter');
  const dateFromFilter = document.getElementById('date-from-filter');
  const dateToFilter = document.getElementById('date-to-filter');
  
  if (searchInput) searchInput.value = '';
  if (customerFilter) customerFilter.value = '';
  if (statusFilter) statusFilter.value = '';
  if (dateFromFilter) dateFromFilter.value = window.utils.getDateDaysAgo(30);
  if (dateToFilter) dateToFilter.value = window.utils.getTodayDate();
  
  // Reload all receivables
  loadReceivables();
}

function attachReceivableActionListeners() {
  // View details buttons
  document.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', async function() {
          const id = this.getAttribute('data-id');
          try {
              const receivables = await window.dbService.getReceivables();
              const receivable = receivables.find(r => r.id === id);
              
              if (receivable) {
                  showReceivableDetailsModal(receivable);
              } else {
                  window.utils.showNotification('Receivable not found', 'error');
              }
          } catch (error) {
              console.error(`Error getting receivable ${id}:`, error);
              window.utils.showNotification('Error loading receivable details', 'error');
          }
      });
  });
  
  // Record payment buttons
  document.querySelectorAll('.record-payment').forEach(btn => {
      btn.addEventListener('click', async function() {
          const id = this.getAttribute('data-id');
          try {
              const receivables = await window.dbService.getReceivables();
              const receivable = receivables.find(r => r.id === id);
              
              if (receivable) {
                  showReceivablePaymentModal(receivable);
              } else {
                  window.utils.showNotification('Receivable not found', 'error');
              }
          } catch (error) {
              console.error(`Error getting receivable ${id}:`, error);
              window.utils.showNotification('Error loading receivable for payment', 'error');
          }
      });
  });
}

function showReceivableDetailsModal(receivable) {
  try {
      const modal = document.getElementById('receivable-details-modal');
      const titleElem = document.getElementById('receivable-details-title');
      const contentElem = document.getElementById('receivable-details-content');
      const paymentBtn = document.getElementById('record-payment-btn');
      
      if (!modal || !titleElem || !contentElem || !paymentBtn) {
          console.error('Receivable details modal elements not found');
          return;
      }
      
      // Update title
      titleElem.textContent = `Receivable Details: ${receivable.id || receivable.billId || 'Unknown'}`;
      
      // Determine status
      let status = 'Current';
      let statusClass = 'text-green-600';
      
      if (receivable.status === 'paid') {
          status = 'Paid';
          statusClass = 'text-gray-600';
      } else if (receivable.status === 'reversed') {
          status = 'Reversed';
          statusClass = 'text-gray-600';
      } else if (receivable.dueDate && new Date(receivable.dueDate) < new Date()) {
          status = 'Overdue';
          statusClass = 'text-red-600';
      }
      
      // Format content
      contentElem.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                  <p class="text-sm text-gray-500">Customer</p>
                  <p class="font-medium">${receivable.customer || 'N/A'}</p>
              </div>
              
              <div>
                  <p class="text-sm text-gray-500">Amount</p>
                  <p class="font-medium">${window.utils.formatCurrency(receivable.amount || 0)}</p>
              </div>
              
              <div>
                  <p class="text-sm text-gray-500">Date</p>
                  <p class="font-medium">${receivable.date || 'N/A'}</p>
              </div>
              
              <div>
                  <p class="text-sm text-gray-500">Status</p>
                  <p class="font-medium ${statusClass}">${status}</p>
              </div>
              
              ${receivable.dueDate ? `
              <div>
                  <p class="text-sm text-gray-500">Due Date</p>
                  <p class="font-medium">${receivable.dueDate}</p>
              </div>
              ` : ''}
              
              ${receivable.billId ? `
              <div>
                  <p class="text-sm text-gray-500">Invoice Reference</p>
                  <p class="font-medium">${receivable.billId}</p>
              </div>
              ` : ''}
              
              ${receivable.reference ? `
              <div>
                  <p class="text-sm text-gray-500">Reference</p>
                  <p class="font-medium">${receivable.reference}</p>
              </div>
              ` : ''}
              
              ${receivable.paymentDate ? `
              <div>
                  <p class="text-sm text-gray-500">Payment Date</p>
                  <p class="font-medium">${receivable.paymentDate}</p>
              </div>
              ` : ''}
              
              ${receivable.paymentMethod ? `
              <div>
                  <p class="text-sm text-gray-500">Payment Method</p>
                  <p class="font-medium">${receivable.paymentMethod}</p>
              </div>
              ` : ''}
              
              ${receivable.paymentReference ? `
              <div>
                  <p class="text-sm text-gray-500">Payment Reference</p>
                  <p class="font-medium">${receivable.paymentReference}</p>
              </div>
              ` : ''}
          </div>
      `;
      
      // Show/hide record payment button
      if (receivable.status === 'paid' || receivable.status === 'reversed') {
          paymentBtn.style.display = 'none';
      } else {
          paymentBtn.style.display = 'block';
          paymentBtn.setAttribute('data-id', receivable.id);
      }
      
      // Show modal
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
      
      // Add close event handlers
      document.getElementById('close-details-modal').addEventListener('click', closeReceivableDetailsModal);
      document.getElementById('close-details-btn').addEventListener('click', closeReceivableDetailsModal);
      document.getElementById('record-payment-btn').addEventListener('click', function() {
          closeReceivableDetailsModal();
          const receivableId = this.getAttribute('data-id');
          if (receivableId) {
              window.dbService.getReceivables().then(receivables => {
                  const receivable = receivables.find(r => r.id === receivableId);
                  if (receivable) {
                      showReceivablePaymentModal(receivable);
                  }
              }).catch(err => console.error('Error getting receivable:', err));
          }
      });
      
      function closeReceivableDetailsModal() {
          modal.classList.add('opacity-0');
          modal.classList.add('pointer-events-none');
      }
  } catch (error) {
      console.error('Error showing receivable details:', error);
      window.utils.showNotification('Error displaying details', 'error');
  }
}

function showReceivablePaymentModal(receivable) {
  try {
      const modal = document.getElementById('payment-modal');
      const titleElem = document.getElementById('payment-modal-title');
      const customerElem = document.getElementById('payment-customer-name');
      const amountElem = document.getElementById('payment-amount-display');
      const receivableIdInput = document.getElementById('receivableId');
      const amountInput = document.getElementById('paymentAmount');
      const dateInput = document.getElementById('paymentDate');
      const paymentMethodSelect = document.getElementById('paymentMethod');
      
      if (!modal || !titleElem || !customerElem || !amountElem || !receivableIdInput || 
          !amountInput || !dateInput || !paymentMethodSelect) {
          console.error('Payment modal elements not found');
          return;
      }
      
      // Update fields
      titleElem.textContent = `Record Payment for ${receivable.id}`;
      customerElem.textContent = receivable.customer || 'Unknown';
      amountElem.textContent = window.utils.formatCurrency(receivable.amount || 0);
      receivableIdInput.value = receivable.id;
      amountInput.value = receivable.amount || 0;
      dateInput.value = window.utils.getTodayDate();
      
      // Setup payment method change handler
      paymentMethodSelect.addEventListener('change', function() {
          const chequeField = document.getElementById('cheque-field');
          if (chequeField) {
              chequeField.classList.toggle('hidden', this.value !== 'cheque');
          }
      });
      
      // Show modal
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
      
      // Add event handlers
      document.getElementById('close-payment-modal').addEventListener('click', closePaymentModal);
      document.getElementById('cancel-payment').addEventListener('click', closePaymentModal);
      document.getElementById('payment-form').addEventListener('submit', function(e) {
          e.preventDefault();
          processReceivablePayment();
      });
      
      function closePaymentModal() {
          modal.classList.add('opacity-0');
          modal.classList.add('pointer-events-none');
          document.getElementById('payment-form').reset();
      }
  } catch (error) {
      console.error('Error showing payment modal:', error);
      window.utils.showNotification('Error preparing payment form', 'error');
  }
}

async function processReceivablePayment() {
  try {
      const receivableId = document.getElementById('receivableId').value;
      const paymentMethod = document.getElementById('paymentMethod').value;
      const amount = parseFloat(document.getElementById('paymentAmount').value);
      const date = document.getElementById('paymentDate').value;
      const reference = document.getElementById('paymentReference').value;
      const chequeNumber = paymentMethod === 'cheque' ? document.getElementById('chequeNumber').value : null;
      
      if (!receivableId) {
          window.utils.showNotification('Receivable ID is required', 'error');
          return;
      }
      
      if (!amount || isNaN(amount) || amount <= 0) {
          window.utils.showNotification('Please enter a valid amount', 'error');
          return;
      }
      
      if (paymentMethod === 'cheque' && !chequeNumber) {
          window.utils.showNotification('Please enter a cheque number', 'error');
          return;
      }
      
      // Get the receivable
      const receivables = await window.dbService.getReceivables();
      const receivable = receivables.find(r => r.id === receivableId);
      
      if (!receivable) {
          window.utils.showNotification('Receivable not found', 'error');
          return;
      }
      
      // Create a unique payment ID
      const paymentId = `RCP-${Date.now().toString().substring(7)}`;
      
      // Process payment based on selected method
      if (paymentMethod === 'cash') {
          // Add cash transaction
          await window.dbService.addCashTransaction({
              date,
              description: `Receipt from ${receivable.customer}`,
              reference: reference || paymentId,
              cashIn: amount,
              cashOut: 0,
              customerId: receivable.customerId
          });
      } else if (paymentMethod === 'bank' || paymentMethod === 'cheque') {
          // Add bank transaction
          await window.dbService.addBankTransaction({
              date,
              description: `Receipt from ${receivable.customer}`,
              reference: reference || paymentId,
              deposit: amount,
              withdrawal: 0,
              customerId: receivable.customerId,
              chequeNumber: chequeNumber
          });
      }
      
      // Update receivable status to paid
      receivable.status = 'paid';
      receivable.paymentDate = date;
      receivable.paymentMethod = paymentMethod;
      receivable.paymentReference = reference || paymentId;
      
      if (chequeNumber) {
          receivable.chequeNumber = chequeNumber;
      }
      
      // Update in database
      await window.dbService.updateReceivable(receivableId, receivable);
      
      // Update customer transaction ledger
      if (receivable.customerId) {
          await window.dbService.addCustomerTransaction(receivable.customerId, {
              date,
              description: `Payment received for ${receivable.id}`,
              type: 'Receipt',
              debit: 0,
              credit: amount,
              reference: paymentId,
              balance: 0 // Will be calculated by the service
          });
      }
      
      // Create receipt record
      const receiptRecord = {
          id: paymentId,
          date,
          customer: receivable.customer,
          customerId: receivable.customerId,
          title: `Payment for ${receivable.id}`,
          description: `Received payment for invoice ${receivable.id}`,
          amount,
          receiptType: paymentMethod === 'cheque' ? 'bank' : paymentMethod,
          reference: reference || `INV-${receivable.id}`,
          createdAt: new Date().toISOString()
      };
      
      if (chequeNumber) {
          receiptRecord.chequeNumber = chequeNumber;
      }
      
      // Save receipt record
      await window.dbService.addReceipt(receiptRecord);
      
      // Close modal
      document.getElementById('payment-modal').classList.add('opacity-0');
      document.getElementById('payment-modal').classList.add('pointer-events-none');
      
      // Refresh data
      await loadReceivables();
      
      window.utils.showNotification('Payment recorded successfully', 'success');
  } catch (error) {
      console.error('Error processing payment:', error);
      window.utils.showNotification('Failed to process payment', 'error');
  }
}

// Trade Payable Ledger Functions
async function loadPayables() {
  try {
      console.log('Loading payables data');
      
      // First try localStorage directly for reliability
      let payables = [];
      const storedPayables = localStorage.getItem('payables');
      if (storedPayables) {
          payables = JSON.parse(storedPayables);
          console.log(`Found ${payables.length} payables in localStorage`);
      } else {
          // Try db if localStorage is empty
          try {
              if (window.db && typeof window.db.get === 'function') {
                  payables = await window.db.get('payables') || [];
                  console.log(`Found ${payables.length} payables in DB`);
              }
          } catch (error) {
              console.warn("Error getting payables from DB:", error);
          }
      }
      
      // Debug: Log all payables for inspection
      console.log('All loaded payables:', payables);
      
      // Store for pagination
      payableFilteredItems = payables;
      payableTotalItems = payableFilteredItems.length;
      
      // Update payables summary
      updatePayablesSummary(payables);
      
      // Set up filters
      await setupVendorFilter(payables);
      
      // Render payables table with pagination
      renderPayablesTable();
      
      // Setup pagination controls
      setupPayablePaginationControls();
      
      // Set today's date as default for filter end date
      const today = window.utils.getTodayDate();
      // Set 30 days ago as default for filter start date
      const thirtyDaysAgo = window.utils.getDateDaysAgo(30);
      
      const dateFromInput = document.getElementById('date-from-filter');
      const dateToInput = document.getElementById('date-to-filter');
      
      if (dateFromInput && !dateFromInput.value) dateFromInput.value = thirtyDaysAgo;
      if (dateToInput && !dateToInput.value) dateToInput.value = today;
      
      // Add event listeners for filter buttons
      setupPayableFilterEvents();
  } catch (error) {
      console.error('Failed to load payables data:', error);
      window.utils.showNotification('Failed to load payables data', 'error');
  }
}

function updatePayablesSummary(payables) {
    const today = new Date();
    payables = payables || [];
    
    try {
        // Only include active payables (not paid or reversed) in the totals
        const activePayables = payables.filter(px => px.status !== 'paid' && px.status !== 'reversed');
        
        const totalPayables = activePayables.reduce((sum, px) => sum + (parseFloat(px.amount) || 0), 0);
        
        const currentPayables = activePayables
            .filter(px => !px.dueDate || new Date(px.dueDate) >= today)
            .reduce((sum, px) => sum + (parseFloat(px.amount) || 0), 0);
            
        const overduePayables = activePayables
            .filter(px => px.dueDate && new Date(px.dueDate) < today)
            .reduce((sum, px) => sum + (parseFloat(px.amount) || 0), 0);
        
        // Update UI
        const totalEl = document.getElementById('total-payables');
        const currentEl = document.getElementById('current-payables');
        const overdueEl = document.getElementById('overdue-payables');
        
        if (totalEl) totalEl.textContent = window.utils.formatCurrency(totalPayables);
        if (currentEl) currentEl.textContent = window.utils.formatCurrency(currentPayables);
        if (overdueEl) overdueEl.textContent = window.utils.formatCurrency(overduePayables);
        
        console.log(`Payables summary - Total: ${totalPayables}, Current: ${currentPayables}, Overdue: ${overduePayables}`);
    } catch (error) {
        console.error('Error updating payables summary:', error);
    }
}

async function setupVendorFilter(payables) {
  const filter = document.getElementById('vendor-filter');
  if (!filter) return;
  
  filter.innerHTML = '<option value="">All Vendors</option>';
  
  try {
      // Get unique vendors
      const vendorIds = [...new Set(payables
          .filter(px => px.vendorId)
          .map(px => px.vendorId))];
      
      if (vendorIds.length > 0) {
          console.log(`Found ${vendorIds.length} unique vendors in payables`);
          
          // Get vendor details and sort alphabetically
          const vendors = [];
          for (const vendorId of vendorIds) {
              try {
                  const vendor = await window.dbService.getCustomerById(vendorId);
                  if (vendor && vendor.name) {
                      vendors.push(vendor);
                  }
              } catch (error) {
                  console.warn(`Error getting vendor ${vendorId}:`, error);
              }
          }
          
          vendors.sort((a, b) => a.name.localeCompare(b.name));
          
          // Add options to dropdown
          vendors.forEach(vendor => {
              const option = document.createElement('option');
              option.value = vendor._id;
              option.textContent = vendor.name;
              filter.appendChild(option);
          });
      }
  } catch (error) {
      console.error('Error setting up vendor filter:', error);
  }
}

function renderPayablesTable() {
  const tbody = document.getElementById('payables-body');
  if (!tbody) {
      console.warn('Payables table body not found');
      return;
  }
  
  tbody.innerHTML = '';
  
  if (!payableFilteredItems || payableFilteredItems.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td colspan="7" class="px-4 py-2 text-center text-gray-500">No payables found</td>
      `;
      tbody.appendChild(row);
      return;
  }
  
  console.log(`Rendering ${payableFilteredItems.length} payables out of ${payableTotalItems} total`);
  
  // Sort by date (newest first)
  const sortedPayables = [...payableFilteredItems].sort((a, b) => {
      // First sort by date
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      const dateComparison = dateB - dateA;
      
      // If dates are same, use creation date if available
      if (dateComparison === 0) {
          if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
          }
      }
      
      return dateComparison;
  });
  
  // Calculate items for current page
  const startIndex = (payableCurrentPage - 1) * payablePageSize;
  const endIndex = Math.min(startIndex + payablePageSize, sortedPayables.length);
  const currentPageItems = sortedPayables.slice(startIndex, endIndex);
  
  console.log(`Displaying payables ${startIndex+1}-${endIndex} of ${sortedPayables.length}`);
  
  // Process items for this page
  const today = new Date();
  
  // Debug: Log all payables for troubleshooting
  console.log('All filtered payables:', payableFilteredItems);
  console.log('Current page payables:', currentPageItems);
  
  currentPageItems.forEach(payable => {
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
      
      const row = document.createElement('tr');
      row.innerHTML = `
          <td class="px-4 py-2">${payable.id || payable.purchaseId || 'N/A'}</td>
          <td class="px-4 py-2">${payable.date || 'N/A'}</td>
          <td class="px-4 py-2">${payable.vendor || 'N/A'}</td>
          <td class="px-4 py-2">${payable.dueDate || '-'}</td>
          <td class="px-4 py-2">${window.utils.formatCurrency(payable.amount || 0)}</td>
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
  
  // Add event listeners to action buttons
  attachPayableActionListeners();
}

function setupPayablePaginationControls() {
  const container = document.getElementById('payable-pagination-controls');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Total pages
  const totalPages = Math.ceil(payableTotalItems / payablePageSize);
  if (totalPages <= 0) return;
  
  // Previous button
  const prevButton = document.createElement('button');
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.className = `px-3 py-1 rounded ${payableCurrentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
  prevButton.disabled = payableCurrentPage === 1;
  if (payableCurrentPage > 1) {
      prevButton.addEventListener('click', () => {
          payableCurrentPage--;
          renderPayablesTable();
          setupPayablePaginationControls();
      });
  }
  container.appendChild(prevButton);
  
  // Page numbers
  const maxPageButtons = 5;
  let startPage = Math.max(1, payableCurrentPage - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  
  if (endPage - startPage + 1 < maxPageButtons && startPage > 1) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.textContent = i;
      pageButton.className = `px-3 py-1 mx-1 rounded ${i === payableCurrentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`;
      if (i !== payableCurrentPage) {
          pageButton.addEventListener('click', () => {
              payableCurrentPage = i;
              renderPayablesTable();
              setupPayablePaginationControls();
          });
      }
      container.appendChild(pageButton);
  }
  
  // Next button
  const nextButton = document.createElement('button');
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.className = `px-3 py-1 rounded ${payableCurrentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-200'}`;
  nextButton.disabled = payableCurrentPage === totalPages;
  if (payableCurrentPage < totalPages) {
      nextButton.addEventListener('click', () => {
          payableCurrentPage++;
          renderPayablesTable();
          setupPayablePaginationControls();
      });
  }
  container.appendChild(nextButton);
  
  // Page size selector listener
  const pageSizeElement = document.getElementById('payable-page-size');
  if (pageSizeElement) {
      pageSizeElement.addEventListener('change', function() {
          payablePageSize = parseInt(this.value);
          payableCurrentPage = 1;
          renderPayablesTable();
          setupPayablePaginationControls();
      });
  }
}

function setupPayableFilterEvents() {
  const applyFilterBtn = document.getElementById('apply-filter');
  const resetFilterBtn = document.getElementById('reset-filter');
  const searchInput = document.getElementById('search-payables');
  const vendorFilter = document.getElementById('vendor-filter');
  const statusFilter = document.getElementById('status-filter');
  
  if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', filterPayables);
  }
  
  if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', resetPayableFilters);
  }
  
  // Immediate filtering for search
  if (searchInput) {
      searchInput.addEventListener('input', filterPayables);
  }
  
  // Filter changes
  if (vendorFilter) {
      vendorFilter.addEventListener('change', filterPayables);
  }
  
  if (statusFilter) {
      statusFilter.addEventListener('change', filterPayables);
  }
}

async function filterPayables() {
  try {
      console.log('Filtering payables');
      const searchTerm = document.getElementById('search-payables')?.value?.toLowerCase();
      const vendorId = document.getElementById('vendor-filter')?.value;
      const status = document.getElementById('status-filter')?.value;
      const dateFrom = document.getElementById('date-from-filter')?.value;
      const dateTo = document.getElementById('date-to-filter')?.value;
      
      console.log(`Filter criteria - Vendor: ${vendorId}, Status: ${status}, Date range: ${dateFrom} to ${dateTo}, Search: ${searchTerm}`);
      
      // Get all payables
      const allPayables = await window.dbService.getPayables() || [];
      let filtered = [...allPayables];
      
      // Filter by vendor
      if (vendorId) {
          filtered = filtered.filter(px => px.vendorId === vendorId);
      }
      
      // Filter by status
      if (status) {
          if (status === 'current') {
              filtered = filtered.filter(px => {
                  // Not paid or reversed, and not overdue
                  if (px.status === 'paid' || px.status === 'reversed') return false;
                  return !px.dueDate || new Date(px.dueDate) >= new Date();
              });
          } else if (status === 'overdue') {
              filtered = filtered.filter(px => {
                  // Not paid or reversed, and overdue
                  if (px.status === 'paid' || px.status === 'reversed') return false;
                  return px.dueDate && new Date(px.dueDate) < new Date();
              });
          } else {
              // Filter by status directly
              filtered = filtered.filter(px => px.status === status);
          }
      }
      
      // Filter by date range
      if (dateFrom && dateTo) {
          filtered = filtered.filter(px => px.date >= dateFrom && px.date <= dateTo);
      } else if (dateFrom) {
          filtered = filtered.filter(px => px.date >= dateFrom);
      } else if (dateTo) {
          filtered = filtered.filter(px => px.date <= dateTo);
      }
      
      // Filter by search term
      if (searchTerm) {
          filtered = filtered.filter(px => 
              (px.id && px.id.toLowerCase().includes(searchTerm)) || 
              (px.purchaseId && px.purchaseId.toLowerCase().includes(searchTerm)) || 
              (px.vendor && px.vendor.toLowerCase().includes(searchTerm)) || 
              (px.reference && px.reference.toLowerCase().includes(searchTerm))
          );
      }
      
      console.log(`Filtered payables: ${filtered.length} of ${allPayables.length}`);
      
      // Update filtered items
      payableFilteredItems = filtered;
      payableTotalItems = payableFilteredItems.length;
      payableCurrentPage = 1; // Reset to first page
      
      // Update UI
      renderPayablesTable();
      setupPayablePaginationControls();
  } catch (error) {
      console.error('Error filtering payables:', error);
      window.utils.showNotification('Error applying filters', 'error');
  }
}

function resetPayableFilters() {
  // Reset all filter inputs
  const searchInput = document.getElementById('search-payables');
  const vendorFilter = document.getElementById('vendor-filter');
  const statusFilter = document.getElementById('status-filter');
  const dateFromFilter = document.getElementById('date-from-filter');
  const dateToFilter = document.getElementById('date-to-filter');
  
  if (searchInput) searchInput.value = '';
  if (vendorFilter) vendorFilter.value = '';
  if (statusFilter) statusFilter.value = '';
  if (dateFromFilter) dateFromFilter.value = window.utils.getDateDaysAgo(30);
  if (dateToFilter) dateToFilter.value = window.utils.getTodayDate();
  
  // Reload all payables
  loadPayables();
}

function attachPayableActionListeners() {
  // View details buttons
  document.querySelectorAll('.view-details').forEach(btn => {
      btn.addEventListener('click', async function() {
          const id = this.getAttribute('data-id');
          try {
              const payables = await window.dbService.getPayables();
              const payable = payables.find(p => p.id === id);
              
              if (payable) {
                  showPayableDetailsModal(payable);
              } else {
                  window.utils.showNotification('Payable not found', 'error');
              }
          } catch (error) {
              console.error(`Error getting payable ${id}:`, error);
              window.utils.showNotification('Error loading payable details', 'error');
          }
      });
  });
  
  // Make payment buttons
  document.querySelectorAll('.make-payment').forEach(btn => {
      btn.addEventListener('click', async function() {
          const id = this.getAttribute('data-id');
          try {
              const payables = await window.dbService.getPayables();
              const payable = payables.find(p => p.id === id);
              
              if (payable) {
                  showPayablePaymentModal(payable);
              } else {
                  window.utils.showNotification('Payable not found', 'error');
              }
          } catch (error) {
              console.error(`Error getting payable ${id}:`, error);
              window.utils.showNotification('Error loading payable for payment', 'error');
          }
      });
  });
}

function showPayableDetailsModal(payable) {
  try {
      const modal = document.getElementById('payable-details-modal');
      const titleElem = document.getElementById('payable-details-title');
      const contentElem = document.getElementById('payable-details-content');
      const paymentBtn = document.getElementById('make-payment-btn');
      
      if (!modal || !titleElem || !contentElem || !paymentBtn) {
          console.error('Payable details modal elements not found');
          return;
      }
      
      // Update title
      titleElem.textContent = `Payable Details: ${payable.id || payable.purchaseId || 'Unknown'}`;
      
      // Determine status
      let status = 'Current';
      let statusClass = 'text-green-600';
      
      if (payable.status === 'paid') {
          status = 'Paid';
          statusClass = 'text-gray-600';
      } else if (payable.status === 'reversed') {
          status = 'Reversed';
          statusClass = 'text-gray-600';
      } else if (payable.dueDate && new Date(payable.dueDate) < new Date()) {
          status = 'Overdue';
          statusClass = 'text-red-600';
      }
      
      // Format content
      contentElem.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                  <p class="text-sm text-gray-500">Vendor</p>
                  <p class="font-medium">${payable.vendor || 'N/A'}</p>
              </div>
              
              <div>
                  <p class="text-sm text-gray-500">Amount</p>
                  <p class="font-medium">${window.utils.formatCurrency(payable.amount || 0)}</p>
              </div>
              
              <div>
                  <p class="text-sm text-gray-500">Date</p>
                  <p class="font-medium">${payable.date || 'N/A'}</p>
              </div>
              
              <div>
                  <p class="text-sm text-gray-500">Status</p>
                  <p class="font-medium ${statusClass}">${status}</p>
              </div>
              
              ${payable.dueDate ? `
              <div>
                  <p class="text-sm text-gray-500">Due Date</p>
                  <p class="font-medium">${payable.dueDate}</p>
              </div>
              ` : ''}
              
              ${payable.purchaseId ? `
              <div>
                  <p class="text-sm text-gray-500">Purchase Reference</p>
                  <p class="font-medium">${payable.purchaseId}</p>
              </div>
              ` : ''}
              
              ${payable.reference ? `
              <div>
                  <p class="text-sm text-gray-500">Reference</p>
                  <p class="font-medium">${payable.reference}</p>
              </div>
              ` : ''}
              
              ${payable.paymentDate ? `
              <div>
                  <p class="text-sm text-gray-500">Payment Date</p>
                  <p class="font-medium">${payable.paymentDate}</p>
              </div>
              ` : ''}
              
              ${payable.paymentMethod ? `
              <div>
                  <p class="text-sm text-gray-500">Payment Method</p>
                  <p class="font-medium">${payable.paymentMethod}</p>
              </div>
              ` : ''}
              
              ${payable.chequeNumber ? `
              <div>
                  <p class="text-sm text-gray-500">Cheque Number</p>
                  <p class="font-medium">${payable.chequeNumber}</p>
              </div>
              ` : ''}
          </div>
      `;
      
      // Show/hide make payment button
      if (payable.status === 'paid' || payable.status === 'reversed') {
          paymentBtn.style.display = 'none';
      } else {
          paymentBtn.style.display = 'block';
          paymentBtn.setAttribute('data-id', payable.id);
      }
      
      // Show modal
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
      
      // Add close event handlers
      document.getElementById('close-details-modal').addEventListener('click', closePayableDetailsModal);
      document.getElementById('close-details-btn').addEventListener('click', closePayableDetailsModal);
      document.getElementById('make-payment-btn').addEventListener('click', function() {
          closePayableDetailsModal();
          const payableId = this.getAttribute('data-id');
          if (payableId) {
              window.dbService.getPayables().then(payables => {
                  const payable = payables.find(p => p.id === payableId);
                  if (payable) {
                      showPayablePaymentModal(payable);
                  }
              }).catch(err => console.error('Error getting payable:', err));
          }
      });
      
      function closePayableDetailsModal() {
          modal.classList.add('opacity-0');
          modal.classList.add('pointer-events-none');
      }
  } catch (error) {
      console.error('Error showing payable details:', error);
      window.utils.showNotification('Error displaying details', 'error');
  }
}

function showPayablePaymentModal(payable) {
    try {
        const modal = document.getElementById('payment-modal');
        const titleElem = document.getElementById('payment-modal-title');
        const vendorElem = document.getElementById('payment-vendor-name');
        const amountDisplayElem = document.getElementById('payment-amount-display');
        const payableIdInput = document.getElementById('payableId');
        const amountInput = document.getElementById('paymentAmount');
        const dateInput = document.getElementById('paymentDate');
        const paymentMethodSelect = document.getElementById('paymentMethod');
        
        if (!modal || !titleElem || !vendorElem || !amountDisplayElem || !payableIdInput || 
            !amountInput || !dateInput || !paymentMethodSelect) {
            console.error('Payment modal elements not found');
            return;
        }
        
        // Update fields
        titleElem.textContent = `Make Payment for ${payable.id}`;
        vendorElem.textContent = payable.vendor || 'Unknown';
        amountDisplayElem.textContent = window.utils.formatCurrency(payable.amount || 0);
        payableIdInput.value = payable.id;
        amountInput.value = payable.amount || 0;
                      dateInput.value = window.utils.getTodayDate();
        
        // Setup payment method change handler
        paymentMethodSelect.addEventListener('change', function() {
            const chequeField = document.getElementById('cheque-field');
            if (chequeField) {
                chequeField.classList.toggle('hidden', this.value !== 'cheque');
            }
        });
        
        // Show modal
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
        
        // Add event handlers
        document.getElementById('close-payment-modal').addEventListener('click', closePaymentModal);
        document.getElementById('cancel-payment').addEventListener('click', closePaymentModal);
        document.getElementById('payment-form').addEventListener('submit', function(e) {
            e.preventDefault();
            processPayablePayment();
        });
        
        function closePaymentModal() {
            modal.classList.add('opacity-0');
            modal.classList.add('pointer-events-none');
            document.getElementById('payment-form').reset();
        }
    } catch (error) {
        console.error('Error showing payment modal:', error);
        window.utils.showNotification('Error preparing payment form', 'error');
    }
}

async function processPayablePayment() {
    try {
        const payableId = document.getElementById('payableId').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const date = document.getElementById('paymentDate').value;
        const reference = document.getElementById('paymentReference').value;
        const chequeNumber = paymentMethod === 'cheque' ? document.getElementById('chequeNumber').value : null;
        
        if (!payableId) {
            window.utils.showNotification('Payable ID is required', 'error');
            return;
        }
        
        if (!amount || isNaN(amount) || amount <= 0) {
            window.utils.showNotification('Please enter a valid amount', 'error');
            return;
        }
        
        if (paymentMethod === 'cheque' && !chequeNumber) {
            window.utils.showNotification('Please enter a cheque number', 'error');
            return;
        }
        
        // Get the payable
        const payables = await window.dbService.getPayables();
        const payable = payables.find(p => p.id === payableId);
        
        if (!payable) {
            window.utils.showNotification('Payable not found', 'error');
            return;
        }
        
        // Create a unique payment ID
        const paymentId = `PAY-${Date.now().toString().substring(7)}`;
        
        // Process payment based on selected method
        if (paymentMethod === 'cash') {
            // Add cash transaction
            await window.dbService.addCashTransaction({
                date,
                description: `Payment to ${payable.vendor}`,
                reference: reference || paymentId,
                cashIn: 0,
                cashOut: amount,
                vendorId: payable.vendorId
            });
        } else if (paymentMethod === 'bank' || paymentMethod === 'cheque') {
            // Add bank transaction
            await window.dbService.addBankTransaction({
                date,
                description: `Payment to ${payable.vendor}`,
                reference: reference || paymentId,
                deposit: 0,
                withdrawal: amount,
                vendorId: payable.vendorId,
                chequeNumber: chequeNumber
            });
        }
        
        // Update payable status to paid
        payable.status = 'paid';
        payable.paymentDate = date;
        payable.paymentMethod = paymentMethod;
        payable.paymentReference = reference || paymentId;
        
        if (chequeNumber) {
            payable.chequeNumber = chequeNumber;
        }
        
        // Update in database
        await window.dbService.updatePayable(payableId, payable);
        
        // Update vendor transaction ledger
        if (payable.vendorId) {
            await window.dbService.addCustomerTransaction(payable.vendorId, {
                date,
                description: `Payment made for ${payable.id}`,
                type: 'Payment',
                debit: 0,
                credit: amount,
                reference: paymentId,
                balance: 0 // Will be calculated by the service
            });
        }
        
        // Create payment record
        const paymentRecord = {
            id: paymentId,
            date,
            vendor: payable.vendor,
            vendorId: payable.vendorId,
            title: `Payment for ${payable.id}`,
            description: `Made payment for invoice ${payable.id}`,
            amount,
            type: paymentMethod === 'cheque' ? 'Bank' : (paymentMethod === 'cash' ? 'Cash' : 'Bank'),
            reference: reference || `INV-${payable.id}`,
            createdAt: new Date().toISOString()
        };
        
        if (chequeNumber) {
            paymentRecord.chequeNumber = chequeNumber;
        }
        
        // Save payment record
        await window.dbService.addPayment(paymentRecord);
        
        // Close modal
        document.getElementById('payment-modal').classList.add('opacity-0');
        document.getElementById('payment-modal').classList.add('pointer-events-none');
        
        // Refresh data
        await loadPayables();
        
        window.utils.showNotification('Payment made successfully', 'success');
    } catch (error) {
        console.error('Error processing payment:', error);
        window.utils.showNotification('Failed to process payment', 'error');
    }
}

// Initialize ledgers
document.addEventListener('DOMContentLoaded', function() {
    // Update current date
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        currentDateElement.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // If on cash ledger page
    if (document.getElementById('cash-ledger-body')) {
        loadCashLedger();
        setupCashLedgerEvents();
    }
    
    // If on bank ledger page
    if (document.getElementById('bank-ledger-body')) {
        loadBankLedger();
        setupBankLedgerEvents();
    }
    
    // If on trade receivable ledger page
    if (document.getElementById('receivables-body')) {
        loadReceivables();
    }
    
    // If on trade payable ledger page
    if (document.getElementById('payables-body')) {
        loadPayables();
    }
});

// Add these utility functions if they don't exist
if (!window.utils.getDateDaysAgo) {
    window.utils.getDateDaysAgo = function(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    };
}

// Make sure required methods exist in dbService
// Update receivable
if (!window.dbService.updateReceivable) {
    window.dbService.updateReceivable = async function(id, updates) {
        try {
            const receivables = await window.dbService.getReceivables() || [];
            const index = receivables.findIndex(r => r.id === id);
            
            if (index !== -1) {
                receivables[index] = { ...receivables[index], ...updates };
                
                // Save to storage
                if (window.db && typeof window.db.set === 'function') {
                    await window.db.set('receivables', receivables);
                } else {
                    localStorage.setItem('receivables', JSON.stringify(receivables));
                }
                
                return receivables[index];
            }
            throw new Error(`Receivable with id ${id} not found`);
        } catch (error) {
            console.error(`Error updating receivable ${id}:`, error);
            throw error;
        }
    };
}

// Update payable
if (!window.dbService.updatePayable) {
    window.dbService.updatePayable = async function(id, updates) {
        try {
            const payables = await window.dbService.getPayables() || [];
            const index = payables.findIndex(p => p.id === id);
            
            if (index !== -1) {
                payables[index] = { ...payables[index], ...updates };
                
                // Save to storage
                if (window.db && typeof window.db.set === 'function') {
                    await window.db.set('payables', payables);
                } else {
                    localStorage.setItem('payables', JSON.stringify(payables));
                }
                
                return payables[index];
            }
            throw new Error(`Payable with id ${id} not found`);
        } catch (error) {
            console.error(`Error updating payable ${id}:`, error);
            throw error;
        }
    };
}

// Add receipt
if (!window.dbService.addReceipt) {
    window.dbService.addReceipt = async function(receipt) {
        try {
            const receipts = await window.dbService.getReceipts() || [];
            receipts.push(receipt);
            
            // Save to storage
            if (window.db && typeof window.db.set === 'function') {
                await window.db.set('receipts', receipts);
            } else {
                localStorage.setItem('receipts', JSON.stringify(receipts));
            }
            
            return receipt;
        } catch (error) {
            console.error('Error adding receipt:', error);
            throw error;
        }
    };
}

// Get receipts
if (!window.dbService.getReceipts) {
    window.dbService.getReceipts = async function() {
        try {
            if (window.db && typeof window.db.get === 'function') {
                return await window.db.get('receipts') || [];
            } else {
                const stored = localStorage.getItem('receipts');
                return stored ? JSON.parse(stored) : [];
            }
        } catch (error) {
            console.error('Error getting receipts:', error);
            return [];
        }
    };
}