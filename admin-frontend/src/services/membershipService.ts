import { api } from './api';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in days
  billingFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  features: string[];
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipSubscription {
  id: string;
  memberId: string;
  memberName: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  autoRenew: boolean;
  lastBillingDate: string;
  nextBillingDate: string;
}

export const membershipService = {
  // Membership Plans
  getPlans: async (): Promise<MembershipPlan[]> => {
    const response = await api.get<MembershipPlan[]>('/membership-plans/');
    return response.data;
  },

  getPlan: async (id: string): Promise<MembershipPlan> => {
    const response = await api.get<MembershipPlan>(`/membership-plans/${id}/`);
    return response.data;
  },

  createPlan: async (data: Omit<MembershipPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<MembershipPlan> => {
    const response = await api.post<MembershipPlan>('/membership-plans/', data);
    return response.data;
  },

  updatePlan: async (id: string, data: Partial<MembershipPlan>): Promise<MembershipPlan> => {
    const response = await api.patch<MembershipPlan>(`/membership-plans/${id}/`, data);
    return response.data;
  },

  deletePlan: async (id: string): Promise<void> => {
    await api.delete(`/membership-plans/${id}/`);
  },

  // Subscriptions
  getMemberSubscriptions: async (memberId: string): Promise<MembershipSubscription[]> => {
    const response = await api.get<MembershipSubscription[]>(`/members/${memberId}/subscriptions/`);
    return response.data;
  },

  getActiveSubscriptions: async (): Promise<MembershipSubscription[]> => {
    const response = await api.get<MembershipSubscription[]>('/subscriptions/?status=active');
    return response.data;
  },

  getExpiringSubscriptions: async (days = 7): Promise<MembershipSubscription[]> => {
    const response = await api.get<MembershipSubscription[]>(`/subscriptions/expiring/?days=${days}`);
    return response.data;
  },

  // Subscription Management
  createSubscription: async (data: {
    memberId: string;
    planId: string;
    startDate: string;
    autoRenew: boolean;
  }): Promise<MembershipSubscription> => {
    const response = await api.post<MembershipSubscription>('/subscriptions/', data);
    return response.data;
  },

  updateSubscription: async (id: string, data: Partial<MembershipSubscription>): Promise<MembershipSubscription> => {
    const response = await api.patch<MembershipSubscription>(`/subscriptions/${id}/`, data);
    return response.data;
  },

  cancelSubscription: async (id: string): Promise<MembershipSubscription> => {
    const response = await api.post<MembershipSubscription>(`/subscriptions/${id}/cancel/`, {});
    return response.data;
  },

  renewSubscription: async (id: string): Promise<MembershipSubscription> => {
    const response = await api.post<MembershipSubscription>(`/subscriptions/${id}/renew/`, {});
    return response.data;
  },

  // Automatic Billing
  generateInvoicesForDueSubscriptions: async (): Promise<{ count: number }> => {
    const response = await api.post<{ count: number }>('/invoices/generate-due/', {});
    return response.data;
  },

  getAutoBillingStatus: async (): Promise<{ enabled: boolean; lastRun: string; nextRun: string }> => {
    const response = await api.get<{ enabled: boolean; lastRun: string; nextRun: string }>('/billing/status/');
    return response.data;
  },

  toggleAutoBilling: async (enabled: boolean): Promise<{ enabled: boolean }> => {
    const response = await api.post<{ enabled: boolean }>('/billing/toggle/', { enabled });
    return response.data;
  },
};
