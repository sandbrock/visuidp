import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { AdminDashboard as AdminDashboardData, ResourceTypeCloudMapping } from '../types/admin';
import type { User } from '../types/auth';
import { AngryButton } from './input';
import './AdminDashboard.css';

interface AdminDashboardProps {
  user: User;
}

export const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [incompleteMappings, setIncompleteMappings] = useState<ResourceTypeCloudMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardData, incomplete] = await Promise.all([
        apiService.getAdminDashboard(user.email),
        apiService.getIncompleteMappings(user.email),
      ]);
      setDashboard(dashboardData);
      setIncompleteMappings(incomplete);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (section: string) => {
    const routes: Record<string, string> = {
      'cloud-providers': '/admin/cloud-providers',
      'resource-types': '/admin/resource-types',
      'mappings': '/admin/resource-type-mappings',
      'api-keys': '/admin/api-keys',
    };
    
    const route = routes[section];
    if (route) {
      navigate(route);
    }
  };

  if (loading) {
    return <div className="admin-dashboard loading">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="admin-dashboard error">
        <div className="error-message">{error}</div>
        <AngryButton onClick={loadDashboard} cssClass="e-primary" isPrimary={true}>
          Retry
        </AngryButton>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="admin-dashboard">No dashboard data available</div>;
  }

  const enabledProviders = dashboard.cloudProviders.filter(p => p.enabled).length;
  const enabledResourceTypes = dashboard.resourceTypes.filter(rt => rt.enabled).length;
  const enabledMappings = dashboard.mappings.filter(m => m.enabled).length;
  const completeMappings = dashboard.mappings.filter(m => m.isComplete).length;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <AngryButton onClick={loadDashboard} cssClass="e-small">
          Refresh
        </AngryButton>
      </div>

      <div className="statistics-cards">
        <div className="stat-card">
          <div className="stat-icon">☁️</div>
          <div className="stat-content">
            <div className="stat-value">{dashboard.cloudProviders.length}</div>
            <div className="stat-label">Cloud Providers</div>
            <div className="stat-detail">{enabledProviders} enabled</div>
          </div>
          <AngryButton
            onClick={() => handleNavigate('cloud-providers')}
            cssClass="e-small e-outline"
          >
            Manage
          </AngryButton>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{dashboard.resourceTypes.length}</div>
            <div className="stat-label">Resource Types</div>
            <div className="stat-detail">{enabledResourceTypes} enabled</div>
          </div>
          <AngryButton
            onClick={() => handleNavigate('resource-types')}
            cssClass="e-small e-outline"
          >
            Manage
          </AngryButton>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔗</div>
          <div className="stat-content">
            <div className="stat-value">{dashboard.mappings.length}</div>
            <div className="stat-label">Resource Type Mappings</div>
            <div className="stat-detail">
              {enabledMappings} enabled • {completeMappings} complete • {dashboard.statistics.totalProperties || 0} properties
            </div>
          </div>
          <AngryButton
            onClick={() => handleNavigate('mappings')}
            cssClass="e-small e-outline"
          >
            Manage
          </AngryButton>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔑</div>
          <div className="stat-content">
            <div className="stat-value">API Keys</div>
            <div className="stat-label">Authentication</div>
            <div className="stat-detail">
              Manage API keys for programmatic access
            </div>
          </div>
          <AngryButton
            onClick={() => handleNavigate('api-keys')}
            cssClass="e-small e-outline"
          >
            Manage
          </AngryButton>
        </div>
      </div>

      {incompleteMappings.length > 0 && (
        <div className="incomplete-mappings-section">
          <h3>Incomplete Mappings</h3>
          <p className="section-description">
            These mappings need property schemas defined before they can be enabled.
          </p>
          <div className="incomplete-mappings-list">
            {incompleteMappings.map((mapping) => (
              <div key={mapping.id} className="incomplete-mapping-card">
                <div className="mapping-info">
                  <div className="mapping-title">
                    {mapping.resourceTypeName} on {mapping.cloudProviderName}
                  </div>
                  <div className="mapping-details">
                    <span className="mapping-location">
                      {mapping.terraformModuleLocation}
                    </span>
                    <span className={`status-badge ${mapping.enabled ? 'enabled' : 'disabled'}`}>
                      {mapping.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <AngryButton
                  onClick={() => navigate(`/admin/property-schemas/${mapping.id}`, {
                    state: {
                      from: '/admin',
                      resourceTypeName: mapping.resourceTypeName,
                      cloudProviderName: mapping.cloudProviderName,
                    },
                  })}
                  cssClass="e-small e-primary"
                  isPrimary={true}
                >
                  Add Properties
                </AngryButton>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="configuration-overview">
        <h3>Configuration Overview</h3>
        
        <div className="overview-section">
          <h4>Cloud Providers ({dashboard.cloudProviders.length})</h4>
          <div className="overview-list">
            {dashboard.cloudProviders.length === 0 ? (
              <div className="empty-state">No cloud providers configured</div>
            ) : (
              dashboard.cloudProviders.map((provider) => (
                <div key={provider.id} className="overview-item">
                  <span className="item-name">{provider.displayName}</span>
                  <span className={`status-badge ${provider.enabled ? 'enabled' : 'disabled'}`}>
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overview-section">
          <h4>Resource Types ({dashboard.resourceTypes.length})</h4>
          <div className="overview-list">
            {dashboard.resourceTypes.length === 0 ? (
              <div className="empty-state">No resource types configured</div>
            ) : (
              dashboard.resourceTypes.map((resourceType) => (
                <div key={resourceType.id} className="overview-item">
                  <span className="item-name">{resourceType.displayName}</span>
                  <span className={`category-badge category-${resourceType.category.toLowerCase()}`}>
                    {resourceType.category}
                  </span>
                  <span className={`status-badge ${resourceType.enabled ? 'enabled' : 'disabled'}`}>
                    {resourceType.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overview-section">
          <h4>Mappings ({dashboard.mappings.length})</h4>
          <div className="overview-list">
            {dashboard.mappings.length === 0 ? (
              <div className="empty-state">No mappings configured</div>
            ) : (
              dashboard.mappings.map((mapping) => (
                <div key={mapping.id} className="overview-item">
                  <span className="item-name">
                    {mapping.resourceTypeName} → {mapping.cloudProviderName}
                  </span>
                  <span className={`completeness-badge ${mapping.isComplete ? 'complete' : 'incomplete'}`}>
                    {mapping.isComplete ? 'Complete' : 'Incomplete'}
                  </span>
                  <span className={`status-badge ${mapping.enabled ? 'enabled' : 'disabled'}`}>
                    {mapping.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
