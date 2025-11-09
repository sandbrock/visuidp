package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.valueobjects.StackType;
import com.angryss.idp.infrastructure.persistence.dynamodb.mapper.DynamoEntityMapper;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoDB transaction behavior.
 * Tests atomic operations using DynamoTransactionManager.
 */
public class DynamoTransactionTest extends DynamoDbTestBase {

    @Inject
    DynamoStackRepository stackRepository;

    @Inject
    DynamoBlueprintRepository blueprintRepository;

    @Inject
    DynamoTeamRepository teamRepository;

    @Inject
    DynamoTransactionManager transactionManager;

    @Inject
    DynamoEntityMapper entityMapper;

    @Test
    public void testSaveAllStacks_Success() {
        // Create multiple stacks
        List<Stack> stacks = Arrays.asList(
            createTestStack("stack1", "user1"),
            createTestStack("stack2", "user1"),
            createTestStack("stack3", "user1")
        );

        // Save all in transaction
        List<Stack> saved = stackRepository.saveAll(stacks);

        // Verify all were saved
        assertEquals(3, saved.size());
        assertTrue(saved.stream().allMatch(s -> s.getId() != null));

        // Verify all can be retrieved
        for (Stack stack : saved) {
            Optional<Stack> found = stackRepository.findById(stack.getId());
            assertTrue(found.isPresent());
        }

        // Verify count
        assertEquals(3, stackRepository.count());
    }

    @Test
    public void testSaveAllStacks_EmptyList() {
        List<Stack> saved = stackRepository.saveAll(Collections.emptyList());
        assertTrue(saved.isEmpty());
    }

    @Test
    public void testSaveAllStacks_NullList() {
        List<Stack> saved = stackRepository.saveAll(null);
        assertTrue(saved.isEmpty());
    }

    @Test
    public void testDeleteAllStacks_Success() {
        // Create and save stacks
        Stack stack1 = stackRepository.save(createTestStack("stack1", "user1"));
        Stack stack2 = stackRepository.save(createTestStack("stack2", "user1"));
        Stack stack3 = stackRepository.save(createTestStack("stack3", "user1"));

        // Verify they exist
        assertEquals(3, stackRepository.count());

        // Delete all in transaction
        stackRepository.deleteAll(Arrays.asList(stack1, stack2, stack3));

        // Verify all were deleted
        assertEquals(0, stackRepository.count());
        assertFalse(stackRepository.findById(stack1.getId()).isPresent());
        assertFalse(stackRepository.findById(stack2.getId()).isPresent());
        assertFalse(stackRepository.findById(stack3.getId()).isPresent());
    }

    @Test
    public void testDeleteAllStacks_EmptyList() {
        // Should not throw exception
        assertDoesNotThrow(() -> stackRepository.deleteAll(Collections.emptyList()));
    }

    @Test
    public void testDeleteAllStacks_NullList() {
        // Should not throw exception
        assertDoesNotThrow(() -> stackRepository.deleteAll(null));
    }

    @Test
    public void testSaveAllBlueprints_Success() {
        // Create multiple blueprints
        List<Blueprint> blueprints = Arrays.asList(
            createTestBlueprint("blueprint1"),
            createTestBlueprint("blueprint2"),
            createTestBlueprint("blueprint3")
        );

        // Save all in transaction
        List<Blueprint> saved = blueprintRepository.saveAll(blueprints);

        // Verify all were saved
        assertEquals(3, saved.size());
        assertTrue(saved.stream().allMatch(b -> b.getId() != null));

        // Verify all can be retrieved
        for (Blueprint blueprint : saved) {
            Optional<Blueprint> found = blueprintRepository.findById(blueprint.getId());
            assertTrue(found.isPresent());
        }

        // Verify count
        assertEquals(3, blueprintRepository.count());
    }

    @Test
    public void testDeleteAllBlueprints_Success() {
        // Create and save blueprints
        Blueprint bp1 = blueprintRepository.save(createTestBlueprint("bp1"));
        Blueprint bp2 = blueprintRepository.save(createTestBlueprint("bp2"));

        // Verify they exist
        assertEquals(2, blueprintRepository.count());

        // Delete all in transaction
        blueprintRepository.deleteAll(Arrays.asList(bp1, bp2));

        // Verify all were deleted
        assertEquals(0, blueprintRepository.count());
    }

    @Test
    public void testSaveAllTeams_Success() {
        // Create multiple teams
        List<Team> teams = Arrays.asList(
            createTestTeam("team1"),
            createTestTeam("team2"),
            createTestTeam("team3")
        );

        // Save all in transaction
        List<Team> saved = teamRepository.saveAll(teams);

        // Verify all were saved
        assertEquals(3, saved.size());
        assertTrue(saved.stream().allMatch(t -> t.getId() != null));

        // Verify all can be retrieved
        for (Team team : saved) {
            Optional<Team> found = teamRepository.findById(team.getId());
            assertTrue(found.isPresent());
        }

        // Verify count
        assertEquals(3, teamRepository.count());
    }

