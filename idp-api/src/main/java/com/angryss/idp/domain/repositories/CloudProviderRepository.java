package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.CloudProvider;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for CloudProvider entity operations.
 * Extends the base repository with CloudProvider-specific query methods.
 */
public interface CloudProviderRepository extends Repository<CloudProvider, UUID> {
    
    /**
     * Finds a cloud provider by its unique name.
     *
     * @param name The cloud provider name
     * @return An Optional containing the cloud provider if found
     */
    Optional<CloudProvider> findByName(String name);
    
    /**
     * Finds all enabled cloud providers.
     *
     * @param enabled The enabled status
     * @return List of cloud providers with the given enabled status
     */
    List<CloudProvider> findByEnabled(Boolean enabled);
}
