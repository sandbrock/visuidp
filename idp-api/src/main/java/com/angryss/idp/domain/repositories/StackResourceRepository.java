package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.StackResource;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for StackResource entity operations.
 * Extends the base repository with StackResource-specific query methods.
 */
public interface StackResourceRepository extends Repository<StackResource, UUID> {
    
    /**
     * Finds all stack resources for a specific stack.
     *
     * @param stackId The stack identifier
     * @return List of stack resources for the stack
     */
    List<StackResource> findByStackId(UUID stackId);
    
    /**
     * Finds all stack resources of a specific resource type.
     *
     * @param resourceTypeId The resource type identifier
     * @return List of stack resources of the given type
     */
    List<StackResource> findByResourceTypeId(UUID resourceTypeId);
    
    /**
     * Finds all stack resources using a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider identifier
     * @return List of stack resources using the cloud provider
     */
    List<StackResource> findByCloudProviderId(UUID cloudProviderId);
    
    /**
     * Finds all stack resources for a specific stack and resource type.
     *
     * @param stackId The stack identifier
     * @param resourceTypeId The resource type identifier
     * @return List of stack resources matching both criteria
     */
    List<StackResource> findByStackIdAndResourceTypeId(UUID stackId, UUID resourceTypeId);
}
