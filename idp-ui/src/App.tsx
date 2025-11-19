import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './contexts/MsalContext';
import { getCurrentUser } from './auth';
import { setupTokenRefresh } from './utils/tokenRefresh';
import type { User } from './types/auth';
import { Loading } from './components/Loading';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

// Lazy load route components for code splitting
// Core pages - loaded on demand
const Homepage = lazy(() => import('./components/Homepage'));
const Development = lazy(() => import('./components/Development'));
const Infrastructure = lazy(() => import('./components/Infrastructure'));

// API Keys management - separate chunk
const ApiKeysManagement = lazy(() => import('./components/ApiKeysManagement'));

// Admin components - only loaded when admin accesses these routes
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const CloudProviderManagement = lazy(() => import('./components/CloudProviderManagement'));
const ResourceTypeManagement = lazy(() => import('./components/ResourceTypeManagement'));
const ResourceTypeMappingManagement = lazy(() => import('./components/ResourceTypeMappingManagement'));
const PropertySchemaEditor = lazy(() => import('./components/PropertySchemaEditor'));

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
          // User is not authenticated - show login screen
          console.log('No authenticated user found');
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
        setError('Failed to check authentication status. Please try logging in again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    
    // Set up automatic token refresh
    const cleanup = setupTokenRefresh();
    
    // Cleanup on unmount
    return cleanup;
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
    <MsalProvider instance={msalInstance}>
      <ThemeProvider>
        <BrowserRouter basename="/ui">
          <div className="app">
            <Header user={user} />
            <main className="main-content">
              <div className="content-container">
                <Suspense fallback={<Loading message="Loading page..." />}>
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
                </Suspense>
              </div>
            </main>
          </div>
        </BrowserRouter>
      </ThemeProvider>
    </MsalProvider>
  );
}

export default App;
