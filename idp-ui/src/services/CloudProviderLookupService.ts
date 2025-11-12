import type { CloudProvider } from '../types/admin';

/**
 * CloudProviderLookupService
 * 
 * A singleton service that provides bidirectional mapping between cloud provider type strings
 * (e.g., "AWS", "azure", "GCP") and their corresponding UUID identifiers. This service is
 * essential for resolving cloud provider references when transforming data between backend
 * DTOs and frontend state.
 * 
 * **Singleton Pattern:**
 * This class implements the singleton pattern to ensure a single, globally accessible instance
 * that maintains consistent cloud provider mappings throughout the application lifecycle.
 * Use `getInstance()` to access the service rather than attempting to instantiate directly.
 * 
 * **Key Features:**
 * - Case-insensitive cloud type resolution (e.g., "AWS", "aws", "Aws" all resolve to the same UUID)
 * - Bidirectional lookup (cloud type ↔ UUID)
 * - In-memory caching for O(1) lookup performance
 * - Graceful handling of missing or invalid identifiers
 * 
 * **Typical Usage Pattern:**
 * ```typescript
 * // 1. Get the singleton instance
 * const lookupService = CloudProviderLookupService.getInstance();
 * 
 * // 2. Initialize with cloud providers (usually done once when app loads)
 * const cloudProviders = await api.getCloudProviders();
 * lookupService.initialize(cloudProviders);
 * 
 * // 3. Resolve cloud type to UUID (for API calls)
 * const uuid = lookupService.resolveCloudProviderId("AWS");
 * if (uuid) {
 *   const schema = await api.getPropertySchema(resourceTypeId, uuid);
 * }
 * 
 * // 4. Resolve UUID back to cloud type (for display or backend transformation)
 * const cloudType = lookupService.resolveCloudType(uuid);
 * 
 * // 5. Get full cloud provider object
 * const provider = lookupService.getCloudProviderById(uuid);
 * console.log(provider?.displayName);
 * ```
 * 
 * **Integration Example:**
 * ```typescript
 * // In BlueprintForm component
 * useEffect(() => {
 *   const loadCloudProviders = async () => {
 *     const providers = await api.getCloudProviders();
 *     const lookupService = CloudProviderLookupService.getInstance();
 *     lookupService.initialize(providers);
 *   };
 *   loadCloudProviders();
 * }, []);
 * 
 * // In API transformation function
 * function transformBlueprintResourceFromBackend(
 *   backendResource: BlueprintResourceBackendDto
 * ): BlueprintResource {
 *   const lookupService = CloudProviderLookupService.getInstance();
 *   const cloudProviderId = lookupService.resolveCloudProviderId(
 *     backendResource.cloudType
 *   ) || '';
 *   
 *   return {
 *     ...backendResource,
 *     cloudProviderId,
 *     cloudProviderName: backendResource.cloudType
 *   };
 * }
 * ```
 * 
 * @see {@link CloudProvider} for the cloud provider type definition
 */
class CloudProviderLookupService {
  private static instance: CloudProviderLookupService;
  private cloudProviders: CloudProvider[] | null = null;
  private cloudTypeToIdMap: Map<string, string> = new Map();
  private idToCloudTypeMap: Map<string, string> = new Map();

  /**
   * Private constructor to enforce singleton pattern.
   * Use `getInstance()` to access the service.
   * 
   * @private
   */
  private constructor() {
    // Private constructor prevents direct instantiation
  }

  /**
   * Gets the singleton instance of CloudProviderLookupService.
   * 
   * This method implements lazy initialization - the instance is created on first access
   * and reused for all subsequent calls. This ensures a single source of truth for
   * cloud provider mappings throughout the application.
   * 
   * **Example:**
   * ```typescript
   * const service = CloudProviderLookupService.getInstance();
   * 
   * // All calls return the same instance
   * const service1 = CloudProviderLookupService.getInstance();
   * const service2 = CloudProviderLookupService.getInstance();
   * console.log(service1 === service2); // true
   * ```
   * 
   * @returns {CloudProviderLookupService} The singleton instance
   */
  public static getInstance(): CloudProviderLookupService {
    if (!CloudProviderLookupService.instance) {
      CloudProviderLookupService.instance = new CloudProviderLookupService();
    }
    return CloudProviderLookupService.instance;
  }

