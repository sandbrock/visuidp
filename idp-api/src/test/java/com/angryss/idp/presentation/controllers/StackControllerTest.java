package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;

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
}
