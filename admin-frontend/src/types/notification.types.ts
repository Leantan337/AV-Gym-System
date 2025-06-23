export interface NotificationType {
  value: string;
  label: string;
  description: string;
}

export interface NotificationSchedule {
  id: string;
  notification_type: string;
  days_before_event: number;
  is_active: boolean;
  last_run: string | null;
  next_run: string | null;
}

export interface NotificationFormData {
  notification_type: string;
  days_before_event: number;
  is_active: boolean;
}

export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: unknown;
}