  /**
   * Initializes the service with cloud provider data and builds internal lookup mappings.
   * 
   * This method should be called once when cloud providers are loaded from the API,
   * typically during application initialization or when the cloud provider list changes.
   * Calling this method multiple times will replace the existing mappings.
   * 
   * The method creates bidirectional mappings:
   * - Cloud type (lowercase) → UUID for forward lookups
   * - UUID → Cloud type (original case) for reverse lookups
   * 
   * **Example:**
   * ```typescript
   * const service = CloudProviderLookupService.getInstance();
   * 
   * const cloudProviders = [
   *   { id: 'uuid-123', name: 'AWS', displayName: 'Amazon Web Services' },
   *   { id: 'uuid-456', name: 'Azure', displayName: 'Microsoft Azure' },
   *   { id: 'uuid-789', name: 'GCP', displayName: 'Google Cloud Platform' }
   * ];
   * 
   * service.initialize(cloudProviders);
   * console.log(service.isInitialized()); // true
   * ```
   * 
   * @param {CloudProvider[]} providers - Array of cloud provider objects from the API
   * @returns {void}
   */
  public initialize(providers: CloudProvider[]): void {
    this.cloudProviders = providers;
    this.cloudTypeToIdMap.clear();
    this.idToCloudTypeMap.clear();

    // Build bidirectional mappings
    providers.forEach(provider => {
      // Store lowercase version of name for case-insensitive lookup
      const normalizedName = provider.name.toLowerCase();
      this.cloudTypeToIdMap.set(normalizedName, provider.id);
      this.idToCloudTypeMap.set(provider.id, provider.name);
    });
  }

  /**
   * Resolves a cloud type string to its corresponding cloud provider UUID.
   * 
   * This method performs case-insensitive matching, so "AWS", "aws", and "Aws" all
   * resolve to the same UUID. This is useful when transforming backend DTOs that
   * contain cloud type strings into frontend state that requires UUIDs for API calls.
   * 
   * **Example:**
   * ```typescript
   * const service = CloudProviderLookupService.getInstance();
   * 
   * // Case-insensitive matching
   * const uuid1 = service.resolveCloudProviderId("AWS");
   * const uuid2 = service.resolveCloudProviderId("aws");
   * const uuid3 = service.resolveCloudProviderId("Aws");
   * console.log(uuid1 === uuid2 && uuid2 === uuid3); // true
   * 
   * // Unknown cloud type returns null
   * const unknown = service.resolveCloudProviderId("UNKNOWN");
   * console.log(unknown); // null
   * 
   * // Empty or null input returns null
   * console.log(service.resolveCloudProviderId("")); // null
   * ```
   * 
   * **Use Case:**
   * ```typescript
   * // Transform backend DTO with cloud type to frontend state with UUID
   * const backendResource = {
   *   cloudType: "AWS",
   *   // ... other fields
   * };
   * 
   * const cloudProviderId = service.resolveCloudProviderId(backendResource.cloudType);
   * if (!cloudProviderId) {
   *   console.warn(`Unknown cloud type: ${backendResource.cloudType}`);
   * }
   * ```
   * 
   * @param {string} cloudType - Cloud type string (e.g., "AWS", "azure", "GCP")
   * @returns {string | null} Cloud provider UUID if found, null otherwise
   */
  public resolveCloudProviderId(cloudType: string): string | null {
    if (!cloudType) {
      return null;
    }
    
    // Normalize to lowercase for case-insensitive matching
    const normalizedType = cloudType.toLowerCase();
    return this.cloudTypeToIdMap.get(normalizedType) || null;
  }

  /**
   * Resolves a cloud provider UUID to its cloud type string.
   * 
   * This method performs the reverse lookup of `resolveCloudProviderId()`, converting
   * a UUID back to the original cloud type string. This is useful when transforming
   * frontend state back to backend DTOs or when displaying cloud provider names.
   * 
   * **Example:**
   * ```typescript
   * const service = CloudProviderLookupService.getInstance();
   * 
   * // Resolve UUID to cloud type
   * const cloudType = service.resolveCloudType("uuid-123");
   * console.log(cloudType); // "AWS"
   * 
   * // Unknown UUID returns null
   * const unknown = service.resolveCloudType("invalid-uuid");
   * console.log(unknown); // null
   * 
   * // Empty or null input returns null
   * console.log(service.resolveCloudType("")); // null
   * ```
   * 
   * **Use Case:**
   * ```typescript
   * // Transform frontend state with UUID back to backend DTO with cloud type
   * const frontendResource = {
   *   cloudProviderId: "uuid-123",
   *   // ... other fields
   * };
   * 
   * const cloudType = service.resolveCloudType(frontendResource.cloudProviderId);
   * const backendDto = {
   *   cloudType: cloudType || "",
   *   // ... other fields
   * };
   * ```
   * 
   * @param {string} cloudProviderId - Cloud provider UUID
   * @returns {string | null} Cloud type string if found, null otherwise
   */
  public resolveCloudType(cloudProviderId: string): string | null {
    if (!cloudProviderId) {
      return null;
    }
    
    return this.idToCloudTypeMap.get(cloudProviderId) || null;
  }

