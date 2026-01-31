export const environment = {
  production: false,
  msalConfig: {
    clientId: 'YOUR_CLIENT_ID', // Replace with your Azure AD B2C app client ID
    authority: 'https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/B2C_1_signupsignin',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    knownAuthority: 'YOUR_TENANT.b2clogin.com'
  },
  apiConfig: {
    baseUrl: '/api',
    scopes: ['https://YOUR_TENANT.onmicrosoft.com/api/access_as_user']
  },
  storage: {
    blobContainerUrl: '' // Set after Azure deployment
  }
};
