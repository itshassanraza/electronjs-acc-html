// customers.js - Customer management

// Pagination variables
let currentPage = 1;
let pageSize = 50;
let totalCustomers = 0;
let filteredCustomers = [];

// Transaction history pagination variables
let txCurrentPage = 1;
let txPageSize = 10;
let currentCustomer = null;

document.addEventListener('DOMContentLoaded', async function() {
  // Update current date
  if (document.getElementById('current-date')) {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  }
  
  // Load customer data
  await loadCustomers();
  
  // Set up event handlers
  setupEventHandlers();
});

async function loadCustomers() {
  try {
    // Get all customers
    const customers = await window.dbService.getCustomers();
    
    // Store filtered customers globally
    filteredCustomers = customers;
    totalCustomers = filteredCustomers.length;
    
    // Update customer counts
    const totalCustomersElement = document.getElementById('total-customers');
    const activeCustomersElement = document.getElementById('active-customers');
    const outstandingCustomersElement = document.getElementById('outstanding-customers');
    const totalReceivableElement = document.getElementById('total-receivable');
    
    if (totalCustomersElement) {
      totalCustomersElement.textContent = customers.length;
    }
    
    // Calculate active customers (with transactions in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeCustomers = customers.filter(customer => {
      if (!customer.transactions || customer.transactions.length === 0) {
        return false;
      }
      
      const latestTx = customer.transactions.reduce((latest, tx) => {
        const txDate = new Date(tx.date);
        return txDate > latest ? txDate : latest;
      }, new Date(0));
      
      return latestTx > thirtyDaysAgo;
    });
    
    if (activeCustomersElement) {
      activeCustomersElement.textContent = activeCustomers.length;
    }
    
    // Calculate balances
    const totalBalances = customers.reduce((total, customer) => {
      const totalDebit = customer.totalDebit || 0;
      const totalCredit = customer.totalCredit || 0;
      const balance = totalDebit - totalCredit;
      
      if (balance > 0) {
        total.receivable += balance;
        total.outstandingCount++;
      }
      
      return total;
    }, { receivable: 0, outstandingCount: 0 });
    
    if (outstandingCustomersElement) {
      outstandingCustomersElement.textContent = totalBalances.outstandingCount;
    }
    
    if (totalReceivableElement) {
      totalReceivableElement.textContent = window.utils.formatCurrency(totalBalances.receivable);
    }
    
    // Render customer table with pagination
    renderCustomerTable();
    
    // Setup pagination controls
    setupPaginationControls();
    
  } catch (error) {
    console.error('Error loading customers:', error);
    const customersBody = document.getElementById('customers-body');
    if (customersBody) {
      customersBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-4 py-2 text-center text-red-500">Failed to load customer data</td>
        </tr>
      `;
    }
  }
}

function renderCustomerTable() {
  const tbody = document.getElementById('customers-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // Calculate start and end indices for current page
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredCustomers.length);
  
  // Get customers for current page
  const currentPageCustomers = filteredCustomers.slice(startIndex, endIndex);
  
  if (currentPageCustomers.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="7" class="px-4 py-2 text-center text-gray-500">No customers found</td>
    `;
    tbody.appendChild(row);
    return;
  }
  
  // Render each customer
  currentPageCustomers.forEach(customer => {
    const totalDebit = customer.totalDebit || 0;
    const totalCredit = customer.totalCredit || 0;
    const balance = totalDebit - totalCredit;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2">${customer.name}</td>
      <td class="px-4 py-2">${customer.phone || '-'}</td>
      <td class="px-4 py-2">${customer.address || '-'}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(totalDebit)}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(totalCredit)}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(balance)}</td>
      <td class="px-4 py-2">
        <button class="text-blue-600 hover:text-blue-800 mr-2 edit-btn" data-id="${customer._id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="text-red-600 hover:text-red-800 mr-2 delete-btn" data-id="${customer._id}">
          <i class="fas fa-trash"></i>
        </button>
        <button class="text-green-600 hover:text-green-800 view-btn" data-id="${customer._id}">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Add event listeners to action buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      editCustomer(id);
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      deleteCustomer(id);
    });
  });
  
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      viewCustomerDetails(id);
    });
  });
}

