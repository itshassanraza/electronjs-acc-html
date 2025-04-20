// expenses.js - Expense management

document.addEventListener('DOMContentLoaded', async function() {
    // Set default dates
    initializeDateFields();
    
    // Load data from database
    await loadExpensesData();
    
    // Set up all event handlers
    setupModalEvents();
  });
  
  // Initialize date fields
  function initializeDateFields() {
    const today = window.utils.getTodayDate();
    
    // Set date fields for expense forms
    document.getElementById('expenseDate').value = today;
    
    // Set filter date fields (last 30 days to today)
    document.getElementById('start-date').value = window.utils.getDateDaysAgo(30);
    document.getElementById('end-date').value = today;
  }
  
  async function loadExpensesData() {
    try {
      // Get expenses from database
      let expenses = [];
      try {
        expenses = await window.db.get('expenses');
      } catch (error) {
        console.log("Error getting expenses, using empty array:", error);
      }
      
      // Get expense categories
      await loadExpenseCategories();
      
      // Update summaries
      updateExpensesSummary(expenses);
      
      // Update category filter
      updateCategoryFilter();
      
      // Render expenses table
      renderExpensesTable(expenses);
    } catch (error) {
      console.error('Failed to load expenses data:', error);
      window.utils.showNotification('Failed to load expenses data', 'error');
      
      // Render empty table
      renderExpensesTable([]);
    }
  }
  
  // Ensure we have an expenses collection
  async function ensureExpensesCollection() {
    try {
      const count = await window.db.count('expenses');
      return true; // Collection exists
    } catch (error) {
      console.error("Error checking expenses collection:", error);
      // Instead of failing, we'll just assume it needs to be initialized
      return false;
    }
  }
  
  async function loadExpenseCategories() {
    try {
      let categories = [];
      try {
        categories = await window.db.get('expenseCategories');
      } catch (error) {
        console.log("Error getting categories, using defaults:", error);
        categories = [
          { name: 'shop' },
          { name: 'home' },
          { name: 'salary' },
          { name: 'rent' },
          { name: 'utilities' },
          { name: 'travel' },
          { name: 'office' },
          { name: 'other' }
        ];
      }
      
      // Update the category selects
      const categorySelect = document.getElementById('expenseCategory');
      const editCategorySelect = document.getElementById('editExpenseCategory');
      
      if (!categorySelect || !editCategorySelect) return;
      
      // Clear existing options except the default one
      categorySelect.innerHTML = '<option value="">Select Category</option>';
      editCategorySelect.innerHTML = '';
      
      // Add categories to both selects
      categories.forEach(category => {
        // For add form
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name.charAt(0).toUpperCase() + category.name.slice(1);
        categorySelect.appendChild(option);
        
        // For edit form
        const editOption = document.createElement('option');
        editOption.value = category.name;
        editOption.textContent = category.name.charAt(0).toUpperCase() + category.name.slice(1);
        editCategorySelect.appendChild(editOption);
      });
    } catch (error) {
      console.error('Error loading expense categories:', error);
    }
  }
  
  function updateExpensesSummary(expenses) {
    const today = window.utils.getTodayDate();
    const thisMonth = today.substring(0, 7); // 'YYYY-MM'
    
    // Calculate totals
    const totalAmount = expenses.reduce((total, expense) => total + expense.amount, 0);
    
    const todayAmount = expenses
      .filter(expense => expense.date === today)
      .reduce((total, expense) => total + expense.amount, 0);
    
    const monthAmount = expenses
      .filter(expense => expense.date.startsWith(thisMonth))
      .reduce((total, expense) => total + expense.amount, 0);
    
    // Update UI
    document.getElementById('total-expenses').textContent = window.utils.formatCurrency(totalAmount);
    document.getElementById('today-expenses').textContent = window.utils.formatCurrency(todayAmount);
    document.getElementById('month-expenses').textContent = window.utils.formatCurrency(monthAmount);
  }
  
  async function updateCategoryFilter() {
    const filterSelect = document.getElementById('category-filter');
    if (!filterSelect) return;
    
    try {
      const categories = await window.db.get('expenseCategories');
      
      // Clear existing options except the default one
      filterSelect.innerHTML = '<option value="all">All Categories</option>';
      
      // Add categories to filter
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name.charAt(0).toUpperCase() + category.name.slice(1);
        filterSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error updating category filter:', error);
    }
  }
  
  function renderExpensesTable(expenses, filteredExpenses = null) {
    const expensesBody = document.getElementById('expenses-body');
    expensesBody.innerHTML = '';
    
    const displayExpenses = filteredExpenses || expenses;
    
    if (!displayExpenses || displayExpenses.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="7" class="px-4 py-2 text-center text-gray-500">No expenses found</td>
      `;
      expensesBody.appendChild(row);
      return;
    }
    
    // Sort by date (newest first)
    const sortedExpenses = [...displayExpenses].sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    sortedExpenses.forEach(expense => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-2">${expense.id}</td>
        <td class="px-4 py-2">${expense.date}</td>
        <td class="px-4 py-2">${expense.title}</td>
        <td class="px-4 py-2">${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}</td>
        <td class="px-4 py-2">${window.utils.formatCurrency(expense.amount)}</td>
        <td class="px-4 py-2">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
            ${expense.paymentMode === 'cash' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
            ${expense.paymentMode === 'cash' ? 'Cash' : 'Bank'}
          </span>
        </td>
        <td class="px-4 py-2">
          <button class="text-blue-600 hover:text-blue-800 mr-2 view-expense" data-id="${expense.id}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="text-green-600 hover:text-green-800 mr-2 edit-expense" data-id="${expense.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="text-red-600 hover:text-red-800 delete-expense" data-id="${expense.id}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      expensesBody.appendChild(row);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.view-expense').forEach(button => {
      button.addEventListener('click', function() {
        const expenseId = this.getAttribute('data-id');
        viewExpenseDetails(expenseId, displayExpenses);
      });
    });
    
    document.querySelectorAll('.edit-expense').forEach(button => {
      button.addEventListener('click', function() {
        const expenseId = this.getAttribute('data-id');
        editExpenseDetails(expenseId, displayExpenses);
      });
    });
    
    document.querySelectorAll('.delete-expense').forEach(button => {
      button.addEventListener('click', function() {
        const expenseId = this.getAttribute('data-id');
        deleteExpense(expenseId);
      });
    });
  }
  
  function viewExpenseDetails(expenseId, expenses) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    // Set modal title
    document.getElementById('expense-title').textContent = `Expense: ${expense.id}`;
    
    // Populate expense details
    const detailsContainer = document.getElementById('expense-details');
    detailsContainer.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-gray-600">Title:</p>
          <p class="font-semibold">${expense.title}</p>
        </div>
        <div>
          <p class="text-gray-600">Date:</p>
          <p class="font-semibold">${expense.date}</p>
        </div>
        <div>
          <p class="text-gray-600">Category:</p>
          <p class="font-semibold">${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}</p>
        </div>
        <div>
          <p class="text-gray-600">Amount:</p>
          <p class="font-semibold">${window.utils.formatCurrency(expense.amount)}</p>
        </div>
        <div>
          <p class="text-gray-600">Payment Mode:</p>
          <p class="font-semibold ${expense.paymentMode === 'cash' ? 'text-green-600' : 'text-blue-600'}">
            ${expense.paymentMode === 'cash' ? 'Cash' : 'Bank'}
          </p>
        </div>
        ${expense.bankReference ? `
          <div>
            <p class="text-gray-600">Bank Reference:</p>
            <p class="font-semibold">${expense.bankReference}</p>
          </div>
        ` : ''}
        ${expense.description ? `
          <div class="col-span-2">
            <p class="text-gray-600">Description:</p>
            <p class="font-semibold">${expense.description}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    // Show modal
    const modal = document.getElementById('view-expense-modal');
    modal.classList.remove('opacity-0');
    modal.classList.remove('pointer-events-none');
    
    // Add close event handlers
    document.getElementById('close-view-modal').addEventListener('click', closeViewModal);
    document.getElementById('close-expense-details').addEventListener('click', closeViewModal);
    
    function closeViewModal() {
      modal.classList.add('opacity-0');
      modal.classList.add('pointer-events-none');
    }
  }
  
  function editExpenseDetails(expenseId, expenses) {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    // Fill form with expense data
    document.getElementById('editExpenseId').value = expense.id;
    document.getElementById('editExpenseTitle').value = expense.title;
    document.getElementById('editExpenseCategory').value = expense.category;
    document.getElementById('editExpenseAmount').value = expense.amount;
    document.getElementById('editExpenseDate').value = expense.date;
    document.getElementById('editPaymentMode').value = expense.paymentMode;
    document.getElementById('editBankReference').value = expense.bankReference || '';
    document.getElementById('editExpenseDescription').value = expense.description || '';
    
    // Show bank reference field if payment mode is bank
    if (expense.paymentMode === 'bank') {
      document.getElementById('edit-bank-reference-container').classList.remove('hidden');
    } else {
      document.getElementById('edit-bank-reference-container').classList.add('hidden');
    }
    
    // Show modal
    const modal = document.getElementById('edit-expense-modal');
    modal.classList.remove('opacity-0');
    modal.classList.remove('pointer-events-none');
    
    // Add close event handlers
    document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit-expense').addEventListener('click', closeEditModal);
    
    function closeEditModal() {
      modal.classList.add('opacity-0');
      modal.classList.add('pointer-events-none');
    }
    
    // Payment mode change handler
    document.getElementById('editPaymentMode').addEventListener('change', function() {
      if (this.value === 'bank') {
        document.getElementById('edit-bank-reference-container').classList.remove('hidden');
      } else {
        document.getElementById('edit-bank-reference-container').classList.add('hidden');
      }
    });
  }
  
  async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense? This will update your ledgers.')) {
      return;
    }
    
    try {
      // Get the expense to delete
      const expenses = await window.db.get('expenses');
      const expense = expenses.find(e => e.id === expenseId);
      
      if (!expense) {
        window.utils.showNotification('Expense not found', 'error');
        return;
      }
      
      // Reverse cash or bank ledger entry
      if (expense.paymentMode === 'cash') {
        await window.dbService.addCashTransaction({
          date: new Date().toISOString().split('T')[0],
          description: `Reversal of expense: ${expense.title}`,
          reference: `REV-${expense.id}`,
          cashIn: expense.amount,
          cashOut: 0
        });
      } else if (expense.paymentMode === 'bank') {
        await window.dbService.addBankTransaction({
          date: new Date().toISOString().split('T')[0],
          description: `Reversal of expense: ${expense.title}`,
          reference: `REV-${expense.id}`,
          deposit: expense.amount,
          withdrawal: 0
        });
      }
      
      // Delete the expense
      await window.db.remove('expenses', { id: expenseId });
      
      // Update UI
      await loadExpensesData();
      
      window.utils.showNotification('Expense deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting expense:', error);
      window.utils.showNotification('Error deleting expense', 'error');
    }
  }
  
  async function filterExpenses() {
    const searchTerm = document.getElementById('search-expenses').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const paymentMode = document.getElementById('payment-mode-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    try {
      let expenses = await window.db.get('expenses');
      
      // Filter by category
      if (category !== 'all') {
        expenses = expenses.filter(e => e.category === category);
      }
      
      // Filter by payment mode
      if (paymentMode !== 'all') {
        expenses = expenses.filter(e => e.paymentMode === paymentMode);
      }
      
      // Filter by date range
      if (startDate && endDate) {
        expenses = expenses.filter(e => 
          e.date >= startDate && e.date <= endDate
        );
      }
      
      // Filter by search term
      if (searchTerm) {
        expenses = expenses.filter(e => 
          e.title.toLowerCase().includes(searchTerm) || 
          e.category.toLowerCase().includes(searchTerm) ||
          (e.description && e.description.toLowerCase().includes(searchTerm))
        );
      }
      
      renderExpensesTable(expenses);
    } catch (error) {
      console.error('Error filtering expenses:', error);
      window.utils.showNotification('Error filtering expenses', 'error');
    }
  }
  
  function setupModalEvents() {
    // Show add expense modal
    document.getElementById('add-expense-btn').addEventListener('click', function() {
      const modal = document.getElementById('add-expense-modal');
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
    });
    
    // Close buttons for main modals
    document.querySelectorAll('.close-modal').forEach(button => {
      button.addEventListener('click', function() {
        document.querySelectorAll('.modal').forEach(modal => {
          modal.classList.add('opacity-0');
          modal.classList.add('pointer-events-none');
        });
      });
    });
    
    // Close button for specific modals
    document.getElementById('close-modal').addEventListener('click', function() {
      document.getElementById('add-expense-modal').classList.add('opacity-0');
      document.getElementById('add-expense-modal').classList.add('pointer-events-none');
    });
    
    document.getElementById('close-category-modal').addEventListener('click', function() {
      document.getElementById('add-category-modal').classList.add('opacity-0');
      document.getElementById('add-category-modal').classList.add('pointer-events-none');
    });
    
    // Show add category modal
    document.getElementById('add-category-btn').addEventListener('click', function() {
      const modal = document.getElementById('add-category-modal');
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
    });
    
    document.getElementById('edit-add-category-btn').addEventListener('click', function() {
      const modal = document.getElementById('add-category-modal');
      modal.classList.remove('opacity-0');
      modal.classList.remove('pointer-events-none');
    });
    
    // Cancel buttons
    document.getElementById('cancel-add-category').addEventListener('click', function() {
      document.getElementById('add-category-modal').classList.add('opacity-0');
      document.getElementById('add-category-modal').classList.add('pointer-events-none');
    });
    
    // Payment mode change handlers
    document.getElementById('paymentMode').addEventListener('change', function() {
      if (this.value === 'bank') {
        document.getElementById('bank-reference-container').classList.remove('hidden');
      } else {
        document.getElementById('bank-reference-container').classList.add('hidden');
      }
    });
    
    // Form submissions
    document.getElementById('add-expense-form').addEventListener('submit', function(e) {
      e.preventDefault();
      processExpense();
    });
    
    document.getElementById('edit-expense-form').addEventListener('submit', function(e) {
      e.preventDefault();
      updateExpense();
    });
    
    document.getElementById('add-category-form').addEventListener('submit', function(e) {
      e.preventDefault();
      addCategory();
    });
    
    // Filter button
    document.getElementById('apply-filter').addEventListener('click', filterExpenses);
  }
  
  async function processExpense() {
    const title = document.getElementById('expenseTitle').value;
    const category = document.getElementById('expenseCategory').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const date = document.getElementById('expenseDate').value;
    const paymentMode = document.getElementById('paymentMode').value;
    const bankReference = paymentMode === 'bank' ? document.getElementById('bankReference').value : '';
    const description = document.getElementById('expenseDescription').value;
    
    if (!title || !category || !amount || isNaN(amount) || !date || !paymentMode) {
      window.utils.showNotification('Please fill all required fields', 'error');
      return;
    }
    
    try {
      // Generate expense ID
      const expenses = await window.db.get('expenses');
      const expenseNumber = expenses.length + 1;
      const expenseId = `EXP-${String(expenseNumber).padStart(3, '0')}`;
      
      // Create expense object
      const expense = {
        id: expenseId,
        title,
        category,
        amount,
        date,
        paymentMode,
        bankReference,
        description,
        createdAt: new Date().toISOString()
      };
      
      // Save expense
      await window.db.insert('expenses', expense);
      
      // Add to cash or bank ledger
      if (paymentMode === 'cash') {
        await window.dbService.addCashTransaction({
          date,
          description: `Expense: ${title} (${category})`,
          reference: expenseId,
          cashIn: 0,
          cashOut: amount
        });
      } else if (paymentMode === 'bank') {
        await window.dbService.addBankTransaction({
          date,
          description: `Expense: ${title} (${category})`,
          reference: expenseId,
          deposit: 0,
          withdrawal: amount
        });
      }
      
      // Update UI
      await loadExpensesData();
      
      // Reset form and close modal
      document.getElementById('add-expense-form').reset();
      document.getElementById('expenseDate').value = window.utils.getTodayDate();
      document.getElementById('add-expense-modal').classList.add('opacity-0');
      document.getElementById('add-expense-modal').classList.add('pointer-events-none');
      document.getElementById('bank-reference-container').classList.add('hidden');
      
      window.utils.showNotification('Expense added successfully', 'success');
    } catch (error) {
      console.error('Error processing expense:', error);
      window.utils.showNotification('Error processing expense', 'error');
    }
  }
  
  async function updateExpense() {
    const expenseId = document.getElementById('editExpenseId').value;
    const title = document.getElementById('editExpenseTitle').value;
    const category = document.getElementById('editExpenseCategory').value;
    const amount = parseFloat(document.getElementById('editExpenseAmount').value);
    const date = document.getElementById('editExpenseDate').value;
    const paymentMode = document.getElementById('editPaymentMode').value;
    const bankReference = paymentMode === 'bank' ? document.getElementById('editBankReference').value : '';
    const description = document.getElementById('editExpenseDescription').value;
    
    if (!expenseId || !title || !category || !amount || isNaN(amount) || !date || !paymentMode) {
      window.utils.showNotification('Please fill all required fields', 'error');
      return;
    }
    
    try {
      // Get the original expense
      const expenses = await window.db.get('expenses');
      const originalExpense = expenses.find(e => e.id === expenseId);
      
      if (!originalExpense) {
        window.utils.showNotification('Expense not found', 'error');
        return;
      }
      
      // Check if amount or payment mode has changed
      const amountChanged = originalExpense.amount !== amount;
      const paymentModeChanged = originalExpense.paymentMode !== paymentMode;
      
      if (amountChanged || paymentModeChanged) {
        // Reverse the original transaction
        if (originalExpense.paymentMode === 'cash') {
          await window.dbService.addCashTransaction({
            date: date,
            description: `Adjustment for expense: ${originalExpense.title}`,
            reference: `ADJ-${expenseId}`,
            cashIn: originalExpense.amount,
            cashOut: 0
          });
        } else if (originalExpense.paymentMode === 'bank') {
          await window.dbService.addBankTransaction({
            date: date,
            description: `Adjustment for expense: ${originalExpense.title}`,
            reference: `ADJ-${expenseId}`,
            deposit: originalExpense.amount,
            withdrawal: 0
          });
        }
        
        // Create a new transaction with updated details
        if (paymentMode === 'cash') {
          await window.dbService.addCashTransaction({
            date: date,
            description: `Expense: ${title} (${category})`,
            reference: `UPD-${expenseId}`,
            cashIn: 0,
            cashOut: amount
          });
        } else if (paymentMode === 'bank') {
          await window.dbService.addBankTransaction({
            date: date,
            description: `Expense: ${title} (${category})`,
            reference: `UPD-${expenseId}`,
            deposit: 0,
            withdrawal: amount
          });
        }
      }
      
      // Update the expense
      await window.db.update('expenses', { id: expenseId }, { 
        $set: {
          title,
          category,
          amount,
          date,
          paymentMode,
          bankReference,
          description,
          updatedAt: new Date().toISOString()
        }
      });
      
      // Update UI
      await loadExpensesData();
      
      // Close modal
      document.getElementById('edit-expense-modal').classList.add('opacity-0');
      document.getElementById('edit-expense-modal').classList.add('pointer-events-none');
      
      window.utils.showNotification('Expense updated successfully', 'success');
    } catch (error) {
      console.error('Error updating expense:', error);
      window.utils.showNotification('Error updating expense', 'error');
    }
  }
  
  async function addCategory() {
    const categoryName = document.getElementById('categoryName').value.toLowerCase();
    
    if (!categoryName) {
      window.utils.showNotification('Please enter a category name', 'error');
      return;
    }
    
    try {
      // Check if category already exists
      const categories = await window.db.get('expenseCategories');
      const exists = categories.some(c => c.name.toLowerCase() === categoryName);
      
      if (exists) {
        window.utils.showNotification('Category already exists', 'error');
        return;
      }
      
      // Add new category
      await window.db.insert('expenseCategories', {
        name: categoryName,
        createdAt: new Date().toISOString()
      });
      
      // Update UI
      await loadExpenseCategories();
      await updateCategoryFilter();
      
      // Reset form and close modal
      document.getElementById('add-category-form').reset();
      document.getElementById('add-category-modal').classList.add('opacity-0');
      document.getElementById('add-category-modal').classList.add('pointer-events-none');
      
      window.utils.showNotification('Category added successfully', 'success');
    } catch (error) {
      console.error('Error adding category:', error);
      window.utils.showNotification('Error adding category', 'error');
    }
  }