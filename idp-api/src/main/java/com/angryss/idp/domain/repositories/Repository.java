package com.angryss.idp.domain.repositories;

import java.util.List;
import java.util.Optional;

/**
 * Base repository interface defining common CRUD operations for all entities.
 * This interface provides a database-agnostic abstraction layer that can be
 * implemented by different persistence mechanisms (PostgreSQL, DynamoDB, etc.).
 *
 * @param <T> The entity type
 * @param <ID> The identifier type
 */
public interface Repository<T, ID> {
    
    /**
     * Persists the given entity.
     * If the entity has no ID, it will be created. If it has an ID, it will be updated.
     *
     * @param entity The entity to save
     * @return The saved entity
     */
    T save(T entity);
    
    /**
     * Retrieves an entity by its identifier.
     *
     * @param id The entity identifier
     * @return An Optional containing the entity if found, empty otherwise
     */
    Optional<T> findById(ID id);
    
    /**
     * Retrieves all entities of this type.
     *
     * @return A list of all entities
     */
    List<T> findAll();
    
    /**
     * Deletes the given entity.
     *
     * @param entity The entity to delete
     */
    void delete(T entity);
    
    /**
     * Returns the total count of entities of this type.
     *
     * @return The total number of entities
     */
    long count();
    
    /**
     * Checks whether an entity with the given identifier exists.
     *
     * @param id The entity identifier
     * @return true if an entity with the given ID exists, false otherwise
     */
    boolean exists(ID id);
}
