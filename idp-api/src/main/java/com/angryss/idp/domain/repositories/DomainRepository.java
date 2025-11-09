package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.Domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Domain entity operations.
 * Extends the base repository with Domain-specific query methods.
 */
public interface DomainRepository extends Repository<Domain, UUID> {
    
    /**
     * Finds a domain by its unique name.
     *
     * @param name The domain name
     * @return An Optional containing the domain if found
     */
    Optional<Domain> findByName(String name);
    
    /**
     * Finds all active domains.
     *
     * @param isActive The active status
     * @return List of domains with the given active status
     */
    List<Domain> findByIsActive(Boolean isActive);
}
