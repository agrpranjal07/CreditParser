/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format credit score with color coding
 * @param {number} score - Credit score
 * @returns {Object} Score data with color
 */
export const formatCreditScore = (score) => {
  if (!score || score === 0) {
    return { score: 'N/A', color: 'text-gray-500', bgColor: 'bg-gray-100' };
  }

  if (score >= 750) {
    return { score, color: 'text-green-700', bgColor: 'bg-green-100' };
  } else if (score >= 650) {
    return { score, color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
  } else {
    return { score, color: 'text-red-700', bgColor: 'bg-red-100' };
  }
};

/**
 * Get account status badge styling
 * @param {string} status - Account status
 * @returns {Object} Badge styling classes
 */
export const getAccountStatusBadge = (status) => {
  const statusLower = status?.toLowerCase() || '';
  
  if (statusLower.includes('active') || statusLower.includes('current')) {
    return {
      text: 'Active',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    };
  } else if (statusLower.includes('closed')) {
    return {
      text: 'Closed',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
    };
  } else if (statusLower.includes('settled')) {
    return {
      text: 'Settled',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
    };
  } else if (statusLower.includes('written')) {
    return {
      text: 'Written Off',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
    };
  } else {
    return {
      text: status || 'Unknown',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
    };
  }
};

/**
 * Validate file type and size
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
export const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['application/xml', 'text/xml'];
  const allowedExtensions = ['.xml'];

  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size must be less than 10MB' };
  }

  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: 'Only XML files are allowed' };
  }

  if (!allowedTypes.includes(file.type) && file.type !== 'application/octet-stream') {
    return { isValid: false, error: 'Invalid file type. Please select an XML file' };
  }

  return { isValid: true, error: null };
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Calculate account health score
 * @param {Object} account - Account object
 * @returns {Object} Health score with color
 */
export const calculateAccountHealth = (account) => {
  const { amountOverdue = 0, currentBalance = 0, status } = account;
  
  if (status?.toLowerCase().includes('closed')) {
    return { score: 'Closed', color: 'text-gray-600' };
  }
  
  if (amountOverdue > 0) {
    return { score: 'Poor', color: 'text-red-600' };
  }
  
  if (currentBalance === 0) {
    return { score: 'Excellent', color: 'text-green-600' };
  }
  
  return { score: 'Good', color: 'text-yellow-600' };
};

/**
 * Download file from URL
 * @param {string} url - File URL
 * @param {string} filename - Desired filename
 */
export const downloadFile = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Get credit score color
 * @param {number} score - Credit score
 * @returns {string} CSS color class
 */
export const getCreditScoreColor = (score) => {
  const numScore = Number(score);
  if (!numScore || numScore <= 0) return 'text-gray-600';
  
  if (numScore >= 750) return 'text-green-600';
  if (numScore >= 700) return 'text-blue-600';
  if (numScore >= 650) return 'text-yellow-600';
  if (numScore >= 600) return 'text-orange-600';
  return 'text-red-600';
};

/**
 * Get account status color
 * @param {string} status - Account status
 * @returns {string} CSS color classes
 */
export const getAccountStatusColor = (status) => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
  const statusLower = status.toLowerCase();
  
  if (status === 'Active') return 'bg-green-100 text-green-800';
  if (status === 'Active - Standard') return 'bg-blue-100 text-blue-800';
  if (status === 'Active - Irregular') return 'bg-yellow-100 text-yellow-800';
  if (statusLower.includes('doubtful') || statusLower.includes('loss') || statusLower.includes('written off')) {
    return 'bg-red-100 text-red-800';
  }
  if (statusLower.includes('closed')) return 'bg-gray-100 text-gray-800';
  
  return 'bg-gray-100 text-gray-800';
};

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};
