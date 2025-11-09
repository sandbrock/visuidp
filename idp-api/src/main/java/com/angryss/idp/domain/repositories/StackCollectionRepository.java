package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.StackCollection;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for StackCollection entity operations.
 * Extends the base repository with StackCollection-specific query methods.
 */
public interface StackCollectionRepository extends Repository<StackCollection, UUID> {
    
    /**
     * Finds a stack collection by its unique name.
     *
     * @param name The stack collection name
     * @return An Optional containing the stack collection if found
     */
    Optional<StackCollection> findByName(String name);
    
    /**
     * Finds all active stack collections.
     *
     * @param isActive The active status
     * @return List of stack collections with the given active status
     */
    List<StackCollection> findByIsActive(Boolean isActive);
}
