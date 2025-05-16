import { api } from './api';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  type: 'invoice' | 'receipt' | 'reminder' | 'welcome' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded content
    contentType: string;
  }>;
}

export interface BulkEmailParams {
  templateId: string;
  recipientIds: string[];
  data?: Record<string, any>;
  includeAttachments?: boolean;
}

export interface EmailStatus {
  id: string;
  recipient: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string | null;
  error?: string;
}

export const emailService = {
  // Email Templates
  getTemplates: async (): Promise<EmailTemplate[]> => {
    const response = await api.get<EmailTemplate[]>('/email-templates/');
    return response.data;
  },

  getTemplatesByType: async (type: EmailTemplate['type']): Promise<EmailTemplate[]> => {
    const response = await api.get<EmailTemplate[]>(`/email-templates/?type=${type}`);
    return response.data;
  },

  getTemplate: async (id: string): Promise<EmailTemplate> => {
    const response = await api.get<EmailTemplate>(`/email-templates/${id}/`);
    return response.data;
  },

  createTemplate: async (data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> => {
    const response = await api.post<EmailTemplate>('/email-templates/', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
    const response = await api.patch<EmailTemplate>(`/email-templates/${id}/`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/email-templates/${id}/`);
  },

  // Sending Emails
  sendEmail: async (params: SendEmailParams): Promise<EmailStatus> => {
    const response = await api.post<EmailStatus>('/emails/send/', params);
    return response.data;
  },

  sendInvoice: async (invoiceId: string, recipientEmail?: string): Promise<EmailStatus> => {
    const response = await api.post<EmailStatus>(`/invoices/${invoiceId}/send/`, {
      recipientEmail, // Optional override
    });
    return response.data;
  },
  
  sendBulkEmails: async (params: BulkEmailParams): Promise<{ successful: number; failed: number }> => {
    const response = await api.post<{ successful: number; failed: number }>('/emails/send-bulk/', params);
    return response.data;
  },

  // Email History
  getEmailHistory: async (filters?: {
    status?: EmailStatus['status'];
    startDate?: string;
    endDate?: string;
    recipientId?: string;
  }): Promise<EmailStatus[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.recipientId) queryParams.append('recipientId', filters.recipientId);
    
    const response = await api.get<EmailStatus[]>(`/emails/history/?${queryParams.toString()}`);
    return response.data;
  },

  resendEmail: async (emailId: string): Promise<EmailStatus> => {
    const response = await api.post<EmailStatus>(`/emails/${emailId}/resend/`, {});
    return response.data;
  },
};
