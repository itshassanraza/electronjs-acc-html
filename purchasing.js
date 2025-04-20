// purchasing.js - Purchasing management
// Pagination variables
let currentPage = 1;
let pageSize = 50;
let totalItems = 0;
let filteredPurchases = [];

document.addEventListener('DOMContentLoaded', async function() {
  // Set default dates
  initializeDateFields();
  
  // Load data from database
  await loadPurchasingData();
  
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
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthFormatted = nextMonth.toISOString().split('T')[0];
    
    // Set date fields for purchase forms
    document.getElementById('cashPurchaseDate').value = today;
    document.getElementById('creditPurchaseDate').value = today;
    document.getElementById('dueDate').value = nextMonthFormatted;
    
    // Set filter date fields (last 30 days to today)
    document.getElementById('start-date').value = window.utils.getDateDaysAgo(30);
    document.getElementById('end-date').value = today;
  }
  
  // Selected items for each purchase type
  window.selectedItems = {
    cash: [],
    credit: []
  };
  
  // Current purchase type for item selection
  window.currentPurchaseType = 'cash';
  
  async function loadPurchasingData() {
    try {
      // Get purchases from database
      const purchases = await window.db.get('purchases');
      
      // Update summaries
      updatePurchaseSummary(purchases);
      
      // Load customers for credit purchase
      await setupVendorSelect();
      
      // Populate vendor filter
      await populateVendorFilter();
      
      // Render purchases table
      renderPurchasesTable(purchases);
    } catch (error) {
      console.error('Failed to load purchasing data:', error);
      window.utils.showNotification('Failed to load purchasing data', 'error');
    }
  }
  
  function updatePurchaseSummary(purchases) {
    // Calculate totals
    const totalAmount = purchases.reduce((total, purchase) => total + purchase.amount, 0);
    const cashAmount = purchases
      .filter(purchase => purchase.purchaseType === 'cash')
      .reduce((total, purchase) => total + purchase.amount, 0);
    const creditAmount = purchases
      .filter(purchase => purchase.purchaseType === 'credit')
      .reduce((total, purchase) => total + purchase.amount, 0);
    
    // Update UI
    document.getElementById('total-purchases').textContent = window.utils.formatCurrency(totalAmount);
    document.getElementById('cash-purchases').textContent = window.utils.formatCurrency(cashAmount);
    document.getElementById('credit-purchases').textContent = window.utils.formatCurrency(creditAmount);
  }
  
  async function setupVendorSelect() {
    const select = document.getElementById('creditVendor');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Vendor</option>';
    
    try {
      const customers = await window.dbService.getCustomers();
      
      customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer._id;
        option.textContent = customer.name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error setting up vendor select:', error);
    }
  }
  
  async function populateVendorFilter() {
    const select = document.getElementById('vendor-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="all">All Vendors</option>';
    
    try {
      // Get all unique vendors from purchases
      const purchases = await window.db.get('purchases');
      const vendors = [...new Set(purchases.map(purchase => purchase.vendor))];
      
      vendors.forEach(vendor => {
        if (vendor) {
          const option = document.createElement('option');
          option.value = vendor;
          option.textContent = vendor;
          select.appendChild(option);
        }
      });
    } catch (error) {
      console.error('Error populating vendor filter:', error);
    }
  }
  
  function renderPurchasesTable(purchases, filtered = null) {
    const purchasesBody = document.getElementById('purchases-body');
    purchasesBody.innerHTML = '';
    
    // Store the filtered purchases for pagination
    filteredPurchases = filtered || purchases;
    totalItems = filteredPurchases.length;
    
    if (!filteredPurchases || filteredPurchases.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="7" class="px-4 py-2 text-center text-gray-500">No purchases found</td>
      `;
      purchasesBody.appendChild(row);
      
      // Update pagination
      renderPagination();
      return;
    }
    
    // Sort by date (newest first)
    const sortedPurchases = [...filteredPurchases].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Calculate the slice for the current page
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, sortedPurchases.length);
    const currentPagePurchases = sortedPurchases.slice(startIndex, endIndex);
    
    currentPagePurchases.forEach(purchase => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-2">${purchase.id}</td>
        <td class="px-4 py-2">${purchase.date}</td>
        <td class="px-4 py-2">${purchase.vendor}</td>
        <td class="px-4 py-2">${purchase.items.length} items</td>
        <td class="px-4 py-2">${window.utils.formatCurrency(purchase.amount)}</td>
        <td class="px-4 py-2">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
            ${purchase.purchaseType === 'cash' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
            ${purchase.purchaseType === 'cash' ? 'Cash' : 'Credit'}
          </span>
        </td>
        <td class="px-4 py-2">
          <button class="text-blue-600 hover:text-blue-800 mr-2 view-purchase" data-id="${purchase.id}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="text-green-600 hover:text-green-800 mr-2 print-purchase" data-id="${purchase.id}">
            <i class="fas fa-print"></i>
          </button>
          <button class="text-red-600 hover:text-red-800 delete-purchase" data-id="${purchase.id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      purchasesBody.appendChild(row);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.view-purchase').forEach(button => {
      button.addEventListener('click', function() {
        const purchaseId = this.getAttribute('data-id');
        viewPurchaseDetails(purchaseId, filteredPurchases);
      });
    });
    
    document.querySelectorAll('.print-purchase').forEach(button => {
      button.addEventListener('click', function() {
        const purchaseId = this.getAttribute('data-id');
        printPurchaseDetails(purchaseId, filteredPurchases);
      });
    });
    
    document.querySelectorAll('.delete-purchase').forEach(button => {
      button.addEventListener('click', function() {
        const purchaseId = this.getAttribute('data-id');
        deletePurchase(purchaseId);
      });
    });
    
    // Update pagination
    renderPagination();
  }
  
  // Function to print a specific purchase
async function printPurchaseDetails(purchaseId, purchases) {
  try {
    const purchase = purchases.find(p => p.id === purchaseId);
    
    if (!purchase) {
      window.utils.showNotification('Purchase not found', 'error');
      return;
    }
    
    // Check if jsPDF is available
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
      console.error('jsPDF not loaded');
      window.utils.showNotification('PDF generation not available', 'error');
      return;
    }
    
    // Create new PDF document
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Purchase Order', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`ID: ${purchase.id}`, 14, 30);
    doc.text(`Date: ${purchase.date}`, 14, 37);
    doc.text(`Vendor: ${purchase.vendor}`, 14, 44);
    doc.text(`Type: ${purchase.purchaseType === 'cash' ? 'Cash' : 'Credit'}`, 14, 51);
    
    if (purchase.reference) {
      doc.text(`Reference: ${purchase.reference}`, 14, 58);
    }
    
    if (purchase.dueDate) {
      doc.text(`Due Date: ${purchase.dueDate}`, 14, 65);
    }
    
    // Add items table
    const tableColumn = ['Item', 'Color', 'Quantity', 'Price', 'Total'];
    const tableRows = [];
    
    purchase.items.forEach(item => {
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
    const startY = purchase.reference || purchase.dueDate ? 75 : 58;
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 135, 245] },
    });
    
    // Add total
    const finalY = doc.lastAutoTable.finalY;
    doc.text(`Total Amount:`, 150, finalY + 10);
    doc.text(`₹${purchase.amount.toFixed(2)}`, 190, finalY + 10, { align: 'right' });
    
    // Add notes if available
    if (purchase.notes) {
      doc.text('Notes:', 14, finalY + 20);
      doc.text(purchase.notes, 14, finalY + 27);
    }
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, 200, 285, { align: 'right' });
    }
    
    // Save the PDF
    doc.save(`Purchase-${purchase.id}.pdf`);
    
    window.utils.showNotification('PDF generated successfully', 'success');
  } catch (error) {
    console.error('Error generating PDF:', error);
    window.utils.showNotification('Error generating PDF', 'error');
  }
}

// Function to print all purchases
async function printAllPurchases() {
  try {
    if (filteredPurchases.length === 0) {
      window.utils.showNotification('No purchases to print', 'error');
      return;
    }
    
    // Check if jsPDF is available
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
      console.error('jsPDF not loaded');
      window.utils.showNotification('PDF generation not available', 'error');
      return;
    }
    
    // Create new PDF document
    const { jsPDF } = jspdf;
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(20);
    doc.text('Purchases Report', 150, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 150, 30, { align: 'center' });
    
    // Sort purchases by date (newest first)
    const sortedPurchases = [...filteredPurchases].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Create table data
    const tableColumn = ['ID', 'Date', 'Vendor', 'Items', 'Amount', 'Type'];
    const tableRows = [];
    
    sortedPurchases.forEach(purchase => {
      const row = [
        purchase.id,
        purchase.date,
        purchase.vendor,
        purchase.items.length.toString(),
        window.utils.formatCurrency(purchase.amount).replace('₹', ''),
        purchase.purchaseType === 'cash' ? 'Cash' : 'Credit'
      ];
      tableRows.push(row);
    });
    
    // Add table to document
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 135, 245] },
    });
    
    // Add summary
    const finalY = doc.lastAutoTable.finalY;
    
    const totalAmount = sortedPurchases.reduce((sum, p) => sum + p.amount, 0);
    const cashAmount = sortedPurchases
      .filter(p => p.purchaseType === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);
    const creditAmount = sortedPurchases
      .filter(p => p.purchaseType === 'credit')
      .reduce((sum, p) => sum + p.amount, 0);
    
    doc.setFontSize(12);
    doc.text(`Total Purchases: ${tableRows.length}`, 20, finalY + 15);
    doc.text(`Total Amount: ${window.utils.formatCurrency(totalAmount).replace('₹', '')}`, 120, finalY + 15);
    doc.text(`Cash Purchases: ${window.utils.formatCurrency(cashAmount).replace('₹', '')}`, 120, finalY + 23);
    doc.text(`Credit Purchases: ${window.utils.formatCurrency(creditAmount).replace('₹', '')}`, 120, finalY + 31);
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, 285, 200, { align: 'right' });
    }
    
    // Save the PDF
    doc.save('Purchases-Report.pdf');
    
    window.utils.showNotification('PDF report generated successfully', 'success');
  } catch (error) {
    console.error('Error generating PDF report:', error);
    window.utils.showNotification('Error generating PDF report', 'error');
  }
}

  // Add the renderPagination function
  function renderPagination() {
    const paginationContainer = document.getElementById('pagination-buttons');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    
    // Add page info text
    const pageInfo = document.createElement('span');
    pageInfo.className = 'text-sm text-gray-600 mr-4';
    const startItem = Math.min(totalItems, (currentPage - 1) * pageSize + 1);
    const endItem = Math.min(totalItems, currentPage * pageSize);
    pageInfo.textContent = `${startItem}-${endItem} of ${totalItems}`;
    paginationContainer.appendChild(pageInfo);
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `px-3 py-1 mx-1 rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    if (currentPage > 1) {
      prevBtn.addEventListener('click', () => {
        currentPage--;
        renderPurchasesTable(null, filteredPurchases);
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
          renderPurchasesTable(null, filteredPurchases);
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
        renderPurchasesTable(null, filteredPurchases);
      });
    }
    paginationContainer.appendChild(nextBtn);
  }
  
  function viewPurchaseDetails(purchaseId, purchases) {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;
    
    // Set modal title
    document.getElementById('purchase-title').textContent = `Purchase: ${purchase.id}`;
    
    // Populate purchase details
    const detailsContainer = document.getElementById('purchase-details');
    detailsContainer.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p class="text-gray-600">Vendor:</p>
          <p class="font-semibold">${purchase.vendor}</p>
        </div>
        <div>
          <p class="text-gray-600">Date:</p>
          <p class="font-semibold">${purchase.date}</p>
        </div>
        <div>
          <p class="text-gray-600">Type:</p>
          <p class="font-semibold ${purchase.purchaseType === 'cash' ? 'text-green-600' : 'text-yellow-600'}">
            ${purchase.purchaseType === 'cash' ? 'Cash' : 'Credit'}
          </p>
        </div>
        ${purchase.reference ? `
          <div>
            <p class="text-gray-600">Reference:</p>
            <p class="font-semibold">${purchase.reference}</p>
          </div>
        ` : ''}
        ${purchase.dueDate ? `
          <div>
            <p class="text-gray-600">Due Date:</p>
            <p class="font-semibold">${purchase.dueDate}</p>
          </div>
        ` : ''}
        ${purchase.notes ? `
          <div class="col-span-2 md:col-span-3">
            <p class="text-gray-600">Notes:</p>
            <p class="font-semibold">${purchase.notes}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    // Populate items table
    const itemsBody = document.getElementById('purchase-items-body');
    itemsBody.innerHTML = '';
    
    purchase.items.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
              <td class="px-4 py-2">${item.name}</td>
      <td class="px-4 py-2">${item.color}</td>
      <td class="px-4 py-2">${item.quantity}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.price)}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.total)}</td>
    `;
    itemsBody.appendChild(row);
  });
  
  // Show purchase total
  const totalElement = document.getElementById('purchase-total');
  totalElement.innerHTML = `
    <div class="flex justify-end">
      <div class="w-64">
        <div class="flex justify-between mb-1">
          <span class="text-gray-600">Subtotal:</span>
          <span>${window.utils.formatCurrency(purchase.amount)}</span>
        </div>
        <div class="flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span>${window.utils.formatCurrency(purchase.amount)}</span>
        </div>
      </div>
    </div>
  `;
  
  // Show modal
  const modal = document.getElementById('view-purchase-modal');
  modal.classList.remove('opacity-0');
  modal.classList.remove('pointer-events-none');
  
  // Add close event handlers
  document.getElementById('close-view-purchase-modal').addEventListener('click', closeViewModal);
  document.getElementById('close-purchase-details').addEventListener('click', closeViewModal);
  document.getElementById('print-current-purchase').addEventListener('click', function() {
    printPurchaseDetails(purchaseId, purchases);
  });

  function closeViewModal() {
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
  }
}

async function deletePurchase(purchaseId) {
  if (!confirm('Are you sure you want to delete this purchase? This will also update your stock and ledgers.')) {
    return;
  }
  
  try {
    // Get the purchase to delete
    const purchases = await window.db.get('purchases');
    const purchase = purchases.find(p => p.id === purchaseId);
    
    if (!purchase) {
      window.utils.showNotification('Purchase not found', 'error');
      return;
    }
    
    console.log("Deleting purchase:", purchaseId);
    
    // If it was a credit purchase, revert customer transaction and update trade payable
    if (purchase.purchaseType === 'credit' && purchase.vendorId) {
      console.log("Credit purchase detected, reverting transactions and creating trade payable reversal");
      
      // Reverse vendor transaction
      try {
        await window.dbService.addCustomerTransaction(purchase.vendorId, {
          date: new Date().toISOString().split('T')[0],
          description: `Reversal of purchase ${purchase.id}`,
          type: 'Reversal',
          debit: purchase.amount, // Reverse of original transaction
          credit: 0,
          balance: 0 // Will be recalculated
        });
        console.log("Added vendor transaction reversal successfully");
      } catch (txError) {
        console.error("Error adding vendor transaction reversal:", txError);
      }
      
      // REVERSAL APPROACH: Create reversal entries instead of deleting
      try {
        console.log("Creating trade payable reversal entries for purchase:", purchaseId);
        
        // STEP 1: Find original payable entries
        let foundPayables = [];
        const findPayablesInSource = async (source, isLocalStorage = false) => {
          try {
            const items = isLocalStorage 
              ? JSON.parse(localStorage.getItem(source) || '[]') 
              : (await window.db.get(source) || []);
            
            return items.filter(p => p.purchaseId === purchaseId);
          } catch (e) {
            console.warn(`Error finding payables in ${source}:`, e);
            return [];
          }
        };
        
        // Check all possible sources
        foundPayables = [
          ...await findPayablesInSource('tradePayable'),
          ...await findPayablesInSource('payables'),
          ...await findPayablesInSource('tradePayable', true),
          ...await findPayablesInSource('payables', true)
        ];
        
        // Remove duplicates (same ID)
        const uniqueIds = new Set();
        foundPayables = foundPayables.filter(p => {
          if (!p.id || uniqueIds.has(p.id)) return false;
          uniqueIds.add(p.id);
          return true;
        });
        
        console.log(`Found ${foundPayables.length} payables to reverse for purchase ${purchaseId}`);
        
        // STEP 2: Mark each payable as reversed and create reversal entry
        for (const payable of foundPayables) {
          try {
            // 2A: Mark original as reversed
            const updatedPayable = {
              ...payable,
              status: 'reversed',
              reversalDate: new Date().toISOString().split('T')[0],
              updatedAt: new Date().toISOString()
            };
            
            // Update in all possible locations
            try {
              await window.db.update('tradePayable', { id: payable.id }, updatedPayable);
            } catch (e) {
              console.warn(`Error updating in tradePayable: ${e.message}`);
            }
            
            try {
              await window.db.update('payables', { id: payable.id }, updatedPayable);
            } catch (e) {
              console.warn(`Error updating in payables: ${e.message}`);
            }
            
            // Update in localStorage
            ['tradePayable', 'payables'].forEach(key => {
              try {
                const items = JSON.parse(localStorage.getItem(key) || '[]');
                const index = items.findIndex(item => item.id === payable.id);
                if (index !== -1) {
                  items[index] = updatedPayable;
                  localStorage.setItem(key, JSON.stringify(items));
                }
              } catch (e) {
                console.warn(`Error updating localStorage ${key}:`, e);
              }
            });
            
            // 2B: Create reversal entry (like cash ledger reversal)
            const reversalEntry = {
              id: `REV-${payable.id}`,
              date: new Date().toISOString().split('T')[0],
              vendorId: payable.vendorId,
              vendor: payable.vendor,
              purchaseId: `REV-${payable.purchaseId || ''}`,
              reference: `Reversal of ${payable.id}`,
              amount: -payable.amount, // Negative amount to reverse
              status: 'reversed',
              createdAt: new Date().toISOString(),
              reversalOf: payable.id,
              description: `Reversal of ${purchase.id}`
            };
            
            // Add reversal to both collections
            try {
              await window.dbService.addPayable(reversalEntry);
            } catch (e) {
              console.warn(`Error adding reversal to payables: ${e.message}`);
              
              // Direct attempt if the service method fails
              try {
                await window.db.insert('tradePayable', reversalEntry);
              } catch (insertError) {
                console.warn(`Direct insert failed: ${insertError.message}`);
              }
            }
            
            console.log(`Successfully processed reversal for payable: ${payable.id}`);
          } catch (payableError) {
            console.error(`Error processing reversal for payable ${payable.id}:`, payableError);
          }
        }
        
        // STEP 3: Set flags to refresh other pages
        localStorage.setItem('payablesUpdated', new Date().toISOString());
        localStorage.setItem('lastReversedPayableId', purchaseId);
        
        console.log("Trade payable reversal entries created successfully");
      } catch (reversalError) {
        console.error("Error creating trade payable reversals:", reversalError);
      }
    }
    
    // Revert stock changes
    console.log("Reverting stock changes");
    for (const item of purchase.items) {
      try {
        await reduceStockQuantity(item.name, item.color, item.quantity);
        console.log(`Reduced stock for ${item.name} (${item.color}) by ${item.quantity} units`);
      } catch (stockError) {
        console.error(`Error reverting stock for ${item.name}:`, stockError);
      }
    }
    
    // If it was a cash purchase, revert cash ledger entry
    if (purchase.purchaseType === 'cash') {
      console.log("Adding cash reversal transaction");
      await window.dbService.addCashTransaction({
        date: new Date().toISOString().split('T')[0],
        description: `Reversal of purchase ${purchase.id}`,
        reference: `REV-${purchase.id}`,
        cashIn: purchase.amount,
        cashOut: 0
      });
      console.log("Added cash reversal transaction successfully");
    }
    
    // Delete the purchase
    console.log("Deleting purchase record from database");
    await window.db.remove('purchases', { id: purchaseId });
    console.log("Purchase record deleted successfully");
    
    // Update UI
    await loadPurchasingData();
    
    window.utils.showNotification('Purchase deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting purchase:', error);
    window.utils.showNotification('Error deleting purchase', 'error');
  }
}

async function reduceStockQuantity(itemName, itemColor, quantity) {
  try {
    // Get all stock items matching name and color
    const stockItems = await window.dbService.getStockItems();
    const matchingItems = stockItems.filter(item => 
      item.name === itemName && item.color === itemColor
    );
    
    // Create a stock reduction for this item
    await window.dbService.addStockItem({
      name: itemName,
      color: itemColor,
      quantity: -quantity, // Negative quantity to reduce stock
      price: 0, // Price doesn't matter for reduction
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error reducing stock quantity:', error);
    throw error;
  }
}

async function filterPurchases() {
  const searchTerm = document.getElementById('search-purchases').value.toLowerCase();
  const purchaseType = document.getElementById('purchase-type-filter').value;
  const vendor = document.getElementById('vendor-filter').value;
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  
  try {
    let purchases = await window.db.get('purchases');
    
    // Filter by purchase type
    if (purchaseType !== 'all') {
      purchases = purchases.filter(p => p.purchaseType === purchaseType);
    }
    
    // Filter by vendor
    if (vendor !== 'all') {
      purchases = purchases.filter(p => p.vendor === vendor);
    }
    
    // Filter by date range
    if (startDate && endDate) {
      purchases = purchases.filter(p => 
        p.date >= startDate && p.date <= endDate
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      purchases = purchases.filter(p => 
        p.id.toLowerCase().includes(searchTerm) || 
        p.vendor.toLowerCase().includes(searchTerm) || 
        (p.reference && p.reference.toLowerCase().includes(searchTerm))
      );
    }
    
    renderPurchasesTable(purchases);
  } catch (error) {
    console.error('Error filtering purchases:', error);
    window.utils.showNotification('Error filtering purchases', 'error');
  }
  currentPage = 1;
  
  renderPurchasesTable(purchases);

}

function setupModalEvents() {
    // Purchase Buttons
    const cashPurchaseBtn = document.getElementById('cash-purchase-btn');
    const creditPurchaseBtn = document.getElementById('credit-purchase-btn');
    
    cashPurchaseBtn.addEventListener('click', () => {
      const modal = document.getElementById('cash-purchase-modal');
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
    });
    
    creditPurchaseBtn.addEventListener('click', () => {
      const modal = document.getElementById('credit-purchase-modal');
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
    });
    
    // Close buttons for main purchase modals
    document.querySelectorAll('.close-purchase-modal').forEach(button => {
      button.addEventListener('click', function() {
        closeMainPurchaseModals();
      });
    });
    
    // Close buttons for specific modals - we need to handle these separately
    document.getElementById('close-cash-modal').addEventListener('click', function() {
      document.getElementById('cash-purchase-modal').classList.add('opacity-0');
      document.getElementById('cash-purchase-modal').classList.add('pointer-events-none');
    });
    
    document.getElementById('close-credit-modal').addEventListener('click', function() {
      document.getElementById('credit-purchase-modal').classList.add('opacity-0');
      document.getElementById('credit-purchase-modal').classList.add('pointer-events-none');
    });
    
    document.getElementById('close-new-item-modal').addEventListener('click', function() {
      document.getElementById('new-item-modal').classList.add('opacity-0');
      document.getElementById('new-item-modal').classList.add('pointer-events-none');
    });
    
    document.getElementById('close-select-item-modal').addEventListener('click', function() {
      document.getElementById('select-item-modal').classList.add('opacity-0');
      document.getElementById('select-item-modal').classList.add('pointer-events-none');
    });
    
    document.getElementById('close-item-quantity-modal').addEventListener('click', function() {
      document.getElementById('item-quantity-modal').classList.add('opacity-0');
      document.getElementById('item-quantity-modal').classList.add('pointer-events-none');
    });
    
    document.getElementById('close-view-purchase-modal').addEventListener('click', function() {
      document.getElementById('view-purchase-modal').classList.add('opacity-0');
      document.getElementById('view-purchase-modal').classList.add('pointer-events-none');
    });
    
    // Add new item buttons
    document.getElementById('cashAddNewItemBtn').addEventListener('click', function() {
      showNewItemModal('cash');
    });
    
    document.getElementById('creditAddNewItemBtn').addEventListener('click', function() {
      showNewItemModal('credit');
    });
    
    // Add existing item buttons
    document.getElementById('cashAddExistingItemBtn').addEventListener('click', function() {
      showSelectItemModal('cash');
    });
    
    document.getElementById('creditAddExistingItemBtn').addEventListener('click', function() {
      showSelectItemModal('credit');
    });
    
    // New item form submission
    document.getElementById('new-item-form').addEventListener('submit', function(e) {
      e.preventDefault();
      addNewItemToPurchase();
    });
    
    // Item quantity form submission
    document.getElementById('item-quantity-form').addEventListener('submit', function(e) {
      e.preventDefault();
      addExistingItemToPurchase();
    });
    
    // Purchase form submissions
    document.getElementById('cash-purchase-form').addEventListener('submit', function(e) {
      e.preventDefault();
      processPurchase('cash');
    });
    
    document.getElementById('credit-purchase-form').addEventListener('submit', function(e) {
      e.preventDefault();
      processPurchase('credit');
    });
    
    // Filter button
    document.getElementById('apply-filter').addEventListener('click', filterPurchases);
    
    // Cancel buttons for modals
    document.getElementById('cancel-new-item').addEventListener('click', function() {
      document.getElementById('new-item-modal').classList.add('opacity-0');
      document.getElementById('new-item-modal').classList.add('pointer-events-none');
    });
    
    document.getElementById('cancel-item-quantity').addEventListener('click', function() {
      document.getElementById('item-quantity-modal').classList.add('opacity-0');
      document.getElementById('item-quantity-modal').classList.add('pointer-events-none');
    });
    
    // Done button for select item modal
    document.getElementById('done-select-item').addEventListener('click', function() {
      document.getElementById('select-item-modal').classList.add('opacity-0');
      document.getElementById('select-item-modal').classList.add('pointer-events-none');
    });
    
    // Search items in select item modal
    document.getElementById('search-items').addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      filterStockItems(searchTerm);
    });
    const pageSizeSelect = document.getElementById('page-size-select');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', function() {
      pageSize = parseInt(this.value);
      currentPage = 1; // Reset to first page when changing page size
      renderPurchasesTable(null, filteredPurchases);
    });
  }
  
  // Print all purchases button
  const printAllBtn = document.getElementById('print-all-btn');
  if (printAllBtn) {
    printAllBtn.addEventListener('click', printAllPurchases);
  }

  }

  function closeMainPurchaseModals() {
    // Only close the main purchase modals, not the nested ones
    document.getElementById('cash-purchase-modal').classList.add('opacity-0');
    document.getElementById('cash-purchase-modal').classList.add('pointer-events-none');
    document.getElementById('credit-purchase-modal').classList.add('opacity-0');
    document.getElementById('credit-purchase-modal').classList.add('pointer-events-none');
    
    // Reset forms
    document.getElementById('cash-purchase-form').reset();
    document.getElementById('credit-purchase-form').reset();
    
    // Reset selected items
    window.selectedItems.cash = [];
    window.selectedItems.credit = [];
    
    // Hide item tables and show placeholder messages
    document.getElementById('cashItemsTable').classList.add('hidden');
    document.getElementById('creditItemsTable').classList.add('hidden');
    document.getElementById('cash-no-items-msg').style.display = 'block';
    document.getElementById('credit-no-items-msg').style.display = 'block';
    
    // Reset date fields
    initializeDateFields();
  }
  
  // Replace the closeAllModals function with this to avoid issues
  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('opacity-0');
      modal.classList.add('pointer-events-none');
    });
    
    // Reset forms
    document.getElementById('cash-purchase-form').reset();
    document.getElementById('credit-purchase-form').reset();
    document.getElementById('new-item-form').reset();
    document.getElementById('item-quantity-form').reset();
    
    // Reset selected items
    window.selectedItems.cash = [];
    window.selectedItems.credit = [];
    
    // Hide item tables and show placeholder messages
    document.getElementById('cashItemsTable').classList.add('hidden');
    document.getElementById('creditItemsTable').classList.add('hidden');
    document.getElementById('cash-no-items-msg').classList.remove('hidden');
    document.getElementById('credit-no-items-msg').classList.remove('hidden');
    
    // Reset date fields
    initializeDateFields();
  }

