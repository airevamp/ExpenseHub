export const environment = {
  production: true,
  msalConfig: {
    clientId: 'YOUR_CLIENT_ID', // Replace with your Azure AD B2C app client ID
    authority: 'https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/B2C_1_signupsignin',
    redirectUri: 'https://YOUR_STATIC_WEB_APP.azurestaticapps.net',
    postLogoutRedirectUri: 'https://YOUR_STATIC_WEB_APP.azurestaticapps.net',
    knownAuthority: 'YOUR_TENANT.b2clogin.com'
  },
  apiConfig: {
    baseUrl: '/api',
    scopes: ['https://YOUR_TENANT.onmicrosoft.com/api/access_as_user']
  },
  storage: {
    blobContainerUrl: 'https://YOUR_STORAGE_ACCOUNT.blob.core.windows.net/receipts'
  }
};
