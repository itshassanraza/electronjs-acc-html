// db.js - Database Access Layer
const dbService = {
    // Stock Management
    async getStockItems() {
      try {
        return await window.db.get('stock');
      } catch (error) {
        console.error('Error fetching stock items:', error);
        return [];
      }
    },
    
    async addStockItem(item) {
      // Add timestamp
      item.createdAt = new Date().toISOString();
      return await window.db.insert('stock', item);
    },
    
    async updateStockItem(id, updates) {
      // Add updated timestamp
      updates.updatedAt = new Date().toISOString();
      return await window.db.update('stock', { _id: id }, { $set: updates });
    },
    
    async deleteStockItem(id) {
      return await window.db.remove('stock', { _id: id });
    },
  
    async getStockSummary() {
      const items = await this.getStockItems();
      const summary = {};
      
      items.forEach(item => {
        const key = `${item.name}-${item.color}`;
        
        if (!summary[key]) {
          summary[key] = {
            name: item.name,
            color: item.color,
            totalQuantity: 0,
            totalValue: 0
          };
        }
        
        summary[key].totalQuantity += item.quantity;
        summary[key].totalValue += item.quantity * item.price;
      });
      
      return Object.values(summary).map(item => ({
        ...item,
        averagePrice: item.totalQuantity > 0 ? item.totalValue / item.totalQuantity : 0
      }));
    },
    
    // Customer Management
    async getCustomers() {
      try {
        return await window.db.get('customers');
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    },
    
    async getCustomerById(id) {
      return await window.db.getOne('customers', { _id: id });
    },
    
    async addCustomer(customer) {
      // Add timestamp and initial values
      customer.createdAt = new Date().toISOString();
      customer.totalDebit = customer.totalDebit || 0;
      customer.totalCredit = customer.totalCredit || 0;
      customer.transactions = customer.transactions || [];
      return await window.db.insert('customers', customer);
    },
    
    async updateCustomer(id, updates) {
      updates.updatedAt = new Date().toISOString();
      return await window.db.update('customers', { _id: id }, { $set: updates });
    },
    
    async deleteCustomer(id) {
      return await window.db.remove('customers', { _id: id });
    },
    
    async addCustomerTransaction(customerId, transaction) {
      const customer = await this.getCustomerById(customerId);
      if (!customer) return null;
      
      // Add transaction to customer's transaction array
      const transactions = [...(customer.transactions || []), transaction];
      
      // Update totals
      let totalDebit = customer.totalDebit || 0;
      let totalCredit = customer.totalCredit || 0;
      
      if (transaction.debit) {
        totalDebit += transaction.debit;
      }
      if (transaction.credit) {
        totalCredit += transaction.credit;
      }
      
      return await this.updateCustomer(customerId, { 
        transactions,
        totalDebit,
        totalCredit
      });
    },
    
    // Bills/Invoices
    async getBills() {
      try {
        return await window.db.get('bills');
      } catch (error) {
        console.error('Error fetching bills:', error);
        return [];
      }
    },
    
    async getBillById(id) {
      return await window.db.getOne('bills', { id: id });
    },
    
    async addBill(bill) {
      bill.createdAt = new Date().toISOString();
      return await window.db.insert('bills', bill);
    },
    
    async deleteBill(id) {
      return await window.db.remove('bills', { id: id });
    },
    
    // Payments
    async getPayments() {
      try {
        return await window.db.get('payments');
      } catch (error) {
        console.error('Error fetching payments:', error);
        return [];
      }
    },
    
    async addPayment(payment) {
      payment.createdAt = new Date().toISOString();
      return await window.db.insert('payments', payment);
    },
    
    async deletePayment(id) {
      return await window.db.remove('payments', { id: id });
    },
    
    // Cash Ledger
    async getCashTransactions() {
      try {
        return await window.db.get('cashLedger');
      } catch (error) {
        console.error('Error fetching cash transactions:', error);
        return [];
      }
    },
    
    async addCashTransaction(transaction) {
      try {
        // Get current transactions to calculate new balance
        const transactions = await this.getCashTransactions();
        const totalCashIn = transactions.reduce((sum, tx) => sum + (tx.cashIn || 0), 0);
        const totalCashOut = transactions.reduce((sum, tx) => sum + (tx.cashOut || 0), 0);
        const currentBalance = totalCashIn - totalCashOut;
        
        // Calculate new balance
        const newBalance = currentBalance + (transaction.cashIn || 0) - (transaction.cashOut || 0);
        
        // Add balance and timestamp
        transaction.balance = newBalance;
        transaction.createdAt = new Date().toISOString();
        
        return await window.db.insert('cashLedger', transaction);
      } catch (error) {
        console.error('Error adding cash transaction:', error);
        throw error;
      }
    },
    
    async getCashBalance() {
      const transactions = await this.getCashTransactions();
      const totalIn = transactions.reduce((sum, tx) => sum + (tx.cashIn || 0), 0);
      const totalOut = transactions.reduce((sum, tx) => sum + (tx.cashOut || 0), 0);
      return totalIn - totalOut;
    },
    
    // Bank Ledger
    async getBankTransactions() {
      try {
        return await window.db.get('bankLedger');
      } catch (error) {
        console.error('Error fetching bank transactions:', error);
        return [];
      }
    },
    
    async addBankTransaction(transaction) {
      try {
        // Get current transactions to calculate new balance
        const transactions = await this.getBankTransactions();
        const totalDeposits = transactions.reduce((sum, tx) => sum + (tx.deposit || 0), 0);
        const totalWithdrawals = transactions.reduce((sum, tx) => sum + (tx.withdrawal || 0), 0);
        const currentBalance = totalDeposits - totalWithdrawals;
        
        // Calculate new balance
        const newBalance = currentBalance + (transaction.deposit || 0) - (transaction.withdrawal || 0);
        
        // Add balance and timestamp
        transaction.balance = newBalance;
        transaction.createdAt = new Date().toISOString();
        
        return await window.db.insert('bankLedger', transaction);
      } catch (error) {
        console.error('Error adding bank transaction:', error);
        throw error;
      }
    },
    
    async getBankBalance() {
      const transactions = await this.getBankTransactions();
      const totalDeposits = transactions.reduce((sum, tx) => sum + (tx.deposit || 0), 0);
      const totalWithdrawals = transactions.reduce((sum, tx) => sum + (tx.withdrawal || 0), 0);
      return totalDeposits - totalWithdrawals;
    },
    
    // Trade Receivable
    async getReceivables() {
      try {
        return await window.db.get('tradeReceivable');
      } catch (error) {
        console.error('Error fetching receivables:', error);
        return [];
      }
    },
    
    async addReceivable(receivable) {
      receivable.createdAt = new Date().toISOString();
      return await window.db.insert('tradeReceivable', receivable);
    },
    
    async updateReceivable(id, updates) {
      updates.updatedAt = new Date().toISOString();
      return await window.db.update('tradeReceivable', { id: id }, { $set: updates });
    },
    
    async deleteReceivable(id) {
      return await window.db.remove('tradeReceivable', { id: id });
    },
    
    // Trade Payable
    async getPayables() {
      try {
        return await window.db.get('tradePayable');
      } catch (error) {
        console.error('Error fetching payables:', error);
        return [];
      }
    },
    
    async addPayable(payable) {
      payable.createdAt = new Date().toISOString();
      return await window.db.insert('tradePayable', payable);
    },
    
    async updatePayable(id, updates) {
      updates.updatedAt = new Date().toISOString();
      return await window.db.update('tradePayable', { id: id }, { $set: updates });
    },
    
    async deletePayable(id) {
      return await window.db.remove('tradePayable', { id: id });
    },
    // Add this to the end of the dbService object in db.js

    
// Purchases
async getPurchases() {
    try {
      return await window.db.get('purchases');
    } catch (error) {
      console.error('Error fetching purchases:', error);
      return [];
    }
  },
  
  async addPurchase(purchase) {
    purchase.createdAt = new Date().toISOString();
    return await window.db.insert('purchases', purchase);
  },
  
  async deletePurchase(id) {
    return await window.db.remove('purchases', { id: id });
  },
    // Initialize data if necessary
    async initializeData() {
      try {
        // Check if we just cleaned the database - if so, skip initialization
        if (localStorage.getItem('_justCleaned') === 'true' || window._justCleaned === true) {
          console.log('Database was just cleaned - skipping initialization');
          return;
        }

        // Check if cash ledger exists, if not initialize with zero
        const cashCount = await window.db.count('cashLedger');
        if (cashCount === 0) {
          await this.addCashTransaction({
            date: new Date().toISOString().split('T')[0],
            description: 'Initial Balance',
            reference: 'INIT-001',
            cashIn: 0,
            cashOut: 0
          });
        }
        
        // Check if bank ledger exists, if not initialize with zero
        const bankCount = await window.db.count('bankLedger');
        if (bankCount === 0) {
          await this.addBankTransaction({
            date: new Date().toISOString().split('T')[0],
            description: 'Initial Balance',
            reference: 'INIT-001',
            deposit: 0,
            withdrawal: 0
          });
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    }
  };
  async function ensureCollection(collection) {
    try {
      // Try to count documents in the collection to see if it exists
      await window.db.count(collection);
      return true;
    } catch (error) {
      console.error(`Collection '${collection}' may not exist yet:`, error);
      return false;
    }
  }
  // Get all collections (used for backup/restore)
window.db.getAllCollections = async function() {
  const collections = [
      'stock',
      'customers',
      'bills',
      'purchases',
      'cash_transactions',
      'bank_transactions',
      'expenses',
      'receivables',
      'payables'
  ];
  
  const result = {};
  
  for (const collection of collections) {
      try {
          result[collection] = await window.db.get(collection) || [];
      } catch (error) {
          console.error(`Error getting collection ${collection}:`, error);
          result[collection] = [];
      }
  }
  
  return result;
};

// Add or extend dbService if needed
if (!window.dbService) {
  window.dbService = {};
}

// Make sure these methods exist in dbService
if (!window.dbService.getStockItems) {
  window.dbService.getStockItems = async function() {
      return await window.db.get('stock') || [];
  };
}

if (!window.dbService.getCustomers) {
  window.dbService.getCustomers = async function() {
      return await window.db.get('customers') || [];
  };
}

if (!window.dbService.getBills) {
  window.dbService.getBills = async function() {
      return await window.db.get('bills') || [];
  };
}

if (!window.dbService.addStockItem) {
  window.dbService.addStockItem = async function(item) {
      const stock = await window.db.get('stock') || [];
      
      if (!item._id) {
          item._id = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
      }
      
      stock.push(item);
      await window.db.set('stock', stock);
      return item;
  };
}

if (!window.dbService.deleteStockItem) {
  window.dbService.deleteStockItem = async function(id) {
      const stock = await window.db.get('stock') || [];
      const updatedStock = stock.filter(item => item._id !== id);
      await window.db.set('stock', updatedStock);
      return true;
  };
}

if (!window.dbService.addCustomer) {
  window.dbService.addCustomer = async function(customer) {
      const customers = await window.db.get('customers') || [];
      
      if (!customer._id) {
          customer._id = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
      }
      
      customers.push(customer);
      await window.db.set('customers', customers);
      return customer;
  };
}

if (!window.dbService.deleteCustomer) {
  window.dbService.deleteCustomer = async function(id) {
      const customers = await window.db.get('customers') || [];
      const updatedCustomers = customers.filter(customer => customer._id !== id);
      await window.db.set('customers', updatedCustomers);
      return true;
  };
}

if (!window.dbService.addBill) {
  window.dbService.addBill = async function(bill) {
      const bills = await window.db.get('bills') || [];
      bills.push(bill);
      await window.db.set('bills', bills);
      return bill;
  };
}

if (!window.dbService.deleteBill) {
  window.dbService.deleteBill = async function(id) {
      const bills = await window.db.get('bills') || [];
      const updatedBills = bills.filter(bill => bill.id !== id);
      await window.db.set('bills', updatedBills);
      return true;
  };
}
  // Make available globally
  window.dbService = dbService;
  
  // Initialize data when the window loads
  window.addEventListener('load', () => {
    if (window.db) {
      dbService.initializeData();
    } else {
      console.error('Database not available');
    }
  });
  // Add payable payment
  window.dbService.addPayablePayment = window.dbService.addPayablePayment || async function(payable) {
    try {
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
        
        // Save to storage
        if (window.db && typeof window.db.set === 'function') {
            await window.db.set('payables', payables);
        } else {
            localStorage.setItem('payables', JSON.stringify(payables));
        }
        
        console.log(`Successfully added/updated payable: ${payable.id}`);
        return payable;
    } catch (error) {
        console.error('Error adding payable payment:', error);
        throw error;
    }
};

// Enhance Trade Payable methods to be more reliable

// Enhance the original getPayables method to check both collection names
window.dbService.getPayables = async function() {
  try {
      let payables = [];
      
      // First try to get from 'payables' collection
      if (window.db && typeof window.db.get === 'function') {
          try {
              const regularPayables = await window.db.get('payables') || [];
              payables = [...regularPayables];
              console.log(`Found ${regularPayables.length} payables in 'payables' collection`);
          } catch (error) {
              console.warn('Error getting from payables collection:', error);
          }
          
          // Also try to get from 'tradePayable' collection
          try {
              const tradePayables = await window.db.get('tradePayable') || [];
              
              // Merge without duplicates (prefer items from 'payables' if id clash)
              const existingIds = new Set(payables.map(p => p.id));
              const uniqueTradePayables = tradePayables.filter(p => !existingIds.has(p.id));
              
              payables = [...payables, ...uniqueTradePayables];
              console.log(`Found ${tradePayables.length} payables in 'tradePayable' collection, ${uniqueTradePayables.length} unique`);
          } catch (error) {
              console.warn('Error getting from tradePayable collection:', error);
          }
      }
      
      // Also check localStorage as fallback
      try {
          const storedPayables = localStorage.getItem('payables');
          const storedTradePayable = localStorage.getItem('tradePayable');
          
          if (storedPayables) {
              const parsed = JSON.parse(storedPayables);
              // Merge without duplicates
              const existingIds = new Set(payables.map(p => p.id));
              const uniqueItems = parsed.filter(p => !existingIds.has(p.id));
              payables = [...payables, ...uniqueItems];
          }
          
          if (storedTradePayable) {
              const parsed = JSON.parse(storedTradePayable);
              // Merge without duplicates
              const existingIds = new Set(payables.map(p => p.id));
              const uniqueItems = parsed.filter(p => !existingIds.has(p.id));
              payables = [...payables, ...uniqueItems];
          }
      } catch (error) {
          console.warn('Error checking localStorage for payables:', error);
      }
      
      console.log(`Total unique payables found: ${payables.length}`);
      return payables;
  } catch (error) {
      console.error('Error in enhanced getPayables:', error);
      return [];
  }
};

// Enhance addPayable to save to both collections for maximum compatibility
window.dbService.addPayable = async function(payable) {
  try {
      console.log('Enhanced addPayable called with:', payable);
      payable.createdAt = payable.createdAt || new Date().toISOString();
      
      // Save to both collections to ensure it appears everywhere
      if (window.db) {
          // Save to tradePayable collection (original)
          if (typeof window.db.insert === 'function') {
              try {
                  await window.db.insert('tradePayable', {...payable});
                  console.log('Saved payable to tradePayable collection');
              } catch (e) {
                  console.warn('Error saving to tradePayable via insert:', e);
                  // Try set instead if insert fails
                  if (typeof window.db.get === 'function' && typeof window.db.set === 'function') {
                      const tradePayables = await window.db.get('tradePayable') || [];
                      const updatedPayables = [...tradePayables, payable];
                      await window.db.set('tradePayable', updatedPayables);
                      console.log('Saved payable to tradePayable collection via set');
                  }
              }
          }
          
          // Also save to payables collection (used by some functions)
          if (typeof window.db.get === 'function' && typeof window.db.set === 'function') {
              try {
                  const payables = await window.db.get('payables') || [];
                  const existingIndex = payables.findIndex(p => p.id === payable.id);
                  
                  if (existingIndex >= 0) {
                      payables[existingIndex] = {...payable};
                  } else {
                      payables.push({...payable});
                  }
                  
                  await window.db.set('payables', payables);
                  console.log('Saved payable to payables collection');
              } catch (e) {
                  console.warn('Error saving to payables collection:', e);
              }
          }
      }
      
      // Also save to localStorage for maximum reliability
      try {
          // Update tradePayable in localStorage
          const storedTradePayable = localStorage.getItem('tradePayable');
          const tradePayables = storedTradePayable ? JSON.parse(storedTradePayable) : [];
          const tradeExistingIndex = tradePayables.findIndex(p => p.id === payable.id);
          
          if (tradeExistingIndex >= 0) {
              tradePayables[tradeExistingIndex] = {...payable};
          } else {
              tradePayables.push({...payable});
          }
          
          localStorage.setItem('tradePayable', JSON.stringify(tradePayables));
          
          // Update payables in localStorage
          const storedPayables = localStorage.getItem('payables');
          const payables = storedPayables ? JSON.parse(storedPayables) : [];
          const existingIndex = payables.findIndex(p => p.id === payable.id);
          
          if (existingIndex >= 0) {
              payables[existingIndex] = {...payable};
          } else {
              payables.push({...payable});
          }
          
          localStorage.setItem('payables', JSON.stringify(payables));
      } catch (e) {
          console.warn('Error updating localStorage for payables:', e);
      }
      
      return payable;
  } catch (error) {
      console.error('Error in enhanced addPayable:', error);
      throw error;
  }
};

// Also sync the addPayablePayment method to use our enhanced addPayable
window.dbService.addPayablePayment = async function(payable) {
  try {
      console.log('addPayablePayment redirecting to enhanced addPayable:', payable);
      return await window.dbService.addPayable(payable);
  } catch (error) {
      console.error('Error in addPayablePayment:', error);
      throw error;
  }
};

// Update the updatePayable method to update both collections
window.dbService.updatePayable = async function(id, updates) {
  try {
      console.log(`Enhanced updatePayable called for ID: ${id}`, updates);
      updates.updatedAt = updates.updatedAt || new Date().toISOString();
      
      const allPayables = await window.dbService.getPayables();
      const payableToUpdate = allPayables.find(p => p.id === id);
      
      if (!payableToUpdate) {
          throw new Error(`Payable with id ${id} not found in any collection`);
      }
      
      const updatedPayable = { ...payableToUpdate, ...updates };
      
      // Update in both collections and localStorage
      try {
          // 1. Update in tradePayable
          if (window.db && typeof window.db.update === 'function') {
              try {
                  await window.db.update('tradePayable', { id: id }, { $set: updates });
                  console.log(`Updated payable ${id} in tradePayable via update`);
              } catch (e) {
                  console.warn(`Error updating tradePayable/${id} via update:`, e);
                  
                  // Fallback to get/set
                  if (typeof window.db.get === 'function' && typeof window.db.set === 'function') {
                      const tradePayables = await window.db.get('tradePayable') || [];
                      const index = tradePayables.findIndex(p => p.id === id);
                      
                      if (index !== -1) {
                          tradePayables[index] = updatedPayable;
                          await window.db.set('tradePayable', tradePayables);
                          console.log(`Updated payable ${id} in tradePayable via set`);
                      }
                  }
              }
          }
          
          // 2. Update in payables
          if (window.db && typeof window.db.get === 'function' && typeof window.db.set === 'function') {
              const payables = await window.db.get('payables') || [];
              const index = payables.findIndex(p => p.id === id);
              
              if (index !== -1) {
                  payables[index] = updatedPayable;
                  await window.db.set('payables', payables);
                  console.log(`Updated payable ${id} in payables collection`);
              }
          }
          
          // 3. Update in localStorage
          try {
              // Update tradePayable in localStorage
              const storedTradePayable = localStorage.getItem('tradePayable');
              if (storedTradePayable) {
                  const tradePayables = JSON.parse(storedTradePayable);
                  const index = tradePayables.findIndex(p => p.id === id);
                  
                  if (index !== -1) {
                      tradePayables[index] = updatedPayable;
                      localStorage.setItem('tradePayable', JSON.stringify(tradePayables));
                  }
              }
              
              // Update payables in localStorage
              const storedPayables = localStorage.getItem('payables');
              if (storedPayables) {
                  const payables = JSON.parse(storedPayables);
                  const index = payables.findIndex(p => p.id === id);
                  
                  if (index !== -1) {
                      payables[index] = updatedPayable;
                      localStorage.setItem('payables', JSON.stringify(payables));
                  }
              }
          } catch (e) {
              console.warn(`Error updating payable ${id} in localStorage:`, e);
          }
      } catch (e) {
          console.error(`Error in core update operations for payable ${id}:`, e);
          throw e;
      }
      
      return updatedPayable;
  } catch (error) {
      console.error(`Error updating payable ${id}:`, error);
      throw error;
  }
};

// Enhance the getReceivables method similar to what we did with getPayables
window.dbService.getReceivables = async function() {
  try {
      let receivables = [];
      
      // First try to get from 'receivables' collection
      if (window.db && typeof window.db.get === 'function') {
          try {
              const regularReceivables = await window.db.get('receivables') || [];
              receivables = [...regularReceivables];
              console.log(`Found ${regularReceivables.length} receivables in 'receivables' collection`);
          } catch (error) {
              console.warn('Error getting from receivables collection:', error);
          }
          
          // Also try to get from 'tradeReceivable' collection
          try {
              const tradeReceivables = await window.db.get('tradeReceivable') || [];
              
              // Merge without duplicates (prefer items from 'receivables' if id clash)
              const existingIds = new Set(receivables.map(r => r.id));
              const uniqueTradeReceivables = tradeReceivables.filter(r => !existingIds.has(r.id));
              
              receivables = [...receivables, ...uniqueTradeReceivables];
              console.log(`Found ${tradeReceivables.length} receivables in 'tradeReceivable' collection, ${uniqueTradeReceivables.length} unique`);
          } catch (error) {
              console.warn('Error getting from tradeReceivable collection:', error);
          }
      }
      
      // Also check localStorage as fallback
      try {
          const storedReceivables = localStorage.getItem('receivables');
          const storedTradeReceivable = localStorage.getItem('tradeReceivable');
          
          if (storedReceivables) {
              const parsed = JSON.parse(storedReceivables);
              // Merge without duplicates
              const existingIds = new Set(receivables.map(r => r.id));
              const uniqueItems = parsed.filter(r => !existingIds.has(r.id));
              receivables = [...receivables, ...uniqueItems];
          }
          
          if (storedTradeReceivable) {
              const parsed = JSON.parse(storedTradeReceivable);
              // Merge without duplicates
              const existingIds = new Set(receivables.map(r => r.id));
              const uniqueItems = parsed.filter(r => !existingIds.has(r.id));
              receivables = [...receivables, ...uniqueItems];
          }
      } catch (error) {
          console.warn('Error checking localStorage for receivables:', error);
      }
      
      console.log(`Total unique receivables found: ${receivables.length}`);
      return receivables;
  } catch (error) {
      console.error('Error in enhanced getReceivables:', error);
      return [];
  }
};

// Enhance addReceivable to save to both collections for maximum compatibility
window.dbService.addReceivable = async function(receivable) {
  try {
      console.log('Enhanced addReceivable called with:', receivable);
      receivable.createdAt = receivable.createdAt || new Date().toISOString();
      
      // Save to both collections to ensure it appears everywhere
      if (window.db) {
          // Save to tradeReceivable collection (original)
          if (typeof window.db.insert === 'function') {
              try {
                  await window.db.insert('tradeReceivable', {...receivable});
                  console.log('Saved receivable to tradeReceivable collection');
              } catch (e) {
                  console.warn('Error saving to tradeReceivable via insert:', e);
                  // Try set instead if insert fails
                  if (typeof window.db.get === 'function' && typeof window.db.set === 'function') {
                      const tradeReceivables = await window.db.get('tradeReceivable') || [];
                      const updatedReceivables = [...tradeReceivables, receivable];
                      await window.db.set('tradeReceivable', updatedReceivables);
                      console.log('Saved receivable to tradeReceivable collection via set');
                  }
              }
          }
          
          // Also save to receivables collection (used by some functions)
          if (typeof window.db.get === 'function' && typeof window.db.set === 'function') {
              try {
                  const receivables = await window.db.get('receivables') || [];
                  const existingIndex = receivables.findIndex(r => r.id === receivable.id);
                  
                  if (existingIndex >= 0) {
                      receivables[existingIndex] = {...receivable};
                  } else {
                      receivables.push({...receivable});
                  }
                  
                  await window.db.set('receivables', receivables);
                  console.log('Saved receivable to receivables collection');
              } catch (e) {
                  console.warn('Error saving to receivables collection:', e);
              }
          }
      }
      
      // Also save to localStorage for maximum reliability
      try {
          // Update tradeReceivable in localStorage
          const storedTradeReceivable = localStorage.getItem('tradeReceivable');
          const tradeReceivables = storedTradeReceivable ? JSON.parse(storedTradeReceivable) : [];
          const tradeExistingIndex = tradeReceivables.findIndex(r => r.id === receivable.id);
          
          if (tradeExistingIndex >= 0) {
              tradeReceivables[tradeExistingIndex] = {...receivable};
          } else {
              tradeReceivables.push({...receivable});
          }
          
          localStorage.setItem('tradeReceivable', JSON.stringify(tradeReceivables));
          
          // Update receivables in localStorage
          const storedReceivables = localStorage.getItem('receivables');
          const receivables = storedReceivables ? JSON.parse(storedReceivables) : [];
          const existingIndex = receivables.findIndex(r => r.id === receivable.id);
          
          if (existingIndex >= 0) {
              receivables[existingIndex] = {...receivable};
          } else {
              receivables.push({...receivable});
          }
          
          localStorage.setItem('receivables', JSON.stringify(receivables));
      } catch (e) {
          console.warn('Error updating localStorage for receivables:', e);
      }
      
      return receivable;
  } catch (error) {
      console.error('Error in enhanced addReceivable:', error);
      throw error;
  }
};

// Update window.dbService.addReceivablePayment to use our enhanced addReceivable
window.dbService.addReceivablePayment = async function(receivable) {
  try {
      console.log('addReceivablePayment redirecting to enhanced addReceivable:', receivable);
      return await window.dbService.addReceivable(receivable);
  } catch (error) {
      console.error('Error in addReceivablePayment:', error);
      throw error;
  }
};

// Update the updateReceivable method to update both collections
window.dbService.updateReceivable = async function(id, updates) {
  try {
      console.log(`Enhanced updateReceivable called for ID: ${id}`, updates);
      updates.updatedAt = updates.updatedAt || new Date().toISOString();
      
      const allReceivables = await window.dbService.getReceivables();
      const receivableToUpdate = allReceivables.find(r => r.id === id);
      
      if (!receivableToUpdate) {
          throw new Error(`Receivable with id ${id} not found in any collection`);
      }
      
      const updatedReceivable = { ...receivableToUpdate, ...updates };
      
      // Update in both collections and localStorage
      try {
          // 1. Update in tradeReceivable
          if (window.db && typeof window.db.update === 'function') {
              try {
                  await window.db.update('tradeReceivable', { id: id }, { $set: updates });
                  console.log(`Updated receivable ${id} in tradeReceivable via update`);
              } catch (e) {
                  console.warn(`Error updating tradeReceivable/${id} via update:`, e);
                  
                  // Fallback to get/set
                  if (typeof window.db.get === 'function' && typeof window.db.set === 'function') {
                      const tradeReceivables = await window.db.get('tradeReceivable') || [];
                      const index = tradeReceivables.findIndex(r => r.id === id);
                      
                      if (index !== -1) {
                          tradeReceivables[index] = updatedReceivable;
                          await window.db.set('tradeReceivable', tradeReceivables);
                          console.log(`Updated receivable ${id} in tradeReceivable via set`);
                      }
                  }
              }
          }
          
          // 2. Update in receivables
          if (window.db && typeof window.db.get === 'function' && typeof window.db.set === 'function') {
              const receivables = await window.db.get('receivables') || [];
              const index = receivables.findIndex(r => r.id === id);
              
              if (index !== -1) {
                  receivables[index] = updatedReceivable;
                  await window.db.set('receivables', receivables);
                  console.log(`Updated receivable ${id} in receivables collection`);
              }
          }
          
          // 3. Update in localStorage
          try {
              // Update tradeReceivable in localStorage
              const storedTradeReceivable = localStorage.getItem('tradeReceivable');
              if (storedTradeReceivable) {
                  const tradeReceivables = JSON.parse(storedTradeReceivable);
                  const index = tradeReceivables.findIndex(r => r.id === id);
                  
                  if (index !== -1) {
                      tradeReceivables[index] = updatedReceivable;
                      localStorage.setItem('tradeReceivable', JSON.stringify(tradeReceivables));
                  }
              }
              
              // Update receivables in localStorage
              const storedReceivables = localStorage.getItem('receivables');
              if (storedReceivables) {
                  const receivables = JSON.parse(storedReceivables);
                  const index = receivables.findIndex(r => r.id === id);
                  
                  if (index !== -1) {
                      receivables[index] = updatedReceivable;
                      localStorage.setItem('receivables', JSON.stringify(receivables));
                  }
              }
          } catch (e) {
              console.warn(`Error updating receivable ${id} in localStorage:`, e);
          }
      } catch (e) {
          console.error(`Error in core update operations for receivable ${id}:`, e);
          throw e;
      }
      
      return updatedReceivable;
  } catch (error) {
      console.error(`Error updating receivable ${id}:`, error);
      throw error;
  }
};

// Add a synchronization method to ensure data consistency
window.dbService.syncLedgerData = async function() {
  try {
    console.log("Starting ledger data synchronization");
    
    // 1. Synchronize payables
    const allPayables = await window.dbService.getPayables();
    if (allPayables && allPayables.length > 0) {
      // Save to all storage locations
      if (window.db && typeof window.db.set === 'function') {
        await window.db.set('payables', allPayables);
        await window.db.set('tradePayable', allPayables);
      }
      localStorage.setItem('payables', JSON.stringify(allPayables));
      localStorage.setItem('tradePayable', JSON.stringify(allPayables));
      console.log(`Synchronized ${allPayables.length} payables across all storage locations`);
    }
    
    // 2. Synchronize receivables
    const allReceivables = await window.dbService.getReceivables();
    if (allReceivables && allReceivables.length > 0) {
      // Save to all storage locations
      if (window.db && typeof window.db.set === 'function') {
        await window.db.set('receivables', allReceivables);
        await window.db.set('tradeReceivable', allReceivables);
      }
      localStorage.setItem('receivables', JSON.stringify(allReceivables));
      localStorage.setItem('tradeReceivable', JSON.stringify(allReceivables));
      console.log(`Synchronized ${allReceivables.length} receivables across all storage locations`);
    }
    
    return {
      payablesCount: allPayables.length,
      receivablesCount: allReceivables.length
    };
  } catch (error) {
    console.error('Error during data synchronization:', error);
    return {
      payablesCount: 0,
      receivablesCount: 0,
      error: error.message
    };
  }
};

// Run synchronization on page load to ensure trade ledgers are up to date
document.addEventListener('DOMContentLoaded', async function() {
  // Check if we're on a trade ledger page
  const isTradePayablePage = window.location.href.includes('trade-payable-ledger');
  const isTradeReceivablePage = window.location.href.includes('trade-receivable-ledger');
  
  if (isTradePayablePage || isTradeReceivablePage) {
    console.log(`Trade ledger page detected: ${isTradePayablePage ? 'Payable' : 'Receivable'}`);
    await window.dbService.syncLedgerData();
    
    // Force reload of the ledger data after short delay to ensure tables are populated
    setTimeout(function() {
      if (isTradePayablePage && typeof loadPayables === 'function') {
        console.log('Forcing reload of payables data');
        loadPayables();
      } else if (isTradeReceivablePage && typeof loadReceivables === 'function') {
        console.log('Forcing reload of receivables data');
        loadReceivables();
      }
    }, 500);
  }
});