package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.valueobjects.ModuleLocationType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;

@QuarkusTest
public class ResourceTypeCloudMappingsControllerTest {

    private static final String ADMIN_USER = "admin@example.com";
    private static final String ADMIN_GROUPS = "IDP-Admins,Users";
    private static final String NON_ADMIN_USER = "user@example.com";
    private static final String NON_ADMIN_GROUPS = "Users";

    private UUID testMappingId;
    private UUID testCloudProviderId;
    private UUID testResourceTypeId;

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
        
        // Create a test cloud provider
        CloudProvider provider = new CloudProvider();
        provider.name = "TEST_AWS";
        provider.displayName = "Test AWS";
        provider.description = "Test AWS provider";
        provider.enabled = true;
        provider.persist();
        testCloudProviderId = provider.id;
        
        // Create a test resource type
        ResourceType resourceType = new ResourceType();
        resourceType.name = "TEST_DATABASE";
        resourceType.displayName = "Test Database";
        resourceType.description = "Test database resource";
        resourceType.category = ResourceCategory.NON_SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        testResourceTypeId = resourceType.id;
        
        // Create a test mapping
        ResourceTypeCloudMapping mapping = new ResourceTypeCloudMapping();
        mapping.resourceType = resourceType;
        mapping.cloudProvider = provider;
        mapping.terraformModuleLocation = "git::https://github.com/test/terraform-aws-rds.git";
        mapping.moduleLocationType = ModuleLocationType.GIT;
        mapping.enabled = true;
        mapping.persist();
        testMappingId = mapping.id;
    }

    @Test
    public void testListAllMappings_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-type-cloud-mappings")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].resourceTypeName", notNullValue())
                .body("[0].cloudProviderName", notNullValue());
    }

    @Test
    public void testListAllMappings_AsNonAdmin_ShouldFail() {
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/admin/resource-type-cloud-mappings")
            .then()
                .statusCode(403);
    }

    @Test
    public void testGetMappingById_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-type-cloud-mappings/" + testMappingId)
            .then()
                .statusCode(200)
                .body("id", is(testMappingId.toString()))
                .body("resourceTypeId", is(testResourceTypeId.toString()))
                .body("cloudProviderId", is(testCloudProviderId.toString()))
                .body("terraformModuleLocation", is("git::https://github.com/test/terraform-aws-rds.git"))
                .body("moduleLocationType", is("GIT"))
                .body("enabled", is(true));
    }

    @Test
    public void testGetMappingById_NotFound() {
        UUID nonExistentId = UUID.randomUUID();
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-type-cloud-mappings/" + nonExistentId)
            .then()
                .statusCode(404);
    }

    @Test
    public void testCreateMapping_AsAdmin() {
        // Create another cloud provider for this test in a separate transaction
        UUID azureId = createAzureProvider();

        String requestBody = String.format("""
            {
                "resourceTypeId": "%s",
                "cloudProviderId": "%s",
                "terraformModuleLocation": "git::https://github.com/test/terraform-azure-sql.git",
                "moduleLocationType": "GIT",
                "enabled": false
            }
            """, testResourceTypeId, azureId);

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-type-cloud-mappings")
            .then()
                .statusCode(201)
                .body("resourceTypeId", is(testResourceTypeId.toString()))
                .body("cloudProviderId", is(azureId.toString()))
                .body("terraformModuleLocation", is("git::https://github.com/test/terraform-azure-sql.git"))
                .body("moduleLocationType", is("GIT"))
                .body("enabled", is(false))
                .body("id", notNullValue());
    }

    @Transactional
    UUID createAzureProvider() {
        CloudProvider azure = new CloudProvider();
        azure.name = "TEST_AZURE";
        azure.displayName = "Test Azure";
        azure.enabled = true;
        azure.persist();
        return azure.id;
    }

    @Test
    public void testCreateMapping_DuplicateMapping_ShouldFail() {
        String requestBody = String.format("""
            {
                "resourceTypeId": "%s",
                "cloudProviderId": "%s",
                "terraformModuleLocation": "git::https://github.com/test/duplicate.git",
                "moduleLocationType": "GIT"
            }
            """, testResourceTypeId, testCloudProviderId);

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-type-cloud-mappings")
            .then()
                .statusCode(400);
    }

    @Test
    public void testCreateMapping_InvalidResourceType_ShouldFail() {
        UUID nonExistentId = UUID.randomUUID();
        String requestBody = String.format("""
            {
                "resourceTypeId": "%s",
                "cloudProviderId": "%s",
                "terraformModuleLocation": "git::https://github.com/test/module.git",
                "moduleLocationType": "GIT"
            }
            """, nonExistentId, testCloudProviderId);

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-type-cloud-mappings")
            .then()
                .statusCode(400);
    }

    @Test
    public void testUpdateMapping_AsAdmin() {
        String requestBody = """
            {
                "terraformModuleLocation": "git::https://github.com/test/updated-module.git",
                "moduleLocationType": "GIT"
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().put("/v1/admin/resource-type-cloud-mappings/" + testMappingId)
            .then()
                .statusCode(200)
                .body("id", is(testMappingId.toString()))
                .body("terraformModuleLocation", is("git::https://github.com/test/updated-module.git"));
    }

    @Test
    public void testToggleMappingEnabled_AsAdmin() {
        // Disable the mapping
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", false)
            .when().patch("/v1/admin/resource-type-cloud-mappings/" + testMappingId + "/toggle")
            .then()
                .statusCode(204);

        // Verify it's disabled
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-type-cloud-mappings/" + testMappingId)
            .then()
                .statusCode(200)
                .body("enabled", is(false));
    }

    @Test
    public void testListMappingsByResourceType_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-type-cloud-mappings/resource-type/" + testResourceTypeId)
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].resourceTypeId", is(testResourceTypeId.toString()));
    }

    @Test
    public void testListMappingsByCloudProvider_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-type-cloud-mappings/cloud-provider/" + testCloudProviderId)
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].cloudProviderId", is(testCloudProviderId.toString()));
    }
}
