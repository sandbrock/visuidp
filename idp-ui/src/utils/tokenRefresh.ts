import { msalInstance } from '../contexts/MsalContext';
import { loginRequest } from '../authConfig';
import { InteractionRequiredAuthError } from '@azure/msal-browser';

/**
 * Attempts to refresh the access token silently.
 * If silent refresh fails, returns false to indicate interactive login is needed.
 */
export const refreshToken = async (): Promise<boolean> => {
  try {
    const account = msalInstance.getActiveAccount();
    
    if (!account) {
      console.log('No active account for token refresh');
      return false;
    }
    
    // Try to acquire token silently
    await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: account,
      forceRefresh: true, // Force refresh to get a new token
    });
    
    console.log('Token refreshed successfully');
    return true;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      console.log('Token refresh requires user interaction');
      return false;
    }
    
    console.error('Error refreshing token:', error);
    return false;
  }
};

/**
 * Sets up automatic token refresh before expiration.
 * Checks token expiration every 5 minutes and refreshes if needed.
 */
export const setupTokenRefresh = (): (() => void) => {
  const checkInterval = 5 * 60 * 1000; // 5 minutes
  
  const intervalId = setInterval(async () => {
    const account = msalInstance.getActiveAccount();
    
    if (!account) {
      return;
    }
    
    try {
      // Get the current token to check expiration
      const tokenResponse = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      
      // Check if token expires in the next 10 minutes
      const expiresOn = tokenResponse.expiresOn;
      if (expiresOn) {
        const now = new Date();
        const timeUntilExpiry = expiresOn.getTime() - now.getTime();
        const tenMinutes = 10 * 60 * 1000;
        
        if (timeUntilExpiry < tenMinutes) {
          console.log('Token expiring soon, refreshing...');
          await refreshToken();
        }
      }
    } catch (error) {
      console.error('Error checking token expiration:', error);
    }
  }, checkInterval);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};

/**
 * Handles API errors related to authentication.
 * Returns true if the error was handled (e.g., token refreshed), false otherwise.
 */
export const handleAuthError = async (response: Response): Promise<boolean> => {
  if (response.status === 401) {
    console.log('Received 401 Unauthorized, attempting token refresh...');
    
    const refreshed = await refreshToken();
    
    if (!refreshed) {
      console.log('Token refresh failed, user needs to re-authenticate');
      // Clear the active account to force re-login
      msalInstance.setActiveAccount(null);
      return false;
    }
    
    return true;
  }
  
  return false;
};
