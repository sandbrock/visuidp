package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.valueobjects.ApiKeyType;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for ApiKey entity operations.
 * Extends the base repository with ApiKey-specific query methods.
 */
public interface ApiKeyRepository extends Repository<ApiKey, UUID> {
    
    /**
     * Finds an API key by its hash.
     *
     * @param keyHash The hashed API key
     * @return An Optional containing the API key if found
     */
    Optional<ApiKey> findByKeyHash(String keyHash);
    
    /**
     * Finds all API keys for a specific user email.
     *
     * @param userEmail The user email
     * @return List of API keys for the user
     */
    List<ApiKey> findByUserEmail(String userEmail);
    
    /**
     * Finds all API keys of a specific type.
     *
     * @param keyType The API key type
     * @return List of API keys of the given type
     */
    List<ApiKey> findByKeyType(ApiKeyType keyType);
    
    /**
     * Finds all active API keys.
     *
     * @param isActive The active status
     * @return List of API keys with the given active status
     */
    List<ApiKey> findByIsActive(Boolean isActive);
    
    /**
     * Finds all active API keys for a specific user.
     *
     * @param userEmail The user email
     * @param isActive The active status
     * @return List of active API keys for the user
     */
    List<ApiKey> findByUserEmailAndIsActive(String userEmail, Boolean isActive);
    
    /**
     * Finds all API keys created by a specific user.
     *
     * @param createdByEmail The email of the creator
     * @return List of API keys created by the user
     */
    List<ApiKey> findByCreatedByEmail(String createdByEmail);
}
