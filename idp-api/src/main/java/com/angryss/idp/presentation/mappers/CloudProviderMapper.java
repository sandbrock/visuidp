package com.angryss.idp.presentation.mappers;

import com.angryss.idp.application.dtos.CloudProviderDto;
import com.angryss.idp.domain.entities.CloudProvider;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Mapper for converting between CloudProvider entities and CloudProviderDto objects.
 */
@ApplicationScoped
public class CloudProviderMapper {

    /**
     * Converts a CloudProvider entity to a CloudProviderDto.
     *
     * @param entity the CloudProvider entity
     * @return the CloudProviderDto, or null if entity is null
     */
    public CloudProviderDto toDto(CloudProvider entity) {
        if (entity == null) {
            return null;
        }

        CloudProviderDto dto = new CloudProviderDto();
        dto.setId(entity.id);
        dto.setName(entity.name);
        dto.setDisplayName(entity.displayName);
        dto.setDescription(entity.description);
        dto.setEnabled(entity.enabled);
        dto.setCreatedAt(entity.createdAt);
        dto.setUpdatedAt(entity.updatedAt);

        return dto;
    }

    /**
     * Converts a CloudProviderDto to a CloudProvider entity.
     * Note: This method creates a new entity and does not set timestamps (handled by @PrePersist/@PreUpdate).
     *
     * @param dto the CloudProviderDto
     * @return the CloudProvider entity, or null if dto is null
     */
    public CloudProvider toEntity(CloudProviderDto dto) {
        if (dto == null) {
            return null;
        }

        CloudProvider entity = new CloudProvider();
        entity.id = dto.getId();
        entity.name = dto.getName();
        entity.displayName = dto.getDisplayName();
        entity.description = dto.getDescription();
        entity.enabled = dto.getEnabled();
        // createdAt and updatedAt are managed by entity lifecycle callbacks

        return entity;
    }
}
