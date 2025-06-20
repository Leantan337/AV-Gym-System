import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export interface UseApiErrorReturn {
  error: ApiError | null;
  setError: (error: ApiError | null) => void;
  clearError: () => void;
  handleApiError: (error: unknown) => void;
  isNetworkError: boolean;
  isAuthError: boolean;
  isServerError: boolean;
  isClientError: boolean;
}

export const useApiError = (): UseApiErrorReturn => {
  const [error, setError] = useState<ApiError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiError = useCallback((error: unknown) => {
    console.error('API Error:', error);

    if (error instanceof AxiosError) {
      // Handle Axios errors
      const status = error.response?.status;
      const data = error.response?.data;
      
      let message = 'An unexpected error occurred';
      let code = error.code;
      let details = data;

      // Handle different types of errors
      if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
        message = 'Unable to connect to the server. Please check your internet connection and try again.';
        code = 'NETWORK_ERROR';
      } else if (status !== undefined && status === 401) {
        message = 'Your session has expired. Please log in again.';
        code = 'UNAUTHORIZED';
      } else if (status !== undefined && status === 403) {
        message = 'You do not have permission to perform this action.';
        code = 'FORBIDDEN';
      } else if (status !== undefined && status === 404) {
        message = 'The requested resource was not found.';
        code = 'NOT_FOUND';
      } else if (status !== undefined && status === 422) {
        message = 'The provided data is invalid. Please check your input and try again.';
        code = 'VALIDATION_ERROR';
        details = data;
      } else if (status !== undefined && status === 429) {
        message = 'Too many requests. Please wait a moment and try again.';
        code = 'RATE_LIMITED';
      } else if (status !== undefined && status >= 500) {
        message = 'Server error. Please try again later or contact support if the problem persists.';
        code = 'SERVER_ERROR';
      } else if (data?.message) {
        message = data.message;
      } else if (data?.detail) {
        message = data.detail;
      } else if (error.message) {
        message = error.message;
      }

      setError({
        message,
        status,
        code,
        details
      });
    } else if (error instanceof Error) {
      // Handle generic JavaScript errors
      setError({
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      });
    } else if (typeof error === 'string') {
      // Handle string errors
      setError({
        message: error,
        code: 'STRING_ERROR'
      });
    } else {
      // Handle unknown errors
      setError({
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        details: error
      });
    }
  }, []);

  const isNetworkError = error?.code === 'NETWORK_ERROR' || error?.code === 'ERR_NETWORK';
  const isAuthError = error?.status === 401 || error?.status === 403;
  const isServerError = error?.status ? error.status >= 500 : false;
  const isClientError = error?.status ? error.status >= 400 && error.status < 500 : false;

  return {
    error,
    setError,
    clearError,
    handleApiError,
    isNetworkError,
    isAuthError,
    isServerError,
    isClientError
  };
};

// Utility function to extract validation errors from API response
export const extractValidationErrors = (error: ApiError): Record<string, string[]> => {
  if (error.details && typeof error.details === 'object') {
    const validationErrors: Record<string, string[]> = {};
    
    Object.entries(error.details).forEach(([field, messages]) => {
      if (Array.isArray(messages)) {
        validationErrors[field] = messages.map(msg => String(msg));
      } else if (typeof messages === 'string') {
        validationErrors[field] = [messages];
      }
    });
    
    return validationErrors;
  }
  
  return {};
};

// Utility function to format error message for display
export const formatErrorMessage = (error: ApiError): string => {
  if (error.details && typeof error.details === 'object') {
    // Handle validation errors
    const validationErrors = extractValidationErrors(error);
    const errorMessages = Object.values(validationErrors).flat();
    
    if (errorMessages.length > 0) {
      return errorMessages.join(', ');
    }
  }
  
  return error.message;
}; 