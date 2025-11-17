package com.angryss.idp.domain.services;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class BlueprintResourceValidationServiceTest {

    @Inject
    BlueprintResourceValidationService validationService;

    // Helper method to create a ResourceType
    private ResourceType createResourceType(String name, String displayName) {
        ResourceType resourceType = new ResourceType();
        resourceType.name = name;
        resourceType.displayName = displayName;
        resourceType.description = "Test resource type";
        resourceType.category = ResourceCategory.SHARED;
        resourceType.enabled = true;
        resourceType.createdAt = LocalDateTime.now();
        resourceType.updatedAt = LocalDateTime.now();
        return resourceType;
    }

    // Helper method to create a BlueprintResource
    private BlueprintResource createBlueprintResource(ResourceType resourceType) {
        BlueprintResource resource = new BlueprintResource();
        resource.setName("Test Resource");
        resource.setDescription("Test resource description");
        resource.setResourceType(resourceType);
        resource.setCreatedAt(LocalDateTime.now());
        resource.setUpdatedAt(LocalDateTime.now());
        return resource;
    }

    // Helper method to create a Blueprint with resources
    private Blueprint createBlueprint(Set<BlueprintResource> resources) {
        Blueprint blueprint = new Blueprint();
        blueprint.setName("Test Blueprint");
        blueprint.setDescription("Test blueprint description");
        blueprint.setIsActive(true);
        blueprint.setCreatedAt(LocalDateTime.now());
        blueprint.setUpdatedAt(LocalDateTime.now());
        blueprint.setResources(resources);
        return blueprint;
    }

    @Test
    public void testValidateRestfulApiWithContainerOrchestrator_Success() {
        // Given: Blueprint with Container Orchestrator
        ResourceType orchestratorType = createResourceType("Managed Container Orchestrator", "Managed Container Orchestrator");
        BlueprintResource orchestratorResource = createBlueprintResource(orchestratorType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(orchestratorResource);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should pass without exception
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.RESTFUL_API, blueprint)
        );
    }

    @Test
    public void testValidateRestfulApiWithoutContainerOrchestrator_Fails() {
        // Given: Blueprint without Container Orchestrator
        ResourceType storageType = createResourceType("Storage", "Storage");
        BlueprintResource storageResource = createBlueprintResource(storageType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(storageResource);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should fail with appropriate message
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            validationService.validateBlueprintResourcesForStackType(StackType.RESTFUL_API, blueprint)
        );
        
        assertTrue(exception.getMessage().contains("RESTful API"));
        assertTrue(exception.getMessage().contains("Container Orchestrator"));
    }

    @Test
    public void testValidateEventDrivenApiWithContainerOrchestrator_Success() {
        // Given: Blueprint with Container Orchestrator
        ResourceType orchestratorType = createResourceType("Managed Container Orchestrator", "Managed Container Orchestrator");
        BlueprintResource orchestratorResource = createBlueprintResource(orchestratorType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(orchestratorResource);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should pass without exception
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.EVENT_DRIVEN_API, blueprint)
        );
    }

    @Test
    public void testValidateEventDrivenApiWithoutContainerOrchestrator_Fails() {
        // Given: Blueprint without Container Orchestrator
        ResourceType databaseType = createResourceType("Relational Database Server", "Relational Database Server");
        BlueprintResource databaseResource = createBlueprintResource(databaseType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(databaseResource);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should fail with appropriate message
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            validationService.validateBlueprintResourcesForStackType(StackType.EVENT_DRIVEN_API, blueprint)
        );
        
        assertTrue(exception.getMessage().contains("Event-driven API"));
        assertTrue(exception.getMessage().contains("Container Orchestrator"));
    }

    @Test
    public void testValidateJavaScriptWebAppWithStorage_Success() {
        // Given: Blueprint with Storage resource
        ResourceType storageType = createResourceType("Storage", "Storage");
        BlueprintResource storageResource = createBlueprintResource(storageType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(storageResource);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should pass without exception
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.JAVASCRIPT_WEB_APPLICATION, blueprint)
        );
    }

    @Test
    public void testValidateJavaScriptWebAppWithoutStorage_Fails() {
        // Given: Blueprint without Storage resource
        ResourceType orchestratorType = createResourceType("Managed Container Orchestrator", "Managed Container Orchestrator");
        BlueprintResource orchestratorResource = createBlueprintResource(orchestratorType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(orchestratorResource);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should fail with appropriate message
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            validationService.validateBlueprintResourcesForStackType(StackType.JAVASCRIPT_WEB_APPLICATION, blueprint)
        );
        
        assertTrue(exception.getMessage().contains("JavaScript Web Application"));
        assertTrue(exception.getMessage().contains("Storage"));
    }

    @Test
    public void testValidateInfrastructureStack_NoValidation() {
        // Given: Infrastructure stack with null blueprint
        Blueprint blueprint = null;

        // When/Then: Validation should pass without exception (no validation required)
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.INFRASTRUCTURE, blueprint)
        );
    }

    @Test
    public void testValidateInfrastructureStackWithBlueprint_NoValidation() {
        // Given: Infrastructure stack with blueprint (no specific resources required)
        ResourceType databaseType = createResourceType("Relational Database Server", "Relational Database Server");
        BlueprintResource databaseResource = createBlueprintResource(databaseType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(databaseResource);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should pass without exception (no validation required)
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.INFRASTRUCTURE, blueprint)
        );
    }

    @Test
    public void testValidateRestfulServerlessStack_NoValidation() {
        // Given: Serverless stack with null blueprint
        Blueprint blueprint = null;

        // When/Then: Validation should pass without exception (serverless doesn't need orchestrator)
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.RESTFUL_SERVERLESS, blueprint)
        );
    }

    @Test
    public void testValidateEventDrivenServerlessStack_NoValidation() {
        // Given: Serverless stack with null blueprint
        Blueprint blueprint = null;

        // When/Then: Validation should pass without exception (serverless doesn't need orchestrator)
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.EVENT_DRIVEN_SERVERLESS, blueprint)
        );
    }

    @Test
    public void testValidateContainerStackWithNullBlueprint_Fails() {
        // Given: Container-based stack with null blueprint
        Blueprint blueprint = null;

        // When/Then: Validation should fail for RESTful API
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            validationService.validateBlueprintResourcesForStackType(StackType.RESTFUL_API, blueprint)
        );
        
        assertTrue(exception.getMessage().contains("RESTful API"));
        assertTrue(exception.getMessage().contains("Container Orchestrator"));
    }

    @Test
    public void testValidateJavaScriptWebAppWithNullBlueprint_Fails() {
        // Given: JavaScript Web Application with null blueprint
        Blueprint blueprint = null;

        // When/Then: Validation should fail
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            validationService.validateBlueprintResourcesForStackType(StackType.JAVASCRIPT_WEB_APPLICATION, blueprint)
        );
        
        assertTrue(exception.getMessage().contains("JavaScript Web Application"));
        assertTrue(exception.getMessage().contains("Storage"));
    }

    @Test
    public void testValidateWithNullStackType_Fails() {
        // Given: Null stack type
        Blueprint blueprint = createBlueprint(new HashSet<>());

        // When/Then: Validation should fail
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            validationService.validateBlueprintResourcesForStackType(null, blueprint)
        );
        
        assertTrue(exception.getMessage().contains("Stack type cannot be null"));
    }

    @Test
    public void testValidateWithEmptyResourceSet_Fails() {
        // Given: Blueprint with empty resource set
        Blueprint blueprint = createBlueprint(new HashSet<>());

        // When/Then: Validation should fail for container-based stack
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
            validationService.validateBlueprintResourcesForStackType(StackType.RESTFUL_API, blueprint)
        );
        
        assertTrue(exception.getMessage().contains("Container Orchestrator"));
    }

    @Test
    public void testValidateWithMultipleContainerOrchestrators_Success() {
        // Given: Blueprint with multiple Container Orchestrators
        ResourceType orchestratorType = createResourceType("Managed Container Orchestrator", "Managed Container Orchestrator");
        BlueprintResource orchestrator1 = createBlueprintResource(orchestratorType);
        BlueprintResource orchestrator2 = createBlueprintResource(orchestratorType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(orchestrator1);
        resources.add(orchestrator2);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should pass (at least one is sufficient)
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.RESTFUL_API, blueprint)
        );
    }

    @Test
    public void testValidateWithMultipleStorageResources_Success() {
        // Given: Blueprint with multiple Storage resources
        ResourceType storageType = createResourceType("Storage", "Storage");
        BlueprintResource storage1 = createBlueprintResource(storageType);
        BlueprintResource storage2 = createBlueprintResource(storageType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(storage1);
        resources.add(storage2);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should pass (at least one is sufficient)
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.JAVASCRIPT_WEB_APPLICATION, blueprint)
        );
    }

    @Test
    public void testValidateWithMixedResources_Success() {
        // Given: Blueprint with both Container Orchestrator and Storage
        ResourceType orchestratorType = createResourceType("Managed Container Orchestrator", "Managed Container Orchestrator");
        ResourceType storageType = createResourceType("Storage", "Storage");
        
        BlueprintResource orchestratorResource = createBlueprintResource(orchestratorType);
        BlueprintResource storageResource = createBlueprintResource(storageType);
        
        Set<BlueprintResource> resources = new HashSet<>();
        resources.add(orchestratorResource);
        resources.add(storageResource);
        
        Blueprint blueprint = createBlueprint(resources);

        // When/Then: Validation should pass for both stack types
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.RESTFUL_API, blueprint)
        );
        
        assertDoesNotThrow(() -> 
            validationService.validateBlueprintResourcesForStackType(StackType.JAVASCRIPT_WEB_APPLICATION, blueprint)
        );
    }
}
