import { apiService } from './api';
import type { PropertySchema } from '../types/admin';

/**
 * Service for fetching and caching property schemas.
 * Provides in-memory caching to reduce API calls and improve performance.
 */
class PropertySchemaService {
  private cache: Map<string, PropertySchema[]>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Fetches property schema for a given resource type and cloud provider combination.
   * Results are cached to minimize API calls.
   * 
   * @param resourceTypeId - The ID of the resource type
   * @param cloudProviderId - The ID of the cloud provider
   * @param context - The context ('blueprint' or 'stack') determines which API endpoint to use
   * @param userEmail - Optional user email for authentication
   * @returns Promise resolving to an array of PropertySchema objects
   * @throws Error if the API call fails
   */
  async getSchema(
    resourceTypeId: string,
    cloudProviderId: string,
    context: 'blueprint' | 'stack',
    userEmail?: string
  ): Promise<PropertySchema[]> {
    // Generate cache key
    const cacheKey = this.getCacheKey(resourceTypeId, cloudProviderId, context);

    // Check if schema is already cached
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Fetch schema from backend based on context
      let schemaArray: PropertySchema[];
      
      if (context === 'blueprint') {
        const response = await apiService.getResourceSchemaForBlueprint(
          resourceTypeId,
          cloudProviderId,
          userEmail
        );
        schemaArray = response.properties || [];
      } else {
        const response = await apiService.getResourceSchemaForStack(
          resourceTypeId,
          cloudProviderId,
          userEmail
        );
        schemaArray = response.properties || [];
      }

      // Sort by displayOrder (only if we have properties)
      if (Array.isArray(schemaArray) && schemaArray.length > 0) {
        schemaArray.sort((a, b) => {
          const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
      }

      // Cache the result
      this.cache.set(cacheKey, schemaArray);

      return schemaArray;
    } catch (error) {
      // If the error is a 404, return empty array (no schema defined)
      if (error instanceof Error && error.message.includes('404')) {
        const emptySchema: PropertySchema[] = [];
        this.cache.set(cacheKey, emptySchema);
        return emptySchema;
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Generates a cache key based on context, resource type, and cloud provider.
   * 
   * @param resourceTypeId - The ID of the resource type
   * @param cloudProviderId - The ID of the cloud provider
   * @param context - The context ('blueprint' or 'stack')
   * @returns A unique cache key string
   */
  private getCacheKey(
    resourceTypeId: string,
    cloudProviderId: string,
    context: string
  ): string {
    return `${context}:${resourceTypeId}:${cloudProviderId}`;
  }

  /**
   * Clears all cached schemas.
   * Useful for manual cache invalidation when schemas are updated.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clears cached schema for a specific resource type and cloud provider combination.
   * 
   * @param resourceTypeId - The ID of the resource type
   * @param cloudProviderId - The ID of the cloud provider
   * @param context - The context ('blueprint' or 'stack')
   */
  clearSchemaCache(
    resourceTypeId: string,
    cloudProviderId: string,
    context: 'blueprint' | 'stack'
  ): void {
    const cacheKey = this.getCacheKey(resourceTypeId, cloudProviderId, context);
    this.cache.delete(cacheKey);
  }
}

// Export a singleton instance
export const propertySchemaService = new PropertySchemaService();
export default propertySchemaService;
