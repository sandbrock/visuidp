package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.Blueprint;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Blueprint entity operations.
 * Extends the base repository with Blueprint-specific query methods.
 */
public interface BlueprintRepository extends Repository<Blueprint, UUID> {
    
    /**
     * Finds a blueprint by its unique name.
     *
     * @param name The blueprint name
     * @return An Optional containing the blueprint if found
     */
    Optional<Blueprint> findByName(String name);
    
    /**
     * Finds all active blueprints.
     *
     * @return List of active blueprints
     */
    List<Blueprint> findByIsActive(Boolean isActive);
    
    /**
     * Finds all blueprints that support a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider identifier
     * @return List of blueprints supporting the cloud provider
     */
    List<Blueprint> findBySupportedCloudProviderId(UUID cloudProviderId);
}