function showNewItemModal(purchaseType) {
  const modal = document.getElementById('new-item-modal');
  
  // Set the purchase type
  document.getElementById('purchaseType').value = purchaseType;
  window.currentPurchaseType = purchaseType;
  
  // Show the modal
  modal.classList.remove('opacity-0');
  modal.classList.remove('pointer-events-none');
}

async function addNewItemToPurchase() {
  const purchaseType = document.getElementById('purchaseType').value;
  
  const newItem = {
    name: document.getElementById('newItemName').value,
    color: document.getElementById('newItemColor').value,
    quantity: parseInt(document.getElementById('newItemQuantity').value),
    price: parseFloat(document.getElementById('newItemPrice').value),
    total: parseInt(document.getElementById('newItemQuantity').value) * parseFloat(document.getElementById('newItemPrice').value)
  };
  
  // Add item to the appropriate list
  window.selectedItems[purchaseType].push(newItem);
  
  // Update UI
  updatePurchaseItemsUI(purchaseType);
  
  // Close the modal
  document.getElementById('new-item-modal').classList.add('opacity-0');
  document.getElementById('new-item-modal').classList.add('pointer-events-none');
  
  // Reset the form
  document.getElementById('new-item-form').reset();
}

async function showSelectItemModal(purchaseType) {
  const modal = document.getElementById('select-item-modal');
  window.currentPurchaseType = purchaseType;
  
  // Show the modal
  modal.classList.remove('opacity-0');
  modal.classList.remove('pointer-events-none');
  
  // Load stock items
  await loadStockItemsForSelection();
}

