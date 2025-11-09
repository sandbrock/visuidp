package com.angryss.idp.presentation.controllers;

import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
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
public class ResourceTypesControllerTest {

    private static final String ADMIN_USER = "admin@example.com";
    private static final String ADMIN_GROUPS = "IDP-Admins,Users";
    private static final String NON_ADMIN_USER = "user@example.com";
    private static final String NON_ADMIN_GROUPS = "Users";

    private UUID testResourceTypeId;

    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up any existing test data in correct order (children first)
        PropertySchema.deleteAll();
        ResourceTypeCloudMapping.deleteAll();
        StackResource.deleteAll();
        BlueprintResource.deleteAll();
        ResourceType.deleteAll();
        
        // Create a test resource type
        ResourceType resourceType = new ResourceType();
        resourceType.name = "TEST_DATABASE";
        resourceType.displayName = "Test Database";
        resourceType.description = "Test database resource";
        resourceType.category = ResourceCategory.NON_SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        testResourceTypeId = resourceType.id;
    }

    @Test
    public void testListAllResourceTypes_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-types")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].name", notNullValue())
                .body("[0].category", notNullValue());
    }

    @Test
    public void testListAllResourceTypes_AsNonAdmin_ShouldFail() {
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/admin/resource-types")
            .then()
                .statusCode(403);
    }

    @Test
    public void testGetResourceTypeById_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-types/" + testResourceTypeId)
            .then()
                .statusCode(200)
                .body("id", is(testResourceTypeId.toString()))
                .body("name", is("TEST_DATABASE"))
                .body("displayName", is("Test Database"))
                .body("category", is("NON_SHARED"))
                .body("enabled", is(true));
    }

    @Test
    public void testGetResourceTypeById_NotFound() {
        UUID nonExistentId = UUID.randomUUID();
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-types/" + nonExistentId)
            .then()
                .statusCode(404);
    }

    @Test
    public void testCreateResourceType_AsAdmin() {
        String requestBody = """
            {
                "name": "CONTAINER_ORCHESTRATOR",
                "displayName": "Container Orchestrator",
                "description": "Managed container orchestration platform",
                "category": "SHARED",
                "enabled": true
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
                .body("name", is("CONTAINER_ORCHESTRATOR"))
                .body("displayName", is("Container Orchestrator"))
                .body("category", is("SHARED"))
                .body("enabled", is(true))
                .body("id", notNullValue());
    }

    @Test
    public void testCreateResourceType_DuplicateName_ShouldFail() {
        String requestBody = """
            {
                "name": "TEST_DATABASE",
                "displayName": "Duplicate Database",
                "category": "NON_SHARED"
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-types")
            .then()
                .statusCode(400);
    }

    @Test
    public void testCreateResourceType_InvalidData_ShouldFail() {
        String requestBody = """
            {
                "displayName": "Missing Name and Category"
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/resource-types")
            .then()
                .statusCode(400);
    }

    @Test
    public void testUpdateResourceType_AsAdmin() {
        String requestBody = """
            {
                "displayName": "Updated Database Name",
                "description": "Updated description"
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().put("/v1/admin/resource-types/" + testResourceTypeId)
            .then()
                .statusCode(200)
                .body("id", is(testResourceTypeId.toString()))
                .body("displayName", is("Updated Database Name"))
                .body("description", is("Updated description"))
                .body("name", is("TEST_DATABASE")); // Name should not change
    }

    @Test
    public void testToggleResourceTypeEnabled_AsAdmin() {
        // Disable the resource type
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", false)
            .when().patch("/v1/admin/resource-types/" + testResourceTypeId + "/toggle")
            .then()
                .statusCode(204);

        // Verify it's disabled
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-types/" + testResourceTypeId)
            .then()
                .statusCode(200)
                .body("enabled", is(false));
    }

    @Test
    public void testListResourceTypesByCategory_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-types/category/NON_SHARED")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].category", is("NON_SHARED"));
    }

    @Test
    public void testListResourceTypesByCategory_EmptyResult() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/resource-types/category/SHARED")
            .then()
                .statusCode(200)
                .body("$", hasSize(0));
    }
}
