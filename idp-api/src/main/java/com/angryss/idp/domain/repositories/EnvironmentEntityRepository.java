package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.EnvironmentEntity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for EnvironmentEntity entity operations.
 * Extends the base repository with EnvironmentEntity-specific query methods.
 */
public interface EnvironmentEntityRepository extends Repository<EnvironmentEntity, UUID> {
    
    /**
     * Finds an environment by its unique name.
     *
     * @param name The environment name
     * @return An Optional containing the environment if found
     */
    Optional<EnvironmentEntity> findByName(String name);
    
    /**
     * Finds all environments for a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider identifier
     * @return List of environments for the cloud provider
     */
    List<EnvironmentEntity> findByCloudProviderId(UUID cloudProviderId);
    
    /**
     * Finds all active environments.
     *
     * @param isActive The active status
     * @return List of environments with the given active status
     */
    List<EnvironmentEntity> findByIsActive(Boolean isActive);
    
    /**
     * Finds all environments for a specific blueprint.
     *
     * @param blueprintId The blueprint identifier
     * @return List of environments for the blueprint
     */
    List<EnvironmentEntity> findByBlueprintId(UUID blueprintId);
    
    /**
     * Finds all active environments for a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider identifier
     * @param isActive The active status
     * @return List of active environments for the cloud provider
     */
    List<EnvironmentEntity> findByCloudProviderIdAndIsActive(UUID cloudProviderId, Boolean isActive);
}
