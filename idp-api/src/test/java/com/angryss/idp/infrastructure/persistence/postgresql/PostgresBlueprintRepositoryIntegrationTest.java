package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.repositories.BlueprintRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PostgresBlueprintRepository.
 * Tests CRUD operations, query methods, and transaction behavior using H2 in-memory database.
 */
@QuarkusTest
class PostgresBlueprintRepositoryIntegrationTest {

    @Inject
    BlueprintRepository blueprintRepository;

    private List<UUID> createdBlueprintIds = new ArrayList<>();
    private List<UUID> createdCloudProviderIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        // Clean up in reverse order to respect foreign key constraints
        for (UUID id : createdBlueprintIds) {
            blueprintRepository.findById(id).ifPresent(blueprint -> blueprintRepository.delete(blueprint));
        }
        for (UUID id : createdCloudProviderIds) {
            CloudProvider.<CloudProvider>findByIdOptional(id).ifPresent(cp -> cp.delete());
        }
        createdBlueprintIds.clear();
        createdCloudProviderIds.clear();
    }

    @Test
    void testSaveBlueprint_CreatesNewBlueprint() {
        // Given
        Blueprint blueprint = createTestBlueprint("test-blueprint-save");

        // When
        Blueprint savedBlueprint = blueprintRepository.save(blueprint);

        // Then
        assertNotNull(savedBlueprint.getId());
        createdBlueprintIds.add(savedBlueprint.getId());
        assertEquals("test-blueprint-save", savedBlueprint.getName());
        assertNotNull(savedBlueprint.getCreatedAt());
        assertNotNull(savedBlueprint.getUpdatedAt());
        assertTrue(savedBlueprint.getIsActive());
    }

    @Test
    void testSaveBlueprint_UpdatesExistingBlueprint() {
        // Given
        Blueprint blueprint = createTestBlueprint("test-blueprint-update");
        Blueprint savedBlueprint = blueprintRepository.save(blueprint);
        createdBlueprintIds.add(savedBlueprint.getId());

        // When
        savedBlueprint.setDescription("Updated description");
        savedBlueprint.setIsActive(false);
        Blueprint updatedBlueprint = blueprintRepository.save(savedBlueprint);

        // Then
        assertEquals(savedBlueprint.getId(), updatedBlueprint.getId());
        assertEquals("Updated description", updatedBlueprint.getDescription());
        assertFalse(updatedBlueprint.getIsActive());
    }

    @Test
    void testFindById_ReturnsBlueprintWhenExists() {
        // Given
        Blueprint blueprint = createTestBlueprint("test-blueprint-findbyid");
        Blueprint savedBlueprint = blueprintRepository.save(blueprint);
        createdBlueprintIds.add(savedBlueprint.getId());

        // When
        Optional<Blueprint> foundBlueprint = blueprintRepository.findById(savedBlueprint.getId());

        // Then
        assertTrue(foundBlueprint.isPresent());
        assertEquals(savedBlueprint.getId(), foundBlueprint.get().getId());
        assertEquals("test-blueprint-findbyid", foundBlueprint.get().getName());
    }

    @Test
    void testFindById_ReturnsEmptyWhenNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        Optional<Blueprint> foundBlueprint = blueprintRepository.findById(nonExistentId);

        // Then
        assertFalse(foundBlueprint.isPresent());
    }

    @Test
    void testFindAll_ReturnsAllBlueprints() {
        // Given
        Blueprint blueprint1 = createTestBlueprint("test-blueprint-all-1");
        Blueprint blueprint2 = createTestBlueprint("test-blueprint-all-2");
        Blueprint savedBlueprint1 = blueprintRepository.save(blueprint1);
        Blueprint savedBlueprint2 = blueprintRepository.save(blueprint2);
        createdBlueprintIds.add(savedBlueprint1.getId());
        createdBlueprintIds.add(savedBlueprint2.getId());

        // When
        List<Blueprint> allBlueprints = blueprintRepository.findAll();

        // Then
        assertTrue(allBlueprints.size() >= 2);
        assertTrue(allBlueprints.stream().anyMatch(b -> b.getId().equals(savedBlueprint1.getId())));
        assertTrue(allBlueprints.stream().anyMatch(b -> b.getId().equals(savedBlueprint2.getId())));
    }

    @Test
    void testFindByName_ReturnsBlueprintWhenExists() {
        // Given
        String uniqueName = "test-blueprint-unique-" + UUID.randomUUID();
        Blueprint blueprint = createTestBlueprint(uniqueName);
        Blueprint savedBlueprint = blueprintRepository.save(blueprint);
        createdBlueprintIds.add(savedBlueprint.getId());

        // When
        Optional<Blueprint> foundBlueprint = blueprintRepository.findByName(uniqueName);

        // Then
        assertTrue(foundBlueprint.isPresent());
        assertEquals(uniqueName, foundBlueprint.get().getName());
        assertEquals(savedBlueprint.getId(), foundBlueprint.get().getId());
    }

    @Test
    void testFindByName_ReturnsEmptyWhenNotExists() {
        // When
        Optional<Blueprint> foundBlueprint = blueprintRepository.findByName("non-existent-blueprint");

        // Then
        assertFalse(foundBlueprint.isPresent());
    }

    @Test
    void testFindByIsActive_ReturnsActiveBlueprintsOnly() {
        // Given
        Blueprint activeBlueprint = createTestBlueprint("test-blueprint-active");
        activeBlueprint.setIsActive(true);
        Blueprint inactiveBlueprint = createTestBlueprint("test-blueprint-inactive");
        inactiveBlueprint.setIsActive(false);
        
        createdBlueprintIds.add(blueprintRepository.save(activeBlueprint).getId());
        createdBlueprintIds.add(blueprintRepository.save(inactiveBlueprint).getId());

        // When
        List<Blueprint> activeBlueprints = blueprintRepository.findByIsActive(true);

        // Then
        assertTrue(activeBlueprints.stream().anyMatch(b -> b.getName().equals("test-blueprint-active")));
        assertTrue(activeBlueprints.stream().allMatch(Blueprint::getIsActive));
    }

    @Test
    void testFindByIsActive_ReturnsInactiveBlueprintsOnly() {
        // Given
        Blueprint activeBlueprint = createTestBlueprint("test-blueprint-active-2");
        activeBlueprint.setIsActive(true);
        Blueprint inactiveBlueprint = createTestBlueprint("test-blueprint-inactive-2");
        inactiveBlueprint.setIsActive(false);
        
        createdBlueprintIds.add(blueprintRepository.save(activeBlueprint).getId());
        createdBlueprintIds.add(blueprintRepository.save(inactiveBlueprint).getId());

        // When
        List<Blueprint> inactiveBlueprints = blueprintRepository.findByIsActive(false);

        // Then
        assertTrue(inactiveBlueprints.stream().anyMatch(b -> b.getName().equals("test-blueprint-inactive-2")));
        assertTrue(inactiveBlueprints.stream().noneMatch(Blueprint::getIsActive));
    }

    @Test
    @Transactional
    void testFindBySupportedCloudProviderId_ReturnsBlueprintsForProvider() {
        // Given
        CloudProvider provider = createTestCloudProvider("test-provider-blueprints");
        provider.persist();
        createdCloudProviderIds.add(provider.id);

        Blueprint blueprint1 = createTestBlueprint("test-blueprint-cp-1");
        blueprint1.getSupportedCloudProviders().add(provider);
        Blueprint blueprint2 = createTestBlueprint("test-blueprint-cp-2");
        blueprint2.getSupportedCloudProviders().add(provider);
        Blueprint blueprint3 = createTestBlueprint("test-blueprint-cp-3");
        // blueprint3 does not have the provider
        
        createdBlueprintIds.add(blueprintRepository.save(blueprint1).getId());
        createdBlueprintIds.add(blueprintRepository.save(blueprint2).getId());
        createdBlueprintIds.add(blueprintRepository.save(blueprint3).getId());

        // When
        List<Blueprint> providerBlueprints = blueprintRepository.findBySupportedCloudProviderId(provider.id);

        // Then
        assertEquals(2, providerBlueprints.size());
        assertTrue(providerBlueprints.stream().anyMatch(b -> b.getName().equals("test-blueprint-cp-1")));
        assertTrue(providerBlueprints.stream().anyMatch(b -> b.getName().equals("test-blueprint-cp-2")));
        assertFalse(providerBlueprints.stream().anyMatch(b -> b.getName().equals("test-blueprint-cp-3")));
    }

    @Test
    @Transactional
    void testSaveWithMultipleCloudProviders_PersistsManyToManyRelationship() {
        // Given
        CloudProvider provider1 = createTestCloudProvider("test-provider-1");
        CloudProvider provider2 = createTestCloudProvider("test-provider-2");
        provider1.persist();
        provider2.persist();
        createdCloudProviderIds.add(provider1.id);
        createdCloudProviderIds.add(provider2.id);

        Blueprint blueprint = createTestBlueprint("test-blueprint-multi-cp");
        blueprint.getSupportedCloudProviders().add(provider1);
        blueprint.getSupportedCloudProviders().add(provider2);

        // When
        Blueprint savedBlueprint = blueprintRepository.save(blueprint);
        createdBlueprintIds.add(savedBlueprint.getId());

        // Then
        Blueprint foundBlueprint = blueprintRepository.findById(savedBlueprint.getId()).orElseThrow();
        assertEquals(2, foundBlueprint.getSupportedCloudProviders().size());
        assertTrue(foundBlueprint.getSupportedCloudProviders().stream()
            .anyMatch(cp -> cp.id.equals(provider1.id)));
        assertTrue(foundBlueprint.getSupportedCloudProviders().stream()
            .anyMatch(cp -> cp.id.equals(provider2.id)));
    }

    @Test
    void testExists_ReturnsTrueWhenBlueprintExists() {
        // Given
        Blueprint blueprint = createTestBlueprint("test-blueprint-exists");
        Blueprint savedBlueprint = blueprintRepository.save(blueprint);
        createdBlueprintIds.add(savedBlueprint.getId());

        // When
        boolean exists = blueprintRepository.exists(savedBlueprint.getId());

        // Then
        assertTrue(exists);
    }

    @Test
    void testExists_ReturnsFalseWhenBlueprintNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        boolean exists = blueprintRepository.exists(nonExistentId);

        // Then
        assertFalse(exists);
    }

    @Test
    void testDelete_RemovesBlueprint() {
        // Given
        Blueprint blueprint = createTestBlueprint("test-blueprint-delete");
        Blueprint savedBlueprint = blueprintRepository.save(blueprint);
        UUID blueprintId = savedBlueprint.getId();

        // When
        blueprintRepository.delete(savedBlueprint);

        // Then
        assertFalse(blueprintRepository.exists(blueprintId));
        assertFalse(blueprintRepository.findById(blueprintId).isPresent());
    }

    @Test
    void testCount_ReturnsCorrectCount() {
        // Given
        long initialCount = blueprintRepository.count();
        Blueprint blueprint1 = createTestBlueprint("test-blueprint-count-1");
        Blueprint blueprint2 = createTestBlueprint("test-blueprint-count-2");
        createdBlueprintIds.add(blueprintRepository.save(blueprint1).getId());
        createdBlueprintIds.add(blueprintRepository.save(blueprint2).getId());

        // When
        long newCount = blueprintRepository.count();

        // Then
        assertEquals(initialCount + 2, newCount);
    }

    @Test
    void testPreUpdateHook_UpdatesTimestamp() throws InterruptedException {
        // Given
        Blueprint blueprint = createTestBlueprint("test-blueprint-timestamp");
        Blueprint savedBlueprint = blueprintRepository.save(blueprint);
        createdBlueprintIds.add(savedBlueprint.getId());
        LocalDateTime originalUpdatedAt = savedBlueprint.getUpdatedAt();

        // Wait a bit to ensure timestamp difference
        Thread.sleep(10);

        // When
        savedBlueprint.setDescription("Updated to trigger preUpdate");
        Blueprint updatedBlueprint = blueprintRepository.save(savedBlueprint);

        // Then
        assertTrue(updatedBlueprint.getUpdatedAt().isAfter(originalUpdatedAt));
    }

    // Helper methods

    private Blueprint createTestBlueprint(String name) {
        Blueprint blueprint = new Blueprint();
        blueprint.setName(name);
        blueprint.setDescription("Test blueprint: " + name);
        blueprint.setIsActive(true);
        blueprint.setCreatedAt(LocalDateTime.now());
        blueprint.setUpdatedAt(LocalDateTime.now());
        return blueprint;
    }

    private CloudProvider createTestCloudProvider(String name) {
        CloudProvider provider = new CloudProvider();
        provider.name = name;
        provider.displayName = name;
        provider.enabled = true;
        provider.createdAt = LocalDateTime.now();
        provider.updatedAt = LocalDateTime.now();
        return provider;
    }
}
