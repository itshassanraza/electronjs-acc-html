// billing.js - Billing management

// Pagination variables
let currentPage = 1;
let pageSize = 50;
let totalBills = 0;
let filteredBills = [];

document.addEventListener('DOMContentLoaded', async function() {
    // Set default dates
    initializeDateFields();
    
    // Load data from database
    await loadBillingData();
    
    // Set up all event handlers
    setupModalEvents();
    
    // Initialize pagination
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
        pageSize = parseInt(pageSizeSelect.value);
    }
});

// Initialize date fields
function initializeDateFields() {
    const today = window.utils.getTodayDate();
    
    // Set dates for all bill forms
    const dateFields = [
        'cashBillDate',
        'bankBillDate',
        'creditBillDate'
    ];
    
    dateFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.value = today;
        }
    });
    
    // Set due date for credit bills to next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthFormatted = nextMonth.toISOString().split('T')[0];
    
    const dueDateField = document.getElementById('dueDate');
    if (dueDateField) {
        dueDateField.value = nextMonthFormatted;
    }
}

async function loadBillingData() {
    try {
        // Get bills from database
        const bills = await window.dbService.getBills();
        
        // Store bills for pagination
        filteredBills = bills;
        totalBills = bills.length;
        
        // Update sales summary
        updateSalesSummary(bills);
        
        // Render bills table with pagination
        renderBillsTable();
        
        // Setup pagination controls
        setupPaginationControls();
        
        // Load customers for credit bill
        await setupCustomerSelect();
    } catch (error) {
        console.error('Failed to load billing data:', error);
        window.utils.showNotification('Failed to load billing data', 'error');
    }
}

function updateSalesSummary(bills) {
    // Calculate today's sales
    const today = window.utils.getTodayDate();
    const todaySales = bills
        .filter(bill => bill.date === today)
        .reduce((total, bill) => total + bill.amount, 0);
    
    // Calculate this month's sales
    const thisMonth = today.substring(0, 7); // '2025-04'
    const monthSales = bills
        .filter(bill => bill.date.startsWith(thisMonth))
        .reduce((total, bill) => total + bill.amount, 0);
    
    // Update UI
    document.getElementById('today-sales').textContent = window.utils.formatCurrency(todaySales);
    document.getElementById('month-sales').textContent = window.utils.formatCurrency(monthSales);
    document.getElementById('total-bills').textContent = bills.length;
}

