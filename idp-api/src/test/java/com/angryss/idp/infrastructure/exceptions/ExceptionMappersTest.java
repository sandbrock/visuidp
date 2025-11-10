package com.angryss.idp.infrastructure.exceptions;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.*;

/**
 * Integration tests for exception mappers.
 * Verifies that validation exceptions return proper HTTP status codes and error messages.
 */
@QuarkusTest
public class ExceptionMappersTest {

    private static final String TEST_USER = "testuser@example.com";
    private static final String TEST_GROUPS = "Users";

    private UUID testCloudProviderId;
    private UUID testResourceTypeId;

    @BeforeEach
    @Transactional
    public void setup() {
        // Clean up existing test data
        ResourceType.deleteAll();
        CloudProvider.deleteAll();

        // Create a test cloud provider
        CloudProvider provider = new CloudProvider();
        provider.name = "TEST_PROVIDER";
        provider.displayName = "Test Provider";
        provider.description = "Test provider for exception mapper tests";
        provider.enabled = true;
        provider.persist();
        testCloudProviderId = provider.id;

        // Create a test resource type
        ResourceType resourceType = new ResourceType();
        resourceType.name = "TEST_RESOURCE";
        resourceType.displayName = "Test Resource";
        resourceType.description = "Test resource for exception mapper tests";
        resourceType.category = ResourceCategory.SHARED;
        resourceType.enabled = true;
        resourceType.persist();
        testResourceTypeId = resourceType.id;
    }

    @Test
    public void testIllegalArgumentExceptionMapper_Returns400WithMessage() {
        // Test with invalid resource type ID (triggers IllegalArgumentException)
        UUID invalidResourceTypeId = UUID.randomUUID();
        String uniqueName = "Test Blueprint " + UUID.randomUUID();
        
        String blueprintJson = """
            {
                "name": "%s",
                "description": "Test",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Test Resource",
                        "description": "Test",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "TEST_PROVIDER",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test"
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
            .body("error", equalTo("Bad Request"))
            .body("message", containsString("Resource type not found"));
    }

    @Test
    public void testIllegalStateExceptionMapper_Returns400WithMessage() {
        // Create a disabled cloud provider
        UUID disabledProviderId = createDisabledCloudProvider();
        String uniqueName = "Test Blueprint " + UUID.randomUUID();

        String blueprintJson = """
            {
                "name": "%s",
                "description": "Test",
                "isActive": true,
                "supportedCloudProviderIds": ["%s"],
                "resources": [
                    {
                        "name": "Test Resource",
                        "description": "Test",
                        "blueprintResourceTypeId": "%s",
                        "cloudType": "DISABLED_PROVIDER",
                        "configuration": {
                            "type": "container-orchestrator",
                            "cloudServiceName": "test"
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
            .body("error", equalTo("Bad Request"))
            .body("message", containsString("not enabled"));
    }

    @Test
    public void testNotFoundExceptionMapper_Returns404WithMessage() {
        // Test with non-existent blueprint ID
        UUID nonExistentId = UUID.randomUUID();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
        .when()
            .get("/v1/blueprints/" + nonExistentId)
        .then()
            .statusCode(404)
            .body("error", equalTo("Not Found"))
            .body("message", containsString("Blueprint not found"));
    }

    @Test
    public void testWebApplicationExceptionMapper_PreservesStatusCode() {
        // Test unauthorized access (401)
        given()
        .when()
            .get("/v1/blueprints")
        .then()
            .statusCode(401);
    }

    @Transactional
    UUID createDisabledCloudProvider() {
        CloudProvider provider = new CloudProvider();
        provider.name = "DISABLED_PROVIDER";
        provider.displayName = "Disabled Provider";
        provider.description = "Disabled provider for testing";
        provider.enabled = false;
        provider.persist();
        return provider.id;
    }
}
