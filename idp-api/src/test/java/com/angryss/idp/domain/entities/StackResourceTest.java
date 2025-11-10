package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.services.PropertyValidationService;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class StackResourceTest {

    @Inject
    PropertyValidationService validationService;

    // Track created entities for cleanup
    private List<UUID> createdStackResourceIds = new ArrayList<>();
    private List<UUID> createdStackIds = new ArrayList<>();
    private List<UUID> createdPropertySchemaIds = new ArrayList<>();
    private List<UUID> createdMappingIds = new ArrayList<>();
    private List<UUID> createdResourceTypeIds = new ArrayList<>();
    private List<UUID> createdCloudProviderIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        // Clean up in correct order (children first to respect foreign key constraints)
        for (UUID id : createdStackResourceIds) {
            StackResource.findByIdOptional(id).ifPresent(sr -> sr.delete());
        }
        for (UUID id : createdStackIds) {
            Stack.findByIdOptional(id).ifPresent(stack -> stack.delete());
        }
        for (UUID id : createdPropertySchemaIds) {
            PropertySchema.findByIdOptional(id).ifPresent(ps -> ps.delete());
        }
        for (UUID id : createdMappingIds) {
            ResourceTypeCloudMapping.findByIdOptional(id).ifPresent(m -> m.delete());
        }
        for (UUID id : createdResourceTypeIds) {
            com.angryss.idp.domain.entities.ResourceType.findByIdOptional(id).ifPresent(rt -> rt.delete());
        }
        for (UUID id : createdCloudProviderIds) {
            CloudProvider.<CloudProvider>findByIdOptional(id).ifPresent(cp -> cp.delete());
        }
        
        // Clear all tracking lists
        createdStackResourceIds.clear();
        createdStackIds.clear();
        createdPropertySchemaIds.clear();
        createdMappingIds.clear();
        createdResourceTypeIds.clear();
        createdCloudProviderIds.clear();
    }

    @Test
    @Transactional
    void testStackResourceWithResourceTypeAndCloudProvider() {
        // Create a cloud provider with unique name
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = "AWS_" + UUID.randomUUID();
        cloudProvider.displayName = "Amazon Web Services";
        cloudProvider.enabled = true;
        cloudProvider.persist();
        createdCloudProviderIds.add(cloudProvider.id);

        // Create a resource type with unique name
        com.angryss.idp.domain.entities.ResourceType resourceType = new com.angryss.idp.domain.entities.ResourceType();
        resourceType.name = "Relational Database " + UUID.randomUUID();
        resourceType.displayName = "Relational Database";
        resourceType.category = ResourceCategory.NON_SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        createdResourceTypeIds.add(resourceType.id);

        // Create a stack with unique name
        String uniqueId = UUID.randomUUID().toString().substring(0, 4);
        Stack stack = new Stack();
        stack.setName("Test Stack " + UUID.randomUUID());
        stack.setDescription("Test stack for resource testing");
        stack.setCloudName("test-stack-" + UUID.randomUUID());
        stack.setRoutePath("/test-" + uniqueId + "/");
        stack.setStackType(StackType.RESTFUL_API);
        stack.setCreatedBy("test-user");
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        stack.persist();
        createdStackIds.add(stack.getId());

        // Create a stack resource with the new relationships
        Map<String, Object> configuration = new HashMap<>();
        configuration.put("instanceType", "db.t3.micro");
        configuration.put("storageSize", 20);

        StackResource resource = new StackResource(
            "Test Database",
            "Test database resource",
            resourceType,
            cloudProvider,
            configuration,
            stack
        );
        resource.setCreatedAt(LocalDateTime.now());
        resource.setUpdatedAt(LocalDateTime.now());
        
        resource.persist();
        resource.flush();
        createdStackResourceIds.add(resource.id);

        // Verify the resource was persisted with relationships
        StackResource persistedResource = StackResource.findById(resource.id);
        assertNotNull(persistedResource);
        assertEquals("Test Database", persistedResource.getName());
        assertNotNull(persistedResource.getResourceType());
        assertTrue(persistedResource.getResourceType().name.startsWith("Relational Database"));
        assertNotNull(persistedResource.getCloudProvider());
        assertTrue(persistedResource.getCloudProvider().name.startsWith("AWS"));
        assertNotNull(persistedResource.getConfiguration());
        assertEquals("db.t3.micro", persistedResource.getConfiguration().get("instanceType"));
    }

    @Test
    @Transactional
    void testStackResourceConfigurationValidation() {
        // Create a cloud provider with unique name
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = "Azure_" + UUID.randomUUID();
        cloudProvider.displayName = "Microsoft Azure";
        cloudProvider.enabled = true;
        cloudProvider.persist();
        createdCloudProviderIds.add(cloudProvider.id);

        // Create a resource type with unique name
        com.angryss.idp.domain.entities.ResourceType resourceType = new com.angryss.idp.domain.entities.ResourceType();
        resourceType.name = "Queue " + UUID.randomUUID();
        resourceType.displayName = "Message Queue";
        resourceType.category = ResourceCategory.NON_SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        createdResourceTypeIds.add(resourceType.id);

        // Create a resource type cloud mapping
        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = cloudProvider;
        mapping.terraformModuleLocation = "git::https://example.com/modules/queue.git";
        mapping.moduleLocationType = com.angryss.idp.domain.valueobjects.ModuleLocationType.GIT;
        mapping.enabled = true;
        mapping.persist();
        createdMappingIds.add(mapping.id);

        // Create property schemas
        PropertySchema schema1 = new PropertySchema();
        schema1.mapping = mapping;
        schema1.propertyName = "queueName";
        schema1.displayName = "Queue Name";
        schema1.dataType = PropertyDataType.STRING;
        schema1.required = true;
        schema1.persist();
        createdPropertySchemaIds.add(schema1.id);

        PropertySchema schema2 = new PropertySchema();
        schema2.mapping = mapping;
        schema2.propertyName = "maxMessageSize";
        schema2.displayName = "Max Message Size";
        schema2.dataType = PropertyDataType.NUMBER;
        schema2.required = false;
        Map<String, Object> validationRules = new HashMap<>();
        validationRules.put("min", 1);
        validationRules.put("max", 256);
        schema2.validationRules = validationRules;
        schema2.persist();
        createdPropertySchemaIds.add(schema2.id);

        // Create a stack with unique name
        String uniqueId = UUID.randomUUID().toString().substring(0, 4);
        Stack stack = new Stack();
        stack.setName("Validation Test Stack " + UUID.randomUUID());
        stack.setDescription("Stack for validation testing");
        stack.setCloudName("validation-test-" + UUID.randomUUID());
        stack.setRoutePath("/valid-" + uniqueId + "/");
        stack.setStackType(StackType.EVENT_DRIVEN_API);
        stack.setCreatedBy("test-user");
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        stack.persist();
        createdStackIds.add(stack.getId());

        // Test valid configuration
        Map<String, Object> validConfig = new HashMap<>();
        validConfig.put("queueName", "my-queue");
        validConfig.put("maxMessageSize", 128);

        StackResource validResource = new StackResource(
            "Valid Queue",
            "Queue with valid configuration",
            resourceType,
            cloudProvider,
            validConfig,
            stack
        );

        List<PropertySchema> schemas = Arrays.asList(schema1, schema2);
        PropertyValidationService.ValidationResult result = validResource.validateConfiguration(validationService, schemas);
        assertTrue(result.isValid(), "Valid configuration should pass validation");

        // Test invalid configuration - missing required field
        Map<String, Object> invalidConfig1 = new HashMap<>();
        invalidConfig1.put("maxMessageSize", 128);

        StackResource invalidResource1 = new StackResource(
            "Invalid Queue 1",
            "Queue missing required field",
            resourceType,
            cloudProvider,
            invalidConfig1,
            stack
        );

        PropertyValidationService.ValidationResult result1 = invalidResource1.validateConfiguration(validationService, schemas);
        assertFalse(result1.isValid(), "Configuration missing required field should fail validation");
        assertTrue(result1.getErrors().containsKey("queueName"));

        // Test invalid configuration - value out of range
        Map<String, Object> invalidConfig2 = new HashMap<>();
        invalidConfig2.put("queueName", "my-queue");
        invalidConfig2.put("maxMessageSize", 500);

        StackResource invalidResource2 = new StackResource(
            "Invalid Queue 2",
            "Queue with out-of-range value",
            resourceType,
            cloudProvider,
            invalidConfig2,
            stack
        );

        PropertyValidationService.ValidationResult result2 = invalidResource2.validateConfiguration(validationService, schemas);
        assertFalse(result2.isValid(), "Configuration with out-of-range value should fail validation");
        assertTrue(result2.getErrors().containsKey("maxMessageSize"));
    }
}
