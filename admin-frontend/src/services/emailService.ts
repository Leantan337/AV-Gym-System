import { api } from './api';
import emailConfig from '../config/emailConfig';

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

export interface EmailConfig {
  provider: string;
  host: string;
  port: number;
  username: string;
  apiKey?: string;
  secure: boolean;
  fromEmail: string;
  fromName: string;
  enableTestMode: boolean;
}

export interface SMTPTestResult {
  success: boolean;
  message: string;
  timestamp: string;
}

export interface BulkEmailParams {
  templateId: string;
  recipientIds: string[];
  data?: Record<string, unknown>;
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

// Current email configuration
let currentEmailConfig: EmailConfig = emailConfig;

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
  // Email Configuration
  getEmailConfig: async (): Promise<EmailConfig> => {
    try {
      // First try to get from the server, fallback to local config
      const response = await api.get<EmailConfig>('/email/config/');
      return response.data;
    } catch (error) {
      console.warn('Failed to load email config from server, using local config', error);
      return currentEmailConfig;
    }
  },
  
  updateEmailConfig: async (config: Partial<EmailConfig>): Promise<EmailConfig> => {
    try {
      // Update on the server
      const response = await api.post<EmailConfig>('/email/config/', config);
      // Update local cache
      currentEmailConfig = { ...currentEmailConfig, ...response.data };
      return response.data;
    } catch (error) {
      console.error('Failed to update email configuration', error);
      throw error;
    }
  },
  
  testSMTPConnection: async (): Promise<SMTPTestResult> => {
    try {
      const response = await api.post<SMTPTestResult>('/email/test-connection/');
      return response.data;
    } catch (error) {
      console.error('SMTP test failed', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  },
  
  // DNS Record Validation
  validateDNSRecords: async (domain: string): Promise<{
    spf: { valid: boolean; record?: string; error?: string };
    dkim: { valid: boolean; record?: string; error?: string };
    dmarc: { valid: boolean; record?: string; error?: string };
  }> => {
    try {
      const response = await api.post('/email/validate-dns/', { domain });
      return response.data;
    } catch (error) {
      console.error('DNS validation failed', error);
      return {
        spf: { valid: false, error: 'DNS validation request failed' },
        dkim: { valid: false, error: 'DNS validation request failed' },
        dmarc: { valid: false, error: 'DNS validation request failed' },
      };
    }
  },
};
