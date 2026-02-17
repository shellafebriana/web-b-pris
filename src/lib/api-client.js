/**
 * API Client with axios
 * - Automatically add JWT token ke setiap request
 * - Handle error responses
 * - Support interceptors
 */
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: include cookies di setiap request
});

// Request Interceptor - Add JWT token ke header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - Handle error & token expiry
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401) {
      // Clear user data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        // Redirect ke login
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden (no permission)
    if (error.response?.status === 403) {
      console.error('Access Forbidden:', error.response.data);
    }

    return Promise.reject(error);
  }
);

/**
 * Helper methods
 */
export const api = {
  // Auth
  login: (username, password) =>
    apiClient.post('/auth/login', { username, password }),

  // AppConfig
//   getAppConfig: (params) => apiClient.get('/app-config', { params }),
//   getAppConfigById: (id) => apiClient.get(`/app-config/${id}`),
//   createAppConfig: (data) => apiClient.post('/app-config', data),
//   updateAppConfig: (id, data) => apiClient.put(`/app-config/${id}`, data),
//   deleteAppConfig: (id) => apiClient.delete(`/app-config/${id}`),

  // ReportFormat
  getReportFormats: (params) => apiClient.get('/report-format', { params }),
  getReportFormatById: (id) => apiClient.get(`/report-format/${id}`),
  createReportFormat: (data) => apiClient.post('/report-format', data),
  updateReportFormat: (id, data) => apiClient.put(`/report-format/${id}`, data),
  deleteReportFormat: (id) => apiClient.delete(`/report-format/${id}`),

  // RekapSession
  getSessions: (params) => apiClient.get('/rekap-session', { params }),
  getSessionById: (id) => apiClient.get(`/rekap-session/${id}`),
  createSession: (data) => apiClient.post('/rekap-session', data),
  updateSession: (id, data) => apiClient.put(`/rekap-session/${id}`, data),
  deleteSession: (id) => apiClient.delete(`/rekap-session/${id}`),

  // Links
//   getLinks: (params) => apiClient.get('/links', { params }),
//   getLinkById: (id) => apiClient.get(`/links/${id}`),
//   createLink: (data) => apiClient.post('/links', data),
//   updateLink: (id, data) => apiClient.put(`/links/${id}`, data),
//   deleteLink: (id) => apiClient.delete(`/links/${id}`),

  // Platform
  getPlatforms: (params) => apiClient.get('/platform', { params }),
  getPlatformById: (id) => apiClient.get(`/platform/${id}`),
  createPlatform: (data) => apiClient.post('/platform', data),
  updatePlatform: (id, data) => apiClient.put(`/platform/${id}`, data),
  deletePlatform: (id) => apiClient.delete(`/platform/${id}`),

  // Unit
  getUnits: (params) => apiClient.get('/unit', { params }),
  getUnitById: (id) => apiClient.get(`/unit/${id}`),
  createUnit: (data) => apiClient.post('/unit', data),
  updateUnit: (id, data) => apiClient.put(`/unit/${id}`, data),
  deleteUnit: (id) => apiClient.delete(`/unit/${id}`),

  // PriorityLink
  getPriorityLinks: (params) => apiClient.get('/priority-link', { params }),
  getPriorityLinkById: (id) => apiClient.get(`/priority-link/${id}`),
  createPriorityLink: (data) => apiClient.post('/priority-link', data),
  updatePriorityLink: (id, data) => apiClient.put(`/priority-link/${id}`, data),
  deletePriorityLink: (id) => apiClient.delete(`/priority-link/${id}`),

  // Dashboard
  getDashboardStats: () =>
    apiClient.get('/dashboard/today-stats'),
  getDashboardUnitRanking: () =>
    apiClient.get('/dashboard/unit-ranking'),
  getDashboardPlatformRanking: () =>
    apiClient.get('/dashboard/platform-ranking'),
  getDashboardHeatMap: () =>
    apiClient.get('/dashboard/heatmap-calendar'),
  getDashboardWeeklyTrend: () =>
    apiClient.get('/dashboard/weekly-trend'),
};

export default apiClient;