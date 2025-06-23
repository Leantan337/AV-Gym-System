import { api } from './api';

const typedAdminApi = api;

export interface PaymentMethod {
  id: string;
  memberId: string;
  type: 'credit_card' | 'bank_account' | 'paypal' | 'other';
  provider: string;
  last4: string;
  expiryDate?: string;
  isDefault: boolean;
  createdAt: string;
  token?: string; // Only used when creating a new payment method
}

export interface Payment {
  id: string;
  invoiceId: string;
  memberId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  paymentDate: string;
  notes?: string;
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
}

export interface PaymentGateway {
  id: string;
  name: string;
  isActive: boolean;
  supportedMethods: string[];
  credentials: Record<string, unknown>;
}

export const paymentService = {
  // Payment Methods
  getMemberPaymentMethods: async (memberId: string): Promise<PaymentMethod[]> => {
    const response = await typedAdminApi.get<PaymentMethod[]>(`/members/${memberId}/payment-methods/`);
    return response.data;
  },

  addPaymentMethod: async (data: {
    memberId: string;
    type: string;
    provider: string;
    token: string;
    isDefault?: boolean;
  }): Promise<PaymentMethod> => {
    const response = await typedAdminApi.post<PaymentMethod>('/payment-methods/', data);
    return response.data;
  },

  updatePaymentMethod: async (id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
    const response = await typedAdminApi.patch<PaymentMethod>(`/payment-methods/${id}/`, data);
    return response.data;
  },

  deletePaymentMethod: async (id: string): Promise<void> => {
    await typedAdminApi.delete(`/payment-methods/${id}/`);
  },

  setDefaultPaymentMethod: async (id: string): Promise<PaymentMethod> => {
    const response = await typedAdminApi.post<PaymentMethod>(`/payment-methods/${id}/set-default/`, {});
    return response.data;
  },

  // Payments
  getPayments: async (filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    memberId?: string;
    invoiceId?: string;
  }): Promise<Payment[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.memberId) queryParams.append('memberId', filters.memberId);
    if (filters?.invoiceId) queryParams.append('invoiceId', filters.invoiceId);
    
    const response = await typedAdminApi.get<Payment[]>(`/payments/?${queryParams.toString()}`);
    return response.data;
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await typedAdminApi.get<Payment>(`/payments/${id}/`);
    return response.data;
  },

  getInvoicePayments: async (invoiceId: string): Promise<Payment[]> => {
    const response = await typedAdminApi.get<Payment[]>(`/invoices/${invoiceId}/payments/`);
    return response.data;
  },

  processPayment: async (data: {
    invoiceId: string;
    paymentMethodId?: string;
    amount: number;
    notes?: string;
  }): Promise<Payment> => {
    const response = await typedAdminApi.post<Payment>('/payments/process/', data);
    return response.data;
  },

  recordManualPayment: async (data: {
    invoiceId: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    notes?: string;
  }): Promise<Payment> => {
    const response = await typedAdminApi.post<Payment>('/payments/manual/', data);
    return response.data;
  },

  refundPayment: async (id: string, data: {
    amount?: number;
    reason?: string;
  }): Promise<Payment> => {
    const response = await typedAdminApi.post<Payment>(`/payments/${id}/refund/`, data);
    return response.data;
  },

  // Payment Gateways
  getPaymentGateways: async (): Promise<PaymentGateway[]> => {
    const response = await typedAdminApi.get<PaymentGateway[]>('/payment-gateways/');
    return response.data;
  },

  updatePaymentGateway: async (id: string, data: Partial<PaymentGateway>): Promise<PaymentGateway> => {
    const response = await typedAdminApi.patch<PaymentGateway>(`/payment-gateways/${id}/`, data);
    return response.data;
  },

  activatePaymentGateway: async (id: string): Promise<PaymentGateway> => {
    const response = await typedAdminApi.post<PaymentGateway>(`/payment-gateways/${id}/activate/`, {});
    return response.data;
  },

  deactivatePaymentGateway: async (id: string): Promise<PaymentGateway> => {
    const response = await typedAdminApi.post<PaymentGateway>(`/payment-gateways/${id}/deactivate/`, {});
    return response.data;
  },

  testPaymentGateway: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await typedAdminApi.post<{ success: boolean; message: string }>(`/payment-gateways/${id}/test/`, {});
    return response.data;
  },

  // Payment Analytics
  getPaymentAnalytics: async (period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    refundedAmount: number;
    paymentsByDay: Array<{ date: string; amount: number }>;
    paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>;
  }> => {
    const response = await typedAdminApi.get<{
      totalAmount: number;
      successfulPayments: number;
      failedPayments: number;
      refundedAmount: number;
      paymentsByDay: Array<{ date: string; amount: number }>;
      paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>;
    }>(`/payments/analytics/?period=${period}`);
    return response.data;
  },
};
