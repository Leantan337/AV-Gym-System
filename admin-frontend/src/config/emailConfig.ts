/**
 * Email Configuration
 * Provides environment-specific SMTP configurations
 * Used for sending emails through the application
 */

// Default development email configuration
const devEmailConfig = {
  provider: 'SendGrid',
  host: 'smtp.sendgrid.net',
  port: 587,
  username: 'apikey',
  secure: false, // true for 465, false for other ports
  fromEmail: 'dev-test@avgym.com',
  fromName: 'AV Fitness Center (Dev)',
  // In development, no actual emails are sent - they are logged to console
  // API key is a placeholder in development
  apiKey: 'SG.placeholder-key-for-development',
  enableTestMode: true,
};

// Production email configuration
// Values are loaded from environment variables for security
const prodEmailConfig = {
  provider: 'SendGrid',
  host: process.env.REACT_APP_EMAIL_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.REACT_APP_EMAIL_PORT || '587', 10),
  username: process.env.REACT_APP_EMAIL_USERNAME || 'apikey',
  secure: process.env.REACT_APP_EMAIL_SECURE === 'true',
  fromEmail: process.env.REACT_APP_EMAIL_FROM_ADDRESS || 'noreply@avgym.com',
  fromName: process.env.REACT_APP_EMAIL_FROM_NAME || 'AV Fitness Center',
  apiKey: process.env.REACT_APP_EMAIL_API_KEY || '',
  enableTestMode: process.env.REACT_APP_EMAIL_TEST_MODE === 'true',
};

// SMTP provider specifications (for UI configuration)
export const smtpProviders = [
  {
    name: 'SendGrid',
    logoUrl: '/images/sendgrid-logo.png',
    description: 'Email delivery service by Twilio',
    website: 'https://sendgrid.com',
    defaultPort: 587,
    secure: false,
    requiresApiKey: true,
  },
  {
    name: 'Mailgun',
    logoUrl: '/images/mailgun-logo.png',
    description: 'Transactional email API service',
    website: 'https://www.mailgun.com',
    defaultPort: 587,
    secure: false,
    requiresApiKey: true,
  },
  {
    name: 'SMTP',
    logoUrl: '/images/smtp-logo.png',
    description: 'Generic SMTP server',
    website: '',
    defaultPort: 25,
    secure: false,
    requiresApiKey: false,
  },
  {
    name: 'Gmail',
    logoUrl: '/images/gmail-logo.png',
    description: 'Google email service',
    website: 'https://mail.google.com',
    defaultPort: 465,
    secure: true,
    requiresApiKey: false,
  },
];

// DNS record templates for different email providers
export const dnsRecordTemplates = {
  sendgrid: {
    spf: 'v=spf1 include:sendgrid.net ~all',
    dkim: {
      host: 'em{selector}._domainkey.{domain}',
      value: 'k=rsa; t=s; p={dkim_key}'
    },
    dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc@{domain}'
  },
  mailgun: {
    spf: 'v=spf1 include:mailgun.org ~all',
    dkim: {
      host: '{selector}._domainkey.{domain}',
      value: 'k=rsa; p={dkim_key}'
    },
    dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc@{domain}'
  }
};

// Export the appropriate configuration based on environment
const emailConfig = process.env.NODE_ENV === 'production' 
  ? prodEmailConfig 
  : devEmailConfig;

export default emailConfig;
