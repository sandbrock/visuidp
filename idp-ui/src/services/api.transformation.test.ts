import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformBlueprintResourceFromBackend, transformBlueprintResourceToBackend } from './api';
import CloudProviderLookupService from './CloudProviderLookupService';
import type { CloudProvider } from '../types/admin';

describe('Blueprint Resource Transformation Functions', () => {
  let lookupService: CloudProviderLookupService;

  const mockCloudProviders: CloudProvider[] = [
    {
      id: 'uuid-aws-123',
      name: 'AWS',
      displayName: 'Amazon Web Services',
      description: 'AWS cloud provider',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'uuid-azure-456',
      name: 'Azure',
      displayName: 'Microsoft Azure',
      description: 'Azure cloud provider',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    // Get singleton instance and clear it before each test
    lookupService = CloudProviderLookupService.getInstance();
    lookupService.clear();
    lookupService.initialize(mockCloudProviders);
    
    // Clear console.warn spy
    vi.clearAllMocks();
  });

  describe('transformBlueprintResourceFromBackend', () => {
    it('should transform backend resource with valid cloud type', () => {
      const backendResource = {
        id: 'resource-1',
        name: 'Test Resource',
        description: 'Test description',
        blueprintResourceTypeId: 'type-123',
        blueprintResourceTypeName: 'Storage',
        cloudType: 'AWS',
        configuration: { size: '100GB' },
        cloudSpecificProperties: { region: 'us-east-1' },
      };

      const result = transformBlueprintResourceFromBackend(backendResource, lookupService);

      expect(result).toEqual({
        id: 'resource-1',
        name: 'Test Resource',
        description: 'Test description',
        resourceTypeId: 'type-123',
        resourceTypeName: 'Storage',
        cloudProviderId: 'uuid-aws-123',
        cloudProviderName: 'AWS',
        configuration: { size: '100GB' },
        cloudSpecificProperties: { region: 'us-east-1' },
      });
    });

    it('should resolve cloud type case-insensitively', () => {
      const backendResource = {
        name: 'Test Resource',
        blueprintResourceTypeId: 'type-123',
        cloudType: 'aws',
        configuration: {},
      };

      const result = transformBlueprintResourceFromBackend(backendResource, lookupService);

      expect(result.cloudProviderId).toBe('uuid-aws-123');
      expect(result.cloudProviderName).toBe('aws');
    });

    it('should handle unknown cloud type by logging warning and setting empty string', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const backendResource = {
        name: 'Test Resource',
        blueprintResourceTypeId: 'type-123',
        cloudType: 'UnknownCloud',
        configuration: {},
      };

      const result = transformBlueprintResourceFromBackend(backendResource, lookupService);

      expect(result.cloudProviderId).toBe('');
      expect(result.cloudProviderName).toBe('UnknownCloud');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[CloudProviderResolution] Could not resolve cloud type "UnknownCloud" to a cloud provider UUID. ' +
        'Resource "Test Resource" will have an empty cloudProviderId. ' +
        'This may cause issues when loading cloud-specific properties.'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle transformation without lookup service (backward compatibility)', () => {
      const backendResource = {
        name: 'Test Resource',
        blueprintResourceTypeId: 'type-123',
        cloudType: 'AWS',
        configuration: {},
      };

      const result = transformBlueprintResourceFromBackend(backendResource);

      expect(result.cloudProviderId).toBe('');
      expect(result.cloudProviderName).toBe('AWS');
    });

    it('should handle missing cloud type', () => {
      const backendResource = {
        name: 'Test Resource',
        blueprintResourceTypeId: 'type-123',
        configuration: {},
      };

      const result = transformBlueprintResourceFromBackend(backendResource, lookupService);

      expect(result.cloudProviderId).toBe('');
      expect(result.cloudProviderName).toBeUndefined();
    });

    it('should handle all optional fields', () => {
      const backendResource = {
        name: 'Minimal Resource',
        blueprintResourceTypeId: 'type-123',
        configuration: {},
      };

      const result = transformBlueprintResourceFromBackend(backendResource, lookupService);

      expect(result).toEqual({
        id: undefined,
        name: 'Minimal Resource',
        description: undefined,
        resourceTypeId: 'type-123',
        resourceTypeName: undefined,
        cloudProviderId: '',
        cloudProviderName: undefined,
        configuration: {},
        cloudSpecificProperties: undefined,
      });
    });
  });

  describe('transformBlueprintResourceToBackend', () => {
    it('should transform frontend resource to backend format using cloudProviderName', () => {
      const frontendResource = {
        name: 'Test Resource',
        description: 'Test description',
        resourceTypeId: 'type-123',
        resourceTypeName: 'Storage',
        cloudProviderId: 'uuid-aws-123',
        cloudProviderName: 'AWS',
        configuration: { size: '100GB' },
        cloudSpecificProperties: { region: 'us-east-1' },
      };

      const result = transformBlueprintResourceToBackend(frontendResource, lookupService);

      expect(result).toEqual({
        name: 'Test Resource',
        description: 'Test description',
        blueprintResourceTypeId: 'type-123',
        blueprintResourceTypeName: 'Storage',
        cloudType: 'AWS',
        configuration: { size: '100GB' },
        cloudSpecificProperties: { region: 'us-east-1' },
      });
    });

    it('should resolve UUID to cloud type when cloudProviderName is missing', () => {
      const frontendResource = {
        name: 'Test Resource',
        resourceTypeId: 'type-123',
        cloudProviderId: 'uuid-aws-123',
        configuration: {},
      };

      const result = transformBlueprintResourceToBackend(frontendResource, lookupService);

      // Should resolve UUID to cloud type string
      expect(result.cloudType).toBe('AWS');
    });

    it('should prefer cloudProviderName over cloudProviderId resolution', () => {
      const frontendResource = {
        name: 'Test Resource',
        resourceTypeId: 'type-123',
        cloudProviderId: 'uuid-aws-123',
        cloudProviderName: 'AWS',
        configuration: {},
      };

      const result = transformBlueprintResourceToBackend(frontendResource, lookupService);

      expect(result.cloudType).toBe('AWS');
    });

    it('should resolve UUID when cloudProviderName is empty', () => {
      const frontendResource = {
        name: 'Test Resource',
        resourceTypeId: 'type-123',
        cloudProviderId: 'uuid-azure-456',
        cloudProviderName: '',
        configuration: {},
      };

      const result = transformBlueprintResourceToBackend(frontendResource, lookupService);

      // Should resolve UUID to cloud type string
      expect(result.cloudType).toBe('Azure');
    });

    it('should handle unknown UUID by logging warning and using UUID as fallback', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const frontendResource = {
        name: 'Test Resource',
        resourceTypeId: 'type-123',
        cloudProviderId: 'unknown-uuid-999',
        configuration: {},
      };

      const result = transformBlueprintResourceToBackend(frontendResource, lookupService);

      // Should fallback to UUID when resolution fails
      expect(result.cloudType).toBe('unknown-uuid-999');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[CloudProviderResolution] Could not resolve cloud provider UUID "unknown-uuid-999" to cloud type. ' +
        'Resource "Test Resource" will use UUID as fallback for backward compatibility.'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should maintain cloud type format for backend compatibility', () => {
      const frontendResource = {
        name: 'Test Resource',
        resourceTypeId: 'type-123',
        cloudProviderId: 'uuid-aws-123',
        cloudProviderName: 'aws',
        configuration: {},
      };

      const result = transformBlueprintResourceToBackend(frontendResource, lookupService);

      // Should maintain the exact string format from cloudProviderName
      expect(result.cloudType).toBe('aws');
      expect(typeof result.cloudType).toBe('string');
    });

    it('should handle transformation without lookup service (backward compatibility)', () => {
      const frontendResource = {
        name: 'Test Resource',
        resourceTypeId: 'type-123',
        cloudProviderId: 'uuid-aws-123',
        configuration: {},
      };

      const result = transformBlueprintResourceToBackend(frontendResource);

      // Without lookup service, should fallback to UUID
      expect(result.cloudType).toBe('uuid-aws-123');
    });

    it('should handle all optional fields', () => {
      const frontendResource = {
        name: 'Minimal Resource',
        resourceTypeId: 'type-123',
        cloudProviderId: '',
        configuration: {},
      };

      const result = transformBlueprintResourceToBackend(frontendResource, lookupService);

      expect(result).toEqual({
        name: 'Minimal Resource',
        description: undefined,
        blueprintResourceTypeId: 'type-123',
        blueprintResourceTypeName: undefined,
        cloudType: '',
        configuration: {},
        cloudSpecificProperties: undefined,
      });
    });
  });

  describe('bidirectional transformation', () => {
    it('should maintain data integrity through round-trip transformation', () => {
      const originalBackendResource = {
        id: 'resource-1',
        name: 'Test Resource',
        description: 'Test description',
        blueprintResourceTypeId: 'type-123',
        blueprintResourceTypeName: 'Storage',
        cloudType: 'AWS',
        configuration: { size: '100GB' },
        cloudSpecificProperties: { region: 'us-east-1' },
      };

      // Backend -> Frontend
      const frontendResource = transformBlueprintResourceFromBackend(originalBackendResource, lookupService);
      
      // Frontend -> Backend
      const backendResource = transformBlueprintResourceToBackend(frontendResource, lookupService);

      // Should maintain the same data (except id which is omitted in toBackend)
      expect(backendResource.name).toBe(originalBackendResource.name);
      expect(backendResource.description).toBe(originalBackendResource.description);
      expect(backendResource.blueprintResourceTypeId).toBe(originalBackendResource.blueprintResourceTypeId);
      expect(backendResource.blueprintResourceTypeName).toBe(originalBackendResource.blueprintResourceTypeName);
      expect(backendResource.cloudType).toBe(originalBackendResource.cloudType);
      expect(backendResource.configuration).toEqual(originalBackendResource.configuration);
      expect(backendResource.cloudSpecificProperties).toEqual(originalBackendResource.cloudSpecificProperties);
    });

    it('should handle case-insensitive cloud types in round-trip', () => {
      const backendResource = {
        name: 'Test Resource',
        blueprintResourceTypeId: 'type-123',
        cloudType: 'azure',
        configuration: {},
      };

      // Backend -> Frontend (resolves to UUID)
      const frontendResource = transformBlueprintResourceFromBackend(backendResource, lookupService);
      expect(frontendResource.cloudProviderId).toBe('uuid-azure-456');
      expect(frontendResource.cloudProviderName).toBe('azure');

      // Frontend -> Backend (uses cloudProviderName)
      const result = transformBlueprintResourceToBackend(frontendResource, lookupService);
      expect(result.cloudType).toBe('azure');
    });

    it('should handle round-trip when cloudProviderName is not set', () => {
      const backendResource = {
        name: 'Test Resource',
        blueprintResourceTypeId: 'type-123',
        cloudType: 'AWS',
        configuration: {},
      };

      // Backend -> Frontend (resolves to UUID)
      const frontendResource = transformBlueprintResourceFromBackend(backendResource, lookupService);
      expect(frontendResource.cloudProviderId).toBe('uuid-aws-123');
      
      // Clear cloudProviderName to simulate state where only UUID is available
      const frontendResourceWithoutName = {
        ...frontendResource,
        cloudProviderName: undefined,
      };

      // Frontend -> Backend (should resolve UUID back to cloud type)
      const result = transformBlueprintResourceToBackend(frontendResourceWithoutName, lookupService);
      expect(result.cloudType).toBe('AWS');
    });
  });
});
