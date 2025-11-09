package com.angryss.idp.infrastructure.security;

import com.angryss.idp.application.dtos.ApiKeyCreateDto;
import com.angryss.idp.application.usecases.ApiKeyService;
import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.entities.ApiKey;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mindrot.jbcrypt.BCrypt;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Security-focused tests for API key functionality.
 * Tests hash storage, authorization, and security boundaries.
 */
@QuarkusTest
public class ApiKeySecurityTest {

    private static final String TEST_USER = "securitytest@example.com";
    private static final String OTHER_USER = "otheruser@example.com";
    private static final String TEST_ADMIN = "admin@example.com";
    private static final String TEST_GROUPS = "Users";
    private static final String ADMIN_GROUPS = "Admins";

    @Inject
    ApiKeyService apiKeyService;

    @BeforeEach
    @Transactional
    public void cleanup() {
        AdminAuditLog.deleteAll();
        ApiKey.deleteAll();
    }

    // ========== Hash Storage Tests ==========

    @Test
    @Transactional
    public void testApiKeyStoredAsHash_NeverPlaintext() {
        // Given - Create an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Hash Test Key");
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
        
        String plaintextKey = createResponse.jsonPath().getString("apiKey");
        String keyId = createResponse.jsonPath().getString("id");

        // When - Retrieve from database
        ApiKey storedKey = ApiKey.findById(java.util.UUID.fromString(keyId));

        // Then - Verify key is hashed, not plaintext
        assertNotNull(storedKey);
        assertNotNull(storedKey.keyHash);
        assertNotEquals(plaintextKey, storedKey.keyHash);
        
        // Verify it's a BCrypt hash (starts with $2a$ or $2b$)
        assertTrue(storedKey.keyHash.startsWith("$2a$") || storedKey.keyHash.startsWith("$2b$"));
        
        // Verify hash can be verified
        assertTrue(BCrypt.checkpw(plaintextKey, storedKey.keyHash));
    }

    @Test
    @Transactional
    public void testApiKeyHashIsUnique() {
        // Given - Create two API keys
        ApiKeyCreateDto createDto1 = new ApiKeyCreateDto();
        createDto1.setKeyName("Key 1");
        createDto1.setExpirationDays(30);
        
        var response1 = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType("application/json")
            .body(createDto1)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();

        ApiKeyCreateDto createDto2 = new ApiKeyCreateDto();
        createDto2.setKeyName("Key 2");
        createDto2.setExpirationDays(30);
        
        var response2 = given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType("application/json")
            .body(createDto2)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201)
                .extract().response();

        // When - Retrieve from database
        ApiKey storedKey1 = ApiKey.findById(java.util.UUID.fromString(response1.jsonPath().getString("id")));
        ApiKey storedKey2 = ApiKey.findById(java.util.UUID.fromString(response2.jsonPath().getString("id")));

