export const environment = {
  production: false,

  // ── Azure AD / MSAL Authentication ──────────────────────────────────────────
  // Set to FALSE to skip authentication entirely (for local development)
  // Set to TRUE to enforce Azure AD SSO login
  authEnabled: false,

  // Your Azure AD App Registration values
  // Get these from: Azure Portal → Azure AD → App Registrations → Your App → Overview
  azure: {
    clientId:  'YOUR_CLIENT_ID_HERE',    // Application (client) ID
    tenantId:  'YOUR_TENANT_ID_HERE',    // Directory (tenant) ID
  }
};
