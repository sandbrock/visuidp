package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.StackCreateDto;
import com.angryss.idp.application.dtos.StackResponseDto;
import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.services.PropertyValidationService;
import com.angryss.idp.domain.services.ProvisionerSelectionService;
import com.angryss.idp.domain.services.SchemaResolverService;
import com.angryss.idp.domain.services.StackValidationService;
import com.angryss.idp.domain.valueobjects.StackType;
import com.angryss.idp.presentation.mappers.StackMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.WebApplicationException;

import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class StackService {

    @Inject
    StackRepository stackRepository;

    @Inject
    StackMapper stackMapper;

    @Inject
    StackValidationService validationService;

    @Inject
    ProvisionerSelectionService provisionerService;

    @Inject
    BlueprintService blueprintService;

    @Inject
    PropertyValidationService propertyValidationService;

    @Inject
    SchemaResolverService schemaResolverService;

    @Inject
    com.angryss.idp.domain.services.BlueprintResourceValidationService blueprintResourceValidationService;

    @Transactional
    public StackResponseDto createStack(StackCreateDto createDto, String createdBy) {
        validateStackCreation(createDto);
        
        if (stackRepository.existsByNameAndCreatedBy(createDto.getName(), createdBy)) {
            throw new IllegalArgumentException(
                "Stack with name '" + createDto.getName() + "' already exists for this owner");
        }

        // Validate configuration against property schemas if provided
        // Note: Full validation will be available once Stack has cloudProvider relationship (task 14.1)
        // and StackResource has resourceType/cloudProvider relationships (task 14.3)
        if (createDto.getConfiguration() != null && !createDto.getConfiguration().isEmpty()) {
            validateStackConfiguration(createDto);
        }

        Stack stack = new Stack(
            createDto.getName(),
            createDto.getDescription(),
            createDto.getRepositoryURL(),
            createDto.getStackType(),
            createdBy,
            createDto.getProgrammingLanguage(),
            createDto.getIsPublic(),
            createDto.getCloudName(),
            createDto.getRoutePath()
        );
        
        stack.setConfiguration(createDto.getConfiguration());
        stack.setEphemeralPrefix(createDto.getEphemeralPrefix());

        // Optional associations
        if (createDto.getTeamId() != null) {
            var team = com.angryss.idp.domain.entities.Team.findById(createDto.getTeamId());
            if (team == null) throw new IllegalArgumentException("Team not found: " + createDto.getTeamId());
            stack.setTeam((com.angryss.idp.domain.entities.Team) team);
        }
        if (createDto.getStackCollectionId() != null) {
            var col = com.angryss.idp.domain.entities.StackCollection.findById(createDto.getStackCollectionId());
            if (col == null) throw new IllegalArgumentException("Stack collection not found: " + createDto.getStackCollectionId());
            stack.setStackCollection((com.angryss.idp.domain.entities.StackCollection) col);
        }

        // Handle blueprint association and validation
        Blueprint blueprint = null;
        if (createDto.getBlueprintId() != null) {
            blueprint = Blueprint.findById(createDto.getBlueprintId());
            if (blueprint == null) {
                throw new IllegalArgumentException("Blueprint not found with id: " + createDto.getBlueprintId());
            }
            stack.setBlueprint(blueprint);
        }

        // Validate blueprint resources for stack type before persistence
        blueprintResourceValidationService.validateBlueprintResourcesForStackType(
            createDto.getStackType(), 
            blueprint
        );

        stack = stackRepository.save(stack);
        return stackMapper.toResponseDto(stack);
    }

    private void validateStackCreation(StackCreateDto createDto) {
        // Validate programming language requirements
        if (validationService.isProgrammingLanguageRequired(createDto.getStackType()) && 
            createDto.getProgrammingLanguage() == null) {
            throw new IllegalArgumentException(
                "Programming language is required for stack type: " + createDto.getStackType());
        }

        // Validate programming language support
        if (createDto.getProgrammingLanguage() != null && 
            !validationService.getSupportedLanguages(createDto.getStackType())
                .contains(createDto.getProgrammingLanguage())) {
            throw new IllegalArgumentException(
                "Programming language " + createDto.getProgrammingLanguage() + 
                " is not supported for stack type: " + createDto.getStackType());
        }

        // Validate public access support
        if (createDto.getIsPublic() != null && createDto.getIsPublic() && 
            !validationService.isPublicSupported(createDto.getStackType())) {
            throw new IllegalArgumentException(
                "Public access is not supported for stack type: " + createDto.getStackType());
        }

        // Set default programming language if not specified
        if (createDto.getProgrammingLanguage() == null && 
            validationService.isProgrammingLanguageRequired(createDto.getStackType())) {
            createDto.setProgrammingLanguage(
                validationService.getDefaultLanguage(createDto.getStackType()));
        }
    }

    public StackResponseDto getStackById(UUID id) {
        Stack stack = stackRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Stack not found with id: " + id));
        return stackMapper.toResponseDto(stack);
    }

    public List<StackResponseDto> getAllStacks() {
        return stackRepository.findAll().stream()
            .map(stackMapper::toResponseDto)
            .collect(Collectors.toList());
    }

    public List<StackResponseDto> getStacksByOwner(String createdBy) {
        return stackRepository.findByCreatedBy(createdBy).stream()
            .map(stackMapper::toResponseDto)
            .collect(Collectors.toList());
    }

    public List<StackResponseDto> getStacksByType(StackType stackType) {
        return stackRepository.findByStackType(stackType).stream()
            .map(stackMapper::toResponseDto)
            .collect(Collectors.toList());
    }

    // Environment-based retrieval removed

    @Transactional
    public StackResponseDto updateStack(UUID id, StackCreateDto updateDto, String createdBy) {
        Stack existingStack = stackRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Stack not found with id: " + id));

        System.out.println("[DEBUG] updateStack: principal=" + createdBy + ", storedOwner=" + existingStack.getCreatedBy());

        if (!isOwnerMatch(existingStack.getCreatedBy(), createdBy)) {
            throw new jakarta.ws.rs.ForbiddenException("Not authorized to update this stack");
        }

        if (!existingStack.getName().equals(updateDto.getName()) &&
            stackRepository.existsByNameAndCreatedBy(updateDto.getName(), createdBy)) {
            throw new IllegalArgumentException(
                "Stack with name '" + updateDto.getName() + "' already exists for this owner");
        }

        // Validate configuration against property schemas if provided
        // Note: Full validation will be available once Stack has cloudProvider relationship (task 14.1)
        // and StackResource has resourceType/cloudProvider relationships (task 14.3)
        if (updateDto.getConfiguration() != null && !updateDto.getConfiguration().isEmpty()) {
            validateStackConfiguration(updateDto);
        }

        existingStack.setName(updateDto.getName());
        existingStack.setDescription(updateDto.getDescription());
        existingStack.setRepositoryURL(updateDto.getRepositoryURL());
        existingStack.setStackType(updateDto.getStackType());
        existingStack.setProgrammingLanguage(updateDto.getProgrammingLanguage());
        existingStack.setIsPublic(updateDto.getIsPublic());
        existingStack.setConfiguration(updateDto.getConfiguration());
        existingStack.setCloudName(updateDto.getCloudName());
        existingStack.setRoutePath(updateDto.getRoutePath());
        existingStack.setEphemeralPrefix(updateDto.getEphemeralPrefix());

        // Optional associations on update
        if (updateDto.getTeamId() != null) {
            var team = com.angryss.idp.domain.entities.Team.findById(updateDto.getTeamId());
            if (team == null) throw new IllegalArgumentException("Team not found: " + updateDto.getTeamId());
            existingStack.setTeam((com.angryss.idp.domain.entities.Team) team);
        } else {
            existingStack.setTeam(null);
        }
        if (updateDto.getStackCollectionId() != null) {
            var col = com.angryss.idp.domain.entities.StackCollection.findById(updateDto.getStackCollectionId());
            if (col == null) throw new IllegalArgumentException("Stack collection not found: " + updateDto.getStackCollectionId());
            existingStack.setStackCollection((com.angryss.idp.domain.entities.StackCollection) col);
        } else {
            existingStack.setStackCollection(null);
        }

        // Handle blueprint association update and validation
        Blueprint blueprint = null;
        if (updateDto.getBlueprintId() != null) {
            blueprint = Blueprint.findById(updateDto.getBlueprintId());
            if (blueprint == null) {
                throw new IllegalArgumentException("Blueprint not found with id: " + updateDto.getBlueprintId());
            }
            existingStack.setBlueprint(blueprint);
        } else {
            existingStack.setBlueprint(null);
        }

        // Validate blueprint resources for stack type before persistence
        blueprintResourceValidationService.validateBlueprintResourcesForStackType(
            updateDto.getStackType(), 
            blueprint
        );

        existingStack = stackRepository.save(existingStack);
        return stackMapper.toResponseDto(existingStack);
    }

    @Transactional
    public void deleteStack(UUID id, String createdBy) {
        Stack stack = stackRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Stack not found with id: " + id));

        System.out.println("[DEBUG] deleteStack: principal=" + createdBy + ", storedOwner=" + stack.getCreatedBy());

        if (!isOwnerMatch(stack.getCreatedBy(), createdBy)) {
            throw new jakarta.ws.rs.ForbiddenException("Not authorized to delete this stack");
        }

        stackRepository.delete(stack);
    }

    // Promotion flow removed

    private boolean isOwnerMatch(String storedCreatedBy, String currentCreatedBy) {
        if (storedCreatedBy == null || currentCreatedBy == null) return false;
        String a = normalize(storedCreatedBy);
        String b = normalize(currentCreatedBy);
        if (a.equals(b)) return true;
        String storedLocal = localPart(a);
        String currentLocal = localPart(b);
        return storedLocal != null && storedLocal.equalsIgnoreCase(currentLocal);
    }

    private String localPart(String val) {
        int at = val.indexOf('@');
        if (at > 0) return val.substring(0, at);
        return val;
    }

    private String normalize(String s) {
        return s == null ? null : s.trim().toLowerCase();
    }

    /**
     * Validates stack configuration against property schemas.
     * This is a placeholder for full validation that will be implemented once:
     * - Stack has cloudProvider relationship (task 14.1)
     * - StackResource has resourceType and cloudProvider relationships (task 14.3)
     * 
     * Currently performs basic validation if schema information is available in the configuration.
     */
    private void validateStackConfiguration(StackCreateDto createDto) {
        // TODO: Once task 14.1 is complete, validate stack-level configuration
        // TODO: Once task 14.3 is complete, validate resource-level configurations
        
        // For now, we can only validate if the configuration contains metadata about
        // resourceTypeId and cloudProviderId for each resource
        Map<String, Object> configuration = createDto.getConfiguration();
        
        if (configuration == null || configuration.isEmpty()) {
            return;
        }

        // Check if configuration contains resource definitions with schema metadata
        // This is a forward-compatible approach that will work once the entity relationships are added
        for (Map.Entry<String, Object> entry : configuration.entrySet()) {
            if (entry.getValue() instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> resourceConfig = (Map<String, Object>) entry.getValue();
                
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
                                    .append(entry.getKey())
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
    }
}
