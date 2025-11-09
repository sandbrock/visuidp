package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.repositories.BlueprintRepository;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoBlueprintRepository.
 * Tests CRUD operations, GSI queries, and transaction behavior against DynamoDB Local.
 */
public class DynamoBlueprintRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoBlueprintRepository blueprintRepository;

    @Test
    public void testSaveAndFindById() {
        // Create test blueprint
        Blueprint blueprint = createTestBlueprint("test-blueprint");

        // Save blueprint
        Blueprint saved = blueprintRepository.save(blueprint);

        // Verify ID was generated
        assertNotNull(saved.getId());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());

        // Find by ID
        Optional<Blueprint> found = blueprintRepository.findById(saved.getId());

        // Verify
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
        assertEquals("test-blueprint", found.get().getName());
        assertTrue(found.get().getIsActive());
    }

    @Test
    public void testFindById_NotFound() {
        UUID nonExistentId = UUID.randomUUID();
        Optional<Blueprint> found = blueprintRepository.findById(nonExistentId);
        assertFalse(found.isPresent());
    }

    @Test
    public void testFindById_NullId() {
        Optional<Blueprint> found = blueprintRepository.findById(null);
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        // Create and save blueprint
        Blueprint blueprint = createTestBlueprint("original-name");
        Blueprint saved = blueprintRepository.save(blueprint);
        LocalDateTime originalUpdatedAt = saved.getUpdatedAt();

        // Update blueprint
        saved.setName("updated-name");
        saved.setDescription("Updated description");
        saved.setIsActive(false);
        Blueprint updated = blueprintRepository.save(saved);

        // Verify update
        assertEquals("updated-name", updated.getName());
        assertEquals("Updated description", updated.getDescription());
        assertFalse(updated.getIsActive());
        assertTrue(updated.getUpdatedAt().isAfter(originalUpdatedAt));

        // Verify by fetching again
        Optional<Blueprint> fetched = blueprintRepository.findById(saved.getId());
        assertTrue(fetched.isPresent());
        assertEquals("updated-name", fetched.get().getName());
        assertEquals("Updated description", fetched.get().getDescription());
        assertFalse(fetched.get().getIsActive());
    }

    @Test
    public void testDelete() {
        // Create and save blueprint
        Blueprint blueprint = createTestBlueprint("to-delete");
        Blueprint saved = blueprintRepository.save(blueprint);
        UUID id = saved.getId();

        // Verify it exists
        assertTrue(blueprintRepository.findById(id).isPresent());

        // Delete
        blueprintRepository.delete(saved);

        // Verify deletion
        assertFalse(blueprintRepository.findById(id).isPresent());
    }

    @Test
    public void testDelete_NullBlueprint() {
        // Should not throw exception
        assertDoesNotThrow(() -> blueprintRepository.delete(null));
    }

    @Test
    public void testFindAll() {
        // Create multiple blueprints
        Blueprint blueprint1 = createTestBlueprint("blueprint1");
        Blueprint blueprint2 = createTestBlueprint("blueprint2");
        Blueprint blueprint3 = createTestBlueprint("blueprint3");

        blueprintRepository.save(blueprint1);
        blueprintRepository.save(blueprint2);
        blueprintRepository.save(blueprint3);

        // Find all
        List<Blueprint> all = blueprintRepository.findAll();

        // Verify
        assertEquals(3, all.size());
        assertTrue(all.stream().anyMatch(b -> b.getName().equals("blueprint1")));
        assertTrue(all.stream().anyMatch(b -> b.getName().equals("blueprint2")));
        assertTrue(all.stream().anyMatch(b -> b.getName().equals("blueprint3")));
    }

    @Test
    public void testFindAll_Empty() {
        List<Blueprint> all = blueprintRepository.findAll();
        assertTrue(all.isEmpty());
    }

    @Test
    public void testFindByName() {
        // Create and save blueprints
        Blueprint blueprint1 = createTestBlueprint("unique-blueprint");
        Blueprint blueprint2 = createTestBlueprint("another-blueprint");

        blueprintRepository.save(blueprint1);
        blueprintRepository.save(blueprint2);

        // Find by name (uses GSI)
        Optional<Blueprint> found = blueprintRepository.findByName("unique-blueprint");

        // Verify
        assertTrue(found.isPresent());
        assertEquals("unique-blueprint", found.get().getName());
    }

    @Test
    public void testFindByName_NotFound() {
        Blueprint blueprint = createTestBlueprint("existing-blueprint");
        blueprintRepository.save(blueprint);

        Optional<Blueprint> found = blueprintRepository.findByName("nonexistent");
        assertFalse(found.isPresent());
    }

    @Test
    public void testFindByName_Null() {
        Optional<Blueprint> found = blueprintRepository.findByName(null);
        assertFalse(found.isPresent());
    }

    @Test
    public void testFindByIsActive() {
        // Create blueprints with different active states
        Blueprint active1 = createTestBlueprint("active1");
        active1.setIsActive(true);

        Blueprint active2 = createTestBlueprint("active2");
        active2.setIsActive(true);

        Blueprint inactive = createTestBlueprint("inactive");
        inactive.setIsActive(false);

        blueprintRepository.save(active1);
        blueprintRepository.save(active2);
        blueprintRepository.save(inactive);

        // Query by isActive (uses GSI)
        List<Blueprint> activeBlueprints = blueprintRepository.findByIsActive(true);

        // Verify
        assertEquals(2, activeBlueprints.size());
        assertTrue(activeBlueprints.stream().allMatch(Blueprint::getIsActive));
        assertTrue(activeBlueprints.stream().anyMatch(b -> b.getName().equals("active1")));
        assertTrue(activeBlueprints.stream().anyMatch(b -> b.getName().equals("active2")));

        // Query inactive
        List<Blueprint> inactiveBlueprints = blueprintRepository.findByIsActive(false);
        assertEquals(1, inactiveBlueprints.size());
        assertEquals("inactive", inactiveBlueprints.get(0).getName());
    }

    @Test
    public void testFindByIsActive_Null() {
        List<Blueprint> results = blueprintRepository.findByIsActive(null);
        assertTrue(results.isEmpty());
    }

    @Test
    public void testCount() {
        // Initially empty
        assertEquals(0, blueprintRepository.count());

        // Add blueprints
        blueprintRepository.save(createTestBlueprint("blueprint1"));
        assertEquals(1, blueprintRepository.count());

        blueprintRepository.save(createTestBlueprint("blueprint2"));
        assertEquals(2, blueprintRepository.count());

        blueprintRepository.save(createTestBlueprint("blueprint3"));
        assertEquals(3, blueprintRepository.count());
    }

    @Test
    public void testExists() {
        Blueprint blueprint = createTestBlueprint("test-blueprint");
        Blueprint saved = blueprintRepository.save(blueprint);

        assertTrue(blueprintRepository.exists(saved.getId()));
        assertFalse(blueprintRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testSaveWithDescription() {
        // Create blueprint with description
        Blueprint blueprint = createTestBlueprint("described-blueprint");
        blueprint.setDescription("This is a detailed description of the blueprint");

        // Save
        Blueprint saved = blueprintRepository.save(blueprint);

        // Retrieve and verify
        Optional<Blueprint> found = blueprintRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("This is a detailed description of the blueprint", found.get().getDescription());
    }

    @Test
    public void testSaveWithNullDescription() {
        // Create blueprint without description
        Blueprint blueprint = createTestBlueprint("no-description");
        blueprint.setDescription(null);

        // Save
        Blueprint saved = blueprintRepository.save(blueprint);

        // Retrieve and verify
        Optional<Blueprint> found = blueprintRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertNull(found.get().getDescription());
    }

    @Test
    public void testMultipleSaveOperations() {
        // Create blueprint
        Blueprint blueprint = createTestBlueprint("multi-save");
        
        // First save
        Blueprint saved1 = blueprintRepository.save(blueprint);
        UUID id = saved1.getId();
        LocalDateTime firstUpdatedAt = saved1.getUpdatedAt();

        // Update and save again
        saved1.setDescription("First update");
        Blueprint saved2 = blueprintRepository.save(saved1);
        assertEquals(id, saved2.getId());
        assertTrue(saved2.getUpdatedAt().isAfter(firstUpdatedAt));

        // Update and save again
        saved2.setDescription("Second update");
        Blueprint saved3 = blueprintRepository.save(saved2);
        assertEquals(id, saved3.getId());
        assertTrue(saved3.getUpdatedAt().isAfter(saved2.getUpdatedAt()));

        // Verify final state
        Optional<Blueprint> found = blueprintRepository.findById(id);
        assertTrue(found.isPresent());
        assertEquals("Second update", found.get().getDescription());
    }

    @Test
    public void testFindByIsActive_EmptyResult() {
        // Create only active blueprints
        Blueprint active = createTestBlueprint("active");
        active.setIsActive(true);
        blueprintRepository.save(active);

        // Query for inactive
        List<Blueprint> inactive = blueprintRepository.findByIsActive(false);
        assertTrue(inactive.isEmpty());
    }

    @Test
    public void testSavePreservesTimestamps() {
        // Create blueprint with specific timestamps
        Blueprint blueprint = createTestBlueprint("timestamp-test");
        LocalDateTime specificTime = LocalDateTime.of(2024, 1, 1, 12, 0);
        blueprint.setCreatedAt(specificTime);

        // Save
        Blueprint saved = blueprintRepository.save(blueprint);

        // Verify createdAt is preserved but updatedAt is set to now
        assertEquals(specificTime, saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    /**
     * Helper method to create a test blueprint with required fields.
     */
    private Blueprint createTestBlueprint(String name) {
        Blueprint blueprint = new Blueprint();
        blueprint.setName(name);
        blueprint.setIsActive(true);
        blueprint.setCreatedAt(LocalDateTime.now());
        blueprint.setUpdatedAt(LocalDateTime.now());
        return blueprint;
    }
}