function setupPaginationControls() {
  // Check if the pagination utilities are available
  if (typeof createPaginationControls === 'function') {
    const paginationContainer = document.getElementById('pagination-container');
    
    // If pagination container exists
    if (paginationContainer) {
      createPaginationControls({
        containerID: 'pagination-container',
        totalItems: totalCustomers,
        currentPage: currentPage,
        pageSize: pageSize,
        onPageChange: (newPage) => {
          currentPage = newPage;
          renderCustomerTable();
        },
        onPageSizeChange: (newPageSize) => {
          pageSize = newPageSize;
          currentPage = 1; // Reset to first page
          renderCustomerTable();
          setupPaginationControls();
        }
      });
    }
    
    // Add PDF export button if function exists
    if (typeof createPDFExportButton === 'function') {
      const exportContainer = document.getElementById('export-container');
      if (exportContainer) {
        createPDFExportButton({
          containerID: 'export-container',
          filename: 'customer-list.pdf',
          tableID: 'customers-table',
          title: 'Customer List Report',
          orientation: 'landscape'
        });
      }
    }
  }
}

function setupEventHandlers() {
  // Add customer button
  const addCustomerBtn = document.getElementById('add-customer-btn');
  if (addCustomerBtn) {
    addCustomerBtn.addEventListener('click', function() {
      // Reset form
      const form = document.getElementById('add-customer-form');
      if (form) form.reset();
      
      // Update modal title
      const modalTitle = document.querySelector('#add-customer-modal .text-xl');
      if (modalTitle) modalTitle.textContent = 'Add New Customer';
      
      // Remove item ID from form
      if (form) form.removeAttribute('data-customer-id');
      
      // Show modal
      const modal = document.getElementById('add-customer-modal');
      if (modal) {
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
      }
    });
  }
  
  // Close modal buttons
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', function() {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('opacity-0');
        modal.classList.add('pointer-events-none');
      });
    });
  });
  
  // Search customers
  const searchCustomersInput = document.getElementById('search-customers');
  if (searchCustomersInput) {
    searchCustomersInput.addEventListener('input', filterCustomers);
  }
  
  // Add customer form submission
  const addCustomerForm = document.getElementById('add-customer-form');
  if (addCustomerForm) {
    addCustomerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = {
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value
      };
      
      try {
        // Check if we're editing an existing customer
        const customerId = this.getAttribute('data-customer-id');
        
        if (customerId) {
          // Update existing customer
          await window.dbService.updateCustomer(customerId, formData);
          window.utils.showNotification('Customer updated successfully', 'success');
        } else {
          // Add new customer with initial transaction
          formData.totalDebit = 0;
          formData.totalCredit = 0;
          formData.transactions = [
            { 
              date: new Date().toISOString().split('T')[0], 
              description: 'Opening Balance', 
              type: 'Initial', 
              debit: 0, 
              credit: 0, 
              balance: 0 
            }
          ];
          
          await window.dbService.addCustomer(formData);
          window.utils.showNotification('Customer added successfully', 'success');
        }
        
        // Reload data and update UI
        await loadCustomers();
        
        // Close modal
        const modal = document.getElementById('add-customer-modal');
        if (modal) {
          modal.classList.add('opacity-0');
          modal.classList.add('pointer-events-none');
        }
        
      } catch (error) {
        console.error('Error saving customer:', error);
        window.utils.showNotification('Failed to save customer', 'error');
      }
    });
  }
  
  // Cancel button for add customer modal
  const cancelAddCustomerBtn = document.getElementById('cancel-add-customer');
  if (cancelAddCustomerBtn) {
    cancelAddCustomerBtn.addEventListener('click', function() {
      const modal = document.getElementById('add-customer-modal');
      if (modal) {
        modal.classList.add('opacity-0');
        modal.classList.add('pointer-events-none');
      }
    });
  }
  
  // Close view customer modal button
  const closeViewCustomerBtn = document.getElementById('close-view-customer-btn');
  if (closeViewCustomerBtn) {
    closeViewCustomerBtn.addEventListener('click', function() {
      const modal = document.getElementById('view-customer-modal');
      if (modal) {
        modal.classList.add('opacity-0');
        modal.classList.add('pointer-events-none');
      }
    });
  }
}

