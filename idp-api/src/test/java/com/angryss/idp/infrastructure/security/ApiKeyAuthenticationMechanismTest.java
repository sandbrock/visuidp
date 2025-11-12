package com.angryss.idp.infrastructure.security;

import com.angryss.idp.application.dtos.ApiKeyCreateDto;
import com.angryss.idp.application.usecases.ApiKeyService;
import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Integration tests for ApiKeyAuthenticationMechanism.
 * Tests the full authentication flow including valid keys, invalid keys,
 * expired keys, revoked keys, and fallback to OAuth2.
 */
@QuarkusTest
public class ApiKeyAuthenticationMechanismTest {

    private static final String TEST_USER = "testuser@example.com";
    private static final String TEST_GROUPS = "Users";
    private static final String ADMIN_GROUPS = "IDP-Admins";

    @Inject
    ApiKeyService apiKeyService;

    @BeforeEach
    @Transactional
    public void cleanup() {
        AdminAuditLog.deleteAll();
        ApiKey.deleteAll();
    }

    @Test
    @Transactional
    public void testValidApiKey_Success() {
        // Given - Create a valid API key using OAuth2 headers
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Valid Test Key");
        createDto.setExpirationDays(30);
        
        var createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType("application/json")
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();
        
        String apiKey = createResponse.jsonPath().getString("apiKey");
        String keyId = createResponse.jsonPath().getString("id");

        // When - Make request with valid API key
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(200)
                .body("status", is("UP"));

        // Then - Verify last_used_at was updated
        ApiKey updatedKey = ApiKey.findById(java.util.UUID.fromString(keyId));
        assertNotNull(updatedKey.lastUsedAt);
    }

    @Test
    public void testInvalidApiKeyFormat_Unauthorized() {
        // When - Make request with invalid format API key
        given()
            .header("Authorization", "Bearer invalid_format_key")
            .when().get("/v1/health")
            .then()
                .statusCode(401);
    }

    @Test
    public void testInvalidApiKey_Unauthorized() {
        // When - Make request with non-existent API key
        given()
            .header("Authorization", "Bearer idp_user_nonexistentkey1234567890ab")
            .when().get("/v1/health")
            .then()
                .statusCode(401);
    }

    @Test
    @Transactional
    public void testExpiredApiKey_Unauthorized() {
        // Given - Create an expired API key
        ApiKey expiredKey = new ApiKey();
        expiredKey.keyName = "Expired Key";
        expiredKey.keyHash = "$2a$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP"; // Dummy hash
        expiredKey.keyPrefix = "idp_user_expired";
        expiredKey.keyType = ApiKeyType.USER;
        expiredKey.userEmail = TEST_USER;
        expiredKey.createdByEmail = TEST_USER;
        expiredKey.createdAt = LocalDateTime.now().minusDays(100);
        expiredKey.expiresAt = LocalDateTime.now().minusDays(1); // Expired yesterday
        expiredKey.isActive = true;
        expiredKey.persist();

        // When - Make request with expired API key
        given()
            .header("Authorization", "Bearer idp_user_expired123456789012")
            .when().get("/v1/health")
            .then()
                .statusCode(401);
    }

    @Test
    @Transactional
    public void testRevokedApiKey_Unauthorized() {
        // Given - Create and revoke an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Key to Revoke");
        createDto.setExpirationDays(30);
        
        var createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType("application/json")
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();
        
        String apiKeyValue = createResponse.jsonPath().getString("apiKey");
        String keyId = createResponse.jsonPath().getString("id");
        
        // Revoke the key
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + keyId)
            .then()
                .statusCode(204);

        // When - Make request with revoked API key
        given()
            .header("Authorization", "Bearer " + apiKeyValue)
            .when().get("/v1/health")
            .then()
                .statusCode(401);
    }

    @Test
    public void testNoAuthorizationHeader_FallbackToOAuth2() {
        // When - Make request without Authorization header but with OAuth2 headers
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/health")
            .then()
                .statusCode(200)
                .body("status", is("UP"));
    }

    @Test
    public void testNonBearerAuthorizationHeader_FallbackToOAuth2() {
        // When - Make request with non-Bearer Authorization header
        given()
            .header("Authorization", "Basic dXNlcjpwYXNz")
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/health")
            .then()
                .statusCode(200)
                .body("status", is("UP"));
    }

    @Test
    public void testNoAuthentication_Unauthorized() {
        // When - Make request without any authentication
        given()
            .when().get("/v1/health")
            .then()
                .statusCode(401);
    }

    @Test
    @Transactional
    public void testApiKeyAuthentication_LogsSuccessfulAttempt() {
        // Given - Create a valid API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Logging Test Key");
        createDto.setExpirationDays(30);
        
        var createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType("application/json")
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();
        
        String apiKey = createResponse.jsonPath().getString("apiKey");

        // Clear audit logs
        AdminAuditLog.deleteAll();

        // When - Make request with valid API key
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        // Then - Verify audit log was created
        long successLogCount = AdminAuditLog.count("action = ?1", "API_KEY_AUTHENTICATION_SUCCESS");
        assertTrue(successLogCount > 0);
    }

    @Test
    @Transactional
    public void testApiKeyAuthentication_LogsFailedAttempt() {
        // Clear audit logs
        AdminAuditLog.deleteAll();

        // When - Make request with invalid API key
        given()
            .header("Authorization", "Bearer idp_user_invalidkey1234567890ab")
            .when().get("/v1/health")
            .then()
                .statusCode(401);

        // Then - Verify audit log was created
        long failedLogCount = AdminAuditLog.count("action = ?1", "API_KEY_AUTHENTICATION_FAILED");
        assertTrue(failedLogCount > 0);
    }

    @Test
    public void testSystemApiKey_HasAdminRole() {
        // Given - Create a system API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("System Key");
        createDto.setExpirationDays(30);
        
        var createResponse = given()
            .header("X-Auth-Request-Email", "admin@example.com")
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType("application/json")
            .body(createDto)
            .when().post("/v1/api-keys/system")
            .then()
                .statusCode(201)
                .extract().response();
        
        String apiKey = createResponse.jsonPath().getString("apiKey");

        // When - Make request with system API key to admin endpoint
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/api-keys/system")
            .then()
                .statusCode(200);
    }

    @Test
    @Transactional
    public void testUserApiKey_DoesNotHaveAdminRole() {
        // Given - Create a user API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("User Key");
        createDto.setExpirationDays(30);
        
        var createResponse = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType("application/json")
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();
        
        String apiKey = createResponse.jsonPath().getString("apiKey");

        // When - Make request with user API key to admin endpoint
        given()
            .header("Authorization", "Bearer " + apiKey)
            .when().get("/v1/api-keys/system")
            .then()
                .statusCode(403); // Forbidden
    }

    private void assertNotNull(Object obj) {
        if (obj == null) {
            throw new AssertionError("Expected non-null value");
        }
    }

    private void assertTrue(boolean condition) {
        if (!condition) {
            throw new AssertionError("Expected true but was false");
        }
    }
}