function renderBillsTable() {
    const billsBody = document.getElementById('bills-body');
    billsBody.innerHTML = '';
    
    if (!filteredBills || filteredBills.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="px-4 py-2 text-center text-gray-500">No bills found</td>
        `;
        billsBody.appendChild(row);
        
        // Update pagination
        setupPaginationControls();
        return;
    }

    // Sort by date (newest first)
    const sortedBills = [...filteredBills].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Calculate the slice for the current page
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, sortedBills.length);
    const currentPageBills = sortedBills.slice(startIndex, endIndex);
    
    currentPageBills.forEach(bill => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-2">${bill.id}</td>
            <td class="px-4 py-2">${bill.date}</td>
            <td class="px-4 py-2">${bill.customer}</td>
            <td class="px-4 py-2">${bill.itemCount || bill.items.length} items</td>
            <td class="px-4 py-2">${window.utils.formatCurrency(bill.amount)}</td>
            <td class="px-4 py-2">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${bill.paymentMode === 'Cash' ? 'bg-green-100 text-green-800' : 
                    bill.paymentMode === 'Bank' ? 'bg-blue-100 text-blue-800' : 
                    'bg-yellow-100 text-yellow-800'}">
                    ${bill.paymentMode}
                </span>
            </td>
            <td class="px-4 py-2">
                <button class="text-blue-600 hover:text-blue-800 mr-2 view-bill" data-id="${bill.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="text-green-600 hover:text-green-800 mr-2 print-bill" data-id="${bill.id}">
                    <i class="fas fa-print"></i>
                </button>
                <button class="text-red-600 hover:text-red-800 delete-bill" data-id="${bill.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        billsBody.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.view-bill').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            const bill = await window.dbService.getBillById(id);
            if (bill) {
                showBillPreview(bill);
            }
        });
    });
    
    document.querySelectorAll('.print-bill').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            const bill = await window.dbService.getBillById(id);
            if (bill) {
                generatePDF(bill);
            }
        });
    });
    
    document.querySelectorAll('.delete-bill').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            if (confirm(`Are you sure you want to delete bill ${id}?`)) {
                try {
                    await deleteBill(id);
                    window.utils.showNotification('Bill deleted successfully', 'success');
                    await loadBillingData();
                } catch (error) {
                    console.error('Error deleting bill:', error);
                    window.utils.showNotification('Failed to delete bill', 'error');
                }
            }
        });
    });
    
    // Update pagination controls
    setupPaginationControls();
}

// Add the pagination controls setup function
function setupPaginationControls() {
    const paginationContainer = document.getElementById('pagination-buttons');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(totalBills / pageSize));
    
    // Add page info text
    const pageInfo = document.createElement('span');
    pageInfo.className = 'text-sm text-gray-600 mr-4';
    const startItem = totalBills > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = Math.min(totalBills, currentPage * pageSize);
    pageInfo.textContent = `${startItem}-${endItem} of ${totalBills}`;
    paginationContainer.appendChild(pageInfo);
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `px-3 py-1 mx-1 rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    if (currentPage > 1) {
        prevBtn.addEventListener('click', () => {
            currentPage--;
            renderBillsTable();
        });
    }
    paginationContainer.appendChild(prevBtn);
    
    // Page buttons
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `px-3 py-1 mx-1 rounded ${i === currentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`;
        pageBtn.textContent = i;
        if (i !== currentPage) {
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                renderBillsTable();
            });
        }
        paginationContainer.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `px-3 py-1 mx-1 rounded ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    if (currentPage < totalPages) {
        nextBtn.addEventListener('click', () => {
            currentPage++;
            renderBillsTable();
        });
    }
    paginationContainer.appendChild(nextBtn);
}

async function deleteBill(id) {
  try {
      // Get the bill to delete
      const bill = await window.dbService.getBillById(id);
      if (!bill) throw new Error('Bill not found');
      
      // 1. Revert stock changes
      if (bill.items && bill.items.length > 0) {
          for (const item of bill.items) {
              // Get matching stock items
              const stockItems = await window.dbService.getStockItems();
              const matchingItems = stockItems.filter(s => 
                  s.name === item.name && s.color === item.color
              );
              
              if (matchingItems.length > 0) {
                  // Revert by adding back the quantity
                  const updatedItem = {
                      name: item.name,
                      color: item.color,
                      quantity: parseInt(item.quantity),
                      price: parseFloat(item.price),
                      date: window.utils.getTodayDate()
                  };
                  
                  await window.dbService.addStockItem(updatedItem);
              }
          }
          console.log(`Stock items reverted for bill ${id}`);
      }
      
      // 2. Revert associated transactions based on payment mode
      switch (bill.paymentMode) {
          case 'Cash':
              // Delete the associated cash transaction
              await deleteCashTransaction(bill.id);
              console.log(`Cash ledger entry reverted for bill ${id}`);
              break;
              
          case 'Bank':
              // Delete the associated bank transaction
              await deleteBankTransaction(bill.id);
              console.log(`Bank ledger entry reverted for bill ${id}`);
              break;
              
          case 'Credit':
              // If it's a credit bill, update the customer's ledger
              if (bill.customerId) {
                  // Reverse the customer transaction by adding negative debit
                  await updateCustomerCredit(bill.customerId, bill.amount);
                  console.log(`Customer transaction reverted for bill ${id}`);
                  
                  // Delete from trade receivable ledger
                  await deleteReceivable(bill.id);
                  console.log(`Receivable entry reverted for bill ${id}`);
              }
              break;
              
          default:
              console.warn(`Unknown payment mode: ${bill.paymentMode} for bill ${id}`);
              break;
      }
      
      // 3. Delete the bill
      await window.dbService.deleteBill(id);
      console.log(`Bill ${id} deleted successfully`);
      
      return true;
  } catch (error) {
      console.error('Error deleting bill:', error);
      throw error;
  }
}

// Helper function to delete cash transaction by reference (bill ID)
async function deleteCashTransaction(billId) {
  try {
      // Get all cash transactions
      const cashTransactions = await window.dbService.getCashTransactions() || [];
      
      // Find transaction with matching reference
      const transaction = cashTransactions.find(tx => tx.reference === billId);
      if (!transaction) {
          console.warn(`No cash transaction found for bill ${billId}`);
          return;
      }
      
      // Delete the transaction
      if (typeof window.dbService.deleteCashTransaction === 'function') {
          await window.dbService.deleteCashTransaction(transaction._id || transaction.id);
      } else {
          // Alternative approach if direct delete method isn't available
          // Create a reversal transaction
          const reversal = {
              date: window.utils.getTodayDate(),
              description: `Reversal of transaction for bill ${billId}`,
              reference: `REV-${billId}`,
              cashIn: transaction.cashOut || 0,
              cashOut: transaction.cashIn || 0
          };
          
          await window.dbService.addCashTransaction(reversal);
      }
  } catch (error) {
      console.error(`Error deleting cash transaction for bill ${billId}:`, error);
      throw error;
  }
}

// Helper function to delete bank transaction by reference (bill ID)
async function deleteBankTransaction(billId) {
  try {
      // Get all bank transactions
      const bankTransactions = await window.dbService.getBankTransactions() || [];
      
      // Find transaction with matching reference
      const transaction = bankTransactions.find(tx => tx.reference === billId);
      if (!transaction) {
          console.warn(`No bank transaction found for bill ${billId}`);
          return;
      }
      
      // Delete the transaction
      if (typeof window.dbService.deleteBankTransaction === 'function') {
          await window.dbService.deleteBankTransaction(transaction._id || transaction.id);
      } else {
          // Alternative approach if direct delete method isn't available
          // Create a reversal transaction
          const reversal = {
              date: window.utils.getTodayDate(),
              description: `Reversal of transaction for bill ${billId}`,
              reference: `REV-${billId}`,
              deposit: transaction.withdrawal || 0,
              withdrawal: transaction.deposit || 0
          };
          
          await window.dbService.addBankTransaction(reversal);
      }
  } catch (error) {
      console.error(`Error deleting bank transaction for bill ${billId}:`, error);
      throw error;
  }
}

// Helper function to delete receivable by bill ID
async function deleteReceivable(billId) {
  try {
      // Get all receivables
      const receivables = await window.dbService.getReceivables() || [];
      
      // Find receivable with matching bill ID
      const receivable = receivables.find(r => r.billId === billId);
      if (!receivable) {
          console.warn(`No receivable found for bill ${billId}`);
          return;
      }
      
      // Delete the receivable
      if (typeof window.dbService.deleteReceivable === 'function') {
          await window.dbService.deleteReceivable(receivable._id || receivable.id);
      } else {
          // If no direct delete method, mark it as paid/reversed
          receivable.status = 'reversed';
          receivable.reversalDate = window.utils.getTodayDate();
          
          if (typeof window.dbService.updateReceivable === 'function') {
              await window.dbService.updateReceivable(receivable._id || receivable.id, receivable);
          }
      }
  } catch (error) {
      console.error(`Error deleting receivable for bill ${billId}:`, error);
      throw error;
  }
}
async function filterBills() {
    const searchTerm = document.getElementById('search-bills').value.toLowerCase();
    const filterType = document.getElementById('filter-bills').value;
    
    try {
        const bills = await window.dbService.getBills();
        
        let filtered = bills;
        
        // Filter by payment mode
        if (filterType !== 'all') {
            filtered = filtered.filter(bill => bill.paymentMode.toLowerCase() === filterType);
        }
        
        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(bill => 
                bill.id.toLowerCase().includes(searchTerm) || 
                bill.customer.toLowerCase().includes(searchTerm) || 
                bill.date.includes(searchTerm)
            );
        }
        
        // Update filtered bills and reset pagination
        filteredBills = filtered;
        totalBills = filteredBills.length;
        currentPage = 1;
        
        // Render the table with new filters
        renderBillsTable();
    } catch (error) {
        console.error('Error filtering bills:', error);
    }
}

async function setupCustomerSelect() {
    try {
        const select = document.getElementById('creditCustomer');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Customer</option>';
        
        const customers = await window.dbService.getCustomers();
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer._id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error setting up customer select:', error);
    }
}

function setupModalEvents() {
    // Bill Type Modal
    const billTypeModal = document.getElementById('bill-type-modal');
    const generateBillBtn = document.getElementById('generate-bill-btn');
    const closeBillTypeModal = document.getElementById('close-bill-type-modal');
    
    generateBillBtn.addEventListener('click', () => {
        billTypeModal.classList.remove('opacity-0');
        billTypeModal.classList.remove('pointer-events-none');
    });
    
    closeBillTypeModal.addEventListener('click', () => {
        billTypeModal.classList.add('opacity-0');
        billTypeModal.classList.add('pointer-events-none');
    });
    
    // Bill Type Selection
    const cashBillBtn = document.getElementById('cash-bill-btn');
    const bankBillBtn = document.getElementById('bank-bill-btn');
    const creditBillBtn = document.getElementById('credit-bill-btn');
    
    const cashBillModal = document.getElementById('cash-bill-modal');
    const bankBillModal = document.getElementById('bank-bill-modal');
    const creditBillModal = document.getElementById('credit-bill-modal');
    
    cashBillBtn.addEventListener('click', () => {
        billTypeModal.classList.add('opacity-0');
        billTypeModal.classList.add('pointer-events-none');
        cashBillModal.classList.remove('opacity-0');
        cashBillModal.classList.remove('pointer-events-none');
    });
    
    bankBillBtn.addEventListener('click', () => {
        billTypeModal.classList.add('opacity-0');
        billTypeModal.classList.add('pointer-events-none');
        bankBillModal.classList.remove('opacity-0');
        bankBillModal.classList.remove('pointer-events-none');
    });
    
    creditBillBtn.addEventListener('click', () => {
        billTypeModal.classList.add('opacity-0');
        billTypeModal.classList.add('pointer-events-none');
        creditBillModal.classList.remove('opacity-0');
        creditBillModal.classList.remove('pointer-events-none');
    });
    
    // Close bill modals
    document.querySelectorAll('.close-bill-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            cashBillModal.classList.add('opacity-0');
            cashBillModal.classList.add('pointer-events-none');
            bankBillModal.classList.add('opacity-0');
            bankBillModal.classList.add('pointer-events-none');
            creditBillModal.classList.add('opacity-0');
            creditBillModal.classList.add('pointer-events-none');
        });
    });
    
    // Setup select stock buttons
    const selectStockModal = document.getElementById('select-stock-modal');
    const closeSelectStockModal = document.getElementById('close-select-stock-modal');
    const doneSelectStock = document.getElementById('done-select-stock');
    
    const cashSelectStockBtn = document.getElementById('cashSelectStockBtn');
    const bankSelectStockBtn = document.getElementById('bankSelectStockBtn');
    const creditSelectStockBtn = document.getElementById('creditSelectStockBtn');
    
    window.currentBillType = '';
    
    cashSelectStockBtn.addEventListener('click', () => {
        window.currentBillType = 'cash';
        selectStockModal.classList.remove('opacity-0');
        selectStockModal.classList.remove('pointer-events-none');
        loadStockSelectTable();
    });
    
    bankSelectStockBtn.addEventListener('click', () => {
        window.currentBillType = 'bank';
        selectStockModal.classList.remove('opacity-0');
        selectStockModal.classList.remove('pointer-events-none');
        loadStockSelectTable();
    });
    
    creditSelectStockBtn.addEventListener('click', () => {
        window.currentBillType = 'credit';
        selectStockModal.classList.remove('opacity-0');
        selectStockModal.classList.remove('pointer-events-none');
        loadStockSelectTable();
    });
    
    closeSelectStockModal.addEventListener('click', () => {
        selectStockModal.classList.add('opacity-0');
        selectStockModal.classList.add('pointer-events-none');
    });
    
    doneSelectStock.addEventListener('click', () => {
        selectStockModal.classList.add('opacity-0');
        selectStockModal.classList.add('pointer-events-none');
    });
    
    // Search stock
    document.getElementById('search-stock').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        filterStockItems(searchTerm);
    });
    
    // Item quantity modal
    const itemQuantityModal = document.getElementById('item-quantity-modal');
    const closeItemQuantityModal = document.getElementById('close-item-quantity-modal');
    const cancelItemQuantity = document.getElementById('cancel-item-quantity');
    
    closeItemQuantityModal.addEventListener('click', closeQuantityModal);
    cancelItemQuantity.addEventListener('click', closeQuantityModal);
    
    function closeQuantityModal() {
        itemQuantityModal.classList.add('opacity-0');
        itemQuantityModal.classList.add('pointer-events-none');
    }
    
    // Item quantity form submission
    document.getElementById('item-quantity-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            id: document.getElementById('itemId').value,
            name: document.getElementById('itemName').value,
            color: document.getElementById('itemColor').value,
            quantity: parseInt(document.getElementById('quantity').value),
            price: parseFloat(document.getElementById('price').value),
            total: parseInt(document.getElementById('quantity').value) * parseFloat(document.getElementById('price').value)
        };
        
        const billType = document.getElementById('billType').value;
        
        addItemToBill(billType, formData);
        
        closeQuantityModal();
    });
    
    // Invoice preview modal
    const invoicePreviewModal = document.getElementById('invoice-preview-modal');
    const closeInvoicePreview = document.getElementById('close-invoice-preview');
    
    closeInvoicePreview.addEventListener('click', () => {
        invoicePreviewModal.classList.add('opacity-0');
        invoicePreviewModal.classList.add('pointer-events-none');
    });
    
    // Form submissions
    document.getElementById('cash-bill-form').addEventListener('submit', function(e) {
        e.preventDefault();
        processBill('cash');
    });
    
    document.getElementById('bank-bill-form').addEventListener('submit', function(e) {
        e.preventDefault();
        processBill('bank');
    });
    
    document.getElementById('credit-bill-form').addEventListener('submit', function(e) {
        e.preventDefault();
        processBill('credit');
    });
    
    // Filter button
    document.getElementById('filter-bills').addEventListener('change', filterBills);
    document.getElementById('search-bills').addEventListener('input', filterBills);
    
    // Pagination
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            pageSize = parseInt(this.value);
            currentPage = 1; // Reset to first page when changing page size
            renderBillsTable();
        });
    }
    const billDetailModal = document.getElementById('bill-detail-modal');
const closeBillDetailModal = document.getElementById('close-bill-detail-modal');
const closeBillDetailsBtn = document.getElementById('close-bill-details-btn');

if (closeBillDetailModal) {
    closeBillDetailModal.addEventListener('click', () => {
        billDetailModal.classList.add('opacity-0');
        billDetailModal.classList.add('pointer-events-none');
    });
}

if (closeBillDetailsBtn) {
    closeBillDetailsBtn.addEventListener('click', () => {
        billDetailModal.classList.add('opacity-0');
        billDetailModal.classList.add('pointer-events-none');
    });
}

    // Export all button
    const exportAllBtn = document.getElementById('export-all-btn');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllBillsAsPDF);
    }
}

// Selected items for each bill type
window.selectedItems = {
    cash: [],
    bank: [],
    credit: []
};

async function loadStockSelectTable(searchTerm = '') {
    try {
        const tbody = document.getElementById('stock-select-body');
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center text-gray-500">Loading...</td></tr>';
        
        // Get stock items from database
        let stockItems = await window.dbService.getStockItems();
        
        // Calculate summary by grouping items with the same name and color
        const summary = {};
        
        stockItems.forEach(item => {
            const key = `${item.name}-${item.color}`;
            
            if (!summary[key]) {
                summary[key] = {
                    id: key,
                    name: item.name,
                    color: item.color,
                    quantity: 0,
                    totalValue: 0
                };
            }
            
            summary[key].quantity += item.quantity;
            summary[key].totalValue += item.quantity * item.price;
        });
        
        // Convert to array and calculate average price
        let summaryArray = Object.values(summary).map(item => ({
            ...item,
            avgPrice: item.quantity > 0 ? item.totalValue / item.quantity : 0
        }));
        
        // Filter by search term if provided
        if (searchTerm) {
            summaryArray = summaryArray.filter(item => 
                item.name.toLowerCase().includes(searchTerm) || 
                item.color.toLowerCase().includes(searchTerm)
            );
        }
        
        tbody.innerHTML = '';
        
        if (summaryArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center text-gray-500">No stock items found</td></tr>';
            return;
        }
        
        summaryArray.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-2">${item.name}</td>
                <td class="px-4 py-2">${item.color}</td>
                <td class="px-4 py-2">${item.quantity}</td>
                <td class="px-4 py-2">${window.utils.formatCurrency(item.avgPrice)}</td>
                <td class="px-4 py-2">
                    <button class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded select-item-btn" 
                    data-id="${item.id}" 
                    data-name="${item.name}" 
                    data-color="${item.color}" 
                    data-quantity="${item.quantity}" 
                    data-price="${item.avgPrice}">
                    Select
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners
        document.querySelectorAll('.select-item-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                const itemName = this.getAttribute('data-name');
                const itemColor = this.getAttribute('data-color');
                const maxQuantity = parseInt(this.getAttribute('data-quantity'));
                const suggestedPrice = parseFloat(this.getAttribute('data-price'));
                
                showQuantityModal(itemId, itemName, itemColor, maxQuantity, suggestedPrice);
            });
        });
    } catch (error) {
        console.error('Error loading stock items:', error);
        const tbody = document.getElementById('stock-select-body');
        tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center text-red-500">Failed to load stock items</td></tr>';
    }
}

function filterStockItems(searchTerm) {
    loadStockSelectTable(searchTerm);
}

function showQuantityModal(itemId, itemName, itemColor, maxQuantity, suggestedPrice) {
    const itemQuantityModal = document.getElementById('item-quantity-modal');
    
    document.getElementById('itemId').value = itemId;
    document.getElementById('itemName').value = itemName;
    document.getElementById('itemColor').value = itemColor;
    document.getElementById('maxQuantity').value = maxQuantity;
    document.getElementById('billType').value = window.currentBillType;
    
    document.getElementById('selectedItemName').textContent = `${itemName} (${itemColor})`;
    document.getElementById('availableQuantity').textContent = maxQuantity;
    document.getElementById('quantity').max = maxQuantity;
    document.getElementById('quantity').value = 1;
    document.getElementById('price').value = suggestedPrice.toFixed(2);
    
    itemQuantityModal.classList.remove('opacity-0');
    itemQuantityModal.classList.remove('pointer-events-none');
}

function addItemToBill(billType, item) {
    if (!item) return;
    
    window.selectedItems[billType].push(item);
    
    const itemsTable = document.getElementById(`${billType}ItemsTable`);
    const itemsBody = document.getElementById(`${billType}ItemsBody`);
    const selectedItemsDiv = document.getElementById(`${billType}SelectedItems`);
    const totalAmountElement = document.getElementById(`${billType}TotalAmount`);
    
    // Show the table if it's hidden
    itemsTable.classList.remove('hidden');
    
    // Clear the placeholder
    selectedItemsDiv.innerHTML = '';
    
    // Render the items
    itemsBody.innerHTML = '';
    
    let totalAmount = 0;
    
    window.selectedItems[billType].forEach((item, index) => {
        totalAmount += item.total;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-2">${item.name}</td>
            <td class="px-4 py-2">${item.color}</td>
            <td class="px-4 py-2">${item.quantity}</td>
            <td class="px-4 py-2">${window.utils.formatCurrency(item.price)}</td>
            <td class="px-4 py-2">${window.utils.formatCurrency(item.total)}</td>
            <td class="px-4 py-2">
                <button class="text-red-600 hover:text-red-800 remove-item-btn" data-type="${billType}" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        itemsBody.appendChild(row);
    });
    
    // Update total amount
    totalAmountElement.textContent = window.utils.formatCurrency(totalAmount);
    
    // Add event listeners to remove buttons
    document.querySelectorAll(`.remove-item-btn[data-type="${billType}"]`).forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const index = parseInt(this.getAttribute('data-index'));
            
            window.selectedItems[type].splice(index, 1);
            
            if (window.selectedItems[type].length === 0) {
                document.getElementById(`${type}ItemsTable`).classList.add('hidden');
                document.getElementById(`${type}SelectedItems`).innerHTML = '<div class="text-gray-500 text-sm">No items selected</div>';
            }
            
            addItemToBill(type, null); // Re-render the list
        });
    });
}

async function processBill(billType) {
    if (window.selectedItems[billType].length === 0) {
        window.utils.showNotification('Please select at least one item for the bill.', 'error');
        return;
    }
    
    let customerName;
    let customerId;
    let billDate;
    
    // Get values based on bill type
    if (billType === 'cash') {
        customerName = document.getElementById('cashCustomerName').value || 'Walk-in Customer';
        billDate = document.getElementById('cashBillDate').value;
    } else if (billType === 'bank') {
        customerName = document.getElementById('bankCustomerName').value || 'Walk-in Customer';
        billDate = document.getElementById('bankBillDate').value;
    } else if (billType === 'credit') {
        const customerSelect = document.getElementById('creditCustomer');
        customerId = customerSelect.value;
        customerName = customerSelect.options[customerSelect.selectedIndex].text;
        billDate = document.getElementById('creditBillDate').value;
        
        if (!customerId) {
            window.utils.showNotification('Please select a customer for credit bill.', 'error');
            return;
        }
    }
    
    // Calculate total
    const totalAmount = window.selectedItems[billType].reduce((sum, item) => sum + item.total, 0);
    
    try {
        // Generate bill ID
        const bills = await window.dbService.getBills();
        const billNumber = bills.length + 1;
        const billId = `BILL-${String(billNumber).padStart(3, '0')}`;
        
        // Create bill object
        const bill = {
            id: billId,
            date: billDate,
            customer: customerName,
            customerId: customerId,
            items: window.selectedItems[billType],
            itemCount: window.selectedItems[billType].length,
            amount: totalAmount,
            paymentMode: billType.charAt(0).toUpperCase() + billType.slice(1),
            createdAt: new Date().toISOString()
        };
        
        // For credit bills, add due date if available
        if (billType === 'credit') {
            bill.dueDate = document.getElementById('dueDate').value;
        }
        
        // Save bill to database
        await window.dbService.addBill(bill);
        
        // Update stock quantities (reduce stock)
        for (const item of window.selectedItems[billType]) {
            await reduceStockQuantity(item.name, item.color, item.quantity);
        }
        
        // If it's a credit bill, update customer's account
        if (billType === 'credit' && customerId) {
            await updateCustomerDebit(customerId, totalAmount);
            
            // Also add to trade receivable ledger
            await window.dbService.addReceivable({
                id: `REC-${String(billNumber).padStart(3, '0')}`,
                date: billDate,
                customerId: customerId,
                customer: customerName,
                billId: billId,
                dueDate: bill.dueDate || '',
                amount: totalAmount,
                status: 'current'
            });
        }
        
        // If it's a cash bill, add to cash ledger
        if (billType === 'cash') {
            await addCashTransaction(billId, customerName, totalAmount);
        }
        
        // If it's a bank bill, add to bank ledger
        if (billType === 'bank') {
            await addBankTransaction(billId, customerName, totalAmount);
        }
        
        // Update UI
        await loadBillingData();
        
        // Reset selected items
        window.selectedItems[billType] = [];
        
        // Close modal
        const modal = document.getElementById(`${billType}-bill-modal`);
        modal.classList.add('opacity-0');
        modal.classList.add('pointer-events-none');
        
        // Reset form
        document.getElementById(`${billType}-bill-form`).reset();
        document.getElementById(`${billType}ItemsTable`).classList.add('hidden');
        document.getElementById(`${billType}SelectedItems`).innerHTML = '<div class="text-gray-500 text-sm">No items selected</div>';
        document.getElementById(`${billType}BillDate`).value = window.utils.getTodayDate();
        
        // Show notification
        window.utils.showNotification(`Bill ${billId} generated successfully`, 'success');
        
        // Show bill preview immediately
        showBillPreview(bill);
    } catch (error) {
        console.error('Error processing bill:', error);
        window.utils.showNotification('Failed to process bill', 'error');
    }
}

async function reduceStockQuantity(itemName, itemColor, quantity) {
    // Get all stock items matching name and color
    const stockItems = await window.dbService.getStockItems();
    const matchingItems = stockItems.filter(item => 
        item.name === itemName && item.color === itemColor
    );
    
    if (matchingItems.length === 0) return;
    
    let remainingQuantity = quantity;
    
    // Sort by oldest first
    matchingItems.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Reduce each matching item's quantity until we've accounted for all
    for (const item of matchingItems) {
        if (remainingQuantity <= 0) break;
        
        const reduceBy = Math.min(item.quantity, remainingQuantity);
        item.quantity -= reduceBy;
        remainingQuantity -= reduceBy;
        
        // Update item in database
        if (item.quantity > 0) {
            await window.dbService.updateStockItem(item._id, { quantity: item.quantity });
        } else {
            // If quantity is 0, delete the item
            await window.dbService.deleteStockItem(item._id);
        }
    }
}

async function updateCustomerDebit(customerId, amount) {
    const customer = await window.dbService.getCustomerById(customerId);
    if (!customer) return;
    
    // Calculate current balance
    const currentBalance = (customer.totalDebit || 0) - (customer.totalCredit || 0);
    
    // Add transaction to customer
    const transaction = {
        date: window.utils.getTodayDate(),
        description: 'Credit Bill',
        type: 'Purchase',
        debit: amount,
        credit: 0,
        balance: currentBalance + amount
    };
    
    await window.dbService.addCustomerTransaction(customerId, transaction);
}

async function updateCustomerCredit(customerId, amount) {
    const customer = await window.dbService.getCustomerById(customerId);
    if (!customer) return;
    
    // Calculate current balance
    const currentBalance = (customer.totalDebit || 0) - (customer.totalCredit || 0);
    
    // Add transaction to customer
    const transaction = {
        date: window.utils.getTodayDate(),
        description: 'Payment',
        type: 'Payment',
        debit: 0,
        credit: amount,
        balance: currentBalance - amount
    };
    
    await window.dbService.addCustomerTransaction(customerId, transaction);
}

async function addCashTransaction(billId, customerName, amount) {
    const transaction = {
        date: window.utils.getTodayDate(),
        description: `Cash sale to ${customerName}`,
        reference: billId,
        cashIn: amount,
        cashOut: 0
    };
    
    await window.dbService.addCashTransaction(transaction);
}

async function addBankTransaction(billId, customerName, amount) {
    const transaction = {
        date: window.utils.getTodayDate(),
        description: `Bank sale to ${customerName}`,
        reference: billId,
        deposit: amount,
        withdrawal: 0
    };
    
    await window.dbService.addBankTransaction(transaction);
}

function showBillPreview(bill) {
    // Update the bill detail view UI
    const billDetailModal = document.getElementById('bill-detail-modal');
    if (billDetailModal) {
        // Set up the bill details in the view modal
        const billInfo = document.getElementById('bill-info');
        if (billInfo) {
            billInfo.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <p class="text-gray-600">Bill #:</p>
                        <p class="font-semibold">${bill.id}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Customer:</p>
                        <p class="font-semibold">${bill.customer}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Date:</p>
                        <p class="font-semibold">${bill.date}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">Payment Mode:</p>
                        <p class="font-semibold ${bill.paymentMode === 'Cash' ? 'text-green-600' : 
                         bill.paymentMode === 'Bank' ? 'text-blue-600' : 'text-yellow-600'}">
                            ${bill.paymentMode}
                        </p>
                    </div>
                    ${bill.dueDate ? `
                        <div>
                            <p class="text-gray-600">Due Date:</p>
                            <p class="font-semibold">${bill.dueDate}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        // Display the bill items
        const billItemsBody = document.getElementById('bill-items-body');
        if (billItemsBody) {
            billItemsBody.innerHTML = '';
            bill.items.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-4 py-2">${item.name}</td>
                    <td class="px-4 py-2">${item.color}</td>
                    <td class="px-4 py-2">${item.quantity}</td>
                    <td class="px-4 py-2">${window.utils.formatCurrency(item.price)}</td>
                    <td class="px-4 py-2">${window.utils.formatCurrency(item.total)}</td>
                `;
                billItemsBody.appendChild(row);
            });
        }
        
        // Show the bill total
        const billTotal = document.getElementById('bill-total');
        if (billTotal) {
            const tax = bill.amount * 0.18; // 18% tax
            const grandTotal = bill.amount + tax;
            
            billTotal.innerHTML = `
                <div class="w-64">
                    <div class="flex justify-between mb-1">
                        <span class="text-gray-600">Subtotal:</span>
                        <span>${window.utils.formatCurrency(bill.amount)}</span>
                    </div>
                    <div class="flex justify-between mb-1">
                        <span class="text-gray-600">Tax (18%):</span>
                        <span>${window.utils.formatCurrency(tax)}</span>
                    </div>
                    <div class="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>${window.utils.formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            `;
        }
        
        // Show the modal
        billDetailModal.classList.remove('opacity-0');
        billDetailModal.classList.remove('pointer-events-none');
        
        // Add print button event handler
        const printBillBtn = document.getElementById('print-bill-btn');
        if (printBillBtn) {
            printBillBtn.onclick = function() {
                generatePDF(bill);
            };
        }
    } else {
        // If the bill detail modal doesn't exist, just generate the PDF
        generatePDF(bill);
    }
}

