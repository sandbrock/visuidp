package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.PropertySchema;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for PropertySchema entity operations.
 * Extends the base repository with PropertySchema-specific query methods.
 */
public interface PropertySchemaRepository extends Repository<PropertySchema, UUID> {
    
    /**
     * Finds all property schemas for a specific resource type cloud mapping.
     *
     * @param mappingId The resource type cloud mapping identifier
     * @return List of property schemas for the mapping
     */
    List<PropertySchema> findByMappingId(UUID mappingId);
    
    /**
     * Finds all property schemas for a specific mapping, ordered by display order.
     *
     * @param mappingId The resource type cloud mapping identifier
     * @return List of property schemas ordered by display order
     */
    List<PropertySchema> findByMappingIdOrderByDisplayOrder(UUID mappingId);
    
    /**
     * Finds all required property schemas for a specific mapping.
     *
     * @param mappingId The resource type cloud mapping identifier
     * @param required The required status
     * @return List of required property schemas for the mapping
     */
    List<PropertySchema> findByMappingIdAndRequired(UUID mappingId, Boolean required);
}
