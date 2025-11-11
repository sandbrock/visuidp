package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for blueprint creation with ECS cluster properties.
 * Tests Requirements: 1.1, 1.3, 1.4, 7.1, 7.2, 7.3, 7.6, 12.1, 12.2, 12.3, 12.4, 13.5
 */
@QuarkusTest
public class EcsBlueprintCreationTest {

    private static final String TEST_USER = "testuser@example.com";
    private static final String TEST_GROUPS = "Users";

    private UUID awsCloudProviderId;
    private UUID containerOrchestratorResourceTypeId;
    private UUID ecsMappingId;
    private String uniqueId;

    @BeforeEach
    @Transactional
    public void setup() {
        uniqueId = UUID.randomUUID().toString().substring(0, 8);
        
        // Clean up existing test data in correct order (children first)
        PropertySchema.deleteAll();
        ResourceTypeCloudMapping.deleteAll();
        BlueprintResource.deleteAll();
        Blueprint.deleteAll();
        com.angryss.idp.domain.entities.EnvironmentEntity.deleteAll();
        ResourceType.deleteAll();
        CloudProvider.deleteAll();

        // Create AWS cloud provider
        CloudProvider aws = new CloudProvider();
        aws.name = "AWS";
        aws.displayName = "Amazon Web Services";
        aws.description = "AWS cloud platform";
        aws.enabled = true;
        aws.persist();
        awsCloudProviderId = aws.id;

        // Create Managed Container Orchestrator resource type
        ResourceType containerOrchestrator = new ResourceType();
        containerOrchestrator.name = "Managed Container Orchestrator";
        containerOrchestrator.displayName = "Managed Container Orchestrator";
        containerOrchestrator.description = "Managed container orchestration service";
        containerOrchestrator.category = ResourceCategory.SHARED;
        containerOrchestrator.enabled = true;
        containerOrchestrator.persist();
        containerOrchestratorResourceTypeId = containerOrchestrator.id;

        // Create mapping for ECS
        ResourceTypeCloudMapping ecsMapping = new ResourceTypeCloudMapping();
        ecsMapping.resourceType = containerOrchestrator;
        ecsMapping.cloudProvider = aws;
        ecsMapping.terraformModuleLocation = "https://github.com/terraform-aws-modules/terraform-aws-ecs";
        ecsMapping.moduleLocationType = ModuleLocationType.GIT;
        ecsMapping.enabled = true;
        ecsMapping.persist();
        ecsMappingId = ecsMapping.id;

        // Create ECS cluster property schemas
        createEcsPropertySchemas(ecsMapping);
    }

    @AfterEach
    @Transactional
    public void tearDown() {
        // Clean up in correct order (children first)
        PropertySchema.deleteAll();
        ResourceTypeCloudMapping.deleteAll();
        BlueprintResource.deleteAll();
        Blueprint.deleteAll();
        com.angryss.idp.domain.entities.EnvironmentEntity.deleteAll();
        ResourceType.deleteAll();
        CloudProvider.deleteAll();
    }

    private void createEcsPropertySchemas(ResourceTypeCloudMapping mapping) {
        // capacityProvider property
        PropertySchema capacityProvider = new PropertySchema();
        capacityProvider.mapping = mapping;
        capacityProvider.propertyName = "capacityProvider";
        capacityProvider.displayName = "Capacity Provider";
        capacityProvider.description = "The capacity provider determines how the ECS cluster provisions compute resources.";
        capacityProvider.dataType = PropertyDataType.LIST;
        capacityProvider.required = true;
        capacityProvider.defaultValue = "\"FARGATE\"";
        capacityProvider.validationRules = Map.of("allowedValues", new Object[]{
            Map.of("value", "FARGATE", "label", "Fargate"),
            Map.of("value", "FARGATE_SPOT", "label", "Fargate Spot"),
            Map.of("value", "EC2", "label", "EC2")
        });
        capacityProvider.displayOrder = 10;
        capacityProvider.persist();

        // instanceType property
        PropertySchema instanceType = new PropertySchema();
        instanceType.mapping = mapping;
        instanceType.propertyName = "instanceType";
        instanceType.displayName = "EC2 Instance Type";
        instanceType.description = "The EC2 instance type for the ECS cluster nodes. Only applies when capacity provider is EC2.";
        instanceType.dataType = PropertyDataType.LIST;
        instanceType.required = false;
        instanceType.defaultValue = "\"t3.medium\"";
        instanceType.validationRules = Map.of("allowedValues", new Object[]{
            Map.of("value", "t3.small", "label", "t3.small"),
            Map.of("value", "t3.medium", "label", "t3.medium"),
            Map.of("value", "t3.large", "label", "t3.large"),
            Map.of("value", "m5.large", "label", "m5.large"),
            Map.of("value", "c5.large", "label", "c5.large")
        });
        instanceType.displayOrder = 20;
        instanceType.persist();

        // minClusterSize property
        PropertySchema minClusterSize = new PropertySchema();
        minClusterSize.mapping = mapping;
        minClusterSize.propertyName = "minClusterSize";
        minClusterSize.displayName = "Minimum Cluster Size";
        minClusterSize.description = "The minimum number of EC2 instances to maintain in the cluster.";
        minClusterSize.dataType = PropertyDataType.NUMBER;
        minClusterSize.required = false;
        minClusterSize.defaultValue = "\"1\"";
        minClusterSize.validationRules = Map.of("min", 0, "max", 100);
        minClusterSize.displayOrder = 30;
        minClusterSize.persist();

        // maxClusterSize property
        PropertySchema maxClusterSize = new PropertySchema();
        maxClusterSize.mapping = mapping;
        maxClusterSize.propertyName = "maxClusterSize";
        maxClusterSize.displayName = "Maximum Cluster Size";
        maxClusterSize.description = "The maximum number of EC2 instances allowed in the cluster.";
        maxClusterSize.dataType = PropertyDataType.NUMBER;
        maxClusterSize.required = false;
        maxClusterSize.defaultValue = "\"10\"";
        maxClusterSize.validationRules = Map.of("min", 1, "max", 100);
        maxClusterSize.displayOrder = 40;
        maxClusterSize.persist();

        // enableContainerInsights property
        PropertySchema enableContainerInsights = new PropertySchema();
        enableContainerInsights.mapping = mapping;
        enableContainerInsights.propertyName = "enableContainerInsights";
        enableContainerInsights.displayName = "Enable Container Insights";
        enableContainerInsights.description = "Enable CloudWatch Container Insights to collect metrics and logs.";
        enableContainerInsights.dataType = PropertyDataType.BOOLEAN;
        enableContainerInsights.required = false;
        enableContainerInsights.defaultValue = "true";
        enableContainerInsights.validationRules = Map.of();
        enableContainerInsights.displayOrder = 50;
        enableContainerInsights.persist();
    }

