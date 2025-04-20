// pagination-utils.js - Reusable pagination functionality

// Create pagination and row selection controls
function createPaginationControls(options) {
    const {
      containerID,    // ID of container to render pagination controls
      totalItems,     // Total number of items
      currentPage,    // Current page number (1-based)
      pageSize,       // Number of items per page
      onPageChange,   // Callback function when page changes: (newPage) => {}
      onPageSizeChange // Callback function when page size changes: (newPageSize) => {}
    } = options;
    
    const container = document.getElementById(containerID);
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    container.className = 'flex flex-wrap items-center justify-between mt-4';
    
    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    
    // Create page size selection dropdown
    const pageSizeContainer = document.createElement('div');
    pageSizeContainer.className = 'flex items-center mb-2 md:mb-0';
    
    const pageSizeLabel = document.createElement('label');
    pageSizeLabel.className = 'text-sm text-gray-600 mr-2';
    pageSizeLabel.textContent = 'Rows per page:';
    pageSizeContainer.appendChild(pageSizeLabel);
    
    const pageSizeSelect = document.createElement('select');
    pageSizeSelect.className = 'border rounded px-2 py-1 text-sm';
    
    [10, 25, 50, 100, 200, 500].forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = size;
      option.selected = size === pageSize;
      pageSizeSelect.appendChild(option);
    });
    
    pageSizeSelect.addEventListener('change', () => {
      onPageSizeChange(parseInt(pageSizeSelect.value, 10));
    });
    
    pageSizeContainer.appendChild(pageSizeSelect);
    container.appendChild(pageSizeContainer);
    
    // Create pagination controls
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'flex items-center';
    
    // Add page info text
    const pageInfo = document.createElement('span');
    pageInfo.className = 'text-sm text-gray-600 mr-4';
    const startItem = Math.min(totalItems, (currentPage - 1) * pageSize + 1);
    const endItem = Math.min(totalItems, currentPage * pageSize);
    pageInfo.textContent = `${startItem}-${endItem} of ${totalItems}`;
    paginationContainer.appendChild(pageInfo);
    
    // Only show pagination if we have more than one page
    if (totalPages > 1) {
      // Previous button
      const prevBtn = document.createElement('button');
      prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : 'hover:bg-gray-200'}`;
      prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
      prevBtn.disabled = currentPage === 1;
      if (currentPage > 1) {
        prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
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
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : 'hover:bg-gray-200'}`;
        pageBtn.textContent = i;
        if (i !== currentPage) {
          pageBtn.addEventListener('click', () => onPageChange(i));
        }
        paginationContainer.appendChild(pageBtn);
      }
      
      // Next button
      const nextBtn = document.createElement('button');
      nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : 'hover:bg-gray-200'}`;
      nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
      nextBtn.disabled = currentPage === totalPages;
      if (currentPage < totalPages) {
        nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
      }
      paginationContainer.appendChild(nextBtn);
    }
    
    container.appendChild(paginationContainer);
  }
  
  // Create a PDF export button
  // Create a PDF export button
function createPDFExportButton(options) {
  const {
    containerID,  // ID of container to render the PDF button
    filename,     // Default filename for the PDF
    tableID,      // ID of the table to export
    title,        // Title for the PDF document
    orientation,  // 'portrait' or 'landscape'
    getPDFData,   // Optional callback function to get custom data for the PDF
    extraConfig   // Optional extra configuration for jsPDF
  } = options;
  
  const container = document.getElementById(containerID);
  if (!container) return;
  
  // Remove any existing PDF buttons to prevent duplication
  const existingButtons = container.querySelectorAll('.pdf-export-btn');
  existingButtons.forEach(btn => btn.remove());
  
  // Create PDF button
  const pdfButton = document.createElement('button');
  pdfButton.className = 'bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center text-sm pdf-export-btn';
  pdfButton.innerHTML = '<i class="fas fa-file-pdf mr-2"></i> Export PDF';
  
  pdfButton.addEventListener('click', async () => {
    try {
      // Check if jsPDF is available
      if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        console.error('jsPDF not loaded');
        window.utils.showNotification('PDF generation not available', 'error');
        return;
      }
      
      // Create new PDF document
      const { jsPDF } = jspdf;
      const doc = new jsPDF({
        orientation: orientation || 'portrait',
        unit: 'mm',
        format: 'a4',
        ...extraConfig
      });
      
      // Add title
      doc.setFontSize(16);
      doc.text(title || 'Report', 14, 20);
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
      
      if (getPDFData) {
        // Use custom PDF generation function
        await getPDFData(doc);
      } else {
        // Default: Export table using autotable
        const tableElement = document.getElementById(tableID);
        if (!tableElement) {
          throw new Error(`Table with ID ${tableID} not found`);
        }
        
        doc.autoTable({
          html: `#${tableID}`,
          startY: 35,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [59, 130, 246] },
        });
      }
      
      // Save the PDF
      doc.save(filename || 'export.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.utils.showNotification('Error generating PDF', 'error');
    }
  });
  
  container.appendChild(pdfButton);
  return pdfButton;
}