export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  content: string; // HTML template with variables
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  memberId: string;
  member: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  templateId: string;
}

export interface CreateInvoiceData {
  memberId: string;
  items: Omit<InvoiceItem, 'total'>[];
  dueDate: string;
  notes?: string;
  templateId: string;
}

export interface UpdateInvoiceData {
  items?: Omit<InvoiceItem, 'total'>[];
  dueDate?: string;
  notes?: string;
  templateId?: string;
  status?: Invoice['status'];
}

export interface InvoiceFilters {
  search?: string;
  status?: Invoice['status'] | 'all';
  dateRange?: 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  totalCount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}
