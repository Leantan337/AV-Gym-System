import axios from 'axios';

const api = axios.create({
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
  status: 'active' | 'inactive';
  phone: string;
  address: string;
}

export interface Invoice {
  id: string;
  member: string;
  amount: number;
  status: 'paid' | 'pending';
  due_date: string;
}

export const adminApi = {
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
