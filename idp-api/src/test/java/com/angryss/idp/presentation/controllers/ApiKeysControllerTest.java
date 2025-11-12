package com.angryss.idp.presentation.controllers;

import com.angryss.idp.application.dtos.ApiKeyCreateDto;
import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Integration tests for ApiKeysController.
 * Tests all REST endpoints for API key management including create, list, get,
 * rotate, revoke, update name, and audit logs.
 */
@QuarkusTest
public class ApiKeysControllerTest {

    private static final String TEST_USER = "testuser@example.com";
    private static final String TEST_ADMIN = "admin@example.com";
    private static final String TEST_GROUPS = "Users";
    private static final String ADMIN_GROUPS = "IDP-Admins";

    @BeforeEach
    @Transactional
    public void cleanup() {
        AdminAuditLog.deleteAll();
        ApiKey.deleteAll();
    }

    // ========== Create User API Key Tests ==========

    @Test
    public void testCreateUserApiKey_Success() {
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Test User Key");
        createDto.setExpirationDays(30);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("keyName", equalTo("Test User Key"))
                .body("keyType", equalTo("USER"))
                .body("userEmail", equalTo(TEST_USER))
                .body("apiKey", notNullValue())
                .body("apiKey", startsWith("idp_user_"))
                .body("status", equalTo("ACTIVE"))
                .body("isActive", equalTo(true));
    }

    @Test
    public void testCreateUserApiKey_DefaultExpiration() {
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Default Expiration Key");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .body("expiresAt", notNullValue());
    }

    @Test
    public void testCreateUserApiKey_DuplicateName() {
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Duplicate Key");
        createDto.setExpirationDays(30);

        // Create first key
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201);

