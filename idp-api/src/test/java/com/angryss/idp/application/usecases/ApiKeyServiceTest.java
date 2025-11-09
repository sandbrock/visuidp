package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.ApiKeyCreateDto;
import com.angryss.idp.application.dtos.ApiKeyCreatedDto;
import com.angryss.idp.domain.entities.AdminAuditLog;
import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mindrot.jbcrypt.BCrypt;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for ApiKeyService.
 * Focuses on key generation, storage, and validation logic.
 * Note: These tests run without authentication context, so they test the core logic
 * but may not fully test authorization aspects.
 */
@QuarkusTest
class ApiKeyServiceTest {

    @Inject
    ApiKeyService apiKeyService;

    @BeforeEach
    @Transactional
    void cleanup() {
        // Clean up test data
        AdminAuditLog.deleteAll();
        ApiKey.deleteAll();
    }

    @Test
    @Transactional
    void testCreateUserApiKey_Success() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Test User Key");
        createDto.setExpirationDays(30);

        // When
        ApiKeyCreatedDto result = apiKeyService.createUserApiKey(createDto);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals("Test User Key", result.getKeyName());
        assertEquals(ApiKeyType.USER, result.getKeyType());
        assertNotNull(result.getUserEmail()); // Will be "anonymous" without auth context
        assertNotNull(result.getCreatedByEmail());
        assertNotNull(result.getApiKey());
        assertTrue(result.getApiKey().startsWith("idp_user_"));
        assertNotNull(result.getExpiresAt());
        assertEquals("ACTIVE", result.getStatus());
        assertTrue(result.getIsActive());

