package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.CloudProvider;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoCloudProviderRepository.
 * Tests CRUD operations, GSI queries, and pagination.
 */
public class DynamoCloudProviderRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoCloudProviderRepository cloudProviderRepository;

    @Test
    public void testSaveAndFindById() {
        CloudProvider provider = createTestCloudProvider("AWS");
        
        CloudProvider saved = cloudProviderRepository.save(provider);
        
        assertNotNull(saved.id);
        assertNotNull(saved.createdAt);
        assertNotNull(saved.updatedAt);
        
        Optional<CloudProvider> found = cloudProviderRepository.findById(saved.id);
        
        assertTrue(found.isPresent());
        assertEquals(saved.id, found.get().id);
        assertEquals("AWS", found.get().name);
    }

    @Test
    public void testFindById_NotFound() {
        Optional<CloudProvider> found = cloudProviderRepository.findById(UUID.randomUUID());
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        CloudProvider provider = createTestCloudProvider("Azure");
        CloudProvider saved = cloudProviderRepository.save(provider);
        LocalDateTime originalUpdatedAt = saved.updatedAt;
        
        // Small delay to ensure updatedAt changes
        try { Thread.sleep(10); } catch (InterruptedException e) {}
        
        saved.description = "Updated description";
        saved.enabled = false;
        CloudProvider updated = cloudProviderRepository.save(saved);
        
        assertEquals("Updated description", updated.description);
        assertFalse(updated.enabled);
        assertTrue(updated.updatedAt.isAfter(originalUpdatedAt) || updated.updatedAt.equals(originalUpdatedAt));
        
        Optional<CloudProvider> fetched = cloudProviderRepository.findById(saved.id);
        assertTrue(fetched.isPresent());
        assertEquals("Updated description", fetched.get().description);
    }

    @Test
    public void testDelete() {
        CloudProvider provider = createTestCloudProvider("GCP");
        CloudProvider saved = cloudProviderRepository.save(provider);
        UUID id = saved.id;
        
        assertTrue(cloudProviderRepository.findById(id).isPresent());
        
        cloudProviderRepository.delete(saved);
        
        assertFalse(cloudProviderRepository.findById(id).isPresent());
    }

    @Test
    public void testFindAll() {
        cloudProviderRepository.save(createTestCloudProvider("AWS"));
        cloudProviderRepository.save(createTestCloudProvider("Azure"));
        cloudProviderRepository.save(createTestCloudProvider("GCP"));
        
        List<CloudProvider> all = cloudProviderRepository.findAll();
        
        assertEquals(3, all.size());
        assertTrue(all.stream().anyMatch(p -> p.name.equals("AWS")));
        assertTrue(all.stream().anyMatch(p -> p.name.equals("Azure")));
        assertTrue(all.stream().anyMatch(p -> p.name.equals("GCP")));
    }

    @Test
    public void testFindByName() {
        cloudProviderRepository.save(createTestCloudProvider("AWS"));
        cloudProviderRepository.save(createTestCloudProvider("Azure"));
        
        Optional<CloudProvider> found = cloudProviderRepository.findByName("AWS");
        
        assertTrue(found.isPresent());
        assertEquals("AWS", found.get().name);
    }

    @Test
    public void testFindByName_NotFound() {
        cloudProviderRepository.save(createTestCloudProvider("AWS"));
        
        Optional<CloudProvider> found = cloudProviderRepository.findByName("NonExistent");
        
        assertFalse(found.isPresent());
    }

    @Test
    public void testFindByEnabled() {
        CloudProvider enabled1 = createTestCloudProvider("AWS");
        enabled1.enabled = true;
        
        CloudProvider enabled2 = createTestCloudProvider("Azure");
        enabled2.enabled = true;
        
        CloudProvider disabled = createTestCloudProvider("GCP");
        disabled.enabled = false;
        
        cloudProviderRepository.save(enabled1);
        cloudProviderRepository.save(enabled2);
        cloudProviderRepository.save(disabled);
        
        List<CloudProvider> enabledProviders = cloudProviderRepository.findByEnabled(true);
        
        assertEquals(2, enabledProviders.size());
        assertTrue(enabledProviders.stream().allMatch(p -> p.enabled));
    }

    @Test
    public void testCount() {
        assertEquals(0, cloudProviderRepository.count());
        
        cloudProviderRepository.save(createTestCloudProvider("AWS"));
        assertEquals(1, cloudProviderRepository.count());
        
        cloudProviderRepository.save(createTestCloudProvider("Azure"));
        assertEquals(2, cloudProviderRepository.count());
    }

    @Test
    public void testExists() {
        CloudProvider provider = createTestCloudProvider("AWS");
        CloudProvider saved = cloudProviderRepository.save(provider);
        
        assertTrue(cloudProviderRepository.exists(saved.id));
        assertFalse(cloudProviderRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testPaginationWithLargeResultSet() {
        // Create more than typical page size
        for (int i = 0; i < 120; i++) {
            CloudProvider provider = createTestCloudProvider("Provider-" + i);
            cloudProviderRepository.save(provider);
        }
        
        List<CloudProvider> all = cloudProviderRepository.findAll();
        
        assertEquals(120, all.size());
        
        // Verify pagination works for queries too
        List<CloudProvider> enabled = cloudProviderRepository.findByEnabled(true);
        assertEquals(120, enabled.size());
    }

    @Test
    public void testSaveWithDisplayName() {
        CloudProvider provider = createTestCloudProvider("AWS");
        provider.displayName = "Amazon Web Services";
        
        CloudProvider saved = cloudProviderRepository.save(provider);
        
        Optional<CloudProvider> found = cloudProviderRepository.findById(saved.id);
        assertTrue(found.isPresent());
        assertEquals("Amazon Web Services", found.get().displayName);
        assertEquals("AWS", found.get().name);
    }

    private CloudProvider createTestCloudProvider(String name) {
        CloudProvider provider = new CloudProvider();
        provider.name = name;
        provider.displayName = name;
        provider.description = "Test provider: " + name;
        provider.enabled = true;
        provider.createdAt = LocalDateTime.now();
        provider.updatedAt = LocalDateTime.now();
        return provider;
    }
}
