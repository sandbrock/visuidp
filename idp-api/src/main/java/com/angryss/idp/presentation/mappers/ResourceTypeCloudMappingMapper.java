package com.angryss.idp.presentation.mappers;

import com.angryss.idp.application.dtos.ResourceTypeCloudMappingDto;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Mapper for converting between ResourceTypeCloudMapping entities and ResourceTypeCloudMappingDto objects.
 */
@ApplicationScoped
public class ResourceTypeCloudMappingMapper {

    /**
     * Converts a ResourceTypeCloudMapping entity to a ResourceTypeCloudMappingDto.
     * Includes related entity names and completeness status.
     *
     * @param entity the ResourceTypeCloudMapping entity
     * @param isComplete whether the mapping has property schemas defined
     * @return the ResourceTypeCloudMappingDto, or null if entity is null
     */
    public ResourceTypeCloudMappingDto toDto(ResourceTypeCloudMapping entity, Boolean isComplete) {
        if (entity == null) {
            return null;
        }

        ResourceTypeCloudMappingDto dto = new ResourceTypeCloudMappingDto();
        dto.setId(entity.id);
        dto.setResourceTypeId(entity.resourceType != null ? entity.resourceType.id : null);
        dto.setResourceTypeName(entity.resourceType != null ? entity.resourceType.name : null);
        dto.setCloudProviderId(entity.cloudProvider != null ? entity.cloudProvider.id : null);
        dto.setCloudProviderName(entity.cloudProvider != null ? entity.cloudProvider.name : null);
        dto.setTerraformModuleLocation(entity.terraformModuleLocation);
        dto.setModuleLocationType(entity.moduleLocationType);
        dto.setEnabled(entity.enabled);
        dto.setIsComplete(isComplete);
        dto.setCreatedAt(entity.createdAt);
        dto.setUpdatedAt(entity.updatedAt);

        return dto;
    }

    /**
     * Converts a ResourceTypeCloudMapping entity to a ResourceTypeCloudMappingDto.
     * Sets isComplete to null (caller should determine completeness separately).
     *
     * @param entity the ResourceTypeCloudMapping entity
     * @return the ResourceTypeCloudMappingDto, or null if entity is null
     */
    public ResourceTypeCloudMappingDto toDto(ResourceTypeCloudMapping entity) {
        return toDto(entity, null);
    }

    /**
     * Converts a ResourceTypeCloudMappingDto to a ResourceTypeCloudMapping entity.
     * Note: This method creates a new entity and does not set timestamps (handled by @PrePersist/@PreUpdate).
     * The resourceType and cloudProvider relationships must be set separately by the caller.
     *
     * @param dto the ResourceTypeCloudMappingDto
     * @return the ResourceTypeCloudMapping entity, or null if dto is null
     */
    public ResourceTypeCloudMapping toEntity(ResourceTypeCloudMappingDto dto) {
        if (dto == null) {
            return null;
        }

        ResourceTypeCloudMapping entity = new ResourceTypeCloudMapping();
        entity.id = dto.getId();
        // Note: resourceType and cloudProvider must be set by the caller
        // as they require fetching from the database
        entity.terraformModuleLocation = dto.getTerraformModuleLocation();
        entity.moduleLocationType = dto.getModuleLocationType();
        entity.enabled = dto.getEnabled();
        // createdAt and updatedAt are managed by entity lifecycle callbacks

        return entity;
    }

    /**
     * Updates an existing ResourceTypeCloudMapping entity with values from a DTO.
     * Does not update relationships (resourceType, cloudProvider) or timestamps.
     *
     * @param entity the existing ResourceTypeCloudMapping entity to update
     * @param dto the ResourceTypeCloudMappingDto with new values
     */
    public void updateEntity(ResourceTypeCloudMapping entity, ResourceTypeCloudMappingDto dto) {
        if (entity == null || dto == null) {
            return;
        }

        entity.terraformModuleLocation = dto.getTerraformModuleLocation();
        entity.moduleLocationType = dto.getModuleLocationType();
        entity.enabled = dto.getEnabled();
        // resourceType and cloudProvider relationships are not updated
        // updatedAt is managed by @PreUpdate callback
    }
}
