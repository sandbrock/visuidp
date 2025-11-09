package com.angryss.idp.domain.entities;

import com.angryss.idp.domain.valueobjects.ApiKeyType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;
import org.mindrot.jbcrypt.BCrypt;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for ApiKey entity methods.
 * Focuses on entity behavior like validation, expiration, and lifecycle methods.
 */
@QuarkusTest
class ApiKeyTest {

    @Inject
    EntityManager em;

    @Test
    @Transactional
    void testIsValid_ActiveNonExpiredNonRevokedKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Valid Key", 30);
        apiKey.persist();

        // When
        boolean isValid = apiKey.isValid();

        // Then
        assertTrue(isValid, "Active, non-expired, non-revoked key should be valid");
    }

    @Test
    @Transactional
    void testIsValid_InactiveKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Inactive Key", 30);
        apiKey.isActive = false;
        apiKey.persist();

        // When
        boolean isValid = apiKey.isValid();

        // Then
        assertFalse(isValid, "Inactive key should not be valid");
    }

    @Test
    @Transactional
    void testIsValid_RevokedKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Revoked Key", 30);
        apiKey.revokedAt = LocalDateTime.now().minusDays(1);
        apiKey.revokedByEmail = "admin@example.com";
        apiKey.persist();

        // When
        boolean isValid = apiKey.isValid();

        // Then
        assertFalse(isValid, "Revoked key should not be valid");
    }

    @Test
    @Transactional
    void testIsValid_ExpiredKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Expired Key", -5); // Expired 5 days ago
        apiKey.persist();

        // When
        boolean isValid = apiKey.isValid();

        // Then
        assertFalse(isValid, "Expired key should not be valid");
    }

    @Test
    @Transactional
    void testIsExpired_ExpiredKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Expired Key", -1);
        apiKey.persist();

        // When
        boolean isExpired = apiKey.isExpired();

        // Then
        assertTrue(isExpired, "Key with past expiration date should be expired");
    }

    @Test
    @Transactional
    void testIsExpired_NotExpiredKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Valid Key", 30);
        apiKey.persist();

        // When
        boolean isExpired = apiKey.isExpired();

        // Then
        assertFalse(isExpired, "Key with future expiration date should not be expired");
    }

    @Test
    @Transactional
    void testIsExpired_NoExpirationDate() {
        // Given
        ApiKey apiKey = createTestApiKey("No Expiration Key", null);
        apiKey.persist();

        // When
        boolean isExpired = apiKey.isExpired();

        // Then
        assertFalse(isExpired, "Key with no expiration date should not be expired");
    }

    @Test
    @Transactional
    void testMarkAsUsed_UpdatesLastUsedTimestamp() {
        // Given
        ApiKey apiKey = createTestApiKey("Test Key", 30);
        apiKey.lastUsedAt = null;
        apiKey.persist();
        em.flush();

        LocalDateTime beforeMark = LocalDateTime.now().minusSeconds(1);

        // When
        apiKey.markAsUsed();
        em.flush();
        em.clear();

        // Then
        ApiKey updatedKey = em.find(ApiKey.class, apiKey.id);
        assertNotNull(updatedKey.lastUsedAt, "Last used timestamp should be set");
        assertTrue(updatedKey.lastUsedAt.isAfter(beforeMark), "Last used timestamp should be recent");
    }

    @Test
    @Transactional
    void testMarkAsUsed_UpdatesExistingTimestamp() {
        // Given
        ApiKey apiKey = createTestApiKey("Test Key", 30);
        apiKey.lastUsedAt = LocalDateTime.now().minusDays(5);
        apiKey.persist();
        em.flush();

        LocalDateTime oldLastUsed = apiKey.lastUsedAt;
        LocalDateTime beforeMark = LocalDateTime.now().minusSeconds(1);

        // When
        apiKey.markAsUsed();
        em.flush();
        em.clear();

        // Then
        ApiKey updatedKey = em.find(ApiKey.class, apiKey.id);
        assertNotNull(updatedKey.lastUsedAt);
        assertTrue(updatedKey.lastUsedAt.isAfter(oldLastUsed), "Last used timestamp should be updated");
        assertTrue(updatedKey.lastUsedAt.isAfter(beforeMark), "Last used timestamp should be recent");
    }

    @Test
    @Transactional
    void testRevoke_SetsRevokedFields() {
        // Given
        ApiKey apiKey = createTestApiKey("Key to Revoke", 30);
        apiKey.persist();
        em.flush();

        String revokedBy = "admin@example.com";
        LocalDateTime beforeRevoke = LocalDateTime.now().minusSeconds(1);

        // When
        apiKey.revoke(revokedBy);
        em.flush();
        em.clear();

        // Then
        ApiKey revokedKey = em.find(ApiKey.class, apiKey.id);
        assertNotNull(revokedKey.revokedAt, "Revoked timestamp should be set");
        assertTrue(revokedKey.revokedAt.isAfter(beforeRevoke), "Revoked timestamp should be recent");
        assertEquals(revokedBy, revokedKey.revokedByEmail, "Revoked by email should be set");
        assertFalse(revokedKey.isActive, "Key should be marked as inactive");
        assertFalse(revokedKey.isValid(), "Revoked key should not be valid");
    }

    @Test
    @Transactional
    void testRevoke_MakesKeyInvalid() {
        // Given
        ApiKey apiKey = createTestApiKey("Valid Key", 30);
        apiKey.persist();
        assertTrue(apiKey.isValid(), "Key should be valid before revocation");

        // When
        apiKey.revoke("user@example.com");

        // Then
        assertFalse(apiKey.isValid(), "Key should be invalid after revocation");
    }

    @Test
    @Transactional
    void testIsExpiringSoon_WithinSevenDays() {
        // Given
        ApiKey apiKey = createTestApiKey("Expiring Soon Key", 5);
        apiKey.persist();

        // When
        boolean isExpiringSoon = apiKey.isExpiringSoon();

        // Then
        assertTrue(isExpiringSoon, "Key expiring in 5 days should be expiring soon");
    }

    @Test
    @Transactional
    void testIsExpiringSoon_MoreThanSevenDays() {
        // Given
        ApiKey apiKey = createTestApiKey("Not Expiring Soon Key", 30);
        apiKey.persist();

        // When
        boolean isExpiringSoon = apiKey.isExpiringSoon();

        // Then
        assertFalse(isExpiringSoon, "Key expiring in 30 days should not be expiring soon");
    }

    @Test
    @Transactional
    void testIsExpiringSoon_AlreadyExpired() {
        // Given
        ApiKey apiKey = createTestApiKey("Expired Key", -1);
        apiKey.persist();

        // When
        boolean isExpiringSoon = apiKey.isExpiringSoon();

        // Then
        assertFalse(isExpiringSoon, "Already expired key should not be expiring soon");
    }

    @Test
    @Transactional
    void testIsExpiringSoon_NoExpiration() {
        // Given
        ApiKey apiKey = createTestApiKey("No Expiration Key", null);
        apiKey.persist();

        // When
        boolean isExpiringSoon = apiKey.isExpiringSoon();

        // Then
        assertFalse(isExpiringSoon, "Key with no expiration should not be expiring soon");
    }

    @Test
    @Transactional
    void testGetStatus_ActiveKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Active Key", 30);
        apiKey.persist();

        // When
        String status = apiKey.getStatus();

        // Then
        assertEquals("ACTIVE", status, "Active key should have ACTIVE status");
    }

    @Test
    @Transactional
    void testGetStatus_RevokedKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Revoked Key", 30);
        apiKey.revoke("admin@example.com");
        apiKey.persist();

        // When
        String status = apiKey.getStatus();

        // Then
        assertEquals("REVOKED", status, "Revoked key should have REVOKED status");
    }

    @Test
    @Transactional
    void testGetStatus_ExpiredKey() {
        // Given
        ApiKey apiKey = createTestApiKey("Expired Key", -1);
        apiKey.persist();

        // When
        String status = apiKey.getStatus();

        // Then
        assertEquals("EXPIRED", status, "Expired key should have EXPIRED status");
    }

    @Test
    @Transactional
    void testGetStatus_RevokedTakesPrecedenceOverExpired() {
        // Given
        ApiKey apiKey = createTestApiKey("Revoked and Expired Key", -1);
        apiKey.revoke("admin@example.com");
        apiKey.persist();

        // When
        String status = apiKey.getStatus();

        // Then
        assertEquals("REVOKED", status, "Revoked status should take precedence over expired");
    }

    @Test
    @Transactional
    void testPrePersist_SetsCreatedAt() {
        // Given
        ApiKey apiKey = createTestApiKey("New Key", 30);
        apiKey.createdAt = null; // Clear to test @PrePersist

        // When
        apiKey.persist();
        em.flush();

        // Then
        assertNotNull(apiKey.createdAt, "Created at should be set by @PrePersist");
    }

    @Test
    @Transactional
    void testPrePersist_SetsIsActiveToTrue() {
        // Given
        ApiKey apiKey = createTestApiKey("New Key", 30);
        apiKey.isActive = null; // Clear to test @PrePersist

        // When
        apiKey.persist();
        em.flush();

        // Then
        assertNotNull(apiKey.isActive, "Is active should be set by @PrePersist");
        assertTrue(apiKey.isActive, "Is active should default to true");
    }

    @Test
    @Transactional
    void testUserKeyConstraint_RequiresUserEmail() {
        // Given
        ApiKey apiKey = createTestApiKey("User Key", 30);
        apiKey.keyType = ApiKeyType.USER;
        apiKey.userEmail = "user@example.com";

        // When/Then - Should persist successfully
        assertDoesNotThrow(() -> {
            apiKey.persist();
            em.flush();
        });
    }

    @Test
    @Transactional
    void testSystemKeyConstraint_NoUserEmail() {
        // Given
        ApiKey apiKey = createTestApiKey("System Key", 30);
        apiKey.keyType = ApiKeyType.SYSTEM;
        apiKey.userEmail = null;

        // When/Then - Should persist successfully
        assertDoesNotThrow(() -> {
            apiKey.persist();
            em.flush();
        });
    }

    @Test
    @Transactional
    void testKeyHashUniqueness() {
        // Given
        String plainKey = "idp_user_abcdefghijklmnopqrstuvwxyz123456";
        String hash = BCrypt.hashpw(plainKey, BCrypt.gensalt(12));

        ApiKey apiKey1 = createTestApiKey("Key 1", 30);
        apiKey1.keyHash = hash;
        apiKey1.persist();
        em.flush();

        ApiKey apiKey2 = createTestApiKey("Key 2", 30);
        apiKey2.keyHash = hash; // Same hash

        // When/Then - Should fail due to unique constraint
        assertThrows(Exception.class, () -> {
            apiKey2.persist();
            em.flush();
        }, "Duplicate key hash should violate unique constraint");
    }

    // Helper method to create test API keys
    private ApiKey createTestApiKey(String name, Integer expirationDays) {
        ApiKey apiKey = new ApiKey();
        apiKey.keyName = name;
        apiKey.keyHash = BCrypt.hashpw("test-key-" + name, BCrypt.gensalt(12));
        apiKey.keyPrefix = "idp_user_abc";
        apiKey.keyType = ApiKeyType.USER;
        apiKey.userEmail = "test@example.com";
        apiKey.createdByEmail = "test@example.com";
        apiKey.createdAt = LocalDateTime.now();
        apiKey.isActive = true;
        
        if (expirationDays != null) {
            apiKey.expiresAt = LocalDateTime.now().plusDays(expirationDays);
        }
        
        return apiKey;
    }
}
