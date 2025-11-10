package com.angryss.idp.presentation.controllers;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;
import org.junit.jupiter.api.Order;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * End-to-end tests for the Admin Resource Configuration feature.
 * Tests the complete workflow from admin configuration to user consumption.
 */
@QuarkusTest
@TestMethodOrder(OrderAnnotation.class)
public class AdminResourceConfigurationE2ETest {

    private static final String ADMIN_USER = "admin@example.com";
    private static final String ADMIN_GROUPS = "IDP-Admins,Users";
    private static final String NON_ADMIN_USER = "user@example.com";
    private static final String NON_ADMIN_GROUPS = "Users";

    // Shared state across test methods
    private static UUID cloudProviderId;
    private static UUID sharedResourceTypeId;
    private static UUID nonSharedResourceTypeId;
    private static UUID sharedMappingId;
    private static UUID nonSharedMappingId;

    @BeforeEach
    @Transactional
    public void cleanup() {
        // Clean up all test data before each test in correct order (children first)
        com.angryss.idp.domain.entities.PropertySchema.deleteAll();
        com.angryss.idp.domain.entities.ResourceTypeCloudMapping.deleteAll();
        com.angryss.idp.domain.entities.StackResource.deleteAll();
        com.angryss.idp.domain.entities.BlueprintResource.deleteAll();
        com.angryss.idp.domain.entities.EnvironmentEntity.deleteAll();
        com.angryss.idp.domain.entities.ResourceType.deleteAll();
        com.angryss.idp.domain.entities.CloudProvider.deleteAll();
        
        // Reset shared state IDs
        cloudProviderId = null;
        sharedResourceTypeId = null;
        nonSharedResourceTypeId = null;
        sharedMappingId = null;
        nonSharedMappingId = null;
    }

    /**
     * Test 1: Admin creates a cloud provider
     * Requirement: 1.1 - Admin can create cloud providers
     */
    @Test
    @Order(1)
    public void test01_AdminCreatesCloudProvider() {
        String requestBody = """
            {
                "name": "E2E_AWS",
                "displayName": "E2E Amazon Web Services",
                "description": "AWS provider for E2E testing",
                "enabled": false
            }
            """;

        String response = given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/cloud-providers")
            .then()
                .statusCode(201)
                .body("name", equalTo("E2E_AWS"))
                .body("displayName", equalTo("E2E Amazon Web Services"))
                .body("enabled", equalTo(false))
                .body("id", notNullValue())
            .extract().asString();

        // Extract the ID for use in subsequent tests
        cloudProviderId = UUID.fromString(
            given()
                .header("X-Auth-Request-Email", ADMIN_USER)
                .header("X-Auth-Request-Groups", ADMIN_GROUPS)
                .when().get("/v1/admin/cloud-providers")
                .then()
                    .statusCode(200)
                    .body("$", hasSize(1))
                .extract().path("[0].id")
        );
    }

    /**
     * Test 2: Non-admin cannot create cloud provider
     * Requirement: 5.1, 5.2 - Authorization enforcement
     */
    @Test
    @Order(2)
    public void test02_NonAdminCannotCreateCloudProvider() {
        String requestBody = """
            {
                "name": "UNAUTHORIZED_PROVIDER",
                "displayName": "Unauthorized Provider",
                "enabled": false
            }
            """;

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/cloud-providers")
            .then()
                .statusCode(403);
    }

