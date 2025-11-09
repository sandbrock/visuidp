import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getCurrentUser } from './auth';
import type { User } from './types/auth';
import { Loading } from './components/Loading';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { Homepage } from './components/Homepage';
import { Development } from './components/Development';
import { Infrastructure } from './components/Infrastructure';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminDashboard } from './components/AdminDashboard';
import { CloudProviderManagement } from './components/CloudProviderManagement';
import { ResourceTypeManagement } from './components/ResourceTypeManagement';
import { ResourceTypeMappingManagement } from './components/ResourceTypeMappingManagement';
import { PropertySchemaEditor } from './components/PropertySchemaEditor';
import { ApiKeysManagement } from './components/ApiKeysManagement';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          setUser(userData);
        } else {
          // If accessed through Traefik, user should be authenticated
          // If we get here, either:
          // 1. User accessed the app directly (not through Traefik)
          // 2. There's an authentication issue
          setError('Authentication required. Please access the application through the correct URL.');
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
        setError('Failed to check authentication status. Please ensure you are accessing the application through Traefik.');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <ThemeProvider>
        <div>
          <Loading message="Checking authentication..." />
        </div>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider>
        <div className="error-container">
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <div>
          <Login />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter basename="/ui">
        <div className="app">
          <Header user={user} />
          <main className="main-content">
            <div className="content-container">
              <Routes>
                <Route path="/" element={<Development user={user} />} />
                <Route path="/infrastructure" element={<Infrastructure user={user} />} />
                <Route path="/development" element={<Homepage user={user} />} />
                
                {/* Personal API Keys - Accessible to all authenticated users */}
                <Route path="/api-keys" element={<ApiKeysManagement user={user} mode="personal" />} />
                
                {/* Admin Routes - Protected */}
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute user={user} requireAdmin={true}>
                      <AdminDashboard user={user} />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/cloud-providers" 
                  element={
                    <ProtectedRoute user={user} requireAdmin={true}>
                      <CloudProviderManagement user={user} />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/resource-types" 
                  element={
                    <ProtectedRoute user={user} requireAdmin={true}>
                      <ResourceTypeManagement user={user} />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/resource-type-mappings" 
                  element={
                    <ProtectedRoute user={user} requireAdmin={true}>
                      <ResourceTypeMappingManagement user={user} />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/property-schemas/:mappingId" 
                  element={
                    <ProtectedRoute user={user} requireAdmin={true}>
                      <PropertySchemaEditor user={user} />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/property-schemas" 
                  element={
                    <ProtectedRoute user={user} requireAdmin={true}>
                      <PropertySchemaEditor user={user} />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/api-keys" 
                  element={
                    <ProtectedRoute user={user} requireAdmin={true}>
                      <ApiKeysManagement user={user} mode="admin" />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
