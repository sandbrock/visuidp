package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.CloudProviderCreateDto;
import com.angryss.idp.application.dtos.CloudProviderDto;
import com.angryss.idp.application.dtos.CloudProviderUpdateDto;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.repositories.CloudProviderRepository;
import com.angryss.idp.infrastructure.security.AuditLogged;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for managing cloud providers.
 * Provides CRUD operations and enablement control for cloud providers.
 */
@ApplicationScoped
public class CloudProviderService {

    @Inject
    CloudProviderRepository cloudProviderRepository;

    /**
     * Retrieves all cloud providers.
     *
     * @return List of all cloud providers
     */
    public List<CloudProviderDto> listAll() {
        return cloudProviderRepository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Retrieves a cloud provider by ID.
     *
     * @param id The cloud provider ID
     * @return The cloud provider DTO
     * @throws NotFoundException if cloud provider not found
     */
    public CloudProviderDto getById(UUID id) {
        CloudProvider cloudProvider = cloudProviderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Cloud provider not found with id: " + id));
        return toDto(cloudProvider);
    }

    /**
     * Creates a new cloud provider.
     *
     * @param createDto The cloud provider creation data
     * @return The created cloud provider DTO
     * @throws IllegalArgumentException if a cloud provider with the same name already exists
     */
    @Transactional
    @AuditLogged
    public CloudProviderDto create(CloudProviderCreateDto createDto) {
        // Check for duplicate name
        if (cloudProviderRepository.findByName(createDto.getName()).isPresent()) {
            throw new IllegalArgumentException("Cloud provider with name '" + createDto.getName() + "' already exists");
        }

        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = createDto.getName();
        cloudProvider.displayName = createDto.getDisplayName();
        cloudProvider.description = createDto.getDescription();
        cloudProvider.enabled = createDto.getEnabled();

        cloudProvider = cloudProviderRepository.save(cloudProvider);
        return toDto(cloudProvider);
    }

    /**
     * Updates an existing cloud provider.
     *
     * @param id The cloud provider ID
     * @param updateDto The cloud provider update data
     * @return The updated cloud provider DTO
     * @throws NotFoundException if cloud provider not found
     */
    @Transactional
    @AuditLogged
    public CloudProviderDto update(UUID id, CloudProviderUpdateDto updateDto) {
        CloudProvider cloudProvider = cloudProviderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Cloud provider not found with id: " + id));

        // Update only provided fields
        if (updateDto.getDisplayName() != null) {
            cloudProvider.displayName = updateDto.getDisplayName();
        }
        if (updateDto.getDescription() != null) {
            cloudProvider.description = updateDto.getDescription();
        }
        if (updateDto.getEnabled() != null) {
            cloudProvider.enabled = updateDto.getEnabled();
        }

        cloudProvider = cloudProviderRepository.save(cloudProvider);
        return toDto(cloudProvider);
    }

    /**
     * Toggles the enabled status of a cloud provider.
     *
     * @param id The cloud provider ID
     * @param enabled The new enabled status
     * @throws NotFoundException if cloud provider not found
     */
    @Transactional
    @AuditLogged
    public void toggleEnabled(UUID id, Boolean enabled) {
        CloudProvider cloudProvider = cloudProviderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Cloud provider not found with id: " + id));

        cloudProvider.enabled = enabled;
        cloudProviderRepository.save(cloudProvider);
    }

    /**
     * Retrieves all enabled cloud providers for user-facing queries.
     *
     * @return List of enabled cloud providers
     */
    public List<CloudProviderDto> listEnabled() {
        return cloudProviderRepository.findByEnabled(true).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Converts a CloudProvider entity to a CloudProviderDto.
     *
     * @param cloudProvider The cloud provider entity
     * @return The cloud provider DTO
     */
    private CloudProviderDto toDto(CloudProvider cloudProvider) {
        CloudProviderDto dto = new CloudProviderDto();
        dto.setId(cloudProvider.id);
        dto.setName(cloudProvider.name);
        dto.setDisplayName(cloudProvider.displayName);
        dto.setDescription(cloudProvider.description);
        dto.setEnabled(cloudProvider.enabled);
        dto.setCreatedAt(cloudProvider.createdAt);
        dto.setUpdatedAt(cloudProvider.updatedAt);
        return dto;
    }
}
