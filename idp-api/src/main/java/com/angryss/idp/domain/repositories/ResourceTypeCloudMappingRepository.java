package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for ResourceTypeCloudMapping entity operations.
 * Extends the base repository with ResourceTypeCloudMapping-specific query methods.
 */
public interface ResourceTypeCloudMappingRepository extends Repository<ResourceTypeCloudMapping, UUID> {
    
    /**
     * Finds a mapping by resource type and cloud provider.
     *
     * @param resourceTypeId The resource type identifier
     * @param cloudProviderId The cloud provider identifier
     * @return An Optional containing the mapping if found
     */
    Optional<ResourceTypeCloudMapping> findByResourceTypeIdAndCloudProviderId(UUID resourceTypeId, UUID cloudProviderId);
    
    /**
     * Finds all mappings for a specific resource type.
     *
     * @param resourceTypeId The resource type identifier
     * @return List of mappings for the resource type
     */
    List<ResourceTypeCloudMapping> findByResourceTypeId(UUID resourceTypeId);
    
    /**
     * Finds all mappings for a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider identifier
     * @return List of mappings for the cloud provider
     */
    List<ResourceTypeCloudMapping> findByCloudProviderId(UUID cloudProviderId);
    
    /**
     * Finds all enabled mappings.
     *
     * @param enabled The enabled status
     * @return List of mappings with the given enabled status
     */
    List<ResourceTypeCloudMapping> findByEnabled(Boolean enabled);
    
    /**
     * Finds all enabled mappings for a specific resource type.
     *
     * @param resourceTypeId The resource type identifier
     * @param enabled The enabled status
     * @return List of enabled mappings for the resource type
     */
    List<ResourceTypeCloudMapping> findByResourceTypeIdAndEnabled(UUID resourceTypeId, Boolean enabled);
    
    /**
     * Finds all enabled mappings for a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider identifier
     * @param enabled The enabled status
     * @return List of enabled mappings for the cloud provider
     */
    List<ResourceTypeCloudMapping> findByCloudProviderIdAndEnabled(UUID cloudProviderId, Boolean enabled);
}
