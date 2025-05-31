import React, { useEffect } from 'react';
import { generateCSP } from '../../utils/security';

/**
 * Component to inject security headers as meta tags
 * Adds Content-Security-Policy and other security meta tags to the document head
 */
const SecurityHeadersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Add Content Security Policy
    const cspContent = generateCSP();
    let cspMeta = document.getElementById('csp-meta') as HTMLMetaElement | null;
    
    if (!cspMeta) {
      cspMeta = document.createElement('meta');
      cspMeta.id = 'csp-meta';
      cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
      document.head.appendChild(cspMeta);
    }
    
    cspMeta.content = cspContent;
    
    // Add X-Frame-Options equivalent meta tag
    let xFrameOptionsMeta = document.getElementById('x-frame-options') as HTMLMetaElement | null;
    if (!xFrameOptionsMeta) {
      xFrameOptionsMeta = document.createElement('meta');
      xFrameOptionsMeta.id = 'x-frame-options';
      xFrameOptionsMeta.setAttribute('http-equiv', 'X-Frame-Options');
      xFrameOptionsMeta.content = 'DENY';
      document.head.appendChild(xFrameOptionsMeta);
    }
    
    // Add X-XSS-Protection equivalent meta tag
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
      if (cspMeta && cspMeta.parentNode) {
        cspMeta.parentNode.removeChild(cspMeta);
      }
      if (xFrameOptionsMeta && xFrameOptionsMeta.parentNode) {
        xFrameOptionsMeta.parentNode.removeChild(xFrameOptionsMeta);
      }
      if (xssProtectionMeta && xssProtectionMeta.parentNode) {
        xssProtectionMeta.parentNode.removeChild(xssProtectionMeta);
      }
      if (noSniffMeta && noSniffMeta.parentNode) {
        noSniffMeta.parentNode.removeChild(noSniffMeta);
      }
      if (referrerPolicyMeta && referrerPolicyMeta.parentNode) {
        referrerPolicyMeta.parentNode.removeChild(referrerPolicyMeta);
      }
    };
  }, []);
  
  return <>{children}</>;
};

export default SecurityHeadersProvider;
