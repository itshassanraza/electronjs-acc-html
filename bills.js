// bills.js - Bills management

document.addEventListener('DOMContentLoaded', async function() {
    // Set default dates
    initializeDateFields();
    
    // Load data from database
    await loadAllBills();
    
    // Set up all event handlers
    setupEventHandlers();
  });
  
  // Current view type
  let currentViewType = 'all'; // 'all', 'purchase', 'sale'
  
  // Initialize date fields
  function initializeDateFields() {
    const today = window.utils.getTodayDate();
    
    // Set filter date fields (last 30 days to today)
    document.getElementById('start-date').value = window.utils.getDateDaysAgo(30);
    document.getElementById('end-date').value = today;
  }
  
  async function loadAllBills() {
    try {
      // Get all bills
      const saleBills = await window.dbService.getBills();
      const purchaseBills = await window.db.get('purchases');
      
      // Standardize the purchase bills format
      const formattedPurchaseBills = purchaseBills.map(bill => ({
        ...bill,
        billType: 'purchase',
        paymentMode: bill.purchaseType // To match sale bills "paymentMode" field
      }));
      
      // Standardize the sale bills format
      const formattedSaleBills = saleBills.map(bill => ({
        ...bill,
        billType: 'sale'
      }));
      
      // Combine all bills
      const allBills = [...formattedPurchaseBills, ...formattedSaleBills];
      
      // Update the customer/vendor filter
      await updateCustomerVendorFilter(allBills);
      
      // Render bills based on current view
      renderBillsBasedOnView(allBills);
    } catch (error) {
      console.error('Failed to load bills data:', error);
      window.utils.showNotification('Failed to load bills data', 'error');
    }
  }
  
  async function updateCustomerVendorFilter(allBills) {
    const customerFilter = document.getElementById('customer-filter');
    if (!customerFilter) return;
    
    // Clear existing options except the default one
    customerFilter.innerHTML = '<option value="all">All Customers/Vendors</option>';
    
    // Get unique customer/vendor names
    const customerVendors = [...new Set(allBills.map(bill => bill.customer || bill.vendor))];
    
    // Add each unique customer/vendor to the filter
    customerVendors.forEach(name => {
      if (!name) return;
      
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      customerFilter.appendChild(option);
    });
  }
  
  function renderBillsBasedOnView(allBills) {
    let billsToShow = allBills;
    const viewTitle = document.getElementById('current-view-title');
    
    // Filter based on current view
    if (currentViewType === 'purchase') {
      billsToShow = allBills.filter(bill => bill.billType === 'purchase');
      viewTitle.textContent = 'Purchase Bills';
    } else if (currentViewType === 'sale') {
      billsToShow = allBills.filter(bill => bill.billType === 'sale');
      viewTitle.textContent = 'Sale Bills';
    } else {
      viewTitle.textContent = 'All Bills';
    }
    
    // Render the bills
    renderBillsTable(allBills, billsToShow);
  }
  
  function renderBillsTable(allBills, filteredBills = null) {
    const billsBody = document.getElementById('bills-body');
    billsBody.innerHTML = '';
    
    const displayBills = filteredBills || allBills;
    
    if (!displayBills || displayBills.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="7" class="px-4 py-2 text-center text-gray-500">No bills found</td>
      `;
      billsBody.appendChild(row);
      return;
    }
    
    // Sort by date (newest first)
    const sortedBills = [...displayBills].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    sortedBills.forEach(bill => {
      const row = document.createElement('tr');
      
      // Determine payment badge color
      let badgeClass = '';
      if (bill.paymentMode === 'cash') {
        badgeClass = 'bg-green-100 text-green-800';
      } else if (bill.paymentMode === 'bank') {
        badgeClass = 'bg-blue-100 text-blue-800';
      } else if (bill.paymentMode === 'credit') {
        badgeClass = 'bg-yellow-100 text-yellow-800';
      }
      
      // Get item count
      const itemCount = bill.items ? bill.items.length : 
                        (bill.itemCount ? bill.itemCount : 0);
      
      row.innerHTML = `
        <td class="px-4 py-2">${bill.id}</td>
        <td class="px-4 py-2">${bill.date}</td>
        <td class="px-4 py-2">${bill.customer || bill.vendor}</td>
        <td class="px-4 py-2">${itemCount} items</td>
        <td class="px-4 py-2">${window.utils.formatCurrency(bill.amount)}</td>
        <td class="px-4 py-2 flex items-center">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badgeClass}">
            ${bill.paymentMode.charAt(0).toUpperCase() + bill.paymentMode.slice(1)}
          </span>
          <span class="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
            ${bill.billType === 'sale' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
            ${bill.billType === 'sale' ? 'Sale' : 'Purchase'}
          </span>
        </td>
        <td class="px-4 py-2">
          <button class="text-blue-600 hover:text-blue-800 mr-2 view-bill" 
            data-id="${bill.id}" 
            data-type="${bill.billType}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="text-green-600 hover:text-green-800 mr-2 print-bill" 
            data-id="${bill.id}"
            data-type="${bill.billType}">
            <i class="fas fa-print"></i>
          </button>
        </td>
      `;
      billsBody.appendChild(row);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.view-bill').forEach(button => {
      button.addEventListener('click', async function() {
        const billId = this.getAttribute('data-id');
        const billType = this.getAttribute('data-type');
        await viewBillDetails(billId, billType, allBills);
      });
    });
    
    document.querySelectorAll('.print-bill').forEach(button => {
      button.addEventListener('click', async function() {
        const billId = this.getAttribute('data-id');
        const billType = this.getAttribute('data-type');
        await printBill(billId, billType, allBills);
      });
    });
  }
  
  async function viewBillDetails(billId, billType, allBills) {
    try {
      let bill;
      
      if (billType === 'sale') {
        bill = await window.dbService.getBillById(billId);
      } else if (billType === 'purchase') {
        const purchases = await window.db.get('purchases');
        bill = purchases.find(p => p.id === billId);
      }
      
      if (!bill) {
        window.utils.showNotification('Bill not found', 'error');
        return;
      }
      
      // Set modal title
      document.getElementById('bill-title').textContent = `${billType === 'sale' ? 'Sale' : 'Purchase'} Bill: ${bill.id}`;
      
      // Populate bill details
      const detailsContainer = document.getElementById('bill-details');
      
      // Format data based on bill type
      const customerOrVendor = billType === 'sale' ? 'Customer' : 'Vendor';
      const nameValue = bill.customer || bill.vendor;
      const paymentMode = bill.paymentMode || bill.purchaseType;
      
      detailsContainer.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p class="text-gray-600">${customerOrVendor}:</p>
            <p class="font-semibold">${nameValue}</p>
          </div>
          <div>
            <p class="text-gray-600">Date:</p>
            <p class="font-semibold">${bill.date}</p>
          </div>
          <div>
            <p class="text-gray-600">Payment Mode:</p>
            <p class="font-semibold">
              ${paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)}
            </p>
          </div>
          ${bill.reference ? `
            <div>
              <p class="text-gray-600">Reference:</p>
              <p class="font-semibold">${bill.reference}</p>
            </div>
          ` : ''}
          ${bill.dueDate ? `
            <div>
              <p class="text-gray-600">Due Date:</p>
              <p class="font-semibold">${bill.dueDate}</p>
            </div>
          ` : ''}
        </div>
      `;
      
      // Populate items table
      const itemsBody = document.getElementById('bill-items-body');
      itemsBody.innerHTML = '';
      
      if (bill.items && bill.items.length > 0) {
        bill.items.forEach(item => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td class="px-4 py-2">${item.name}</td>
            <td class="px-4 py-2">${item.color}</td>
            <td class="px-4 py-2">${item.quantity}</td>
            <td class="px-4 py-2">${window.utils.formatCurrency(item.price)}</td>
            <td class="px-4 py-2">${window.utils.formatCurrency(item.total || item.quantity * item.price)}</td>
          `;
          itemsBody.appendChild(row);
        });
      } else {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="5" class="px-4 py-2 text-center text-gray-500">No items available</td>
        `;
        itemsBody.appendChild(row);
      }
      
      // Show bill total
      const totalElement = document.getElementById('bill-total');
      
      // Calculate subtotal and taxes
      const subtotal = bill.amount;
      const tax = subtotal * 0.18; // Assuming 18% GST
      const total = subtotal + tax;
      
      totalElement.innerHTML = `
        <div class="flex justify-end">
          <div class="w-64">
            <div class="flex justify-between mb-1">
              <span class="text-gray-600">Subtotal:</span>
              <span>${window.utils.formatCurrency(subtotal)}</span>
            </div>
            <div class="flex justify-between mb-1">
              <span class="text-gray-600">GST (18%):</span>
              <span>${window.utils.formatCurrency(tax)}</span>
            </div>
            <div class="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${window.utils.formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      `;
      
      // Show the modal
      const modal = document.getElementById('view-bill-modal');
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
      
      // Set up print button
      document.getElementById('print-bill').setAttribute('data-id', bill.id);
      document.getElementById('print-bill').setAttribute('data-type', billType);
      document.getElementById('print-bill').addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const type = this.getAttribute('data-type');
        printBill(id, type, allBills);
      });
      
    } catch (error) {
      console.error('Error viewing bill details:', error);
      window.utils.showNotification('Error viewing bill details', 'error');
    }
  }
  
  async function printBill(billId, billType, allBills) {
    try {
      let bill;
      
      if (billType === 'sale') {
        bill = await window.dbService.getBillById(billId);
      } else if (billType === 'purchase') {
        const purchases = await window.db.get('purchases');
        bill = purchases.find(p => p.id === billId);
      }
      
      if (!bill) {
        window.utils.showNotification('Bill not found', 'error');
        return;
      }
      
      // Check if jsPDF is available
      if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        console.error('jsPDF not loaded');
        window.utils.showNotification('PDF generation not available', 'error');
        return;
      }
  
      // Generate PDF
      const { jsPDF } = jspdf;
      const doc = new jsPDF();
      
      // Company info
      doc.setFontSize(20);
      doc.text('INVENTORY MANAGEMENT SYSTEM', 105, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('123 Business Street, City, State, 12345', 105, 30, { align: 'center' });
      doc.text('Phone: (123) 456-7890 | Email: contact@example.com', 105, 35, { align: 'center' });
      
      // Bill title
      doc.setFontSize(16);
      const title = billType === 'sale' ? 'SALE INVOICE' : 'PURCHASE INVOICE';
      doc.text(`${title} - ${bill.id}`, 105, 45, { align: 'center' });
      
      // Bill details
      doc.setFontSize(10);
      doc.text(`Date: ${bill.date}`, 20, 55);
      
      const paymentMode = bill.paymentMode || bill.purchaseType;
      doc.text(`Payment Mode: ${paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)}`, 20, 60);
      
      // Customer/Vendor info
      const customerOrVendor = billType === 'sale' ? 'Customer' : 'Vendor';
      const nameValue = bill.customer || bill.vendor;
      doc.text(`${customerOrVendor}:`, 150, 55);
      doc.text(`${nameValue}`, 150, 60);
      
      // Reference and due date if available
      let yPos = 65;
      if (bill.reference) {
        doc.text(`Reference: ${bill.reference}`, 20, yPos);
        yPos += 5;
      }
      
      if (bill.dueDate) {
        doc.text(`Due Date: ${bill.dueDate}`, 20, yPos);
      }
      
      // Create items table
      const tableColumn = ['Item', 'Color', 'Qty', 'Price', 'Total'];
      const tableRows = [];
      
      if (bill.items && bill.items.length > 0) {
        bill.items.forEach(item => {
          const itemData = [
            item.name,
            item.color,
            item.quantity,
            `₹${parseFloat(item.price).toFixed(2)}`,
            `₹${parseFloat(item.total || (item.quantity * item.price)).toFixed(2)}`
          ];
          tableRows.push(itemData);
        });
      }
      
      // Add table to document
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 70,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: billType === 'sale' ? [66, 139, 202] : [76, 175, 80] }, // Blue for sale, green for purchase
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
      
      // Save the PDF
      doc.save(`${billType === 'sale' ? 'Invoice' : 'Purchase'}-${bill.id}.pdf`);
      
      window.utils.showNotification('PDF generated successfully', 'success');
    } catch (error) {
      console.error('Error printing bill:', error);
      window.utils.showNotification('Error generating PDF', 'error');
    }
  }
  
  async function filterBills() {
    const searchTerm = document.getElementById('search-bills').value.toLowerCase();
    const billType = document.getElementById('bill-type-filter').value;
    const customerVendor = document.getElementById('customer-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    try {
      // Get all bills
      const saleBills = await window.dbService.getBills();
      const purchaseBills = await window.db.get('purchases');
      
      // Standardize the purchase bills format
      const formattedPurchaseBills = purchaseBills.map(bill => ({
        ...bill,
        billType: 'purchase',
        paymentMode: bill.purchaseType
      }));
      
      // Standardize the sale bills format
      const formattedSaleBills = saleBills.map(bill => ({
        ...bill,
        billType: 'sale'
      }));
      
      // Combine all bills or filter by current view
      let allBills;
      if (currentViewType === 'purchase') {
        allBills = formattedPurchaseBills;
      } else if (currentViewType === 'sale') {
        allBills = formattedSaleBills;
      } else {
        allBills = [...formattedPurchaseBills, ...formattedSaleBills];
      }
      
      // Apply filters
      let filtered = allBills;
      
      // Filter by bill type (payment mode)
      if (billType !== 'all') {
        filtered = filtered.filter(bill => (bill.paymentMode || bill.purchaseType) === billType);
      }
      
      // Filter by customer/vendor
      if (customerVendor !== 'all') {
        filtered = filtered.filter(bill => (bill.customer || bill.vendor) === customerVendor);
      }
      
      // Filter by date range
      if (startDate && endDate) {
        filtered = filtered.filter(bill => bill.date >= startDate && bill.date <= endDate);
      }
      
      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter(bill => 
          bill.id.toLowerCase().includes(searchTerm) || 
          (bill.customer || bill.vendor).toLowerCase().includes(searchTerm) ||
          (bill.reference && bill.reference.toLowerCase().includes(searchTerm))
        );
      }
      
      // Render filtered results
      renderBillsTable(allBills, filtered);
    } catch (error) {
      console.error('Error filtering bills:', error);
      window.utils.showNotification('Error filtering bills', 'error');
    }
  }
  
  function setupEventHandlers() {
    // Bill type buttons
    document.getElementById('purchase-bills-btn').addEventListener('click', async function() {
      currentViewType = 'purchase';
      await loadAllBills();
    });
    
    document.getElementById('sale-bills-btn').addEventListener('click', async function() {
      currentViewType = 'sale';
      await loadAllBills();
    });
    
    // Filter button
    document.getElementById('apply-filter').addEventListener('click', filterBills);
    
    // Search input
    document.getElementById('search-bills').addEventListener('input', filterBills);
    
    // View bill modal close buttons
    document.getElementById('close-view-modal').addEventListener('click', closeViewModal);
    document.getElementById('close-bill-details').addEventListener('click', closeViewModal);
    
    function closeViewModal() {
      document.getElementById('view-bill-modal').classList.add('opacity-0');
      document.getElementById('view-bill-modal').classList.add('pointer-events-none');
    }
  }