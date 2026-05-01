export const environment = {
  production: true,

  // ── Azure AD / MSAL Authentication ──────────────────────────────────────────
  // Auth is ENABLED in production — Azure AD SSO login is enforced
  authEnabled: false,

  // Your Azure AD App Registration values
  // Get these from: Azure Portal → Azure AD → App Registrations → Your App → Overview
  azure: {
    clientId:  'YOUR_CLIENT_ID_HERE',    // Application (client) ID — replace before deploying
    tenantId:  'YOUR_TENANT_ID_HERE',    // Directory (tenant) ID — replace before deploying
  }
};
