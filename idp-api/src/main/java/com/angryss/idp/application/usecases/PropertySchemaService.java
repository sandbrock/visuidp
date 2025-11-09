package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.PropertySchemaCreateDto;
import com.angryss.idp.application.dtos.PropertySchemaDto;
import com.angryss.idp.application.dtos.PropertySchemaUpdateDto;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.repositories.PropertySchemaRepository;
import com.angryss.idp.domain.repositories.ResourceTypeCloudMappingRepository;
import com.angryss.idp.infrastructure.security.AuditLogged;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for managing property schemas.
 * Provides CRUD operations for property schemas associated with resource type cloud mappings.
 */
@ApplicationScoped
public class PropertySchemaService {

    @Inject
    PropertySchemaRepository propertySchemaRepository;

    @Inject
    ResourceTypeCloudMappingRepository resourceTypeCloudMappingRepository;

    /**
     * Retrieves all property schemas for a specific mapping.
     *
     * @param mappingId The resource type cloud mapping ID
     * @return List of property schemas for the mapping
     */
    public List<PropertySchemaDto> listByMapping(UUID mappingId) {
        return propertySchemaRepository.findByMappingId(mappingId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves a property schema by ID.
     *
     * @param id The property schema ID
     * @return The property schema DTO
     * @throws NotFoundException if property schema not found
     */
    public PropertySchemaDto getById(UUID id) {
        PropertySchema propertySchema = propertySchemaRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Property schema not found with id: " + id));
        return toDto(propertySchema);
    }

    /**
     * Creates a new property schema.
     *
     * @param createDto The property schema creation data
     * @return The created property schema DTO
     * @throws NotFoundException if mapping not found
     * @throws IllegalArgumentException if a property with the same name already exists for the mapping
     */
    @Transactional
    @AuditLogged
    public PropertySchemaDto create(PropertySchemaCreateDto createDto) {
        // Verify mapping exists
        ResourceTypeCloudMapping mapping = resourceTypeCloudMappingRepository.findById(createDto.getMappingId())
            .orElseThrow(() -> new NotFoundException("Resource type cloud mapping not found with id: " + createDto.getMappingId()));

        // Check for duplicate property name within the same mapping
        List<PropertySchema> existingSchemas = propertySchemaRepository.findByMappingId(createDto.getMappingId());
        boolean duplicateExists = existingSchemas.stream()
            .anyMatch(schema -> schema.propertyName.equals(createDto.getPropertyName()));
        
        if (duplicateExists) {
            throw new IllegalArgumentException(
                "Property with name '" + createDto.getPropertyName() + 
                "' already exists for this mapping");
        }

        PropertySchema propertySchema = new PropertySchema();
        propertySchema.mapping = mapping;
        propertySchema.propertyName = createDto.getPropertyName();
        propertySchema.displayName = createDto.getDisplayName();
        propertySchema.description = createDto.getDescription();
        propertySchema.dataType = createDto.getDataType();
        propertySchema.required = createDto.getRequired();
        propertySchema.defaultValue = createDto.getDefaultValue();
        propertySchema.validationRules = createDto.getValidationRules();
        propertySchema.displayOrder = createDto.getDisplayOrder();

        propertySchema = propertySchemaRepository.save(propertySchema);
        return toDto(propertySchema);
    }

    /**
     * Updates an existing property schema.
     *
     * @param id The property schema ID
     * @param updateDto The property schema update data
     * @return The updated property schema DTO
     * @throws NotFoundException if property schema not found
     */
    @Transactional
    @AuditLogged
    public PropertySchemaDto update(UUID id, PropertySchemaUpdateDto updateDto) {
        PropertySchema propertySchema = propertySchemaRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Property schema not found with id: " + id));

        // Update only provided fields
        if (updateDto.getDisplayName() != null) {
            propertySchema.displayName = updateDto.getDisplayName();
        }
        if (updateDto.getDescription() != null) {
            propertySchema.description = updateDto.getDescription();
        }
        if (updateDto.getDataType() != null) {
            propertySchema.dataType = updateDto.getDataType();
        }
        if (updateDto.getRequired() != null) {
            propertySchema.required = updateDto.getRequired();
        }
        if (updateDto.getDefaultValue() != null) {
            propertySchema.defaultValue = updateDto.getDefaultValue();
        }
        if (updateDto.getValidationRules() != null) {
            propertySchema.validationRules = updateDto.getValidationRules();
        }
        if (updateDto.getDisplayOrder() != null) {
            propertySchema.displayOrder = updateDto.getDisplayOrder();
        }

        propertySchema = propertySchemaRepository.save(propertySchema);
        return toDto(propertySchema);
    }

    /**
     * Deletes a property schema.
     *
     * @param id The property schema ID
     * @throws NotFoundException if property schema not found
     */
    @Transactional
    @AuditLogged
    public void delete(UUID id) {
        PropertySchema propertySchema = propertySchemaRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Property schema not found with id: " + id));

        propertySchemaRepository.delete(propertySchema);
    }

    /**
     * Creates multiple property schemas in a single transaction for efficient bulk creation.
     *
     * @param mappingId The resource type cloud mapping ID
     * @param createDtos List of property schema creation data
     * @return List of created property schema DTOs
     * @throws NotFoundException if mapping not found
     * @throws IllegalArgumentException if duplicate property names exist in the input or mapping
     */
    @Transactional
    @AuditLogged
    public List<PropertySchemaDto> bulkCreate(UUID mappingId, List<PropertySchemaCreateDto> createDtos) {
        // Verify mapping exists
        ResourceTypeCloudMapping mapping = resourceTypeCloudMappingRepository.findById(mappingId)
            .orElseThrow(() -> new NotFoundException("Resource type cloud mapping not found with id: " + mappingId));

        // Check for duplicate property names in the input
        List<String> propertyNames = createDtos.stream()
            .map(PropertySchemaCreateDto::getPropertyName)
            .collect(Collectors.toList());
        
        long uniqueCount = propertyNames.stream().distinct().count();
        if (uniqueCount != propertyNames.size()) {
            throw new IllegalArgumentException("Duplicate property names found in bulk create request");
        }

        // Check for existing property names in the mapping
        List<PropertySchema> existingSchemas = propertySchemaRepository.findByMappingId(mappingId);
        for (PropertySchema existing : existingSchemas) {
            if (propertyNames.contains(existing.propertyName)) {
                throw new IllegalArgumentException(
                    "Property with name '" + existing.propertyName + 
                    "' already exists for this mapping");
            }
        }

        // Create all property schemas
        return createDtos.stream()
            .map(createDto -> {
                PropertySchema propertySchema = new PropertySchema();
                propertySchema.mapping = mapping;
                propertySchema.propertyName = createDto.getPropertyName();
                propertySchema.displayName = createDto.getDisplayName();
                propertySchema.description = createDto.getDescription();
                propertySchema.dataType = createDto.getDataType();
                propertySchema.required = createDto.getRequired();
                propertySchema.defaultValue = createDto.getDefaultValue();
                propertySchema.validationRules = createDto.getValidationRules();
                propertySchema.displayOrder = createDto.getDisplayOrder();

                propertySchema = propertySchemaRepository.save(propertySchema);
                return toDto(propertySchema);
            })
            .collect(Collectors.toList());
    }

    /**
     * Retrieves a map of property schemas for a specific resource type and cloud provider combination.
     * This is useful for UI form generation where property names are keys.
     *
     * @param resourceTypeId The resource type ID
     * @param cloudProviderId The cloud provider ID
     * @return Map of property name to property schema DTO
     * @throws NotFoundException if mapping not found
     */
    public Map<String, PropertySchemaDto> getSchemaMap(UUID resourceTypeId, UUID cloudProviderId) {
        // Find the mapping
        ResourceTypeCloudMapping mapping = resourceTypeCloudMappingRepository
            .findByResourceTypeIdAndCloudProviderId(resourceTypeId, cloudProviderId)
            .orElseThrow(() -> new NotFoundException(
                "Resource type cloud mapping not found for resourceTypeId: " + 
                resourceTypeId + " and cloudProviderId: " + cloudProviderId)
            );

        // Get all property schemas for this mapping
        List<PropertySchema> schemas = propertySchemaRepository.findByMappingId(mapping.id);
        
        // Convert to map with property name as key
        Map<String, PropertySchemaDto> schemaMap = new HashMap<>();
        for (PropertySchema schema : schemas) {
            schemaMap.put(schema.propertyName, toDto(schema));
        }

        return schemaMap;
    }

    /**
     * Converts a PropertySchema entity to a PropertySchemaDto.
     *
     * @param propertySchema The property schema entity
     * @return The property schema DTO
     */
    private PropertySchemaDto toDto(PropertySchema propertySchema) {
        PropertySchemaDto dto = new PropertySchemaDto();
        dto.setId(propertySchema.id);
        dto.setMappingId(propertySchema.mapping.id);
        dto.setPropertyName(propertySchema.propertyName);
        dto.setDisplayName(propertySchema.displayName);
        dto.setDescription(propertySchema.description);
        dto.setDataType(propertySchema.dataType);
        dto.setRequired(propertySchema.required);
        dto.setDefaultValue(propertySchema.defaultValue);
        dto.setValidationRules(propertySchema.validationRules);
        dto.setDisplayOrder(propertySchema.displayOrder);
        return dto;
    }
}
