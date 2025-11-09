package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.ApiKeyCreateDto;
import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.entities.ApiKey;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * End-to-end integration tests for API key authentication flow.
 * Tests complete user journeys from key creation through authentication and lifecycle management.
 */
@QuarkusTest
public class ApiKeyE2ETest {

    private static final String TEST_USER = "e2euser@example.com";
    private static final String TEST_ADMIN = "e2eadmin@example.com";
    private static final String TEST_GROUPS = "Users";
    private static final String ADMIN_GROUPS = "Admins";

    @BeforeEach
    @Transactional
    public void cleanup() {
        AdminAuditLog.deleteAll();
        ApiKey.deleteAll();
    }

    @Test
    public void testCompleteUserApiKeyLifecycle() {
        // Step 1: User creates an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("E2E Test Key");
        createDto.setExpirationDays(30);

        Response createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .body("apiKey", notNullValue())
                .extract().response();

        String apiKey = createResponse.jsonPath().getString("apiKey");
        String keyId = createResponse.jsonPath().getString("id");

        // Step 2: User authenticates with the API key
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(200)
                .body("status", is("UP"));

        // Step 3: User lists their API keys
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(200)
                .body("$", hasItem(hasEntry("id", keyId)));

        // Step 4: User rotates the API key
        Response rotateResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().post("/v1/api-keys/" + keyId + "/rotate")
            .then()
                .statusCode(200)
                .body("apiKey", notNullValue())
                .body("id", not(equalTo(keyId)))
                .extract().response();

        String newApiKey = rotateResponse.jsonPath().getString("apiKey");
        String newKeyId = rotateResponse.jsonPath().getString("id");

        // Step 5: Both old and new keys work during grace period
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        given()
            .header("Authorization", "Bearer " + newApiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        // Step 6: User revokes the new key
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + newKeyId)
            .then()
                .statusCode(204);

        // Step 7: Revoked key no longer works
        given()
            .header("Authorization", "Bearer " + newApiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(401);
    }

    @Test
    public void testSystemApiKeyLifecycle() {
        // Step 1: Admin creates a system API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("System E2E Key");
        createDto.setExpirationDays(90);

        Response createResponse = given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/system")
            .then()
                .statusCode(201)
                .body("apiKey", notNullValue())
                .body("keyType", equalTo("SYSTEM"))
                .extract().response();

        String apiKey = createResponse.jsonPath().getString("apiKey");
        String keyId = createResponse.jsonPath().getString("id");

        // Step 2: System key can access admin endpoints
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/api-keys/all")
            .then()
                .statusCode(200);

        // Step 3: Admin can view all keys including system keys
        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/api-keys/all")
            .then()
                .statusCode(200)
                .body("$", hasItem(hasEntry("id", keyId)));

        // Step 4: Admin revokes the system key
        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().delete("/v1/api-keys/" + keyId)
            .then()
                .statusCode(204);

        // Step 5: Revoked system key no longer works
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/api-keys/all")
            .then()
                .statusCode(401);
    }

    @Test
    public void testApiKeyAndOAuth2Coexistence() {
        // Step 1: Create an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Coexistence Test Key");
        createDto.setExpirationDays(30);

        Response createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();

        String apiKey = createResponse.jsonPath().getString("apiKey");

        // Step 2: Access with API key
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        // Step 3: Access with OAuth2 headers (no API key)
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        // Step 4: API key takes precedence when both are present
        given()
            .header("Authorization", "Bearer " + apiKey)
            .header("X-Auth-Request-Email", "different@example.com")
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(200)
                // Should return keys for TEST_USER (from API key), not different@example.com
                .body("$[0].userEmail", equalTo(TEST_USER));
    }

    @Test
    public void testApiKeyUpdateNameAndReuse() {
        // Step 1: Create an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Original Name");
        createDto.setExpirationDays(30);

        Response createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();

        String apiKey = createResponse.jsonPath().getString("apiKey");
        String keyId = createResponse.jsonPath().getString("id");

        // Step 2: Update the key name
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body("{\"keyName\": \"Updated Name\"}")
            .when().put("/v1/api-keys/" + keyId + "/name")
            .then()
                .statusCode(200)
                .body("keyName", equalTo("Updated Name"));

        // Step 3: API key still works after name update
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        // Step 4: Verify updated name appears in list
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(200)
                .body("$[0].keyName", equalTo("Updated Name"));
    }

    @Test
    public void testMultipleApiKeysForSameUser() {
        // Step 1: Create multiple API keys
        ApiKeyCreateDto createDto1 = new ApiKeyCreateDto();
        createDto1.setKeyName("Key 1");
        createDto1.setExpirationDays(30);

        Response response1 = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto1)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();

        String apiKey1 = response1.jsonPath().getString("apiKey");

        ApiKeyCreateDto createDto2 = new ApiKeyCreateDto();
        createDto2.setKeyName("Key 2");
        createDto2.setExpirationDays(60);

        Response response2 = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto2)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();

        String apiKey2 = response2.jsonPath().getString("apiKey");

        // Step 2: Both keys work independently
        given()
            .header("Authorization", "Bearer " + apiKey1)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        given()
            .header("Authorization", "Bearer " + apiKey2)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        // Step 3: User sees both keys in list
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(200)
                .body("$", hasSize(2));

        // Step 4: Revoke one key doesn't affect the other
        String keyId1 = response1.jsonPath().getString("id");
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + keyId1)
            .then()
                .statusCode(204);

        given()
            .header("Authorization", "Bearer " + apiKey1)
            .when().get("/v1/health")
            .then()
                .statusCode(401);

        given()
            .header("Authorization", "Bearer " + apiKey2)
            .when().get("/v1/health")
            .then()
                .statusCode(200);
    }

    @Test
    public void testAuditTrailForApiKeyOperations() {
        // Step 1: Create an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Audit Test Key");
        createDto.setExpirationDays(30);

        Response createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();

        String apiKey = createResponse.jsonPath().getString("apiKey");
        String keyId = createResponse.jsonPath().getString("id");

        // Step 2: Use the API key (generates authentication log)
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        // Step 3: Revoke the key
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + keyId)
            .then()
                .statusCode(204);

        // Step 4: Admin can view audit logs
        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("userEmail", TEST_USER)
            .when().get("/v1/api-keys/audit-logs")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(3))); // Create, auth, revoke
    }

    @Test
    public void testAuthorizationBoundaries() {
        // Step 1: User creates their own key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("User Key");
        createDto.setExpirationDays(30);

        Response userKeyResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();

        String userKeyId = userKeyResponse.jsonPath().getString("id");

        // Step 2: Different user cannot access the key
        given()
            .header("X-Auth-Request-Email", "otheruser@example.com")
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/" + userKeyId)
            .then()
                .statusCode(403);

        // Step 3: Different user cannot revoke the key
        given()
            .header("X-Auth-Request-Email", "otheruser@example.com")
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + userKeyId)
            .then()
                .statusCode(403);

        // Step 4: Admin can access and manage any key
        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/api-keys/" + userKeyId)
            .then()
                .statusCode(200);

        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().delete("/v1/api-keys/" + userKeyId)
            .then()
                .statusCode(204);
    }
}
