import { useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: Date;
}

export interface UseNotificationReturn {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  success: (title: string, message?: string, options?: Partial<Notification>) => void;
  error: (title: string, message?: string, options?: Partial<Notification>) => void;
  warning: (title: string, message?: string, options?: Partial<Notification>) => void;
  info: (title: string, message?: string, options?: Partial<Notification>) => void;
}

export const useNotification = (): UseNotificationReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? (notification.type === 'error' ? 0 : 5000) // Errors don't auto-dismiss
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration (if not 0)
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const success = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    addNotification({
      type: 'success',
      title,
      message: message || 'Operation completed successfully',
      ...options
    });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    addNotification({
      type: 'error',
      title,
      message: message || 'An error occurred',
      ...options
    });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    addNotification({
      type: 'warning',
      title,
      message: message || 'Please review the information',
      ...options
    });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    addNotification({
      type: 'info',
      title,
      message: message || 'Information',
      ...options
    });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    success,
    error,
    warning,
    info
  };
};

// Utility function to create notification from API error
export const createNotificationFromError = (error: unknown, title?: string): Omit<Notification, 'id' | 'timestamp'> => {
  let errorTitle = title || 'Error';
  let errorMessage = 'An unexpected error occurred';

  if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object') {
    const response = (error as { response: unknown }).response as {
      data?: { message?: string; detail?: string };
      status?: number;
    };
    if (response.data?.message) {
      errorMessage = response.data.message;
    } else if (response.data?.detail) {
      errorMessage = response.data.detail;
    }
    if (response.status === 401) {
      errorTitle = 'Authentication Error';
      errorMessage = 'Your session has expired. Please log in again.';
    } else if (response.status === 403) {
      errorTitle = 'Permission Denied';
      errorMessage = 'You do not have permission to perform this action.';
    } else if (response.status === 404) {
      errorTitle = 'Not Found';
      errorMessage = 'The requested resource was not found.';
    } else if (response.status === 422) {
      errorTitle = 'Validation Error';
      errorMessage = 'Please check your input and try again.';
    } else if (response.status && response.status >= 500) {
      errorTitle = 'Server Error';
      errorMessage = 'Server error. Please try again later.';
    }
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = (error as { message?: string }).message || errorMessage;
  }

  return {
    type: 'error',
    title: errorTitle,
    message: errorMessage,
    duration: 0 // Don't auto-dismiss errors
  };
}; 