    @Test
    public void testCreateBlueprintWithFargateCapacityProvider() {
        String blueprintName = "ECS Fargate Blueprint " + uniqueId;
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Blueprint with ECS cluster using Fargate",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "ECS Cluster",
                        "description": "Fargate-based ECS cluster",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "AWS",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "my-ecs-cluster"
                        },
                        "cloudSpecificProperties": {
                            "capacityProvider": "FARGATE",
                            "enableContainerInsights": true
                        }
                    }
                ]
            }
            """.formatted(blueprintName, awsCloudProviderId, containerOrchestratorResourceTypeId);

        Response response = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", equalTo(blueprintName))
            .body("resources", hasSize(1))
            .body("resources[0].name", equalTo("ECS Cluster"))
            .body("resources[0].cloudSpecificProperties.capacityProvider", equalTo("FARGATE"))
            .body("resources[0].cloudSpecificProperties.enableContainerInsights", equalTo(true))
            .extract().response();

        UUID blueprintId = UUID.fromString(response.path("id"));

        // Verify blueprint was persisted correctly
        verifyBlueprintPersisted(blueprintId, blueprintName, "FARGATE");
    }

    @Test
    public void testCreateBlueprintWithEc2CapacityProvider() {
        String blueprintName = "ECS EC2 Blueprint " + uniqueId;
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Blueprint with ECS cluster using EC2",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "ECS EC2 Cluster",
                        "description": "EC2-based ECS cluster",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "AWS",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "my-ec2-ecs-cluster"
                        },
                        "cloudSpecificProperties": {
                            "capacityProvider": "EC2",
                            "instanceType": "m5.large",
                            "minClusterSize": 2,
                            "maxClusterSize": 20,
                            "enableContainerInsights": false
                        }
                    }
                ]
            }
            """.formatted(blueprintName, awsCloudProviderId, containerOrchestratorResourceTypeId);

        Response response = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", equalTo(blueprintName))
            .body("resources", hasSize(1))
            .body("resources[0].name", equalTo("ECS EC2 Cluster"))
            .body("resources[0].cloudSpecificProperties.capacityProvider", equalTo("EC2"))
            .body("resources[0].cloudSpecificProperties.instanceType", equalTo("m5.large"))
            .body("resources[0].cloudSpecificProperties.minClusterSize", equalTo(2))
            .body("resources[0].cloudSpecificProperties.maxClusterSize", equalTo(20))
            .body("resources[0].cloudSpecificProperties.enableContainerInsights", equalTo(false))
            .extract().response();

        UUID blueprintId = UUID.fromString(response.path("id"));

        // Verify blueprint was persisted correctly with EC2 properties
        verifyBlueprintPersistedWithEc2Properties(blueprintId, blueprintName);
    }

    @Test
    public void testRetrieveBlueprintWithEcsProperties() {
        // Create a blueprint first
        String blueprintName = "Retrieve Test Blueprint " + uniqueId;
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Blueprint for retrieval test",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "ECS Cluster",
                        "description": "Test cluster",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "AWS",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test-cluster"
                        },
                        "cloudSpecificProperties": {
                            "capacityProvider": "FARGATE_SPOT",
                            "enableContainerInsights": true
                        }
                    }
                ]
            }
            """.formatted(blueprintName, awsCloudProviderId, containerOrchestratorResourceTypeId);

        Response createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(201)
            .extract().response();

        UUID blueprintId = UUID.fromString(createResponse.path("id"));

        // Retrieve the blueprint and verify properties
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
        .when()
            .get("/v1/blueprints/" + blueprintId)
        .then()
            .statusCode(200)
            .body("id", equalTo(blueprintId.toString()))
            .body("name", equalTo(blueprintName))
            .body("resources", hasSize(1))
            .body("resources[0].cloudSpecificProperties.capacityProvider", equalTo("FARGATE_SPOT"))
            .body("resources[0].cloudSpecificProperties.enableContainerInsights", equalTo(true));
    }

    @Test
    public void testCreateBlueprintWithDefaultValues() {
        // Test that default values work when properties are not specified
        String blueprintName = "Default Values Blueprint " + uniqueId;
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Blueprint with minimal ECS properties",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Minimal ECS Cluster",
                        "description": "Cluster with default values",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "AWS",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "minimal-cluster"
                        },
                        "cloudSpecificProperties": {
                            "capacityProvider": "FARGATE"
                        }
                    }
                ]
            }
            """.formatted(blueprintName, awsCloudProviderId, containerOrchestratorResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(blueprintJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(201)
            .body("resources[0].cloudSpecificProperties.capacityProvider", equalTo("FARGATE"));
    }

    @Test
    public void testUpdateBlueprintWithDifferentCapacityProvider() {
        // Create a blueprint with Fargate
        String blueprintName = "Update Test Blueprint " + uniqueId;
        String createJson = """
            {
                "name": "%s",
                "description": "Initial blueprint",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "ECS Cluster",
                        "description": "Initial cluster",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "AWS",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "initial-cluster"
                        },
                        "cloudSpecificProperties": {
                            "capacityProvider": "FARGATE"
                        }
                    }
                ]
            }
            """.formatted(blueprintName, awsCloudProviderId, containerOrchestratorResourceTypeId);

        Response createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createJson)
        .when()
            .post("/v1/blueprints")
        .then()
            .statusCode(201)
            .extract().response();

        UUID blueprintId = UUID.fromString(createResponse.path("id"));

        // Update to EC2 capacity provider
        String updateJson = """
            {
                "name": "%s",
                "description": "Updated blueprint",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Updated ECS Cluster",
                        "description": "Now using EC2",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "AWS",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "updated-cluster"
                        },
                        "cloudSpecificProperties": {
                            "capacityProvider": "EC2",
                            "instanceType": "c5.large",
                            "minClusterSize": 3,
                            "maxClusterSize": 15
                        }
                    }
                ]
            }
            """.formatted(blueprintName, awsCloudProviderId, containerOrchestratorResourceTypeId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(updateJson)
        .when()
            .put("/v1/blueprints/" + blueprintId)
        .then()
            .statusCode(200)
            .body("resources[0].name", equalTo("Updated ECS Cluster"))
            .body("resources[0].cloudSpecificProperties.capacityProvider", equalTo("EC2"))
            .body("resources[0].cloudSpecificProperties.instanceType", equalTo("c5.large"))
            .body("resources[0].cloudSpecificProperties.minClusterSize", equalTo(3))
            .body("resources[0].cloudSpecificProperties.maxClusterSize", equalTo(15));
    }

    @Transactional
    void verifyBlueprintPersisted(UUID blueprintId, String expectedName, String expectedCapacityProvider) {
        Blueprint blueprint = Blueprint.findById(blueprintId);
        assertNotNull(blueprint, "Blueprint should be persisted");
        assertEquals(expectedName, blueprint.getName());
        
        assertNotNull(blueprint.getResources());
        assertEquals(1, blueprint.getResources().size());
        
        BlueprintResource resource = blueprint.getResources().iterator().next();
        assertEquals("ECS Cluster", resource.getName());
        
        Map<String, Object> props = resource.getCloudSpecificProperties();
        assertNotNull(props);
        assertEquals(expectedCapacityProvider, props.get("capacityProvider"));
    }

    @Transactional
    void verifyBlueprintPersistedWithEc2Properties(UUID blueprintId, String expectedName) {
        Blueprint blueprint = Blueprint.findById(blueprintId);
        assertNotNull(blueprint, "Blueprint should be persisted");
        assertEquals(expectedName, blueprint.getName());
        
        assertNotNull(blueprint.getResources());
        assertEquals(1, blueprint.getResources().size());
        
        BlueprintResource resource = blueprint.getResources().iterator().next();
        assertEquals("ECS EC2 Cluster", resource.getName());
        
        Map<String, Object> props = resource.getCloudSpecificProperties();
        assertNotNull(props);
        assertEquals("EC2", props.get("capacityProvider"));
        assertEquals("m5.large", props.get("instanceType"));
        assertEquals(2, props.get("minClusterSize"));
        assertEquals(20, props.get("maxClusterSize"));
        assertEquals(false, props.get("enableContainerInsights"));
    }
}