async function loadStockItemsForSelection(searchTerm = '') {
  try {
    const tbody = document.getElementById('items-select-body');
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center text-gray-500">Loading...</td></tr>';
    
    // Get all stock items
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
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.color.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Update table
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
        const suggestedPrice = parseFloat(this.getAttribute('data-price'));
        
        showItemQuantityModal(itemId, itemName, itemColor, suggestedPrice);
      });
    });
  } catch (error) {
    console.error('Error loading stock items for selection:', error);
    
    const tbody = document.getElementById('items-select-body');
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center text-red-500">Failed to load stock items</td></tr>';
  }
}

function filterStockItems(searchTerm) {
  loadStockItemsForSelection(searchTerm);
}

function showItemQuantityModal(itemId, itemName, itemColor, suggestedPrice) {
  const modal = document.getElementById('item-quantity-modal');
  
  // Set form values
  document.getElementById('itemId').value = itemId;
  document.getElementById('itemName').value = itemName;
  document.getElementById('itemColor').value = itemColor;
  document.getElementById('purchaseType').value = window.currentPurchaseType;
  document.getElementById('selectedItemName').textContent = `${itemName} (${itemColor})`;
  document.getElementById('quantity').value = 1;
  document.getElementById('price').value = suggestedPrice.toFixed(2);
  
  // Show the modal
  modal.classList.remove('opacity-0');
  modal.classList.remove('pointer-events-none');
}

