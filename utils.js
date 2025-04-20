// utils.js - Utility functions for the inventory system

// Format number as currency
function formatCurrency(amount, currency = '₹') {
    return `${currency}${parseFloat(amount || 0).toFixed(2)}`;
  }
  
  // Format date to locale string
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  // Check if a date is overdue
  function isOverdue(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    return date < today;
  }
  
  // Generate a unique ID
  function generateId(prefix = 'ID') {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}${randomStr}`;
  }
  
  // Deep clone an object
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  
  // Display a notification
  function showNotification(message, type = 'success', duration = 3000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-yellow-500 text-white'
    }`;
    notification.textContent = message;
    notification.style.opacity = '1';
    notification.style.transition = 'opacity 0.5s ease';
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after duration
    setTimeout(() => {
      notification.style.opacity = '0';
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, duration);
  }
  
  // Validate a form field
  function validateField(field, validator, errorMessage) {
    const isValid = validator(field.value);
    
    if (!isValid) {
      field.classList.add('border-red-500');
      
      // Check if error message exists
      let errorEl = field.nextElementSibling;
      if (!errorEl || !errorEl.classList.contains('error-message')) {
        errorEl = document.createElement('p');
        errorEl.className = 'text-red-500 text-xs mt-1 error-message';
        field.parentNode.insertBefore(errorEl, field.nextElementSibling);
      }
      
      errorEl.textContent = errorMessage;
    } else {
      field.classList.remove('border-red-500');
      
      // Remove error message if it exists
      const errorEl = field.nextElementSibling;
      if (errorEl && errorEl.classList.contains('error-message')) {
        errorEl.remove();
      }
    }
    
    return isValid;
  }
  
  // Export data to CSV
  function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      console.error('No data to export');
      return;
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(item => {
      const row = headers.map(header => {
        // Wrap in quotes and escape any quotes inside
        const cell = item[header] !== undefined && item[header] !== null ? item[header] + '' : ''; // Convert to string
        return `"${cell.replace(/"/g, '""')}"`;
      }).join(',');
      
      csvContent += row + '\n';
    });
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create link and click it
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename || 'export.csv');
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Get today's date in YYYY-MM-DD format
  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  
  // Get a date N days ago in YYYY-MM-DD format
  function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
  
  // Make utils available globally
  window.utils = {
    formatCurrency,
    formatDate,
    isOverdue,
    generateId,
    deepClone,
    showNotification,
    validateField,
    exportToCSV,
    getTodayDate,
    getDateDaysAgo
  };