package com.angryss.idp.domain.services;

import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Domain service for resolving property schemas for ResourceType and CloudProvider combinations.
 * Provides schema information for UI form generation and validation.
 */
@ApplicationScoped
public class SchemaResolverService {

    /**
     * Retrieves all property schemas for a given ResourceType and CloudProvider mapping.
     *
     * @param mappingId The ID of the ResourceTypeCloudMapping
     * @return List of PropertySchemas ordered by displayOrder
     */
    public List<PropertySchema> getSchemasByMapping(UUID mappingId) {
        if (mappingId == null) {
            return Collections.emptyList();
        }
        
        return PropertySchema.find("mapping.id = ?1 ORDER BY displayOrder, propertyName", mappingId)
            .list();
    }

    /**
     * Retrieves all property schemas for a given ResourceType and CloudProvider combination.
     *
     * @param resourceTypeId The ID of the ResourceType
     * @param cloudProviderId The ID of the CloudProvider
     * @return List of PropertySchemas ordered by displayOrder
     */
    public List<PropertySchema> getSchemas(UUID resourceTypeId, UUID cloudProviderId) {
        if (resourceTypeId == null || cloudProviderId == null) {
            return Collections.emptyList();
        }
        
        // Find the mapping first
        ResourceTypeCloudMapping mapping = ResourceTypeCloudMapping.find(
            "resourceType.id = ?1 AND cloudProvider.id = ?2", 
            resourceTypeId, 
            cloudProviderId
        ).firstResult();
        
        if (mapping == null) {
            return Collections.emptyList();
        }
        
        return getSchemasByMapping(mapping.id);
    }

    /**
     * Generates a schema map for UI form building.
     * The map contains property names as keys and schema information as values.
     *
     * @param resourceTypeId The ID of the ResourceType
     * @param cloudProviderId The ID of the CloudProvider
     * @return Map of property names to SchemaInfo objects
     */
    public Map<String, SchemaInfo> getSchemaMap(UUID resourceTypeId, UUID cloudProviderId) {
        List<PropertySchema> schemas = getSchemas(resourceTypeId, cloudProviderId);
        
        return schemas.stream()
            .collect(Collectors.toMap(
                schema -> schema.propertyName,
                this::toSchemaInfo,
                (existing, replacement) -> existing, // Keep first if duplicates
                LinkedHashMap::new // Preserve order
            ));
    }

    /**
     * Generates a schema map for UI form building using a mapping ID.
     *
     * @param mappingId The ID of the ResourceTypeCloudMapping
     * @return Map of property names to SchemaInfo objects
     */
    public Map<String, SchemaInfo> getSchemaMapByMapping(UUID mappingId) {
        List<PropertySchema> schemas = getSchemasByMapping(mappingId);
        
        return schemas.stream()
            .collect(Collectors.toMap(
                schema -> schema.propertyName,
                this::toSchemaInfo,
                (existing, replacement) -> existing,
                LinkedHashMap::new
            ));
    }

    /**
     * Converts a PropertySchema entity to a SchemaInfo DTO for UI consumption.
     */
    private SchemaInfo toSchemaInfo(PropertySchema schema) {
        return new SchemaInfo(
            schema.propertyName,
            schema.displayName,
            schema.description,
            schema.dataType.name(),
            schema.required,
            schema.defaultValue,
            schema.validationRules,
            schema.displayOrder
        );
    }

    /**
     * Checks if a ResourceType and CloudProvider combination has any property schemas defined.
     *
     * @param resourceTypeId The ID of the ResourceType
     * @param cloudProviderId The ID of the CloudProvider
     * @return true if schemas exist, false otherwise
     */
    public boolean hasSchemas(UUID resourceTypeId, UUID cloudProviderId) {
        if (resourceTypeId == null || cloudProviderId == null) {
            return false;
        }
        
        ResourceTypeCloudMapping mapping = ResourceTypeCloudMapping.find(
            "resourceType.id = ?1 AND cloudProvider.id = ?2", 
            resourceTypeId, 
            cloudProviderId
        ).firstResult();
        
        if (mapping == null) {
            return false;
        }
        
        long count = PropertySchema.count("mapping.id = ?1", mapping.id);
        return count > 0;
    }

    /**
     * Checks if a mapping has any property schemas defined.
     *
     * @param mappingId The ID of the ResourceTypeCloudMapping
     * @return true if schemas exist, false otherwise
     */
    public boolean hasSchemasForMapping(UUID mappingId) {
        if (mappingId == null) {
            return false;
        }
        
        long count = PropertySchema.count("mapping.id = ?1", mappingId);
        return count > 0;
    }

    /**
     * Data transfer object containing schema information for UI form generation.
     */
    public record SchemaInfo(
        String propertyName,
        String displayName,
        String description,
        String dataType,
        Boolean required,
        Object defaultValue,
        Map<String, Object> validationRules,
        Integer displayOrder
    ) {}
}
