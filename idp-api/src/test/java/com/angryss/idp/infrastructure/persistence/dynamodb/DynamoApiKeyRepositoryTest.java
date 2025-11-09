package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoApiKeyRepository.
 * Tests CRUD operations, GSI queries, pagination, and transaction behavior.
 */
public class DynamoApiKeyRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoApiKeyRepository apiKeyRepository;

    @Test
    public void testSaveAndFindById() {
        ApiKey apiKey = createTestApiKey("test-key", "user@example.com");
        
        ApiKey saved = apiKeyRepository.save(apiKey);
        
        assertNotNull(saved.id);
        assertNotNull(saved.createdAt);
        
        Optional<ApiKey> found = apiKeyRepository.findById(saved.id);
        
        assertTrue(found.isPresent());
        assertEquals(saved.id, found.get().id);
        assertEquals("test-key", found.get().keyName);
        assertEquals("user@example.com", found.get().userEmail);
    }

    @Test
    public void testFindById_NotFound() {
        Optional<ApiKey> found = apiKeyRepository.findById(UUID.randomUUID());
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        ApiKey apiKey = createTestApiKey("original-key", "user@example.com");
        ApiKey saved = apiKeyRepository.save(apiKey);
        
        saved.keyName = "updated-key";
        saved.keyPrefix = "upd_";
        ApiKey updated = apiKeyRepository.save(saved);
        
        assertEquals("updated-key", updated.keyName);
        assertEquals("upd_", updated.keyPrefix);
        
        Optional<ApiKey> fetched = apiKeyRepository.findById(saved.id);
        assertTrue(fetched.isPresent());
        assertEquals("updated-key", fetched.get().keyName);
    }

    @Test
    public void testDelete() {
        ApiKey apiKey = createTestApiKey("to-delete", "user@example.com");
        ApiKey saved = apiKeyRepository.save(apiKey);
        UUID id = saved.id;
        
        assertTrue(apiKeyRepository.findById(id).isPresent());
        
        apiKeyRepository.delete(saved);
        
        assertFalse(apiKeyRepository.findById(id).isPresent());
    }

    @Test
    public void testFindAll() {
        apiKeyRepository.save(createTestApiKey("key1", "user1@example.com"));
        apiKeyRepository.save(createTestApiKey("key2", "user2@example.com"));
        apiKeyRepository.save(createTestApiKey("key3", "user3@example.com"));
        
        List<ApiKey> all = apiKeyRepository.findAll();
        
        assertEquals(3, all.size());
    }

    @Test
    public void testFindByKeyHash() {
        ApiKey apiKey = createTestApiKey("test-key", "user@example.com");
        apiKey.keyHash = "hash123";
        apiKeyRepository.save(apiKey);
        
        Optional<ApiKey> found = apiKeyRepository.findByKeyHash("hash123");
        
        assertTrue(found.isPresent());
        assertEquals("test-key", found.get().keyName);
    }

    @Test
    public void testFindByUserEmail() {
        apiKeyRepository.save(createTestApiKey("key1", "user1@example.com"));
        apiKeyRepository.save(createTestApiKey("key2", "user1@example.com"));
        apiKeyRepository.save(createTestApiKey("key3", "user2@example.com"));
        
        List<ApiKey> user1Keys = apiKeyRepository.findByUserEmail("user1@example.com");
        
        assertEquals(2, user1Keys.size());
        assertTrue(user1Keys.stream().allMatch(k -> k.userEmail.equals("user1@example.com")));
    }

    @Test
    public void testFindByKeyType() {
        ApiKey user = createTestApiKey("user-key", "user@example.com");
        user.keyType = ApiKeyType.USER;
        
        ApiKey system = createTestApiKey("system-key", "user@example.com");
        system.keyType = ApiKeyType.SYSTEM;
        
        apiKeyRepository.save(user);
        apiKeyRepository.save(system);
        
        List<ApiKey> userKeys = apiKeyRepository.findByKeyType(ApiKeyType.USER);
        
        assertEquals(1, userKeys.size());
        assertEquals(ApiKeyType.USER, userKeys.get(0).keyType);
    }

    @Test
    public void testFindByIsActive() {
        ApiKey active = createTestApiKey("active-key", "user@example.com");
        active.isActive = true;
        
        ApiKey inactive = createTestApiKey("inactive-key", "user@example.com");
        inactive.isActive = false;
        
        apiKeyRepository.save(active);
        apiKeyRepository.save(inactive);
        
        List<ApiKey> activeKeys = apiKeyRepository.findByIsActive(true);
        
        assertEquals(1, activeKeys.size());
        assertTrue(activeKeys.get(0).isActive);
    }

    @Test
    public void testFindByUserEmailAndIsActive() {
        ApiKey active1 = createTestApiKey("active1", "user@example.com");
        active1.isActive = true;
        
        ApiKey active2 = createTestApiKey("active2", "user@example.com");
        active2.isActive = true;
        
        ApiKey inactive = createTestApiKey("inactive", "user@example.com");
        inactive.isActive = false;
        
        apiKeyRepository.save(active1);
        apiKeyRepository.save(active2);
        apiKeyRepository.save(inactive);
        
        List<ApiKey> activeKeys = apiKeyRepository.findByUserEmailAndIsActive("user@example.com", true);
        
        assertEquals(2, activeKeys.size());
        assertTrue(activeKeys.stream().allMatch(k -> k.isActive));
    }

    @Test
    public void testFindByCreatedByEmail() {
        apiKeyRepository.save(createTestApiKey("key1", "user@example.com", "admin@example.com"));
        apiKeyRepository.save(createTestApiKey("key2", "user@example.com", "admin@example.com"));
        apiKeyRepository.save(createTestApiKey("key3", "user@example.com", "other@example.com"));
        
        List<ApiKey> adminKeys = apiKeyRepository.findByCreatedByEmail("admin@example.com");
        
        assertEquals(2, adminKeys.size());
        assertTrue(adminKeys.stream().allMatch(k -> k.createdByEmail.equals("admin@example.com")));
    }

    @Test
    public void testCount() {
        assertEquals(0, apiKeyRepository.count());
        
        apiKeyRepository.save(createTestApiKey("key1", "user@example.com"));
        assertEquals(1, apiKeyRepository.count());
        
        apiKeyRepository.save(createTestApiKey("key2", "user@example.com"));
        assertEquals(2, apiKeyRepository.count());
    }

    @Test
    public void testExists() {
        ApiKey apiKey = createTestApiKey("test-key", "user@example.com");
        ApiKey saved = apiKeyRepository.save(apiKey);
        
        assertTrue(apiKeyRepository.exists(saved.id));
        assertFalse(apiKeyRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testPaginationWithLargeResultSet() {
        // Create more than typical page size
        for (int i = 0; i < 150; i++) {
            ApiKey apiKey = createTestApiKey("key-" + i, "user@example.com");
            apiKeyRepository.save(apiKey);
        }
        
        List<ApiKey> all = apiKeyRepository.findAll();
        
        assertEquals(150, all.size());
        
        // Verify pagination works for queries too
        List<ApiKey> userKeys = apiKeyRepository.findByUserEmail("user@example.com");
        assertEquals(150, userKeys.size());
    }

    @Test
    public void testRevokeWithOptimisticLock() {
        ApiKey apiKey = createTestApiKey("revoke-key", "user@example.com");
        apiKey.isActive = true;
        ApiKey saved = apiKeyRepository.save(apiKey);
        
        ApiKey revoked = apiKeyRepository.revokeWithOptimisticLock(saved);
        
        assertFalse(revoked.isActive);
        assertNotNull(revoked.revokedAt);
        
        Optional<ApiKey> fetched = apiKeyRepository.findById(saved.id);
        assertTrue(fetched.isPresent());
        assertFalse(fetched.get().isActive);
    }

    @Test
    public void testRotateKey() {
        ApiKey oldKey = createTestApiKey("old-key", "user@example.com");
        oldKey.isActive = true;
        oldKey.keyHash = "old-hash";
        ApiKey savedOld = apiKeyRepository.save(oldKey);
        
        ApiKey newKey = createTestApiKey("new-key", "user@example.com");
        newKey.isActive = true;
        newKey.keyHash = "new-hash";
        
        ApiKey rotated = apiKeyRepository.rotateKey(savedOld, newKey);
        
        assertNotNull(rotated.id);
        assertEquals("new-key", rotated.keyName);
        
        // Verify old key is revoked
        Optional<ApiKey> oldFetched = apiKeyRepository.findById(savedOld.id);
        assertTrue(oldFetched.isPresent());
        assertFalse(oldFetched.get().isActive);
        
        // Verify new key exists and is active
        Optional<ApiKey> newFetched = apiKeyRepository.findById(rotated.id);
        assertTrue(newFetched.isPresent());
        assertTrue(newFetched.get().isActive);
    }

    @Test
    public void testSaveAll() {
        List<ApiKey> apiKeys = Arrays.asList(
            createTestApiKey("key1", "user@example.com"),
            createTestApiKey("key2", "user@example.com"),
            createTestApiKey("key3", "user@example.com")
        );
        
        List<ApiKey> saved = apiKeyRepository.saveAll(apiKeys);
        
        assertEquals(3, saved.size());
        assertTrue(saved.stream().allMatch(k -> k.id != null));
        
        assertEquals(3, apiKeyRepository.count());
    }

    private ApiKey createTestApiKey(String name, String userEmail) {
        return createTestApiKey(name, userEmail, "admin@example.com");
    }

    private ApiKey createTestApiKey(String name, String userEmail, String createdByEmail) {
        ApiKey apiKey = new ApiKey();
        apiKey.keyName = name;
        apiKey.userEmail = userEmail;
        apiKey.createdByEmail = createdByEmail;
        apiKey.keyType = ApiKeyType.USER;
        apiKey.isActive = true;
        apiKey.keyHash = "hash-" + name;
        apiKey.keyPrefix = "test_";
        apiKey.createdAt = LocalDateTime.now();
        return apiKey;
    }
}
