export const environment = {
  production: false,
  msalConfig: {
    clientId: 'YOUR_CLIENT_ID', // Replace with your Entra External ID app client ID
    authority: 'https://YOUR_TENANT.ciamlogin.com/',
    redirectUri: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
    knownAuthority: 'YOUR_TENANT.ciamlogin.com'
  },
  apiConfig: {
    baseUrl: '/api',
    scopes: ['api://YOUR_CLIENT_ID/access_as_user']
  },
  storage: {
    blobContainerUrl: '' // Set after Azure deployment
  }
};
