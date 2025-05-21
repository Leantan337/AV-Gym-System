import axios from 'axios';
import { memberApi, MemberCreateUpdate, MemberResponse } from './memberApi';

export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  status: string;
  phone: string;
  address: string;
  membership_number: string;
  image_url?: string;
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
    const response = await api.get<Member[]>(`/members/search/?q=${encodeURIComponent(query)}`);
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
    const response = await api.post('/token/', { username, password });
    return response.data;
  },

  refreshToken: async (refresh: string) => {
    const response = await api.post('/token/refresh/', { refresh });
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
    const response = await api.post('/members/bulk_action/', {
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
    const response = await api.post('/invoices/bulk_action/', {
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