function generatePDF(bill) {
    // Check if jsPDF is available
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        console.error('jsPDF not loaded');
        window.utils.showNotification('PDF generation not available', 'error');
        return;
    }

    try {
        // Load jsPDF
        const { jsPDF } = jspdf;
        
        // Create new PDF document
        const doc = new jsPDF();
        
        // Company info
        doc.setFontSize(20);
        doc.text('INVENTORY MANAGEMENT SYSTEM', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('123 Business Street, City, State, 12345', 105, 30, { align: 'center' });
        doc.text('Phone: (123) 456-7890 | Email: contact@example.com', 105, 35, { align: 'center' });
        
        // Invoice title
        doc.setFontSize(16);
        doc.text(`INVOICE - ${bill.id}`, 105, 45, { align: 'center' });
        
        // Bill details
        doc.setFontSize(10);
        doc.text(`Date: ${bill.date}`, 20, 55);
        doc.text(`Payment Mode: ${bill.paymentMode}`, 20, 60);
        
        // Customer info
        doc.text('Bill To:', 150, 55);
        doc.text(`${bill.customer}`, 150, 60);
        
        // Create items table
        const tableColumn = ['Item', 'Color', 'Qty', 'Price', 'Total'];
        const tableRows = [];
        
        bill.items.forEach(item => {
            const itemData = [
                item.name,
                item.color,
                item.quantity,
                `₹${parseFloat(item.price).toFixed(2)}`,
                `₹${parseFloat(item.total).toFixed(2)}`
            ];
            tableRows.push(itemData);
        });
        
        // Add table to document
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 70,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [66, 139, 202] },
        });
        
        // Add total
        const finalY = doc.lastAutoTable.finalY;
        doc.text(`Sub Total:`, 150, finalY + 10);
        doc.text(`₹${bill.amount.toFixed(2)}`, 190, finalY + 10, { align: 'right' });
        
        doc.text(`GST (18%):`, 150, finalY + 15);
        const gst = bill.amount * 0.18;
        doc.text(`₹${gst.toFixed(2)}`, 190, finalY + 15, { align: 'right' });
        
        doc.text(`Total:`, 150, finalY + 20);
        const grandTotal = bill.amount + gst;
        doc.setFont(undefined, 'bold');
        doc.text(`₹${grandTotal.toFixed(2)}`, 190, finalY + 20, { align: 'right' });
        doc.setFont(undefined, 'normal');
        
        // Footer
        doc.line(20, finalY + 30, 190, finalY + 30);
        doc.setFontSize(8);
        doc.text('Thank you for your business!', 105, finalY + 35, { align: 'center' });
        doc.text('Terms & Conditions Apply', 105, finalY + 40, { align: 'center' });
        
        // Open the PDF in a modal
        const pdfOutput = doc.output('datauristring');
        
        const pdfContainer = document.getElementById('pdf-container');
        pdfContainer.innerHTML = `<iframe src="${pdfOutput}" width="100%" height="500px"></iframe>`;
        
        const invoiceModal = document.getElementById('invoice-preview-modal');
        invoiceModal.classList.remove('opacity-0');
        invoiceModal.classList.remove('pointer-events-none');
        
        // Save PDF button
        document.getElementById('save-pdf').addEventListener('click', function() {
            doc.save(`Invoice-${bill.id}.pdf`);
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        window.utils.showNotification('Failed to generate PDF', 'error');
    }
}

