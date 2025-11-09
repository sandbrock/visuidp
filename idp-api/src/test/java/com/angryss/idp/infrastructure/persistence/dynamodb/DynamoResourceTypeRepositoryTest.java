package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoResourceTypeRepository.
 * Tests CRUD operations, GSI queries, and pagination.
 */
public class DynamoResourceTypeRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoResourceTypeRepository resourceTypeRepository;

    @Test
    public void testSaveAndFindById() {
        ResourceType resourceType = createTestResourceType("Database");
        
        ResourceType saved = resourceTypeRepository.save(resourceType);
        
        assertNotNull(saved.id);
        assertNotNull(saved.createdAt);
        assertNotNull(saved.updatedAt);
        
        Optional<ResourceType> found = resourceTypeRepository.findById(saved.id);
        
        assertTrue(found.isPresent());
        assertEquals(saved.id, found.get().id);
        assertEquals("Database", found.get().name);
    }

    @Test
    public void testFindById_NotFound() {
        Optional<ResourceType> found = resourceTypeRepository.findById(UUID.randomUUID());
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        ResourceType resourceType = createTestResourceType("Cache");
        ResourceType saved = resourceTypeRepository.save(resourceType);
        
        saved.description = "Updated description";
        saved.category = ResourceCategory.BOTH;
        ResourceType updated = resourceTypeRepository.save(saved);
        
        assertEquals("Updated description", updated.description);
        assertEquals(ResourceCategory.BOTH, updated.category);
        
        Optional<ResourceType> fetched = resourceTypeRepository.findById(saved.id);
        assertTrue(fetched.isPresent());
        assertEquals("Updated description", fetched.get().description);
    }

    @Test
    public void testDelete() {
        ResourceType resourceType = createTestResourceType("Queue");
        ResourceType saved = resourceTypeRepository.save(resourceType);
        UUID id = saved.id;
        
        assertTrue(resourceTypeRepository.findById(id).isPresent());
        
        resourceTypeRepository.delete(saved);
        
        assertFalse(resourceTypeRepository.findById(id).isPresent());
    }

    @Test
    public void testFindAll() {
        resourceTypeRepository.save(createTestResourceType("Database"));
        resourceTypeRepository.save(createTestResourceType("Cache"));
        resourceTypeRepository.save(createTestResourceType("Queue"));
        
        List<ResourceType> all = resourceTypeRepository.findAll();
        
        assertEquals(3, all.size());
    }

    @Test
    public void testFindByName() {
        resourceTypeRepository.save(createTestResourceType("Database"));
        resourceTypeRepository.save(createTestResourceType("Cache"));
        
        Optional<ResourceType> found = resourceTypeRepository.findByName("Database");
        
        assertTrue(found.isPresent());
        assertEquals("Database", found.get().name);
    }

    @Test
    public void testFindByCategory() {
        ResourceType shared1 = createTestResourceType("VM");
        shared1.category = ResourceCategory.SHARED;
        
        ResourceType shared2 = createTestResourceType("Container");
        shared2.category = ResourceCategory.SHARED;
        
        ResourceType nonShared = createTestResourceType("Blob");
        nonShared.category = ResourceCategory.NON_SHARED;
        
        resourceTypeRepository.save(shared1);
        resourceTypeRepository.save(shared2);
        resourceTypeRepository.save(nonShared);
        
        List<ResourceType> sharedTypes = resourceTypeRepository.findByCategory(ResourceCategory.SHARED);
        
        assertEquals(2, sharedTypes.size());
        assertTrue(sharedTypes.stream().allMatch(rt -> rt.category == ResourceCategory.SHARED));
    }

    @Test
    public void testCount() {
        assertEquals(0, resourceTypeRepository.count());
        
        resourceTypeRepository.save(createTestResourceType("Database"));
        assertEquals(1, resourceTypeRepository.count());
        
        resourceTypeRepository.save(createTestResourceType("Cache"));
        assertEquals(2, resourceTypeRepository.count());
    }

    @Test
    public void testExists() {
        ResourceType resourceType = createTestResourceType("Database");
        ResourceType saved = resourceTypeRepository.save(resourceType);
        
        assertTrue(resourceTypeRepository.exists(saved.id));
        assertFalse(resourceTypeRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testPaginationWithLargeResultSet() {
        // Create more than typical page size
        for (int i = 0; i < 140; i++) {
            ResourceType resourceType = createTestResourceType("ResourceType-" + i);
            resourceTypeRepository.save(resourceType);
        }
        
        List<ResourceType> all = resourceTypeRepository.findAll();
        
        assertEquals(140, all.size());
        
        // Verify pagination works for queries too
        List<ResourceType> sharedTypes = resourceTypeRepository.findByCategory(ResourceCategory.SHARED);
        assertEquals(140, sharedTypes.size());
    }

    private ResourceType createTestResourceType(String name) {
        ResourceType resourceType = new ResourceType();
        resourceType.name = name;
        resourceType.description = "Test resource type: " + name;
        resourceType.category = ResourceCategory.SHARED;
        resourceType.createdAt = LocalDateTime.now();
        resourceType.updatedAt = LocalDateTime.now();
        return resourceType;
    }
}