function addExistingItemToPurchase() {
  const purchaseType = document.getElementById('purchaseType').value;
  
  const item = {
    name: document.getElementById('itemName').value,
    color: document.getElementById('itemColor').value,
    quantity: parseInt(document.getElementById('quantity').value),
    price: parseFloat(document.getElementById('price').value),
    total: parseInt(document.getElementById('quantity').value) * parseFloat(document.getElementById('price').value)
  };
  
  // Add item to the appropriate list
  window.selectedItems[purchaseType].push(item);
  
  // Update UI
  updatePurchaseItemsUI(purchaseType);
  
  // Close the modal
  document.getElementById('item-quantity-modal').classList.add('opacity-0');
  document.getElementById('item-quantity-modal').classList.add('pointer-events-none');
}

function updatePurchaseItemsUI(purchaseType) {
  const itemsTable = document.getElementById(`${purchaseType}ItemsTable`);
  const itemsBody = document.getElementById(`${purchaseType}ItemsBody`);
  const noItemsMsg = document.getElementById(`${purchaseType}-no-items-msg`);
  const totalAmountElement = document.getElementById(`${purchaseType}TotalAmount`);
  
  // Show table and hide "no items" message if there are items
  if (window.selectedItems[purchaseType].length > 0) {
    itemsTable.classList.remove('hidden');
    noItemsMsg.style.display = 'none';
  } else {
    itemsTable.classList.add('hidden');
    noItemsMsg.style.display = 'block';
    totalAmountElement.textContent = window.utils.formatCurrency(0);
    return;
  }
  
  // Clear table body
  itemsBody.innerHTML = '';
  
  // Calculate total
  let totalAmount = 0;
  
  // Add each item to the table
  window.selectedItems[purchaseType].forEach((item, index) => {
    totalAmount += item.total;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2">${item.name}</td>
      <td class="px-4 py-2">${item.color}</td>
      <td class="px-4 py-2">${item.quantity}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.price)}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.total)}</td>
      <td class="px-4 py-2">
        <button class="text-red-600 hover:text-red-800 remove-item" data-type="${purchaseType}" data-index="${index}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    itemsBody.appendChild(row);
  });
  
  // Update total amount
  totalAmountElement.textContent = window.utils.formatCurrency(totalAmount);
  
  // Add event listeners to remove buttons
  document.querySelectorAll(`.remove-item[data-type="${purchaseType}"]`).forEach(button => {
    button.addEventListener('click', function() {
      const type = this.getAttribute('data-type');
      const index = parseInt(this.getAttribute('data-index'));
      
      // Remove item from array
      window.selectedItems[type].splice(index, 1);
      
      // Update UI
      updatePurchaseItemsUI(type);
    });
  });
}

