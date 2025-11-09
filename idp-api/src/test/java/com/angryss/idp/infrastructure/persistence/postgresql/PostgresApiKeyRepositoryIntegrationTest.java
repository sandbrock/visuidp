package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.repositories.ApiKeyRepository;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PostgresApiKeyRepository.
 * Tests CRUD operations, query methods, and transaction behavior using H2 in-memory database.
 */
@QuarkusTest
class PostgresApiKeyRepositoryIntegrationTest {

    @Inject
    ApiKeyRepository apiKeyRepository;

    private List<UUID> createdApiKeyIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        for (UUID id : createdApiKeyIds) {
            apiKeyRepository.findById(id).ifPresent(apiKey -> apiKeyRepository.delete(apiKey));
        }
        createdApiKeyIds.clear();
    }

    @Test
    void testSaveApiKey_CreatesNewApiKey() {
        // Given
        ApiKey apiKey = createTestApiKey("test-key-save", "user@example.com", ApiKeyType.USER);

        // When
        ApiKey savedApiKey = apiKeyRepository.save(apiKey);

        // Then
        assertNotNull(savedApiKey.id);
        createdApiKeyIds.add(savedApiKey.id);
        assertEquals("test-key-save", savedApiKey.keyName);
        assertEquals("user@example.com", savedApiKey.userEmail);
        assertEquals(ApiKeyType.USER, savedApiKey.keyType);
        assertNotNull(savedApiKey.createdAt);
        assertTrue(savedApiKey.isActive);
    }

    @Test
    void testSaveApiKey_UpdatesExistingApiKey() {
        // Given
        ApiKey apiKey = createTestApiKey("test-key-update", "user@example.com", ApiKeyType.USER);
        ApiKey savedApiKey = apiKeyRepository.save(apiKey);
        createdApiKeyIds.add(savedApiKey.id);

        // When
        savedApiKey.lastUsedAt = LocalDateTime.now();
        savedApiKey.isActive = false;
        ApiKey updatedApiKey = apiKeyRepository.save(savedApiKey);

        // Then
        assertEquals(savedApiKey.id, updatedApiKey.id);
        assertNotNull(updatedApiKey.lastUsedAt);
        assertFalse(updatedApiKey.isActive);
    }

    @Test
    void testFindById_ReturnsApiKeyWhenExists() {
        // Given
        ApiKey apiKey = createTestApiKey("test-key-findbyid", "user@example.com", ApiKeyType.USER);
        ApiKey savedApiKey = apiKeyRepository.save(apiKey);
        createdApiKeyIds.add(savedApiKey.id);

        // When
        Optional<ApiKey> foundApiKey = apiKeyRepository.findById(savedApiKey.id);

        // Then
        assertTrue(foundApiKey.isPresent());
        assertEquals(savedApiKey.id, foundApiKey.get().id);
        assertEquals("test-key-findbyid", foundApiKey.get().keyName);
    }

    @Test
    void testFindById_ReturnsEmptyWhenNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        Optional<ApiKey> foundApiKey = apiKeyRepository.findById(nonExistentId);

        // Then
        assertFalse(foundApiKey.isPresent());
    }

    @Test
    void testFindAll_ReturnsAllApiKeys() {
        // Given
        ApiKey apiKey1 = createTestApiKey("test-key-all-1", "user1@example.com", ApiKeyType.USER);
        ApiKey apiKey2 = createTestApiKey("test-key-all-2", "user2@example.com", ApiKeyType.SYSTEM);
        ApiKey savedApiKey1 = apiKeyRepository.save(apiKey1);
        ApiKey savedApiKey2 = apiKeyRepository.save(apiKey2);
        createdApiKeyIds.add(savedApiKey1.id);
        createdApiKeyIds.add(savedApiKey2.id);

        // When
        List<ApiKey> allApiKeys = apiKeyRepository.findAll();

        // Then
        assertTrue(allApiKeys.size() >= 2);
        assertTrue(allApiKeys.stream().anyMatch(ak -> ak.id.equals(savedApiKey1.id)));
        assertTrue(allApiKeys.stream().anyMatch(ak -> ak.id.equals(savedApiKey2.id)));
    }

    @Test
    void testFindByKeyHash_ReturnsApiKeyWhenExists() {
        // Given
        String uniqueHash = "hash-" + UUID.randomUUID();
        ApiKey apiKey = createTestApiKey("test-key-hash", "user@example.com", ApiKeyType.USER);
        apiKey.keyHash = uniqueHash;
        ApiKey savedApiKey = apiKeyRepository.save(apiKey);
        createdApiKeyIds.add(savedApiKey.id);

        // When
        Optional<ApiKey> foundApiKey = apiKeyRepository.findByKeyHash(uniqueHash);

        // Then
        assertTrue(foundApiKey.isPresent());
        assertEquals(uniqueHash, foundApiKey.get().keyHash);
        assertEquals(savedApiKey.id, foundApiKey.get().id);
    }

    @Test
    void testFindByKeyHash_ReturnsEmptyWhenNotExists() {
        // When
        Optional<ApiKey> foundApiKey = apiKeyRepository.findByKeyHash("non-existent-hash");

        // Then
        assertFalse(foundApiKey.isPresent());
    }

    @Test
    void testFindByUserEmail_ReturnsApiKeysForUser() {
        // Given
        String userEmail = "testuser@example.com";
        ApiKey apiKey1 = createTestApiKey("test-key-user-1", userEmail, ApiKeyType.USER);
        ApiKey apiKey2 = createTestApiKey("test-key-user-2", userEmail, ApiKeyType.USER);
        ApiKey apiKey3 = createTestApiKey("test-key-other", "other@example.com", ApiKeyType.USER);
        
        createdApiKeyIds.add(apiKeyRepository.save(apiKey1).id);
        createdApiKeyIds.add(apiKeyRepository.save(apiKey2).id);
        createdApiKeyIds.add(apiKeyRepository.save(apiKey3).id);

        // When
        List<ApiKey> userApiKeys = apiKeyRepository.findByUserEmail(userEmail);

        // Then
        assertEquals(2, userApiKeys.size());
        assertTrue(userApiKeys.stream().allMatch(ak -> ak.userEmail.equals(userEmail)));
    }

    @Test
    void testFindByKeyType_ReturnsApiKeysOfType() {
        // Given
        ApiKey userApiKey = createTestApiKey("test-key-user-type", "user@example.com", ApiKeyType.USER);
        ApiKey systemApiKey = createTestApiKey("test-key-system-type", null, ApiKeyType.SYSTEM);
        
        createdApiKeyIds.add(apiKeyRepository.save(userApiKey).id);
        createdApiKeyIds.add(apiKeyRepository.save(systemApiKey).id);

        // When
        List<ApiKey> userApiKeys = apiKeyRepository.findByKeyType(ApiKeyType.USER);

        // Then
        assertTrue(userApiKeys.stream().anyMatch(ak -> ak.keyName.equals("test-key-user-type")));
        assertTrue(userApiKeys.stream().allMatch(ak -> ak.keyType == ApiKeyType.USER));
    }

    @Test
    void testFindByIsActive_ReturnsActiveApiKeysOnly() {
        // Given
        ApiKey activeApiKey = createTestApiKey("test-key-active", "user@example.com", ApiKeyType.USER);
        activeApiKey.isActive = true;
        ApiKey inactiveApiKey = createTestApiKey("test-key-inactive", "user@example.com", ApiKeyType.USER);
        inactiveApiKey.isActive = false;
        
        createdApiKeyIds.add(apiKeyRepository.save(activeApiKey).id);
        createdApiKeyIds.add(apiKeyRepository.save(inactiveApiKey).id);

        // When
        List<ApiKey> activeApiKeys = apiKeyRepository.findByIsActive(true);

        // Then
        assertTrue(activeApiKeys.stream().anyMatch(ak -> ak.keyName.equals("test-key-active")));
        assertTrue(activeApiKeys.stream().allMatch(ak -> ak.isActive));
    }

    @Test
    void testFindByIsActive_ReturnsInactiveApiKeysOnly() {
        // Given
        ApiKey activeApiKey = createTestApiKey("test-key-active-2", "user@example.com", ApiKeyType.USER);
        activeApiKey.isActive = true;
        ApiKey inactiveApiKey = createTestApiKey("test-key-inactive-2", "user@example.com", ApiKeyType.USER);
        inactiveApiKey.isActive = false;
        
        createdApiKeyIds.add(apiKeyRepository.save(activeApiKey).id);
        createdApiKeyIds.add(apiKeyRepository.save(inactiveApiKey).id);

        // When
        List<ApiKey> inactiveApiKeys = apiKeyRepository.findByIsActive(false);

        // Then
        assertTrue(inactiveApiKeys.stream().anyMatch(ak -> ak.keyName.equals("test-key-inactive-2")));
        assertTrue(inactiveApiKeys.stream().noneMatch(ak -> ak.isActive));
    }

    @Test
    void testFindByUserEmailAndIsActive_ReturnsFilteredApiKeys() {
        // Given
        String userEmail = "testuser@example.com";
        ApiKey activeApiKey = createTestApiKey("test-key-user-active", userEmail, ApiKeyType.USER);
        activeApiKey.isActive = true;
        ApiKey inactiveApiKey = createTestApiKey("test-key-user-inactive", userEmail, ApiKeyType.USER);
        inactiveApiKey.isActive = false;
        ApiKey otherUserApiKey = createTestApiKey("test-key-other-active", "other@example.com", ApiKeyType.USER);
        otherUserApiKey.isActive = true;
        
        createdApiKeyIds.add(apiKeyRepository.save(activeApiKey).id);
        createdApiKeyIds.add(apiKeyRepository.save(inactiveApiKey).id);
        createdApiKeyIds.add(apiKeyRepository.save(otherUserApiKey).id);

        // When
        List<ApiKey> userActiveApiKeys = apiKeyRepository.findByUserEmailAndIsActive(userEmail, true);

        // Then
        assertEquals(1, userActiveApiKeys.size());
        assertEquals(userEmail, userActiveApiKeys.get(0).userEmail);
        assertTrue(userActiveApiKeys.get(0).isActive);
    }

    @Test
    void testFindByCreatedByEmail_ReturnsApiKeysCreatedByUser() {
        // Given
        String creatorEmail = "creator@example.com";
        ApiKey apiKey1 = createTestApiKey("test-key-creator-1", "user1@example.com", ApiKeyType.USER);
        apiKey1.createdByEmail = creatorEmail;
        ApiKey apiKey2 = createTestApiKey("test-key-creator-2", "user2@example.com", ApiKeyType.USER);
        apiKey2.createdByEmail = creatorEmail;
        ApiKey apiKey3 = createTestApiKey("test-key-other-creator", "user3@example.com", ApiKeyType.USER);
        apiKey3.createdByEmail = "other@example.com";
        
        createdApiKeyIds.add(apiKeyRepository.save(apiKey1).id);
        createdApiKeyIds.add(apiKeyRepository.save(apiKey2).id);
        createdApiKeyIds.add(apiKeyRepository.save(apiKey3).id);

        // When
        List<ApiKey> creatorApiKeys = apiKeyRepository.findByCreatedByEmail(creatorEmail);

        // Then
        assertEquals(2, creatorApiKeys.size());
        assertTrue(creatorApiKeys.stream().allMatch(ak -> ak.createdByEmail.equals(creatorEmail)));
    }

    @Test
    void testSaveWithExpiration_PersistsExpirationDate() {
        // Given
        ApiKey apiKey = createTestApiKey("test-key-expiration", "user@example.com", ApiKeyType.USER);
        apiKey.expiresAt = LocalDateTime.now().plusDays(30);

        // When
        ApiKey savedApiKey = apiKeyRepository.save(apiKey);
        createdApiKeyIds.add(savedApiKey.id);

        // Then
        ApiKey foundApiKey = apiKeyRepository.findById(savedApiKey.id).orElseThrow();
        assertNotNull(foundApiKey.expiresAt);
        assertTrue(foundApiKey.expiresAt.isAfter(LocalDateTime.now()));
    }

    @Test
    void testSaveRevokedApiKey_PersistsRevocationDetails() {
        // Given
        ApiKey apiKey = createTestApiKey("test-key-revoked", "user@example.com", ApiKeyType.USER);
        apiKey.revokedAt = LocalDateTime.now();
        apiKey.revokedByEmail = "admin@example.com";
        apiKey.isActive = false;

        // When
        ApiKey savedApiKey = apiKeyRepository.save(apiKey);
        createdApiKeyIds.add(savedApiKey.id);

        // Then
        ApiKey foundApiKey = apiKeyRepository.findById(savedApiKey.id).orElseThrow();
        assertNotNull(foundApiKey.revokedAt);
        assertEquals("admin@example.com", foundApiKey.revokedByEmail);
        assertFalse(foundApiKey.isActive);
    }

    @Test
    void testExists_ReturnsTrueWhenApiKeyExists() {
        // Given
        ApiKey apiKey = createTestApiKey("test-key-exists", "user@example.com", ApiKeyType.USER);
        ApiKey savedApiKey = apiKeyRepository.save(apiKey);
        createdApiKeyIds.add(savedApiKey.id);

        // When
        boolean exists = apiKeyRepository.exists(savedApiKey.id);

        // Then
        assertTrue(exists);
    }

    @Test
    void testExists_ReturnsFalseWhenApiKeyNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        boolean exists = apiKeyRepository.exists(nonExistentId);

        // Then
        assertFalse(exists);
    }

    @Test
    void testDelete_RemovesApiKey() {
        // Given
        ApiKey apiKey = createTestApiKey("test-key-delete", "user@example.com", ApiKeyType.USER);
        ApiKey savedApiKey = apiKeyRepository.save(apiKey);
        UUID apiKeyId = savedApiKey.id;

        // When
        apiKeyRepository.delete(savedApiKey);

        // Then
        assertFalse(apiKeyRepository.exists(apiKeyId));
        assertFalse(apiKeyRepository.findById(apiKeyId).isPresent());
    }

    @Test
    void testCount_ReturnsCorrectCount() {
        // Given
        long initialCount = apiKeyRepository.count();
        ApiKey apiKey1 = createTestApiKey("test-key-count-1", "user1@example.com", ApiKeyType.USER);
        ApiKey apiKey2 = createTestApiKey("test-key-count-2", "user2@example.com", ApiKeyType.SYSTEM);
        createdApiKeyIds.add(apiKeyRepository.save(apiKey1).id);
        createdApiKeyIds.add(apiKeyRepository.save(apiKey2).id);

        // When
        long newCount = apiKeyRepository.count();

        // Then
        assertEquals(initialCount + 2, newCount);
    }

    // Helper methods

    private ApiKey createTestApiKey(String keyName, String userEmail, ApiKeyType keyType) {
        ApiKey apiKey = new ApiKey();
        apiKey.keyName = keyName;
        apiKey.keyHash = "hash-" + UUID.randomUUID();
        apiKey.keyPrefix = "idp_";
        apiKey.keyType = keyType;
        apiKey.userEmail = userEmail;
        apiKey.createdByEmail = userEmail != null ? userEmail : "admin@example.com";
        apiKey.createdAt = LocalDateTime.now();
        apiKey.isActive = true;
        return apiKey;
    }
}
