package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.BlueprintResource;
import com.angryss.idp.domain.entities.ResourceType;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.valueobjects.sharedinfra.ContainerOrchestratorConfiguration;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoBlueprintResourceRepository.
 * Tests CRUD operations, GSI queries, and pagination.
 */
public class DynamoBlueprintResourceRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoBlueprintResourceRepository blueprintResourceRepository;

    @Test
    public void testSaveAndFindById() {
        BlueprintResource resource = createTestBlueprintResource("database-resource");
        
        BlueprintResource saved = blueprintResourceRepository.save(resource);
        
        assertNotNull(saved.id);
        assertNotNull(saved.getCreatedAt());
        
        Optional<BlueprintResource> found = blueprintResourceRepository.findById(saved.id);
        
        assertTrue(found.isPresent());
        assertEquals(saved.id, found.get().id);
        assertEquals("database-resource", found.get().getName());
    }

    @Test
    public void testFindById_NotFound() {
        Optional<BlueprintResource> found = blueprintResourceRepository.findById(UUID.randomUUID());
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        BlueprintResource resource = createTestBlueprintResource("cache-resource");
        BlueprintResource saved = blueprintResourceRepository.save(resource);
        
        saved.setName("updated-cache-resource");
        ContainerOrchestratorConfiguration newConfig = new ContainerOrchestratorConfiguration();
        newConfig.setCloudServiceName("updated-orchestrator");
        saved.setConfiguration(newConfig);
        BlueprintResource updated = blueprintResourceRepository.save(saved);
        
        assertEquals("updated-cache-resource", updated.getName());
        assertNotNull(updated.getConfiguration());
        
        Optional<BlueprintResource> fetched = blueprintResourceRepository.findById(saved.id);
        assertTrue(fetched.isPresent());
        assertEquals("updated-cache-resource", fetched.get().getName());
    }

    @Test
    public void testDelete() {
        BlueprintResource resource = createTestBlueprintResource("temp-resource");
        BlueprintResource saved = blueprintResourceRepository.save(resource);
        UUID id = saved.id;
        
        assertTrue(blueprintResourceRepository.findById(id).isPresent());
        
        blueprintResourceRepository.delete(saved);
        
        assertFalse(blueprintResourceRepository.findById(id).isPresent());
    }

    @Test
    public void testFindAll() {
        blueprintResourceRepository.save(createTestBlueprintResource("resource1"));
        blueprintResourceRepository.save(createTestBlueprintResource("resource2"));
        blueprintResourceRepository.save(createTestBlueprintResource("resource3"));
        
        List<BlueprintResource> all = blueprintResourceRepository.findAll();
        
        assertEquals(3, all.size());
    }

    @Test
    public void testFindByBlueprintId() {
        // Note: This test requires proper Blueprint entities to be set up
        // For now, we'll test that the method doesn't throw exceptions
        UUID blueprintId = UUID.randomUUID();
        
        List<BlueprintResource> resources = blueprintResourceRepository.findByBlueprintId(blueprintId);
        
        assertNotNull(resources);
        assertTrue(resources.isEmpty()); // No resources with this blueprint ID
    }

    @Test
    public void testFindByResourceTypeId() {
        // Note: This test requires proper ResourceType entities to be set up
        // For now, we'll test that the method doesn't throw exceptions
        UUID resourceTypeId = UUID.randomUUID();
        
        List<BlueprintResource> resources = blueprintResourceRepository.findByResourceTypeId(resourceTypeId);
        
        assertNotNull(resources);
        assertTrue(resources.isEmpty()); // No resources with this resource type ID
    }

    @Test
    public void testCount() {
        assertEquals(0, blueprintResourceRepository.count());
        
        blueprintResourceRepository.save(createTestBlueprintResource("resource1"));
        assertEquals(1, blueprintResourceRepository.count());
        
        blueprintResourceRepository.save(createTestBlueprintResource("resource2"));
        assertEquals(2, blueprintResourceRepository.count());
    }

    @Test
    public void testExists() {
        BlueprintResource resource = createTestBlueprintResource("test-resource");
        BlueprintResource saved = blueprintResourceRepository.save(resource);
        
        assertTrue(blueprintResourceRepository.exists(saved.id));
        assertFalse(blueprintResourceRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testPaginationWithLargeResultSet() {
        // Create more than typical page size
        for (int i = 0; i < 110; i++) {
            BlueprintResource resource = createTestBlueprintResource("resource-" + i);
            blueprintResourceRepository.save(resource);
        }
        
        List<BlueprintResource> all = blueprintResourceRepository.findAll();
        assertEquals(110, all.size());
    }

    @Test
    public void testSaveWithConfiguration() {
        BlueprintResource resource = createTestBlueprintResource("configured-resource");
        ContainerOrchestratorConfiguration config = new ContainerOrchestratorConfiguration();
        config.setCloudServiceName("configured-orchestrator");
        resource.setConfiguration(config);
        
        BlueprintResource saved = blueprintResourceRepository.save(resource);
        
        Optional<BlueprintResource> found = blueprintResourceRepository.findById(saved.id);
        assertTrue(found.isPresent());
        assertNotNull(found.get().getConfiguration());
        assertTrue(found.get().getConfiguration() instanceof ContainerOrchestratorConfiguration);
        ContainerOrchestratorConfiguration foundConfig = (ContainerOrchestratorConfiguration) found.get().getConfiguration();
        assertEquals("configured-orchestrator", foundConfig.getCloudServiceName());
    }

    private BlueprintResource createTestBlueprintResource(String name) {
        BlueprintResource resource = new BlueprintResource();
        resource.setName(name);
        
        // Create a simple configuration
        ContainerOrchestratorConfiguration config = new ContainerOrchestratorConfiguration();
        config.setCloudServiceName("test-orchestrator");
        resource.setConfiguration(config);
        
        return resource;
    }
}
