// stock.js - Stock management

// Pagination variables for stock summary
let summaryCurrentPage = 1;
let summaryPageSize = 50;
let summaryTotalItems = 0;
let summaryFilteredItems = [];

// Pagination variables for stock details
let detailsCurrentPage = 1;
let detailsPageSize = 50;
let detailsTotalItems = 0;
let detailsFilteredItems = [];

// Pagination variables for history modal
let historyCurrentPage = 1;
let historyPageSize = 10;
let historyItems = [];

document.addEventListener('DOMContentLoaded', async function() {
  // Update current date
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
  
  // Load stock data
  await loadStockData();
  
  // Set up event handlers
  setupEventHandlers();
  
  // Initialize dropdown options
  await setupDropdowns();
});

async function loadStockData() {
  try {
    // Get stock items
    const stockItems = await window.dbService.getStockItems();
    
    // Store all stock details for details table
    detailsFilteredItems = stockItems;
    detailsTotalItems = detailsFilteredItems.length;
    
    // Calculate summary by grouping items with the same name and color
    const summary = {};
    
    stockItems.forEach(item => {
      const key = `${item.name}-${item.color}`;
      
      if (!summary[key]) {
        summary[key] = {
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
    const stockSummary = Object.values(summary).map(item => ({
      ...item,
      avgPrice: item.quantity > 0 ? item.totalValue / item.quantity : 0
    }));
    
    // Store filtered summary items globally
    summaryFilteredItems = stockSummary;
    summaryTotalItems = summaryFilteredItems.length;
    
    // Update summary cards
    updateSummaryCards(stockItems, stockSummary);
    
    // Render stock tables with pagination
    renderStockSummaryTable();
    renderStockDetailsTable();
    
    // Setup pagination controls
    setupSummaryPaginationControls();
    setupDetailsPaginationControls();
    
  } catch (error) {
    console.error('Failed to load stock data:', error);
    
    const summaryBody = document.getElementById('stock-summary-body');
    if (summaryBody) {
      summaryBody.innerHTML = `
        <tr>
          <td colspan="6" class="px-4 py-2 text-center text-red-500">Failed to load stock summary</td>
        </tr>
      `;
    }
    
    const detailsBody = document.getElementById('stock-details-body');
    if (detailsBody) {
      detailsBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-4 py-2 text-center text-red-500">Failed to load stock details</td>
        </tr>
      `;
    }
  }
}

function updateSummaryCards(stockItems, stockSummary) {
  // Calculate total items (sum of all quantities)
  const totalQuantity = stockSummary.reduce((total, item) => total + item.quantity, 0);
  const totalItemsElement = document.getElementById('total-items');
  if (totalItemsElement) {
    totalItemsElement.textContent = totalQuantity;
  }
  
  // Calculate total inventory value
  const totalValue = stockSummary.reduce((total, item) => total + item.totalValue, 0);
  const totalValueElement = document.getElementById('total-value');
  if (totalValueElement) {
    totalValueElement.textContent = window.utils.formatCurrency(totalValue);
  }
  
  // Calculate number of unique items
  const uniqueItems = stockSummary.length;
  const uniqueItemsElement = document.getElementById('unique-items');
  if (uniqueItemsElement) {
    uniqueItemsElement.textContent = uniqueItems;
  }
  
  // Calculate low stock items (less than 10)
  const lowStockItems = stockSummary.filter(item => item.quantity < 10).length;
  const lowStockElement = document.getElementById('low-stock');
  if (lowStockElement) {
    lowStockElement.textContent = lowStockItems;
  }
}

function renderStockSummaryTable() {
  const tbody = document.getElementById('stock-summary-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // Calculate start and end indices for current page
  const startIndex = (summaryCurrentPage - 1) * summaryPageSize;
  const endIndex = Math.min(startIndex + summaryPageSize, summaryFilteredItems.length);
  
  // Get items for current page
  const currentItems = summaryFilteredItems.slice(startIndex, endIndex);
  
  if (currentItems.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="6" class="px-4 py-2 text-center text-gray-500">No stock items found</td>
    `;
    tbody.appendChild(row);
    return;
  }
  
  // Render each stock item
  currentItems.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2">${item.name}</td>
      <td class="px-4 py-2">${item.color}</td>
      <td class="px-4 py-2">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${item.quantity <= 5 ? 'bg-red-100 text-red-800' : 
           item.quantity <= 10 ? 'bg-yellow-100 text-yellow-800' : 
           'bg-green-100 text-green-800'}">
          ${item.quantity}
        </span>
      </td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.avgPrice)}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.totalValue)}</td>
      <td class="px-4 py-2">
        <button class="text-green-600 hover:text-green-800 view-history" data-name="${item.name}" data-color="${item.color}">
          <i class="fas fa-history"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Add event listeners to buttons
  addSummaryButtonEventListeners();
}

function renderStockDetailsTable() {
  const tbody = document.getElementById('stock-details-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // Calculate start and end indices for current page
  const startIndex = (detailsCurrentPage - 1) * detailsPageSize;
  const endIndex = Math.min(startIndex + detailsPageSize, detailsFilteredItems.length);
  
  // Get items for current page
  const currentItems = detailsFilteredItems.slice(startIndex, endIndex);
  
  if (currentItems.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="7" class="px-4 py-2 text-center text-gray-500">No stock items found</td>
    `;
    tbody.appendChild(row);
    return;
  }
  
  // Render each stock item
  currentItems.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2">${item.name}</td>
      <td class="px-4 py-2">${item.color}</td>
      <td class="px-4 py-2">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${item.quantity < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
          ${item.quantity}
        </span>
      </td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.price)}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.quantity * item.price)}</td>
      <td class="px-4 py-2">${item.date}</td>
      <td class="px-4 py-2">
        <button class="text-blue-600 hover:text-blue-800 mr-2 edit-detail" data-id="${item._id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="text-red-600 hover:text-red-800 delete-detail" data-id="${item._id}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Add event listeners to buttons
  addDetailsButtonEventListeners();
}

function addSummaryButtonEventListeners() {
  // Edit stock buttons
  document.querySelectorAll('#stock-summary-body .edit-stock').forEach(button => {
    button.addEventListener('click', function() {
      const itemName = this.getAttribute('data-name');
      const itemColor = this.getAttribute('data-color');
      editStockItem(itemName, itemColor);
    });
  });
  
  // Delete stock buttons
  document.querySelectorAll('#stock-summary-body .delete-stock').forEach(button => {
    button.addEventListener('click', function() {
      const itemName = this.getAttribute('data-name');
      const itemColor = this.getAttribute('data-color');
      deleteStockItem(itemName, itemColor);
    });
  });
  
  // View history buttons
  document.querySelectorAll('#stock-summary-body .view-history').forEach(button => {
    button.addEventListener('click', function() {
      const itemName = this.getAttribute('data-name');
      const itemColor = this.getAttribute('data-color');
      viewStockHistory(itemName, itemColor);
    });
  });
}

function addDetailsButtonEventListeners() {
  // Edit detail buttons
  document.querySelectorAll('#stock-details-body .edit-detail').forEach(button => {
    button.addEventListener('click', function() {
      const itemId = this.getAttribute('data-id');
      editStockDetail(itemId);
    });
  });
  
  // Delete detail buttons
  document.querySelectorAll('#stock-details-body .delete-detail').forEach(button => {
    button.addEventListener('click', function() {
      const itemId = this.getAttribute('data-id');
      deleteStockDetail(itemId);
    });
  });
}

function setupSummaryPaginationControls() {
  // Create pagination controls using the utility function
  if (typeof createPaginationControls === 'function') {
    createPaginationControls({
      containerID: 'summary-pagination-container',
      totalItems: summaryTotalItems,
      currentPage: summaryCurrentPage,
      pageSize: summaryPageSize,
      onPageChange: (newPage) => {
        summaryCurrentPage = newPage;
        renderStockSummaryTable();
      },
      onPageSizeChange: (newPageSize) => {
        summaryPageSize = newPageSize;
        summaryCurrentPage = 1; // Reset to first page
        renderStockSummaryTable();
        setupSummaryPaginationControls();
      }
    });
    
    // Add PDF export button if function exists
    if (typeof createPDFExportButton === 'function') {
      // Clear any existing buttons
      const exportContainer = document.getElementById('summary-export-container');
      if (exportContainer) {
        exportContainer.innerHTML = '';
        createPDFExportButton({
          containerID: 'summary-export-container',
          filename: 'stock-summary.pdf',
          tableID: 'stock-summary-table',
          title: 'Stock Summary Report',
          orientation: 'landscape'
        });
      }
    }
  } else {
    console.error('Pagination utilities not loaded');
  }
}

function setupDetailsPaginationControls() {
  // Create pagination controls using the utility function
  if (typeof createPaginationControls === 'function') {
    createPaginationControls({
      containerID: 'details-pagination-container',
      totalItems: detailsTotalItems,
      currentPage: detailsCurrentPage,
      pageSize: detailsPageSize,
      onPageChange: (newPage) => {
        detailsCurrentPage = newPage;
        renderStockDetailsTable();
      },
      onPageSizeChange: (newPageSize) => {
        detailsPageSize = newPageSize;
        detailsCurrentPage = 1; // Reset to first page
        renderStockDetailsTable();
        setupDetailsPaginationControls();
      }
    });
    
    // Add PDF export button if function exists
    if (typeof createPDFExportButton === 'function') {
      // Clear any existing buttons
      const exportContainer = document.getElementById('details-export-container');
      if (exportContainer) {
        exportContainer.innerHTML = '';
        createPDFExportButton({
          containerID: 'details-export-container',
          filename: 'stock-details.pdf',
          tableID: 'stock-details-table',
          title: 'Stock Details Report',
          orientation: 'landscape'
        });
      }
    }
  } else {
    console.error('Pagination utilities not loaded');
  }
}

function setupHistoryPaginationControls() {
  // Create pagination controls for history modal
  if (typeof createPaginationControls === 'function' && historyItems.length > 0) {
    createPaginationControls({
      containerID: 'history-pagination-container',
      totalItems: historyItems.length,
      currentPage: historyCurrentPage,
      pageSize: historyPageSize,
      onPageChange: (newPage) => {
        historyCurrentPage = newPage;
        renderHistoryTable();
      },
      onPageSizeChange: (newPageSize) => {
        historyPageSize = newPageSize;
        historyCurrentPage = 1; // Reset to first page
        renderHistoryTable();
        setupHistoryPaginationControls();
      }
    });
  }
}

function setupEventHandlers() {
  // Add stock button
  const addStockBtn = document.getElementById('add-stock-btn');
  if (addStockBtn) {
    addStockBtn.addEventListener('click', function() {
      const modal = document.getElementById('add-stock-modal');
      if (modal) {
        modal.classList.remove('opacity-0');
        modal.classList.remove('pointer-events-none');
      }
      
      // Set today's date as default in the date field
      const dateField = document.getElementById('stockDate');
      if (dateField) {
        dateField.value = new Date().toISOString().split('T')[0];
      }
    });
  }
  
  // Close modal buttons
  document.querySelectorAll('.modal-close').forEach(button => {
    button.addEventListener('click', function() {
      // Find the closest modal to this button
      const modal = this.closest('.modal');
      if (modal) {
        modal.classList.add('opacity-0');
        modal.classList.add('pointer-events-none');
      }
    });
  });
  
  // Search stock
  const searchStock = document.getElementById('search-stock');
  if (searchStock) {
    searchStock.addEventListener('input', function() {
      filterStock();
    });
  }
  
  // Filter button
  const applyFilter = document.getElementById('apply-filter');
  if (applyFilter) {
    applyFilter.addEventListener('click', function() {
      filterStock();
    });
  }
  
  // Reset filter button
  const resetFilter = document.getElementById('reset-filter');
  if (resetFilter) {
    resetFilter.addEventListener('click', function() {
      const searchStock = document.getElementById('search-stock');
      const filterName = document.getElementById('filter-name');
      const filterColor = document.getElementById('filter-color');
      const minQuantity = document.getElementById('min-quantity');
      const maxQuantity = document.getElementById('max-quantity');
      
      if (searchStock) searchStock.value = '';
      if (filterName) filterName.value = '';
      if (filterColor) filterColor.value = '';
      if (minQuantity) minQuantity.value = '';
      if (maxQuantity) maxQuantity.value = '';
      
      loadStockData();
    });
  }
  
  // Add stock form submission
  const addStockForm = document.getElementById('add-stock-form');
  if (addStockForm) {
    addStockForm.addEventListener('submit', function(e) {
      e.preventDefault();
      addStockItem();
    });
  }
  
  // Edit stock form submission
  const editStockForm = document.getElementById('edit-stock-form');
  if (editStockForm) {
    editStockForm.addEventListener('submit', function(e) {
      e.preventDefault();
      updateStockItem();
    });
  }
}

async function setupDropdowns() {
  try {
    // Get stock items for dropdown options
    const stockItems = await window.dbService.getStockItems();
    
    // Extract unique names and colors
    const names = [...new Set(stockItems.map(item => item.name))];
    const colors = [...new Set(stockItems.map(item => item.color))];
    
    // Populate name dropdowns
    const nameDropdowns = document.querySelectorAll('.name-dropdown');
    nameDropdowns.forEach(dropdown => {
      // Keep the first option (usually 'Select' or empty option)
      const firstOption = dropdown.options[0];
      dropdown.innerHTML = '';
      dropdown.appendChild(firstOption);
      
      // Add stock names
      names.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dropdown.appendChild(option);
      });
    });
    
    // Populate color dropdowns
    const colorDropdowns = document.querySelectorAll('.color-dropdown');
    colorDropdowns.forEach(dropdown => {
      // Keep the first option
      const firstOption = dropdown.options[0];
      dropdown.innerHTML = '';
      dropdown.appendChild(firstOption);
      
      // Add colors
      colors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        dropdown.appendChild(option);
      });
    });
    
    // Add autosuggest functionality
    setupItemAutosuggest(names);
    setupColorAutosuggest(colors);
    
  } catch (error) {
    console.error('Error setting up dropdowns:', error);
  }
}

function setupItemAutosuggest(names) {
  const itemNameInput = document.getElementById('itemName');
  const itemDropdown = document.getElementById('itemDropdown');
  const itemList = document.getElementById('itemList');
  
  if (!itemNameInput || !itemDropdown || !itemList) return;
  
  itemNameInput.addEventListener('input', function() {
    const value = this.value.toLowerCase();
    
    if (!value) {
      itemDropdown.classList.add('hidden');
      return;
    }
    
    // Filter matching items
    const matches = names.filter(name => name.toLowerCase().includes(value));
    
    // Clear dropdown
    itemList.innerHTML = '';
    
    // Add matching items to dropdown
    matches.forEach(match => {
      const item = document.createElement('div');
      item.className = 'px-4 py-2 hover:bg-blue-100 cursor-pointer';
      item.textContent = match;
      
      item.addEventListener('click', () => {
        itemNameInput.value = match;
        itemDropdown.classList.add('hidden');
      });
      
      itemList.appendChild(item);
    });
    
    // Show dropdown
    itemDropdown.classList.remove('hidden');
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!itemNameInput.contains(e.target) && !itemDropdown.contains(e.target)) {
      itemDropdown.classList.add('hidden');
    }
  });
}

function setupColorAutosuggest(colors) {
  const colorInput = document.getElementById('itemColor');
  const colorDropdown = document.getElementById('colorDropdown');
  const colorList = document.getElementById('colorList');
  
  if (!colorInput || !colorDropdown || !colorList) return;
  
  colorInput.addEventListener('input', function() {
    const value = this.value.toLowerCase();
    
    if (!value) {
      colorDropdown.classList.add('hidden');
      return;
    }
    
    // Filter matching colors
    const matches = colors.filter(color => color.toLowerCase().includes(value));
    
    // Clear dropdown
    colorList.innerHTML = '';
    
    // Add matching colors to dropdown
    matches.forEach(match => {
      const item = document.createElement('div');
      item.className = 'px-4 py-2 hover:bg-blue-100 cursor-pointer';
      item.textContent = match;
      
      item.addEventListener('click', () => {
        colorInput.value = match;
        colorDropdown.classList.add('hidden');
      });
      
      colorList.appendChild(item);
    });
    
    // Show dropdown
    colorDropdown.classList.remove('hidden');
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!colorInput.contains(e.target) && !colorDropdown.contains(e.target)) {
      colorDropdown.classList.add('hidden');
    }
  });
}

function filterStock() {
  const searchTerm = document.getElementById('search-stock').value.toLowerCase();
  const stockName = document.getElementById('filter-name').value.toLowerCase();
  const stockColor = document.getElementById('filter-color').value.toLowerCase();
  const minQuantity = document.getElementById('min-quantity').value;
  const maxQuantity = document.getElementById('max-quantity').value;
  
  // Get all stock data
  window.dbService.getStockItems().then(stockItems => {
    // Filter details items
    detailsFilteredItems = stockItems.filter(item => {
      // Match by search term
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm) && !item.color.toLowerCase().includes(searchTerm)) {
        return false;
      }
      
      // Match by specific name
      if (stockName && !item.name.toLowerCase().includes(stockName)) {
        return false;
      }
      
      // Match by specific color
      if (stockColor && !item.color.toLowerCase().includes(stockColor)) {
        return false;
      }
      
      return true;
    });
    
    detailsTotalItems = detailsFilteredItems.length;
    detailsCurrentPage = 1; // Reset to first page when filtering
    
    // Calculate summary from filtered items
    const summary = {};
    
    detailsFilteredItems.forEach(item => {
      const key = `${item.name}-${item.color}`;
      
      if (!summary[key]) {
        summary[key] = {
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
    let stockSummary = Object.values(summary).map(item => ({
      ...item,
      avgPrice: item.quantity > 0 ? item.totalValue / item.quantity : 0
    }));
    
    // Apply min/max quantity filters to summary
    if (minQuantity) {
      stockSummary = stockSummary.filter(item => item.quantity >= parseInt(minQuantity));
    }
    
    if (maxQuantity) {
      stockSummary = stockSummary.filter(item => item.quantity <= parseInt(maxQuantity));
    }
    
    summaryFilteredItems = stockSummary;
    summaryTotalItems = summaryFilteredItems.length;
    summaryCurrentPage = 1; // Reset to first page when filtering
    
    // Render filtered data
    renderStockSummaryTable();
    renderStockDetailsTable();
    
    // Update pagination
    setupSummaryPaginationControls();
    setupDetailsPaginationControls();
  }).catch(error => {
    console.error('Error filtering stock:', error);
  });
}

async function addStockItem() {
  const name = document.getElementById('itemName').value;
  const color = document.getElementById('itemColor').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const price = parseFloat(document.getElementById('unitPrice').value);
  const date = document.getElementById('stockDate').value || new Date().toISOString().split('T')[0];
  const notes = document.getElementById('notes').value;
  
  if (!name || !color || isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0) {
    window.utils.showNotification('Please fill all required fields with valid values', 'error');
    return;
  }
  
  try {
    const item = { 
      name, 
      color, 
      quantity, 
      price, 
      date,
      note: notes
    };
    
    await window.dbService.addStockItem(item);
    
    // Clear form
    document.getElementById('add-stock-form').reset();
    
    // Close modal
    document.getElementById('add-stock-modal').classList.add('opacity-0');
    document.getElementById('add-stock-modal').classList.add('pointer-events-none');
    
    // Reload stock data
    await loadStockData();
    
    // Update dropdown options
    await setupDropdowns();
    
    window.utils.showNotification('Stock added successfully', 'success');
  } catch (error) {
    console.error('Error saving stock:', error);
    window.utils.showNotification('Failed to add stock', 'error');
  }
}

async function editStockItem(name, color) {
  try {
    // Get stock items with the specified name and color
    const items = await window.dbService.getStockItems();
    const matchingItems = items.filter(item => item.name === name && item.color === color);
    
    if (matchingItems.length === 0) {
      window.utils.showNotification('Stock item not found', 'error');
      return;
    }
    
    // Calculate total quantity and average price
    let totalQuantity = 0;
    let totalValue = 0;
    
    matchingItems.forEach(item => {
      totalQuantity += item.quantity;
      totalValue += item.quantity * item.price;
    });
    
    const avgPrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
    
    // Populate form with item data
    document.getElementById('editStockName').value = name;
    document.getElementById('editStockColor').value = color;
    document.getElementById('editStockQuantity').value = totalQuantity;
    document.getElementById('editStockPrice').value = avgPrice.toFixed(2);
    document.getElementById('editStockDate').value = new Date().toISOString().split('T')[0];
    
    // Set hidden fields for identifying the item
    document.getElementById('originalStockName').value = name;
    document.getElementById('originalStockColor').value = color;
    
    // Show the modal
    document.getElementById('edit-stock-modal').classList.remove('opacity-0');
    document.getElementById('edit-stock-modal').classList.remove('pointer-events-none');
  } catch (error) {
    console.error('Error editing stock item:', error);
    window.utils.showNotification('Failed to load stock item for editing', 'error');
  }
}

async function editStockDetail(itemId) {
  try {
    // Get the specific stock item
    // Since getStockItemById doesn't exist, use the getStockItems method and filter
    const items = await window.dbService.getStockItems();
    const item = items.find(item => item._id === itemId);
    
    if (!item) {
      window.utils.showNotification('Stock item not found', 'error');
      return;
    }
    
    // Populate form with item data
    document.getElementById('editStockName').value = item.name;
    document.getElementById('editStockColor').value = item.color;
    document.getElementById('editStockQuantity').value = item.quantity;
    document.getElementById('editStockPrice').value = item.price.toFixed(2);
    document.getElementById('editStockDate').value = item.date;
    
    // Set hidden fields for identifying the item
    document.getElementById('originalStockName').value = item.name;
    document.getElementById('originalStockColor').value = item.color;
    
    // Add an ID field to track this specific item
    const idField = document.getElementById('editStockId') || document.createElement('input');
    idField.id = 'editStockId';
    idField.type = 'hidden';
    idField.value = itemId;
    document.getElementById('edit-stock-form').appendChild(idField);
    
    // Show the modal
    document.getElementById('edit-stock-modal').classList.remove('opacity-0');
    document.getElementById('edit-stock-modal').classList.remove('pointer-events-none');
  } catch (error) {
    console.error('Error editing stock detail:', error);
    window.utils.showNotification('Failed to load stock item for editing', 'error');
  }
}

async function updateStockItem() {
  const originalName = document.getElementById('originalStockName').value;
  const originalColor = document.getElementById('originalStockColor').value;
  const name = document.getElementById('editStockName').value;
  const color = document.getElementById('editStockColor').value;
  const quantity = parseInt(document.getElementById('editStockQuantity').value);
  const price = parseFloat(document.getElementById('editStockPrice').value);
  const date = document.getElementById('editStockDate').value || new Date().toISOString().split('T')[0];
  
  // Check if we're editing a specific item or the entire group
  const specificItemId = document.getElementById('editStockId')?.value;
  
  if (!name || !color || isNaN(quantity) || quantity < 0 || isNaN(price) || price <= 0) {
    window.utils.showNotification('Please fill all required fields with valid values', 'error');
    return;
  }
  
  try {
    if (specificItemId) {
      // We're editing a specific item
      await window.dbService.updateStockItem(specificItemId, {
        name,
        color,
        quantity,
        price,
        date
      });
    } else {
      // We're editing a group (summary)
      // Get all items with original name and color
      const items = await window.dbService.getStockItems();
      const matchingItems = items.filter(item => item.name === originalName && item.color === originalColor);
      
      if (matchingItems.length === 0) {
        window.utils.showNotification('Stock item not found', 'error');
        return;
      }
      
      // Calculate total quantity currently in stock
      const currentTotal = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // If changing the total quantity, create an adjustment entry
      if (currentTotal !== quantity) {
        const adjustmentQuantity = quantity - currentTotal;
        
        // Add adjustment entry
        await window.dbService.addStockItem({
          name,
          color,
          quantity: adjustmentQuantity,
          price,
          date,
          note: 'Stock adjustment'
        });
      }
      
      // If changing the name or color, update all entries
      if (originalName !== name || originalColor !== color) {
        for (const item of matchingItems) {
          await window.dbService.updateStockItem(item._id, {
            name,
            color
          });
        }
      }
    }
    
    // Close modal
    document.getElementById('edit-stock-modal').classList.add('opacity-0');
    document.getElementById('edit-stock-modal').classList.add('pointer-events-none');
    
    // Reload stock data
    await loadStockData();
    
    // Update dropdown options
    await setupDropdowns();
    
    window.utils.showNotification('Stock updated successfully', 'success');
  } catch (error) {
    console.error('Error updating stock:', error);
    window.utils.showNotification('Failed to update stock', 'error');
  }
}

async function deleteStockItem(name, color) {
  if (!confirm(`Are you sure you want to delete all ${name} (${color}) items from inventory?`)) {
    return;
  }
  
  try {
    // Get all items with the specified name and color
    const items = await window.dbService.getStockItems();
    const matchingItems = items.filter(item => item.name === name && item.color === color);
    
    if (matchingItems.length === 0) {
      window.utils.showNotification('Stock item not found', 'error');
      return;
    }
    
    // Delete each matching item
    for (const item of matchingItems) {
      await window.dbService.deleteStockItem(item._id);
    }
    
    // Reload stock data
    await loadStockData();
    
    // Update dropdown options
    await setupDropdowns();
    
    window.utils.showNotification('Stock deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting stock:', error);
    window.utils.showNotification('Failed to delete stock', 'error');
  }
}

async function deleteStockDetail(itemId) {
  if (!confirm('Are you sure you want to delete this stock entry?')) {
    return;
  }
  
  try {
    // Delete the specific item
    await window.dbService.deleteStockItem(itemId);
    
    // Reload stock data
    await loadStockData();
    
    window.utils.showNotification('Stock entry deleted successfully', 'success');
  } catch (error) {
    console.error('Error deleting stock entry:', error);
    window.utils.showNotification('Failed to delete stock entry', 'error');
  }
}

async function viewStockHistory(name, color) {
  try {
    // Get all items with the specified name and color
    const items = await window.dbService.getStockItems();
    const matchingItems = items.filter(item => item.name === name && item.color === color);
    
    if (matchingItems.length === 0) {
      window.utils.showNotification('No history found for this item', 'error');
      return;
    }
    
    // Set item name in modal title
    document.getElementById('history-modal-title').textContent = `${name} (${color}) - History`;
    
    // Sort items by date (newest first)
    historyItems = [...matchingItems].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Reset pagination
    historyCurrentPage = 1;
    
    // Render history table
    renderHistoryTable();
    
    // Setup history pagination controls
    setupHistoryPaginationControls();
    
    // Show the modal
    document.getElementById('history-modal').classList.remove('opacity-0');
    document.getElementById('history-modal').classList.remove('pointer-events-none');
    
    // Add PDF export button if function exists
    if (typeof createPDFExportButton === 'function') {
      // Clear any existing button
      const exportContainer = document.getElementById('history-export-container');
      if (exportContainer) {
        exportContainer.innerHTML = '';
        
        createPDFExportButton({
          containerID: 'history-export-container',
          filename: `${name}-${color}-history.pdf`,
          tableID: 'history-table',
          title: `${name} (${color}) - Stock History`,
          orientation: 'landscape'
        });
      }
    }
    
  } catch (error) {
    console.error('Error viewing stock history:', error);
    window.utils.showNotification('Failed to load stock history', 'error');
  }
}

function renderHistoryTable() {
  const tbody = document.getElementById('history-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  // Calculate start and end indices for current page
  const startIndex = (historyCurrentPage - 1) * historyPageSize;
  const endIndex = Math.min(startIndex + historyPageSize, historyItems.length);
  
  // Get items for current page
  const currentItems = historyItems.slice(startIndex, endIndex);
  
  if (currentItems.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="6" class="px-4 py-2 text-center text-gray-500">No history found</td>
    `;
    tbody.appendChild(row);
    return;
  }
  
  // Calculate running total
  let runningTotal = 0;
  
  // For running total, we need to track from oldest to newest
  const sortedForRunningTotal = [...historyItems].sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });
  
  // Calculate running total for all items
  const runningTotals = {};
  sortedForRunningTotal.forEach(item => {
    runningTotal += item.quantity;
    runningTotals[item._id] = runningTotal;
  });
  
  // Render items for current page (newest first)
  currentItems.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2">${item.date}</td>
      <td class="px-4 py-2">${item.quantity > 0 ? 'In' : 'Out'}</td>
      <td class="px-4 py-2">${Math.abs(item.quantity)}</td>
      <td class="px-4 py-2">${window.utils.formatCurrency(item.price)}</td>
      <td class="px-4 py-2">${runningTotals[item._id]}</td>
      <td class="px-4 py-2">${item.note || '-'}</td>
    `;
    tbody.appendChild(row);
  });
}