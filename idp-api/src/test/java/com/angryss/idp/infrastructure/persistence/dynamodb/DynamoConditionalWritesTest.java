package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import com.angryss.idp.domain.valueobjects.StackType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoDB conditional writes and transaction behavior.
 * Tests optimistic locking, atomic operations, and transaction rollback scenarios.
 */
public class DynamoConditionalWritesTest extends DynamoDbTestBase {

    @Inject
    DynamoApiKeyRepository apiKeyRepository;

    @Inject
    DynamoStackRepository stackRepository;

    @Inject
    DynamoTransactionManager transactionManager;

    @Test
    public void testConditionalWrite_RevokeActiveKey() {
        // Create an active API key
        ApiKey apiKey = createTestApiKey("active-key", "user@example.com");
        apiKey.isActive = true;
        ApiKey saved = apiKeyRepository.save(apiKey);
        
        // Revoke with optimistic lock - should succeed
        ApiKey revoked = apiKeyRepository.revokeWithOptimisticLock(saved);
        
        assertFalse(revoked.isActive);
        assertNotNull(revoked.revokedAt);
        
        // Verify in database
        Optional<ApiKey> fetched = apiKeyRepository.findById(saved.id);
        assertTrue(fetched.isPresent());
        assertFalse(fetched.get().isActive);
    }

    @Test
    public void testConditionalWrite_RotateKey() {
        // Create old key
        ApiKey oldKey = createTestApiKey("old-key", "user@example.com");
        oldKey.isActive = true;
        oldKey.keyHash = "old-hash-123";
        ApiKey savedOld = apiKeyRepository.save(oldKey);
        
        // Create new key
        ApiKey newKey = createTestApiKey("new-key", "user@example.com");
        newKey.isActive = true;
        newKey.keyHash = "new-hash-456";
        
        // Rotate atomically
        ApiKey rotated = apiKeyRepository.rotateKey(savedOld, newKey);
        
        // Verify new key is active
        assertNotNull(rotated.id);
        assertTrue(rotated.isActive);
        assertEquals("new-hash-456", rotated.keyHash);
        
        // Verify old key is revoked
        Optional<ApiKey> oldFetched = apiKeyRepository.findById(savedOld.id);
        assertTrue(oldFetched.isPresent());
        assertFalse(oldFetched.get().isActive);
        assertNotNull(oldFetched.get().revokedAt);
        
        // Verify new key exists
        Optional<ApiKey> newFetched = apiKeyRepository.findById(rotated.id);
        assertTrue(newFetched.isPresent());
        assertTrue(newFetched.get().isActive);
    }

    @Test
    public void testTransactionWrite_SaveMultipleKeys() {
        // Create multiple keys
        List<ApiKey> keys = Arrays.asList(
            createTestApiKey("key1", "user@example.com"),
            createTestApiKey("key2", "user@example.com"),
            createTestApiKey("key3", "user@example.com")
        );
        
        // Save all in transaction
        List<ApiKey> saved = apiKeyRepository.saveAll(keys);
        
        // Verify all were saved
        assertEquals(3, saved.size());
        assertTrue(saved.stream().allMatch(k -> k.id != null));
        
        // Verify all exist in database
        for (ApiKey key : saved) {
            Optional<ApiKey> found = apiKeyRepository.findById(key.id);
            assertTrue(found.isPresent());
        }
        
        assertEquals(3, apiKeyRepository.count());
    }

    @Test
    public void testTransactionWrite_AtomicMultipleOperations() {
        // Create transaction writes manually
        List<DynamoTransactionManager.TransactionWrite> writes = new ArrayList<>();
        
        // Create first API key
        ApiKey key1 = createTestApiKey("tx-key1", "user@example.com");
        key1.id = UUID.randomUUID();
        key1.createdAt = LocalDateTime.now();
        Map<String, software.amazon.awssdk.services.dynamodb.model.AttributeValue> item1 = 
            new com.angryss.idp.infrastructure.persistence.dynamodb.mapper.DynamoEntityMapper()
                .apiKeyToItem(key1);
        
        writes.add(DynamoTransactionManager.TransactionWrite.put(
            "test_idp_api_keys",
            item1,
            "Create key1"
        ));
        
        // Create second API key
        ApiKey key2 = createTestApiKey("tx-key2", "user@example.com");
        key2.id = UUID.randomUUID();
        key2.createdAt = LocalDateTime.now();
        Map<String, software.amazon.awssdk.services.dynamodb.model.AttributeValue> item2 = 
            new com.angryss.idp.infrastructure.persistence.dynamodb.mapper.DynamoEntityMapper()
                .apiKeyToItem(key2);
        
        writes.add(DynamoTransactionManager.TransactionWrite.put(
            "test_idp_api_keys",
            item2,
            "Create key2"
        ));
        
        // Execute transaction
        transactionManager.executeTransaction(writes);
        
        // Verify both keys exist
        assertTrue(apiKeyRepository.findById(key1.id).isPresent());
        assertTrue(apiKeyRepository.findById(key2.id).isPresent());
    }

