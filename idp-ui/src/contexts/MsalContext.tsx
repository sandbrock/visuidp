import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig } from '../authConfig';

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL instance (must be called before using)
let initPromise: Promise<void> | null = null;

export const initializeMsal = (): Promise<void> => {
  if (!initPromise) {
    initPromise = msalInstance.initialize();
  }
  return initPromise;
};

// Context for MSAL instance (if needed for custom hooks)
const MsalContext = createContext<PublicClientApplication | null>(null);

export const useMsalContext = () => {
  const context = useContext(MsalContext);
  if (!context) {
    throw new Error('useMsalContext must be used within MsalContextProvider');
  }
  return context;
};

interface MsalContextProviderProps {
  children: ReactNode;
}

export const MsalContextProvider = ({ children }: MsalContextProviderProps) => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeMsal().then(() => {
      setInitialized(true);
    }).catch((error) => {
      console.error('Failed to initialize MSAL:', error);
    });
  }, []);

  if (!initialized) {
    return <div>Initializing authentication...</div>;
  }

  return (
    <MsalContext.Provider value={msalInstance}>
      {children}
    </MsalContext.Provider>
  );
};
