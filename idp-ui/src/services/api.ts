import { apiCall } from '../auth';
import type { Stack, StackCreate } from '../types/stack';
import type { CloudProvider, CloudProviderCreate, CloudProviderUpdate, ResourceType, ResourceTypeCreate, ResourceTypeUpdate } from '../types/admin';

// Cloud types supported by the system
export const CLOUD_TYPES = [
  { value: 'aws', text: 'Amazon Web Services (AWS)' },
  { value: 'azure', text: 'Microsoft Azure' },
  { value: 'gcp', text: 'Google Cloud Platform (GCP)' },
] as const;

export type CloudType = typeof CLOUD_TYPES[number]['value'];

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface Environment {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface BlueprintResource {
  id?: string;
  name: string;
  description?: string;
  resourceTypeId: string;
  resourceTypeName?: string;
  cloudProviderId: string;
  cloudProviderName?: string;
  configuration: Record<string, unknown>;
  cloudSpecificProperties?: Record<string, unknown>;
}

// Backend DTO interface (for transformation)
interface BlueprintResourceBackendDto {
  id?: string;
  name: string;
  description?: string;
  blueprintResourceTypeId: string;
  blueprintResourceTypeName?: string;
  cloudType?: string;
  configuration: Record<string, unknown>;
  cloudSpecificProperties?: Record<string, unknown>;
}

// Transformation functions for BlueprintResource
function transformBlueprintResourceFromBackend(backendResource: BlueprintResourceBackendDto): BlueprintResource {
  return {
    id: backendResource.id,
    name: backendResource.name,
    description: backendResource.description,
    resourceTypeId: backendResource.blueprintResourceTypeId,
    resourceTypeName: backendResource.blueprintResourceTypeName,
    cloudProviderId: backendResource.cloudType || '',
    cloudProviderName: backendResource.cloudType,
    configuration: backendResource.configuration,
    cloudSpecificProperties: backendResource.cloudSpecificProperties,
  };
}

function transformBlueprintResourceToBackend(frontendResource: Omit<BlueprintResource, 'id'>): Omit<BlueprintResourceBackendDto, 'id'> {
  return {
    name: frontendResource.name,
    description: frontendResource.description,
    blueprintResourceTypeId: frontendResource.resourceTypeId,
    blueprintResourceTypeName: frontendResource.resourceTypeName,
    cloudType: frontendResource.cloudProviderName || frontendResource.cloudProviderId,
    configuration: frontendResource.configuration,
    cloudSpecificProperties: frontendResource.cloudSpecificProperties,
  };
}

export interface Blueprint {
  id: string;
  name: string;
  description?: string;
  blueprintTypeId?: string | null;
  blueprintTypeName?: string | null;
  configuration?: unknown;
  supportedCloudTypes: string[];
  supportedCloudProviderIds?: string[];
  resources?: BlueprintResource[];
}

export interface BlueprintCreate {
  name: string;
  description?: string;
  configuration?: unknown;
  supportedCloudTypes?: string[];
  supportedCloudProviderIds?: string[];
  resources?: Omit<BlueprintResource, 'id'>[];
}



export interface Team {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StackCollection {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Domain {
  id: string;
  name: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  domain: { id: string } | string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}


export const apiService = {
  // Get all projects
  async getProjects(userEmail?: string): Promise<Project[]> {
    try {
      const response = await apiCall('/projects', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch projects: ${response.status}`);
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  // Get all environments
  async getEnvironments(userEmail?: string): Promise<Environment[]> {
    try {
      const response = await apiCall('/environments', {}, userEmail);
      if (response.ok) {
        const raw = await response.json();
        // Map API response (EnvironmentEntity) to UI Environment type
        return (raw as Array<{ id: string; name: string; description?: string; isActive?: boolean }>).map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          status: e.isActive === false ? 'inactive' : 'active',
        }));
      }
      throw new Error(`Failed to fetch environments: ${response.status}`);
    } catch (error) {
      console.error('Error fetching environments:', error);
      throw error;
    }
  },

  // Get all blueprints
  async getBlueprints(userEmail?: string): Promise<Blueprint[]> {
    try {
      const response = await apiCall('/blueprints', {}, userEmail);
      if (response.ok) {
        const raw = await response.json();
        return (raw as Array<{
          id: string; 
          name: string; 
          description?: string; 
          blueprintTypeId?: string; 
          blueprintTypeName?: string; 
          configuration?: unknown; 
          supportedCloudTypes?: string[];
          resources?: BlueprintResourceBackendDto[];
        }>).map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          blueprintTypeId: b.blueprintTypeId ?? null,
          blueprintTypeName: b.blueprintTypeName ?? null,
          configuration: b.configuration,
          supportedCloudTypes: b.supportedCloudTypes ?? [],
          resources: b.resources?.map(transformBlueprintResourceFromBackend),
        }));
      }
      throw new Error(`Failed to fetch blueprints: ${response.status}`);
    } catch (error) {
      console.error('Error fetching blueprints:', error);
      throw error;
    }
  },

  async createBlueprint(payload: BlueprintCreate, userEmail?: string): Promise<Blueprint> {
    try {
      // Transform resources to backend format
      const backendPayload = {
        ...payload,
        resources: payload.resources?.map(transformBlueprintResourceToBackend),
      };
      const response = await apiCall('/blueprints', { method: 'POST', body: JSON.stringify(backendPayload) }, userEmail);
      if (response.ok) {
        const result = await response.json();
        // Transform response resources back to frontend format
        if (result.resources) {
          result.resources = result.resources.map(transformBlueprintResourceFromBackend);
        }
        return result;
      }
      throw new Error(`Failed to create blueprint: ${response.status}`);
    } catch (error) {
      console.error('Error creating blueprint:', error);
      throw error;
    }
  },

  async updateBlueprint(id: string, payload: BlueprintCreate, userEmail?: string): Promise<Blueprint> {
    try {
      // Transform resources to backend format
      const backendPayload = {
        ...payload,
        resources: payload.resources?.map(transformBlueprintResourceToBackend),
      };
      console.log('Sending to backend:', JSON.stringify(backendPayload, null, 2));
      const response = await apiCall(`/blueprints/${id}`, { method: 'PUT', body: JSON.stringify(backendPayload) }, userEmail);
      if (response.ok) {
        const result = await response.json();
        // Transform response resources back to frontend format
        if (result.resources) {
          result.resources = result.resources.map(transformBlueprintResourceFromBackend);
        }
        return result;
      }
      // Try to get error details from response
      let errorMessage = `Failed to update blueprint: ${response.status}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          console.error('Server error response:', errorBody);
          errorMessage += ` - ${errorBody}`;
        }
      } catch (e) {
        // Ignore if we can't read the error body
      }
      throw new Error(errorMessage);
    } catch (error) {
      console.error('Error updating blueprint:', error);
      throw error;
    }
  },

  async deleteBlueprint(id: string, userEmail?: string): Promise<void> {
    try {
      const response = await apiCall(`/blueprints/${id}`, { method: 'DELETE' }, userEmail);
      if (!response.ok) throw new Error(`Failed to delete blueprint: ${response.status}`);
    } catch (error) {
      console.error('Error deleting blueprint:', error);
      throw error;
    }
  },


  // Get current user info (already handled in auth.ts, but included for completeness)
  async getCurrentUser() {
    try {
      const response = await apiCall('/user/me');
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch user info: ${response.status}`);
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  },

  // Example of a POST request
  async createProject(project: Omit<Project, 'id' | 'createdAt'>, userEmail?: string): Promise<Project> {
    try {
      const response = await apiCall('/projects', {
        method: 'POST',
        body: JSON.stringify(project),
      }, userEmail);

      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create project: ${response.status}`);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Health check endpoint
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await apiCall('/health');
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Health check failed: ${response.status}`);
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  },

  // Stack operations
  async getStacks(userEmail?: string): Promise<Stack[]> {

    try {
      const response = await apiCall('/stacks', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch stacks: ${response.status}`);
    } catch (error) {
      console.error('Error fetching stacks:', error);
      throw error;
    }
  },

  // Collections
  async getCollections(userEmail?: string): Promise<StackCollection[]> {
    const response = await apiCall('/stack-collections', {}, userEmail);
    if (!response.ok) throw new Error(`Failed to fetch collections: ${response.status}`);
    return await response.json();
  },

  async getCollectionStacks(collectionId: string, userEmail?: string): Promise<Stack[]> {
    const response = await apiCall(`/stack-collections/${collectionId}/stacks`, {}, userEmail);
    if (!response.ok) throw new Error(`Failed to fetch collection stacks: ${response.status}`);
    return await response.json();
  },

  // Teams
  async getTeams(userEmail?: string): Promise<Team[]> {
    const response = await apiCall('/teams', {}, userEmail);
    if (!response.ok) throw new Error(`Failed to fetch teams: ${response.status}`);
    return await response.json();
  },

  async getTeamStacks(teamId: string, userEmail?: string): Promise<Stack[]> {
    const response = await apiCall(`/teams/${teamId}/stacks`, {}, userEmail);
    if (!response.ok) throw new Error(`Failed to fetch team stacks: ${response.status}`);
    return await response.json();
  },

  // Domains & Categories
  async getDomains(userEmail?: string) {
    const response = await apiCall('/domains', {}, userEmail);
    if (!response.ok) throw new Error(`Failed to fetch domains: ${response.status}`);
    return await response.json();
  },

  async getDomainCategories(domainId: string, userEmail?: string) {
    const response = await apiCall(`/domains/${domainId}/categories`, {}, userEmail);
    if (!response.ok) throw new Error(`Failed to fetch domain categories: ${response.status}`);
    return await response.json();
  },

  async getCategories(userEmail?: string) {
    const response = await apiCall('/categories', {}, userEmail);
    if (!response.ok) throw new Error(`Failed to fetch categories: ${response.status}`);
    return await response.json();
  },

  async getStackById(id: string): Promise<Stack> {

    try {
      const response = await apiCall(`/stacks/${id}`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch stack: ${response.status}`);
    } catch (error) {
      console.error('Error fetching stack:', error);
      throw error;
    }
  },

  async createStack(stack: StackCreate, userEmail?: string): Promise<Stack> {

    try {
      const response = await apiCall('/stacks', {
        method: 'POST',
        body: JSON.stringify(stack),
      }, userEmail);

      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create stack: ${response.status}`);
    } catch (error) {
      console.error('Error creating stack:', error);
      throw error;
    }
  },

  async updateStack(id: string, stack: StackCreate, userEmail?: string): Promise<Stack> {

    try {
      const response = await apiCall(`/stacks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(stack),
      }, userEmail);

      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to update stack: ${response.status}`);
    } catch (error) {
      console.error('Error updating stack:', error);
      throw error;
    }
  },

  async deleteStack(id: string, userEmail?: string): Promise<void> {

    try {
      const response = await apiCall(`/stacks/${id}`, {
        method: 'DELETE',
      }, userEmail);

      if (!response.ok) {
        throw new Error(`Failed to delete stack: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting stack:', error);
      throw error;
    }
  },

  // Stack - Available Cloud Providers and Resource Types
  async getAvailableCloudProvidersForStacks(userEmail?: string): Promise<CloudProvider[]> {
    try {
      const response = await apiCall('/stacks/available-cloud-providers', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch available cloud providers: ${response.status}`);
    } catch (error) {
      console.error('Error fetching available cloud providers:', error);
      throw error;
    }
  },

  async getAvailableResourceTypesForStacks(userEmail?: string): Promise<ResourceType[]> {
    try {
      const response = await apiCall('/stacks/available-resource-types', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch available resource types: ${response.status}`);
    } catch (error) {
      console.error('Error fetching available resource types:', error);
      throw error;
    }
  },

  async getResourceSchemaForStack(resourceTypeId: string, cloudProviderId: string, userEmail?: string): Promise<import('../types/admin').PropertySchemaResponse> {
    try {
      const response = await apiCall(`/stacks/resource-schema/${resourceTypeId}/${cloudProviderId}`, {}, userEmail);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Handle 404 - no schema defined
      if (response.status === 404) {
        throw new Error('No property schema is defined for this resource type and cloud provider combination');
      }
      
      // Handle 500 - server error
      if (response.status === 500) {
        throw new Error('Server error while fetching property schema. Please try again later');
      }
      
      // Handle other errors
      throw new Error(`Failed to fetch resource schema: ${response.status}`);
    } catch (error) {
      console.error('Error fetching resource schema:', error);
      throw error;
    }
  },

  // Blueprint - Available Cloud Providers and Resource Types
  async getAvailableCloudProvidersForBlueprints(userEmail?: string): Promise<CloudProvider[]> {
    try {
      const response = await apiCall('/blueprints/available-cloud-providers', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch available cloud providers for blueprints: ${response.status}`);
    } catch (error) {
      console.error('Error fetching available cloud providers for blueprints:', error);
      throw error;
    }
  },

  async getAvailableResourceTypesForBlueprints(userEmail?: string): Promise<ResourceType[]> {
    try {
      const response = await apiCall('/blueprints/available-resource-types', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch available resource types for blueprints: ${response.status}`);
    } catch (error) {
      console.error('Error fetching available resource types for blueprints:', error);
      throw error;
    }
  },

  async getResourceSchemaForBlueprint(resourceTypeId: string, cloudProviderId: string, userEmail?: string): Promise<import('../types/admin').PropertySchemaResponse> {
    try {
      const response = await apiCall(`/blueprints/resource-schema/${resourceTypeId}/${cloudProviderId}`, {}, userEmail);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Handle 404 - no schema defined
      if (response.status === 404) {
        throw new Error('No property schema is defined for this resource type and cloud provider combination');
      }
      
      // Handle 500 - server error
      if (response.status === 500) {
        throw new Error('Server error while fetching property schema. Please try again later');
      }
      
      // Handle other errors
      throw new Error(`Failed to fetch resource schema for blueprint: ${response.status}`);
    } catch (error) {
      console.error('Error fetching resource schema for blueprint:', error);
      throw error;
    }
  },



  // Admin - Cloud Providers
  async getCloudProviders(userEmail?: string): Promise<CloudProvider[]> {
    try {
      const response = await apiCall('/admin/cloud-providers', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch cloud providers: ${response.status}`);
    } catch (error) {
      console.error('Error fetching cloud providers:', error);
      throw error;
    }
  },

  async getCloudProviderById(id: string, userEmail?: string): Promise<CloudProvider> {
    try {
      const response = await apiCall(`/admin/cloud-providers/${id}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch cloud provider: ${response.status}`);
    } catch (error) {
      console.error('Error fetching cloud provider:', error);
      throw error;
    }
  },

  async createCloudProvider(payload: CloudProviderCreate, userEmail?: string): Promise<CloudProvider> {
    try {
      const response = await apiCall('/admin/cloud-providers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create cloud provider: ${response.status}`);
    } catch (error) {
      console.error('Error creating cloud provider:', error);
      throw error;
    }
  },

  async updateCloudProvider(id: string, payload: CloudProviderUpdate, userEmail?: string): Promise<CloudProvider> {
    try {
      const response = await apiCall(`/admin/cloud-providers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to update cloud provider: ${response.status}`);
    } catch (error) {
      console.error('Error updating cloud provider:', error);
      throw error;
    }
  },

  async toggleCloudProvider(id: string, enabled: boolean, userEmail?: string): Promise<void> {
    try {
      const response = await apiCall(`/admin/cloud-providers/${id}/toggle?enabled=${enabled}`, {
        method: 'PUT',
      }, userEmail);
      if (!response.ok) {
        throw new Error(`Failed to toggle cloud provider: ${response.status}`);
      }
    } catch (error) {
      console.error('Error toggling cloud provider:', error);
      throw error;
    }
  },

  async getEnabledCloudProviders(userEmail?: string): Promise<CloudProvider[]> {
    try {
      const response = await apiCall('/admin/cloud-providers/enabled', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch enabled cloud providers: ${response.status}`);
    } catch (error) {
      console.error('Error fetching enabled cloud providers:', error);
      throw error;
    }
  },

  // Admin - Resource Types
  async getResourceTypes(userEmail?: string): Promise<ResourceType[]> {
    try {
      const response = await apiCall('/admin/resource-types', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch resource types: ${response.status}`);
    } catch (error) {
      console.error('Error fetching resource types:', error);
      throw error;
    }
  },

  async getResourceTypeById(id: string, userEmail?: string): Promise<ResourceType> {
    try {
      const response = await apiCall(`/admin/resource-types/${id}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch resource type: ${response.status}`);
    } catch (error) {
      console.error('Error fetching resource type:', error);
      throw error;
    }
  },

  async createResourceType(payload: ResourceTypeCreate, userEmail?: string): Promise<ResourceType> {
    try {
      const response = await apiCall('/admin/resource-types', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create resource type: ${response.status}`);
    } catch (error) {
      console.error('Error creating resource type:', error);
      throw error;
    }
  },

  async updateResourceType(id: string, payload: ResourceTypeUpdate, userEmail?: string): Promise<ResourceType> {
    try {
      const response = await apiCall(`/admin/resource-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to update resource type: ${response.status}`);
    } catch (error) {
      console.error('Error updating resource type:', error);
      throw error;
    }
  },

  async toggleResourceType(id: string, enabled: boolean, userEmail?: string): Promise<void> {
    try {
      const response = await apiCall(`/admin/resource-types/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }, userEmail);
      if (!response.ok) {
        throw new Error(`Failed to toggle resource type: ${response.status}`);
      }
    } catch (error) {
      console.error('Error toggling resource type:', error);
      throw error;
    }
  },

  async getResourceTypesByCategory(category: import('../types/admin').ResourceCategory, userEmail?: string): Promise<ResourceType[]> {
    try {
      const response = await apiCall(`/admin/resource-types/category/${category}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch resource types by category: ${response.status}`);
    } catch (error) {
      console.error('Error fetching resource types by category:', error);
      throw error;
    }
  },

  // Admin - Resource Type Cloud Mappings
  async getResourceTypeCloudMappings(userEmail?: string): Promise<import('../types/admin').ResourceTypeCloudMapping[]> {
    try {
      const response = await apiCall('/admin/resource-type-cloud-mappings', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch resource type cloud mappings: ${response.status}`);
    } catch (error) {
      console.error('Error fetching resource type cloud mappings:', error);
      throw error;
    }
  },

  async getResourceTypeCloudMappingById(id: string, userEmail?: string): Promise<import('../types/admin').ResourceTypeCloudMapping> {
    try {
      const response = await apiCall(`/admin/resource-type-cloud-mappings/${id}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch resource type cloud mapping: ${response.status}`);
    } catch (error) {
      console.error('Error fetching resource type cloud mapping:', error);
      throw error;
    }
  },

  async createResourceTypeCloudMapping(payload: import('../types/admin').ResourceTypeCloudMappingCreate, userEmail?: string): Promise<import('../types/admin').ResourceTypeCloudMapping> {
    try {
      const response = await apiCall('/admin/resource-type-cloud-mappings', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create resource type cloud mapping: ${response.status}`);
    } catch (error) {
      console.error('Error creating resource type cloud mapping:', error);
      throw error;
    }
  },

  async updateResourceTypeCloudMapping(id: string, payload: import('../types/admin').ResourceTypeCloudMappingUpdate, userEmail?: string): Promise<import('../types/admin').ResourceTypeCloudMapping> {
    try {
      const response = await apiCall(`/admin/resource-type-cloud-mappings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to update resource type cloud mapping: ${response.status}`);
    } catch (error) {
      console.error('Error updating resource type cloud mapping:', error);
      throw error;
    }
  },

  async toggleResourceTypeCloudMapping(id: string, enabled: boolean, userEmail?: string): Promise<void> {
    try {
      const response = await apiCall(`/admin/resource-type-cloud-mappings/${id}/toggle?enabled=${enabled}`, {
        method: 'PATCH',
      }, userEmail);
      if (!response.ok) {
        throw new Error(`Failed to toggle resource type cloud mapping: ${response.status}`);
      }
    } catch (error) {
      console.error('Error toggling resource type cloud mapping:', error);
      throw error;
    }
  },

  async getMappingsByResourceType(resourceTypeId: string, userEmail?: string): Promise<import('../types/admin').ResourceTypeCloudMapping[]> {
    try {
      const response = await apiCall(`/admin/resource-type-cloud-mappings/resource-type/${resourceTypeId}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch mappings by resource type: ${response.status}`);
    } catch (error) {
      console.error('Error fetching mappings by resource type:', error);
      throw error;
    }
  },

  async getMappingsByCloudProvider(cloudProviderId: string, userEmail?: string): Promise<import('../types/admin').ResourceTypeCloudMapping[]> {
    try {
      const response = await apiCall(`/admin/resource-type-cloud-mappings/cloud-provider/${cloudProviderId}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch mappings by cloud provider: ${response.status}`);
    } catch (error) {
      console.error('Error fetching mappings by cloud provider:', error);
      throw error;
    }
  },

  // Admin - Property Schemas
  async getPropertySchemasByMapping(mappingId: string, userEmail?: string): Promise<import('../types/admin').PropertySchema[]> {
    try {
      const response = await apiCall(`/admin/property-schemas/mapping/${mappingId}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch property schemas: ${response.status}`);
    } catch (error) {
      console.error('Error fetching property schemas:', error);
      throw error;
    }
  },

  async getPropertySchemaById(id: string, userEmail?: string): Promise<import('../types/admin').PropertySchema> {
    try {
      const response = await apiCall(`/admin/property-schemas/${id}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch property schema: ${response.status}`);
    } catch (error) {
      console.error('Error fetching property schema:', error);
      throw error;
    }
  },

  async createPropertySchema(payload: import('../types/admin').PropertySchemaCreate, userEmail?: string): Promise<import('../types/admin').PropertySchema> {
    try {
      const response = await apiCall('/admin/property-schemas', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create property schema: ${response.status}`);
    } catch (error) {
      console.error('Error creating property schema:', error);
      throw error;
    }
  },

  async bulkCreatePropertySchemas(mappingId: string, schemas: Omit<import('../types/admin').PropertySchemaCreate, 'mappingId'>[], userEmail?: string): Promise<import('../types/admin').PropertySchema[]> {
    try {
      const response = await apiCall('/admin/property-schemas/bulk', {
        method: 'POST',
        body: JSON.stringify({ mappingId, schemas }),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to bulk create property schemas: ${response.status}`);
    } catch (error) {
      console.error('Error bulk creating property schemas:', error);
      throw error;
    }
  },

  async updatePropertySchema(id: string, payload: import('../types/admin').PropertySchemaUpdate, userEmail?: string): Promise<import('../types/admin').PropertySchema> {
    try {
      const response = await apiCall(`/admin/property-schemas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to update property schema: ${response.status}`);
    } catch (error) {
      console.error('Error updating property schema:', error);
      throw error;
    }
  },

  async deletePropertySchema(id: string, userEmail?: string): Promise<void> {
    try {
      const response = await apiCall(`/admin/property-schemas/${id}`, {
        method: 'DELETE',
      }, userEmail);
      if (!response.ok) {
        throw new Error(`Failed to delete property schema: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting property schema:', error);
      throw error;
    }
  },

  // Admin - Dashboard
  async getAdminDashboard(userEmail?: string): Promise<import('../types/admin').AdminDashboard> {
    try {
      const response = await apiCall('/admin/dashboard', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch admin dashboard: ${response.status}`);
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      throw error;
    }
  },

  async getIncompleteMappings(userEmail?: string): Promise<import('../types/admin').ResourceTypeCloudMapping[]> {
    try {
      const response = await apiCall('/admin/dashboard/incomplete-mappings', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch incomplete mappings: ${response.status}`);
    } catch (error) {
      console.error('Error fetching incomplete mappings:', error);
      throw error;
    }
  },

  async getAdminStatistics(userEmail?: string): Promise<Record<string, number>> {
    try {
      const response = await apiCall('/admin/dashboard/statistics', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch admin statistics: ${response.status}`);
    } catch (error) {
      console.error('Error fetching admin statistics:', error);
      throw error;
    }
  },

  // API Keys
  async getUserApiKeys(userEmail?: string): Promise<import('../types/apiKey').ApiKeyResponse[]> {
    try {
      const response = await apiCall('/api-keys/user', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch user API keys: ${response.status}`);
    } catch (error) {
      console.error('Error fetching user API keys:', error);
      throw error;
    }
  },

  async getAllApiKeys(userEmail?: string): Promise<import('../types/apiKey').ApiKeyResponse[]> {
    try {
      const response = await apiCall('/api-keys/all', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch all API keys: ${response.status}`);
    } catch (error) {
      console.error('Error fetching all API keys:', error);
      throw error;
    }
  },

  async getApiKeyById(id: string, userEmail?: string): Promise<import('../types/apiKey').ApiKeyResponse> {
    try {
      const response = await apiCall(`/api-keys/${id}`, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch API key: ${response.status}`);
    } catch (error) {
      console.error('Error fetching API key:', error);
      throw error;
    }
  },

  async createUserApiKey(payload: import('../types/apiKey').ApiKeyCreate, userEmail?: string): Promise<import('../types/apiKey').ApiKeyCreated> {
    try {
      const response = await apiCall('/api-keys/user', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create user API key: ${response.status}`);
    } catch (error) {
      console.error('Error creating user API key:', error);
      throw error;
    }
  },

  async createSystemApiKey(payload: import('../types/apiKey').ApiKeyCreate, userEmail?: string): Promise<import('../types/apiKey').ApiKeyCreated> {
    try {
      const response = await apiCall('/api-keys/system', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to create system API key: ${response.status}`);
    } catch (error) {
      console.error('Error creating system API key:', error);
      throw error;
    }
  },

  async rotateApiKey(id: string, userEmail?: string): Promise<import('../types/apiKey').ApiKeyCreated> {
    try {
      const response = await apiCall(`/api-keys/${id}/rotate`, {
        method: 'POST',
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to rotate API key: ${response.status}`);
    } catch (error) {
      console.error('Error rotating API key:', error);
      throw error;
    }
  },

  async revokeApiKey(id: string, userEmail?: string): Promise<void> {
    try {
      const response = await apiCall(`/api-keys/${id}`, {
        method: 'DELETE',
      }, userEmail);
      if (!response.ok) {
        throw new Error(`Failed to revoke API key: ${response.status}`);
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
      throw error;
    }
  },

  async updateApiKeyName(id: string, newName: string, userEmail?: string): Promise<import('../types/apiKey').ApiKeyResponse> {
    try {
      const response = await apiCall(`/api-keys/${id}/name`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      }, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to update API key name: ${response.status}`);
    } catch (error) {
      console.error('Error updating API key name:', error);
      throw error;
    }
  },

  async getApiKeyAuditLogs(userEmail?: string, startDate?: string, endDate?: string): Promise<import('../types/apiKey').ApiKeyAuditLog[]> {
    try {
      const params = new URLSearchParams();
      if (userEmail) params.append('userEmail', userEmail);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api-keys/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiCall(url, {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch API key audit logs: ${response.status}`);
    } catch (error) {
      console.error('Error fetching API key audit logs:', error);
      throw error;
    }
  },
};