function filterCustomers() {
  const searchTerm = document.getElementById('search-customers')?.value.toLowerCase() || '';
  
  // Get all customers data
  window.dbService.getCustomers()
    .then(customers => {
      // Filter by search term if provided
      if (searchTerm) {
        filteredCustomers = customers.filter(customer => 
          customer.name.toLowerCase().includes(searchTerm) || 
          (customer.phone && customer.phone.toLowerCase().includes(searchTerm)) ||
          (customer.address && customer.address.toLowerCase().includes(searchTerm))
        );
      } else {
        filteredCustomers = customers;
      }
      
      totalCustomers = filteredCustomers.length;
      currentPage = 1; // Reset to first page when filtering
      
      // Render filtered data
      renderCustomerTable();
      
      // Update pagination
      setupPaginationControls();
    })
    .catch(error => {
      console.error('Error filtering customers:', error);
    });
}

async function viewCustomerDetails(id) {
  try {
    // Get customer data
    const customer = await window.dbService.getCustomerById(id);
    if (!customer) {
      window.utils.showNotification('Customer not found', 'error');
      return;
    }
    
    // Store current customer for pagination
    currentCustomer = customer;
    
    // Reset transaction pagination
    txCurrentPage = 1;
    
    // Update customer details in modal
    const nameElement = document.getElementById('view-customer-name');
    if (nameElement) nameElement.textContent = customer.name;
    
    const debitElement = document.getElementById('view-customer-debit');
    if (debitElement) debitElement.textContent = window.utils.formatCurrency(customer.totalDebit || 0);
    
    const creditElement = document.getElementById('view-customer-credit');
    if (creditElement) creditElement.textContent = window.utils.formatCurrency(customer.totalCredit || 0);
    
    const balance = (customer.totalDebit || 0) - (customer.totalCredit || 0);
    const balanceElement = document.getElementById('view-customer-balance');
    if (balanceElement) {
      balanceElement.textContent = window.utils.formatCurrency(Math.abs(balance));
      
      if (balance > 0) {
        balanceElement.classList.remove('text-green-600');
        balanceElement.classList.add('text-red-600');
      } else {
        balanceElement.classList.remove('text-red-600');
        balanceElement.classList.add('text-green-600');
      }
    }
    
    // Display transactions with pagination
    renderCustomerTransactions();
    
    // Show modal
    const modal = document.getElementById('view-customer-modal');
    if (modal) {
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
    }
  } catch (error) {
    console.error('Error viewing customer details:', error);
    window.utils.showNotification('Failed to load customer details', 'error');
  }
}

