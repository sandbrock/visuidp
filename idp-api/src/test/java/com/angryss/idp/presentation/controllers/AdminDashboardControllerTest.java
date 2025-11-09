package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.PropertyDataType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;

@QuarkusTest
public class AdminDashboardControllerTest {

    private static final String ADMIN_USER = "admin@example.com";
    private static final String ADMIN_GROUPS = "IDP-Admins,Users";
    private static final String NON_ADMIN_USER = "user@example.com";
    private static final String NON_ADMIN_GROUPS = "Users";

    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up any existing test data in correct order (children first)
        PropertySchema.deleteAll();
        ResourceTypeCloudMapping.deleteAll();
        StackResource.deleteAll();
        BlueprintResource.deleteAll();
        EnvironmentConfig.deleteAll();

        EnvironmentEntity.deleteAll();
        ResourceType.deleteAll();
        CloudProvider.deleteAll();
        
        // Create test cloud providers
        CloudProvider aws = new CloudProvider();
        aws.name = "TEST_AWS";
        aws.displayName = "Test AWS";
        aws.enabled = true;
        aws.persist();
        
        CloudProvider azure = new CloudProvider();
        azure.name = "TEST_AZURE";
        azure.displayName = "Test Azure";
        azure.enabled = false;
        azure.persist();
        
        // Create test resource types
        ResourceType database = new ResourceType();
        database.name = "TEST_DATABASE";
        database.displayName = "Test Database";
        database.category = ResourceCategory.NON_SHARED;
        database.enabled = true;
        database.persist();
        
        ResourceType orchestrator = new ResourceType();
        orchestrator.name = "TEST_ORCHESTRATOR";
        orchestrator.displayName = "Test Orchestrator";
        orchestrator.category = ResourceCategory.SHARED;
        orchestrator.enabled = true;
        orchestrator.persist();
        
        // Create complete mapping (with properties)
        ResourceTypeCloudMapping completeMapping = new ResourceTypeCloudMapping();
        completeMapping.resourceType = database;
        completeMapping.cloudProvider = aws;
        completeMapping.terraformModuleLocation = "git::https://github.com/test/terraform-aws-rds.git";
        completeMapping.moduleLocationType = ModuleLocationType.GIT;
        completeMapping.enabled = true;
        completeMapping.persist();
        
        PropertySchema property1 = new PropertySchema();
        property1.mapping = completeMapping;
        property1.propertyName = "instanceClass";
        property1.displayName = "Instance Class";
        property1.dataType = PropertyDataType.STRING;
        property1.required = true;
        property1.persist();
        
        // Create incomplete mapping (no properties)
        ResourceTypeCloudMapping incompleteMapping = new ResourceTypeCloudMapping();
        incompleteMapping.resourceType = orchestrator;
        incompleteMapping.cloudProvider = aws;
        incompleteMapping.terraformModuleLocation = "git::https://github.com/test/terraform-aws-ecs.git";
        incompleteMapping.moduleLocationType = ModuleLocationType.GIT;
        incompleteMapping.enabled = false;
        incompleteMapping.persist();
    }

    @Test
    public void testGetDashboard_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard")
            .then()
                .statusCode(200)
                .body("cloudProviders", notNullValue())
                .body("resourceTypes", notNullValue())
                .body("mappings", notNullValue())
                .body("statistics", notNullValue())
                .body("statistics.totalCloudProviders", greaterThanOrEqualTo(2))
                .body("statistics.totalResourceTypes", greaterThanOrEqualTo(2))
                .body("statistics.totalMappings", greaterThanOrEqualTo(2))
                .body("statistics.totalPropertySchemas", greaterThanOrEqualTo(1));
    }

    @Test
    public void testGetDashboard_AsNonAdmin_ShouldFail() {
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard")
            .then()
                .statusCode(403);
    }

    @Test
    public void testGetDashboard_Unauthenticated_ShouldFail() {
        given()
            .when().get("/v1/admin/dashboard")
            .then()
                .statusCode(401);
    }

    @Test
    public void testGetIncompleteMappings_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard/incomplete-mappings")
            .then()
                .statusCode(200)
                .body("$", notNullValue())
                .body("[0].isComplete", is(false));
    }

    @Test
    public void testGetIncompleteMappings_AsNonAdmin_ShouldFail() {
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard/incomplete-mappings")
            .then()
                .statusCode(403);
    }

    @Test
    public void testGetStatistics_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard/statistics")
            .then()
                .statusCode(200)
                .body("totalCloudProviders", greaterThanOrEqualTo(2))
                .body("totalResourceTypes", greaterThanOrEqualTo(2))
                .body("totalMappings", greaterThanOrEqualTo(2))
                .body("totalPropertySchemas", greaterThanOrEqualTo(1))
                .body("enabledCloudProviders", greaterThanOrEqualTo(1))
                .body("enabledResourceTypes", greaterThanOrEqualTo(2))
                .body("enabledMappings", greaterThanOrEqualTo(1))
                .body("incompleteMappings", greaterThanOrEqualTo(1));
    }

    @Test
    public void testGetStatistics_AsNonAdmin_ShouldFail() {
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/admin/dashboard/statistics")
            .then()
                .statusCode(403);
    }
}
