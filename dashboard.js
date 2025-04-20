

// dashboard.js - Dashboard Functions
document.addEventListener('DOMContentLoaded', async function() {
    // Update current date
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    
    // Load dashboard data
    await loadBalances();
    await loadBusinessPerformanceChart();
    await loadRecentTransactions();
    await loadAvailableStock();
    await loadLowStockItems();
    
    // Set up event handlers
    setupEventHandlers();
  });
  
  async function loadBalances() {
    try {
      // Get cash balance
      const cashTransactions = await window.dbService.getCashTransactions();
      const totalCashIn = cashTransactions.reduce((sum, tx) => sum + (tx.cashIn || 0), 0);
      const totalCashOut = cashTransactions.reduce((sum, tx) => sum + (tx.cashOut || 0), 0);
      const cashBalance = totalCashIn - totalCashOut;
      
      // Get bank balance
      const bankTransactions = await window.dbService.getBankTransactions();
      const totalDeposits = bankTransactions.reduce((sum, tx) => sum + (tx.deposit || 0), 0);
      const totalWithdrawals = bankTransactions.reduce((sum, tx) => sum + (tx.withdrawal || 0), 0);
      const bankBalance = totalDeposits - totalWithdrawals;
      
      // Get receivables
      const receivables = await window.dbService.getReceivables();
      const receivableBalance = receivables.reduce((sum, rx) => sum + (rx.amount || 0), 0);
      
      // Get payables
      const payables = await window.dbService.getPayables();
      const payableBalance = payables.reduce((sum, px) => sum + (px.amount || 0), 0);
      
      // Update UI
      document.getElementById('cash-balance').textContent = window.utils.formatCurrency(cashBalance);
      document.getElementById('bank-balance').textContent = window.utils.formatCurrency(bankBalance);
      document.getElementById('receivable-balance').textContent = window.utils.formatCurrency(receivableBalance);
      document.getElementById('payable-balance').textContent = window.utils.formatCurrency(payableBalance);
    } catch (error) {
      console.error('Failed to load balances:', error);
      document.getElementById('cash-balance').textContent = window.utils.formatCurrency(0);
      document.getElementById('bank-balance').textContent = window.utils.formatCurrency(0);
      document.getElementById('receivable-balance').textContent = window.utils.formatCurrency(0);
      document.getElementById('payable-balance').textContent = window.utils.formatCurrency(0);
    }
  }
  
  async function loadBusinessPerformanceChart() {
    try {
      // Get sales data (bills)
      const bills = await window.dbService.getBills();
      
      // Get purchase data
      const purchases = await window.db.get('purchases');
      
      // Get expense data
      let expenses = [];
      try {
        expenses = await window.db.get('expenses');
      } catch (error) {
        console.log('No expenses data available:', error);
      }
      
      // Process data for the last 6 months
      const today = new Date();
      const labels = []; // Month names
      const salesData = [];
      const purchasesData = [];
      const expensesData = [];
      const profitData = []; // Sales - Purchases - Expenses
      
      // Generate labels for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        const yearNum = date.getFullYear();
        labels.push(`${monthName} ${yearNum}`);
        
        // Format for filtering: "YYYY-MM"
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // Calculate monthly data
        const monthlySales = bills
          .filter(bill => bill.date.startsWith(monthKey))
          .reduce((sum, bill) => sum + bill.amount, 0);
        
        const monthlyPurchases = purchases
          .filter(purchase => purchase.date.startsWith(monthKey))
          .reduce((sum, purchase) => sum + purchase.amount, 0);
        
        const monthlyExpenses = expenses
          .filter(expense => expense.date.startsWith(monthKey))
          .reduce((sum, expense) => sum + expense.amount, 0);
        
        // Calculate profit/loss
        const monthlyProfit = monthlySales - monthlyPurchases - monthlyExpenses;
        
        // Add to data arrays
        salesData.push(monthlySales);
        purchasesData.push(monthlyPurchases);
        expensesData.push(monthlyExpenses);
        profitData.push(monthlyProfit);
      }
      
      // Create chart
      const ctx = document.getElementById('business-chart').getContext('2d');
      
      // Destroy existing chart if it exists
      if (window.businessChart) {
        window.businessChart.destroy();
      }
      
      window.businessChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Sales',
              data: salesData,
              backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2
            },
            {
              label: 'Purchases',
              data: purchasesData,
              backgroundColor: 'rgba(239, 68, 68, 0.1)', // red
              borderColor: 'rgba(239, 68, 68, 1)',
              borderWidth: 2
            },
            {
              label: 'Expenses',
              data: expensesData,
              backgroundColor: 'rgba(245, 158, 11, 0.1)', // yellow
              borderColor: 'rgba(245, 158, 11, 1)',
              borderWidth: 2
            },
            {
              label: 'Profit/Loss',
              data: profitData,
              backgroundColor: 'rgba(16, 185, 129, 0.1)', // green
              borderColor: 'rgba(16, 185, 129, 1)',
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '₹' + value.toLocaleString();
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.dataset.label + ': ₹' + context.raw.toLocaleString();
                }
              }
            },
            legend: {
              display: false
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to load business performance chart:', error);
      document.getElementById('business-chart').innerHTML = 
        '<div class="text-center text-red-500 mt-10">Failed to load chart data.</div>';
    }
  }
  
  // Global variables for pagination
  let allTransactions = [];
  let currentTransactionPage = 1;
  const transactionsPerPage = 10;
  let filteredTransactions = [];
  let allStockItems = [];
  let currentStockPage = 1;
  const stockItemsPerPage = 10;
  let filteredStockItems = [];
  
  async function loadRecentTransactions() {
    try {
      // Get all transaction types
      
      // 1. Sales (Bills)
      const bills = await window.dbService.getBills();
      const saleTx = bills.map(bill => ({
        date: bill.date,
        description: `Sale to ${bill.customer}`,
        amount: bill.amount,
        type: 'sale',
        id: bill.id,
        time: new Date(bill.date).getTime() // For sorting
      }));
      
      // 2. Purchases
      let purchases = [];
      try {
        purchases = await window.db.get('purchases');
        purchases = purchases.map(purchase => ({
          date: purchase.date,
          description: `Purchase from ${purchase.vendor}`,
          amount: purchase.amount,
          type: 'purchase',
          id: purchase.id,
          time: new Date(purchase.date).getTime()
        }));
      } catch (error) {
        console.log('No purchases data available:', error);
      }
      
      // 3. Expenses
      let expenses = [];
      try {
        expenses = await window.db.get('expenses');
        expenses = expenses.map(expense => ({
          date: expense.date,
          description: `${expense.title} (${expense.category})`,
          amount: expense.amount,
          type: 'expense',
          id: expense.id,
          time: new Date(expense.date).getTime()
        }));
      } catch (error) {
        console.log('No expenses data available:', error);
      }
      
      // 4. Receipts
      let receipts = [];
      try {
        receipts = await window.db.get('receipts');
        receipts = receipts.map(receipt => ({
          date: receipt.date,
          description: `Receipt from ${receipt.customer}: ${receipt.title}`,
          amount: receipt.amount,
          type: 'receipt',
          id: receipt.id,
          time: new Date(receipt.date).getTime()
        }));
      } catch (error) {
        console.log('No receipts data available:', error);
      }
      
      // 5. Payments
      let payments = [];
      try {
        payments = await window.dbService.getPayments();
        payments = payments.map(payment => ({
          date: payment.date,
          description: `Payment to ${payment.customer}: ${payment.title}`,
          amount: payment.amount,
          type: 'payment',
          id: payment.id,
          time: new Date(payment.date).getTime()
        }));
      } catch (error) {
        console.log('No payments data available:', error);
      }
      
      // Combine all transactions
      allTransactions = [
        ...saleTx,
        ...purchases,
        ...expenses,
        ...receipts,
        ...payments
      ];
      
      // Sort by date (newest first)
      allTransactions = allTransactions.sort((a, b) => b.time - a.time);
      
      // Set initial filtered transactions
      filteredTransactions = [...allTransactions];
      
      // Render first page
      renderTransactionPage(currentTransactionPage);
    } catch (error) {
      console.error('Failed to load recent transactions:', error);
      document.getElementById('transactions-body').innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-2 text-center text-red-500">Failed to load transactions</td>
        </tr>
      `;
    }
  }
  
  function renderTransactionPage(page) {
    const tbody = document.getElementById('transactions-body');
    tbody.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-2 text-center text-gray-500">No transactions found</td>
        </tr>
      `;
      document.getElementById('transactions-pagination').innerHTML = '';
      return;
    }
    
    const startIndex = (page - 1) * transactionsPerPage;
    const endIndex = Math.min(startIndex + transactionsPerPage, filteredTransactions.length);
    const displayTransactions = filteredTransactions.slice(startIndex, endIndex);
    
    displayTransactions.forEach(tx => {
      const typeColors = {
        sale: 'bg-blue-100 text-blue-800',
        purchase: 'bg-red-100 text-red-800',
        expense: 'bg-yellow-100 text-yellow-800',
        receipt: 'bg-green-100 text-green-800',
        payment: 'bg-purple-100 text-purple-800'
      };
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-2 whitespace-nowrap">${tx.date}</td>
        <td class="px-4 py-2">${tx.description}</td>
        <td class="px-4 py-2 whitespace-nowrap">${window.utils.formatCurrency(tx.amount)}</td>
        <td class="px-4 py-2">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColors[tx.type]}">
            ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Update pagination
    renderTransactionPagination(page);
  }
  
  function renderTransactionPagination(currentPage) {
    const paginationDiv = document.getElementById('transactions-pagination');
    paginationDiv.innerHTML = '';
  
    const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  
    if (totalPages <= 1) {
      return; // No need for pagination
    }
  
    // Create a container for pagination with a subtle background and shadow
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'flex items-center justify-center space-x-2 p-2 bg-white rounded-lg shadow-sm';
  
    // Previous button with SVG icon
    const prevBtn = document.createElement('button');
    prevBtn.className = `w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${
      currentPage === 1
        ? 'opacity-50 cursor-not-allowed bg-gray-100'
        : 'hover:bg-blue-100 hover:scale-105 active:scale-95 bg-gray-50'
    }`;
    prevBtn.innerHTML = `
      <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
    `;
    prevBtn.disabled = currentPage === 1;
    prevBtn.setAttribute('aria-label', 'Previous Page');
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentTransactionPage--;
        renderTransactionPage(currentTransactionPage);
      }
    });
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
      pageBtn.className = `w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${
        i === currentPage
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-blue-100 hover:scale-105 active:scale-95 bg-gray-50'
      }`;
      pageBtn.textContent = i;
      pageBtn.setAttribute('aria-label', `Page ${i}`);
      pageBtn.addEventListener('click', () => {
        currentTransactionPage = i;
        renderTransactionPage(currentTransactionPage);
      });
      paginationContainer.appendChild(pageBtn);
    }
  
    // Next button with SVG icon
    const nextBtn = document.createElement('button');
    nextBtn.className = `w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${
      currentPage === totalPages
        ? 'opacity-50 cursor-not-allowed bg-gray-100'
        : 'hover:bg-blue-100 hover:scale-105 active:scale-95 bg-gray-50'
    }`;
    nextBtn.innerHTML = `
      <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    `;
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.setAttribute('aria-label', 'Next Page');
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentTransactionPage++;
        renderTransactionPage(currentTransactionPage);
      }
    });
    paginationContainer.appendChild(nextBtn);
  
    // Append the container to the pagination div
    paginationDiv.appendChild(paginationContainer);
  } 
  
  async function loadAvailableStock() {
    try {
      // Get stock items
      const stockItems = await window.dbService.getStockItems();
      
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
      allStockItems = Object.values(summary).map(item => ({
        ...item,
        avgPrice: item.quantity > 0 ? item.totalValue / item.quantity : 0
      }));
      
      // Sort by name and color
      allStockItems.sort((a, b) => {
        if (a.name !== b.name) {
          return a.name.localeCompare(b.name);
        }
        return a.color.localeCompare(b.color);
      });
      
      // Set initial filtered stock
      filteredStockItems = [...allStockItems];
      
      // Render first page
      renderStockPage(currentStockPage);
    } catch (error) {
      console.error('Failed to load stock items:', error);
      document.getElementById('stock-body').innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-2 text-center text-red-500">Failed to load stock data</td>
        </tr>
      `;
    }
  }
  
  function renderStockPage(page) {
    const tbody = document.getElementById('stock-body');
    tbody.innerHTML = '';
    
    if (filteredStockItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="px-4 py-2 text-center text-gray-500">No stock items found</td>
        </tr>
      `;
      document.getElementById('stock-pagination').innerHTML = '';
      return;
    }
    
    const startIndex = (page - 1) * stockItemsPerPage;
    const endIndex = Math.min(startIndex + stockItemsPerPage, filteredStockItems.length);
    const displayStockItems = filteredStockItems.slice(startIndex, endIndex);
    
    displayStockItems.forEach(item => {
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
        <td class="px-4 py-2">${window.utils.formatCurrency(item.totalValue)}</td>
      `;
      tbody.appendChild(row);
    });
    
    // Update pagination
    renderStockPagination(page);
  }
  
  function renderStockPagination(currentPage) {
    const paginationDiv = document.getElementById('stock-pagination');
    paginationDiv.innerHTML = '';
    
    const totalPages = Math.ceil(filteredStockItems.length / stockItemsPerPage);
    
    if (totalPages <= 1) {
      return; // No need for pagination
    }
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : 'hover:bg-gray-200'}`;
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentStockPage--;
        renderStockPage(currentStockPage);
      }
    });
    paginationDiv.appendChild(prevBtn);
    
    // Page buttons
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage + 1 < maxPageButtons) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : 'hover:bg-gray-200'}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        currentStockPage = i;
        renderStockPage(currentStockPage);
      });
      paginationDiv.appendChild(pageBtn);
    }
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : 'hover:bg-gray-200'}`;
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentStockPage++;
        renderStockPage(currentStockPage);
      }
    });
    paginationDiv.appendChild(nextBtn);
  }
  
  async function loadLowStockItems() {
    try {
      // Get stock items
      const stockItems = await window.dbService.getStockItems();
      
      // Calculate summary by grouping items with the same name and color
      const summary = {};
      
      stockItems.forEach(item => {
        const key = `${item.name}-${item.color}`;
        
        if (!summary[key]) {
          summary[key] = {
            name: item.name,
            color: item.color,
            quantity: 0
          };
        }
        
        summary[key].quantity += item.quantity;
      });
      
      // Convert to array and filter for low stock (less than 10 items)
      let lowStock = Object.values(summary)
        .filter(item => item.quantity < 10)
        .sort((a, b) => a.quantity - b.quantity); // Sort by lowest quantity first
      
      // Render low stock table
      const tbody = document.getElementById('low-stock-body');
      if (!tbody) return;
      
      tbody.innerHTML = '';
      
      if (lowStock.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="3" class="px-4 py-2 text-center text-gray-500">No low stock items found</td>
        `;
        tbody.appendChild(row);
        return;
      }
      
      lowStock.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="px-4 py-2">${item.name}</td>
          <td class="px-4 py-2">${item.color}</td>
          <td class="px-4 py-2">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
              ${item.quantity <= 3 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
              ${item.quantity}
            </span>
          </td>
        `;
        tbody.appendChild(row);
      });
    } catch (error) {
      console.error('Failed to load low stock items:', error);
      
      const tbody = document.getElementById('low-stock-body');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="3" class="px-4 py-2 text-center text-red-500">Failed to load stock data</td>
          </tr>
        `;
      }
    }
  }
  
  function setupEventHandlers() {
    // Transaction type filter
    const transactionTypeFilter = document.getElementById('transaction-type-filter');
    if (transactionTypeFilter) {
      transactionTypeFilter.addEventListener('change', function() {
        const filterType = this.value;
        
        if (filterType === 'all') {
          filteredTransactions = [...allTransactions];
        } else {
          filteredTransactions = allTransactions.filter(tx => tx.type === filterType);
        }
        
        currentTransactionPage = 1; // Reset to first page
        renderTransactionPage(currentTransactionPage);
      });
    }
    
    // Stock search
    const searchStock = document.getElementById('search-stock');
    if (searchStock) {
      searchStock.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        if (searchTerm === '') {
          filteredStockItems = [...allStockItems];
        } else {
          filteredStockItems = allStockItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm) || 
            item.color.toLowerCase().includes(searchTerm)
          );
        }
        
        currentStockPage = 1; // Reset to first page
        renderStockPage(currentStockPage);
      });
    }
  }