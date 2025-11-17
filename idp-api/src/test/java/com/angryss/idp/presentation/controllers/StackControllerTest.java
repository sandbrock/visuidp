package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
public class StackControllerTest {

    private static final String TEST_USER = "testuser@example.com";
    private static final String TEST_GROUPS = "Users";

    private UUID testCloudProviderId;
    private UUID testResourceTypeId;
    private UUID testMappingId;

    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up existing test data in correct order (children first)
        PropertySchema.deleteAll();
        ResourceTypeCloudMapping.deleteAll();
        StackResource.deleteAll();
        BlueprintResource.deleteAll();
        EnvironmentConfig.deleteAll();

        EnvironmentEntity.deleteAll();
        ResourceType.deleteAll();
        CloudProvider.deleteAll();

        // Create a test cloud provider
        CloudProvider provider = new CloudProvider();
        provider.name = "TEST_AWS";
        provider.displayName = "Test Amazon Web Services";
        provider.description = "Test AWS provider";
        provider.enabled = true;
        provider.persist();
        testCloudProviderId = provider.id;

        // Create a test resource type (NON_SHARED for stacks)
        ResourceType resourceType = new ResourceType();
        resourceType.name = "TEST_DATABASE";
        resourceType.displayName = "Test Database";
        resourceType.description = "Test database resource";
        resourceType.category = ResourceCategory.NON_SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        testResourceTypeId = resourceType.id;

        // Create a mapping
        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = provider;
        mapping.terraformModuleLocation = "git::https://github.com/test/module.git";
        mapping.moduleLocationType = ModuleLocationType.GIT;
        mapping.enabled = true;
        mapping.persist();
        testMappingId = mapping.id;

        // Create property schemas
        PropertySchema schema1 = new PropertySchema();
        schema1.mapping = mapping;
        schema1.propertyName = "instanceType";
        schema1.displayName = "Instance Type";
        schema1.description = "Database instance type";
        schema1.dataType = PropertyDataType.STRING;
        schema1.required = true;
        schema1.displayOrder = 1;
        schema1.persist();

