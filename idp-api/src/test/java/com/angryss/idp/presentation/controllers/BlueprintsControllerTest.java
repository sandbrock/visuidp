package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class BlueprintsControllerTest {

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
        provider.name = "TEST_AZURE";
        provider.displayName = "Test Microsoft Azure";
        provider.description = "Test Azure provider";
        provider.enabled = true;
        provider.persist();
        testCloudProviderId = provider.id;

        // Create a test resource type (SHARED for blueprints)
        ResourceType resourceType = new ResourceType();
        resourceType.name = "TEST_CONTAINER_ORCHESTRATOR";
        resourceType.displayName = "Test Container Orchestrator";
        resourceType.description = "Test container orchestrator resource";
        resourceType.category = ResourceCategory.SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        testResourceTypeId = resourceType.id;

        // Create a mapping
        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = provider;
        mapping.terraformModuleLocation = "git::https://github.com/test/ecs-module.git";
        mapping.moduleLocationType = ModuleLocationType.GIT;
        mapping.enabled = true;
        mapping.persist();
        testMappingId = mapping.id;

        // Create property schemas
        PropertySchema schema1 = new PropertySchema();
        schema1.mapping = mapping;
        schema1.propertyName = "clusterName";
        schema1.displayName = "Cluster Name";
        schema1.description = "Name of the container cluster";
        schema1.dataType = PropertyDataType.STRING;
        schema1.required = true;
        schema1.displayOrder = 1;
        schema1.persist();

        PropertySchema schema2 = new PropertySchema();
        schema2.mapping = mapping;
        schema2.propertyName = "nodeCount";
        schema2.displayName = "Node Count";
        schema2.description = "Number of nodes in the cluster";
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
            .when().get("/v1/blueprints/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].name", equalTo("TEST_AZURE"))
                .body("[0].enabled", equalTo(true));
    }

    @Test
    public void testGetAvailableCloudProviders_Unauthenticated_ShouldFail() {
        given()
            .when().get("/v1/blueprints/available-cloud-providers")
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
            .when().get("/v1/blueprints/available-cloud-providers")
            .then()
                .statusCode(200)
                .body("$", hasSize(1)) // Only the enabled provider
                .body("[0].name", equalTo("TEST_AZURE"))
                .body("[0].enabled", equalTo(true));
    }

    @Test
    public void testGetAvailableResourceTypes() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].name", equalTo("TEST_CONTAINER_ORCHESTRATOR"))
                .body("[0].category", equalTo("SHARED"))
                .body("[0].enabled", equalTo(true));
    }

    @Test
    public void testGetAvailableResourceTypes_Unauthenticated_ShouldFail() {
        given()
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(401);
    }

    @Test
    public void testGetAvailableResourceTypes_OnlyEnabledAndCorrectCategoryReturned() {
        // Create test data in a separate transaction
        createTestResourceTypesForFiltering();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/blueprints/available-resource-types")
            .then()
                .statusCode(200)
                .body("$", hasSize(2)) // TEST_CONTAINER_ORCHESTRATOR (SHARED) and TEST_BOTH_RESOURCE
                .body("name", hasItems("TEST_CONTAINER_ORCHESTRATOR", "TEST_BOTH_RESOURCE"))
                .body("category", hasItems("SHARED", "BOTH"));
    }

    @Transactional
    void createTestResourceTypesForFiltering() {
        // Create a disabled resource type
        ResourceType disabledResourceType = new ResourceType();
        disabledResourceType.name = "TEST_DISABLED_RESOURCE";
        disabledResourceType.displayName = "Test Disabled Resource";
        disabledResourceType.description = "This resource is disabled";
        disabledResourceType.category = ResourceCategory.SHARED;
        disabledResourceType.enabled = false;
        disabledResourceType.persist();

        // Create a NON_SHARED resource type (should not appear for blueprints)
        ResourceType nonSharedResourceType = new ResourceType();
        nonSharedResourceType.name = "TEST_NON_SHARED_RESOURCE";
        nonSharedResourceType.displayName = "Test Non-Shared Resource";
        nonSharedResourceType.description = "This is a non-shared resource";
        nonSharedResourceType.category = ResourceCategory.NON_SHARED;
        nonSharedResourceType.enabled = true;
        nonSharedResourceType.persist();

        // Create a BOTH resource type (should appear for blueprints)
        ResourceType bothResourceType = new ResourceType();
        bothResourceType.name = "TEST_BOTH_RESOURCE";
        bothResourceType.displayName = "Test Both Resource";
        bothResourceType.description = "This can be used in both contexts";
        bothResourceType.category = ResourceCategory.BOTH;
        bothResourceType.enabled = true;
        bothResourceType.persist();
    }

    @Test
    public void testGetResourceSchema() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/blueprints/resource-schema/" + testResourceTypeId + "/" + testCloudProviderId)
            .then()
                .statusCode(200)
                .body("clusterName", notNullValue())
                .body("clusterName.propertyName", equalTo("clusterName"))
                .body("clusterName.displayName", equalTo("Cluster Name"))
                .body("clusterName.dataType", equalTo("STRING"))
                .body("clusterName.required", equalTo(true))
                .body("nodeCount", notNullValue())
                .body("nodeCount.propertyName", equalTo("nodeCount"))
                .body("nodeCount.dataType", equalTo("NUMBER"))
                .body("nodeCount.required", equalTo(false));
    }

    @Test
    public void testGetResourceSchema_NotFound() {
        UUID nonExistentResourceTypeId = UUID.randomUUID();
        UUID nonExistentCloudProviderId = UUID.randomUUID();
        
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/blueprints/resource-schema/" + nonExistentResourceTypeId + "/" + nonExistentCloudProviderId)
            .then()
                .statusCode(404);
    }

    @Test
    public void testGetResourceSchema_Unauthenticated_ShouldFail() {
        given()
            .when().get("/v1/blueprints/resource-schema/" + testResourceTypeId + "/" + testCloudProviderId)
            .then()
                .statusCode(401);
    }

    @Test
    public void testGetResourceSchema_WithValidationRules() {
        // Create test data in a separate transaction
        createPropertySchemaWithNumberValidationRules();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/blueprints/resource-schema/" + testResourceTypeId + "/" + testCloudProviderId)
            .then()
                .statusCode(200)
                .body("minNodeCount", notNullValue())
                .body("minNodeCount.propertyName", equalTo("minNodeCount"))
                .body("minNodeCount.required", equalTo(true))
                .body("minNodeCount.validationRules.min", equalTo(1))
                .body("minNodeCount.validationRules.max", equalTo(100));
    }

    @Transactional
    void createPropertySchemaWithNumberValidationRules() {
        // Create a property with validation rules
        PropertySchema schemaWithRules = new PropertySchema();
        schemaWithRules.mapping = ResourceTypeCloudMapping.findById(testMappingId);
        schemaWithRules.propertyName = "minNodeCount";
        schemaWithRules.displayName = "Minimum Node Count";
        schemaWithRules.description = "Minimum number of nodes";
        schemaWithRules.dataType = PropertyDataType.NUMBER;
        schemaWithRules.required = true;
        schemaWithRules.validationRules = Map.of("min", 1, "max", 100);
        schemaWithRules.displayOrder = 3;
        schemaWithRules.persist();
    }

    @Test
    public void testGetResourceSchema_WithStringValidationRules() {
        // Create test data in a separate transaction
        createPropertySchemaWithStringValidationRules();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/blueprints/resource-schema/" + testResourceTypeId + "/" + testCloudProviderId)
            .then()
                .statusCode(200)
                .body("clusterPrefix", notNullValue())
                .body("clusterPrefix.propertyName", equalTo("clusterPrefix"))
                .body("clusterPrefix.dataType", equalTo("STRING"))
                .body("clusterPrefix.required", equalTo(false))
                .body("clusterPrefix.validationRules.minLength", equalTo(3))
                .body("clusterPrefix.validationRules.maxLength", equalTo(20))
                .body("clusterPrefix.validationRules.pattern", equalTo("^[a-z][a-z0-9-]*$"));
    }

    @Transactional
    void createPropertySchemaWithStringValidationRules() {
        // Create a property with string validation rules
        PropertySchema schemaWithRules = new PropertySchema();
        schemaWithRules.mapping = ResourceTypeCloudMapping.findById(testMappingId);
        schemaWithRules.propertyName = "clusterPrefix";
        schemaWithRules.displayName = "Cluster Prefix";
        schemaWithRules.description = "Prefix for cluster name";
        schemaWithRules.dataType = PropertyDataType.STRING;
        schemaWithRules.required = false;
        schemaWithRules.validationRules = Map.of(
            "minLength", 3,
            "maxLength", 20,
            "pattern", "^[a-z][a-z0-9-]*$",
            "patternMessage", "Must start with lowercase letter and contain only lowercase letters, numbers, and hyphens"
        );
        schemaWithRules.displayOrder = 4;
        schemaWithRules.persist();
    }

    @Test
    public void testGetResourceSchema_WithBooleanAndListTypes() {
        // Create test data in a separate transaction
        createPropertySchemasWithBooleanAndListTypes();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/blueprints/resource-schema/" + testResourceTypeId + "/" + testCloudProviderId)
            .then()
                .statusCode(200)
                .body("enableAutoScaling", notNullValue())
                .body("enableAutoScaling.dataType", equalTo("BOOLEAN"))
                .body("enableAutoScaling.required", equalTo(false))
                .body("availabilityZones", notNullValue())
                .body("availabilityZones.dataType", equalTo("LIST"))
                .body("availabilityZones.required", equalTo(true))
                .body("availabilityZones.validationRules.minItems", equalTo(1))
                .body("availabilityZones.validationRules.maxItems", equalTo(3));
    }

    @Transactional
    void createPropertySchemasWithBooleanAndListTypes() {
        // Create a boolean property
        PropertySchema booleanSchema = new PropertySchema();
        booleanSchema.mapping = ResourceTypeCloudMapping.findById(testMappingId);
        booleanSchema.propertyName = "enableAutoScaling";
        booleanSchema.displayName = "Enable Auto Scaling";
        booleanSchema.description = "Enable automatic scaling";
        booleanSchema.dataType = PropertyDataType.BOOLEAN;
        booleanSchema.required = false;
        booleanSchema.displayOrder = 5;
        booleanSchema.persist();

        // Create a list property
        PropertySchema listSchema = new PropertySchema();
        listSchema.mapping = ResourceTypeCloudMapping.findById(testMappingId);
        listSchema.propertyName = "availabilityZones";
        listSchema.displayName = "Availability Zones";
        listSchema.description = "List of availability zones";
        listSchema.dataType = PropertyDataType.LIST;
        listSchema.required = true;
        listSchema.validationRules = Map.of("minItems", 1, "maxItems", 3);
        listSchema.displayOrder = 6;
        listSchema.persist();
    }

    // ========== Blueprint Resource Integration Tests ==========

    @Test
    public void testCreateBlueprintWithResources_ReturnsCreatedWithResources() {
        String uniqueName = "Test Blueprint with Resources " + UUID.randomUUID();
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Blueprint with shared infrastructure",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Test Container Orchestrator",
                        "description": "Test Kubernetes cluster",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_AZURE",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test-k8s-cluster"
                        },
                        "cloudSpecificProperties": {
                            "region": "eastus",
                            "nodeCount": 3
                        }
                    }
                ]
            }
            """.formatted(uniqueName, testCloudProviderId, testResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", equalTo(uniqueName))
            .body("resources", notNullValue())
            .body("resources.size()", equalTo(1))
            .body("resources[0].id", notNullValue())
            .body("resources[0].name", equalTo("Test Container Orchestrator"))
            .body("resources[0].description", equalTo("Test Kubernetes cluster"))
            .body("resources[0].blueprintResourceTypeId", equalTo(testResourceTypeId.toString()))
            .body("resources[0].blueprintResourceTypeName", equalTo("TEST_CONTAINER_ORCHESTRATOR"))
            .body("resources[0].cloudType", equalTo("TEST_AZURE"))
            .body("resources[0].configuration.type", equalTo("container-orchestrator"))
            .body("resources[0].configuration.cloudServiceName", equalTo("test-k8s-cluster"))
            .body("resources[0].cloudSpecificProperties.region", equalTo("eastus"))
            .body("resources[0].cloudSpecificProperties.nodeCount", equalTo(3));
    }

    @Test
    public void testCreateBlueprintWithEmptyResources_ReturnsCreatedWithoutResources() {
        String uniqueName = "Blueprint Without Resources " + UUID.randomUUID();
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Empty blueprint",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": []
            }
            """.formatted(uniqueName, testCloudProviderId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", equalTo(uniqueName))
            .body("resources", anyOf(nullValue(), hasSize(0)));
    }

    @Test
    public void testCreateBlueprintWithMultipleResources_ReturnsAllResources() {
        String uniqueName = "Blueprint with Multiple Resources " + UUID.randomUUID();
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Blueprint with multiple shared resources",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Container Orchestrator",
                        "description": "Kubernetes cluster",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_AZURE",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "k8s-cluster"
                        },
                        "cloudSpecificProperties": {}
                    },
                    {
                        "name": "Database Server",
                        "description": "PostgreSQL server",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_AZURE",
                        "configuration": {
                            "type": "relational-database-server",
                            "cloudServiceName": "postgres-server"
                        },
                        "cloudSpecificProperties": {}
                    }
                ]
            }
            """.formatted(uniqueName, testCloudProviderId, testResourceTypeId, testResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(201)
            .body("resources", notNullValue())
            .body("resources.size()", equalTo(2))
            .body("resources[0].name", equalTo("Container Orchestrator"))
            .body("resources[1].name", equalTo("Database Server"));
    }

    @Test
    public void testGetBlueprintById_ReturnsResourcesInResponse() {
        // Create a blueprint with resources
        UUID blueprintId = createBlueprintWithResourcesInDb();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
        .when()
            .get("/v1/blueprints/" + blueprintId)
        .then()
            .statusCode(200)
            .body("id", equalTo(blueprintId.toString()))
            .body("resources", notNullValue())
            .body("resources.size()", equalTo(1))
            .body("resources[0].name", equalTo("Test Resource"))
            .body("resources[0].blueprintResourceTypeId", equalTo(testResourceTypeId.toString()));
    }

    @Test
    public void testUpdateBlueprintWithNewResources_ReplacesOldResources() {
        // Create a blueprint with one resource
        UUID blueprintId = createBlueprintWithResourcesInDb();
        
        // Get the current blueprint name to use in update
        String currentName = getBlueprintName(blueprintId);

        // Update with different resources (keep same name to avoid unique constraint)
        String updateJson = """
            {
                "name": "%s",
                "description": "Updated description",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "New Resource 1",
                        "description": "First new resource",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_AZURE",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "new-cluster-1"
                        },
                        "cloudSpecificProperties": {}
                    },
                    {
                        "name": "New Resource 2",
                        "description": "Second new resource",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_AZURE",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "new-cluster-2"
                        },
                        "cloudSpecificProperties": {}
                    }
                ]
            }
            """.formatted(currentName, testCloudProviderId, testResourceTypeId, testResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(updateJson)
            .log().all()
        .when()
            .put("/v1/blueprints/" + blueprintId)
        .then()
            .log().all()
            .statusCode(200)
            .body("resources", notNullValue())
            .body("resources.size()", equalTo(2))
            .body("resources[0].name", equalTo("New Resource 1"))
            .body("resources[1].name", equalTo("New Resource 2"));
    }

    @Test
    public void testUpdateBlueprintWithEmptyResources_DeletesAllResources() {
        // Create a blueprint with resources
        UUID blueprintId = createBlueprintWithResourcesInDb();
        
        // Get the current blueprint name to use in update
        String currentName = getBlueprintName(blueprintId);

        // Update with empty resources list (keep same name to avoid unique constraint)
        String updateJson = """
            {
                "name": "%s",
                "description": "All resources removed",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": []
            }
            """.formatted(currentName, testCloudProviderId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(updateJson)
        .when()
            .put("/v1/blueprints/" + blueprintId)
        .then()
            .statusCode(200)
            .body("resources", anyOf(nullValue(), hasSize(0)));
    }

    @Test
    public void testDeleteBlueprint_CascadesDeleteToResources() {
        // Create a blueprint with resources
        UUID blueprintId = createBlueprintWithResourcesInDb();
        
        // Get the resource ID before deletion
        UUID resourceId = getResourceIdFromBlueprint(blueprintId);

        // Delete the blueprint
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
        .when()
            .delete("/v1/blueprints/" + blueprintId)
        .then()
            .statusCode(204);

        // Verify blueprint is deleted
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
        .when()
            .get("/v1/blueprints/" + blueprintId)
        .then()
            .statusCode(404);

        // Verify resource is also deleted (cascade)
        assertResourceDeleted(resourceId);
    }

    @Test
    public void testCreateBlueprintWithInvalidResourceType_Returns400() {
        UUID invalidResourceTypeId = UUID.randomUUID();
        String uniqueName = "Blueprint with Invalid Resource " + UUID.randomUUID();
        
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Should fail",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Invalid Resource",
                        "description": "Has invalid resource type",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_AZURE",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test-cluster"
                        },
                        "cloudSpecificProperties": {}
                    }
                ]
            }
            """.formatted(uniqueName, testCloudProviderId, invalidResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(400)
            .body(containsString("Resource type not found"));
    }

    @Test
    public void testCreateBlueprintWithInvalidCloudProvider_Returns400() {
        String uniqueName = "Blueprint with Invalid Cloud Provider " + UUID.randomUUID();
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Should fail",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Invalid Resource",
                        "description": "Has invalid cloud provider",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "INVALID_CLOUD",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test-cluster"
                        },
                        "cloudSpecificProperties": {}
                    }
                ]
            }
            """.formatted(uniqueName, testCloudProviderId, testResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(400)
            .body(containsString("Cloud provider not found"));
    }

    @Test
    public void testCreateBlueprintWithDisabledCloudProvider_Returns400() {
        // Create a disabled cloud provider
        UUID disabledProviderId = createDisabledCloudProvider();
        String uniqueName = "Blueprint with Disabled Provider " + UUID.randomUUID();

        String blueprintJson = """
            {
                "name": "%s",
                "description": "Should fail",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Resource with Disabled Provider",
                        "description": "Should fail validation",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_DISABLED_PROVIDER",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test-cluster"
                        },
                        "cloudSpecificProperties": {}
                    }
                ]
            }
            """.formatted(uniqueName, disabledProviderId, testResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(400)
            .body(containsString("not enabled"));
    }

    @Test
    public void testCreateBlueprintWithResourceUsingUnsupportedCloudProvider_Returns400() {
        // Create a second cloud provider
        UUID secondProviderId = createSecondCloudProvider();
        String uniqueName = "Blueprint with Unsupported Cloud Provider " + UUID.randomUUID();

        // Blueprint supports only TEST_AZURE, but resource uses TEST_GCP
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Should fail - resource uses cloud provider not in supported list",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Resource with Unsupported Provider",
                        "description": "Uses TEST_GCP which is not in supported list",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_GCP",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test-cluster"
                        },
                        "cloudSpecificProperties": {}
                    }
                ]
            }
            """.formatted(uniqueName, testCloudProviderId, testResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(400)
            .body(containsString("Blueprint resource validation failed"))
            .body(containsString("not in the blueprint's supported cloud providers"));
    }

    @Test
    public void testUpdateBlueprintWithResourceUsingUnsupportedCloudProvider_Returns400() {
        // Create a blueprint with resources
        UUID blueprintId = createBlueprintWithResourcesInDb();
        
        // Create a second cloud provider
        UUID secondProviderId = createSecondCloudProvider();
        
        // Get the current blueprint name to use in update
        String currentName = getBlueprintName(blueprintId);

        // Try to update with resource using unsupported cloud provider
        String updateJson = """
            {
                "name": "%s",
                "description": "Should fail - resource uses unsupported cloud provider",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Resource with Unsupported Provider",
                        "description": "Uses TEST_GCP which is not in supported list",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_GCP",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test-cluster"
                        },
                        "cloudSpecificProperties": {}
                    }
                ]
            }
            """.formatted(currentName, testCloudProviderId, testResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(updateJson)
        .when()
            .put("/v1/blueprints/" + blueprintId)
        .then()
            .statusCode(400)
            .body(containsString("Blueprint resource validation failed"))
            .body(containsString("not in the blueprint's supported cloud providers"));
    }

    // Helper methods

    @Transactional
    UUID createSecondCloudProvider() {
        CloudProvider provider = new CloudProvider();
        provider.name = "TEST_GCP";
        provider.displayName = "Test Google Cloud Platform";
        provider.description = "Test GCP provider";
        provider.enabled = true;
        provider.persist();
        return provider.id;
    }

    @Transactional
    UUID createBlueprintWithResourcesInDb() {
        Blueprint blueprint = new Blueprint();
        blueprint.setName("Test Blueprint " + UUID.randomUUID());
        blueprint.setDescription("Test blueprint with resources");
        blueprint.setIsActive(true);
        
        CloudProvider cloudProvider = CloudProvider.findById(testCloudProviderId);
        blueprint.setSupportedCloudProviders(Set.of(cloudProvider));
        blueprint.persist();

        BlueprintResource resource = new BlueprintResource();
        resource.setName("Test Resource");
        resource.setDescription("Test resource description");
        resource.setResourceType(ResourceType.findById(testResourceTypeId));
        resource.setCloudProvider(cloudProvider);
        resource.setCloudType("TEST_AZURE");
        
        // Create a proper configuration object
        com.angryss.idp.domain.valueobjects.sharedinfra.ContainerOrchestratorConfiguration config = 
            new com.angryss.idp.domain.valueobjects.sharedinfra.ContainerOrchestratorConfiguration();
        config.setCloudServiceName("test-cluster");
        resource.setConfiguration(config);
        
        resource.setCloudSpecificProperties(Map.of());
        resource.setBlueprint(blueprint);
        resource.persist();

        return blueprint.getId();
    }

    @Transactional
    String getBlueprintName(UUID blueprintId) {
        Blueprint blueprint = Blueprint.findById(blueprintId);
        return blueprint != null ? blueprint.getName() : null;
    }

    @Transactional
    UUID getResourceIdFromBlueprint(UUID blueprintId) {
        Blueprint blueprint = Blueprint.findById(blueprintId);
        if (blueprint != null && blueprint.getResources() != null && !blueprint.getResources().isEmpty()) {
            return blueprint.getResources().iterator().next().id;
        }
        return null;
    }

    @Transactional
    void assertResourceDeleted(UUID resourceId) {
        BlueprintResource resource = BlueprintResource.findById(resourceId);
        assertNull(resource, "Resource should be deleted via cascade");
    }

    @Transactional
    UUID createDisabledCloudProvider() {
        CloudProvider provider = new CloudProvider();
        provider.name = "TEST_DISABLED_PROVIDER";
        provider.displayName = "Test Disabled Provider";
        provider.description = "Disabled provider for testing";
        provider.enabled = false;
        provider.persist();
        return provider.id;
    }
}
