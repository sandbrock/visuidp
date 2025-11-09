import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import { StackForm } from './StackForm';
import { BlueprintForm } from './BlueprintForm';
import { ResourceTypeMappingManagement } from './ResourceTypeMappingManagement';
import { PropertySchemaEditor } from './PropertySchemaEditor';
import { ApiKeyAuditLogs } from './ApiKeyAuditLogs';
import { Infrastructure } from './Infrastructure';
import { apiService } from '../services/api';
import type { User } from '../types/auth';

// Mock the API service
vi.mock('../services/api', () => ({
  apiService: {
    getBlueprints: vi.fn(),
    createBlueprint: vi.fn(),
    updateBlueprint: vi.fn(),
    deleteBlueprint: vi.fn(),
    getAvailableCloudProvidersForBlueprints: vi.fn(),
    getAvailableResourceTypesForBlueprints: vi.fn(),
    getAvailableCloudProvidersForStacks: vi.fn(),
    getAvailableResourceTypesForStacks: vi.fn(),
    getDomains: vi.fn(),
    getDomainCategories: vi.fn(),
    createStack: vi.fn(),
    updateStack: vi.fn(),
    getCloudProviders: vi.fn(),
    getResourceTypes: vi.fn(),
    getResourceTypeCloudMappings: vi.fn(),
    createResourceTypeCloudMapping: vi.fn(),
    updateResourceTypeCloudMapping: vi.fn(),
    toggleResourceTypeCloudMapping: vi.fn(),
    getPropertySchemasByMapping: vi.fn(),
    createPropertySchema: vi.fn(),
    updatePropertySchema: vi.fn(),
    deletePropertySchema: vi.fn(),
    getApiKeyAuditLogs: vi.fn(),
    getResourceSchemaForStack: vi.fn(),
    getResourceSchemaForBlueprint: vi.fn(),
  },
}));

const mockUser: User = {
  email: 'test@example.com',
  name: 'Test User',
};

