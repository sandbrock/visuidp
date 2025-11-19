// Entra ID authentication with MSAL
import { msalInstance } from './contexts/MsalContext';
import { loginRequest } from './authConfig';
import type { User } from './types/auth';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

// Demo mode callback - will be set by the app to update demo mode state
let demoModeCallback: ((enabled: boolean) => void) | null = null;

export const setDemoModeCallback = (callback: (enabled: boolean) => void): void => {
  demoModeCallback = callback;
};

const AUTH_CONFIG = {
  apiBaseUrl: '/api/v1'
};

// LocalStorage key for API key
const API_KEY_STORAGE_KEY = 'idp_api_key';

// LocalStorage key for blueprint selection
export const BLUEPRINT_STORAGE_KEY = 'selectedBlueprintId';

export type { User };

// API Key management functions
export const setApiKey = (apiKey: string): void => {
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
};

export const getApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const clearApiKey = (): void => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};

export const hasApiKey = (): boolean => {
  return getApiKey() !== null;
};

/**
 * Initiates the login flow using MSAL popup.
 * Acquires an access token and stores it for API calls.
 */
export const login = async (): Promise<void> => {
  try {
    const loginResponse = await msalInstance.loginPopup(loginRequest);
    console.log('Login successful:', loginResponse);
    
    // Set the active account
    msalInstance.setActiveAccount(loginResponse.account);
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Logs out the current user and clears all tokens.
 */
export const logout = (): void => {
  // Clear API key from localStorage
  clearApiKey();
  
  // Clear blueprint selection from localStorage
  localStorage.removeItem(BLUEPRINT_STORAGE_KEY);
  
  // Get the active account
  const account = msalInstance.getActiveAccount();
  
  // Logout from MSAL
  msalInstance.logoutPopup({
    account: account || undefined,
    postLogoutRedirectUri: window.location.origin + '/ui',
  }).catch((error) => {
    console.error('Logout failed:', error);
  });
};

/**
 * Gets the current user from MSAL and constructs a User object.
 * Returns null if no user is authenticated.
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Get the active account from MSAL
    let account = msalInstance.getActiveAccount();
    
    // If no active account, try to get all accounts and set the first one
    if (!account) {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        account = accounts[0];
        msalInstance.setActiveAccount(account);
      } else {
        // No accounts found - user needs to login
        return null;
      }
    }
    
    // Try to acquire token silently to ensure it's still valid
    try {
      await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
    } catch (error) {
      // If silent token acquisition fails, user needs to re-authenticate
      if (error instanceof InteractionRequiredAuthError) {
        console.log('Token expired or interaction required');
        return null;
      }
      throw error;
    }
    
    // Construct User object from account info
    const user: User = {
      email: account.username || account.name || '',
      name: account.name || account.username || '',
      roles: [], // Roles will be extracted from token claims if needed
    };
    
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Makes an authenticated API call with JWT token from MSAL.
 * Automatically acquires and includes access token in Authorization header.
 * Handles token refresh on 401 errors.
 */
export const apiCall = async (endpoint: string, options: RequestInit = {}, userEmail?: string): Promise<Response> => {
  const url = `${AUTH_CONFIG.apiBaseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  // Check for API key first - API key authentication takes precedence
  const apiKey = getApiKey();
  if (apiKey) {
    // Add Authorization header with Bearer scheme for API key authentication
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    // Get JWT token from MSAL for Entra ID authentication
    try {
      const account = msalInstance.getActiveAccount();
      if (account) {
        // Acquire access token silently
        const tokenResponse = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: account,
        });
        
        // Add JWT token to Authorization header
        headers['Authorization'] = `Bearer ${tokenResponse.accessToken}`;
      } else {
        // No active account - fall back to development mode headers if applicable
        const isAccessedThroughTraefik = window.location.port === '8443';
        if (userEmail && import.meta.env.MODE === 'development' && !isAccessedThroughTraefik) {
          // Development mode fallback for local testing
          headers['X-Auth-Request-Email'] = userEmail;
          headers['X-Auth-Request-User'] = userEmail;
          
          const devGroups = (import.meta as { env?: Record<string, unknown> }).env?.VITE_DEV_AUTH_GROUPS as string | undefined;
          if (devGroups && devGroups.trim().length > 0) {
            headers['X-Auth-Request-Groups'] = devGroups;
          }
        }
      }
    } catch (error) {
      // If token acquisition fails, try interactive login
      if (error instanceof InteractionRequiredAuthError) {
        console.log('Token acquisition requires interaction - attempting popup login');
        try {
          // Try to acquire token interactively
          const account = msalInstance.getActiveAccount();
          if (account) {
            const tokenResponse = await msalInstance.acquireTokenPopup({
              ...loginRequest,
              account: account,
            });
            headers['Authorization'] = `Bearer ${tokenResponse.accessToken}`;
          }
        } catch (popupError) {
          console.error('Interactive token acquisition failed:', popupError);
          // Let the calling code handle the authentication requirement
        }
      } else {
        console.error('Error acquiring token:', error);
      }
    }
  }

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers,
    redirect: 'manual', // Don't follow redirects automatically
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  // Check for demo mode header in response
  const demoModeHeader = response.headers.get('X-Demo-Mode');
  if (demoModeHeader && demoModeCallback) {
    const isDemoMode = demoModeHeader.toLowerCase() === 'true';
    demoModeCallback(isDemoMode);
  }

  // Handle authentication errors with retry
  if (response.status === 401 && !apiKey) {
    console.log('401 Unauthorized - attempting token refresh and retry');
    
    try {
      const account = msalInstance.getActiveAccount();
      if (account) {
        // Try to refresh token
        const tokenResponse = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: account,
          forceRefresh: true,
        });
        
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${tokenResponse.accessToken}`;
        const retryResponse = await fetch(url, { ...defaultOptions, ...options, headers });
        return retryResponse;
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      // Return original 401 response
    }
  }

  return response;
};
