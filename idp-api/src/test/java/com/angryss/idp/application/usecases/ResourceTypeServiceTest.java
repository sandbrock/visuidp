package com.angryss.idp.application.usecases;

import com.angryss.idp.application.dtos.ResourceTypeCreateDto;
import com.angryss.idp.application.dtos.ResourceTypeDto;
import com.angryss.idp.application.dtos.ResourceTypeUpdateDto;
import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.entities.PropertySchema;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.ResourceTypeCloudMapping;
import com.angryss.idp.domain.entities.StackResource;
import com.angryss.idp.domain.valueobjects.ResourceCategory;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class ResourceTypeServiceTest {

    @Inject
    ResourceTypeService resourceTypeService;

    @BeforeEach
    @Transactional
    public void cleanupTestData() {
        // Clean up any existing test data in correct order (children first)
        PropertySchema.deleteAll();
        ResourceTypeCloudMapping.deleteAll();
        StackResource.deleteAll();
        BlueprintResource.deleteAll();
        ResourceType.deleteAll();
    }

    @Test
    @Transactional
    public void testCreateResourceType() {
        // Given
        ResourceTypeCreateDto createDto = new ResourceTypeCreateDto();
        createDto.setName("MANAGED_CONTAINER_ORCHESTRATOR");
        createDto.setDisplayName("Managed Container Orchestrator");
        createDto.setDescription("Container orchestration platform");
        createDto.setCategory(ResourceCategory.SHARED);
        createDto.setEnabled(true);

        // When
        ResourceTypeDto result = resourceTypeService.create(createDto);

        // Then
        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals("MANAGED_CONTAINER_ORCHESTRATOR", result.getName());
        assertEquals("Managed Container Orchestrator", result.getDisplayName());
        assertEquals("Container orchestration platform", result.getDescription());
        assertEquals(ResourceCategory.SHARED, result.getCategory());
        assertTrue(result.getEnabled());
        assertNotNull(result.getCreatedAt());
        assertNotNull(result.getUpdatedAt());
    }

    @Test
    @Transactional
    public void testCreateDuplicateResourceTypeThrowsException() {
        // Given
        ResourceTypeCreateDto createDto = new ResourceTypeCreateDto();
        createDto.setName("RELATIONAL_DATABASE");
        createDto.setDisplayName("Relational Database");
        createDto.setDescription("SQL database");
        createDto.setCategory(ResourceCategory.NON_SHARED);
        createDto.setEnabled(true);

        resourceTypeService.create(createDto);

        // When/Then
        ResourceTypeCreateDto duplicateDto = new ResourceTypeCreateDto();
        duplicateDto.setName("RELATIONAL_DATABASE");
        duplicateDto.setDisplayName("Database Duplicate");
        duplicateDto.setDescription("Duplicate");
        duplicateDto.setCategory(ResourceCategory.BOTH);
        duplicateDto.setEnabled(false);

        assertThrows(IllegalArgumentException.class, () -> {
            resourceTypeService.create(duplicateDto);
        });
    }

    @Test
    @Transactional
    public void testListAll() {
        // Given
        createTestResourceType("MANAGED_CONTAINER_ORCHESTRATOR", "Container Orchestrator", ResourceCategory.SHARED, true);
        createTestResourceType("RELATIONAL_DATABASE", "Relational Database", ResourceCategory.NON_SHARED, false);
        createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH, true);

        // When
        List<ResourceTypeDto> result = resourceTypeService.listAll();

        // Then
        assertEquals(3, result.size());
    }

    @Test
    @Transactional
    public void testGetById() {
        // Given
        ResourceType resourceType = createTestResourceType("MANAGED_CONTAINER_ORCHESTRATOR", "Container Orchestrator", ResourceCategory.SHARED, true);

        // When
        ResourceTypeDto result = resourceTypeService.getById(resourceType.id);

        // Then
        assertNotNull(result);
        assertEquals(resourceType.id, result.getId());
        assertEquals("MANAGED_CONTAINER_ORCHESTRATOR", result.getName());
        assertEquals("Container Orchestrator", result.getDisplayName());
        assertEquals(ResourceCategory.SHARED, result.getCategory());
        assertTrue(result.getEnabled());
    }

    @Test
    @Transactional
    public void testGetByIdNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            resourceTypeService.getById(nonExistentId);
        });
    }

    @Test
    @Transactional
    public void testUpdate() {
        // Given
        ResourceType resourceType = createTestResourceType("MANAGED_CONTAINER_ORCHESTRATOR", "Container Orchestrator", ResourceCategory.SHARED, true);

        ResourceTypeUpdateDto updateDto = new ResourceTypeUpdateDto();
        updateDto.setDisplayName("Updated Orchestrator");
        updateDto.setDescription("Updated description");
        updateDto.setCategory(ResourceCategory.BOTH);
        updateDto.setEnabled(false);

        // When
        ResourceTypeDto result = resourceTypeService.update(resourceType.id, updateDto);

        // Then
        assertNotNull(result);
        assertEquals(resourceType.id, result.getId());
        assertEquals("MANAGED_CONTAINER_ORCHESTRATOR", result.getName()); // Name should not change
        assertEquals("Updated Orchestrator", result.getDisplayName());
        assertEquals("Updated description", result.getDescription());
        assertEquals(ResourceCategory.BOTH, result.getCategory());
        assertFalse(result.getEnabled());
    }

    @Test
    @Transactional
    public void testUpdatePartialFields() {
        // Given
        ResourceType resourceType = createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED, true);

        ResourceTypeUpdateDto updateDto = new ResourceTypeUpdateDto();
        updateDto.setDisplayName("Updated Database");
        // Description, category, and enabled are not set

        // When
        ResourceTypeDto result = resourceTypeService.update(resourceType.id, updateDto);

        // Then
        assertNotNull(result);
        assertEquals("Updated Database", result.getDisplayName());
        assertNull(result.getDescription()); // Should remain unchanged
        assertEquals(ResourceCategory.NON_SHARED, result.getCategory()); // Should remain unchanged
        assertTrue(result.getEnabled()); // Should remain unchanged
    }

    @Test
    @Transactional
    public void testUpdateNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();
        ResourceTypeUpdateDto updateDto = new ResourceTypeUpdateDto();
        updateDto.setDisplayName("Updated");

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            resourceTypeService.update(nonExistentId, updateDto);
        });
    }

    @Test
    @Transactional
    public void testToggleEnabled() {
        // Given
        ResourceType resourceType = createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH, true);

        // When - disable
        resourceTypeService.toggleEnabled(resourceType.id, false);

        // Then
        ResourceTypeDto result = resourceTypeService.getById(resourceType.id);
        assertFalse(result.getEnabled());

        // When - enable
        resourceTypeService.toggleEnabled(resourceType.id, true);

        // Then
        result = resourceTypeService.getById(resourceType.id);
        assertTrue(result.getEnabled());
    }

    @Test
    @Transactional
    public void testToggleEnabledNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When/Then
        assertThrows(NotFoundException.class, () -> {
            resourceTypeService.toggleEnabled(nonExistentId, false);
        });
    }

    @Test
    @Transactional
    public void testListByCategory() {
        // Given
        createTestResourceType("MANAGED_CONTAINER_ORCHESTRATOR", "Container Orchestrator", ResourceCategory.SHARED, true);
        createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED, true);
        createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH, true);
        createTestResourceType("QUEUE", "Queue", ResourceCategory.NON_SHARED, false);

        // When - filter by SHARED
        List<ResourceTypeDto> sharedResults = resourceTypeService.listByCategory(ResourceCategory.SHARED);

        // Then
        assertEquals(1, sharedResults.size());
        assertEquals("MANAGED_CONTAINER_ORCHESTRATOR", sharedResults.get(0).getName());

        // When - filter by NON_SHARED
        List<ResourceTypeDto> nonSharedResults = resourceTypeService.listByCategory(ResourceCategory.NON_SHARED);

        // Then
        assertEquals(2, nonSharedResults.size());
        assertTrue(nonSharedResults.stream().anyMatch(dto -> dto.getName().equals("RELATIONAL_DATABASE")));
        assertTrue(nonSharedResults.stream().anyMatch(dto -> dto.getName().equals("QUEUE")));

        // When - filter by BOTH
        List<ResourceTypeDto> bothResults = resourceTypeService.listByCategory(ResourceCategory.BOTH);

        // Then
        assertEquals(1, bothResults.size());
        assertEquals("STORAGE", bothResults.get(0).getName());
    }

    @Test
    @Transactional
    public void testListEnabledForUser() {
        // Given
        createTestResourceType("MANAGED_CONTAINER_ORCHESTRATOR", "Container Orchestrator", ResourceCategory.SHARED, true);
        createTestResourceType("RELATIONAL_DATABASE", "Database", ResourceCategory.NON_SHARED, false);
        createTestResourceType("STORAGE", "Storage", ResourceCategory.BOTH, true);
        createTestResourceType("QUEUE", "Queue", ResourceCategory.NON_SHARED, false);

        // When
        List<ResourceTypeDto> result = resourceTypeService.listEnabledForUser();

        // Then
        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(ResourceTypeDto::getEnabled));
        assertTrue(result.stream().anyMatch(dto -> dto.getName().equals("MANAGED_CONTAINER_ORCHESTRATOR")));
        assertTrue(result.stream().anyMatch(dto -> dto.getName().equals("STORAGE")));
        assertFalse(result.stream().anyMatch(dto -> dto.getName().equals("RELATIONAL_DATABASE")));
        assertFalse(result.stream().anyMatch(dto -> dto.getName().equals("QUEUE")));
    }

    @Test
    @Transactional
    public void testDtoMapping() {
        // Given
        ResourceType resourceType = createTestResourceType("CACHE", "Cache", ResourceCategory.NON_SHARED, true);

        // When
        ResourceTypeDto result = resourceTypeService.getById(resourceType.id);

        // Then - verify all fields are mapped correctly
        assertEquals(resourceType.id, result.getId());
        assertEquals(resourceType.name, result.getName());
        assertEquals(resourceType.displayName, result.getDisplayName());
        assertEquals(resourceType.description, result.getDescription());
        assertEquals(resourceType.category, result.getCategory());
        assertEquals(resourceType.enabled, result.getEnabled());
        assertEquals(resourceType.createdAt, result.getCreatedAt());
        assertEquals(resourceType.updatedAt, result.getUpdatedAt());
    }

    /**
     * Helper method to create a test resource type entity
     */
    private ResourceType createTestResourceType(String name, String displayName, ResourceCategory category, Boolean enabled) {
        ResourceType resourceType = new ResourceType();
        resourceType.name = name;
        resourceType.displayName = displayName;
        resourceType.description = null;
        resourceType.category = category;
        resourceType.enabled = enabled;
        resourceType.persist();
        return resourceType;
    }
}
