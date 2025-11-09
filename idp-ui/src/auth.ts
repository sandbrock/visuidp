// Traefik handles authentication with Azure Entra ID
import type { User } from './types/auth';

const AUTH_CONFIG = {
  apiBaseUrl: '/api/v1'
};

// LocalStorage key for API key
const API_KEY_STORAGE_KEY = 'idp_api_key';

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

export const login = (): void => {
  // For OAuth2-proxy, redirect to the OAuth2 start endpoint
  // This will trigger the Azure login flow
  window.location.href = '/oauth2/start?rd=' + encodeURIComponent(window.location.pathname);
};

export const logout = (): void => {
  // For OAuth2-proxy, redirect to the logout endpoint
  window.location.href = '/oauth2/sign_out';
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${AUTH_CONFIG.apiBaseUrl}/user/me`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    // If we get a redirect (302) or status 0 (canceled), user needs to authenticate
    if (response.status === 302 || response.status === 0) {
      console.log('getCurrentUser: Authentication required, needs Azure login');
      // Don't automatically redirect - let the app show login state
      return null;
    }
    
    // If unauthorized, user needs to login
    if (response.status === 401) {
      console.log('getCurrentUser: 401 Unauthorized');
      return null;
    }
    
    console.error(`Failed to get user info: ${response.status}`);
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    // Don't automatically redirect on error - let the app handle it
    return null;
  }
};

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
    // Fall back to OAuth2-proxy-compatible auth headers in development only
    // In production (through Traefik on 8443), Traefik/OAuth2-Proxy sets these headers
    const isAccessedThroughTraefik = window.location.port === '8443';
    if (userEmail && import.meta.env.MODE === 'development' && !isAccessedThroughTraefik) {
      // These align with backend TraefikAuthenticationMechanism expectations
      headers['X-Auth-Request-Email'] = userEmail;
      headers['X-Auth-Request-User'] = userEmail;
      // Optionally allow dev to set groups (e.g., "user,admin") via Vite env
       
      const devGroups = (import.meta as { env?: Record<string, unknown> }).env?.VITE_DEV_AUTH_GROUPS as string | undefined;
      if (devGroups && devGroups.trim().length > 0) {
        headers['X-Auth-Request-Groups'] = devGroups;
      }
    }
  }

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers,
    redirect: 'manual', // Don't follow redirects automatically
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  // If we get a redirect (302), it means user needs to authenticate
  if (response.status === 302) {
    console.log('302 redirect detected - authentication required');
    // Don't automatically redirect - let the calling code handle it
    return response;
  }

  // If unauthorized and not in development mode, redirect to login
  // In development mode, let the component handle the 401 to show login button
  if (response.status === 401 && import.meta.env.MODE !== 'development') {
    // For OIDC, we can't redirect from within a fetch - let the component handle it
    console.log('Authentication required - user needs to login');
  }

  return response;
};
