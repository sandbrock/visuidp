package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.StackResource;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoStackResourceRepository.
 * Tests CRUD operations, GSI queries, and pagination.
 */
public class DynamoStackResourceRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoStackResourceRepository stackResourceRepository;

    @Test
    public void testSaveAndFindById() {
        StackResource resource = createTestStackResource("database-instance");
        
        StackResource saved = stackResourceRepository.save(resource);
        
        assertNotNull(saved.id);
        assertNotNull(saved.getCreatedAt());
        
        Optional<StackResource> found = stackResourceRepository.findById(saved.id);
        
        assertTrue(found.isPresent());
        assertEquals(saved.id, found.get().id);
        assertEquals("database-instance", found.get().getName());
    }

    @Test
    public void testFindById_NotFound() {
        Optional<StackResource> found = stackResourceRepository.findById(UUID.randomUUID());
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        StackResource resource = createTestStackResource("cache-instance");
        StackResource saved = stackResourceRepository.save(resource);
        
        saved.setName("updated-cache-instance");
        saved.setDescription("Updated description");
        StackResource updated = stackResourceRepository.save(saved);
        
        assertEquals("updated-cache-instance", updated.getName());
        
        Optional<StackResource> fetched = stackResourceRepository.findById(saved.id);
        assertTrue(fetched.isPresent());
        assertEquals("updated-cache-instance", fetched.get().getName());
    }

    @Test
    public void testDelete() {
        StackResource resource = createTestStackResource("temp-resource");
        StackResource saved = stackResourceRepository.save(resource);
        UUID id = saved.id;
        
        assertTrue(stackResourceRepository.findById(id).isPresent());
        
        stackResourceRepository.delete(saved);
        
        assertFalse(stackResourceRepository.findById(id).isPresent());
    }

    @Test
    public void testFindAll() {
        stackResourceRepository.save(createTestStackResource("resource1"));
        stackResourceRepository.save(createTestStackResource("resource2"));
        stackResourceRepository.save(createTestStackResource("resource3"));
        
        List<StackResource> all = stackResourceRepository.findAll();
        
        assertEquals(3, all.size());
    }

    @Test
    public void testCount() {
        assertEquals(0, stackResourceRepository.count());
        
        stackResourceRepository.save(createTestStackResource("resource1"));
        assertEquals(1, stackResourceRepository.count());
        
        stackResourceRepository.save(createTestStackResource("resource2"));
        assertEquals(2, stackResourceRepository.count());
    }

    @Test
    public void testExists() {
        StackResource resource = createTestStackResource("test-resource");
        StackResource saved = stackResourceRepository.save(resource);
        
        assertTrue(stackResourceRepository.exists(saved.id));
        assertFalse(stackResourceRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testPaginationWithLargeResultSet() {
        // Create more than typical page size
        for (int i = 0; i < 125; i++) {
            StackResource resource = createTestStackResource("resource-" + i);
            stackResourceRepository.save(resource);
        }
        
        List<StackResource> all = stackResourceRepository.findAll();
        assertEquals(125, all.size());
    }

    @Test
    public void testSaveWithConfiguration() {
        StackResource resource = createTestStackResource("configured-resource");
        Map<String, Object> config = new HashMap<>();
        config.put("instanceType", "t3.medium");
        config.put("storage", "100GB");
        config.put("backupEnabled", true);
        resource.setConfiguration(config);
        
        StackResource saved = stackResourceRepository.save(resource);
        
        Optional<StackResource> found = stackResourceRepository.findById(saved.id);
        assertTrue(found.isPresent());
        assertNotNull(found.get().getConfiguration());
        assertEquals("t3.medium", found.get().getConfiguration().get("instanceType"));
        assertEquals("100GB", found.get().getConfiguration().get("storage"));
    }

    private StackResource createTestStackResource(String resourceName) {
        StackResource resource = new StackResource();
        resource.setName(resourceName);
        resource.setDescription("Test resource: " + resourceName);
        Map<String, Object> config = new HashMap<>();
        config.put("test", "value");
        resource.setConfiguration(config);
        return resource;
    }
}
