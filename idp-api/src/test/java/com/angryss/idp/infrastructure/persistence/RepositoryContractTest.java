package com.angryss.idp.infrastructure.persistence;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Abstract contract test for StackRepository implementations.
 * 
 * <p>This test class defines the expected behavior for all StackRepository implementations,
 * ensuring that both PostgreSQL and DynamoDB implementations produce identical results
 * for the same operations.</p>
 * 
 * <p>Concrete test classes should extend this class and provide:</p>
 * <ul>
 *   <li>A StackRepository instance via {@link #getRepository()}</li>
 *   <li>Setup and cleanup logic appropriate for their database</li>
 *   <li>Helper methods for creating test entities (Team, CloudProvider)</li>
 * </ul>
 * 
 * <p>Requirements: 8.4, 8.5</p>
 */
public abstract class RepositoryContractTest {

    /**
     * Get the repository instance to test.
     * Concrete test classes must implement this to provide the appropriate repository.
     */
    protected abstract StackRepository getRepository();

    /**
     * Create and persist a test team.
     * Concrete test classes must implement this based on their database.
     */
    protected abstract Team createAndPersistTeam(String name);

    /**
     * Create and persist a test cloud provider.
     * Concrete test classes must implement this based on their database.
     */
    protected abstract CloudProvider createAndPersistCloudProvider(String name);

    /**
     * Clean up test data after each test.
     * Concrete test classes must implement this based on their database.
     */
    protected abstract void cleanupTestData();

    // ========================================================================
    // CRUD Operations Tests
    // ========================================================================

    @Test
    public void testSave_CreatesNewStackWithGeneratedId() {
        // Given
        Stack stack = createTestStack("test-save-new", "user@example.com");
        assertNull(stack.getId(), "New stack should not have an ID");

        // When
        Stack saved = getRepository().save(stack);

        // Then
        assertNotNull(saved.getId(), "Saved stack must have an ID");
        assertEquals("test-save-new", saved.getName());
        assertEquals("user@example.com", saved.getCreatedBy());
        assertEquals(StackType.INFRASTRUCTURE, saved.getStackType());
        assertNotNull(saved.getCreatedAt(), "Saved stack must have createdAt");
        assertNotNull(saved.getUpdatedAt(), "Saved stack must have updatedAt");
    }

    @Test
    public void testSave_UpdatesExistingStack() {
        // Given
        Stack stack = createTestStack("test-save-update", "user@example.com");
        Stack saved = getRepository().save(stack);
        UUID originalId = saved.getId();
        LocalDateTime originalUpdatedAt = saved.getUpdatedAt();

        // When
        saved.setDescription("Updated description");
        saved.setName("test-save-updated");
        Stack updated = getRepository().save(saved);

        // Then
        assertEquals(originalId, updated.getId(), "ID should not change on update");
        assertEquals("test-save-updated", updated.getName());
        assertEquals("Updated description", updated.getDescription());
        assertTrue(updated.getUpdatedAt().isAfter(originalUpdatedAt) || 
                   updated.getUpdatedAt().equals(originalUpdatedAt),
                   "UpdatedAt should be updated or remain the same");
    }

    @Test
    public void testFindById_ReturnsStackWhenExists() {
        // Given
        Stack stack = createTestStack("test-findbyid-exists", "user@example.com");
        Stack saved = getRepository().save(stack);

        // When
        Optional<Stack> found = getRepository().findById(saved.getId());

        // Then
        assertTrue(found.isPresent(), "Stack should be found");
        assertEquals(saved.getId(), found.get().getId());
        assertEquals("test-findbyid-exists", found.get().getName());
        assertEquals("user@example.com", found.get().getCreatedBy());
    }

    @Test
    public void testFindById_ReturnsEmptyWhenNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        Optional<Stack> found = getRepository().findById(nonExistentId);

        // Then
        assertFalse(found.isPresent(), "Non-existent stack should not be found");
    }

    @Test
    public void testFindById_ReturnsEmptyForNullId() {
        // When
        Optional<Stack> found = getRepository().findById(null);

        // Then
        assertFalse(found.isPresent(), "Null ID should return empty");
    }

    @Test
    public void testDelete_RemovesStack() {
        // Given
        Stack stack = createTestStack("test-delete", "user@example.com");
        Stack saved = getRepository().save(stack);
        UUID stackId = saved.getId();

        // Verify it exists
        assertTrue(getRepository().exists(stackId), "Stack should exist before deletion");

        // When
        getRepository().delete(saved);

        // Then
        assertFalse(getRepository().exists(stackId), "Stack should not exist after deletion");
        assertFalse(getRepository().findById(stackId).isPresent(), 
                    "FindById should return empty after deletion");
    }

    @Test
    public void testDelete_HandlesNullStack() {
        // When/Then - should not throw exception
        assertDoesNotThrow(() -> getRepository().delete(null));
    }

    // ========================================================================
    // Query Operations Tests
    // ========================================================================

    @Test
    public void testFindAll_ReturnsAllStacks() {
        // Given
        long initialCount = getRepository().count();
        Stack stack1 = createTestStack("test-findall-1", "user@example.com");
        Stack stack2 = createTestStack("test-findall-2", "user@example.com");
        Stack stack3 = createTestStack("test-findall-3", "user@example.com");
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        // When
        List<Stack> all = getRepository().findAll();

        // Then
        assertEquals(initialCount + 3, all.size(), "Should return all stacks");
        assertTrue(all.stream().anyMatch(s -> "test-findall-1".equals(s.getName())));
        assertTrue(all.stream().anyMatch(s -> "test-findall-2".equals(s.getName())));
        assertTrue(all.stream().anyMatch(s -> "test-findall-3".equals(s.getName())));
    }

    @Test
    public void testFindByCreatedBy_ReturnsStacksForUser() {
        // Given
        String user1 = "user1@example.com";
        String user2 = "user2@example.com";
        
        Stack stack1 = createTestStack("test-createdby-u1-1", user1);
        Stack stack2 = createTestStack("test-createdby-u1-2", user1);
        Stack stack3 = createTestStack("test-createdby-u2", user2);
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        // When
        List<Stack> user1Stacks = getRepository().findByCreatedBy(user1);

        // Then
        long user1Count = user1Stacks.stream()
            .filter(s -> s.getName().startsWith("test-createdby-u1"))
            .count();
        assertEquals(2, user1Count, "Should return exactly 2 stacks for user1");
        assertTrue(user1Stacks.stream().allMatch(s -> user1.equals(s.getCreatedBy())),
                   "All returned stacks should belong to user1");
    }

    @Test
    public void testFindByCreatedBy_ReturnsEmptyForNonExistentUser() {
        // When
        List<Stack> stacks = getRepository().findByCreatedBy("nonexistent@example.com");

        // Then
        assertTrue(stacks.isEmpty(), "Should return empty list for non-existent user");
    }

    @Test
    public void testFindByCreatedBy_HandlesNullParameter() {
        // When
        List<Stack> stacks = getRepository().findByCreatedBy(null);

        // Then
        assertTrue(stacks.isEmpty(), "Should return empty list for null parameter");
    }

    @Test
    public void testFindByStackType_ReturnsStacksOfType() {
        // Given
        Stack infraStack = createTestStack("test-type-infra", "user@example.com");
        infraStack.setStackType(StackType.INFRASTRUCTURE);
        
        Stack apiStack = createTestStack("test-type-api", "user@example.com");
        apiStack.setStackType(StackType.RESTFUL_SERVERLESS);
        
        Stack webStack = createTestStack("test-type-web", "user@example.com");
        webStack.setStackType(StackType.JAVASCRIPT_WEB_APPLICATION);
        
        getRepository().save(infraStack);
        getRepository().save(apiStack);
        getRepository().save(webStack);

        // When
        List<Stack> infraStacks = getRepository().findByStackType(StackType.INFRASTRUCTURE);

        // Then
        assertTrue(infraStacks.stream().anyMatch(s -> "test-type-infra".equals(s.getName())),
                   "Should find the infrastructure stack");
        assertTrue(infraStacks.stream().allMatch(s -> StackType.INFRASTRUCTURE == s.getStackType()),
                   "All returned stacks should be of type INFRASTRUCTURE");
    }

    @Test
    public void testFindByStackType_HandlesNullParameter() {
        // When
        List<Stack> stacks = getRepository().findByStackType(null);

        // Then
        assertTrue(stacks.isEmpty(), "Should return empty list for null parameter");
    }

    @Test
    public void testFindByEphemeralPrefix_ReturnsMatchingStacks() {
        // Given
        String prefix = "ephemeral-test-" + UUID.randomUUID();
        
        Stack stack1 = createTestStack("test-eph-1", "user@example.com");
        stack1.setEphemeralPrefix(prefix);
        
        Stack stack2 = createTestStack("test-eph-2", "user@example.com");
        stack2.setEphemeralPrefix(prefix);
        
        Stack stack3 = createTestStack("test-eph-3", "user@example.com");
        stack3.setEphemeralPrefix("different-prefix");
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        // When
        List<Stack> ephemeralStacks = getRepository().findByEphemeralPrefix(prefix);

        // Then
        assertEquals(2, ephemeralStacks.size(), "Should return exactly 2 stacks with the prefix");
        assertTrue(ephemeralStacks.stream().allMatch(s -> prefix.equals(s.getEphemeralPrefix())),
                   "All returned stacks should have the correct prefix");
    }

    @Test
    public void testFindByEphemeralPrefix_HandlesNullParameter() {
        // When
        List<Stack> stacks = getRepository().findByEphemeralPrefix(null);

        // Then
        assertTrue(stacks.isEmpty(), "Should return empty list for null parameter");
    }

    @Test
    public void testExistsByNameAndCreatedBy_ReturnsTrueWhenExists() {
        // Given
        String name = "test-exists-" + UUID.randomUUID();
        String user = "user@example.com";
        
        Stack stack = createTestStack(name, user);
        getRepository().save(stack);

        // When
        boolean exists = getRepository().existsByNameAndCreatedBy(name, user);

        // Then
        assertTrue(exists, "Should return true when stack exists");
    }

    @Test
    public void testExistsByNameAndCreatedBy_ReturnsFalseWhenNotExists() {
        // When
        boolean exists = getRepository().existsByNameAndCreatedBy(
            "non-existent-stack", "user@example.com");

        // Then
        assertFalse(exists, "Should return false when stack does not exist");
    }

    @Test
    public void testExistsByNameAndCreatedBy_ReturnsFalseForDifferentUser() {
        // Given
        String name = "test-exists-user-" + UUID.randomUUID();
        Stack stack = createTestStack(name, "user1@example.com");
        getRepository().save(stack);

        // When
        boolean exists = getRepository().existsByNameAndCreatedBy(name, "user2@example.com");

        // Then
        assertFalse(exists, "Should return false for different user");
    }

    @Test
    public void testExistsByNameAndCreatedBy_HandlesNullParameters() {
        // When/Then
        assertFalse(getRepository().existsByNameAndCreatedBy(null, "user@example.com"),
                    "Should return false for null name");
        assertFalse(getRepository().existsByNameAndCreatedBy("stack", null),
                    "Should return false for null user");
        assertFalse(getRepository().existsByNameAndCreatedBy(null, null),
                    "Should return false for both null");
    }

    @Test
    public void testExists_ReturnsTrueWhenStackExists() {
        // Given
        Stack stack = createTestStack("test-exists-id", "user@example.com");
        Stack saved = getRepository().save(stack);

        // When
        boolean exists = getRepository().exists(saved.getId());

        // Then
        assertTrue(exists, "Should return true when stack exists");
    }

    @Test
    public void testExists_ReturnsFalseWhenStackNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        boolean exists = getRepository().exists(nonExistentId);

        // Then
        assertFalse(exists, "Should return false when stack does not exist");
    }

    @Test
    public void testCount_ReturnsCorrectCount() {
        // Given
        long initialCount = getRepository().count();
        
        Stack stack1 = createTestStack("test-count-1", "user@example.com");
        Stack stack2 = createTestStack("test-count-2", "user@example.com");
        Stack stack3 = createTestStack("test-count-3", "user@example.com");
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        // When
        long newCount = getRepository().count();

        // Then
        assertEquals(initialCount + 3, newCount, "Count should increase by 3");
    }

    // ========================================================================
    // Complex Field Tests
    // ========================================================================

    @Test
    public void testSaveWithConfiguration_PersistsMapField() {
        // Given
        Stack stack = createTestStack("test-config", "user@example.com");
        Map<String, Object> config = new HashMap<>();
        config.put("memory", "2GB");
        config.put("cpu", "2");
        config.put("replicas", 3);
        config.put("nested", Map.of("key", "value"));
        stack.setConfiguration(config);

        // When
        Stack saved = getRepository().save(stack);

        // Then
        Stack found = getRepository().findById(saved.getId()).orElseThrow();
        assertNotNull(found.getConfiguration(), "Configuration should not be null");
        assertEquals("2GB", found.getConfiguration().get("memory"));
        assertEquals("2", found.getConfiguration().get("cpu"));
        
        // Handle numeric types (might be Integer or Long depending on implementation)
        Object replicas = found.getConfiguration().get("replicas");
        assertTrue(replicas instanceof Number, "Replicas should be a number");
        assertEquals(3, ((Number) replicas).intValue());
    }

    @Test
    public void testSaveWithAllOptionalFields_PersistsCorrectly() {
        // Given
        Stack stack = createTestStack("test-optional", "user@example.com");
        stack.setDescription("Test description");
        stack.setProgrammingLanguage(ProgrammingLanguage.QUARKUS);
        stack.setIsPublic(true);
        stack.setEphemeralPrefix("test-prefix");

        // When
        Stack saved = getRepository().save(stack);

        // Then
        Stack found = getRepository().findById(saved.getId()).orElseThrow();
        assertEquals("Test description", found.getDescription());
        assertEquals(ProgrammingLanguage.QUARKUS, found.getProgrammingLanguage());
        assertTrue(found.getIsPublic());
        assertEquals("test-prefix", found.getEphemeralPrefix());
    }

    @Test
    public void testSaveWithNullOptionalFields_HandlesCorrectly() {
        // Given
        Stack stack = createTestStack("test-null-optional", "user@example.com");
        stack.setDescription(null);
        stack.setProgrammingLanguage(null);
        stack.setIsPublic(null);
        stack.setEphemeralPrefix(null);
        stack.setConfiguration(null);

        // When
        Stack saved = getRepository().save(stack);

        // Then
        Stack found = getRepository().findById(saved.getId()).orElseThrow();
        assertNull(found.getDescription());
        assertNull(found.getProgrammingLanguage());
        assertNull(found.getIsPublic());
        assertNull(found.getEphemeralPrefix());
        assertNull(found.getConfiguration());
    }

    // ========================================================================
    // Relationship Tests
    // ========================================================================

    @Test
    public void testFindByTeamId_ReturnsStacksForTeam() {
        // Given
        Team team = createAndPersistTeam("test-team-" + UUID.randomUUID());
        
        Stack stack1 = createTestStack("test-team-stack-1", "user@example.com");
        stack1.setTeam(team);
        
        Stack stack2 = createTestStack("test-team-stack-2", "user@example.com");
        stack2.setTeam(team);
        
        Stack stack3 = createTestStack("test-team-stack-3", "user@example.com");
        // stack3 has no team
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        // When
        List<Stack> teamStacks = getRepository().findByTeamId(team.getId());

        // Then
        assertEquals(2, teamStacks.size(), "Should return exactly 2 stacks for the team");
        assertTrue(teamStacks.stream().allMatch(s -> team.getId().equals(s.getTeam().getId())),
                   "All returned stacks should belong to the team");
    }

    // Tests for findByCloudProviderId and findByCloudProviderAndCreatedBy removed
    // as cloud provider field has been removed from Stack entity

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /**
     * Create a test stack with required fields.
     * Does not persist the stack.
     */
    protected Stack createTestStack(String name, String createdBy) {
        Stack stack = new Stack();
        stack.setName(name);
        stack.setCloudName(name.replace("-", "_"));
        stack.setRoutePath("/" + name.substring(0, Math.min(name.length(), 15)) + "/");
        stack.setStackType(StackType.INFRASTRUCTURE);
        stack.setCreatedBy(createdBy);
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        return stack;
    }
}