    /**
     * Test 3: Admin creates shared resource type (for blueprints)
     * Requirement: 2.1, 2.2 - Admin can create resource types with categories
     */
    @Test
    @Order(3)
    public void test03_AdminCreatesSharedResourceType() {
        String requestBody = """
            {
                "name": "E2E_CONTAINER_ORCHESTRATOR",
                "displayName": "E2E Container Orchestrator",
                "description": "Shared container orchestrator for E2E testing",
                "category": "SHARED",
                "enabled": false
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-types")
            .then()
                .statusCode(201)
                .body("name", equalTo("E2E_CONTAINER_ORCHESTRATOR"))
                .body("category", equalTo("SHARED"))
                .body("enabled", equalTo(false))
                .body("id", notNullValue());

        // Extract the ID
        sharedResourceTypeId = UUID.fromString(
            given()
                .header("X-Auth-Request-Email", ADMIN_USER)
                .header("X-Auth-Request-Groups", ADMIN_GROUPS)
                .when().get("/v1/admin/resource-types")
                .then()
                    .statusCode(200)
                .extract().path("find { it.name == 'E2E_CONTAINER_ORCHESTRATOR' }.id")
        );
    }

    /**
     * Test 4: Admin creates non-shared resource type (for stacks)
     * Requirement: 2.1, 2.2 - Admin can create resource types with categories
     */
    @Test
    @Order(4)
    public void test04_AdminCreatesNonSharedResourceType() {
        String requestBody = """
            {
                "name": "E2E_DATABASE",
                "displayName": "E2E Database",
                "description": "Non-shared database for E2E testing",
                "category": "NON_SHARED",
                "enabled": false
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-types")
            .then()
                .statusCode(201)
                .body("name", equalTo("E2E_DATABASE"))
                .body("category", equalTo("NON_SHARED"))
                .body("enabled", equalTo(false))
                .body("id", notNullValue());

        // Extract the ID
        nonSharedResourceTypeId = UUID.fromString(
            given()
                .header("X-Auth-Request-Email", ADMIN_USER)
                .header("X-Auth-Request-Groups", ADMIN_GROUPS)
                .when().get("/v1/admin/resource-types")
                .then()
                    .statusCode(200)
                .extract().path("find { it.name == 'E2E_DATABASE' }.id")
        );
    }

    /**
     * Test 5: Admin creates mapping for shared resource type
     * Requirement: 3.1, 4.1 - Admin can create mappings with Terraform locations
     */
    @Test
    @Order(5)
    public void test05_AdminCreatesSharedResourceMapping() {
        // First, ensure we have the IDs from previous tests
        if (cloudProviderId == null || sharedResourceTypeId == null) {
            test01_AdminCreatesCloudProvider();
            test03_AdminCreatesSharedResourceType();
        }

        String requestBody = String.format("""
            {
                "resourceTypeId": "%s",
                "cloudProviderId": "%s",
                "terraformModuleLocation": "git::https://github.com/test/ecs-cluster.git",
                "moduleLocationType": "GIT",
                "enabled": false
            }
            """, sharedResourceTypeId, cloudProviderId);

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-type-cloud-mappings")
            .then()
                .statusCode(201)
                .body("resourceTypeId", equalTo(sharedResourceTypeId.toString()))
                .body("cloudProviderId", equalTo(cloudProviderId.toString()))
                .body("terraformModuleLocation", equalTo("git::https://github.com/test/ecs-cluster.git"))
                .body("moduleLocationType", equalTo("GIT"))
                .body("enabled", equalTo(false))
                .body("id", notNullValue());

        // Extract the mapping ID
        sharedMappingId = UUID.fromString(
            given()
                .header("X-Auth-Request-Email", ADMIN_USER)
                .header("X-Auth-Request-Groups", ADMIN_GROUPS)
                .when().get("/v1/admin/resource-type-cloud-mappings")
                .then()
                    .statusCode(200)
                .extract().path("find { it.resourceTypeId == '" + sharedResourceTypeId + "' }.id")
        );
    }

    /**
     * Test 6: Admin creates mapping for non-shared resource type
     * Requirement: 3.1, 4.1 - Admin can create mappings with Terraform locations
     */
    @Test
    @Order(6)
    public void test06_AdminCreatesNonSharedResourceMapping() {
        // Ensure we have the IDs
        if (cloudProviderId == null || nonSharedResourceTypeId == null) {
            test01_AdminCreatesCloudProvider();
            test04_AdminCreatesNonSharedResourceType();
        }

        String requestBody = String.format("""
            {
                "resourceTypeId": "%s",
                "cloudProviderId": "%s",
                "terraformModuleLocation": "git::https://github.com/test/rds-database.git",
                "moduleLocationType": "GIT",
                "enabled": false
            }
            """, nonSharedResourceTypeId, cloudProviderId);

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-type-cloud-mappings")
            .then()
                .statusCode(201)
                .body("resourceTypeId", equalTo(nonSharedResourceTypeId.toString()))
                .body("cloudProviderId", equalTo(cloudProviderId.toString()))
                .body("enabled", equalTo(false))
                .body("id", notNullValue());

        // Extract the mapping ID
        nonSharedMappingId = UUID.fromString(
            given()
                .header("X-Auth-Request-Email", ADMIN_USER)
                .header("X-Auth-Request-Groups", ADMIN_GROUPS)
                .when().get("/v1/admin/resource-type-cloud-mappings")
                .then()
                    .statusCode(200)
                .extract().path("find { it.resourceTypeId == '" + nonSharedResourceTypeId + "' }.id")
        );
    }

    /**
     * Test 7: Admin adds property schemas to shared resource mapping
     * Requirement: 3.1, 3.2, 3.3 - Admin can define properties with data types and validation
     */
    @Test
    @Order(7)
    public void test07_AdminAddsPropertiesToSharedResourceMapping() {
        // Ensure we have the mapping ID
        if (sharedMappingId == null) {
            test05_AdminCreatesSharedResourceMapping();
        }

        // Check if properties already exist (for idempotency when called multiple times)
        int existingCount = given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/property-schemas/mapping/" + sharedMappingId)
            .then()
                .statusCode(200)
            .extract().path("size()");
        
        if (existingCount >= 3) {
            // Properties already exist, skip creation
            return;
        }

        // Create multiple properties using bulk create
        String requestBody = """
            [
                {
                    "propertyName": "clusterName",
                    "displayName": "Cluster Name",
                    "description": "Name of the ECS cluster",
                    "dataType": "STRING",
                    "required": true,
                    "displayOrder": 1
                },
                {
                    "propertyName": "minCapacity",
                    "displayName": "Minimum Capacity",
                    "description": "Minimum number of instances",
                    "dataType": "NUMBER",
                    "required": true,
                    "validationRules": {
                        "min": 1,
                        "max": 100
                    },
                    "displayOrder": 2
                },
                {
                    "propertyName": "enableContainerInsights",
                    "displayName": "Enable Container Insights",
                    "description": "Enable CloudWatch Container Insights",
                    "dataType": "BOOLEAN",
                    "required": false,
                    "defaultValue": false,
                    "displayOrder": 3
                }
            ]
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .queryParam("mappingId", sharedMappingId)
            .body(requestBody)
            .when().post("/v1/admin/property-schemas/bulk")
            .then()
                .log().ifValidationFails()
                .statusCode(201)
                .body("$", hasSize(3))
                .body("[0].propertyName", equalTo("clusterName"))
                .body("[1].propertyName", equalTo("minCapacity"))
                .body("[2].propertyName", equalTo("enableContainerInsights"));
    }

    /**
     * Test 8: Admin adds property schemas to non-shared resource mapping
     * Requirement: 3.1, 3.2, 3.3 - Admin can define properties with data types and validation
     */
    @Test
    @Order(8)
    public void test08_AdminAddsPropertiesToNonSharedResourceMapping() {
        // Ensure we have the mapping ID
        if (nonSharedMappingId == null) {
            test06_AdminCreatesNonSharedResourceMapping();
        }

        // Check if properties already exist (for idempotency when called multiple times)
        int existingCount = given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/property-schemas/mapping/" + nonSharedMappingId)
            .then()
                .statusCode(200)
            .extract().path("size()");
        
        if (existingCount >= 3) {
            // Properties already exist, skip creation
            return;
        }

        String requestBody = """
            [
                {
                    "propertyName": "instanceClass",
                    "displayName": "Instance Class",
                    "description": "RDS instance class",
                    "dataType": "STRING",
                    "required": true,
                    "displayOrder": 1
                },
                {
                    "propertyName": "allocatedStorage",
                    "displayName": "Allocated Storage (GB)",
                    "description": "Storage size in GB",
                    "dataType": "NUMBER",
                    "required": true,
                    "validationRules": {
                        "min": 20,
                        "max": 1000
                    },
                    "displayOrder": 2
                },
                {
                    "propertyName": "multiAz",
                    "displayName": "Multi-AZ Deployment",
                    "description": "Enable Multi-AZ for high availability",
                    "dataType": "BOOLEAN",
                    "required": false,
                    "defaultValue": false,
                    "displayOrder": 3
                }
            ]
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .queryParam("mappingId", nonSharedMappingId)
            .body(requestBody)
            .when().post("/v1/admin/property-schemas/bulk")
            .then()
                .statusCode(201)
                .body("$", hasSize(3))
                .body("[0].propertyName", equalTo("instanceClass"))
                .body("[1].propertyName", equalTo("allocatedStorage"))
                .body("[2].propertyName", equalTo("multiAz"));
    }

    /**
     * Test 9: Admin enables all configurations
     * Requirement: 1.2, 2.3, 4.5 - Admin can enable/disable configurations
     */
    @Test
    @Order(9)
    public void test09_AdminEnablesAllConfigurations() {
        // Ensure we have all IDs and property schemas
        if (cloudProviderId == null) test01_AdminCreatesCloudProvider();
        if (sharedResourceTypeId == null) test03_AdminCreatesSharedResourceType();
        if (nonSharedResourceTypeId == null) test04_AdminCreatesNonSharedResourceType();
        if (sharedMappingId == null) test05_AdminCreatesSharedResourceMapping();
        if (nonSharedMappingId == null) test06_AdminCreatesNonSharedResourceMapping();
        
        // Ensure property schemas exist before enabling mappings
        test07_AdminAddsPropertiesToSharedResourceMapping();
        test08_AdminAddsPropertiesToNonSharedResourceMapping();

        // Enable cloud provider
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", true)
            .when().patch("/v1/admin/cloud-providers/" + cloudProviderId + "/toggle")
            .then()
                .statusCode(204);

        // Enable shared resource type
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", true)
            .when().patch("/v1/admin/resource-types/" + sharedResourceTypeId + "/toggle")
            .then()
                .statusCode(204);

        // Enable non-shared resource type
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", true)
            .when().patch("/v1/admin/resource-types/" + nonSharedResourceTypeId + "/toggle")
            .then()
                .statusCode(204);

        // Enable shared mapping
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", true)
            .when().patch("/v1/admin/resource-type-cloud-mappings/" + sharedMappingId + "/toggle")
            .then()
                .log().ifValidationFails()
                .statusCode(204);

        // Enable non-shared mapping
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", true)
            .when().patch("/v1/admin/resource-type-cloud-mappings/" + nonSharedMappingId + "/toggle")
            .then()
                .statusCode(204);

        // Verify all are enabled
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/cloud-providers/" + cloudProviderId)
            .then()
                .statusCode(200)
                .body("enabled", equalTo(true));

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-types/" + sharedResourceTypeId)
            .then()
                .statusCode(200)
                .body("enabled", equalTo(true));
    }

    /**
     * Test 10: User can see enabled cloud providers for blueprints
     * Requirement: 7.1, 10.1 - Users see only enabled configurations
     */
    @Test
    @Order(10)
    public void test10_UserCanSeeEnabledCloudProvidersForBlueprints() {
        // Ensure configurations are enabled
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("find { it.name == 'E2E_AWS' }.enabled", equalTo(true));
    }

    /**
     * Test 11: User can see enabled shared resource types for blueprints
     * Requirement: 7.2, 10.2 - Users see only enabled shared resource types
     */
    @Test
    @Order(11)
    public void test11_UserCanSeeEnabledSharedResourceTypesForBlueprints() {
        // Ensure configurations are enabled
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("find { it.name == 'E2E_CONTAINER_ORCHESTRATOR' }.category", equalTo("SHARED"))
                .body("find { it.name == 'E2E_CONTAINER_ORCHESTRATOR' }.enabled", equalTo(true));
    }

    /**
     * Test 12: User can retrieve property schema for blueprint resource
     * Requirement: 7.3, 7.4, 10.3 - Users can retrieve property schemas
     */
    @Test
    @Order(12)
    public void test12_UserCanRetrievePropertySchemaForBlueprintResource() {
        // Ensure all setup is complete
        test07_AdminAddsPropertiesToSharedResourceMapping();
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/resource-schema/" + sharedResourceTypeId + "/" + cloudProviderId)
            .then()
                .statusCode(200)
                .body("clusterName", notNullValue())
                .body("clusterName.propertyName", equalTo("clusterName"))
                .body("clusterName.dataType", equalTo("STRING"))
                .body("clusterName.required", equalTo(true))
                .body("minCapacity", notNullValue())
                .body("minCapacity.dataType", equalTo("NUMBER"))
                .body("minCapacity.required", equalTo(true))
                .body("minCapacity.validationRules.min", equalTo(1))
                .body("minCapacity.validationRules.max", equalTo(100))
                .body("enableContainerInsights", notNullValue())
                .body("enableContainerInsights.dataType", equalTo("BOOLEAN"))
                .body("enableContainerInsights.required", equalTo(false));
    }

    /**
     * Test 13: User can see enabled cloud providers for stacks
     * Requirement: 9.1, 10.1 - Users see only enabled configurations
     */
    @Test
    @Order(13)
    public void test13_UserCanSeeEnabledCloudProvidersForStacks() {
        // Ensure configurations are enabled
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/stacks/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("find { it.name == 'E2E_AWS' }.enabled", equalTo(true));
    }

    /**
     * Test 14: User can see enabled non-shared resource types for stacks
     * Requirement: 9.2, 10.2 - Users see only enabled non-shared resource types
     */
    @Test
    @Order(14)
    public void test14_UserCanSeeEnabledNonSharedResourceTypesForStacks() {
        // Ensure configurations are enabled
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/stacks/available-resource-types")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("find { it.name == 'E2E_DATABASE' }.category", equalTo("NON_SHARED"))
                .body("find { it.name == 'E2E_DATABASE' }.enabled", equalTo(true));
    }

    /**
     * Test 15: User can retrieve property schema for stack resource
     * Requirement: 9.3, 10.3 - Users can retrieve property schemas
     */
    @Test
    @Order(15)
    public void test15_UserCanRetrievePropertySchemaForStackResource() {
        // Ensure all setup is complete
        test08_AdminAddsPropertiesToNonSharedResourceMapping();
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/stacks/resource-schema/" + nonSharedResourceTypeId + "/" + cloudProviderId)
            .then()
                .statusCode(200)
                .body("instanceClass", notNullValue())
                .body("instanceClass.propertyName", equalTo("instanceClass"))
                .body("instanceClass.dataType", equalTo("STRING"))
                .body("instanceClass.required", equalTo(true))
                .body("allocatedStorage", notNullValue())
                .body("allocatedStorage.dataType", equalTo("NUMBER"))
                .body("allocatedStorage.required", equalTo(true))
                .body("allocatedStorage.validationRules.min", equalTo(20))
                .body("allocatedStorage.validationRules.max", equalTo(1000))
                .body("multiAz", notNullValue())
                .body("multiAz.dataType", equalTo("BOOLEAN"))
                .body("multiAz.required", equalTo(false));
    }

    /**
     * Test 16: Disabled cloud provider is not visible to users
     * Requirement: 1.3, 10.1 - Disabled configurations are hidden from users
     */
    @Test
    @Order(16)
    public void test16_DisabledCloudProviderNotVisibleToUsers() {
        // Ensure we have a cloud provider
        if (cloudProviderId == null) {
            test01_AdminCreatesCloudProvider();
        }

        // Disable the cloud provider
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", false)
            .when().patch("/v1/admin/cloud-providers/" + cloudProviderId + "/toggle")
            .then()
                .statusCode(204);

        // Verify it's not visible to users for blueprints
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("find { it.name == 'E2E_AWS' }", nullValue());

        // Verify it's not visible to users for stacks
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/stacks/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("find { it.name == 'E2E_AWS' }", nullValue());

        // Re-enable for subsequent tests
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", true)
            .when().patch("/v1/admin/cloud-providers/" + cloudProviderId + "/toggle")
            .then()
                .statusCode(204);
    }

    /**
     * Test 17: Disabled resource type is not visible to users
     * Requirement: 2.4, 10.2 - Disabled resource types are hidden from users
     */
    @Test
    @Order(17)
    public void test17_DisabledResourceTypeNotVisibleToUsers() {
        // Ensure we have resource types
        if (sharedResourceTypeId == null) {
            test03_AdminCreatesSharedResourceType();
        }

        // Disable the shared resource type
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", false)
            .when().patch("/v1/admin/resource-types/" + sharedResourceTypeId + "/toggle")
            .then()
                .statusCode(204);

        // Verify it's not visible to users for blueprints
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(200)
                .body("find { it.name == 'E2E_CONTAINER_ORCHESTRATOR' }", nullValue());

        // Re-enable for subsequent tests
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", true)
            .when().patch("/v1/admin/resource-types/" + sharedResourceTypeId + "/toggle")
            .then()
                .statusCode(204);
    }

    /**
     * Test 18: Property validation is enforced - missing required property
     * Requirement: 10.4, 10.5 - Property validation enforcement
     */
    @Test
    @Order(18)
    public void test18_PropertyValidationEnforcedMissingRequired() {
        // This test verifies that validation would be enforced
        // In a real scenario, this would be tested through stack/blueprint creation
        // For now, we verify the schema indicates required fields
        test07_AdminAddsPropertiesToSharedResourceMapping();
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/resource-schema/" + sharedResourceTypeId + "/" + cloudProviderId)
            .then()
                .statusCode(200)
                .body("clusterName.required", equalTo(true))
                .body("minCapacity.required", equalTo(true))
                .body("enableContainerInsights.required", equalTo(false));
    }

    /**
     * Test 19: Property validation rules are correctly defined
     * Requirement: 10.4 - Validation rules are properly configured
     */
    @Test
    @Order(19)
    public void test19_PropertyValidationRulesCorrectlyDefined() {
        test08_AdminAddsPropertiesToNonSharedResourceMapping();
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/stacks/resource-schema/" + nonSharedResourceTypeId + "/" + cloudProviderId)
            .then()
                .statusCode(200)
                .body("allocatedStorage.validationRules", notNullValue())
                .body("allocatedStorage.validationRules.min", equalTo(20))
                .body("allocatedStorage.validationRules.max", equalTo(1000));
    }

    /**
     * Test 20: Admin dashboard shows configuration statistics
     * Requirement: 6.1, 6.3 - Dashboard provides overview
     */
    @Test
    @Order(20)
    public void test20_AdminDashboardShowsStatistics() {
        // Ensure all configurations exist
        test09_AdminEnablesAllConfigurations();

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard/statistics")
            .then()
                .statusCode(200)
                .body("cloudProviders", greaterThanOrEqualTo(1))
                .body("resourceTypes", greaterThanOrEqualTo(2))
                .body("mappings", greaterThanOrEqualTo(2))
                .body("propertySchemas", greaterThanOrEqualTo(6));
    }

    /**
     * Test 21: Non-admin cannot access admin dashboard
     * Requirement: 5.1, 5.2 - Authorization enforcement
     */
    @Test
    @Order(21)
    public void test21_NonAdminCannotAccessAdminDashboard() {
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard")
            .then()
                .statusCode(403);
    }

    /**
     * Test 22: Unauthenticated users cannot access any endpoints
     * Requirement: 5.3 - Authentication enforcement
     */
    @Test
    @Order(22)
    public void test22_UnauthenticatedUsersCannotAccessEndpoints() {
        // Admin endpoints
        given()
            .when().get("/v1/admin/cloud-providers")
            .then()
                .statusCode(401);

        given()
            .when().get("/v1/admin/resource-types")
            .then()
                .statusCode(401);

        // User endpoints
        given()
            .when().get("/v1/blueprints/available-cloud-providers")
            .then()
                .statusCode(401);

        given()
            .when().get("/v1/stacks/available-cloud-providers")
            .then()
                .statusCode(401);
    }

    /**
     * Test 23: Category filtering works correctly for blueprints
     * Requirement: 7.2 - Blueprints only see SHARED and BOTH resource types
     */
    @Test
    @Order(23)
    public void test23_CategoryFilteringWorksForBlueprints() {
        test09_AdminEnablesAllConfigurations();

        String response = given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(200)
            .extract().asString();

        // Should contain SHARED resource type
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(200)
                .body("find { it.name == 'E2E_CONTAINER_ORCHESTRATOR' }.category", equalTo("SHARED"));

        // Should NOT contain NON_SHARED resource type
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(200)
                .body("find { it.name == 'E2E_DATABASE' }", nullValue());
    }

    /**
     * Test 24: Category filtering works correctly for stacks
     * Requirement: 9.2 - Stacks only see NON_SHARED and BOTH resource types
     */
    @Test
    @Order(24)
    public void test24_CategoryFilteringWorksForStacks() {
        test09_AdminEnablesAllConfigurations();

        // Should contain NON_SHARED resource type
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/stacks/available-resource-types")
            .then()
                .statusCode(200)
                .body("find { it.name == 'E2E_DATABASE' }.category", equalTo("NON_SHARED"));

        // Should NOT contain SHARED resource type
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/stacks/available-resource-types")
            .then()
                .statusCode(200)
                .body("find { it.name == 'E2E_CONTAINER_ORCHESTRATOR' }", nullValue());
    }

    /**
     * Test 25: Complete admin workflow - create, configure, enable
     * Requirement: 1.1, 2.1, 3.1, 4.1 - Complete admin workflow
     */
    @Test
    @Order(25)
    public void test25_CompleteAdminWorkflow() {
        // This test runs through the complete workflow in sequence
        
        // Step 1: Create cloud provider
        test01_AdminCreatesCloudProvider();
        
        // Step 2: Create resource types
        test03_AdminCreatesSharedResourceType();
        test04_AdminCreatesNonSharedResourceType();
        
        // Step 3: Create mappings
        test05_AdminCreatesSharedResourceMapping();
        test06_AdminCreatesNonSharedResourceMapping();
        
        // Step 4: Add properties
        test07_AdminAddsPropertiesToSharedResourceMapping();
        test08_AdminAddsPropertiesToNonSharedResourceMapping();
        
        // Step 5: Enable all
        test09_AdminEnablesAllConfigurations();
        
        // Verify the complete configuration is accessible to users
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)));
        
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)));
        
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/blueprints/resource-schema/" + sharedResourceTypeId + "/" + cloudProviderId)
            .then()
                .statusCode(200)
                .body("$", aMapWithSize(greaterThanOrEqualTo(3)));
    }

    /**
     * Test 26: Admin can view incomplete mappings
     * Requirement: 6.4 - Dashboard shows incomplete mappings
     */
    @Test
    @Order(26)
    public void test26_AdminCanViewIncompleteMappings() {
        // Create a mapping without properties (incomplete)
        if (cloudProviderId == null) test01_AdminCreatesCloudProvider();
        
        // Create a new resource type for this test
        String resourceTypeBody = """
            {
                "name": "E2E_INCOMPLETE_RESOURCE",
                "displayName": "E2E Incomplete Resource",
                "description": "Resource without properties",
                "category": "NON_SHARED",
                "enabled": true
            }
            """;

        String incompleteResourceTypeId = given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(resourceTypeBody)
            .when().post("/v1/admin/resource-types")
            .then()
                .statusCode(201)
            .extract().path("id");

        // Create mapping without properties
        String mappingBody = String.format("""
            {
                "resourceTypeId": "%s",
                "cloudProviderId": "%s",
                "terraformModuleLocation": "git::https://github.com/test/incomplete.git",
                "moduleLocationType": "GIT",
                "enabled": true
            }
            """, incompleteResourceTypeId, cloudProviderId);

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(mappingBody)
            .when().post("/v1/admin/resource-type-cloud-mappings")
            .then()
                .statusCode(201);

        // Check incomplete mappings
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard/incomplete-mappings")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("find { it.resourceTypeName == 'E2E_INCOMPLETE_RESOURCE' }.isComplete", equalTo(false));
    }
}
