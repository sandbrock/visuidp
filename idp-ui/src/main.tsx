import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeMsal } from './contexts/MsalContext'

// Initialize MSAL before rendering the app
initializeMsal().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}).catch((error) => {
  console.error('Failed to initialize MSAL:', error);
  // Render error state
  createRoot(document.getElementById('root')!).render(
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Authentication Error</h1>
      <p>Failed to initialize authentication. Please refresh the page.</p>
    </div>
  );
});