        PropertySchema schema2 = new PropertySchema();
        schema2.mapping = mapping;
        schema2.propertyName = "storageSize";
        schema2.displayName = "Storage Size (GB)";
        schema2.description = "Database storage size in GB";
        schema2.dataType = PropertyDataType.NUMBER;
        schema2.required = false;
        schema2.displayOrder = 2;
        schema2.persist();
    }

    @Test
    public void testGetAvailableCloudProviders() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/stacks/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].name", equalTo("TEST_AWS"))
                .body("[0].enabled", equalTo(true));
    }

    @Test
    public void testGetAvailableCloudProviders_Unauthenticated_ShouldFail() {
        given()
            .when().get("/v1/stacks/available-cloud-providers")
            .then()
                .statusCode(401);
    }

    @Test
    public void testGetAvailableResourceTypes() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/stacks/available-resource-types")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].name", equalTo("TEST_DATABASE"))
                .body("[0].category", equalTo("NON_SHARED"))
                .body("[0].enabled", equalTo(true));
    }

    @Test
    public void testGetAvailableResourceTypes_Unauthenticated_ShouldFail() {
        given()
            .when().get("/v1/stacks/available-resource-types")
            .then()
                .statusCode(401);
    }

    @Test
    public void testGetResourceSchema() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/stacks/resource-schema/" + testResourceTypeId + "/" + testCloudProviderId)
            .then()
                .statusCode(200)
                .body("instanceType", notNullValue())
                .body("instanceType.propertyName", equalTo("instanceType"))
                .body("instanceType.displayName", equalTo("Instance Type"))
                .body("instanceType.dataType", equalTo("STRING"))
                .body("instanceType.required", equalTo(true))
                .body("storageSize", notNullValue())
                .body("storageSize.propertyName", equalTo("storageSize"))
                .body("storageSize.dataType", equalTo("NUMBER"))
                .body("storageSize.required", equalTo(false));
    }

    @Test
    public void testGetResourceSchema_NotFound() {
        UUID nonExistentResourceTypeId = UUID.randomUUID();
        UUID nonExistentCloudProviderId = UUID.randomUUID();
        
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/stacks/resource-schema/" + nonExistentResourceTypeId + "/" + nonExistentCloudProviderId)
            .then()
                .statusCode(404);
    }

    @Test
    public void testGetResourceSchema_Unauthenticated_ShouldFail() {
        given()
            .when().get("/v1/stacks/resource-schema/" + testResourceTypeId + "/" + testCloudProviderId)
            .then()
                .statusCode(401);
    }

    @Test
    @Transactional
    public void testGetAvailableCloudProviders_OnlyEnabledReturned() {
        // Create a disabled cloud provider
        CloudProvider disabledProvider = new CloudProvider();
        disabledProvider.name = "TEST_DISABLED_PROVIDER";
        disabledProvider.displayName = "Test Disabled Provider";
        disabledProvider.description = "This provider is disabled";
        disabledProvider.enabled = false;
        disabledProvider.persist();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/stacks/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("$", hasSize(1)) // Only the enabled provider
                .body("[0].name", equalTo("TEST_AWS"))
                .body("[0].enabled", equalTo(true));
    }

    @Test
    public void testGetAvailableResourceTypes_OnlyEnabledAndCorrectCategoryReturned() {
        // Create test data in a separate transaction
        createTestResourceTypesForFiltering();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/stacks/available-resource-types")
            .then()
                .statusCode(200)
                .body("$", hasSize(2)) // TEST_DATABASE (NON_SHARED) and TEST_BOTH_RESOURCE
                .body("name", hasItems("TEST_DATABASE", "TEST_BOTH_RESOURCE"))
                .body("category", hasItems("NON_SHARED", "BOTH"));
    }

    @Transactional
    void createTestResourceTypesForFiltering() {
        // Create a disabled resource type
        ResourceType disabledResourceType = new ResourceType();
        disabledResourceType.name = "TEST_DISABLED_RESOURCE";
        disabledResourceType.displayName = "Test Disabled Resource";
        disabledResourceType.description = "This resource is disabled";
        disabledResourceType.category = ResourceCategory.NON_SHARED;
        disabledResourceType.enabled = false;
        disabledResourceType.persist();

        // Create a SHARED resource type (should not appear for stacks)
        ResourceType sharedResourceType = new ResourceType();
        sharedResourceType.name = "TEST_SHARED_RESOURCE";
        sharedResourceType.displayName = "Test Shared Resource";
        sharedResourceType.description = "This is a shared resource";
        sharedResourceType.category = ResourceCategory.SHARED;
        sharedResourceType.enabled = true;
        sharedResourceType.persist();

        // Create a BOTH resource type (should appear for stacks)
        ResourceType bothResourceType = new ResourceType();
        bothResourceType.name = "TEST_BOTH_RESOURCE";
        bothResourceType.displayName = "Test Both Resource";
        bothResourceType.description = "This can be used in both contexts";
        bothResourceType.category = ResourceCategory.BOTH;
        bothResourceType.enabled = true;
        bothResourceType.persist();
    }

    @Test
    public void testGetResourceSchema_WithValidationRules() {
        // Create test data in a separate transaction
        createPropertySchemaWithValidationRules();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/stacks/resource-schema/" + testResourceTypeId + "/" + testCloudProviderId)
            .then()
                .statusCode(200)
                .body("maxConnections", notNullValue())
                .body("maxConnections.propertyName", equalTo("maxConnections"))
                .body("maxConnections.required", equalTo(true))
                .body("maxConnections.validationRules.min", equalTo(1))
                .body("maxConnections.validationRules.max", equalTo(1000));
    }

    @Transactional
    void createPropertySchemaWithValidationRules() {
        // Create a property with validation rules
        PropertySchema schemaWithRules = new PropertySchema();
        schemaWithRules.mapping = ResourceTypeCloudMapping.findById(testMappingId);
        schemaWithRules.propertyName = "maxConnections";
        schemaWithRules.displayName = "Max Connections";
        schemaWithRules.description = "Maximum number of connections";
        schemaWithRules.dataType = PropertyDataType.NUMBER;
        schemaWithRules.required = true;
        schemaWithRules.validationRules = Map.of("min", 1, "max", 1000);
        schemaWithRules.displayOrder = 3;
        schemaWithRules.persist();
    }

    // ========== Blueprint Resource Validation Tests ==========

    @Test
    public void testCreateRestfulApiStackWithInvalidBlueprint_Returns400() {
        // Create test data in a separate transaction
        UUID blueprintId = createBlueprintWithoutContainerOrchestrator();

        // Create stack request DTO
        Map<String, Object> stackDto = new HashMap<>();
        stackDto.put("name", "Test RESTful API Stack");
        stackDto.put("cloudName", "test-restful-api");
        stackDto.put("routePath", "/test-api/");
        stackDto.put("stackType", "RESTFUL_API");
        stackDto.put("programmingLanguage", "QUARKUS");
        stackDto.put("blueprintId", blueprintId.toString());

        String response = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(stackDto)
            .when().post("/v1/stacks")
            .then()
                .statusCode(400)
                .extract().asString();
        
        // Verify error message contains expected text
        assertTrue(response.contains("RESTful API") || response.contains("Container Orchestrator"),
            "Response should mention RESTful API or Container Orchestrator requirement. Got: " + response);
    }

    @Test
    public void testCreateRestfulApiStackWithValidBlueprint_Returns201() {
        // Create test data in a separate transaction
        UUID blueprintId = createBlueprintWithContainerOrchestrator();

        // Create stack request DTO
        Map<String, Object> stackDto = new HashMap<>();
        stackDto.put("name", "Test RESTful API Stack Valid");
        stackDto.put("cloudName", "test-restful-valid");
        stackDto.put("routePath", "/test-valid/");
        stackDto.put("stackType", "RESTFUL_API");
        stackDto.put("programmingLanguage", "QUARKUS");
        stackDto.put("blueprintId", blueprintId.toString());

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(stackDto)
            .when().post("/v1/stacks")
            .then()
                .statusCode(201)
                .body("name", equalTo("Test RESTful API Stack Valid"))
                .body("stackType", equalTo("RESTFUL_API"));
    }

    @Test
    public void testCreateJavaScriptWebAppWithInvalidBlueprint_Returns400() {
        // Create test data in a separate transaction
        UUID blueprintId = createBlueprintWithoutStorage();

        // Create stack request DTO
        Map<String, Object> stackDto = new HashMap<>();
        stackDto.put("name", "Test JS Web App");
        stackDto.put("cloudName", "test-js-webapp");
        stackDto.put("routePath", "/test-js/");
        stackDto.put("stackType", "JAVASCRIPT_WEB_APPLICATION");
        stackDto.put("blueprintId", blueprintId.toString());

        String response = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(stackDto)
            .when().post("/v1/stacks")
            .then()
                .statusCode(400)
                .extract().asString();
        
        // Verify error message contains expected text
        assertTrue(response.contains("JavaScript Web Application") || response.contains("Storage"),
            "Response should mention JavaScript Web Application or Storage requirement. Got: " + response);
    }

    @Test
    public void testUpdateStackWithInvalidBlueprint_Returns400() {
        // Create test data in a separate transaction
        UUID validBlueprintId = createBlueprintWithContainerOrchestrator();
        UUID invalidBlueprintId = createBlueprintWithoutContainerOrchestrator();
        UUID stackId = createTestStack(validBlueprintId);

        // Update stack to use invalid blueprint
        Map<String, Object> updateDto = new HashMap<>();
        updateDto.put("name", "Updated Stack Name");
        updateDto.put("cloudName", "updated-stack");
        updateDto.put("routePath", "/updated/");
        updateDto.put("stackType", "RESTFUL_API");
        updateDto.put("programmingLanguage", "QUARKUS");
        updateDto.put("blueprintId", invalidBlueprintId.toString());

        String response = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(updateDto)
            .when().put("/v1/stacks/" + stackId)
            .then()
                .statusCode(400)
                .extract().asString();
        
        // Verify error message contains expected text
        assertTrue(response.contains("RESTful API") || response.contains("Container Orchestrator"),
            "Response should mention RESTful API or Container Orchestrator requirement. Got: " + response);
    }

    // Helper methods for creating test data

    @Transactional
    UUID createBlueprintWithContainerOrchestrator() {
        // Create Container Orchestrator resource type
        ResourceType orchestratorType = new ResourceType();
        orchestratorType.name = "Managed Container Orchestrator";
        orchestratorType.displayName = "Managed Container Orchestrator";
        orchestratorType.description = "Container orchestration platform";
        orchestratorType.category = ResourceCategory.SHARED;
        orchestratorType.enabled = true;
        orchestratorType.persist();

        // Get or create cloud provider
        CloudProvider cloudProvider = CloudProvider.find("name", "TEST_AWS").firstResult();
        if (cloudProvider == null) {
            cloudProvider = new CloudProvider();
            cloudProvider.name = "TEST_AWS";
            cloudProvider.displayName = "Test AWS";
            cloudProvider.description = "Test AWS provider";
            cloudProvider.enabled = true;
            cloudProvider.persist();
        }

        // Create blueprint
        Blueprint blueprint = new Blueprint();
        blueprint.setName("Blueprint with Orchestrator " + UUID.randomUUID().toString().substring(0, 8));
        blueprint.setDescription("Test blueprint with container orchestrator");
        blueprint.setIsActive(true);
        blueprint.setCreatedAt(LocalDateTime.now());
        blueprint.setUpdatedAt(LocalDateTime.now());
        blueprint.persist();

        // Create blueprint resource with all required fields
        BlueprintResource resource = new BlueprintResource();
        resource.setName("Test Orchestrator " + UUID.randomUUID().toString().substring(0, 8));
        resource.setDescription("Test container orchestrator resource");
        resource.setBlueprint(blueprint);
        resource.setResourceType(orchestratorType);
        resource.setCloudProvider(cloudProvider);
        
        // Create a proper configuration object
        com.angryss.idp.domain.valueobjects.sharedinfra.ContainerOrchestratorConfiguration config = 
            new com.angryss.idp.domain.valueobjects.sharedinfra.ContainerOrchestratorConfiguration();
        config.setCloudServiceName("test-cluster");
        resource.setConfiguration(config);
        
        resource.setCloudSpecificProperties(Map.of());
        resource.setIsActive(true);
        resource.setCreatedAt(LocalDateTime.now());
        resource.setUpdatedAt(LocalDateTime.now());
        resource.persist();

        return blueprint.getId();
    }

    @Transactional
    UUID createBlueprintWithoutContainerOrchestrator() {
        // Create a different resource type (not Container Orchestrator)
        ResourceType databaseType = new ResourceType();
        databaseType.name = "Relational Database Server";
        databaseType.displayName = "Relational Database Server";
        databaseType.description = "Database server";
        databaseType.category = ResourceCategory.SHARED;
        databaseType.enabled = true;
        databaseType.persist();

        // Get or create cloud provider
        CloudProvider cloudProvider = CloudProvider.find("name", "TEST_AWS").firstResult();
        if (cloudProvider == null) {
            cloudProvider = new CloudProvider();
            cloudProvider.name = "TEST_AWS";
            cloudProvider.displayName = "Test AWS";
            cloudProvider.description = "Test AWS provider";
            cloudProvider.enabled = true;
            cloudProvider.persist();
        }

        // Create blueprint
        Blueprint blueprint = new Blueprint();
        blueprint.setName("Blueprint without Orchestrator " + UUID.randomUUID().toString().substring(0, 8));
        blueprint.setDescription("Test blueprint without container orchestrator");
        blueprint.setIsActive(true);
        blueprint.setCreatedAt(LocalDateTime.now());
        blueprint.setUpdatedAt(LocalDateTime.now());
        blueprint.persist();

        // Create blueprint resource (database, not orchestrator) with all required fields
        BlueprintResource resource = new BlueprintResource();
        resource.setName("Test Database " + UUID.randomUUID().toString().substring(0, 8));
        resource.setDescription("Test database resource");
        resource.setBlueprint(blueprint);
        resource.setResourceType(databaseType);
        resource.setCloudProvider(cloudProvider);
        
        // Create a proper configuration object
        com.angryss.idp.domain.valueobjects.sharedinfra.RelationalDatabaseServerConfiguration config = 
            new com.angryss.idp.domain.valueobjects.sharedinfra.RelationalDatabaseServerConfiguration();
        config.setCloudServiceName("test-database");
        resource.setConfiguration(config);
        
        resource.setCloudSpecificProperties(Map.of());
        resource.setIsActive(true);
        resource.setCreatedAt(LocalDateTime.now());
        resource.setUpdatedAt(LocalDateTime.now());
        resource.persist();

        return blueprint.getId();
    }

    @Transactional
    UUID createBlueprintWithoutStorage() {
        // Create a different resource type (not Storage)
        ResourceType databaseType = new ResourceType();
        databaseType.name = "Relational Database Server";
        databaseType.displayName = "Relational Database Server";
        databaseType.description = "Database server";
        databaseType.category = ResourceCategory.SHARED;
        databaseType.enabled = true;
        databaseType.persist();

        // Get or create cloud provider
        CloudProvider cloudProvider = CloudProvider.find("name", "TEST_AWS").firstResult();
        if (cloudProvider == null) {
            cloudProvider = new CloudProvider();
            cloudProvider.name = "TEST_AWS";
            cloudProvider.displayName = "Test AWS";
            cloudProvider.description = "Test AWS provider";
            cloudProvider.enabled = true;
            cloudProvider.persist();
        }

        // Create blueprint
        Blueprint blueprint = new Blueprint();
        blueprint.setName("Blueprint without Storage " + UUID.randomUUID().toString().substring(0, 8));
        blueprint.setDescription("Test blueprint without storage");
        blueprint.setIsActive(true);
        blueprint.setCreatedAt(LocalDateTime.now());
        blueprint.setUpdatedAt(LocalDateTime.now());
        blueprint.persist();

        // Create blueprint resource (database, not storage) with all required fields
        BlueprintResource resource = new BlueprintResource();
        resource.setName("Test Database " + UUID.randomUUID().toString().substring(0, 8));
        resource.setDescription("Test database resource");
        resource.setBlueprint(blueprint);
        resource.setResourceType(databaseType);
        resource.setCloudProvider(cloudProvider);
        
        // Create a proper configuration object
        com.angryss.idp.domain.valueobjects.sharedinfra.RelationalDatabaseServerConfiguration config = 
            new com.angryss.idp.domain.valueobjects.sharedinfra.RelationalDatabaseServerConfiguration();
        config.setCloudServiceName("test-database");
        resource.setConfiguration(config);
        
        resource.setCloudSpecificProperties(Map.of());
        resource.setIsActive(true);
        resource.setCreatedAt(LocalDateTime.now());
        resource.setUpdatedAt(LocalDateTime.now());
        resource.persist();

        return blueprint.getId();
    }

    @Transactional
    UUID createTestStack(UUID blueprintId) {
        Blueprint blueprint = Blueprint.findById(blueprintId);
        
        Stack stack = new Stack();
        stack.setName("Test Stack " + UUID.randomUUID().toString().substring(0, 8));
        stack.setCloudName("test-stack-" + UUID.randomUUID().toString().substring(0, 8));
        stack.setRoutePath("/test-" + UUID.randomUUID().toString().substring(0, 8) + "/");
        stack.setStackType(StackType.RESTFUL_API);
        stack.setBlueprint(blueprint);
        stack.setCreatedBy(TEST_USER);
        stack.persist();

        return stack.getId();
    }
}