function renderCustomerTransactions() {
  if (!currentCustomer) return;
  
  const transactions = currentCustomer.transactions || [];
  const tbody = document.getElementById('transaction-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!transactions || transactions.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="6" class="px-4 py-2 text-center text-gray-500">No transactions found</td>
    `;
    tbody.appendChild(row);
    
    // Clear pagination
    const txPaginationContainer = document.getElementById('tx-pagination-container');
    if (txPaginationContainer) {
      txPaginationContainer.innerHTML = '';
    }
    return;
  }
  
  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });
  
  // Calculate start and end indices for current page
  const startIndex = (txCurrentPage - 1) * txPageSize;
  const endIndex = Math.min(startIndex + txPageSize, sortedTransactions.length);
  
  // Get transactions for current page
  const currentPageTransactions = sortedTransactions.slice(startIndex, endIndex);
  
  // Render transactions
  currentPageTransactions.forEach(transaction => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2">${transaction.date}</td>
      <td class="px-4 py-2">${transaction.description}</td>
      <td class="px-4 py-2">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${transaction.type === 'Payment' ? 'bg-green-100 text-green-800' : 
          transaction.type === 'Purchase' ? 'bg-blue-100 text-blue-800' : 
          'bg-gray-100 text-gray-800'}">
          ${transaction.type}
        </span>
      </td>
      <td class="px-4 py-2">${transaction.debit > 0 ? window.utils.formatCurrency(transaction.debit) : '-'}</td>
      <td class="px-4 py-2">${transaction.credit > 0 ? window.utils.formatCurrency(transaction.credit) : '-'}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(transaction.balance)}</td>
    `;
    tbody.appendChild(row);
  });
  
  // Setup transaction pagination if function exists
  if (typeof createPaginationControls === 'function') {
    const txPaginationContainer = document.getElementById('tx-pagination-container');
    if (txPaginationContainer) {
      createPaginationControls({
        containerID: 'tx-pagination-container',
        totalItems: sortedTransactions.length,
        currentPage: txCurrentPage,
        pageSize: txPageSize,
        onPageChange: (newPage) => {
          txCurrentPage = newPage;
          renderCustomerTransactions();
        },
        onPageSizeChange: (newPageSize) => {
          txPageSize = newPageSize;
          txCurrentPage = 1;
          renderCustomerTransactions();
        }
      });
    }
  }
  
  // Add PDF export button if function exists
  if (typeof createPDFExportButton === 'function') {
    const txExportContainer = document.getElementById('tx-export-container');
    if (txExportContainer) {
      txExportContainer.innerHTML = ''; // Clear previous button
      
      createPDFExportButton({
        containerID: 'tx-export-container',
        filename: `${currentCustomer.name}-transactions.pdf`,
        tableID: 'transaction-table',
        title: `${currentCustomer.name} - Transaction History`,
        getPDFData: (doc) => {
          // Add customer info
          doc.setFontSize(12);
          doc.text(`Customer: ${currentCustomer.name}`, 14, 35);
          doc.text(`Contact: ${currentCustomer.phone || 'N/A'}`, 14, 42);
          doc.text(`Address: ${currentCustomer.address || 'N/A'}`, 14, 49);
          
          // Calculate balance
          const totalDebit = currentCustomer.totalDebit || 0;
          const totalCredit = currentCustomer.totalCredit || 0;
          const balance = totalDebit - totalCredit;
          
          doc.text(`Current Balance: ${window.utils.formatCurrency(balance)}`, 120, 35);
          doc.text(`Status: ${balance > 0 ? 'Outstanding' : 'Clear'}`, 120, 42);
          
          // Add transaction table
          doc.autoTable({
            html: '#transaction-table',
            startY: 55,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [59, 130, 246] },
          });
        }
      });
    }
  }
}

async function editCustomer(id) {
  try {
    // Get customer data
    const customer = await window.dbService.getCustomerById(id);
    
    if (!customer) {
      window.utils.showNotification('Customer not found', 'error');
      return;
    }
    
    // Fill form with customer data
    const nameInput = document.getElementById('customerName');
    const phoneInput = document.getElementById('customerPhone');
    const addressInput = document.getElementById('customerAddress');
    
    if (nameInput) nameInput.value = customer.name;
    if (phoneInput) phoneInput.value = customer.phone || '';
    if (addressInput) addressInput.value = customer.address || '';
    
    // Set customer ID on form for update
    const form = document.getElementById('add-customer-form');
    if (form) form.setAttribute('data-customer-id', id);
    
    // Update modal title
    const modalTitle = document.querySelector('#add-customer-modal .text-xl');
    if (modalTitle) modalTitle.textContent = 'Edit Customer';
    
    // Show modal
    const modal = document.getElementById('add-customer-modal');
    if (modal) {
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
    }
  } catch (error) {
    console.error('Error editing customer:', error);
    window.utils.showNotification('Failed to load customer for editing', 'error');
  }
}

async function deleteCustomer(id) {
  if (confirm('Are you sure you want to delete this customer? This will also delete all related transactions.')) {
    try {
      await window.dbService.deleteCustomer(id);
      await loadCustomers();
      window.utils.showNotification('Customer deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting customer:', error);
      window.utils.showNotification('Failed to delete customer', 'error');
    }
  }
}