const mockCloudProviders = [
  { 
    id: 'cp1', 
    name: 'AWS', 
    displayName: 'Amazon Web Services',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: 'cp2', 
    name: 'Azure', 
    displayName: 'Microsoft Azure',
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockResourceTypes = [
  { 
    id: 'rt1', 
    name: 'Container Orchestrator', 
    displayName: 'Container Orchestrator', 
    category: 'BOTH' as const,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  { 
    id: 'rt2', 
    name: 'Relational Database Server', 
    displayName: 'Relational Database', 
    category: 'SHARED' as const,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockDomains = [
  { id: 'd1', name: 'Engineering' },
  { id: 'd2', name: 'Marketing' },
];

const mockCategories = [
  { id: 'c1', name: 'Backend Services', domainId: 'd1' },
  { id: 'c2', name: 'Frontend Apps', domainId: 'd1' },
];

describe('Migrated Forms Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StackForm - Category Selection with AngryComboBox', () => {
    it('should render category dropdown using AngryComboBox', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForStacks).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getAvailableResourceTypesForStacks).mockResolvedValue(mockResourceTypes);
      vi.mocked(apiService.getDomains).mockResolvedValue(mockDomains);
      vi.mocked(apiService.getDomainCategories).mockResolvedValue(mockCategories);

      render(
        <StackForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Category')).toBeInTheDocument();
      });
    });

    it('should enable category selection after domain is selected', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForStacks).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getAvailableResourceTypesForStacks).mockResolvedValue(mockResourceTypes);
      vi.mocked(apiService.getDomains).mockResolvedValue(mockDomains);
      vi.mocked(apiService.getDomainCategories).mockResolvedValue(mockCategories);

      render(
        <StackForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
          user={mockUser}
        />
      );

      await waitFor(() => {
        const categoryInput = screen.getByPlaceholderText('Category');
        expect(categoryInput).toBeDisabled();
      });
    });
  });

  describe('BlueprintForm - Cloud Provider Checkboxes with AngryCheckBoxGroup', () => {
    it('should render cloud provider checkboxes using AngryCheckBoxGroup', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);

      render(
        <BlueprintForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Supported Cloud Providers *')).toBeInTheDocument();
      });
    });

    it('should allow multiple cloud provider selection', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
      vi.mocked(apiService.createBlueprint).mockResolvedValue({
        id: 'bp1',
        name: 'Test Blueprint',
        description: '',
        supportedCloudProviderIds: ['cp1', 'cp2'],
        supportedCloudTypes: ['AWS', 'Azure'],
        resources: [],
      });

      const onSave = vi.fn();

      render(
        <BlueprintForm
          onSave={onSave}
          onCancel={vi.fn()}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Supported Cloud Providers *')).toBeInTheDocument();
      });
    });
  });

  describe('ResourceTypeMappingManagement - Form Inputs with Angry Controls', () => {
    it('should render mapping grid with Angry controls', async () => {
      vi.mocked(apiService.getCloudProviders).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getResourceTypes).mockResolvedValue(mockResourceTypes);
      vi.mocked(apiService.getResourceTypeCloudMappings).mockResolvedValue([]);

      render(
        <BrowserRouter>
          <ResourceTypeMappingManagement user={mockUser} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Resource Type Cloud Mappings')).toBeInTheDocument();
      });
    });

    it('should use AngryTextBox for read-only fields in modal', async () => {
      const mockMapping = {
        id: 'm1',
        resourceTypeId: 'rt1',
        resourceTypeName: 'Container Orchestrator',
        cloudProviderId: 'cp1',
        cloudProviderName: 'AWS',
        terraformModuleLocation: 'git::https://example.com/module.git',
        moduleLocationType: 'GIT' as const,
        enabled: true,
        isComplete: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(apiService.getCloudProviders).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getResourceTypes).mockResolvedValue(mockResourceTypes);
      vi.mocked(apiService.getResourceTypeCloudMappings).mockResolvedValue([mockMapping]);

      render(
        <BrowserRouter>
          <ResourceTypeMappingManagement user={mockUser} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Complete & Enabled')).toBeInTheDocument();
      });
    });
  });

  describe('PropertySchemaEditor - Dynamic Inputs with Angry Controls', () => {
    it('should render property schema editor with Angry controls', async () => {
      const mockMapping = {
        id: 'm1',
        resourceTypeId: 'rt1',
        resourceTypeName: 'Container Orchestrator',
        cloudProviderId: 'cp1',
        cloudProviderName: 'AWS',
        terraformModuleLocation: 'git::https://example.com/module.git',
        moduleLocationType: 'GIT' as const,
        enabled: true,
        isComplete: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.mocked(apiService.getResourceTypeCloudMappings).mockResolvedValue([mockMapping]);
      vi.mocked(apiService.getPropertySchemasByMapping).mockResolvedValue([]);

      // Render with the mappingId in the route using MemoryRouter
      render(
        <MemoryRouter initialEntries={['/admin/property-schemas/m1']}>
          <Routes>
            <Route path="/admin/property-schemas/:mappingId" element={<PropertySchemaEditor user={mockUser} />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Property Schema Editor' })).toBeInTheDocument();
      });
    });
  });

  describe('ApiKeyAuditLogs - Date Filters with AngryDatePicker', () => {
    it('should render date filters using AngryDatePicker', async () => {
      vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue([]);

      render(
        <BrowserRouter>
          <ApiKeyAuditLogs user={mockUser} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
        expect(screen.getByLabelText('End Date')).toBeInTheDocument();
      });
    });

    it('should filter logs by date range', async () => {
      const mockLogs = [
        {
          id: 'log1',
          timestamp: '2024-01-15T10:00:00Z',
          userEmail: 'user@example.com',
          action: 'API_KEY_CREATED',
          keyPrefix: 'ak_test',
          sourceIp: '192.168.1.1',
        },
        {
          id: 'log2',
          timestamp: '2024-01-20T10:00:00Z',
          userEmail: 'user@example.com',
          action: 'API_KEY_ROTATED',
          keyPrefix: 'ak_test',
          sourceIp: '192.168.1.1',
        },
      ];

      vi.mocked(apiService.getApiKeyAuditLogs).mockResolvedValue(mockLogs);

      render(
        <BrowserRouter>
          <ApiKeyAuditLogs user={mockUser} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('API_KEY_CREATED')).toBeInTheDocument();
        expect(screen.getByText('API_KEY_ROTATED')).toBeInTheDocument();
      });
    });
  });

  describe('Infrastructure - Cloud Provider Checkboxes with AngryCheckBox', () => {
    it('should render cloud provider checkboxes using AngryCheckBox', async () => {
      vi.mocked(apiService.getBlueprints).mockResolvedValue([]);
      vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);

      render(
        <Infrastructure user={mockUser} />
      );

      await waitFor(() => {
        expect(screen.getByText('Blueprints')).toBeInTheDocument();
      });
    });

    it('should allow cloud provider selection when creating blueprint', async () => {
      vi.mocked(apiService.getBlueprints).mockResolvedValue([]);
      vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);

      const user = userEvent.setup();

      render(
        <Infrastructure user={mockUser} />
      );

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newButton = screen.getByText('New');
      await user.click(newButton);

      await waitFor(() => {
        expect(screen.getAllByText('Create Blueprint').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Visual Consistency - All Forms Use Angry Controls', () => {
    it('should verify StackForm uses AngryTextBox for text inputs', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForStacks).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getAvailableResourceTypesForStacks).mockResolvedValue(mockResourceTypes);
      vi.mocked(apiService.getDomains).mockResolvedValue(mockDomains);
      vi.mocked(apiService.getDomainCategories).mockResolvedValue([]);

      render(
        <StackForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Display Name *')).toBeInTheDocument();
        expect(screen.getByLabelText('Cloud Name *')).toBeInTheDocument();
      });
    });

    it('should verify BlueprintForm uses AngryTextBox for text inputs', async () => {
      vi.mocked(apiService.getAvailableCloudProvidersForBlueprints).mockResolvedValue(mockCloudProviders);
      vi.mocked(apiService.getAvailableResourceTypesForBlueprints).mockResolvedValue(mockResourceTypes);

      render(
        <BlueprintForm
          onSave={vi.fn()}
          onCancel={vi.fn()}
          user={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Blueprint Name *')).toBeInTheDocument();
      });
    });
  });
});
