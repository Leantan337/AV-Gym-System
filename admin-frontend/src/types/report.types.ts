export interface ReportType {
  value: string;
  label: string;
}

export interface ExportFormat {
  value: 'PDF' | 'EXCEL' | 'CSV';
  label: string;
}

export interface ReportParameters {
  dateFrom?: string;
  dateTo?: string;
  memberId?: string;
  status?: string;
  paymentType?: string;
  days?: string;
  [key: string]: string | undefined;
}

export interface ReportJob {
  id: number;
  report_type: string;
  export_format: ExportFormat['value'];
  parameters: ReportParameters;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completed_at: string | null;
  file_path: string | null;
  report_type_display: string;
  export_format_display: string;
}

export interface ReportResponse {
  success: boolean;
  message: string;
  data?: ReportJob;
}
