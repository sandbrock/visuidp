import { apiCall } from '../auth';
import type { Stack, StackCreate } from '../types/stack';
import type { CloudProvider, CloudProviderCreate, CloudProviderUpdate, ResourceType, ResourceTypeCreate, ResourceTypeUpdate } from '../types/admin';
import CloudProviderLookupService from './CloudProviderLookupService';

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
/**
 * Transforms a blueprint resource from backend DTO format to frontend format.
 * 
 * Cloud Provider ID Resolution:
 * - Backend sends cloud type as a string (e.g., "AWS", "azure", "gcp")
 * - Frontend needs cloud provider UUID to fetch property schemas
 * - This function resolves the cloud type string to the corresponding UUID
 * 
 * Resolution Process:
 * 1. Check if backend resource has a cloudType field
 * 2. Use CloudProviderLookupService to resolve cloud type string to UUID
 * 3. Resolution is case-insensitive (e.g., "AWS", "aws", "Aws" all resolve to same UUID)
 * 4. If resolution succeeds, set cloudProviderId to the UUID
 * 5. If resolution fails, log warning and set cloudProviderId to empty string
 * 
 * Backward Compatibility:
 * - If cloudProviderLookup service is not provided, cloudProviderId defaults to empty string
 * - cloudProviderName field preserves the original cloud type string for display purposes
 * - This allows the form to continue functioning even if resolution fails
 * 
 * Error Handling:
 * - Unknown cloud types: Logs warning, sets empty cloudProviderId, form shows "no schema" message
 * - Missing cloudType: Sets empty cloudProviderId, no warning (valid for resources without cloud provider)
 * - Missing lookup service: Sets empty cloudProviderId, no warning (backward compatibility mode)
 * 
 * @param backendResource - The blueprint resource DTO from the backend API
 * @param cloudProviderLookup - Optional lookup service for cloud type to UUID resolution
 * @returns Frontend blueprint resource with resolved cloud provider UUID
 */
export function transformBlueprintResourceFromBackend(
  backendResource: BlueprintResourceBackendDto,
  cloudProviderLookup?: CloudProviderLookupService
): BlueprintResource {
  // Initialize cloudProviderId to empty string (safe default for all error cases)
  let cloudProviderId = '';
  
  // Attempt cloud type to UUID resolution if both cloudType and lookup service are available
  if (backendResource.cloudType && cloudProviderLookup) {
    // Resolve cloud type string (e.g., "AWS") to cloud provider UUID
    // Resolution is case-insensitive and uses in-memory cache for performance
    const resolvedId = cloudProviderLookup.resolveCloudProviderId(backendResource.cloudType);
    
    if (resolvedId) {
      // Resolution successful - use the UUID for property schema fetching
      cloudProviderId = resolvedId;
    } else {
      // Resolution failed - cloud type doesn't match any loaded cloud provider
      // This can happen if:
      // 1. Cloud provider was deleted but blueprint still references it
      // 2. Cloud type string has a typo or invalid format
      // 3. Cloud providers haven't been loaded yet (race condition)
      console.warn(
        `[CloudProviderResolution] Could not resolve cloud type "${backendResource.cloudType}" to a cloud provider UUID. ` +
        `Resource "${backendResource.name}" will have an empty cloudProviderId. ` +
        `This may cause issues when loading cloud-specific properties.`
      );
      // cloudProviderId remains empty string - DynamicResourceForm will show "no schema" message
    }
  }
  // If cloudType is missing or lookup service not provided, cloudProviderId stays empty (backward compatibility)
  
  return {
    id: backendResource.id,
    name: backendResource.name,
    description: backendResource.description,
    resourceTypeId: backendResource.blueprintResourceTypeId,
    resourceTypeName: backendResource.blueprintResourceTypeName,
    // cloudProviderId: Resolved UUID for property schema API calls
    cloudProviderId: cloudProviderId,
    // cloudProviderName: Original cloud type string preserved for display and backward compatibility
    cloudProviderName: backendResource.cloudType,
    configuration: backendResource.configuration,
    cloudSpecificProperties: backendResource.cloudSpecificProperties,
  };
}

