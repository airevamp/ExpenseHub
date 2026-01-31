import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import {
  BrowserCacheLocation,
  InteractionType,
  IPublicClientApplication,
  LogLevel,
  PublicClientApplication
} from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

/**
 * MSAL Configuration for Azure AD B2C
 *
 * Before deploying, update environment files with your Azure AD B2C values:
 * - clientId: Application (client) ID from Azure portal
 * - authority: Your B2C tenant sign-up/sign-in policy URL
 * - redirectUri: Your app's redirect URI (must be registered in Azure)
 */

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.msalConfig.clientId,
      authority: environment.msalConfig.authority,
      redirectUri: environment.msalConfig.redirectUri,
      postLogoutRedirectUri: environment.msalConfig.postLogoutRedirectUri,
      knownAuthorities: [environment.msalConfig.knownAuthority]
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
      storeAuthStateInCookie: false // Set to true for IE11 support
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          switch (level) {
            case LogLevel.Error:
              console.error(message);
              break;
            case LogLevel.Warning:
              console.warn(message);
              break;
            case LogLevel.Info:
              console.info(message);
              break;
            case LogLevel.Verbose:
              console.debug(message);
              break;
          }
        },
        logLevel: environment.production ? LogLevel.Error : LogLevel.Info,
        piiLoggingEnabled: false
      }
    }
  });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();

  // Protect API endpoints with the appropriate scope
  protectedResourceMap.set(
    environment.apiConfig.baseUrl + '/*',
    environment.apiConfig.scopes
  );

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: environment.apiConfig.scopes
    },
    loginFailedRoute: '/login-failed'
  };
}
