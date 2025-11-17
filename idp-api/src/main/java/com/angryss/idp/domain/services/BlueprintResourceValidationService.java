package com.angryss.idp.domain.services;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.valueobjects.StackType;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Domain service responsible for validating that a blueprint contains the required
 * resources for a given stack type.
 * 
 * Validation rules:
 * - RESTFUL_API and EVENT_DRIVEN_API require a "Managed Container Orchestrator" resource
 * - JAVASCRIPT_WEB_APPLICATION requires a "Storage" resource
 * - INFRASTRUCTURE stacks have no validation requirements
 * - Serverless stacks (RESTFUL_SERVERLESS, EVENT_DRIVEN_SERVERLESS) have no validation requirements
 */
@ApplicationScoped
public class BlueprintResourceValidationService {

    private static final String CONTAINER_ORCHESTRATOR_TYPE = "Managed Container Orchestrator";
    private static final String STORAGE_TYPE = "Storage";

    /**
     * Validates that the blueprint contains required resources for the stack type.
     * 
     * @param stackType The type of stack being created
     * @param blueprint The blueprint to validate (can be null for Infrastructure-only stacks)
     * @throws IllegalArgumentException if validation fails
     */
    public void validateBlueprintResourcesForStackType(StackType stackType, Blueprint blueprint) {
        if (stackType == null) {
            throw new IllegalArgumentException("Stack type cannot be null");
        }

        // Infrastructure and serverless stacks don't require specific resources
        if (stackType == StackType.INFRASTRUCTURE || 
            stackType == StackType.RESTFUL_SERVERLESS || 
            stackType == StackType.EVENT_DRIVEN_SERVERLESS) {
            return;
        }

        // Container-based stacks require a blueprint with Container Orchestrator
        if (stackType == StackType.RESTFUL_API || stackType == StackType.EVENT_DRIVEN_API) {
            if (blueprint == null) {
                throw new IllegalArgumentException(
                    "Stack type '" + stackType.getDisplayName() + "' requires a blueprint with a Container Orchestrator resource"
                );
            }
            
            if (!hasContainerOrchestrator(blueprint)) {
                throw new IllegalArgumentException(
                    "Stack type '" + stackType.getDisplayName() + "' requires a blueprint with a Container Orchestrator resource"
                );
            }
        }

        // JavaScript Web Applications require a blueprint with Storage
        if (stackType == StackType.JAVASCRIPT_WEB_APPLICATION) {
            if (blueprint == null) {
                throw new IllegalArgumentException(
                    "Stack type '" + stackType.getDisplayName() + "' requires a blueprint with a Storage resource"
                );
            }
            
            if (!hasStorageResource(blueprint)) {
                throw new IllegalArgumentException(
                    "Stack type '" + stackType.getDisplayName() + "' requires a blueprint with a Storage resource"
                );
            }
        }
    }

    /**
     * Checks if the blueprint contains a Container Orchestrator resource.
     * 
     * @param blueprint The blueprint to check
     * @return true if a Container Orchestrator is present
     */
    private boolean hasContainerOrchestrator(Blueprint blueprint) {
        if (blueprint == null || blueprint.getResources() == null) {
            return false;
        }

        return blueprint.getResources().stream()
            .anyMatch(resource -> {
                String resourceTypeName = getResourceTypeName(resource);
                return CONTAINER_ORCHESTRATOR_TYPE.equals(resourceTypeName);
            });
    }

    /**
     * Checks if the blueprint contains a Storage resource (S3 bucket).
     * 
     * @param blueprint The blueprint to check
     * @return true if a Storage resource is present
     */
    private boolean hasStorageResource(Blueprint blueprint) {
        if (blueprint == null || blueprint.getResources() == null) {
            return false;
        }

        return blueprint.getResources().stream()
            .anyMatch(resource -> {
                String resourceTypeName = getResourceTypeName(resource);
                return STORAGE_TYPE.equals(resourceTypeName);
            });
    }

    /**
     * Gets the resource type name from a blueprint resource.
     * 
     * @param resource The blueprint resource
     * @return The resource type name, or null if not available
     */
    private String getResourceTypeName(BlueprintResource resource) {
        if (resource == null) {
            return null;
        }

        ResourceType resourceType = resource.getResourceType();
        if (resourceType == null) {
            return null;
        }

        return resourceType.name;
    }
}