        // Verify key is stored as hash
        ApiKey storedKey = ApiKey.findById(result.getId());
        assertNotNull(storedKey);
        assertNotEquals(result.getApiKey(), storedKey.keyHash);
        assertTrue(BCrypt.checkpw(result.getApiKey(), storedKey.keyHash));
    }

    // Note: testCreateSystemApiKey_Success is not included because it requires admin role
    // which cannot be easily mocked in unit tests. This will be tested in integration tests.

    @Test
    @Transactional
    void testCreateUserApiKey_DefaultExpiration() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Test Key with Default Expiration");
        // Not setting expirationDays to test default

        // When
        ApiKeyCreatedDto result = apiKeyService.createUserApiKey(createDto);

        // Then
        assertNotNull(result);
        assertNotNull(result.getExpiresAt());
        // Default is 90 days, verify it's approximately correct
        assertTrue(result.getExpiresAt().isAfter(result.getCreatedAt().plusDays(89)));
        assertTrue(result.getExpiresAt().isBefore(result.getCreatedAt().plusDays(91)));
    }

    @Test
    @Transactional
    void testCreateUserApiKey_DuplicateName() {
        // Given
        ApiKeyCreateDto createDto1 = new ApiKeyCreateDto();
        createDto1.setKeyName("Duplicate Key Name");
        createDto1.setExpirationDays(30);

        ApiKeyCreateDto createDto2 = new ApiKeyCreateDto();
        createDto2.setKeyName("Duplicate Key Name");
        createDto2.setExpirationDays(30);

        // When
        apiKeyService.createUserApiKey(createDto1);

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.createUserApiKey(createDto2)
        );
        assertTrue(exception.getMessage().contains("already exists"));
    }

    @Test
    @Transactional
    void testCreateUserApiKey_InvalidExpirationTooLow() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Invalid Expiration Key");
        createDto.setExpirationDays(0);

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.createUserApiKey(createDto)
        );
        assertTrue(exception.getMessage().contains("between 1 and 365 days"));
    }

    @Test
    @Transactional
    void testCreateUserApiKey_InvalidExpirationTooHigh() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Invalid Expiration Key");
        createDto.setExpirationDays(366);

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.createUserApiKey(createDto)
        );
        assertTrue(exception.getMessage().contains("between 1 and 365 days"));
    }

    @Test
    @Transactional
    void testCreateUserApiKey_BlankKeyName() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("");
        createDto.setExpirationDays(30);

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.createUserApiKey(createDto)
        );
        assertTrue(exception.getMessage().contains("Key name is required"));
    }

    @Test
    @Transactional
    void testGeneratedKeyFormat_User() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Format Test Key");
        createDto.setExpirationDays(30);

        // When
        ApiKeyCreatedDto result = apiKeyService.createUserApiKey(createDto);

        // Then
        String apiKey = result.getApiKey();
        assertTrue(apiKey.startsWith("idp_user_"));
        // Total length should be prefix (9) + random part (32) = 41
        assertEquals(41, apiKey.length());
        // Verify random part is Base62 (alphanumeric)
        String randomPart = apiKey.substring(9);
        assertTrue(randomPart.matches("[0-9A-Za-z]+"));
    }

    // Note: testGeneratedKeyFormat_System is not included because it requires admin role
    // which cannot be easily mocked in unit tests. This will be tested in integration tests.

    @Test
    @Transactional
    void testKeyPrefixStoredCorrectly() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Prefix Test Key");
        createDto.setExpirationDays(30);

        // When
        ApiKeyCreatedDto result = apiKeyService.createUserApiKey(createDto);

        // Then
        ApiKey storedKey = ApiKey.findById(result.getId());
        assertNotNull(storedKey.keyPrefix);
        assertTrue(storedKey.keyPrefix.startsWith("idp_user_"));
        // Prefix should be first 20 characters or less
        assertTrue(storedKey.keyPrefix.length() <= 20);
    }

    @Test
    @Transactional
    void testRevokeApiKey_Success() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Key to Revoke");
        createDto.setExpirationDays(30);
        ApiKeyCreatedDto createdKey = apiKeyService.createUserApiKey(createDto);

        // When
        apiKeyService.revokeApiKey(createdKey.getId());

        // Then
        ApiKey revokedKey = ApiKey.findById(createdKey.getId());
        assertNotNull(revokedKey);
        assertFalse(revokedKey.isActive);
        assertNotNull(revokedKey.revokedAt);
        assertNotNull(revokedKey.revokedByEmail);
        assertEquals("REVOKED", revokedKey.getStatus());
        assertFalse(revokedKey.isValid());
    }

    @Test
    @Transactional
    void testRevokeApiKey_NotFound() {
        // Given
        java.util.UUID nonExistentId = java.util.UUID.randomUUID();

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.revokeApiKey(nonExistentId)
        );
        assertTrue(exception.getMessage().contains("not found"));
    }

    @Test
    @Transactional
    void testRotateApiKey_Success() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Key to Rotate");
        createDto.setExpirationDays(30);
        ApiKeyCreatedDto originalKey = apiKeyService.createUserApiKey(createDto);

        // When
        ApiKeyCreatedDto rotatedKey = apiKeyService.rotateApiKey(originalKey.getId());

        // Then
        assertNotNull(rotatedKey);
        assertNotNull(rotatedKey.getId());
        assertNotEquals(originalKey.getId(), rotatedKey.getId());
        assertEquals(originalKey.getKeyName(), rotatedKey.getKeyName());
        assertEquals(originalKey.getKeyType(), rotatedKey.getKeyType());
        assertEquals(originalKey.getUserEmail(), rotatedKey.getUserEmail());
        assertNotNull(rotatedKey.getApiKey());
        assertNotEquals(originalKey.getApiKey(), rotatedKey.getApiKey());
        assertTrue(rotatedKey.getApiKey().startsWith("idp_user_"));

        // Verify old key still exists and is active (grace period)
        ApiKey oldKey = ApiKey.findById(originalKey.getId());
        assertNotNull(oldKey);
        assertTrue(oldKey.isActive);
        assertNull(oldKey.revokedAt);

        // Verify new key is stored correctly
        ApiKey newKey = ApiKey.findById(rotatedKey.getId());
        assertNotNull(newKey);
        assertTrue(newKey.isActive);
        assertTrue(BCrypt.checkpw(rotatedKey.getApiKey(), newKey.keyHash));
    }

    @Test
    @Transactional
    void testRotateApiKey_NotFound() {
        // Given
        java.util.UUID nonExistentId = java.util.UUID.randomUUID();

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.rotateApiKey(nonExistentId)
        );
        assertTrue(exception.getMessage().contains("not found"));
    }

    @Test
    @Transactional
    void testRotateApiKey_AlreadyRevoked() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Revoked Key");
        createDto.setExpirationDays(30);
        ApiKeyCreatedDto createdKey = apiKeyService.createUserApiKey(createDto);
        apiKeyService.revokeApiKey(createdKey.getId());

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.rotateApiKey(createdKey.getId())
        );
        assertTrue(exception.getMessage().contains("revoked"));
    }

    @Test
    @Transactional
    void testUpdateApiKeyName_Success() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Original Name");
        createDto.setExpirationDays(30);
        ApiKeyCreatedDto createdKey = apiKeyService.createUserApiKey(createDto);

        // When
        var updatedKey = apiKeyService.updateApiKeyName(createdKey.getId(), "Updated Name");

        // Then
        assertNotNull(updatedKey);
        assertEquals("Updated Name", updatedKey.getKeyName());
        assertEquals(createdKey.getId(), updatedKey.getId());

        // Verify in database
        ApiKey storedKey = ApiKey.findById(createdKey.getId());
        assertEquals("Updated Name", storedKey.keyName);
    }

    @Test
    @Transactional
    void testUpdateApiKeyName_NotFound() {
        // Given
        java.util.UUID nonExistentId = java.util.UUID.randomUUID();

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.updateApiKeyName(nonExistentId, "New Name")
        );
        assertTrue(exception.getMessage().contains("not found"));
    }

    @Test
    @Transactional
    void testUpdateApiKeyName_BlankName() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Original Name");
        createDto.setExpirationDays(30);
        ApiKeyCreatedDto createdKey = apiKeyService.createUserApiKey(createDto);

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.updateApiKeyName(createdKey.getId(), "")
        );
        assertTrue(exception.getMessage().contains("required"));
    }

    @Test
    @Transactional
    void testUpdateApiKeyName_TooLong() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Original Name");
        createDto.setExpirationDays(30);
        ApiKeyCreatedDto createdKey = apiKeyService.createUserApiKey(createDto);
        String longName = "a".repeat(101);

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.updateApiKeyName(createdKey.getId(), longName)
        );
        assertTrue(exception.getMessage().contains("100 characters"));
    }

    @Test
    @Transactional
    void testUpdateApiKeyName_DuplicateName() {
        // Given
        ApiKeyCreateDto createDto1 = new ApiKeyCreateDto();
        createDto1.setKeyName("First Key");
        createDto1.setExpirationDays(30);
        apiKeyService.createUserApiKey(createDto1);

        ApiKeyCreateDto createDto2 = new ApiKeyCreateDto();
        createDto2.setKeyName("Second Key");
        createDto2.setExpirationDays(30);
        ApiKeyCreatedDto secondKey = apiKeyService.createUserApiKey(createDto2);

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.updateApiKeyName(secondKey.getId(), "First Key")
        );
        assertTrue(exception.getMessage().contains("already exists"));
    }

    @Test
    @Transactional
    void testListUserApiKeys_Success() {
        // Given - Create multiple keys for the current user
        ApiKeyCreateDto createDto1 = new ApiKeyCreateDto();
        createDto1.setKeyName("User Key 1");
        createDto1.setExpirationDays(30);
        apiKeyService.createUserApiKey(createDto1);

        ApiKeyCreateDto createDto2 = new ApiKeyCreateDto();
        createDto2.setKeyName("User Key 2");
        createDto2.setExpirationDays(60);
        apiKeyService.createUserApiKey(createDto2);

        // When
        var userKeys = apiKeyService.listUserApiKeys();

        // Then
        assertNotNull(userKeys);
        assertEquals(2, userKeys.size());
        assertTrue(userKeys.stream().anyMatch(k -> k.getKeyName().equals("User Key 1")));
        assertTrue(userKeys.stream().anyMatch(k -> k.getKeyName().equals("User Key 2")));
        // Verify keys are ordered by creation date descending (most recent first)
        assertTrue(userKeys.get(0).getCreatedAt().isAfter(userKeys.get(1).getCreatedAt()) ||
                   userKeys.get(0).getCreatedAt().isEqual(userKeys.get(1).getCreatedAt()));
    }

    @Test
    @Transactional
    void testListUserApiKeys_EmptyList() {
        // When - No keys created
        var userKeys = apiKeyService.listUserApiKeys();

        // Then
        assertNotNull(userKeys);
        assertTrue(userKeys.isEmpty());
    }

    // Note: testListAllApiKeys is not included because it requires admin role
    // which cannot be easily mocked in unit tests. This will be tested in integration tests.

    @Test
    @Transactional
    void testGetApiKeyById_Success() {
        // Given
        ApiKeyCreateDto createDto = new ApiKeyCreateDto();
        createDto.setKeyName("Test Key");
        createDto.setExpirationDays(30);
        ApiKeyCreatedDto createdKey = apiKeyService.createUserApiKey(createDto);

        // When
        var retrievedKey = apiKeyService.getApiKeyById(createdKey.getId());

        // Then
        assertNotNull(retrievedKey);
        assertEquals(createdKey.getId(), retrievedKey.getId());
        assertEquals("Test Key", retrievedKey.getKeyName());
        assertEquals(ApiKeyType.USER, retrievedKey.getKeyType());
        assertNotNull(retrievedKey.getCreatedAt());
        assertNotNull(retrievedKey.getExpiresAt());
    }

    @Test
    @Transactional
    void testGetApiKeyById_NotFound() {
        // Given
        java.util.UUID nonExistentId = java.util.UUID.randomUUID();

        // Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> apiKeyService.getApiKeyById(nonExistentId)
        );
        assertTrue(exception.getMessage().contains("not found"));
    }

    // Note: testGetApiKeyAuditLogs is not included because it requires admin role
    // which cannot be easily mocked in unit tests. This will be tested in integration tests.
}