    @Test
    public void testDeleteAllTeams_Success() {
        // Create and save teams
        Team team1 = teamRepository.save(createTestTeam("team1"));
        Team team2 = teamRepository.save(createTestTeam("team2"));

        // Verify they exist
        assertEquals(2, teamRepository.count());

        // Delete all in transaction
        teamRepository.deleteAll(Arrays.asList(team1, team2));

        // Verify all were deleted
        assertEquals(0, teamRepository.count());
    }

    @Test
    public void testSaveWithOptimisticLock_Success() {
        // Create and save stack
        Stack stack = createTestStack("lock-test", "user1");
        Stack saved = stackRepository.save(stack);
        LocalDateTime expectedUpdatedAt = saved.getUpdatedAt();

        // Update with optimistic lock
        saved.setDescription("Updated with lock");
        Stack updated = stackRepository.saveWithOptimisticLock(saved, expectedUpdatedAt);

        // Verify update succeeded
        assertEquals("Updated with lock", updated.getDescription());
        assertTrue(updated.getUpdatedAt().isAfter(expectedUpdatedAt));

        // Verify by fetching
        Optional<Stack> found = stackRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("Updated with lock", found.get().getDescription());
    }

    @Test
    public void testSaveWithOptimisticLock_ConflictDetection() {
        // Create and save stack
        Stack stack = createTestStack("conflict-test", "user1");
        Stack saved = stackRepository.save(stack);
        LocalDateTime originalUpdatedAt = saved.getUpdatedAt();

        // Simulate concurrent update by modifying the stack
        saved.setDescription("First update");
        stackRepository.save(saved);

        // Try to update with old timestamp (should fail)
        Stack conflictingUpdate = stackRepository.findById(saved.getId()).get();
        conflictingUpdate.setDescription("Conflicting update");

        // This should throw an exception due to optimistic lock failure
        assertThrows(
            DynamoTransactionManager.TransactionFailedException.class,
            () -> stackRepository.saveWithOptimisticLock(conflictingUpdate, originalUpdatedAt)
        );

        // Verify the first update is still in place
        Optional<Stack> found = stackRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("First update", found.get().getDescription());
    }

    @Test
    public void testSaveWithOptimisticLock_NullId() {
        Stack stack = createTestStack("no-id", "user1");
        stack.setId(null);

        assertThrows(
            IllegalArgumentException.class,
            () -> stackRepository.saveWithOptimisticLock(stack, LocalDateTime.now())
        );
    }

    @Test
    public void testBlueprintOptimisticLock_Success() {
        // Create and save blueprint
        Blueprint blueprint = createTestBlueprint("lock-test");
        Blueprint saved = blueprintRepository.save(blueprint);
        LocalDateTime expectedUpdatedAt = saved.getUpdatedAt();

        // Update with optimistic lock
        saved.setDescription("Updated with lock");
        Blueprint updated = blueprintRepository.saveWithOptimisticLock(saved, expectedUpdatedAt);

        // Verify update succeeded
        assertEquals("Updated with lock", updated.getDescription());
    }

    @Test
    public void testTransactionManager_MultipleWrites() {
        // Create transaction writes for multiple entities
        Stack stack = createTestStack("tx-stack", "user1");
        stack.setId(UUID.randomUUID());
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());

        Team team = createTestTeam("tx-team");
        team.setId(UUID.randomUUID());
        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());

        List<DynamoTransactionManager.TransactionWrite> writes = Arrays.asList(
            DynamoTransactionManager.TransactionWrite.put(
                "test_idp_stacks",
                entityMapper.stackToItem(stack),
                "Save stack in transaction"
            ),
            DynamoTransactionManager.TransactionWrite.put(
                "test_idp_teams",
                entityMapper.teamToItem(team),
                "Save team in transaction"
            )
        );

        // Execute transaction
        assertDoesNotThrow(() -> transactionManager.executeTransaction(writes));

        // Verify both entities were saved
        assertTrue(stackRepository.findById(stack.getId()).isPresent());
        assertTrue(teamRepository.findById(team.getId()).isPresent());
    }

    @Test
    public void testTransactionManager_EmptyWriteList() {
        // Should not throw exception
        assertDoesNotThrow(() -> transactionManager.executeTransaction(Collections.emptyList()));
    }

    /**
     * Helper method to create a test stack with required fields.
     */
    private Stack createTestStack(String name, String createdBy) {
        Stack stack = new Stack();
        stack.setName(name);
        stack.setCloudName(name.replace("-", "") + "cloud");
        stack.setRoutePath("/" + name.replace("-", "") + "/");
        stack.setCreatedBy(createdBy);
        stack.setStackType(StackType.INFRASTRUCTURE);
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        return stack;
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

    /**
     * Helper method to create a test team with required fields.
     */
    private Team createTestTeam(String name) {
        Team team = new Team();
        team.setName(name);
        team.setIsActive(true);
        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());
        return team;
    }
}
