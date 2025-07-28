import axios from 'axios';
import { memberApi } from './memberApi';
import { applySecurityHeaders, checkRateLimit, sanitizeInput } from '../utils/security';

// Determine API URL based on environment
const getApiBaseUrl = () => {
  // Use environment variable if set, otherwise default to Django's development server
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
  // Ensure the base URL ends with /api/ to match Django URL structure
  return baseUrl.endsWith('/api/') ? baseUrl : `${baseUrl}/api/`;
}; 

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Required for cookies/sessions and CORS with credentials
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  timeout: 10000, // 10 second timeout
});

// Add token to requests and apply security headers
api.interceptors.request.use((config) => {
  // Apply token authentication if token exists
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add CSRF token for non-GET requests
  if (config.method !== 'get') {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  
  // Apply additional security headers - using type assertion to fix TS error
  const secureConfig = applySecurityHeaders(config);
  Object.keys(secureConfig.headers || {}).forEach(key => {
    if (secureConfig.headers && key) {
      config.headers[key] = secureConfig.headers[key];
    }
  });
  
  // Rate limiting check for sensitive operations
  const endpoint = config.url || '';
  const isSensitiveEndpoint = endpoint.includes('auth') || 
                            endpoint.includes('admin') || 
                            config.method !== 'get';
  
  if (isSensitiveEndpoint && !checkRateLimit(endpoint)) {
    return Promise.reject(new Error('Rate limit exceeded. Please try again later.'));
  }
  
  return config;
});

// Helper function to get cookie by name
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Response interceptor for handling CORS and other errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle CORS errors
    if (error.message === 'Network Error' && !originalRequest._retry) {
      console.error('Network Error - Possible CORS issue');
      // You might want to redirect to an error page or show a user-friendly message
      return Promise.reject(new Error('Unable to connect to the server. Please check your connection and try again.'));
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Handle token refresh or redirect to login
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${getApiBaseUrl()}auth/token/refresh/`, 
            { refresh: refreshToken },
            { withCredentials: true }
          );
          
          const { access } = response.data;
          localStorage.setItem('token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          
          return api(originalRequest);
        }
      } catch (error) {
        // If refresh fails, clear auth and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    // Handle CORS and CSP errors more gracefully
    if (error.message === 'Network Error') {
      console.error('Network error - possible CORS issue:', error);
    }
    
    // Handle rate limiting (429 Too Many Requests)
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Please try again later.');
    }
    
    // Log other server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.status, error.message);
    }
    
    return Promise.reject(error);
  }
);

export interface DashboardStats {
  members: {
    total: number;
    active: number;
    new_today: number;
  };
  subscriptions: {
    active: number;
    expiring_soon: number;
  };
  finance: {
    today_revenue: number;
    pending_payments: number;
  };
  checkins: {
    today: number;
    current: number;
  };
}

export interface Member {
  id: string;
  full_name: string;
  status: 'active' | 'inactive';
  phone: string;
  address: string;
  membership_number: string;
  image_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface MemberSearchResult {
  id: string;
  fullName: string;
  membershipNumber: string;
}

export interface Invoice {
  id: string;
  member: string;
  amount: number;
  status: 'paid' | 'pending';
  due_date: string;
}

export interface CheckIn {
  id: string;
  member: {
    id: string;
    fullName: string;
  };
  checkInTime: string;
  checkOutTime: string | null;
}

export interface CheckInStats {
  currentlyIn: number;
  todayTotal: number;
  averageStayMinutes: number;
}

export interface CheckInFilters {
  search?: string;
  status?: 'all' | 'in' | 'out';
  dateRange?: 'today' | 'yesterday' | 'week' | 'all';
  page?: number;
  perPage?: number;
}

export interface CheckInResponse {
  checkIns: CheckIn[];
  totalCount: number;
}

// Member API types and functions are now imported at the top

export const adminApi = {
  // Search
  searchMembers: async (query: string): Promise<MemberSearchResult[]> => {
    // Sanitize input to prevent injection attacks
    const sanitizedQuery = sanitizeInput(query);
    const response = await api.get<Member[]>(`/members/search/?q=${encodeURIComponent(sanitizedQuery)}`);
    return response.data.map(member => ({
      id: member.id,
      fullName: member.full_name,
      membershipNumber: member.membership_number,
    }));
  },
  
  // Member Management Extensions
  createMember: memberApi.createMember,
  updateMember: memberApi.updateMember,
  deleteMember: memberApi.deleteMember,
  uploadMemberPhoto: memberApi.uploadMemberPhoto,
  deleteMemberPhoto: memberApi.deleteMemberPhoto,
  getMemberCheckIns: memberApi.getMemberCheckIns,
  getMemberPayments: memberApi.getMemberPayments,
  

  // Check-ins
  getCheckIns: async (filters: CheckInFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('q', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.perPage) params.append('perPage', filters.perPage.toString());

    const response = await api.get<CheckInResponse>(`/check-ins/?${params.toString()}`);
    return response.data;
  },

  getCheckInStats: async () => {
    const response = await api.get<CheckInStats>('/checkins/stats/');
    return response.data;
  },

  checkInMember: async ({ memberId }: { memberId: string }) => {
    const response = await api.post('/checkins/', { member: memberId });
    return response.data;
  },

  getCheckInHistory: async (filters: CheckInFilters = {}): Promise<CheckInResponse> => {
    const params = new URLSearchParams();
    if (filters.search) params.append('q', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.dateRange) params.append('dateRange', filters.dateRange);
    if (filters.page !== undefined) params.append('page', filters.page.toString());
    if (filters.perPage) params.append('perPage', filters.perPage.toString());

    const response = await api.get<CheckInResponse>(`/check-ins/history/?${params.toString()}`);
    return response.data;
  },

  checkOutMember: async ({ checkInId }: { checkInId: string }) => {
    const response = await api.post(`/check-ins/${checkInId}/check-out`);
    return response.data;
  },

  // Auth
  login: async (username: string, password: string) => {
    const response = await api.post('/api/auth/token/', { username, password });
    localStorage.setItem('token', response.data.access);
    localStorage.setItem('refreshToken', response.data.refresh);
    return response.data;
  },

  refreshToken: async (refresh: string) => {
    const response = await api.post('/api/auth/token/refresh/', { refresh });
    if (response.data.access) {
      localStorage.setItem('token', response.data.access);
    }
    return response.data;
  },

  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get<DashboardStats>('/admin/stats/');
    return response.data;
  },

  // Members
  getMembers: async () => {
    const response = await api.get<Member[]>('/members/');
    return response.data;
  },
  
  getMemberById: async (id: string) => {
    const response = await api.get<Member>(`/api/members/${id}/`);
    return response.data;
  },

  getMemberStats: async (memberId: string) => {
    const response = await api.get(`/admin/member-stats/?member_id=${memberId}`);
    return response.data;
  },

  bulkMemberAction: async (action: 'activate' | 'deactivate', memberIds: string[]) => {
    const response = await api.post('/admin/bulk-member-action/', {
      action,
      member_ids: memberIds,
    });
    return response.data;
  },
  
  downloadIdCard: async (memberId: string) => {
    try {
      const response = await api.get(`/members/${memberId}/id_card/`, {
        responseType: 'blob',
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `id_card_${memberId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading ID card:', error);
      throw error;
    }
  },

  // Invoices
  getInvoices: async () => {
    const response = await api.get<Invoice[]>('/invoices/');
    return response.data;
  },

  bulkInvoiceAction: async (action: 'mark_paid' | 'mark_pending', invoiceIds: string[]) => {
    const response = await api.post('/admin/bulk-invoice-action/', {
      action,
      invoice_ids: invoiceIds,
    });
    return response.data;
  },
};

// Export individual functions for direct use
export const getCheckIns = adminApi.getCheckIns;
export const checkInMember = adminApi.checkInMember;
export const checkOutMember = adminApi.checkOutMember;
export const getCheckInStats = adminApi.getCheckInStats;
export const getCheckInHistory = adminApi.getCheckInHistory;
export const searchMembers = adminApi.searchMembers;