        // Try to create second key with same name
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(400);
    }

    @Test
    public void testCreateUserApiKey_InvalidExpiration() {
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Invalid Expiration Key");
        createDto.setExpirationDays(400); // Too high

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(400);
    }

    @Test
    public void testCreateUserApiKey_Unauthenticated() {
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Test Key");
        createDto.setExpirationDays(30);

        given()
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(401);
    }

    // ========== Create System API Key Tests ==========

    @Test
    public void testCreateSystemApiKey_Success() {
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Test System Key");
        createDto.setExpirationDays(90);

        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/system")
            .then()
                .statusCode(201)
                .body("id", notNullValue())
                .body("keyName", equalTo("Test System Key"))
                .body("keyType", equalTo("SYSTEM"))
                .body("userEmail", nullValue())
                .body("apiKey", notNullValue())
                .body("apiKey", startsWith("idp_system_"))
                .body("status", equalTo("ACTIVE"));
    }

    @Test
    public void testCreateSystemApiKey_NonAdmin_Forbidden() {
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("System Key");
        createDto.setExpirationDays(90);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(createDto)
            .when().post("/v1/api-keys/system")
            .then()
                .statusCode(403);
    }

    // ========== List User API Keys Tests ==========

    @Test
    public void testListUserApiKeys_Success() {
        // Create test keys
        createTestUserKey(TEST_USER, "User Key 1");
        createTestUserKey(TEST_USER, "User Key 2");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(200)
                .body("$", hasSize(2))
                .body("keyName", hasItems("User Key 1", "User Key 2"))
                .body("[0].apiKey", nullValue()) // API key value should not be returned
                .body("[1].apiKey", nullValue());
    }

    @Test
    public void testListUserApiKeys_OnlyOwnKeys() {
        // Create keys for different users
        createTestUserKey(TEST_USER, "User 1 Key");
        createTestUserKey("otheruser@example.com", "User 2 Key");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(200)
                .body("$", hasSize(1))
                .body("[0].keyName", equalTo("User 1 Key"));
    }

    @Test
    public void testListUserApiKeys_EmptyList() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(200)
                .body("$", hasSize(0));
    }

    @Test
    public void testListUserApiKeys_Unauthenticated() {
        given()
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(401);
    }

    // ========== List System API Keys Tests ==========

    @Test
    public void testListSystemApiKeys_Success() {
        // Create keys for different users and system
        createTestUserKey(TEST_USER, "User Key 1");
        createTestUserKey("otheruser@example.com", "User Key 2");
        createTestSystemKey("System Key 1");
        createTestSystemKey("System Key 2");

        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/api-keys/system")
            .then()
                .statusCode(200)
                .body("$", hasSize(2))
                .body("keyName", hasItems("System Key 1", "System Key 2"))
                .body("keyType", everyItem(equalTo("SYSTEM")));
    }

    @Test
    public void testListSystemApiKeys_NonAdmin_Forbidden() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/system")
            .then()
                .statusCode(403);
    }

    // ========== Get API Key By ID Tests ==========

    @Test
    public void testGetApiKeyById_Success() {
        UUID keyId = createTestUserKey(TEST_USER, "Test Key");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/" + keyId)
            .then()
                .statusCode(200)
                .body("id", equalTo(keyId.toString()))
                .body("keyName", equalTo("Test Key"))
                .body("apiKey", nullValue()); // API key value should not be returned
    }

    @Test
    public void testGetApiKeyById_NotFound() {
        UUID nonExistentId = UUID.randomUUID();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/" + nonExistentId)
            .then()
                .statusCode(404);
    }

    @Test
    public void testGetApiKeyById_OtherUsersKey_Forbidden() {
        UUID keyId = createTestUserKey("otheruser@example.com", "Other User Key");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/" + keyId)
            .then()
                .statusCode(403);
    }

    @Test
    public void testGetApiKeyById_Admin_CanAccessAnyKey() {
        UUID keyId = createTestUserKey(TEST_USER, "User Key");

        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/api-keys/" + keyId)
            .then()
                .statusCode(200)
                .body("id", equalTo(keyId.toString()));
    }

    // ========== Rotate API Key Tests ==========

    @Test
    public void testRotateApiKey_Success() {
        UUID originalKeyId = createTestUserKey(TEST_USER, "Key to Rotate");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().post("/v1/api-keys/" + originalKeyId + "/rotate")
            .then()
                .statusCode(200)
                .body("id", not(equalTo(originalKeyId.toString())))
                .body("keyName", equalTo("Key to Rotate"))
                .body("apiKey", notNullValue())
                .body("apiKey", startsWith("idp_user_"));

        // Verify original key still exists and is active (grace period)
        ApiKey originalKey = ApiKey.findById(originalKeyId);
        assertNotNull(originalKey);
        assertTrue(originalKey.isActive);
    }

    @Test
    public void testRotateApiKey_NotFound() {
        UUID nonExistentId = UUID.randomUUID();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().post("/v1/api-keys/" + nonExistentId + "/rotate")
            .then()
                .statusCode(400);
    }

    @Test
    public void testRotateApiKey_OtherUsersKey_Forbidden() {
        UUID keyId = createTestUserKey("otheruser@example.com", "Other User Key");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().post("/v1/api-keys/" + keyId + "/rotate")
            .then()
                .statusCode(403);
    }

    @Test
    public void testRotateApiKey_RevokedKey_BadRequest() {
        UUID keyId = createTestUserKey(TEST_USER, "Revoked Key");
        
        // Revoke the key in a separate transaction
        revokeTestKey(keyId);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().post("/v1/api-keys/" + keyId + "/rotate")
            .then()
                .statusCode(400);
    }

    // ========== Revoke API Key Tests ==========

    @Test
    public void testRevokeApiKey_Success() {
        UUID keyId = createTestUserKey(TEST_USER, "Key to Revoke");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + keyId)
            .then()
                .statusCode(204);

        // Verify key is revoked
        ApiKey revokedKey = ApiKey.findById(keyId);
        assertNotNull(revokedKey);
        assertFalse(revokedKey.isActive);
        assertNotNull(revokedKey.revokedAt);
    }

    @Test
    public void testRevokeApiKey_NotFound() {
        UUID nonExistentId = UUID.randomUUID();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + nonExistentId)
            .then()
                .statusCode(404);
    }

    @Test
    public void testRevokeApiKey_OtherUsersKey_Forbidden() {
        UUID keyId = createTestUserKey("otheruser@example.com", "Other User Key");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + keyId)
            .then()
                .statusCode(403);
    }

    @Test
    public void testRevokeApiKey_Admin_CanRevokeAnyKey() {
        UUID keyId = createTestUserKey(TEST_USER, "User Key");

        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().delete("/v1/api-keys/" + keyId)
            .then()
                .statusCode(204);
    }

    // ========== Update API Key Name Tests ==========

    @Test
    public void testUpdateApiKeyName_Success() {
        UUID keyId = createTestUserKey(TEST_USER, "Original Name");

        Map<String, String> body = Map.of("keyName", "Updated Name");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(body)
            .when().put("/v1/api-keys/" + keyId + "/name")
            .then()
                .statusCode(200)
                .body("id", equalTo(keyId.toString()))
                .body("keyName", equalTo("Updated Name"));
    }

    @Test
    public void testUpdateApiKeyName_NotFound() {
        UUID nonExistentId = UUID.randomUUID();
        Map<String, String> body = Map.of("keyName", "New Name");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(body)
            .when().put("/v1/api-keys/" + nonExistentId + "/name")
            .then()
                .statusCode(400);
    }

    @Test
    public void testUpdateApiKeyName_DuplicateName() {
        createTestUserKey(TEST_USER, "Existing Name");
        UUID keyId = createTestUserKey(TEST_USER, "Original Name");

        Map<String, String> body = Map.of("keyName", "Existing Name");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(body)
            .when().put("/v1/api-keys/" + keyId + "/name")
            .then()
                .statusCode(400);
    }

    @Test
    public void testUpdateApiKeyName_OtherUsersKey_Forbidden() {
        UUID keyId = createTestUserKey("otheruser@example.com", "Other User Key");
        Map<String, String> body = Map.of("keyName", "New Name");

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(body)
            .when().put("/v1/api-keys/" + keyId + "/name")
            .then()
                .statusCode(403);
    }

    @Test
    public void testUpdateApiKeyName_MissingKeyName() {
        UUID keyId = createTestUserKey(TEST_USER, "Test Key");
        Map<String, String> body = Map.of();

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType(ContentType.JSON)
            .body(body)
            .when().put("/v1/api-keys/" + keyId + "/name")
            .then()
                .statusCode(400);
    }

    // ========== Get Audit Logs Tests ==========

    @Test
    public void testGetAuditLogs_Success() {
        // Create some audit logs
        createTestAuditLog(TEST_USER, "API_KEY_CREATED");
        createTestAuditLog(TEST_USER, "API_KEY_AUTHENTICATION_SUCCESS");

        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .when().get("/v1/api-keys/audit-logs")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(2)));
    }

    @Test
    public void testGetAuditLogs_FilterByUserEmail() {
        createTestAuditLog(TEST_USER, "API_KEY_CREATED");
        createTestAuditLog("otheruser@example.com", "API_KEY_CREATED");

        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("userEmail", TEST_USER)
            .when().get("/v1/api-keys/audit-logs")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)))
                .body("[0].userEmail", equalTo(TEST_USER));
    }

    @Test
    public void testGetAuditLogs_FilterByDateRange() {
        LocalDateTime now = LocalDateTime.now();
        String startDate = now.minusDays(1).format(DateTimeFormatter.ISO_DATE_TIME);
        String endDate = now.plusDays(1).format(DateTimeFormatter.ISO_DATE_TIME);

        createTestAuditLog(TEST_USER, "API_KEY_CREATED");

        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("startDate", startDate)
            .queryParam("endDate", endDate)
            .when().get("/v1/api-keys/audit-logs")
            .then()
                .statusCode(200)
                .body("$", hasSize(greaterThanOrEqualTo(1)));
    }

    @Test
    public void testGetAuditLogs_NonAdmin_Forbidden() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/audit-logs")
            .then()
                .statusCode(403);
    }

    @Test
    public void testGetAuditLogs_InvalidDateFormat() {
        given()
            .header("X-Auth-Request-Email", TEST_ADMIN)
            .header("X-Auth-Request-Groups", ADMIN_GROUPS)
            .queryParam("startDate", "invalid-date")
            .when().get("/v1/api-keys/audit-logs")
            .then()
                .statusCode(400);
    }

    // ========== Helper Methods ==========

    @Transactional
    UUID createTestUserKey(String userEmail, String keyName) {
        ApiKey key = new ApiKey();
        key.keyName = keyName;
        // Use a unique hash for each test key to avoid constraint violations
        // BCrypt hash format: $2a$12$[22 char salt][31 char hash] = 60 chars total
        String uniquePart = UUID.randomUUID().toString().replace("-", "");
        key.keyHash = "$2a$12$" + uniquePart + uniquePart.substring(0, 21); // 7 + 32 + 21 = 60 chars
        key.keyPrefix = "idp_user_test";
        key.keyType = ApiKeyType.USER;
        key.userEmail = userEmail;
        key.createdByEmail = userEmail;
        key.createdAt = LocalDateTime.now();
        key.expiresAt = LocalDateTime.now().plusDays(30);
        key.isActive = true;
        key.persist();
        return key.id;
    }

    @Transactional
    UUID createTestSystemKey(String keyName) {
        ApiKey key = new ApiKey();
        key.keyName = keyName;
        // Use a unique hash for each test key to avoid constraint violations
        // BCrypt hash format: $2a$12$[22 char salt][31 char hash] = 60 chars total
        String uniquePart = UUID.randomUUID().toString().replace("-", "");
        key.keyHash = "$2a$12$" + uniquePart + uniquePart.substring(0, 21); // 7 + 32 + 21 = 60 chars
        key.keyPrefix = "idp_system_test";
        key.keyType = ApiKeyType.SYSTEM;
        key.userEmail = null;
        key.createdByEmail = TEST_ADMIN;
        key.createdAt = LocalDateTime.now();
        key.expiresAt = LocalDateTime.now().plusDays(90);
        key.isActive = true;
        key.persist();
        return key.id;
    }

    @Transactional
    void createTestAuditLog(String userEmail, String action) {
        AdminAuditLog log = new AdminAuditLog(
            userEmail,
            action,
            "ApiKey",
            UUID.randomUUID(),
            Map.of("test", "data")
        );
        log.persist();
    }

    @Transactional
    void revokeTestKey(UUID keyId) {
        ApiKey key = ApiKey.findById(keyId);
        if (key != null) {
            key.revoke(TEST_USER);
            key.persist();
        }
    }

    void assertNotNull(Object obj) {
        if (obj == null) {
            throw new AssertionError("Expected non-null value");
        }
    }

    void assertTrue(boolean condition) {
        if (!condition) {
            throw new AssertionError("Expected true but was false");
        }
    }

    void assertFalse(boolean condition) {
        if (condition) {
            throw new AssertionError("Expected false but was true");
        }
    }
}
