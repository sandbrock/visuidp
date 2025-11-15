import { describe, it, expect, beforeEach, vi } from 'vitest';
import { propertySchemaService } from './PropertySchemaService';
import { apiService } from './api';
import type { PropertySchema, PropertySchemaResponse } from '../types/admin';

// Mock the apiService
vi.mock('./api', () => ({
  apiService: {
    getResourceSchemaForBlueprint: vi.fn(),
    getResourceSchemaForStack: vi.fn(),
  },
}));

describe('PropertySchemaService', () => {
  const mockResourceTypeId = 'resource-type-123';
  const mockCloudProviderId = 'cloud-provider-456';
  const mockUserEmail = 'test@example.com';

  const mockSchemaMap: Record<string, PropertySchema> = {
    property1: {
      id: 'schema-1',
      mappingId: 'mapping-1',
      propertyName: 'property1',
      displayName: 'Property 1',
      description: 'First property',
      dataType: 'STRING',
      required: true,
      displayOrder: 2,
    },
    property2: {
      id: 'schema-2',
      mappingId: 'mapping-1',
      propertyName: 'property2',
      displayName: 'Property 2',
      description: 'Second property',
      dataType: 'NUMBER',
      required: false,
      displayOrder: 1,
    },
    property3: {
      id: 'schema-3',
      mappingId: 'mapping-1',
      propertyName: 'property3',
      displayName: 'Property 3',
      description: 'Third property',
      dataType: 'BOOLEAN',
      required: false,
      displayOrder: 3,
    },
  };

  const mockSchemaResponse: PropertySchemaResponse = {
    resourceTypeId: mockResourceTypeId,
    resourceTypeName: 'Test Resource Type',
    cloudProviderId: mockCloudProviderId,
    cloudProviderName: 'Test Cloud Provider',
    properties: Object.values(mockSchemaMap),
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Clear the service cache
    propertySchemaService.clearCache();
  });

  describe('getSchema', () => {
    it('should fetch schema from blueprint endpoint when context is blueprint', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);

      const result = await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint',
        mockUserEmail
      );

      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledWith(
        mockResourceTypeId,
        mockCloudProviderId,
        mockUserEmail
      );
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(3);
    });

    it('should fetch schema from stack endpoint when context is stack', async () => {
      vi.mocked(apiService.getResourceSchemaForStack).mockResolvedValue(mockSchemaResponse);

      const result = await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'stack',
        mockUserEmail
      );

      expect(apiService.getResourceSchemaForStack).toHaveBeenCalledWith(
        mockResourceTypeId,
        mockCloudProviderId,
        mockUserEmail
      );
      expect(apiService.getResourceSchemaForStack).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(3);
    });

    it('should sort properties by displayOrder', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);

      const result = await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Should be sorted by displayOrder: property2 (1), property1 (2), property3 (3)
      expect(result[0].propertyName).toBe('property2');
      expect(result[1].propertyName).toBe('property1');
      expect(result[2].propertyName).toBe('property3');
    });

    it('should handle properties without displayOrder', async () => {
      const schemaWithoutOrder: Record<string, PropertySchema> = {
        prop1: {
          id: 'schema-1',
          mappingId: 'mapping-1',
          propertyName: 'prop1',
          displayName: 'Prop 1',
          dataType: 'STRING',
          required: true,
        },
        prop2: {
          id: 'schema-2',
          mappingId: 'mapping-1',
          propertyName: 'prop2',
          displayName: 'Prop 2',
          dataType: 'NUMBER',
          required: false,
          displayOrder: 1,
        },
      };

      const schemaWithoutOrderResponse: PropertySchemaResponse = {
        resourceTypeId: mockResourceTypeId,
        resourceTypeName: 'Test Resource Type',
        cloudProviderId: mockCloudProviderId,
        cloudProviderName: 'Test Cloud Provider',
        properties: Object.values(schemaWithoutOrder),
      };

      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(schemaWithoutOrderResponse);

      const result = await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Property with displayOrder should come first
      expect(result[0].propertyName).toBe('prop2');
      expect(result[1].propertyName).toBe('prop1');
    });

    it('should return empty array when API returns 404', async () => {
      const error = new Error('Failed to fetch resource schema for blueprint: 404');
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockRejectedValue(error);

      const result = await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      expect(result).toEqual([]);
    });

    it('should throw error for non-404 API failures', async () => {
      const error = new Error('Failed to fetch resource schema for blueprint: 500');
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockRejectedValue(error);

      await expect(
        propertySchemaService.getSchema(
          mockResourceTypeId,
          mockCloudProviderId,
          'blueprint'
        )
      ).rejects.toThrow('Failed to fetch resource schema for blueprint: 500');
    });
  });

  describe('caching behavior', () => {
    it('should cache schema after first fetch', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);

      // First call
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Second call with same parameters
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // API should only be called once
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(1);
    });

    it('should use separate cache for different contexts', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);
      vi.mocked(apiService.getResourceSchemaForStack).mockResolvedValue(mockSchemaResponse);

      // Call with blueprint context
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Call with stack context (same resource type and cloud provider)
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'stack'
      );

      // Both APIs should be called once each
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(1);
      expect(apiService.getResourceSchemaForStack).toHaveBeenCalledTimes(1);
    });

    it('should use separate cache for different resource types', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);

      // Call with first resource type
      await propertySchemaService.getSchema(
        'resource-type-1',
        mockCloudProviderId,
        'blueprint'
      );

      // Call with second resource type
      await propertySchemaService.getSchema(
        'resource-type-2',
        mockCloudProviderId,
        'blueprint'
      );

      // API should be called twice (different cache keys)
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(2);
    });

    it('should use separate cache for different cloud providers', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);

      // Call with first cloud provider
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        'cloud-provider-1',
        'blueprint'
      );

      // Call with second cloud provider
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        'cloud-provider-2',
        'blueprint'
      );

      // API should be called twice (different cache keys)
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(2);
    });

    it('should cache empty array for 404 responses', async () => {
      const error = new Error('Failed to fetch resource schema for blueprint: 404');
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockRejectedValue(error);

      // First call
      const result1 = await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Second call with same parameters
      const result2 = await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // API should only be called once
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(1);
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached schemas', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);

      // First call - populates cache
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Clear cache
      propertySchemaService.clearCache();

      // Second call - should fetch again
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // API should be called twice
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearSchemaCache', () => {
    it('should clear cache for specific schema', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);
      vi.mocked(apiService.getResourceSchemaForStack).mockResolvedValue(mockSchemaResponse);

      // Populate cache for blueprint
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Populate cache for stack
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'stack'
      );

      // Clear only blueprint cache
      propertySchemaService.clearSchemaCache(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Call blueprint again - should fetch
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'blueprint'
      );

      // Call stack again - should use cache
      await propertySchemaService.getSchema(
        mockResourceTypeId,
        mockCloudProviderId,
        'stack'
      );

      // Blueprint API should be called twice, stack only once
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(2);
      expect(apiService.getResourceSchemaForStack).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache key generation', () => {
    it('should generate unique cache keys for different combinations', async () => {
      vi.mocked(apiService.getResourceSchemaForBlueprint).mockResolvedValue(mockSchemaResponse);

      // Different combinations that should all result in separate cache entries
      const combinations = [
        { resourceTypeId: 'rt-1', cloudProviderId: 'cp-1', context: 'blueprint' as const },
        { resourceTypeId: 'rt-1', cloudProviderId: 'cp-2', context: 'blueprint' as const },
        { resourceTypeId: 'rt-2', cloudProviderId: 'cp-1', context: 'blueprint' as const },
        { resourceTypeId: 'rt-1', cloudProviderId: 'cp-1', context: 'stack' as const },
      ];

      for (const combo of combinations) {
        if (combo.context === 'blueprint') {
          await propertySchemaService.getSchema(
            combo.resourceTypeId,
            combo.cloudProviderId,
            combo.context
          );
        } else {
          vi.mocked(apiService.getResourceSchemaForStack).mockResolvedValue(mockSchemaResponse);
          await propertySchemaService.getSchema(
            combo.resourceTypeId,
            combo.cloudProviderId,
            combo.context
          );
        }
      }

      // Should have made 4 API calls (one for each unique combination)
      expect(apiService.getResourceSchemaForBlueprint).toHaveBeenCalledTimes(3);
      expect(apiService.getResourceSchemaForStack).toHaveBeenCalledTimes(1);
    });
  });
});
