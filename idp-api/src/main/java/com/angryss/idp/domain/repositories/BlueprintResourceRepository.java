package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.BlueprintResource;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for BlueprintResource entity operations.
 * Extends the base repository with BlueprintResource-specific query methods.
 */
public interface BlueprintResourceRepository extends Repository<BlueprintResource, UUID> {
    
    /**
     * Finds all blueprint resources for a specific blueprint.
     *
     * @param blueprintId The blueprint identifier
     * @return List of blueprint resources for the blueprint
     */
    List<BlueprintResource> findByBlueprintId(UUID blueprintId);
    
    /**
     * Finds all blueprint resources of a specific resource type.
     *
     * @param resourceTypeId The resource type identifier
     * @return List of blueprint resources of the given type
     */
    List<BlueprintResource> findByResourceTypeId(UUID resourceTypeId);
    
    /**
     * Finds all blueprint resources using a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider identifier
     * @return List of blueprint resources using the cloud provider
     */
    List<BlueprintResource> findByCloudProviderId(UUID cloudProviderId);
    
    /**
     * Finds all active blueprint resources.
     *
     * @param isActive The active status
     * @return List of blueprint resources with the given active status
     */
    List<BlueprintResource> findByIsActive(Boolean isActive);
    
    /**
     * Finds all active blueprint resources for a specific blueprint.
     *
     * @param blueprintId The blueprint identifier
     * @param isActive The active status
     * @return List of active blueprint resources for the blueprint
     */
    List<BlueprintResource> findByBlueprintIdAndIsActive(UUID blueprintId, Boolean isActive);
}