  /**
   * Retrieves the full cloud provider object by its UUID.
   * 
   * This method returns the complete cloud provider object, including all properties
   * such as display name, description, and any other metadata. Use this when you need
   * more than just the cloud type string.
   * 
   * **Example:**
   * ```typescript
   * const service = CloudProviderLookupService.getInstance();
   * 
   * const provider = service.getCloudProviderById("uuid-123");
   * if (provider) {
   *   console.log(provider.name);        // "AWS"
   *   console.log(provider.displayName); // "Amazon Web Services"
   *   console.log(provider.id);          // "uuid-123"
   * }
   * 
   * // Unknown UUID returns null
   * const unknown = service.getCloudProviderById("invalid-uuid");
   * console.log(unknown); // null
   * ```
   * 
   * **Use Case:**
   * ```typescript
   * // Display cloud provider details in UI
   * const provider = service.getCloudProviderById(selectedCloudProviderId);
   * if (provider) {
   *   return (
   *     <div>
   *       <h3>{provider.displayName}</h3>
   *       <p>{provider.description}</p>
   *     </div>
   *   );
   * }
   * ```
   * 
   * @param {string} id - Cloud provider UUID
   * @returns {CloudProvider | null} CloudProvider object if found, null otherwise
   */
  public getCloudProviderById(id: string): CloudProvider | null {
    if (!this.cloudProviders || !id) {
      return null;
    }
    
    return this.cloudProviders.find(provider => provider.id === id) || null;
  }

  /**
   * Checks if the service has been initialized with cloud provider data.
   * 
   * This method is useful for determining whether the service is ready to perform
   * lookups. It returns true only if `initialize()` has been called with a non-empty
   * array of cloud providers.
   * 
   * **Example:**
   * ```typescript
   * const service = CloudProviderLookupService.getInstance();
   * 
   * console.log(service.isInitialized()); // false
   * 
   * service.initialize([
   *   { id: 'uuid-123', name: 'AWS', displayName: 'Amazon Web Services' }
   * ]);
   * 
   * console.log(service.isInitialized()); // true
   * 
   * service.clear();
   * console.log(service.isInitialized()); // false
   * ```
   * 
   * **Use Case:**
   * ```typescript
   * // Guard against using uninitialized service
   * const service = CloudProviderLookupService.getInstance();
   * 
   * if (!service.isInitialized()) {
   *   console.warn('CloudProviderLookupService not initialized');
   *   return;
   * }
   * 
   * const uuid = service.resolveCloudProviderId("AWS");
   * ```
   * 
   * @returns {boolean} true if initialized with cloud providers, false otherwise
   */
  public isInitialized(): boolean {
    return this.cloudProviders !== null && this.cloudProviders.length > 0;
  }

  /**
   * Clears all cached data and resets the service to its uninitialized state.
   * 
   * This method removes all cloud provider data and lookup mappings from memory.
   * After calling this method, `isInitialized()` will return false and all lookup
   * methods will return null until `initialize()` is called again.
   * 
   * This is primarily useful for testing scenarios or when you need to reload
   * cloud provider data (e.g., after configuration changes).
   * 
   * **Example:**
   * ```typescript
   * const service = CloudProviderLookupService.getInstance();
   * 
   * service.initialize(cloudProviders);
   * console.log(service.isInitialized()); // true
   * console.log(service.resolveCloudProviderId("AWS")); // "uuid-123"
   * 
   * service.clear();
   * console.log(service.isInitialized()); // false
   * console.log(service.resolveCloudProviderId("AWS")); // null
   * ```
   * 
   * **Use Case:**
   * ```typescript
   * // Reload cloud providers after configuration change
   * const service = CloudProviderLookupService.getInstance();
   * 
   * service.clear();
   * const updatedProviders = await api.getCloudProviders();
   * service.initialize(updatedProviders);
   * ```
   * 
   * @returns {void}
   */
  public clear(): void {
    this.cloudProviders = null;
    this.cloudTypeToIdMap.clear();
    this.idToCloudTypeMap.clear();
  }
}

export default CloudProviderLookupService;
