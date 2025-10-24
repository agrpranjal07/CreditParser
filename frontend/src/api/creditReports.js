import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          throw new Error(data.message || 'Bad request');
        case 401:
          throw new Error('Unauthorized access');
        case 403:
          throw new Error('Access forbidden');
        case 404:
          throw new Error('Resource not found');
        case 409:
          throw new Error(data.message || 'Resource already exists');
        case 422:
          throw new Error(data.message || 'Invalid data provided');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(data.message || 'An error occurred');
      }
    } else if (error.request) {
      // Network error
      throw new Error('Network error. Please check your connection.');
    } else {
      // Other error
      throw new Error('An unexpected error occurred');
    }
  }
);

/**
 * Upload XML credit report file
 * @param {File} file - XML file to upload
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<Object>} Upload response
 */
export const uploadReport = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  return response.data;
};

/**
 * Get all credit reports with pagination
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Reports list response
 */
export const getReports = async (page = 1, limit = 10) => {
  const response = await api.get('/reports', {
    params: { page, limit },
  });
  return response.data;
};

/**
 * Get specific credit report by ID
 * @param {string} id - Report ID
 * @returns {Promise<Object>} Report details response
 */
export const getReport = async (id) => {
  const response = await api.get(`/reports/${id}`);
  return response.data;
};

/**
 * Delete credit report by ID
 * @param {string} id - Report ID
 * @returns {Promise<Object>} Deletion response
 */
export const deleteReport = async (id) => {
  const response = await api.delete(`/reports/${id}`);
  return response.data;
};

/**
 * Get credit reports statistics
 * @returns {Promise<Object>} Statistics response
 */
export const getReportStats = async () => {
  const response = await api.get('/reports/stats');
  return response.data;
};

/**
 * Check API health
 * @returns {Promise<Object>} Health check response
 */
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