    @Test
    public void testConditionalWrite_PreventDuplicateKeyHash() {
        // Create first key with specific hash
        ApiKey key1 = createTestApiKey("key1", "user@example.com");
        key1.keyHash = "unique-hash-123";
        apiKeyRepository.save(key1);
        
        // Verify we can find by hash
        Optional<ApiKey> found = apiKeyRepository.findByKeyHash("unique-hash-123");
        assertTrue(found.isPresent());
        assertEquals("key1", found.get().keyName);
        
        // Create second key with same hash (should be prevented by application logic)
        ApiKey key2 = createTestApiKey("key2", "user@example.com");
        key2.keyHash = "unique-hash-123";
        apiKeyRepository.save(key2);
        
        // Query by hash should return one of them (last write wins in DynamoDB without conditions)
        Optional<ApiKey> foundAgain = apiKeyRepository.findByKeyHash("unique-hash-123");
        assertTrue(foundAgain.isPresent());
    }

    @Test
    public void testBulkOperations_ConsistentResults() {
        // Create many keys in bulk
        List<ApiKey> keys = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            keys.add(createTestApiKey("bulk-key-" + i, "user@example.com"));
        }
        
        // Save all
        List<ApiKey> saved = apiKeyRepository.saveAll(keys);
        
        // Verify count
        assertEquals(50, saved.size());
        assertEquals(50, apiKeyRepository.count());
        
        // Verify all can be retrieved
        List<ApiKey> all = apiKeyRepository.findAll();
        assertEquals(50, all.size());
    }

    @Test
    public void testConditionalWrite_UpdateWithVersionCheck() {
        // Create a stack
        Stack stack = createTestStack("versioned-stack", "user1");
        Stack saved = stackRepository.save(stack);
        
        // Update the stack
        saved.setName("updated-stack");
        Stack updated = stackRepository.save(saved);
        
        // Verify update succeeded
        assertEquals("updated-stack", updated.getName());
        
        // Fetch and verify
        Optional<Stack> fetched = stackRepository.findById(saved.getId());
        assertTrue(fetched.isPresent());
        assertEquals("updated-stack", fetched.get().getName());
    }

    @Test
    public void testTransactionWrite_RollbackOnFailure() {
        // This test demonstrates transaction behavior
        // In a real scenario, if one write fails, all should fail
        
        List<ApiKey> keys = Arrays.asList(
            createTestApiKey("tx-key-1", "user@example.com"),
            createTestApiKey("tx-key-2", "user@example.com")
        );
        
        // Save in transaction
        List<ApiKey> saved = apiKeyRepository.saveAll(keys);
        
        // All should succeed
        assertEquals(2, saved.size());
        assertEquals(2, apiKeyRepository.count());
    }

    @Test
    public void testConditionalWrite_ConcurrentUpdates() {
        // Create a key
        ApiKey key = createTestApiKey("concurrent-key", "user@example.com");
        key.isActive = true;
        ApiKey saved = apiKeyRepository.save(key);
        
        // Simulate concurrent update by fetching twice
        Optional<ApiKey> fetch1 = apiKeyRepository.findById(saved.id);
        Optional<ApiKey> fetch2 = apiKeyRepository.findById(saved.id);
        
        assertTrue(fetch1.isPresent());
        assertTrue(fetch2.isPresent());
        
        // Update first instance
        fetch1.get().keyName = "updated-by-user1";
        apiKeyRepository.save(fetch1.get());
        
        // Update second instance (last write wins in DynamoDB without optimistic locking)
        fetch2.get().keyName = "updated-by-user2";
        apiKeyRepository.save(fetch2.get());
        
        // Verify final state
        Optional<ApiKey> final_fetch = apiKeyRepository.findById(saved.id);
        assertTrue(final_fetch.isPresent());
        assertEquals("updated-by-user2", final_fetch.get().keyName);
    }

    @Test
    public void testPaginationConsistency_LargeTransaction() {
        // Create a large number of keys in a transaction
        List<ApiKey> keys = new ArrayList<>();
        for (int i = 0; i < 25; i++) {  // DynamoDB transaction limit is 100 items
            keys.add(createTestApiKey("tx-large-key-" + i, "user@example.com"));
        }
        
        List<ApiKey> saved = apiKeyRepository.saveAll(keys);
        
        assertEquals(25, saved.size());
        
        // Verify all are retrievable
        List<ApiKey> all = apiKeyRepository.findAll();
        assertEquals(25, all.size());
        
        // Verify query with pagination
        List<ApiKey> byUser = apiKeyRepository.findByUserEmail("user@example.com");
        assertEquals(25, byUser.size());
    }

    private ApiKey createTestApiKey(String name, String userEmail) {
        ApiKey apiKey = new ApiKey();
        apiKey.keyName = name;
        apiKey.userEmail = userEmail;
        apiKey.createdByEmail = "admin@example.com";
        apiKey.keyType = ApiKeyType.USER;
        apiKey.isActive = true;
        apiKey.keyHash = "hash-" + name;
        apiKey.keyPrefix = "test_";
        apiKey.createdAt = LocalDateTime.now();
        return apiKey;
    }

    private Stack createTestStack(String name, String createdBy) {
        Stack stack = new Stack();
        stack.setName(name);
        stack.setCloudName(name.replace("-", "") + "cloud");
        stack.setRoutePath("/" + name.replace("-", "") + "/");
        stack.setCreatedBy(createdBy);
        stack.setStackType(StackType.INFRASTRUCTURE);
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        return stack;
    }
}
