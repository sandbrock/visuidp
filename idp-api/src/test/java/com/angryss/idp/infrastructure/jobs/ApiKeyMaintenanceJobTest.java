package com.angryss.idp.infrastructure.jobs;

import com.angryss.idp.domain.entities.ApiKey;
import com.angryss.idp.domain.repositories.ApiKeyRepository;
import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for ApiKeyMaintenanceJob.
 * Verifies that the scheduled job correctly processes expired API keys.
 */
@QuarkusTest
class ApiKeyMaintenanceJobTest {

    @Inject
    ApiKeyMaintenanceJob maintenanceJob;

    @Inject
    ApiKeyRepository apiKeyRepository;

    private List<UUID> createdKeyIds = new ArrayList<>();
    private String uniqueId;

    @BeforeEach
    void setUp() {
        uniqueId = UUID.randomUUID().toString().substring(0, 8);
    }

    @AfterEach
    @Transactional
    void tearDown() {
        // Clean up created keys
        createdKeyIds.forEach(id -> {
            try {
                apiKeyRepository.findById(id).ifPresent(apiKeyRepository::delete);
            } catch (Exception e) {
                System.err.println("Failed to delete API key: " + id);
            }
        });
        createdKeyIds.clear();
    }

    @Test
    @Transactional
    void testProcessExpiredKeys_MarksExpiredKeysAsInactive() {
        // Given - Create an expired API key
        ApiKey expiredKey = createTestApiKey("expired-key-" + uniqueId, LocalDateTime.now().minusDays(1));
        expiredKey = apiKeyRepository.save(expiredKey);
        createdKeyIds.add(expiredKey.id);

        // Verify key is initially active
        assertTrue(expiredKey.isActive);
        assertTrue(expiredKey.isExpired());

        // When - Run the scheduled job
        maintenanceJob.processExpiredKeys();

        // Then - Key should be marked as inactive
        ApiKey processedKey = apiKeyRepository.findById(expiredKey.id).orElseThrow();
        assertFalse(processedKey.isActive);
        assertEquals("EXPIRED", processedKey.getStatus());
    }

    @Test
    @Transactional
    void testProcessExpiredKeys_DoesNotAffectActiveKeys() {
        // Given - Create an active API key that hasn't expired
        ApiKey activeKey = createTestApiKey("active-key-" + uniqueId, LocalDateTime.now().plusDays(30));
        activeKey = apiKeyRepository.save(activeKey);
        createdKeyIds.add(activeKey.id);

        // Verify key is active and not expired
        assertTrue(activeKey.isActive);
        assertFalse(activeKey.isExpired());

        // When - Run the scheduled job
        maintenanceJob.processExpiredKeys();

        // Then - Key should remain active
        ApiKey processedKey = apiKeyRepository.findById(activeKey.id).orElseThrow();
        assertTrue(processedKey.isActive);
        assertEquals("ACTIVE", processedKey.getStatus());
    }

    @Test
    @Transactional
    void testProcessExpiredKeys_HandlesMultipleExpiredKeys() {
        // Given - Create multiple expired API keys
        ApiKey expiredKey1 = createTestApiKey("expired-key-1-" + uniqueId, LocalDateTime.now().minusDays(5));
        expiredKey1 = apiKeyRepository.save(expiredKey1);
        createdKeyIds.add(expiredKey1.id);

        ApiKey expiredKey2 = createTestApiKey("expired-key-2-" + uniqueId, LocalDateTime.now().minusDays(10));
        expiredKey2 = apiKeyRepository.save(expiredKey2);
        createdKeyIds.add(expiredKey2.id);

        ApiKey activeKey = createTestApiKey("active-key-" + uniqueId, LocalDateTime.now().plusDays(30));
        activeKey = apiKeyRepository.save(activeKey);
        createdKeyIds.add(activeKey.id);

        // When - Run the scheduled job
        maintenanceJob.processExpiredKeys();

        // Then - Both expired keys should be inactive, active key should remain active
        ApiKey processedKey1 = apiKeyRepository.findById(expiredKey1.id).orElseThrow();
        assertFalse(processedKey1.isActive);

        ApiKey processedKey2 = apiKeyRepository.findById(expiredKey2.id).orElseThrow();
        assertFalse(processedKey2.isActive);

        ApiKey processedActiveKey = apiKeyRepository.findById(activeKey.id).orElseThrow();
        assertTrue(processedActiveKey.isActive);
    }

