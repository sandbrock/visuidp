package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.EnvironmentConfig;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for EnvironmentConfig entity operations.
 * Extends the base repository with EnvironmentConfig-specific query methods.
 */
public interface EnvironmentConfigRepository extends Repository<EnvironmentConfig, UUID> {
    
    /**
     * Finds an environment configuration by its environment entity.
     *
     * @param environmentId The environment entity identifier
     * @return An Optional containing the environment config if found
     */
    Optional<EnvironmentConfig> findByEnvironmentId(UUID environmentId);
    
    /**
     * Finds all active environment configurations.
     *
     * @param isActive The active status
     * @return List of environment configurations with the given active status
     */
    List<EnvironmentConfig> findByIsActive(Boolean isActive);
}
