export const environment = {
  production: true,
  msalConfig: {
    clientId: 'YOUR_CLIENT_ID', // Replace with your Entra External ID app client ID
    authority: 'https://YOUR_TENANT.ciamlogin.com/',
    redirectUri: 'https://YOUR_STATIC_WEB_APP.azurestaticapps.net',
    postLogoutRedirectUri: 'https://YOUR_STATIC_WEB_APP.azurestaticapps.net',
    knownAuthority: 'YOUR_TENANT.ciamlogin.com'
  },
  apiConfig: {
    baseUrl: '/api',
    scopes: ['api://YOUR_CLIENT_ID/access_as_user']
  },
  storage: {
    blobContainerUrl: 'https://YOUR_STORAGE_ACCOUNT.blob.core.windows.net/receipts'
  }
};