    @Test
    @Transactional
    void testProcessExpiredKeys_DoesNotAffectRevokedKeys() {
        // Given - Create a revoked key that is also expired
        ApiKey revokedKey = createTestApiKey("revoked-key-" + uniqueId, LocalDateTime.now().minusDays(1));
        revokedKey.revoke("test-user@example.com");
        revokedKey = apiKeyRepository.save(revokedKey);
        createdKeyIds.add(revokedKey.id);

        // Verify key is revoked and inactive
        assertFalse(revokedKey.isActive);
        assertNotNull(revokedKey.revokedAt);

        // When - Run the scheduled job
        maintenanceJob.processExpiredKeys();

        // Then - Key should remain revoked (not processed again)
        ApiKey processedKey = apiKeyRepository.findById(revokedKey.id).orElseThrow();
        assertFalse(processedKey.isActive);
        assertNotNull(processedKey.revokedAt);
        assertEquals("REVOKED", processedKey.getStatus());
    }

    @Test
    void testProcessExpiredKeys_HandlesNoExpiredKeys() {
        // Given - No expired keys exist (or only active keys)
        
        // When - Run the scheduled job
        // Should not throw any exceptions
        assertDoesNotThrow(() -> maintenanceJob.processExpiredKeys());
    }

    @Test
    @Transactional
    void testProcessRotationGracePeriod_RevokesKeysAfterGracePeriod() {
        // Given - Create an API key with expired grace period
        ApiKey oldKey = createTestApiKey("old-key-" + uniqueId, LocalDateTime.now().plusDays(30));
        oldKey.gracePeriodEndsAt = LocalDateTime.now().minusHours(1); // Grace period ended 1 hour ago
        oldKey = apiKeyRepository.save(oldKey);
        createdKeyIds.add(oldKey.id);

        // Verify key is initially active
        assertTrue(oldKey.isActive);
        assertNull(oldKey.revokedAt);

        // When - Run the scheduled job
        maintenanceJob.processRotationGracePeriod();

        // Then - Key should be revoked
        ApiKey processedKey = apiKeyRepository.findById(oldKey.id).orElseThrow();
        assertFalse(processedKey.isActive);
        assertNotNull(processedKey.revokedAt);
        assertEquals("REVOKED", processedKey.getStatus());
        assertEquals("system", processedKey.revokedByEmail);
    }

    @Test
    @Transactional
    void testProcessRotationGracePeriod_DoesNotAffectKeysWithinGracePeriod() {
        // Given - Create an API key with grace period still active
        ApiKey oldKey = createTestApiKey("old-key-" + uniqueId, LocalDateTime.now().plusDays(30));
        oldKey.gracePeriodEndsAt = LocalDateTime.now().plusHours(12); // Grace period ends in 12 hours
        oldKey = apiKeyRepository.save(oldKey);
        createdKeyIds.add(oldKey.id);

        // Verify key is active
        assertTrue(oldKey.isActive);
        assertNull(oldKey.revokedAt);

        // When - Run the scheduled job
        maintenanceJob.processRotationGracePeriod();

        // Then - Key should remain active
        ApiKey processedKey = apiKeyRepository.findById(oldKey.id).orElseThrow();
        assertTrue(processedKey.isActive);
        assertNull(processedKey.revokedAt);
        assertEquals("ACTIVE", processedKey.getStatus());
    }

    @Test
    @Transactional
    void testProcessRotationGracePeriod_DoesNotAffectKeysWithoutGracePeriod() {
        // Given - Create an API key without grace period set
        ApiKey normalKey = createTestApiKey("normal-key-" + uniqueId, LocalDateTime.now().plusDays(30));
        normalKey.gracePeriodEndsAt = null; // No grace period
        normalKey = apiKeyRepository.save(normalKey);
        createdKeyIds.add(normalKey.id);

        // Verify key is active
        assertTrue(normalKey.isActive);
        assertNull(normalKey.revokedAt);

        // When - Run the scheduled job
        maintenanceJob.processRotationGracePeriod();

        // Then - Key should remain active
        ApiKey processedKey = apiKeyRepository.findById(normalKey.id).orElseThrow();
        assertTrue(processedKey.isActive);
        assertNull(processedKey.revokedAt);
        assertEquals("ACTIVE", processedKey.getStatus());
    }

