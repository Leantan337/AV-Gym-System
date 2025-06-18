import emailConfig, { smtpProviders, dnsRecordTemplates } from '../emailConfig';

describe('Email Configuration', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env after all tests
    process.env = originalEnv;
  });

  describe('Environment Configuration', () => {
    it('should use development config in non-production environment', () => {
      // Mock the environment by directly setting process.env
      const env = {
        ...originalEnv,
        NODE_ENV: 'development'
      };
      Object.defineProperty(process, 'env', {
        value: env,
        writable: true
      });

      const config = require('../emailConfig').default;
      
      expect(config).toEqual({
        provider: 'SendGrid',
        host: 'smtp.sendgrid.net',
        port: 587,
        username: 'apikey',
        secure: false,
        fromEmail: 'dev-test@avgym.com',
        fromName: 'AV Fitness Center (Dev)',
        apiKey: 'SG.placeholder-key-for-development',
        enableTestMode: true,
      });
    });

    it('should use production config with environment variables', () => {
      // Mock the environment for production
      const env = {
        ...originalEnv,
        NODE_ENV: 'production',
        REACT_APP_EMAIL_HOST: 'custom.smtp.server',
        REACT_APP_EMAIL_PORT: '465',
        REACT_APP_EMAIL_USERNAME: 'custom-user',
        REACT_APP_EMAIL_SECURE: 'true',
        REACT_APP_EMAIL_FROM_ADDRESS: 'custom@avgym.com',
        REACT_APP_EMAIL_FROM_NAME: 'Custom Name',
        REACT_APP_EMAIL_API_KEY: 'custom-api-key',
        REACT_APP_EMAIL_TEST_MODE: 'false'
      };
      Object.defineProperty(process, 'env', {
        value: env,
        writable: true
      });

      const config = require('../emailConfig').default;
      
      expect(config).toEqual({
        provider: 'SendGrid',
        host: 'custom.smtp.server',
        port: 465,
        username: 'custom-user',
        secure: true,
        fromEmail: 'custom@avgym.com',
        fromName: 'Custom Name',
        apiKey: 'custom-api-key',
        enableTestMode: false,
      });
    });

    it('should use default values when production env vars are not set', () => {
      // Mock the environment for production with minimal env vars
      const env = {
        ...originalEnv,
        NODE_ENV: 'production'
      };
      Object.defineProperty(process, 'env', {
        value: env,
        writable: true
      });

      const config = require('../emailConfig').default;
      
      expect(config).toEqual({
        provider: 'SendGrid',
        host: 'smtp.sendgrid.net',
        port: 587,
        username: 'apikey',
        secure: false,
        fromEmail: 'noreply@avgym.com',
        fromName: 'AV Fitness Center',
        apiKey: '',
        enableTestMode: false,
      });
    });
  });

  describe('SMTP Providers', () => {
    it('should export smtpProviders array with correct structure', () => {
      expect(Array.isArray(smtpProviders)).toBe(true);
      expect(smtpProviders.length).toBe(4);

      // Test SendGrid provider structure
      const sendgrid = smtpProviders.find(p => p.name === 'SendGrid');
      expect(sendgrid).toEqual({
        name: 'SendGrid',
        logoUrl: '/images/sendgrid-logo.png',
        description: 'Email delivery service by Twilio',
        website: 'https://sendgrid.com',
        defaultPort: 587,
        secure: false,
        requiresApiKey: true,
      });

      // Test Gmail provider structure
      const gmail = smtpProviders.find(p => p.name === 'Gmail');
      expect(gmail).toEqual({
        name: 'Gmail',
        logoUrl: '/images/gmail-logo.png',
        description: 'Google email service',
        website: 'https://mail.google.com',
        defaultPort: 465,
        secure: true,
        requiresApiKey: false,
      });
    });
  });

  describe('DNS Record Templates', () => {
    it('should export dnsRecordTemplates with correct structure', () => {
      expect(dnsRecordTemplates).toHaveProperty('sendgrid');
      expect(dnsRecordTemplates).toHaveProperty('mailgun');

      // Test SendGrid DNS template
      expect(dnsRecordTemplates.sendgrid).toEqual({
        spf: 'v=spf1 include:sendgrid.net ~all',
        dkim: {
          host: 'em{selector}._domainkey.{domain}',
          value: 'k=rsa; t=s; p={dkim_key}'
        },
        dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc@{domain}'
      });

      // Test Mailgun DNS template
      expect(dnsRecordTemplates.mailgun).toEqual({
        spf: 'v=spf1 include:mailgun.org ~all',
        dkim: {
          host: '{selector}._domainkey.{domain}',
          value: 'k=rsa; p={dkim_key}'
        },
        dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc@{domain}'
      });
    });

    it('should have valid DNS record templates for all providers', () => {
      Object.entries(dnsRecordTemplates).forEach(([provider, template]) => {
        // Test SPF record
        expect(template.spf).toMatch(/^v=spf1/);
        
        // Test DKIM record structure
        expect(template.dkim).toHaveProperty('host');
        expect(template.dkim).toHaveProperty('value');
        expect(template.dkim.host).toContain('{domain}');
        expect(template.dkim.value).toContain('k=rsa');
        
        // Test DMARC record
        expect(template.dmarc).toMatch(/^v=DMARC1/);
        expect(template.dmarc).toContain('mailto:dmarc@{domain}');
      });
    });
  });
}); 