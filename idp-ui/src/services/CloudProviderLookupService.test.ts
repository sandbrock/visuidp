import { describe, it, expect, beforeEach } from 'vitest';
import CloudProviderLookupService from './CloudProviderLookupService';
import type { CloudProvider } from '../types/admin';

describe('CloudProviderLookupService', () => {
  let service: CloudProviderLookupService;

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
    {
      id: 'uuid-gcp-789',
      name: 'GCP',
      displayName: 'Google Cloud Platform',
      description: 'GCP cloud provider',
      enabled: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    // Get singleton instance and clear it before each test
    service = CloudProviderLookupService.getInstance();
    service.clear();
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton pattern)', () => {
      const instance1 = CloudProviderLookupService.getInstance();
      const instance2 = CloudProviderLookupService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize with cloud providers', () => {
      service.initialize(mockCloudProviders);
      
      expect(service.isInitialized()).toBe(true);
    });

    it('should build cloud type to UUID mapping', () => {
      service.initialize(mockCloudProviders);
      
      expect(service.resolveCloudProviderId('AWS')).toBe('uuid-aws-123');
      expect(service.resolveCloudProviderId('Azure')).toBe('uuid-azure-456');
      expect(service.resolveCloudProviderId('GCP')).toBe('uuid-gcp-789');
    });

    it('should clear previous mappings when re-initialized', () => {
      // First initialization
      service.initialize(mockCloudProviders);
      expect(service.resolveCloudProviderId('AWS')).toBe('uuid-aws-123');
      
      // Re-initialize with different providers
      const newProviders: CloudProvider[] = [
        {
          id: 'uuid-new-aws',
          name: 'AWS',
          displayName: 'New AWS',
          enabled: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      service.initialize(newProviders);
      expect(service.resolveCloudProviderId('AWS')).toBe('uuid-new-aws');
      expect(service.resolveCloudProviderId('Azure')).toBeNull();
    });
  });

  describe('resolveCloudProviderId', () => {
    beforeEach(() => {
      service.initialize(mockCloudProviders);
    });

    it('should resolve cloud type to UUID (exact case match)', () => {
      expect(service.resolveCloudProviderId('AWS')).toBe('uuid-aws-123');
      expect(service.resolveCloudProviderId('Azure')).toBe('uuid-azure-456');
      expect(service.resolveCloudProviderId('GCP')).toBe('uuid-gcp-789');
    });

    it('should resolve cloud type to UUID (lowercase)', () => {
      expect(service.resolveCloudProviderId('aws')).toBe('uuid-aws-123');
      expect(service.resolveCloudProviderId('azure')).toBe('uuid-azure-456');
      expect(service.resolveCloudProviderId('gcp')).toBe('uuid-gcp-789');
    });

    it('should resolve cloud type to UUID (uppercase)', () => {
      expect(service.resolveCloudProviderId('AWS')).toBe('uuid-aws-123');
      expect(service.resolveCloudProviderId('AZURE')).toBe('uuid-azure-456');
      expect(service.resolveCloudProviderId('GCP')).toBe('uuid-gcp-789');
    });

    it('should resolve cloud type to UUID (mixed case)', () => {
      expect(service.resolveCloudProviderId('AwS')).toBe('uuid-aws-123');
      expect(service.resolveCloudProviderId('aZuRe')).toBe('uuid-azure-456');
      expect(service.resolveCloudProviderId('GcP')).toBe('uuid-gcp-789');
    });

    it('should return null for unknown cloud type', () => {
      expect(service.resolveCloudProviderId('UnknownCloud')).toBeNull();
      expect(service.resolveCloudProviderId('IBM')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(service.resolveCloudProviderId('')).toBeNull();
    });

    it('should return null when not initialized', () => {
      service.clear();
      expect(service.resolveCloudProviderId('AWS')).toBeNull();
    });
  });

  describe('resolveCloudType', () => {
    beforeEach(() => {
      service.initialize(mockCloudProviders);
    });

    it('should resolve UUID to cloud type string', () => {
      expect(service.resolveCloudType('uuid-aws-123')).toBe('AWS');
      expect(service.resolveCloudType('uuid-azure-456')).toBe('Azure');
      expect(service.resolveCloudType('uuid-gcp-789')).toBe('GCP');
    });

    it('should return null for unknown UUID', () => {
      expect(service.resolveCloudType('uuid-unknown')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(service.resolveCloudType('')).toBeNull();
    });

    it('should return null when not initialized', () => {
      service.clear();
      expect(service.resolveCloudType('uuid-aws-123')).toBeNull();
    });
  });

  describe('getCloudProviderById', () => {
    beforeEach(() => {
      service.initialize(mockCloudProviders);
    });

    it('should return full cloud provider object by UUID', () => {
      const provider = service.getCloudProviderById('uuid-aws-123');
      
      expect(provider).not.toBeNull();
      expect(provider?.id).toBe('uuid-aws-123');
      expect(provider?.name).toBe('AWS');
      expect(provider?.displayName).toBe('Amazon Web Services');
    });

    it('should return null for unknown UUID', () => {
      expect(service.getCloudProviderById('uuid-unknown')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(service.getCloudProviderById('')).toBeNull();
    });

    it('should return null when not initialized', () => {
      service.clear();
      expect(service.getCloudProviderById('uuid-aws-123')).toBeNull();
    });
  });

  describe('isInitialized', () => {
    it('should return false when not initialized', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true after initialization', () => {
      service.initialize(mockCloudProviders);
      expect(service.isInitialized()).toBe(true);
    });

    it('should return false after clearing', () => {
      service.initialize(mockCloudProviders);
      service.clear();
      expect(service.isInitialized()).toBe(false);
    });

    it('should return false when initialized with empty array', () => {
      service.initialize([]);
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all cached data', () => {
      service.initialize(mockCloudProviders);
      
      // Verify data exists
      expect(service.isInitialized()).toBe(true);
      expect(service.resolveCloudProviderId('AWS')).toBe('uuid-aws-123');
      
      // Clear
      service.clear();
      
      // Verify data is cleared
      expect(service.isInitialized()).toBe(false);
      expect(service.resolveCloudProviderId('AWS')).toBeNull();
      expect(service.resolveCloudType('uuid-aws-123')).toBeNull();
      expect(service.getCloudProviderById('uuid-aws-123')).toBeNull();
    });

    it('should allow re-initialization after clearing', () => {
      service.initialize(mockCloudProviders);
      service.clear();
      
      const newProviders: CloudProvider[] = [
        {
          id: 'uuid-new-provider',
          name: 'NewCloud',
          displayName: 'New Cloud Provider',
          enabled: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      
      service.initialize(newProviders);
      
      expect(service.isInitialized()).toBe(true);
      expect(service.resolveCloudProviderId('NewCloud')).toBe('uuid-new-provider');
    });
  });

  describe('bidirectional mapping', () => {
    beforeEach(() => {
      service.initialize(mockCloudProviders);
    });

    it('should maintain bidirectional mapping between cloud type and UUID', () => {
      // Forward: cloud type -> UUID
      const uuid = service.resolveCloudProviderId('AWS');
      expect(uuid).toBe('uuid-aws-123');
      
      // Reverse: UUID -> cloud type
      const cloudType = service.resolveCloudType(uuid!);
      expect(cloudType).toBe('AWS');
    });

    it('should work for all providers', () => {
      mockCloudProviders.forEach(provider => {
        // Forward lookup
        const resolvedId = service.resolveCloudProviderId(provider.name);
        expect(resolvedId).toBe(provider.id);
        
        // Reverse lookup
        const resolvedName = service.resolveCloudType(provider.id);
        expect(resolvedName).toBe(provider.name);
        
        // Full object lookup
        const fullProvider = service.getCloudProviderById(provider.id);
        expect(fullProvider).toEqual(provider);
      });
    });
  });
});