// Function to export all filtered bills as PDF
async function exportAllBillsAsPDF() {
    try {
        if (filteredBills.length === 0) {
            window.utils.showNotification('No bills to export', 'warning');
            return;
        }
        
        // Check if jsPDF is available
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
            console.error('jsPDF not loaded');
            window.utils.showNotification('PDF generation not available', 'error');
            return;
        }
        
        // Load jsPDF
        const { jsPDF } = jspdf;
        
        // Create new PDF document
        const doc = new jsPDF('landscape');
        
        // Add title
        doc.setFontSize(18);
        doc.text('Bills Summary Report', 150, 20, { align: 'center' });
        
        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 150, 30, { align: 'center' });
        
        // Sort bills by date (newest first)
        const sortedBills = [...filteredBills].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Create table headers
        const tableColumns = ['Bill #', 'Date', 'Customer', 'Items', 'Amount', 'Payment Mode'];
        const tableRows = [];
        
        // Create table data
        sortedBills.forEach(bill => {
            const row = [
                bill.id,
                bill.date,
                bill.customer,
                bill.items?.length || bill.itemCount || 0,
                window.utils.formatCurrency(bill.amount).replace('₹', ''),
                bill.paymentMode
            ];
            tableRows.push(row);
        });
        
        // Add table to document
        doc.autoTable({
            head: [tableColumns],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [66, 139, 202] },
        });
        
        // Add summary
        const finalY = doc.lastAutoTable.finalY;
        
        const totalAmount = sortedBills.reduce((sum, bill) => sum + bill.amount, 0);
        const cashAmount = sortedBills.filter(bill => bill.paymentMode === 'Cash').reduce((sum, bill) => sum + bill.amount, 0);
        const bankAmount = sortedBills.filter(bill => bill.paymentMode === 'Bank').reduce((sum, bill) => sum + bill.amount, 0);
        const creditAmount = sortedBills.filter(bill => bill.paymentMode === 'Credit').reduce((sum, bill) => sum + bill.amount, 0);
        
        doc.setFontSize(12);
        doc.text(`Total Bills: ${sortedBills.length}`, 20, finalY + 15);
        doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 20, finalY + 22);
        doc.text(`Cash Sales: ₹${cashAmount.toFixed(2)}`, 20, finalY + 29);
        doc.text(`Bank Sales: ₹${bankAmount.toFixed(2)}`, 20, finalY + 36);
        doc.text(`Credit Sales: ₹${creditAmount.toFixed(2)}`, 20, finalY + 43);
        
        // Save the PDF
        doc.save('Bills-Report.pdf');
        
        window.utils.showNotification('PDF export complete', 'success');
    } catch (error) {
        console.error('Error exporting bills:', error);
        window.utils.showNotification('Failed to export bills', 'error');
    }
}