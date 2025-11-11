import './Login.css';

export const Login = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>VisuIDP</h1>
        <p>Authentication is handled by Traefik. If you're seeing this page, please access the application through the correct URL.</p>
        <div className="access-info">
          <p><strong>Correct URL:</strong> <a href="http://localhost:8443/ui">http://localhost:8443/ui</a></p>
          <p><small>Authentication is handled automatically via Azure Entra ID</small></p>
        </div>
      </div>
    </div>
  );
};
