/**
 * Security utilities for the AV-Gym-System frontend
 * Handles input sanitization, XSS protection, and other security concerns
 */

import DOMPurify from 'dompurify';
import { AxiosRequestConfig } from 'axios';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html HTML content to be sanitized
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};

/**
 * Sanitize user input for forms
 * @param input User input to be sanitized
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  // Basic input sanitization to prevent script injection
  return input.replace(/[<>]/g, '');
};

/**
 * Apply security headers to API requests
 * @param config Axios request configuration
 * @returns Updated configuration with security headers
 */
export const applySecurityHeaders = (config: AxiosRequestConfig): AxiosRequestConfig => {
  // Clone the config to avoid modifying the original
  const secureConfig = { ...config };
  
  // Ensure headers object exists
  if (!secureConfig.headers) {
    secureConfig.headers = {};
  }
  
  // Add security headers
  secureConfig.headers['X-Content-Type-Options'] = 'nosniff';
  secureConfig.headers['X-Frame-Options'] = 'DENY';
  secureConfig.headers['X-XSS-Protection'] = '1; mode=block';
  
  return secureConfig;
};

/**
 * Validate a form field with basic rules
 * @param value Field value
 * @param required Whether the field is required
 * @param minLength Minimum length requirement
 * @param maxLength Maximum length requirement
 * @param pattern Regex pattern to match
 * @returns Validation result with error message if invalid
 */
export const validateField = (
  value: string,
  required = false,
  minLength = 0,
  maxLength = Infinity,
  pattern?: RegExp
): { valid: boolean; error?: string } => {
  // Check if required field is empty
  if (required && (!value || value.trim() === '')) {
    return { valid: false, error: 'This field is required' };
  }
  
  // Check minimum length
  if (value && value.length < minLength) {
    return { valid: false, error: `Must be at least ${minLength} characters` };
  }
  
  // Check maximum length
  if (value && value.length > maxLength) {
    return { valid: false, error: `Cannot exceed ${maxLength} characters` };
  }
  
  // Check pattern match
  if (pattern && value && !pattern.test(value)) {
    return { valid: false, error: 'Invalid format' };
  }
  
  return { valid: true };
};

/**
 * Escape special characters in a string to prevent injection attacks
 * @param text Text to escape
 * @returns Escaped text
 */
export const escapeSpecialChars = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Create a Content Security Policy string
 * @returns CSP string for use in meta tag
 */
export const generateCSP = (): string => {
  // Define CSP directives for production
  if (process.env.NODE_ENV === 'production') {
    const hostname = window.location.hostname;
    return `
      default-src 'self';
      script-src 'self' 'unsafe-inline';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: https:;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://${hostname} http://${hostname} ws://${hostname} wss://${hostname} ${process.env.REACT_APP_API_HOST || ''};
      frame-src 'none';
      object-src 'none';
    `.replace(/\s+/g, ' ').trim();
  }
  
  // More permissive CSP for development while maintaining security
  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    connect-src 'self' http://localhost:8000 ws://localhost:8000;
    img-src 'self' data: https:;
    font-src 'self' https://fonts.gstatic.com;
    frame-src 'none';
    object-src 'none';
  `.replace(/\s+/g, ' ').trim();
};

// Rate limiting utilities
const requestCounts: Record<string, { count: number; resetTime: number }> = {};
const RATE_LIMIT = 20; // Max requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

/**
 * Rate limiting function to prevent API abuse
 * @param endpoint API endpoint to check
 * @returns Whether the request should be allowed
 */
export const checkRateLimit = (endpoint: string): boolean => {
  const now = Date.now();
  const key = endpoint.split('?')[0]; // Remove query params
  
  // Clear expired entries
  Object.keys(requestCounts).forEach(k => {
    if (requestCounts[k].resetTime < now) {
      delete requestCounts[k];
    }
  });
  
  // Initialize counter if not exists
  if (!requestCounts[key]) {
    requestCounts[key] = { 
      count: 0, 
      resetTime: now + RATE_WINDOW
    };
  }
  
  // Reset if expired
  if (requestCounts[key].resetTime < now) {
    requestCounts[key] = {
      count: 0,
      resetTime: now + RATE_WINDOW
    };
  }
  
  // Increment and check
  requestCounts[key].count++;
  return requestCounts[key].count <= RATE_LIMIT;
};