async function processPurchase(purchaseType) {
  if (window.selectedItems[purchaseType].length === 0) {
    window.utils.showNotification('Please add at least one item to the purchase', 'error');
    return;
  }
  
  try {
    let vendor;
    let vendorId;
    let purchaseDate;
    let reference;
    let notes;
    let dueDate;
    
    // Get form values based on purchase type
    if (purchaseType === 'cash') {
      vendor = document.getElementById('cashVendorName').value || 'Unknown Vendor';
      purchaseDate = document.getElementById('cashPurchaseDate').value;
      reference = document.getElementById('cashReference').value;
      notes = document.getElementById('cashNotes').value;
    } else if (purchaseType === 'credit') {
      const vendorSelect = document.getElementById('creditVendor');
      vendorId = vendorSelect.value;
      vendor = vendorSelect.options[vendorSelect.selectedIndex].text;
      purchaseDate = document.getElementById('creditPurchaseDate').value;
      reference = document.getElementById('creditReference').value;
      dueDate = document.getElementById('dueDate').value;
      notes = document.getElementById('creditNotes').value;
      
      if (!vendorId) {
        window.utils.showNotification('Please select a vendor for credit purchase', 'error');
        return;
      }
    }
    
    // Calculate total amount
    const totalAmount = window.selectedItems[purchaseType].reduce((total, item) => total + item.total, 0);
    
    // Generate purchase ID
    const purchases = await window.db.get('purchases');
    const purchaseNumber = purchases.length + 1;
    const purchaseId = `PURCH-${String(purchaseNumber).padStart(3, '0')}`;
    
    // Create purchase object
    const purchase = {
      id: purchaseId,
      date: purchaseDate,
      vendor,
      vendorId,
      items: window.selectedItems[purchaseType],
      amount: totalAmount,
      purchaseType,
      reference,
      dueDate,
      notes,
      createdAt: new Date().toISOString()
    };
    
    // Save purchase
    await window.db.insert('purchases', purchase);
    
    // Add items to stock
    for (const item of window.selectedItems[purchaseType]) {
      await window.dbService.addStockItem({
        name: item.name,
        color: item.color,
        quantity: item.quantity,
        price: item.price,
        date: purchaseDate
      });
    }
    
    // If it's a cash purchase, add to cash ledger
    if (purchaseType === 'cash') {
      await window.dbService.addCashTransaction({
        date: purchaseDate,
        description: `Purchase from ${vendor}`,
        reference: purchaseId,
        cashIn: 0,
        cashOut: totalAmount
      });
    }
    
    // If it's a credit purchase, add to customer account and trade payable
    if (purchaseType === 'credit' && vendorId) {
      // Add transaction to vendor
      await window.dbService.addCustomerTransaction(vendorId, {
        date: purchaseDate,
        description: 'Credit Purchase',
        type: 'Purchase',
        debit: 0, // Vendor gives us something
        credit: totalAmount, // We owe them
        balance: 0 // Balance will be calculated by dbService
      });
      
      // Add to trade payable
      await window.dbService.addPayable({
        id: `PAYABLE-${String(purchaseNumber).padStart(3, '0')}`,
        date: purchaseDate,
        vendorId,
        vendor,
        purchaseId,
        dueDate,
        amount: totalAmount,
        status: 'current'
      });
    }
    
    // Update UI
    await loadPurchasingData();
    
    // Close modal and reset form
    closeAllModals();
    
    // Show notification
    window.utils.showNotification('Purchase completed successfully', 'success');
  } catch (error) {
    console.error('Error processing purchase:', error);
    window.utils.showNotification('Error processing purchase', 'error');
  }
}