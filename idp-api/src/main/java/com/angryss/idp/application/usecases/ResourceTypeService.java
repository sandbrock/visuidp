package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.ResourceTypeCreateDto;
import com.angryss.idp.application.dtos.ResourceTypeDto;
import com.angryss.idp.application.dtos.ResourceTypeUpdateDto;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.repositories.ResourceTypeRepository;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import com.angryss.idp.infrastructure.security.AuditLogged;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for managing resource types.
 * Provides CRUD operations and enablement control for resource types.
 */
@ApplicationScoped
public class ResourceTypeService {

    @Inject
    ResourceTypeRepository resourceTypeRepository;

    /**
     * Retrieves all resource types.
     *
     * @return List of all resource types
     */
    public List<ResourceTypeDto> listAll() {
        return resourceTypeRepository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves a resource type by ID.
     *
     * @param id The resource type ID
     * @return The resource type DTO
     * @throws NotFoundException if resource type not found
     */
    public ResourceTypeDto getById(UUID id) {
        ResourceType resourceType = resourceTypeRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Resource type not found with id: " + id));
        return toDto(resourceType);
    }

    /**
     * Creates a new resource type.
     *
     * @param createDto The resource type creation data
     * @return The created resource type DTO
     * @throws IllegalArgumentException if a resource type with the same name already exists
     */
    @Transactional
    @AuditLogged
    public ResourceTypeDto create(ResourceTypeCreateDto createDto) {
        // Check for duplicate name
        if (resourceTypeRepository.findByName(createDto.getName()).isPresent()) {
            throw new IllegalArgumentException("Resource type with name '" + createDto.getName() + "' already exists");
        }

        ResourceType resourceType = new ResourceType();
        resourceType.name = createDto.getName();
        resourceType.displayName = createDto.getDisplayName();
        resourceType.description = createDto.getDescription();
        resourceType.category = createDto.getCategory();
        resourceType.enabled = createDto.getEnabled();

        resourceType = resourceTypeRepository.save(resourceType);
        return toDto(resourceType);
    }

    /**
     * Updates an existing resource type.
     *
     * @param id The resource type ID
     * @param updateDto The resource type update data
     * @return The updated resource type DTO
     * @throws NotFoundException if resource type not found
     */
    @Transactional
    @AuditLogged
    public ResourceTypeDto update(UUID id, ResourceTypeUpdateDto updateDto) {
        ResourceType resourceType = resourceTypeRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Resource type not found with id: " + id));

        // Update only provided fields
        if (updateDto.getDisplayName() != null) {
            resourceType.displayName = updateDto.getDisplayName();
        }
        if (updateDto.getDescription() != null) {
            resourceType.description = updateDto.getDescription();
        }
        if (updateDto.getCategory() != null) {
            resourceType.category = updateDto.getCategory();
        }
        if (updateDto.getEnabled() != null) {
            resourceType.enabled = updateDto.getEnabled();
        }

        resourceType = resourceTypeRepository.save(resourceType);
        return toDto(resourceType);
    }

    /**
     * Toggles the enabled status of a resource type.
     *
     * @param id The resource type ID
     * @param enabled The new enabled status
     * @throws NotFoundException if resource type not found
     */
    @Transactional
    @AuditLogged
    public void toggleEnabled(UUID id, Boolean enabled) {
        ResourceType resourceType = resourceTypeRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Resource type not found with id: " + id));

        resourceType.enabled = enabled;
        resourceTypeRepository.save(resourceType);
    }

    /**
     * Retrieves resource types filtered by category.
     *
     * @param category The resource category to filter by
     * @return List of resource types in the specified category
     */
    public List<ResourceTypeDto> listByCategory(ResourceCategory category) {
        return resourceTypeRepository.findByCategory(category).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves all enabled resource types for user-facing queries.
     *
     * @return List of enabled resource types
     */
    public List<ResourceTypeDto> listEnabledForUser() {
        return resourceTypeRepository.findByEnabled(true).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Converts a ResourceType entity to a ResourceTypeDto.
     *
     * @param resourceType The resource type entity
     * @return The resource type DTO
     */
    private ResourceTypeDto toDto(ResourceType resourceType) {
        ResourceTypeDto dto = new ResourceTypeDto();
        dto.setId(resourceType.id);
        dto.setName(resourceType.name);
        dto.setDisplayName(resourceType.displayName);
        dto.setDescription(resourceType.description);
        dto.setCategory(resourceType.category);
        dto.setEnabled(resourceType.enabled);
        dto.setCreatedAt(resourceType.createdAt);
        dto.setUpdatedAt(resourceType.updatedAt);
        return dto;
    }
}