/**
 * Transforms a blueprint resource from frontend format to backend DTO format.
 * 
 * Cloud Provider UUID to Cloud Type Resolution:
 * - Frontend uses cloud provider UUID for property schema fetching
 * - Backend expects cloud type as a string (e.g., "AWS", "azure", "gcp")
 * - This function performs reverse resolution from UUID back to cloud type string
 * 
 * Resolution Process:
 * 1. First, try to use cloudProviderName if available (most efficient, no lookup needed)
 * 2. If cloudProviderName is missing, resolve cloudProviderId UUID to cloud type string
 * 3. Use CloudProviderLookupService for reverse lookup (UUID → cloud type)
 * 4. If resolution fails, fallback to using UUID directly (backward compatibility)
 * 
 * Backward Compatibility:
 * - Prioritizes cloudProviderName field to avoid unnecessary lookups
 * - Falls back to UUID if resolution fails (backend may accept UUIDs in some cases)
 * - Handles missing lookup service gracefully by using UUID as fallback
 * - Maintains backend API contract by always sending cloudType field
 * 
 * Error Handling:
 * - Missing cloudProviderName and cloudProviderId: Sets empty string (valid for resources without cloud provider)
 * - UUID resolution fails: Logs warning, uses UUID as fallback to maintain data integrity
 * - Missing lookup service: Uses UUID as fallback, no warning (backward compatibility mode)
 * 
 * @param frontendResource - The blueprint resource from frontend state
 * @param cloudProviderLookup - Optional lookup service for UUID to cloud type resolution
 * @returns Backend blueprint resource DTO with cloud type string
 */
