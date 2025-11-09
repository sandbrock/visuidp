package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.ResourceTypeCloudMappingCreateDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingDto;
import com.angryss.idp.application.dtos.ResourceTypeCloudMappingUpdateDto;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.repositories.CloudProviderRepository;
import com.angryss.idp.domain.repositories.PropertySchemaRepository;
import com.angryss.idp.domain.repositories.ResourceTypeCloudMappingRepository;
import com.angryss.idp.domain.repositories.ResourceTypeRepository;
import com.angryss.idp.infrastructure.security.AuditLogged;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for managing resource type cloud mappings.
 * Provides CRUD operations and enablement control for mappings between resource types and cloud providers.
 */
@ApplicationScoped
public class ResourceTypeCloudMappingService {

    @Inject
    ResourceTypeCloudMappingRepository resourceTypeCloudMappingRepository;

    @Inject
    ResourceTypeRepository resourceTypeRepository;

    @Inject
    CloudProviderRepository cloudProviderRepository;

    @Inject
    PropertySchemaRepository propertySchemaRepository;

    /**
     * Retrieves all resource type cloud mappings.
     *
     * @return List of all mappings
     */
    public List<ResourceTypeCloudMappingDto> listAll() {
        return resourceTypeCloudMappingRepository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves a resource type cloud mapping by ID.
     *
     * @param id The mapping ID
     * @return The mapping DTO
     * @throws NotFoundException if mapping not found
     */
    public ResourceTypeCloudMappingDto getById(UUID id) {
        ResourceTypeCloudMapping mapping = resourceTypeCloudMappingRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Resource type cloud mapping not found with id: " + id));
        return toDto(mapping);
    }

    /**
     * Creates a new resource type cloud mapping.
     *
     * @param createDto The mapping creation data
     * @return The created mapping DTO
     * @throws IllegalArgumentException if a mapping for the same resource type and cloud provider already exists
     * @throws NotFoundException if resource type or cloud provider not found
     */
    @Transactional
    @AuditLogged
    public ResourceTypeCloudMappingDto create(ResourceTypeCloudMappingCreateDto createDto) {
        // Validate resource type exists
        ResourceType resourceType = resourceTypeRepository.findById(createDto.getResourceTypeId())
            .orElseThrow(() -> new NotFoundException("Resource type not found with id: " + createDto.getResourceTypeId()));

        // Validate cloud provider exists
        CloudProvider cloudProvider = cloudProviderRepository.findById(createDto.getCloudProviderId())
            .orElseThrow(() -> new NotFoundException("Cloud provider not found with id: " + createDto.getCloudProviderId()));

        // Check for duplicate mapping
        if (resourceTypeCloudMappingRepository.findByResourceTypeIdAndCloudProviderId(
                createDto.getResourceTypeId(), createDto.getCloudProviderId()).isPresent()) {
            throw new IllegalArgumentException(
                "Mapping already exists for resource type '" + resourceType.name +
                "' and cloud provider '" + cloudProvider.name + "'"
            );
        }

        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = cloudProvider;
        mapping.terraformModuleLocation = createDto.getTerraformModuleLocation();
        mapping.moduleLocationType = createDto.getModuleLocationType();
        mapping.enabled = createDto.getEnabled();

        mapping = resourceTypeCloudMappingRepository.save(mapping);
        return toDto(mapping);
    }

    /**
     * Updates an existing resource type cloud mapping.
     *
     * @param id The mapping ID
     * @param updateDto The mapping update data
     * @return The updated mapping DTO
     * @throws NotFoundException if mapping not found
     */
    @Transactional
    @AuditLogged
    public ResourceTypeCloudMappingDto update(UUID id, ResourceTypeCloudMappingUpdateDto updateDto) {
        ResourceTypeCloudMapping mapping = resourceTypeCloudMappingRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Resource type cloud mapping not found with id: " + id));

        // Update only provided fields
        if (updateDto.getTerraformModuleLocation() != null) {
            mapping.terraformModuleLocation = updateDto.getTerraformModuleLocation();
        }
        if (updateDto.getModuleLocationType() != null) {
            mapping.moduleLocationType = updateDto.getModuleLocationType();
        }
        if (updateDto.getEnabled() != null) {
            mapping.enabled = updateDto.getEnabled();
        }

        mapping = resourceTypeCloudMappingRepository.save(mapping);
        return toDto(mapping);
    }

    /**
     * Toggles the enabled status of a resource type cloud mapping.
     * Validates completeness before enabling (must have Terraform location and at least one property).
     *
     * @param id The mapping ID
     * @param enabled The new enabled status
     * @throws NotFoundException if mapping not found
     * @throws IllegalStateException if attempting to enable an incomplete mapping
     */
    @Transactional
    @AuditLogged
    public void toggleEnabled(UUID id, Boolean enabled) {
        ResourceTypeCloudMapping mapping = resourceTypeCloudMappingRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Resource type cloud mapping not found with id: " + id));

        // If enabling, validate completeness
        if (enabled && !isComplete(mapping)) {
            throw new IllegalStateException(
                "Cannot enable incomplete mapping. Mapping must have a Terraform module location and at least one property schema."
            );
        }

        mapping.enabled = enabled;
        resourceTypeCloudMappingRepository.save(mapping);
    }

    /**
     * Retrieves all mappings for a specific resource type.
     *
     * @param resourceTypeId The resource type ID
     * @return List of mappings for the resource type
     */
    public List<ResourceTypeCloudMappingDto> listByResourceType(UUID resourceTypeId) {
        return resourceTypeCloudMappingRepository.findByResourceTypeId(resourceTypeId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves all mappings for a specific cloud provider.
     *
     * @param cloudProviderId The cloud provider ID
     * @return List of mappings for the cloud provider
     */
    public List<ResourceTypeCloudMappingDto> listByCloudProvider(UUID cloudProviderId) {
        return resourceTypeCloudMappingRepository.findByCloudProviderId(cloudProviderId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Finds a specific mapping by resource type and cloud provider.
     *
     * @param resourceTypeId The resource type ID
     * @param cloudProviderId The cloud provider ID
     * @return The mapping DTO
     * @throws NotFoundException if mapping not found
     */
    public ResourceTypeCloudMappingDto findByResourceTypeAndCloud(UUID resourceTypeId, UUID cloudProviderId) {
        ResourceTypeCloudMapping mapping = resourceTypeCloudMappingRepository
            .findByResourceTypeIdAndCloudProviderId(resourceTypeId, cloudProviderId)
            .orElseThrow(() -> new NotFoundException(
                "Mapping not found for resource type id: " + resourceTypeId +
                " and cloud provider id: " + cloudProviderId
            ));

        return toDto(mapping);
    }

    /**
     * Checks if a mapping is complete (has Terraform location and at least one property).
     *
     * @param mapping The mapping to check
     * @return true if complete, false otherwise
     */
    private boolean isComplete(ResourceTypeCloudMapping mapping) {
        // Must have Terraform module location (already validated by entity constraints)
        if (mapping.terraformModuleLocation == null || mapping.terraformModuleLocation.isBlank()) {
            return false;
        }

        // Must have at least one property schema
        long propertyCount = propertySchemaRepository.findByMappingId(mapping.id).size();
        return propertyCount > 0;
    }

    /**
     * Converts a ResourceTypeCloudMapping entity to a ResourceTypeCloudMappingDto.
     *
     * @param mapping The mapping entity
     * @return The mapping DTO
     */
    private ResourceTypeCloudMappingDto toDto(ResourceTypeCloudMapping mapping) {
        ResourceTypeCloudMappingDto dto = new ResourceTypeCloudMappingDto();
        dto.setId(mapping.id);
        dto.setResourceTypeId(mapping.resourceType.id);
        dto.setResourceTypeName(mapping.resourceType.name);
        dto.setCloudProviderId(mapping.cloudProvider.id);
        dto.setCloudProviderName(mapping.cloudProvider.name);
        dto.setTerraformModuleLocation(mapping.terraformModuleLocation);
        dto.setModuleLocationType(mapping.moduleLocationType);
        dto.setEnabled(mapping.enabled);
        dto.setIsComplete(isComplete(mapping));
        dto.setCreatedAt(mapping.createdAt);
        dto.setUpdatedAt(mapping.updatedAt);
        return dto;
    }
}
