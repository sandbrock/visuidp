package com.angryss.idp.presentation.mappers;

import com.angryss.idp.application.dtos.ResourceTypeDto;
import com.angryss.idp.domain.entities.ResourceType;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Mapper for converting between ResourceType entities and ResourceTypeDto objects.
 */
@ApplicationScoped
public class ResourceTypeMapper {

    /**
     * Converts a ResourceType entity to a ResourceTypeDto.
     *
     * @param entity the ResourceType entity
     * @return the ResourceTypeDto, or null if entity is null
     */
    public ResourceTypeDto toDto(ResourceType entity) {
        if (entity == null) {
            return null;
        }

        ResourceTypeDto dto = new ResourceTypeDto();
        dto.setId(entity.id);
        dto.setName(entity.name);
        dto.setDisplayName(entity.displayName);
        dto.setDescription(entity.description);
        dto.setCategory(entity.category);
        dto.setEnabled(entity.enabled);
        dto.setCreatedAt(entity.createdAt);
        dto.setUpdatedAt(entity.updatedAt);

        return dto;
    }

    /**
     * Converts a ResourceTypeDto to a ResourceType entity.
     * Note: This method creates a new entity and does not set timestamps (handled by @PrePersist/@PreUpdate).
     *
     * @param dto the ResourceTypeDto
     * @return the ResourceType entity, or null if dto is null
     */
    public ResourceType toEntity(ResourceTypeDto dto) {
        if (dto == null) {
            return null;
        }

        ResourceType entity = new ResourceType();
        entity.id = dto.getId();
        entity.name = dto.getName();
        entity.displayName = dto.getDisplayName();
        entity.description = dto.getDescription();
        entity.category = dto.getCategory();
        entity.enabled = dto.getEnabled();
        // createdAt and updatedAt are managed by entity lifecycle callbacks

        return entity;
    }
}