        // Then - Verify hashes are different
        assertNotEquals(storedKey1.keyHash, storedKey2.keyHash);
    }

    @Test
    @Transactional
    public void testApiKeyNotReturnedInListEndpoint() {
        // Given - Create an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("List Test Key");
        createDto.setExpirationDays(30);
        
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType("application/json")
            .body(createDto)
            .when().post("/v1/api-keys/user")
            .then()
                .statusCode(201);

        // When - List API keys
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/user")
            .then()
                .statusCode(200)
                // Verify apiKey field is not present in response
                .body("[0].apiKey", nullValue());
    }

    @Test
    @Transactional
    public void testApiKeyNotReturnedInGetEndpoint() {
        // Given - Create an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Get Test Key");
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
        
        String keyId = createResponse.jsonPath().getString("id");

        // When - Get specific API key
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/" + keyId)
            .then()
                .statusCode(200)
                // Verify apiKey field is not present in response
                .body("apiKey", nullValue());
    }

    // ========== Authorization Tests ==========

    @Test
    
    @Transactional
    public void testUserCanOnlyAccessOwnKeys() {
        // Given - Create keys for different users
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("User 1 Key");
        createDto.setExpirationDays(30);
        var userKey = apiKeyService.createUserApiKey(createDto);

        // Create key for other user directly in database
        ApiKey otherUserKey = new ApiKey();
        otherUserKey.keyName = "Other User Key";
        otherUserKey.keyHash = "$2a$12$test";
        otherUserKey.keyPrefix = "idp_user_other";
        otherUserKey.keyType = com.angryss.idp.domain.valueobjects.ApiKeyType.USER;
        otherUserKey.userEmail = OTHER_USER;
        otherUserKey.createdByEmail = OTHER_USER;
        otherUserKey.createdAt = java.time.LocalDateTime.now();
        otherUserKey.expiresAt = java.time.LocalDateTime.now().plusDays(30);
        otherUserKey.isActive = true;
        otherUserKey.persist();

        // When - User lists their keys
        var userKeys = apiKeyService.listUserApiKeys();

        // Then - Only sees their own key
        assertEquals(1, userKeys.size());
        assertEquals(userKey.getId(), userKeys.get(0).getId());
    }

    @Test
    
    @Transactional
    public void testUserCannotAccessOtherUsersKey() {
        // Given - Create key for other user
        ApiKey otherUserKey = new ApiKey();
        otherUserKey.keyName = "Other User Key";
        otherUserKey.keyHash = "$2a$12$test";
        otherUserKey.keyPrefix = "idp_user_other";
        otherUserKey.keyType = com.angryss.idp.domain.valueobjects.ApiKeyType.USER;
        otherUserKey.userEmail = OTHER_USER;
        otherUserKey.createdByEmail = OTHER_USER;
        otherUserKey.createdAt = java.time.LocalDateTime.now();
        otherUserKey.expiresAt = java.time.LocalDateTime.now().plusDays(30);
        otherUserKey.isActive = true;
        otherUserKey.persist();

        // When - User tries to access other user's key
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/" + otherUserKey.id)
            .then()
                .statusCode(403);
    }

    @Test
    
    @Transactional
    public void testUserCannotRevokeOtherUsersKey() {
        // Given - Create key for other user
        ApiKey otherUserKey = new ApiKey();
        otherUserKey.keyName = "Other User Key";
        otherUserKey.keyHash = "$2a$12$test";
        otherUserKey.keyPrefix = "idp_user_other";
        otherUserKey.keyType = com.angryss.idp.domain.valueobjects.ApiKeyType.USER;
        otherUserKey.userEmail = OTHER_USER;
        otherUserKey.createdByEmail = OTHER_USER;
        otherUserKey.createdAt = java.time.LocalDateTime.now();
        otherUserKey.expiresAt = java.time.LocalDateTime.now().plusDays(30);
        otherUserKey.isActive = true;
        otherUserKey.persist();

        // When - User tries to revoke other user's key
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().delete("/v1/api-keys/" + otherUserKey.id)
            .then()
                .statusCode(403);

        // Verify key is still active
        ApiKey stillActiveKey = ApiKey.findById(otherUserKey.id);
        assertTrue(stillActiveKey.isActive);
    }

    @Test
    
    @Transactional
    public void testUserCannotRotateOtherUsersKey() {
        // Given - Create key for other user
        ApiKey otherUserKey = new ApiKey();
        otherUserKey.keyName = "Other User Key";
        otherUserKey.keyHash = "$2a$12$test";
        otherUserKey.keyPrefix = "idp_user_other";
        otherUserKey.keyType = com.angryss.idp.domain.valueobjects.ApiKeyType.USER;
        otherUserKey.userEmail = OTHER_USER;
        otherUserKey.createdByEmail = OTHER_USER;
        otherUserKey.createdAt = java.time.LocalDateTime.now();
        otherUserKey.expiresAt = java.time.LocalDateTime.now().plusDays(30);
        otherUserKey.isActive = true;
        otherUserKey.persist();

        // When - User tries to rotate other user's key
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().post("/v1/api-keys/" + otherUserKey.id + "/rotate")
            .then()
                .statusCode(403);
    }

    @Test
    
    @Transactional
    public void testAdminCanAccessAllKeys() {
        // Given - Create keys for different users
        ApiKey userKey = new ApiKey();
        userKey.keyName = "User Key";
        userKey.keyHash = "$2a$12$test";
        userKey.keyPrefix = "idp_user_test";
        userKey.keyType = com.angryss.idp.domain.valueobjects.ApiKeyType.USER;
        userKey.userEmail = TEST_USER;
        userKey.createdByEmail = TEST_USER;
        userKey.createdAt = java.time.LocalDateTime.now();
        userKey.expiresAt = java.time.LocalDateTime.now().plusDays(30);
        userKey.isActive = true;
        userKey.persist();

        // When - Admin lists all keys
        var allKeys = apiKeyService.listAllApiKeys();

        // Then - Admin sees all keys
        assertTrue(allKeys.size() >= 1);
    }

    @Test
    public void testNonAdminCannotAccessAllKeysEndpoint() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/all")
            .then()
                .statusCode(403);
    }

    @Test
    public void testNonAdminCannotCreateSystemKey() {
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("System Key");
        createDto.setExpirationDays(90);

        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .contentType("application/json")
            .body(createDto)
            .when().post("/v1/api-keys/system")
            .then()
                .statusCode(403);
    }

    @Test
    public void testNonAdminCannotAccessAuditLogs() {
        given()
            .header("X-Auth-Request-Email", TEST_USER)
            .header("X-Auth-Request-Groups", TEST_GROUPS)
            .when().get("/v1/api-keys/audit-logs")
            .then()
                .statusCode(403);
    }

    // ========== Failed Authentication Logging Tests ==========

    @Test
    @Transactional
    public void testFailedAuthenticationIsLogged() {
        // Clear audit logs
        AdminAuditLog.deleteAll();

        // When - Attempt authentication with invalid key
        given()
            .header("Authorization", "Bearer idp_user_invalidkey1234567890ab")
            .when().get("/v1/health")
            .then()
                .statusCode(401);

        // Then - Verify failed attempt is logged
        List<AdminAuditLog> failedLogs = AdminAuditLog.find("action", "API_KEY_AUTHENTICATION_FAILED").list();
        assertTrue(failedLogs.size() > 0);
        
        AdminAuditLog log = failedLogs.get(0);
        assertEquals("anonymous", log.getUserEmail());
        assertTrue(log.getChanges().containsKey("key_prefix"));
        assertTrue(log.getChanges().containsKey("source_ip"));
        assertTrue(log.getChanges().containsKey("reason"));
    }

    @Test
    
    @Transactional
    public void testSuccessfulAuthenticationIsLogged() {
        // Given - Create an API key
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Logging Test Key");
        createDto.setExpirationDays(30);
        var createdKey = apiKeyService.createUserApiKey(createDto);

        // Clear audit logs
        AdminAuditLog.deleteAll();

        // When - Authenticate with valid key
        given()
            .header("Authorization", "Bearer " + createdKey.getApiKey())
            .when().get("/v1/health")
            .then()
                .statusCode(200);

        // Then - Verify successful authentication is logged
        List<AdminAuditLog> successLogs = AdminAuditLog.find("action", "API_KEY_AUTHENTICATION_SUCCESS").list();
        assertTrue(successLogs.size() > 0);
        
        AdminAuditLog log = successLogs.get(0);
        assertEquals(TEST_USER, log.getUserEmail());
        assertTrue(log.getChanges().containsKey("key_id"));
        assertTrue(log.getChanges().containsKey("key_prefix"));
        assertTrue(log.getChanges().containsKey("source_ip"));
    }

    @Test
    @Transactional
    public void testMultipleFailedAttemptsAreLogged() {
        // Clear audit logs
        AdminAuditLog.deleteAll();

        // When - Make multiple failed authentication attempts
        for (int i = 0; i < 5; i++) {
            given()
                .header("Authorization", "Bearer idp_user_invalid" + i + "234567890ab")
                .when().get("/v1/health")
                .then()
                    .statusCode(401);
        }

        // Then - Verify all attempts are logged
        List<AdminAuditLog> failedLogs = AdminAuditLog.find("action", "API_KEY_AUTHENTICATION_FAILED").list();
        assertTrue(failedLogs.size() >= 5);
    }

    // ========== Helper Methods ==========

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

    private void assertNotEquals(Object obj1, Object obj2) {
        if (obj1 == null && obj2 == null) {
            throw new AssertionError("Expected objects to be different but both were null");
        }
        if (obj1 != null && obj1.equals(obj2)) {
            throw new AssertionError("Expected objects to be different but they were equal");
        }
    }

    private void assertEquals(Object expected, Object actual) {
        if (expected == null && actual == null) {
            return;
        }
        if (expected == null || !expected.equals(actual)) {
            throw new AssertionError("Expected " + expected + " but got " + actual);
        }
    }
}
