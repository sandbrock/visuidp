package com.angryss.idp.presentation.controllers;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.hasSize;

/**
 * Test class for verifying that the API endpoint returns ECS properties
 * for AWS Managed Container Orchestrator.
 * 
 * This test validates Task 5 of the aws-ecs-container-orchestrator spec:
 * - Verify response contains 8 ECS properties in correct order
 * - Verify launchType is first property with display_order=10
 * - Verify all required properties have required=true
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
    public void testGetEcsPropertiesSchema_ReturnsAllEightProperties() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("size()", equalTo(8))
            .body("launchType", notNullValue())
            .body("taskCpu", notNullValue())
            .body("taskMemory", notNullValue())
            .body("desiredTaskCount", notNullValue())
            .body("enableAutoScaling", notNullValue())
            .body("minTaskCount", notNullValue())
            .body("maxTaskCount", notNullValue())
            .body("instanceType", notNullValue());
    }

    @Test
    public void testGetEcsPropertiesSchema_LaunchTypeIsFirstProperty() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("launchType.displayOrder", equalTo(10))
            .body("launchType.propertyName", equalTo("launchType"))
            .body("launchType.displayName", equalTo("Launch Type"));
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
            .body("launchType.displayOrder", equalTo(10))
            .body("taskCpu.displayOrder", equalTo(20))
            .body("taskMemory.displayOrder", equalTo(30))
            .body("desiredTaskCount.displayOrder", equalTo(40))
            .body("enableAutoScaling.displayOrder", equalTo(50))
            .body("minTaskCount.displayOrder", equalTo(60))
            .body("maxTaskCount.displayOrder", equalTo(70))
            .body("instanceType.displayOrder", equalTo(80));
    }

    @Test
    public void testGetEcsPropertiesSchema_RequiredPropertiesMarkedCorrectly() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            // Required properties
            .body("launchType.required", equalTo(true))
            .body("taskCpu.required", equalTo(true))
            .body("taskMemory.required", equalTo(true))
            .body("desiredTaskCount.required", equalTo(true))
            // Optional properties
            .body("enableAutoScaling.required", equalTo(false))
            .body("minTaskCount.required", equalTo(false))
            .body("maxTaskCount.required", equalTo(false))
            .body("instanceType.required", equalTo(false));
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
            .body("launchType.defaultValue", equalTo("\"FARGATE\""))
            .body("taskCpu.defaultValue", equalTo("\"512\""))
            .body("taskMemory.defaultValue", equalTo("\"1024\""))
            .body("desiredTaskCount.defaultValue", equalTo("\"2\""))
            .body("enableAutoScaling.defaultValue", equalTo("\"false\""))
            .body("minTaskCount.defaultValue", equalTo("\"1\""))
            .body("maxTaskCount.defaultValue", equalTo("\"10\""))
            .body("instanceType.defaultValue", equalTo("\"t3.medium\""));
    }

    @Test
    public void testGetEcsPropertiesSchema_LaunchTypeValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("launchType.dataType", equalTo("LIST"))
            .body("launchType.validationRules.allowedValues", notNullValue())
            .body("launchType.validationRules.allowedValues.size()", equalTo(2))
            .body("launchType.validationRules.allowedValues[0].value", equalTo("FARGATE"))
            .body("launchType.validationRules.allowedValues[1].value", equalTo("EC2"));
    }

    @Test
    public void testGetEcsPropertiesSchema_TaskCpuValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("taskCpu.dataType", equalTo("LIST"))
            .body("taskCpu.validationRules.allowedValues", notNullValue())
            .body("taskCpu.validationRules.allowedValues.size()", equalTo(5))
            .body("taskCpu.validationRules.allowedValues[0].value", equalTo("256"))
            .body("taskCpu.validationRules.allowedValues[1].value", equalTo("512"))
            .body("taskCpu.validationRules.allowedValues[2].value", equalTo("1024"))
            .body("taskCpu.validationRules.allowedValues[3].value", equalTo("2048"))
            .body("taskCpu.validationRules.allowedValues[4].value", equalTo("4096"));
    }

    @Test
    public void testGetEcsPropertiesSchema_TaskMemoryValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("taskMemory.dataType", equalTo("LIST"))
            .body("taskMemory.validationRules.allowedValues", notNullValue())
            .body("taskMemory.validationRules.allowedValues.size()", equalTo(7));
    }

    @Test
    public void testGetEcsPropertiesSchema_DesiredTaskCountValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("desiredTaskCount.dataType", equalTo("NUMBER"))
            .body("desiredTaskCount.validationRules.min", equalTo(1))
            .body("desiredTaskCount.validationRules.max", equalTo(100));
    }

    @Test
    public void testGetEcsPropertiesSchema_MinTaskCountValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("minTaskCount.dataType", equalTo("NUMBER"))
            .body("minTaskCount.validationRules.min", equalTo(1))
            .body("minTaskCount.validationRules.max", equalTo(100));
    }

    @Test
    public void testGetEcsPropertiesSchema_MaxTaskCountValidationRules() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("maxTaskCount.dataType", equalTo("NUMBER"))
            .body("maxTaskCount.validationRules.min", equalTo(1))
            .body("maxTaskCount.validationRules.max", equalTo(100));
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
            .body("instanceType.validationRules.allowedValues.size()", equalTo(10));
    }

    @Test
    public void testGetEcsPropertiesSchema_EnableAutoScalingIsBooleanType() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when()
            .get("/v1/blueprints/resource-schema/" + MANAGED_CONTAINER_ORCHESTRATOR_ID + "/" + AWS_CLOUD_PROVIDER_ID)
            .then()
            .statusCode(200)
            .body("enableAutoScaling.dataType", equalTo("BOOLEAN"))
            .body("enableAutoScaling.required", equalTo(false))
            .body("enableAutoScaling.defaultValue", equalTo("\"false\""));
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
            .body("launchType.description", notNullValue())
            .body("taskCpu.description", notNullValue())
            .body("taskMemory.description", notNullValue())
            .body("desiredTaskCount.description", notNullValue())
            .body("enableAutoScaling.description", notNullValue())
            .body("minTaskCount.description", notNullValue())
            .body("maxTaskCount.description", notNullValue())
            .body("instanceType.description", notNullValue());
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
