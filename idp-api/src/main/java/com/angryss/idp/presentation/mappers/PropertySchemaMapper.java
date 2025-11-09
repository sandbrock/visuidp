package com.angryss.idp.presentation.mappers;

import com.angryss.idp.application.dtos.PropertySchemaDto;
import com.angryss.idp.domain.entities.PropertySchema;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Mapper for converting between PropertySchema entities and PropertySchemaDto objects.
 */
@ApplicationScoped
public class PropertySchemaMapper {

    /**
     * Converts a PropertySchema entity to a PropertySchemaDto.
     *
     * @param entity the PropertySchema entity
     * @return the PropertySchemaDto, or null if entity is null
     */
    public PropertySchemaDto toDto(PropertySchema entity) {
        if (entity == null) {
            return null;
        }

        PropertySchemaDto dto = new PropertySchemaDto();
        dto.setId(entity.id);
        dto.setMappingId(entity.mapping != null ? entity.mapping.id : null);
        dto.setPropertyName(entity.propertyName);
        dto.setDisplayName(entity.displayName);
        dto.setDescription(entity.description);
        dto.setDataType(entity.dataType);
        dto.setRequired(entity.required);
        dto.setDefaultValue(entity.defaultValue);
        dto.setValidationRules(entity.validationRules);
        dto.setDisplayOrder(entity.displayOrder);

        return dto;
    }

    /**
     * Converts a PropertySchemaDto to a PropertySchema entity.
     * Note: This method creates a new entity and does not set timestamps (handled by @PrePersist/@PreUpdate).
     * The mapping relationship must be set separately by the caller.
     *
     * @param dto the PropertySchemaDto
     * @return the PropertySchema entity, or null if dto is null
     */
    public PropertySchema toEntity(PropertySchemaDto dto) {
        if (dto == null) {
            return null;
        }

        PropertySchema entity = new PropertySchema();
        entity.id = dto.getId();
        // Note: mapping must be set by the caller as it requires fetching from the database
        entity.propertyName = dto.getPropertyName();
        entity.displayName = dto.getDisplayName();
        entity.description = dto.getDescription();
        entity.dataType = dto.getDataType();
        entity.required = dto.getRequired();
        entity.defaultValue = dto.getDefaultValue();
        entity.validationRules = dto.getValidationRules();
        entity.displayOrder = dto.getDisplayOrder();
        // createdAt and updatedAt are managed by entity lifecycle callbacks

        return entity;
    }

    /**
     * Updates an existing PropertySchema entity with values from a DTO.
     * Does not update the mapping relationship or timestamps.
     *
     * @param entity the existing PropertySchema entity to update
     * @param dto the PropertySchemaDto with new values
     */
    public void updateEntity(PropertySchema entity, PropertySchemaDto dto) {
        if (entity == null || dto == null) {
            return;
        }

        entity.propertyName = dto.getPropertyName();
        entity.displayName = dto.getDisplayName();
        entity.description = dto.getDescription();
        entity.dataType = dto.getDataType();
        entity.required = dto.getRequired();
        entity.defaultValue = dto.getDefaultValue();
        entity.validationRules = dto.getValidationRules();
        entity.displayOrder = dto.getDisplayOrder();
        // mapping relationship is not updated
        // updatedAt is managed by @PreUpdate callback
    }
}
