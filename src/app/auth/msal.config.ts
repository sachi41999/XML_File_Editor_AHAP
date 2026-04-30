import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import {
  BrowserCacheLocation,
  IPublicClientApplication,
  InteractionType,
  LogLevel,
  PublicClientApplication
} from '@azure/msal-browser';
import { environment } from '../../environments/environment';

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId:               environment.azure.clientId,
      authority:              'https://login.microsoftonline.com/' + environment.azure.tenantId,
      redirectUri:            window.location.origin,
      postLogoutRedirectUri:  window.location.origin,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation:          BrowserCacheLocation.SessionStorage,
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
          if (containsPii) return;
          if (level === LogLevel.Error)   console.error('[MSAL]', message);
          if (level === LogLevel.Warning) console.warn('[MSAL]', message);
        },
        piiLoggingEnabled: false,
        logLevel: environment.production ? LogLevel.Error : LogLevel.Warning,
      }
    }
  });
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read']
};

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: loginRequest,
  };
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['User.Read']);
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap
  };
}