export function transformBlueprintResourceToBackend(
  frontendResource: Omit<BlueprintResource, 'id'>,
  cloudProviderLookup?: CloudProviderLookupService
): Omit<BlueprintResourceBackendDto, 'id'> {
  // Initialize cloudType to empty string (safe default)
  let cloudType = '';
  
  // Strategy 1: Use cloudProviderName if available (most efficient, no lookup needed)
  // cloudProviderName contains the original cloud type string from backend
  if (frontendResource.cloudProviderName) {
    cloudType = frontendResource.cloudProviderName;
  }
  // Strategy 2: Resolve UUID to cloud type string if cloudProviderName is missing
  else if (frontendResource.cloudProviderId) {
    if (cloudProviderLookup) {
      // Attempt reverse resolution: UUID → cloud type string
      // This uses the same in-memory cache as forward resolution
      const resolvedCloudType = cloudProviderLookup.resolveCloudType(frontendResource.cloudProviderId);
      
      if (resolvedCloudType) {
        // Resolution successful - use the cloud type string
        cloudType = resolvedCloudType;
      } else {
        // Resolution failed - UUID doesn't match any loaded cloud provider
        // This can happen if:
        // 1. Cloud provider was deleted after resource was loaded
        // 2. UUID is invalid or corrupted
        // 3. Cloud providers cache was cleared
        console.warn(
          `[CloudProviderResolution] Could not resolve cloud provider UUID "${frontendResource.cloudProviderId}" to cloud type. ` +
          `Resource "${frontendResource.name}" will use UUID as fallback for backward compatibility.`
        );
        // Fallback: Use UUID directly - backend may accept it or validation will catch it
        cloudType = frontendResource.cloudProviderId;
      }
    } else {
      // No lookup service available - use UUID as fallback
      // This maintains backward compatibility when lookup service is not initialized
      cloudType = frontendResource.cloudProviderId;
    }
  }
  // If both cloudProviderName and cloudProviderId are missing, cloudType stays empty (valid state)
  
  return {
    name: frontendResource.name,
    description: frontendResource.description,
    blueprintResourceTypeId: frontendResource.resourceTypeId,
    blueprintResourceTypeName: frontendResource.resourceTypeName,
    // cloudType: Cloud type string expected by backend API (e.g., "AWS", "azure", "gcp")
    cloudType: cloudType,
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
  /**
   * Fetches all blueprints and transforms their resources to use cloud provider UUIDs.
   * 
   * Cloud Provider Resolution Strategy:
   * 1. Load cloud providers first to build the lookup cache
   * 2. Initialize CloudProviderLookupService with loaded providers
   * 3. Fetch blueprints from backend (resources contain cloud type strings)
   * 4. Transform each resource to resolve cloud type strings to UUIDs
   * 
   * This ensures that when blueprints are loaded, all resources have resolved
   * cloud provider UUIDs ready for property schema fetching.
   * 
   * Error Handling:
   * - If cloud providers fail to load, the error propagates and blueprints are not fetched
   * - If blueprint fetch fails, the error is logged and re-thrown
   * - If individual resource transformation fails, it logs a warning but continues
   */
  async getBlueprints(userEmail?: string): Promise<Blueprint[]> {
    try {
      // Step 1: Load cloud providers before fetching blueprints
      // This ensures the lookup service has all necessary data for resolution
      // If this fails, we cannot properly resolve cloud provider IDs
      const cloudProviders = await this.getAvailableCloudProvidersForBlueprints(userEmail);
      
      // Step 2: Initialize CloudProviderLookupService with loaded cloud providers
      // This builds the in-memory cache for cloud type ↔ UUID resolution
      // The singleton pattern ensures this cache is shared across all transformations
      const lookupService = CloudProviderLookupService.getInstance();
      lookupService.initialize(cloudProviders);
      
      // Step 3: Fetch blueprints from backend
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
          supportedCloudProviderIds?: string[];
          resources?: BlueprintResourceBackendDto[];
        }>).map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          blueprintTypeId: b.blueprintTypeId ?? null,
          blueprintTypeName: b.blueprintTypeName ?? null,
          configuration: b.configuration,
          supportedCloudTypes: b.supportedCloudTypes ?? [],
          supportedCloudProviderIds: b.supportedCloudProviderIds ?? [],
          // Step 4: Transform all blueprint resources with resolved cloud provider IDs
          // Each resource's cloudType string (e.g., "AWS") is resolved to a UUID
          // The UUID is stored in cloudProviderId for property schema fetching
          // The original cloud type string is preserved in cloudProviderName for display
          resources: b.resources?.map(r => transformBlueprintResourceFromBackend(r, lookupService)),
        }));
      }
      throw new Error(`Failed to fetch blueprints: ${response.status}`);
    } catch (error) {
      console.error('Error fetching blueprints:', error);
      throw error;
    }
  },

  /**
   * Creates a new blueprint with resources.
   * 
   * Transformation Flow:
   * 1. Frontend state contains resources with cloud provider UUIDs
   * 2. Transform resources to backend format (UUID → cloud type string)
   * 3. Send to backend API with cloud type strings
   * 4. Transform response back to frontend format (cloud type string → UUID)
   * 
   * This bidirectional transformation maintains:
   * - Frontend: Uses UUIDs for property schema fetching
   * - Backend: Uses cloud type strings for storage and validation
   * 
   * Backward Compatibility:
   * - Backend API contract unchanged (still expects cloud type strings)
   * - Transformation handles missing lookup service gracefully
   */
  async createBlueprint(payload: BlueprintCreate, userEmail?: string): Promise<Blueprint> {
    try {
      // Get CloudProviderLookupService instance for UUID to cloud type transformation
      // This is the same singleton instance used for loading blueprints
      const cloudProviderLookup = CloudProviderLookupService.getInstance();
      
      // Transform resources to backend format, converting UUIDs back to cloud type strings
      // Frontend resources have cloudProviderId (UUID) for property schema fetching
      // Backend expects cloudType (string) for storage and validation
      const backendPayload = {
        ...payload,
        resources: payload.resources?.map((res: Omit<BlueprintResource, 'id'>) => 
          transformBlueprintResourceToBackend(res, cloudProviderLookup)
        ),
      };
      const response = await apiCall('/blueprints', { method: 'POST', body: JSON.stringify(backendPayload) }, userEmail);
      if (response.ok) {
        const result = await response.json();
        // Transform response resources back to frontend format
        // Backend returns resources with cloud type strings
        // Transform them to have UUIDs for consistent frontend state
        if (result.resources) {
          result.resources = result.resources.map((res: BlueprintResourceBackendDto) => 
            transformBlueprintResourceFromBackend(res, cloudProviderLookup)
          );
        }
        return result;
      }
      throw new Error(`Failed to create blueprint: ${response.status}`);
    } catch (error) {
      console.error('Error creating blueprint:', error);
      throw error;
    }
  },

  /**
   * Updates an existing blueprint with resources.
   * 
   * Transformation Flow:
   * 1. Frontend state contains resources with cloud provider UUIDs
   * 2. Transform resources to backend format (UUID → cloud type string)
   * 3. Send to backend API with cloud type strings
   * 4. Transform response back to frontend format (cloud type string → UUID)
   * 
   * Error Handling:
   * - Logs the payload being sent for debugging purposes
   * - Attempts to extract error details from response body
   * - Provides detailed error messages for troubleshooting
   * 
   * Backward Compatibility:
   * - Backend API contract unchanged (still expects cloud type strings)
   * - Transformation handles missing lookup service gracefully
   */
  async updateBlueprint(id: string, payload: BlueprintCreate, userEmail?: string): Promise<Blueprint> {
    try {
      // Get CloudProviderLookupService instance for UUID to cloud type transformation
      // This is the same singleton instance used for loading blueprints
      const cloudProviderLookup = CloudProviderLookupService.getInstance();
      
      // Transform resources to backend format, converting UUIDs back to cloud type strings
      // Frontend resources have cloudProviderId (UUID) for property schema fetching
      // Backend expects cloudType (string) for storage and validation
      const backendPayload = {
        ...payload,
        resources: payload.resources?.map((res: Omit<BlueprintResource, 'id'>) => 
          transformBlueprintResourceToBackend(res, cloudProviderLookup)
        ),
      };
      // Log payload for debugging - helps troubleshoot transformation issues
      console.log('Sending to backend:', JSON.stringify(backendPayload, null, 2));
      
      const response = await apiCall(`/blueprints/${id}`, { method: 'PUT', body: JSON.stringify(backendPayload) }, userEmail);
      if (response.ok) {
        const result = await response.json();
        // Transform response resources back to frontend format
        // Backend returns resources with cloud type strings
        // Transform them to have UUIDs for consistent frontend state
        if (result.resources) {
          result.resources = result.resources.map((res: BlueprintResourceBackendDto) => 
            transformBlueprintResourceFromBackend(res, cloudProviderLookup)
          );
        }
        return result;
      }
      
      // Error handling: Try to extract detailed error information from response
      let errorMessage = `Failed to update blueprint: ${response.status}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          console.error('Server error response:', errorBody);
          errorMessage += ` - ${errorBody}`;
        }
      } catch {
        // Ignore if we can't read the error body - use basic error message
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
      
      // Extract error message from response body for 400 validation errors
      if (response.status === 400) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || errorData.message || `Failed to create stack: ${response.status}`;
          throw new Error(errorMessage);
        } catch (parseError) {
          // If JSON parsing fails, use default error message
          throw new Error(`Failed to create stack: ${response.status}`);
        }
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
      
      // Extract error message from response body for 400 validation errors
      if (response.status === 400) {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || errorData.message || `Failed to update stack: ${response.status}`;
          throw new Error(errorMessage);
        } catch (parseError) {
          // If JSON parsing fails, use default error message
          throw new Error(`Failed to update stack: ${response.status}`);
        }
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

  async getSystemApiKeys(userEmail?: string): Promise<import('../types/apiKey').ApiKeyResponse[]> {
    try {
      const response = await apiCall('/api-keys/system', {}, userEmail);
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Failed to fetch system API keys: ${response.status}`);
    } catch (error) {
      console.error('Error fetching system API keys:', error);
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
