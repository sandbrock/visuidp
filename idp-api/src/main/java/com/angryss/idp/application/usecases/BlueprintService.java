package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.BlueprintCreateDto;
import com.angryss.idp.application.dtos.BlueprintResourceCreateDto;
import com.angryss.idp.application.dtos.BlueprintResourceResponseDto;
import com.angryss.idp.application.dtos.BlueprintResponseDto;
import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.repositories.BlueprintRepository;
import com.angryss.idp.domain.services.PropertyValidationService;
import com.angryss.idp.domain.services.SchemaResolverService;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;

import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class BlueprintService {

    @Inject
    BlueprintRepository blueprintRepository;

    @Inject
    PropertyValidationService propertyValidationService;

    @Inject
    SchemaResolverService schemaResolverService;

    @Transactional
    public BlueprintResponseDto createBlueprint(BlueprintCreateDto createDto) {
        validateBlueprintCreation(createDto);

        if (blueprintRepository.findByName(createDto.getName()).isPresent()) {
            throw new IllegalArgumentException("Blueprint with name '" + createDto.getName() + "' already exists");
        }

        Blueprint blueprint = new Blueprint();
        blueprint.setName(createDto.getName());
        blueprint.setDescription(createDto.getDescription());
        blueprint.setIsActive(createDto.getIsActive() != null ? createDto.getIsActive() : true);
        
        // Set supported cloud providers
        if (createDto.getSupportedCloudProviderIds() != null && !createDto.getSupportedCloudProviderIds().isEmpty()) {
            Set<CloudProvider> cloudProviders = findCloudProvidersByIds(createDto.getSupportedCloudProviderIds());
            blueprint.setSupportedCloudProviders(cloudProviders);
            // Validate that all cloud providers are enabled
            blueprint.validateCloudProvidersEnabled();
        }

        // Handle stack associations if provided
        if (createDto.getStackIds() != null && !createDto.getStackIds().isEmpty()) {
            Set<Stack> stacks = findStacksByIds(createDto.getStackIds());
            // Set the blueprint reference on each stack (one-to-many relationship)
            for (Stack stack : stacks) {
                stack.setBlueprint(blueprint);
            }
            blueprint.setStacks(stacks);
        }

        // Handle resources if provided
        if (createDto.getResources() != null && !createDto.getResources().isEmpty()) {
            Set<BlueprintResource> resourceEntities = createBlueprintResources(
                createDto.getResources(), 
                blueprint
            );
            blueprint.setResources(resourceEntities);
        }

        blueprint = blueprintRepository.save(blueprint);
        return toResponseDto(blueprint);
    }

    public BlueprintResponseDto getBlueprintById(UUID id) {
        Blueprint blueprint = blueprintRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Blueprint not found with id: " + id));
        return toResponseDto(blueprint);
    }

    public List<BlueprintResponseDto> getAllBlueprints() {
        return blueprintRepository.findAll().stream()
            .map(this::toResponseDto)
            .collect(Collectors.toList());
    }

    public List<Blueprint> findBlueprintsByIds(Set<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return new ArrayList<>();
        }
        
        return Blueprint.<Blueprint>list("id in ?1", ids);
    }

    @Transactional
    public BlueprintResponseDto updateBlueprint(UUID id, BlueprintCreateDto updateDto) {
        Blueprint existingBlueprint = blueprintRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Blueprint not found with id: " + id));

        // Check for name uniqueness if name is being changed
        if (!existingBlueprint.getName().equals(updateDto.getName())) {
            if (blueprintRepository.findByName(updateDto.getName()).isPresent()) {
                throw new IllegalArgumentException("Blueprint with name '" + updateDto.getName() + "' already exists");
            }
        }

        existingBlueprint.setName(updateDto.getName());
        existingBlueprint.setDescription(updateDto.getDescription());
        existingBlueprint.setIsActive(updateDto.getIsActive() != null ? updateDto.getIsActive() : true);
        
        // Update supported cloud providers
        if (updateDto.getSupportedCloudProviderIds() != null) {
            existingBlueprint.getSupportedCloudProviders().clear();
            if (!updateDto.getSupportedCloudProviderIds().isEmpty()) {
                Set<CloudProvider> cloudProviders = findCloudProvidersByIds(updateDto.getSupportedCloudProviderIds());
                existingBlueprint.setSupportedCloudProviders(cloudProviders);
                // Validate that all cloud providers are enabled
                existingBlueprint.validateCloudProvidersEnabled();
            }
        }

        // Handle stack associations update
        if (updateDto.getStackIds() != null) {
            // First, clear the blueprint reference from existing stacks
            for (Stack existingStack : existingBlueprint.getStacks()) {
                existingStack.setBlueprint(null);
            }
            existingBlueprint.getStacks().clear();
            
            if (!updateDto.getStackIds().isEmpty()) {
                Set<Stack> newStacks = findStacksByIdsForUpdate(updateDto.getStackIds(), existingBlueprint.getId());
                // Set the blueprint reference on each new stack
                for (Stack stack : newStacks) {
                    stack.setBlueprint(existingBlueprint);
                }
                existingBlueprint.setStacks(newStacks);
            }
        }

        // Handle resources update
        if (updateDto.getResources() != null) {
            // Get the existing collection reference
            Set<BlueprintResource> existingResources = existingBlueprint.getResources();
            
            // Clear the existing collection (orphanRemoval will delete them)
            existingResources.clear();
            
            // Add new resources if provided
            if (!updateDto.getResources().isEmpty()) {
                Set<BlueprintResource> newResources = createBlueprintResources(
                    updateDto.getResources(),
                    existingBlueprint
                );
                // Add to the existing collection instead of replacing it
                existingResources.addAll(newResources);
            }
        }

        existingBlueprint = blueprintRepository.save(existingBlueprint);
        return toResponseDto(existingBlueprint);
    }

    @Transactional
    public void deleteBlueprint(UUID id) {
        Blueprint blueprint = blueprintRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Blueprint not found with id: " + id));
        blueprintRepository.delete(blueprint);
    }

    private void validateBlueprintCreation(BlueprintCreateDto createDto) {
        if (createDto.getName() == null || createDto.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Blueprint name is required");
        }
        if (createDto.getName().length() > 100) {
            throw new IllegalArgumentException("Blueprint name cannot exceed 100 characters");
        }
        if (createDto.getDescription() != null && createDto.getDescription().length() > 500) {
            throw new IllegalArgumentException("Blueprint description cannot exceed 500 characters");
        }
        if (createDto.getSupportedCloudProviderIds() == null || createDto.getSupportedCloudProviderIds().isEmpty()) {
            throw new IllegalArgumentException("At least one supported cloud provider is required");
        }
    }
    
    private Set<CloudProvider> findCloudProvidersByIds(Set<UUID> providerIds) {
        if (providerIds == null || providerIds.isEmpty()) {
            return new HashSet<>();
        }
        
        List<CloudProvider> foundProviders = CloudProvider.<CloudProvider>list("id in ?1", providerIds);
        Set<UUID> foundIds = foundProviders.stream().map(cp -> cp.id).collect(Collectors.toSet());
        
        // Check if all requested providers were found
        Set<UUID> missingIds = new HashSet<>(providerIds);
        missingIds.removeAll(foundIds);
        if (!missingIds.isEmpty()) {
            throw new IllegalArgumentException("Cloud provider(s) not found with ids: " + missingIds);
        }
        
        return new HashSet<>(foundProviders);
    }

    private Set<Stack> findStacksByIds(Set<UUID> stackIds) {
        if (stackIds == null || stackIds.isEmpty()) {
            return new HashSet<>();
        }
        
        List<Stack> foundStacks = Stack.<Stack>list("id in ?1", stackIds);
        Set<UUID> foundIds = foundStacks.stream().map(Stack::getId).collect(Collectors.toSet());
        
        // Check if all requested stacks were found
        Set<UUID> missingIds = new HashSet<>(stackIds);
        missingIds.removeAll(foundIds);
        if (!missingIds.isEmpty()) {
            throw new IllegalArgumentException("Stack(s) not found with ids: " + missingIds);
        }
        
        // Check if any stacks already belong to another blueprint
        List<Stack> alreadyAssignedStacks = foundStacks.stream()
            .filter(stack -> stack.getBlueprint() != null)
            .collect(Collectors.toList());
        if (!alreadyAssignedStacks.isEmpty()) {
            String assignedStackNames = alreadyAssignedStacks.stream()
                .map(Stack::getName)
                .collect(Collectors.joining(", "));
            throw new IllegalArgumentException("Stack(s) already assigned to another blueprint: " + assignedStackNames);
        }
        
        return new HashSet<>(foundStacks);
    }
    
    private Set<Stack> findStacksByIdsForUpdate(Set<UUID> stackIds, UUID currentBlueprintId) {
        if (stackIds == null || stackIds.isEmpty()) {
            return new HashSet<>();
        }
        
        List<Stack> foundStacks = Stack.<Stack>list("id in ?1", stackIds);
        Set<UUID> foundIds = foundStacks.stream().map(Stack::getId).collect(Collectors.toSet());
        
        // Check if all requested stacks were found
        Set<UUID> missingIds = new HashSet<>(stackIds);
        missingIds.removeAll(foundIds);
        if (!missingIds.isEmpty()) {
            throw new IllegalArgumentException("Stack(s) not found with ids: " + missingIds);
        }
        
        // Check if any stacks belong to a different blueprint (not the current one being updated)
        List<Stack> alreadyAssignedStacks = foundStacks.stream()
            .filter(stack -> stack.getBlueprint() != null && !stack.getBlueprint().getId().equals(currentBlueprintId))
            .collect(Collectors.toList());
        if (!alreadyAssignedStacks.isEmpty()) {
            String assignedStackNames = alreadyAssignedStacks.stream()
                .map(Stack::getName)
                .collect(Collectors.joining(", "));
            throw new IllegalArgumentException("Stack(s) already assigned to another blueprint: " + assignedStackNames);
        }
        
        return new HashSet<>(foundStacks);
    }

    private BlueprintResponseDto toResponseDto(Blueprint blueprint) {
        BlueprintResponseDto dto = new BlueprintResponseDto();
        dto.setId(blueprint.getId());
        dto.setName(blueprint.getName());
        dto.setDescription(blueprint.getDescription());
        dto.setIsActive(blueprint.getIsActive());
        dto.setCreatedAt(blueprint.getCreatedAt());
        dto.setUpdatedAt(blueprint.getUpdatedAt());
        
        // Map stack IDs
        if (blueprint.getStacks() != null) {
            Set<UUID> stackIds = blueprint.getStacks().stream()
                .map(Stack::getId)
                .collect(Collectors.toSet());
            dto.setStackIds(stackIds);
        }
        
        // Map supported cloud provider IDs
        if (blueprint.getSupportedCloudProviders() != null) {
            Set<UUID> providerIds = blueprint.getSupportedCloudProviders().stream()
                .map(cp -> cp.id)
                .collect(Collectors.toSet());
            dto.setSupportedCloudProviderIds(providerIds);
        }
        
        // Map resources
        if (blueprint.getResources() != null && !blueprint.getResources().isEmpty()) {
            List<BlueprintResourceResponseDto> resourceDtos = blueprint.getResources().stream()
                .map(this::toResourceResponseDto)
                .collect(Collectors.toList());
            dto.setResources(resourceDtos);
        }
        
        return dto;
    }

    /**
     * Creates BlueprintResource entities from DTOs with validation.
     * Validates that resource types exist, cloud providers exist and are enabled.
     * 
     * @param resourceDtos List of resource DTOs to create
     * @param blueprint The parent blueprint entity
     * @return Set of created BlueprintResource entities
     * @throws IllegalArgumentException if validation fails
     */
    private Set<BlueprintResource> createBlueprintResources(
            List<BlueprintResourceCreateDto> resourceDtos,
            Blueprint blueprint) {
        
        Set<BlueprintResource> resources = new HashSet<>();
        
        for (BlueprintResourceCreateDto dto : resourceDtos) {
            // Validate resource type exists
            com.angryss.idp.domain.entities.ResourceType resourceType = 
                com.angryss.idp.domain.entities.ResourceType.findById(dto.getBlueprintResourceTypeId());
            if (resourceType == null) {
                throw new IllegalArgumentException(
                    "Resource type not found with id: " + dto.getBlueprintResourceTypeId()
                );
            }
            
            // Validate cloud provider exists by name
            CloudProvider cloudProvider = CloudProvider.<CloudProvider>find("name", dto.getCloudType())
                .firstResultOptional()
                .orElseThrow(() -> new IllegalArgumentException(
                    "Cloud provider not found: " + dto.getCloudType()
                ));
            
            // Validate cloud provider is enabled
            if (cloudProvider.enabled == null || !cloudProvider.enabled) {
                throw new IllegalArgumentException(
                    "Cloud provider is not enabled: " + dto.getCloudType()
                );
            }
            
            // Create resource entity
            BlueprintResource resource = new BlueprintResource();
            resource.setName(dto.getName());
            resource.setDescription(dto.getDescription());
            resource.setResourceType(resourceType);
            resource.setCloudProvider(cloudProvider);
            resource.setCloudType(dto.getCloudType());
            resource.setConfiguration(dto.getConfiguration());
            resource.setCloudSpecificProperties(dto.getCloudSpecificProperties());
            resource.setBlueprint(blueprint);
            
            resources.add(resource);
        }
        
        return resources;
    }

    /**
     * Maps a BlueprintResource entity to a BlueprintResourceResponseDto.
     * 
     * @param resource The BlueprintResource entity to map
     * @return BlueprintResourceResponseDto with all fields mapped
     */
    private BlueprintResourceResponseDto toResourceResponseDto(BlueprintResource resource) {
        BlueprintResourceResponseDto dto = new BlueprintResourceResponseDto();
        dto.setId(resource.id);
        dto.setName(resource.getName());
        dto.setDescription(resource.getDescription());
        dto.setBlueprintResourceTypeId(resource.getResourceType().id);
        dto.setBlueprintResourceTypeName(resource.getResourceType().name);
        dto.setCloudType(resource.getCloudType());
        dto.setConfiguration(resource.getConfiguration());
        dto.setCloudSpecificProperties(resource.getCloudSpecificProperties());
        return dto;
    }

    /**
     * Validates blueprint resource configurations against property schemas.
     * This is a placeholder for full validation that will be implemented once:
     * - Blueprint has supportedCloudProviders relationship (task 14.2)
     * - BlueprintResource has cloudProvider relationship (task 14.4)
     * 
     * Currently performs basic validation if schema information is available in the configuration.
     * 
     * Note: This method is prepared for future use when blueprint resources are managed through
     * the BlueprintService. Currently, blueprints don't have a configuration field in the DTO,
     * but this will be needed when task 14.4 is implemented.
     */
    private void validateBlueprintResourceConfiguration(Map<String, Object> resourceConfig, String resourceName) {
        // TODO: Once task 14.2 is complete, validate blueprint-level configuration
        // TODO: Once task 14.4 is complete, validate resource-level configurations
        
        if (resourceConfig == null || resourceConfig.isEmpty()) {
            return;
        }

        // Check if configuration contains resource definitions with schema metadata
        // If the resource config includes resourceTypeId and cloudProviderId, validate it
        if (resourceConfig.containsKey("resourceTypeId") && resourceConfig.containsKey("cloudProviderId")) {
            try {
                UUID resourceTypeId = UUID.fromString(resourceConfig.get("resourceTypeId").toString());
                UUID cloudProviderId = UUID.fromString(resourceConfig.get("cloudProviderId").toString());
                
                // Get the property schemas for this combination
                List<PropertySchema> schemas = schemaResolverService.getSchemas(resourceTypeId, cloudProviderId);
                
                if (!schemas.isEmpty()) {
                    // Extract the actual property values (excluding metadata fields)
                    Map<String, Object> propertyValues = new HashMap<>(resourceConfig);
                    propertyValues.remove("resourceTypeId");
                    propertyValues.remove("cloudProviderId");
                    
                    // Validate the properties
                    PropertyValidationService.ValidationResult result = 
                        propertyValidationService.validate(propertyValues, schemas);
                    
                    if (!result.isValid()) {
                        // Build error message
                        StringBuilder errorMsg = new StringBuilder("Configuration validation failed for resource '")
                            .append(resourceName)
                            .append("': ");
                        
                        result.getErrors().forEach((prop, errors) -> {
                            errorMsg.append(prop).append(": ").append(String.join(", ", errors)).append("; ");
                        });
                        
                        throw new WebApplicationException(
                            errorMsg.toString(),
                            jakarta.ws.rs.core.Response.Status.BAD_REQUEST
                        );
                    }
                }
            } catch (IllegalArgumentException e) {
                // Invalid UUID format - skip validation for this resource
            }
        }
    }
}