    @Test
    @Transactional
    void testProcessRotationGracePeriod_HandlesMultipleKeys() {
        // Given - Create multiple keys with different grace period states
        ApiKey expiredGracePeriod1 = createTestApiKey("expired-1-" + uniqueId, LocalDateTime.now().plusDays(30));
        expiredGracePeriod1.gracePeriodEndsAt = LocalDateTime.now().minusHours(2);
        expiredGracePeriod1 = apiKeyRepository.save(expiredGracePeriod1);
        createdKeyIds.add(expiredGracePeriod1.id);

        ApiKey expiredGracePeriod2 = createTestApiKey("expired-2-" + uniqueId, LocalDateTime.now().plusDays(30));
        expiredGracePeriod2.gracePeriodEndsAt = LocalDateTime.now().minusMinutes(30);
        expiredGracePeriod2 = apiKeyRepository.save(expiredGracePeriod2);
        createdKeyIds.add(expiredGracePeriod2.id);

        ApiKey activeGracePeriod = createTestApiKey("active-grace-" + uniqueId, LocalDateTime.now().plusDays(30));
        activeGracePeriod.gracePeriodEndsAt = LocalDateTime.now().plusHours(6);
        activeGracePeriod = apiKeyRepository.save(activeGracePeriod);
        createdKeyIds.add(activeGracePeriod.id);

        ApiKey noGracePeriod = createTestApiKey("no-grace-" + uniqueId, LocalDateTime.now().plusDays(30));
        noGracePeriod.gracePeriodEndsAt = null;
        noGracePeriod = apiKeyRepository.save(noGracePeriod);
        createdKeyIds.add(noGracePeriod.id);

        // When - Run the scheduled job
        maintenanceJob.processRotationGracePeriod();

        // Then - Only keys with expired grace periods should be revoked
        ApiKey processed1 = apiKeyRepository.findById(expiredGracePeriod1.id).orElseThrow();
        assertFalse(processed1.isActive);
        assertNotNull(processed1.revokedAt);

        ApiKey processed2 = apiKeyRepository.findById(expiredGracePeriod2.id).orElseThrow();
        assertFalse(processed2.isActive);
        assertNotNull(processed2.revokedAt);

        ApiKey processedActive = apiKeyRepository.findById(activeGracePeriod.id).orElseThrow();
        assertTrue(processedActive.isActive);
        assertNull(processedActive.revokedAt);

        ApiKey processedNoGrace = apiKeyRepository.findById(noGracePeriod.id).orElseThrow();
        assertTrue(processedNoGrace.isActive);
        assertNull(processedNoGrace.revokedAt);
    }

    @Test
    @Transactional
    void testProcessRotationGracePeriod_DoesNotAffectAlreadyRevokedKeys() {
        // Given - Create a key that is already revoked with expired grace period
        ApiKey revokedKey = createTestApiKey("revoked-key-" + uniqueId, LocalDateTime.now().plusDays(30));
        revokedKey.gracePeriodEndsAt = LocalDateTime.now().minusHours(1);
        revokedKey.revoke("test-user@example.com");
        revokedKey = apiKeyRepository.save(revokedKey);
        createdKeyIds.add(revokedKey.id);

        LocalDateTime originalRevokedAt = revokedKey.revokedAt;
        String originalRevokedBy = revokedKey.revokedByEmail;

        // When - Run the scheduled job
        maintenanceJob.processRotationGracePeriod();

        // Then - Key should remain revoked with original revocation details
        ApiKey processedKey = apiKeyRepository.findById(revokedKey.id).orElseThrow();
        assertFalse(processedKey.isActive);
        assertEquals(originalRevokedAt, processedKey.revokedAt);
        assertEquals(originalRevokedBy, processedKey.revokedByEmail);
    }

    @Test
    void testProcessRotationGracePeriod_HandlesNoKeysToProcess() {
        // Given - No keys with expired grace periods exist
        
        // When - Run the scheduled job
        // Should not throw any exceptions
        assertDoesNotThrow(() -> maintenanceJob.processRotationGracePeriod());
    }

    /**
     * Helper method to create a test API key with specified expiration.
     */
    private ApiKey createTestApiKey(String name, LocalDateTime expiresAt) {
        ApiKey apiKey = new ApiKey();
        apiKey.keyName = name;
        apiKey.keyHash = "hash-" + UUID.randomUUID();
        apiKey.keyPrefix = "idp_user_test";
        apiKey.keyType = ApiKeyType.USER;
        apiKey.userEmail = "test-user@example.com";
        apiKey.createdByEmail = "test-user@example.com";
        apiKey.createdAt = LocalDateTime.now();
        apiKey.expiresAt = expiresAt;
        apiKey.isActive = true;
        return apiKey;
    }
}
