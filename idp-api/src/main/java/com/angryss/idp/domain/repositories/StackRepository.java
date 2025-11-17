package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.valueobjects.StackType;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for Stack entity operations.
 * Extends the base repository with Stack-specific query methods.
 */
public interface StackRepository extends Repository<Stack, UUID> {
    
    /**
     * Finds all stacks created by a specific user.
     *
     * @param createdBy The username of the creator
     * @return List of stacks created by the user
     */
    List<Stack> findByCreatedBy(String createdBy);
    
    /**
     * Finds all stacks of a specific type.
     *
     * @param stackType The type of stack
     * @return List of stacks of the given type
     */
    List<Stack> findByStackType(StackType stackType);
    
    /**
     * Finds all stacks with a specific ephemeral prefix.
     *
     * @param ephemeralPrefix The ephemeral prefix
     * @return List of stacks with the given prefix
     */
    List<Stack> findByEphemeralPrefix(String ephemeralPrefix);
    
    /**
     * Checks if a stack with the given name exists for a specific user.
     *
     * @param name The stack name
     * @param createdBy The username of the creator
     * @return true if a stack exists with the given name and creator
     */
    boolean existsByNameAndCreatedBy(String name, String createdBy);
    
    /**
     * Finds all stacks belonging to a specific team.
     *
     * @param teamId The team identifier
     * @return List of stacks belonging to the team
     */
    List<Stack> findByTeamId(UUID teamId);
    
    /**
     * Finds all stacks in a specific stack collection.
     *
     * @param collectionId The stack collection identifier
     * @return List of stacks in the collection
     */
    List<Stack> findByStackCollectionId(UUID collectionId);
    
    /**
     * Finds all stacks in a specific domain.
     *
     * @param domainId The domain identifier
     * @return List of stacks in the domain
     */
    List<Stack> findByDomainId(UUID domainId);
    
    /**
     * Finds all stacks in a specific category.
     *
     * @param categoryId The category identifier
     * @return List of stacks in the category
     */
    List<Stack> findByCategoryId(UUID categoryId);
    
    /**
     * Finds all stacks using a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider identifier
     * @return List of stacks using the cloud provider
     */
    List<Stack> findByCloudProviderId(UUID cloudProviderId);
    
    /**
     * Finds all stacks using a specific cloud provider and created by a specific user.
     *
     * @param cloudProviderId The cloud provider identifier
     * @param createdBy The username of the creator
     * @return List of stacks matching both criteria
     */
    List<Stack> findByCloudProviderAndCreatedBy(UUID cloudProviderId, String createdBy);
    
    /**
     * Finds all stacks associated with a specific blueprint.
     *
     * @param blueprintId The blueprint identifier
     * @return List of stacks associated with the blueprint
     */
    List<Stack> findByBlueprintId(UUID blueprintId);
}
