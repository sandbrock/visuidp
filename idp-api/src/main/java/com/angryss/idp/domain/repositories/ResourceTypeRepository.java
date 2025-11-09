package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for ResourceType entity operations.
 * Extends the base repository with ResourceType-specific query methods.
 */
public interface ResourceTypeRepository extends Repository<ResourceType, UUID> {
    
    /**
     * Finds a resource type by its unique name.
     *
     * @param name The resource type name
     * @return An Optional containing the resource type if found
     */
    Optional<ResourceType> findByName(String name);
    
    /**
     * Finds all resource types in a specific category.
     *
     * @param category The resource category
     * @return List of resource types in the category
     */
    List<ResourceType> findByCategory(ResourceCategory category);
    
    /**
     * Finds all enabled resource types.
     *
     * @param enabled The enabled status
     * @return List of resource types with the given enabled status
     */
    List<ResourceType> findByEnabled(Boolean enabled);
    
    /**
     * Finds all enabled resource types in a specific category.
     *
     * @param category The resource category
     * @param enabled The enabled status
     * @return List of enabled resource types in the category
     */
    List<ResourceType> findByCategoryAndEnabled(ResourceCategory category, Boolean enabled);
}
