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
public class CloudProvidersControllerTest {

    private static final String ADMIN_USER = "admin@example.com";
    private static final String ADMIN_GROUPS = "IDP-Admins,Users";
    private static final String NON_ADMIN_USER = "user@example.com";
    private static final String NON_ADMIN_GROUPS = "Users";

    private UUID testProviderId;

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
        provider.displayName = "Test Amazon Web Services";
        provider.description = "Test AWS provider";
        provider.enabled = true;
        provider.persist();
        testProviderId = provider.id;
    }

    @Test
    public void testListAllCloudProviders_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/cloud-providers")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].name", notNullValue())
                .body("[0].displayName", notNullValue());
    }

    @Test
    public void testListAllCloudProviders_AsNonAdmin_ShouldFail() {
        given()
            .header("X-Auth-Request-Email", NON_ADMIN_USER)
            .header("X-Auth-Request-Groups", NON_ADMIN_GROUPS)
            .when().get("/v1/admin/cloud-providers")
            .then()
                .statusCode(403);
    }

    @Test
    public void testListAllCloudProviders_Unauthenticated_ShouldFail() {
        given()
            .when().get("/v1/admin/cloud-providers")
            .then()
                .statusCode(401);
    }

    @Test
    public void testGetCloudProviderById_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/cloud-providers/" + testProviderId)
            .then()
                .statusCode(200)
                .body("id", is(testProviderId.toString()))
                .body("name", is("TEST_AWS"))
                .body("displayName", is("Test Amazon Web Services"))
                .body("enabled", is(true));
    }

    @Test
    public void testGetCloudProviderById_NotFound() {
        UUID nonExistentId = UUID.randomUUID();
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/cloud-providers/" + nonExistentId)
            .then()
                .statusCode(404);
    }

    @Test
    public void testCreateCloudProvider_AsAdmin() {
        String requestBody = """
            {
                "name": "AZURE",
                "displayName": "Microsoft Azure",
                "description": "Microsoft cloud platform",
                "enabled": false
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/cloud-providers")
            .then()
                .statusCode(201)
                .body("name", is("AZURE"))
                .body("displayName", is("Microsoft Azure"))
                .body("description", is("Microsoft cloud platform"))
                .body("enabled", is(false))
                .body("id", notNullValue())
                .body("createdAt", notNullValue());
    }

    @Test
    public void testCreateCloudProvider_DuplicateName_ShouldFail() {
        String requestBody = """
            {
                "name": "TEST_AWS",
                "displayName": "Duplicate AWS",
                "description": "This should fail"
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/cloud-providers")
            .then()
                .statusCode(400);
    }

    @Test
    public void testCreateCloudProvider_InvalidData_ShouldFail() {
        String requestBody = """
            {
                "displayName": "Missing Name"
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().post("/v1/admin/cloud-providers")
            .then()
                .statusCode(400);
    }

    @Test
    public void testUpdateCloudProvider_AsAdmin() {
        String requestBody = """
            {
                "displayName": "Updated AWS Name",
                "description": "Updated description"
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().put("/v1/admin/cloud-providers/" + testProviderId)
            .then()
                .statusCode(200)
                .body("id", is(testProviderId.toString()))
                .body("displayName", is("Updated AWS Name"))
                .body("description", is("Updated description"))
                .body("name", is("TEST_AWS")); // Name should not change
    }

    @Test
    public void testUpdateCloudProvider_NotFound() {
        UUID nonExistentId = UUID.randomUUID();
        String requestBody = """
            {
                "displayName": "Updated Name"
            }
            """;

        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when().put("/v1/admin/cloud-providers/" + nonExistentId)
            .then()
                .statusCode(404);
    }

    @Test
    public void testToggleCloudProviderEnabled_AsAdmin() {
        // Disable the provider
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", false)
            .when().patch("/v1/admin/cloud-providers/" + testProviderId + "/toggle")
            .then()
                .statusCode(204);

        // Verify it's disabled
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/cloud-providers/" + testProviderId)
            .then()
                .statusCode(200)
                .body("enabled", is(false));

        // Enable it again
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("enabled", true)
            .when().patch("/v1/admin/cloud-providers/" + testProviderId + "/toggle")
            .then()
                .statusCode(204);

        // Verify it's enabled
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/cloud-providers/" + testProviderId)
            .then()
                .statusCode(200)
                .body("enabled", is(true));
    }

    @Test
    public void testToggleCloudProviderEnabled_MissingParameter_ShouldFail() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().patch("/v1/admin/cloud-providers/" + testProviderId + "/toggle")
            .then()
                .statusCode(400);
    }

    @Test
    public void testListEnabledCloudProviders_AsAdmin() {
        given()
            .header("X-Auth-Request-Email", ADMIN_USER)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/admin/cloud-providers/enabled")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].enabled", is(true));
    }
}
