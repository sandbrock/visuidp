package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.repositories.CloudProviderRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PostgresCloudProviderRepository.
 * Tests CRUD operations, query methods, and transaction behavior using H2 in-memory database.
 */
@QuarkusTest
class PostgresCloudProviderRepositoryIntegrationTest {

    @Inject
    CloudProviderRepository cloudProviderRepository;

    private List<UUID> createdCloudProviderIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        for (UUID id : createdCloudProviderIds) {
            cloudProviderRepository.findById(id).ifPresent(cp -> cloudProviderRepository.delete(cp));
        }
        createdCloudProviderIds.clear();
    }

    @Test
    void testSaveCloudProvider_CreatesNewCloudProvider() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("test-cp-save", "Test CP Save");

        // When
        CloudProvider savedCloudProvider = cloudProviderRepository.save(cloudProvider);

        // Then
        assertNotNull(savedCloudProvider.id);
        createdCloudProviderIds.add(savedCloudProvider.id);
        assertEquals("test-cp-save", savedCloudProvider.name);
        assertEquals("Test CP Save", savedCloudProvider.displayName);
        assertNotNull(savedCloudProvider.createdAt);
        assertNotNull(savedCloudProvider.updatedAt);
    }

    @Test
    void testSaveCloudProvider_UpdatesExistingCloudProvider() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("test-cp-update", "Test CP Update");
        CloudProvider savedCloudProvider = cloudProviderRepository.save(cloudProvider);
        createdCloudProviderIds.add(savedCloudProvider.id);

        // When
        savedCloudProvider.description = "Updated description";
        savedCloudProvider.enabled = true;
        CloudProvider updatedCloudProvider = cloudProviderRepository.save(savedCloudProvider);

        // Then
        assertEquals(savedCloudProvider.id, updatedCloudProvider.id);
        assertEquals("Updated description", updatedCloudProvider.description);
        assertTrue(updatedCloudProvider.enabled);
    }

    @Test
    void testFindById_ReturnsCloudProviderWhenExists() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("test-cp-findbyid", "Test CP FindById");
        CloudProvider savedCloudProvider = cloudProviderRepository.save(cloudProvider);
        createdCloudProviderIds.add(savedCloudProvider.id);

        // When
        Optional<CloudProvider> foundCloudProvider = cloudProviderRepository.findById(savedCloudProvider.id);

        // Then
        assertTrue(foundCloudProvider.isPresent());
        assertEquals(savedCloudProvider.id, foundCloudProvider.get().id);
        assertEquals("test-cp-findbyid", foundCloudProvider.get().name);
    }

    @Test
    void testFindById_ReturnsEmptyWhenNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        Optional<CloudProvider> foundCloudProvider = cloudProviderRepository.findById(nonExistentId);

        // Then
        assertFalse(foundCloudProvider.isPresent());
    }

    @Test
    void testFindAll_ReturnsAllCloudProviders() {
        // Given
        CloudProvider cloudProvider1 = createTestCloudProvider("test-cp-all-1", "Test CP All 1");
        CloudProvider cloudProvider2 = createTestCloudProvider("test-cp-all-2", "Test CP All 2");
        CloudProvider savedCloudProvider1 = cloudProviderRepository.save(cloudProvider1);
        CloudProvider savedCloudProvider2 = cloudProviderRepository.save(cloudProvider2);
        createdCloudProviderIds.add(savedCloudProvider1.id);
        createdCloudProviderIds.add(savedCloudProvider2.id);

        // When
        List<CloudProvider> allCloudProviders = cloudProviderRepository.findAll();

        // Then
        assertTrue(allCloudProviders.size() >= 2);
        assertTrue(allCloudProviders.stream().anyMatch(cp -> cp.id.equals(savedCloudProvider1.id)));
        assertTrue(allCloudProviders.stream().anyMatch(cp -> cp.id.equals(savedCloudProvider2.id)));
    }

    @Test
    void testFindByName_ReturnsCloudProviderWhenExists() {
        // Given
        String uniqueName = "test-cp-unique-" + UUID.randomUUID();
        CloudProvider cloudProvider = createTestCloudProvider(uniqueName, "Test CP Unique");
        CloudProvider savedCloudProvider = cloudProviderRepository.save(cloudProvider);
        createdCloudProviderIds.add(savedCloudProvider.id);

        // When
        Optional<CloudProvider> foundCloudProvider = cloudProviderRepository.findByName(uniqueName);

        // Then
        assertTrue(foundCloudProvider.isPresent());
        assertEquals(uniqueName, foundCloudProvider.get().name);
        assertEquals(savedCloudProvider.id, foundCloudProvider.get().id);
    }

    @Test
    void testFindByName_ReturnsEmptyWhenNotExists() {
        // When
        Optional<CloudProvider> foundCloudProvider = cloudProviderRepository.findByName("non-existent-cp");

        // Then
        assertFalse(foundCloudProvider.isPresent());
    }

    @Test
    void testFindByEnabled_ReturnsEnabledCloudProvidersOnly() {
        // Given
        CloudProvider enabledCloudProvider = createTestCloudProvider("test-cp-enabled", "Test CP Enabled");
        enabledCloudProvider.enabled = true;
        CloudProvider disabledCloudProvider = createTestCloudProvider("test-cp-disabled", "Test CP Disabled");
        disabledCloudProvider.enabled = false;
        
        createdCloudProviderIds.add(cloudProviderRepository.save(enabledCloudProvider).id);
        createdCloudProviderIds.add(cloudProviderRepository.save(disabledCloudProvider).id);

        // When
        List<CloudProvider> enabledCloudProviders = cloudProviderRepository.findByEnabled(true);

        // Then
        assertTrue(enabledCloudProviders.stream().anyMatch(cp -> cp.name.equals("test-cp-enabled")));
        assertTrue(enabledCloudProviders.stream().allMatch(cp -> cp.enabled));
    }

    @Test
    void testFindByEnabled_ReturnsDisabledCloudProvidersOnly() {
        // Given
        CloudProvider enabledCloudProvider = createTestCloudProvider("test-cp-enabled-2", "Test CP Enabled 2");
        enabledCloudProvider.enabled = true;
        CloudProvider disabledCloudProvider = createTestCloudProvider("test-cp-disabled-2", "Test CP Disabled 2");
        disabledCloudProvider.enabled = false;
        
        createdCloudProviderIds.add(cloudProviderRepository.save(enabledCloudProvider).id);
        createdCloudProviderIds.add(cloudProviderRepository.save(disabledCloudProvider).id);

        // When
        List<CloudProvider> disabledCloudProviders = cloudProviderRepository.findByEnabled(false);

        // Then
        assertTrue(disabledCloudProviders.stream().anyMatch(cp -> cp.name.equals("test-cp-disabled-2")));
        assertTrue(disabledCloudProviders.stream().noneMatch(cp -> cp.enabled));
    }

    @Test
    void testExists_ReturnsTrueWhenCloudProviderExists() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("test-cp-exists", "Test CP Exists");
        CloudProvider savedCloudProvider = cloudProviderRepository.save(cloudProvider);
        createdCloudProviderIds.add(savedCloudProvider.id);

        // When
        boolean exists = cloudProviderRepository.exists(savedCloudProvider.id);

        // Then
        assertTrue(exists);
    }

    @Test
    void testExists_ReturnsFalseWhenCloudProviderNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        boolean exists = cloudProviderRepository.exists(nonExistentId);

        // Then
        assertFalse(exists);
    }

    @Test
    void testDelete_RemovesCloudProvider() {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("test-cp-delete", "Test CP Delete");
        CloudProvider savedCloudProvider = cloudProviderRepository.save(cloudProvider);
        UUID cloudProviderId = savedCloudProvider.id;

        // When
        cloudProviderRepository.delete(savedCloudProvider);

        // Then
        assertFalse(cloudProviderRepository.exists(cloudProviderId));
        assertFalse(cloudProviderRepository.findById(cloudProviderId).isPresent());
    }

    @Test
    void testCount_ReturnsCorrectCount() {
        // Given
        long initialCount = cloudProviderRepository.count();
        CloudProvider cloudProvider1 = createTestCloudProvider("test-cp-count-1", "Test CP Count 1");
        CloudProvider cloudProvider2 = createTestCloudProvider("test-cp-count-2", "Test CP Count 2");
        createdCloudProviderIds.add(cloudProviderRepository.save(cloudProvider1).id);
        createdCloudProviderIds.add(cloudProviderRepository.save(cloudProvider2).id);

        // When
        long newCount = cloudProviderRepository.count();

        // Then
        assertEquals(initialCount + 2, newCount);
    }

    @Test
    void testPreUpdateHook_UpdatesTimestamp() throws InterruptedException {
        // Given
        CloudProvider cloudProvider = createTestCloudProvider("test-cp-timestamp", "Test CP Timestamp");
        CloudProvider savedCloudProvider = cloudProviderRepository.save(cloudProvider);
        createdCloudProviderIds.add(savedCloudProvider.id);
        LocalDateTime originalUpdatedAt = savedCloudProvider.updatedAt;

        // Wait a bit to ensure timestamp difference
        Thread.sleep(10);

        // When
        savedCloudProvider.description = "Updated to trigger preUpdate";
        CloudProvider updatedCloudProvider = cloudProviderRepository.save(savedCloudProvider);

        // Then
        assertTrue(updatedCloudProvider.updatedAt.isAfter(originalUpdatedAt));
    }

    // Helper methods

    private CloudProvider createTestCloudProvider(String name, String displayName) {
        CloudProvider cloudProvider = new CloudProvider();
        cloudProvider.name = name;
        cloudProvider.displayName = displayName;
        cloudProvider.description = "Test cloud provider: " + name;
        cloudProvider.enabled = false;
        cloudProvider.createdAt = LocalDateTime.now();
        cloudProvider.updatedAt = LocalDateTime.now();
        return cloudProvider;
    }
}
