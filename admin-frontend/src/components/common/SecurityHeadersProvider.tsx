import React, { useEffect } from 'react';
// import { generateCSP } from '../../utils/security'; // Temporarily disabled

/**
 * Component to inject security headers as meta tags
 * Adds Content-Security-Policy and other security meta tags to the document head
 */
const SecurityHeadersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // TEMPORARILY DISABLED: Content Security Policy
    // Let nginx handle CSP instead of frontend
    /*
    const cspContent = generateCSP();
    let cspMeta = document.getElementById('csp-meta') as HTMLMetaElement | null;
    
    if (!cspMeta) {
      cspMeta = document.createElement('meta');
      cspMeta.id = 'csp-meta';
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      document.head.appendChild(cspMeta);
    }
    
    cspMeta.content = cspContent;
    */
    
    // X-Frame-Options is now handled by Django's XFrameOptionsMiddleware
    // X-XSS-Protection meta tag
    let xssProtectionMeta = document.getElementById('x-xss-protection') as HTMLMetaElement | null;
    if (!xssProtectionMeta) {
      xssProtectionMeta = document.createElement('meta');
      xssProtectionMeta.id = 'x-xss-protection';
      xssProtectionMeta.setAttribute('http-equiv', 'X-XSS-Protection');
      xssProtectionMeta.content = '1; mode=block';
      document.head.appendChild(xssProtectionMeta);
    }
    
    // Add X-Content-Type-Options meta tag
    let noSniffMeta = document.getElementById('x-content-type-options') as HTMLMetaElement | null;
    if (!noSniffMeta) {
      noSniffMeta = document.createElement('meta');
      noSniffMeta.id = 'x-content-type-options';
      noSniffMeta.setAttribute('http-equiv', 'X-Content-Type-Options');
      noSniffMeta.content = 'nosniff';
      document.head.appendChild(noSniffMeta);
    }
    
    // Add Referrer-Policy meta tag
    let referrerPolicyMeta = document.getElementById('referrer-policy') as HTMLMetaElement | null;
    if (!referrerPolicyMeta) {
      referrerPolicyMeta = document.createElement('meta');
      referrerPolicyMeta.id = 'referrer-policy';
      referrerPolicyMeta.setAttribute('name', 'referrer');
      referrerPolicyMeta.content = 'no-referrer-when-downgrade';
      document.head.appendChild(referrerPolicyMeta);
    }
    
    return () => {
      // Cleanup not strictly necessary since this is a root component,
      // but included for completeness
      /*
      if (cspMeta?.parentNode) {
        cspMeta.parentNode.removeChild(cspMeta);
      }
      */
      if (xssProtectionMeta?.parentNode) {
        xssProtectionMeta.parentNode.removeChild(xssProtectionMeta);
      }
      if (noSniffMeta?.parentNode) {
        noSniffMeta.parentNode.removeChild(noSniffMeta);
      }
      if (referrerPolicyMeta?.parentNode) {
        referrerPolicyMeta.parentNode.removeChild(referrerPolicyMeta);
      }
    };
  }, []);
  
  return <>{children}</>;
};

export default SecurityHeadersProvider;
