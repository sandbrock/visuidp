package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.Category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Category entity operations.
 * Extends the base repository with Category-specific query methods.
 */
public interface CategoryRepository extends Repository<Category, UUID> {
    
    /**
     * Finds a category by its name.
     *
     * @param name The category name
     * @return An Optional containing the category if found
     */
    Optional<Category> findByName(String name);
    
    /**
     * Finds all categories for a specific domain.
     *
     * @param domainId The domain identifier
     * @return List of categories in the domain
     */
    List<Category> findByDomainId(UUID domainId);
    
    /**
     * Finds all active categories.
     *
     * @param isActive The active status
     * @return List of categories with the given active status
     */
    List<Category> findByIsActive(Boolean isActive);
    
    /**
     * Finds all active categories for a specific domain.
     *
     * @param domainId The domain identifier
     * @param isActive The active status
     * @return List of active categories in the domain
     */
    List<Category> findByDomainIdAndIsActive(UUID domainId, Boolean isActive);
}
