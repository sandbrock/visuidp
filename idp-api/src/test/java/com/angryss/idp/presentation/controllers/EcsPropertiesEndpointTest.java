package com.angryss.idp.presentation.controllers;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.hasSize;

/**
 * Test class for verifying that the API endpoint returns ECS cluster properties
 * for AWS Managed Container Orchestrator.
 * 
 * This test validates Task 5 of the aws-ecs-container-orchestrator spec:
 * - Verify response contains 5 ECS cluster properties in correct order
 * - Verify capacityProvider is first property with display_order=10
 * - Verify only capacityProvider has required=true
 * - Verify all default values are present
 * - Verify validation rules are correctly formatted
 */
@QuarkusTest
public class EcsPropertiesEndpointTest {

    private static final String TEST_USER = "testuser@example.com";
    private static final String TEST_GROUPS = "Users";

    // IDs from V2__data.sql migration
    private static final UUID MANAGED_CONTAINER_ORCHESTRATOR_ID = UUID.fromString("a1f4e5c6-7d8b-4a2f-9c01-1234567890a1");
    private static final UUID AWS_CLOUD_PROVIDER_ID = UUID.fromString("8f0a5f8c-4b9d-4b3a-9a7a-2c1a6f5f1a01");

    @Test
    public void testGetEcsPropertiesSchema_ReturnsAllFiveClusterProperties() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("size()", equalTo(5))
            .body("capacityProvider", notNullValue())
            .body("instanceType", notNullValue())
            .body("minClusterSize", notNullValue())
            .body("maxClusterSize", notNullValue())
            .body("enableContainerInsights", notNullValue());
    }

    @Test
    public void testGetEcsPropertiesSchema_CapacityProviderIsFirstProperty() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("capacityProvider.displayOrder", equalTo(10))
            .body("capacityProvider.propertyName", equalTo("capacityProvider"))
            .body("capacityProvider.displayName", equalTo("Capacity Provider"));
    }

    @Test
    public void testGetEcsPropertiesSchema_AllPropertiesHaveCorrectDisplayOrder() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("capacityProvider.displayOrder", equalTo(10))
            .body("instanceType.displayOrder", equalTo(20))
            .body("minClusterSize.displayOrder", equalTo(30))
            .body("maxClusterSize.displayOrder", equalTo(40))
            .body("enableContainerInsights.displayOrder", equalTo(50));
    }

    @Test
    public void testGetEcsPropertiesSchema_OnlyCapacityProviderIsRequired() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            // Only capacityProvider is required
            .body("capacityProvider.required", equalTo(true))
            // All other properties are optional
            .body("instanceType.required", equalTo(false))
            .body("minClusterSize.required", equalTo(false))
            .body("maxClusterSize.required", equalTo(false))
            .body("enableContainerInsights.required", equalTo(false));
    }

    @Test
    public void testGetEcsPropertiesSchema_AllDefaultValuesPresent() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("capacityProvider.defaultValue", equalTo("\"FARGATE\""))
            .body("instanceType.defaultValue", equalTo("\"t3.medium\""))
            .body("minClusterSize.defaultValue", equalTo("\"1\""))
            .body("maxClusterSize.defaultValue", equalTo("\"10\""))
            .body("enableContainerInsights.defaultValue", equalTo("true"));
    }

    @Test
    public void testGetEcsPropertiesSchema_CapacityProviderValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("capacityProvider.dataType", equalTo("LIST"))
            .body("capacityProvider.validationRules.allowedValues", notNullValue())
            .body("capacityProvider.validationRules.allowedValues.size()", equalTo(3))
            .body("capacityProvider.validationRules.allowedValues[0].value", equalTo("FARGATE"))
            .body("capacityProvider.validationRules.allowedValues[1].value", equalTo("FARGATE_SPOT"))
            .body("capacityProvider.validationRules.allowedValues[2].value", equalTo("EC2"));
    }

    @Test
    public void testGetEcsPropertiesSchema_InstanceTypeValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("instanceType.dataType", equalTo("LIST"))
            .body("instanceType.validationRules.allowedValues", notNullValue())
            .body("instanceType.validationRules.allowedValues.size()", equalTo(10))
            .body("instanceType.validationRules.allowedValues[0].value", equalTo("t3.small"))
            .body("instanceType.validationRules.allowedValues[1].value", equalTo("t3.medium"))
            .body("instanceType.validationRules.allowedValues[2].value", equalTo("t3.large"));
    }

    @Test
    public void testGetEcsPropertiesSchema_MinClusterSizeValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("minClusterSize.dataType", equalTo("NUMBER"))
            .body("minClusterSize.validationRules.min", equalTo(0))
            .body("minClusterSize.validationRules.max", equalTo(100));
    }

    @Test
    public void testGetEcsPropertiesSchema_MaxClusterSizeValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("maxClusterSize.dataType", equalTo("NUMBER"))
            .body("maxClusterSize.validationRules.min", equalTo(1))
            .body("maxClusterSize.validationRules.max", equalTo(100));
    }

    @Test
    public void testGetEcsPropertiesSchema_EnableContainerInsightsIsBooleanType() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("enableContainerInsights.dataType", equalTo("BOOLEAN"))
            .body("enableContainerInsights.required", equalTo(false))
            .body("enableContainerInsights.defaultValue", equalTo("true"));
    }

    @Test
    public void testGetEcsPropertiesSchema_AllPropertiesHaveDescriptions() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("capacityProvider.description", notNullValue())
            .body("instanceType.description", notNullValue())
            .body("minClusterSize.description", notNullValue())
            .body("maxClusterSize.description", notNullValue())
            .body("enableContainerInsights.description", notNullValue());
    }

    @Test
    public void testGetEcsPropertiesSchema_Unauthenticated_ShouldFail() {
        given()
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(401);
    }
}
