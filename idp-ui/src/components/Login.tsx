import { useState } from 'react';
import { login } from '../auth';
import './Login.css';

export const Login = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    
    try {
      await login();
      // After successful login, the app will re-render with the authenticated user
      window.location.reload();
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to sign in. Please try again.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>VisuIDP</h1>
        <p>Sign in with your Microsoft Entra ID account to access the application.</p>
        
        {error && (
          <div className="error-message" style={{ 
            color: '#d32f2f', 
            backgroundColor: '#ffebee', 
            padding: '12px', 
            borderRadius: '4px', 
            marginBottom: '16px' 
          }}>
            {error}
          </div>
        )}
        
        <button 
          onClick={handleLogin} 
          disabled={isLoggingIn}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
            opacity: isLoggingIn ? 0.6 : 1,
          }}
        >
          {isLoggingIn ? 'Signing in...' : 'Sign in with Microsoft'}
        </button>
        
        <div className="access-info" style={{ marginTop: '24px' }}>
          <p><small>Authentication is handled via Microsoft Entra ID (Azure AD)</small></p>
        </div>
      </div>
    </div>
  );
};
