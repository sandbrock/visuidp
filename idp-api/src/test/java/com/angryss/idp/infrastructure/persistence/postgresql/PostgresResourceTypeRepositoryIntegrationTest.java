package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.repositories.ResourceTypeRepository;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PostgresResourceTypeRepository.
 * Tests CRUD operations, query methods, and transaction behavior using H2 in-memory database.
 */
@QuarkusTest
class PostgresResourceTypeRepositoryIntegrationTest {

    @Inject
    ResourceTypeRepository resourceTypeRepository;

    private List<UUID> createdResourceTypeIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        for (UUID id : createdResourceTypeIds) {
            resourceTypeRepository.findById(id).ifPresent(rt -> resourceTypeRepository.delete(rt));
        }
        createdResourceTypeIds.clear();
    }

    @Test
    void testSaveResourceType_CreatesNewResourceType() {
        // Given
        ResourceType resourceType = createTestResourceType("test-rt-save", "Test RT Save", ResourceCategory.SHARED);

        // When
        ResourceType savedResourceType = resourceTypeRepository.save(resourceType);

        // Then
        assertNotNull(savedResourceType.id);
        createdResourceTypeIds.add(savedResourceType.id);
        assertEquals("test-rt-save", savedResourceType.name);
        assertEquals("Test RT Save", savedResourceType.displayName);
        assertEquals(ResourceCategory.SHARED, savedResourceType.category);
        assertNotNull(savedResourceType.createdAt);
        assertNotNull(savedResourceType.updatedAt);
    }

    @Test
    void testSaveResourceType_UpdatesExistingResourceType() {
        // Given
        ResourceType resourceType = createTestResourceType("test-rt-update", "Test RT Update", ResourceCategory.NON_SHARED);
        ResourceType savedResourceType = resourceTypeRepository.save(resourceType);
        createdResourceTypeIds.add(savedResourceType.id);

        // When
        savedResourceType.description = "Updated description";
        savedResourceType.enabled = false;
        ResourceType updatedResourceType = resourceTypeRepository.save(savedResourceType);

        // Then
        assertEquals(savedResourceType.id, updatedResourceType.id);
        assertEquals("Updated description", updatedResourceType.description);
        assertFalse(updatedResourceType.enabled);
    }

    @Test
    void testFindById_ReturnsResourceTypeWhenExists() {
        // Given
        ResourceType resourceType = createTestResourceType("test-rt-findbyid", "Test RT FindById", ResourceCategory.BOTH);
        ResourceType savedResourceType = resourceTypeRepository.save(resourceType);
        createdResourceTypeIds.add(savedResourceType.id);

        // When
        Optional<ResourceType> foundResourceType = resourceTypeRepository.findById(savedResourceType.id);

        // Then
        assertTrue(foundResourceType.isPresent());
        assertEquals(savedResourceType.id, foundResourceType.get().id);
        assertEquals("test-rt-findbyid", foundResourceType.get().name);
    }

    @Test
    void testFindById_ReturnsEmptyWhenNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        Optional<ResourceType> foundResourceType = resourceTypeRepository.findById(nonExistentId);

        // Then
        assertFalse(foundResourceType.isPresent());
    }

    @Test
    void testFindAll_ReturnsAllResourceTypes() {
        // Given
        ResourceType resourceType1 = createTestResourceType("test-rt-all-1", "Test RT All 1", ResourceCategory.SHARED);
        ResourceType resourceType2 = createTestResourceType("test-rt-all-2", "Test RT All 2", ResourceCategory.NON_SHARED);
        ResourceType savedResourceType1 = resourceTypeRepository.save(resourceType1);
        ResourceType savedResourceType2 = resourceTypeRepository.save(resourceType2);
        createdResourceTypeIds.add(savedResourceType1.id);
        createdResourceTypeIds.add(savedResourceType2.id);

        // When
        List<ResourceType> allResourceTypes = resourceTypeRepository.findAll();

        // Then
        assertTrue(allResourceTypes.size() >= 2);
        assertTrue(allResourceTypes.stream().anyMatch(rt -> rt.id.equals(savedResourceType1.id)));
        assertTrue(allResourceTypes.stream().anyMatch(rt -> rt.id.equals(savedResourceType2.id)));
    }

    @Test
    void testFindByName_ReturnsResourceTypeWhenExists() {
        // Given
        String uniqueName = "test-rt-unique-" + UUID.randomUUID();
        ResourceType resourceType = createTestResourceType(uniqueName, "Test RT Unique", ResourceCategory.BOTH);
        ResourceType savedResourceType = resourceTypeRepository.save(resourceType);
        createdResourceTypeIds.add(savedResourceType.id);

        // When
        Optional<ResourceType> foundResourceType = resourceTypeRepository.findByName(uniqueName);

        // Then
        assertTrue(foundResourceType.isPresent());
        assertEquals(uniqueName, foundResourceType.get().name);
        assertEquals(savedResourceType.id, foundResourceType.get().id);
    }

    @Test
    void testFindByName_ReturnsEmptyWhenNotExists() {
        // When
        Optional<ResourceType> foundResourceType = resourceTypeRepository.findByName("non-existent-rt");

        // Then
        assertFalse(foundResourceType.isPresent());
    }

    @Test
    void testFindByCategory_ReturnsResourceTypesInCategory() {
        // Given
        ResourceType sharedResourceType = createTestResourceType("test-rt-shared", "Test RT Shared", ResourceCategory.SHARED);
        ResourceType nonSharedResourceType = createTestResourceType("test-rt-nonshared", "Test RT NonShared", ResourceCategory.NON_SHARED);
        ResourceType bothResourceType = createTestResourceType("test-rt-both", "Test RT Both", ResourceCategory.BOTH);
        
        createdResourceTypeIds.add(resourceTypeRepository.save(sharedResourceType).id);
        createdResourceTypeIds.add(resourceTypeRepository.save(nonSharedResourceType).id);
        createdResourceTypeIds.add(resourceTypeRepository.save(bothResourceType).id);

        // When
        List<ResourceType> sharedResourceTypes = resourceTypeRepository.findByCategory(ResourceCategory.SHARED);

        // Then
        assertTrue(sharedResourceTypes.stream().anyMatch(rt -> rt.name.equals("test-rt-shared")));
        assertTrue(sharedResourceTypes.stream().allMatch(rt -> rt.category == ResourceCategory.SHARED));
    }

    @Test
    void testFindByEnabled_ReturnsEnabledResourceTypesOnly() {
        // Given
        ResourceType enabledResourceType = createTestResourceType("test-rt-enabled", "Test RT Enabled", ResourceCategory.SHARED);
        enabledResourceType.enabled = true;
        ResourceType disabledResourceType = createTestResourceType("test-rt-disabled", "Test RT Disabled", ResourceCategory.SHARED);
        disabledResourceType.enabled = false;
        
        createdResourceTypeIds.add(resourceTypeRepository.save(enabledResourceType).id);
        createdResourceTypeIds.add(resourceTypeRepository.save(disabledResourceType).id);

        // When
        List<ResourceType> enabledResourceTypes = resourceTypeRepository.findByEnabled(true);

        // Then
        assertTrue(enabledResourceTypes.stream().anyMatch(rt -> rt.name.equals("test-rt-enabled")));
        assertTrue(enabledResourceTypes.stream().allMatch(rt -> rt.enabled));
    }

    @Test
    void testFindByEnabled_ReturnsDisabledResourceTypesOnly() {
        // Given
        ResourceType enabledResourceType = createTestResourceType("test-rt-enabled-2", "Test RT Enabled 2", ResourceCategory.NON_SHARED);
        enabledResourceType.enabled = true;
        ResourceType disabledResourceType = createTestResourceType("test-rt-disabled-2", "Test RT Disabled 2", ResourceCategory.NON_SHARED);
        disabledResourceType.enabled = false;
        
        createdResourceTypeIds.add(resourceTypeRepository.save(enabledResourceType).id);
        createdResourceTypeIds.add(resourceTypeRepository.save(disabledResourceType).id);

        // When
        List<ResourceType> disabledResourceTypes = resourceTypeRepository.findByEnabled(false);

        // Then
        assertTrue(disabledResourceTypes.stream().anyMatch(rt -> rt.name.equals("test-rt-disabled-2")));
        assertTrue(disabledResourceTypes.stream().noneMatch(rt -> rt.enabled));
    }

    @Test
    void testFindByCategoryAndEnabled_ReturnsFilteredResourceTypes() {
        // Given
        ResourceType enabledSharedResourceType = createTestResourceType("test-rt-shared-enabled", "Test RT Shared Enabled", ResourceCategory.SHARED);
        enabledSharedResourceType.enabled = true;
        ResourceType disabledSharedResourceType = createTestResourceType("test-rt-shared-disabled", "Test RT Shared Disabled", ResourceCategory.SHARED);
        disabledSharedResourceType.enabled = false;
        ResourceType enabledNonSharedResourceType = createTestResourceType("test-rt-nonshared-enabled", "Test RT NonShared Enabled", ResourceCategory.NON_SHARED);
        enabledNonSharedResourceType.enabled = true;
        
        createdResourceTypeIds.add(resourceTypeRepository.save(enabledSharedResourceType).id);
        createdResourceTypeIds.add(resourceTypeRepository.save(disabledSharedResourceType).id);
        createdResourceTypeIds.add(resourceTypeRepository.save(enabledNonSharedResourceType).id);

        // When
        List<ResourceType> enabledSharedResourceTypes = resourceTypeRepository.findByCategoryAndEnabled(ResourceCategory.SHARED, true);

        // Then
        assertTrue(enabledSharedResourceTypes.stream().anyMatch(rt -> rt.name.equals("test-rt-shared-enabled")));
        assertTrue(enabledSharedResourceTypes.stream().allMatch(rt -> rt.category == ResourceCategory.SHARED && rt.enabled));
        assertFalse(enabledSharedResourceTypes.stream().anyMatch(rt -> rt.name.equals("test-rt-shared-disabled")));
        assertFalse(enabledSharedResourceTypes.stream().anyMatch(rt -> rt.name.equals("test-rt-nonshared-enabled")));
    }

    @Test
    void testExists_ReturnsTrueWhenResourceTypeExists() {
        // Given
        ResourceType resourceType = createTestResourceType("test-rt-exists", "Test RT Exists", ResourceCategory.BOTH);
        ResourceType savedResourceType = resourceTypeRepository.save(resourceType);
        createdResourceTypeIds.add(savedResourceType.id);

        // When
        boolean exists = resourceTypeRepository.exists(savedResourceType.id);

        // Then
        assertTrue(exists);
    }

    @Test
    void testExists_ReturnsFalseWhenResourceTypeNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        boolean exists = resourceTypeRepository.exists(nonExistentId);

        // Then
        assertFalse(exists);
    }

    @Test
    void testDelete_RemovesResourceType() {
        // Given
        ResourceType resourceType = createTestResourceType("test-rt-delete", "Test RT Delete", ResourceCategory.BOTH);
        ResourceType savedResourceType = resourceTypeRepository.save(resourceType);
        UUID resourceTypeId = savedResourceType.id;

        // When
        resourceTypeRepository.delete(savedResourceType);

        // Then
        assertFalse(resourceTypeRepository.exists(resourceTypeId));
        assertFalse(resourceTypeRepository.findById(resourceTypeId).isPresent());
    }

    @Test
    void testCount_ReturnsCorrectCount() {
        // Given
        long initialCount = resourceTypeRepository.count();
        ResourceType resourceType1 = createTestResourceType("test-rt-count-1", "Test RT Count 1", ResourceCategory.SHARED);
        ResourceType resourceType2 = createTestResourceType("test-rt-count-2", "Test RT Count 2", ResourceCategory.NON_SHARED);
        createdResourceTypeIds.add(resourceTypeRepository.save(resourceType1).id);
        createdResourceTypeIds.add(resourceTypeRepository.save(resourceType2).id);

        // When
        long newCount = resourceTypeRepository.count();

        // Then
        assertEquals(initialCount + 2, newCount);
    }

    @Test
    void testPreUpdateHook_UpdatesTimestamp() throws InterruptedException {
        // Given
        ResourceType resourceType = createTestResourceType("test-rt-timestamp", "Test RT Timestamp", ResourceCategory.BOTH);
        ResourceType savedResourceType = resourceTypeRepository.save(resourceType);
        createdResourceTypeIds.add(savedResourceType.id);
        LocalDateTime originalUpdatedAt = savedResourceType.updatedAt;

        // Wait a bit to ensure timestamp difference
        Thread.sleep(10);

        // When
        savedResourceType.description = "Updated to trigger preUpdate";
        ResourceType updatedResourceType = resourceTypeRepository.save(savedResourceType);

        // Then
        assertTrue(updatedResourceType.updatedAt.isAfter(originalUpdatedAt));
    }

    // Helper methods

    private ResourceType createTestResourceType(String name, String displayName, ResourceCategory category) {
        ResourceType resourceType = new ResourceType();
        resourceType.name = name;
        resourceType.displayName = displayName;
        resourceType.description = "Test resource type: " + name;
        resourceType.category = category;
        resourceType.enabled = true;
        resourceType.createdAt = LocalDateTime.now();
        resourceType.updatedAt = LocalDateTime.now();
        return resourceType;
    }
}
