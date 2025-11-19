import type { Configuration, PopupRequest } from '@azure/msal-browser';

/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-javascript/blob/dev/lib/msal-browser/docs/configuration.md
 */

// Get configuration from environment variables
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || '';
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || '';
const redirectUri = import.meta.env.VITE_ENTRA_REDIRECT_URI || window.location.origin + '/ui';

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId, // Application (client) ID from Entra ID app registration
    authority: `https://login.microsoftonline.com/${tenantId}`, // Entra ID tenant
    redirectUri: redirectUri, // Must match redirect URI in app registration
    postLogoutRedirectUri: redirectUri, // Redirect after logout
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage', // Store tokens in localStorage for persistence
    storeAuthStateInCookie: false, // Set to true for IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // Error
            console.error(message);
            return;
          case 1: // Warning
            console.warn(message);
            return;
          case 2: // Info
            console.info(message);
            return;
          case 3: // Verbose
            console.debug(message);
            return;
        }
      },
    },
  },
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit:
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
export const loginRequest: PopupRequest = {
  scopes: ['User.Read'], // Request access to user profile
};

/**
 * Add here the scopes to request when obtaining an access token for API calls.
 * The API should be configured to accept these scopes.
 */
export const apiRequest = {
  scopes: [`api://${clientId}/access_as_user`], // Custom scope for API access
};
