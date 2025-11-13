package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PostgresStackRepository.
 * Tests CRUD operations, query methods, and transaction behavior using H2 in-memory database.
 */
@QuarkusTest
class PostgresStackRepositoryIntegrationTest {

    @Inject
    StackRepository stackRepository;

    private List<UUID> createdStackIds = new ArrayList<>();
    private List<UUID> createdTeamIds = new ArrayList<>();
    private List<UUID> createdCloudProviderIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        // Clean up in reverse order to respect foreign key constraints
        for (UUID id : createdStackIds) {
            stackRepository.findById(id).ifPresent(stack -> stackRepository.delete(stack));
        }
        for (UUID id : createdTeamIds) {
            Team.findByIdOptional(id).ifPresent(team -> ((Team) team).delete());
        }
        for (UUID id : createdCloudProviderIds) {
            CloudProvider.<CloudProvider>findByIdOptional(id).ifPresent(cp -> cp.delete());
        }
        createdStackIds.clear();
        createdTeamIds.clear();
        createdCloudProviderIds.clear();
    }

    @Test
    void testSaveStack_CreatesNewStack() {
        // Given
        Stack stack = createTestStack("test-stack-save", "testuser@example.com");

        // When
        Stack savedStack = stackRepository.save(stack);

        // Then
        assertNotNull(savedStack.getId());
        createdStackIds.add(savedStack.getId());
        assertEquals("test-stack-save", savedStack.getName());
        assertEquals("testuser@example.com", savedStack.getCreatedBy());
        assertNotNull(savedStack.getCreatedAt());
        assertNotNull(savedStack.getUpdatedAt());
    }

    @Test
    void testSaveStack_UpdatesExistingStack() {
        // Given
        Stack stack = createTestStack("test-stack-update", "testuser@example.com");
        Stack savedStack = stackRepository.save(stack);
        createdStackIds.add(savedStack.getId());

        // When
        savedStack.setDescription("Updated description");
        Stack updatedStack = stackRepository.save(savedStack);

        // Then
        assertEquals(savedStack.getId(), updatedStack.getId());
        assertEquals("Updated description", updatedStack.getDescription());
    }

    @Test
    void testFindById_ReturnsStackWhenExists() {
        // Given
        Stack stack = createTestStack("test-stack-findbyid", "testuser@example.com");
        Stack savedStack = stackRepository.save(stack);
        createdStackIds.add(savedStack.getId());

        // When
        Optional<Stack> foundStack = stackRepository.findById(savedStack.getId());

        // Then
        assertTrue(foundStack.isPresent());
        assertEquals(savedStack.getId(), foundStack.get().getId());
        assertEquals("test-stack-findbyid", foundStack.get().getName());
    }

    @Test
    void testFindById_ReturnsEmptyWhenNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        Optional<Stack> foundStack = stackRepository.findById(nonExistentId);

        // Then
        assertFalse(foundStack.isPresent());
    }

    @Test
    void testFindAll_ReturnsAllStacks() {
        // Given
        Stack stack1 = createTestStack("test-stack-all-1", "testuser@example.com");
        Stack stack2 = createTestStack("test-stack-all-2", "testuser@example.com");
        Stack savedStack1 = stackRepository.save(stack1);
        Stack savedStack2 = stackRepository.save(stack2);
        createdStackIds.add(savedStack1.getId());
        createdStackIds.add(savedStack2.getId());

        // When
        List<Stack> allStacks = stackRepository.findAll();

        // Then
        assertTrue(allStacks.size() >= 2);
        assertTrue(allStacks.stream().anyMatch(s -> s.getId().equals(savedStack1.getId())));
        assertTrue(allStacks.stream().anyMatch(s -> s.getId().equals(savedStack2.getId())));
    }

    @Test
    void testFindByCreatedBy_ReturnsStacksForUser() {
        // Given
        String user1 = "user1@example.com";
        String user2 = "user2@example.com";
        Stack stack1 = createTestStack("test-stack-user1-1", user1);
        Stack stack2 = createTestStack("test-stack-user1-2", user1);
        Stack stack3 = createTestStack("test-stack-user2", user2);
        
        createdStackIds.add(stackRepository.save(stack1).getId());
        createdStackIds.add(stackRepository.save(stack2).getId());
        createdStackIds.add(stackRepository.save(stack3).getId());

        // When
        List<Stack> user1Stacks = stackRepository.findByCreatedBy(user1);

        // Then
        assertEquals(2, user1Stacks.stream().filter(s -> 
            s.getName().startsWith("test-stack-user1")).count());
        assertTrue(user1Stacks.stream().allMatch(s -> s.getCreatedBy().equals(user1)));
    }

    @Test
    void testFindByStackType_ReturnsStacksOfType() {
        // Given
        Stack infraStack = createTestStack("test-stack-infra", "testuser@example.com");
        infraStack.setStackType(StackType.INFRASTRUCTURE);
        Stack apiStack = createTestStack("test-stack-api", "testuser@example.com");
        apiStack.setStackType(StackType.RESTFUL_SERVERLESS);
        
        createdStackIds.add(stackRepository.save(infraStack).getId());
        createdStackIds.add(stackRepository.save(apiStack).getId());

        // When
        List<Stack> infraStacks = stackRepository.findByStackType(StackType.INFRASTRUCTURE);

        // Then
        assertTrue(infraStacks.stream().anyMatch(s -> s.getName().equals("test-stack-infra")));
        assertTrue(infraStacks.stream().allMatch(s -> s.getStackType() == StackType.INFRASTRUCTURE));
    }

    @Test
    @Transactional
    void testFindByTeamId_ReturnsStacksForTeam() {
        // Given
        Team team = createTestTeam("test-team-stacks");
        team.persist();
        createdTeamIds.add(team.getId());

        Stack stack1 = createTestStack("test-stack-team-1", "testuser@example.com");
        stack1.setTeam(team);
        Stack stack2 = createTestStack("test-stack-team-2", "testuser@example.com");
        stack2.setTeam(team);
        
        createdStackIds.add(stackRepository.save(stack1).getId());
        createdStackIds.add(stackRepository.save(stack2).getId());

        // When
        List<Stack> teamStacks = stackRepository.findByTeamId(team.getId());

        // Then
        assertEquals(2, teamStacks.size());
        assertTrue(teamStacks.stream().allMatch(s -> s.getTeam().getId().equals(team.getId())));
    }

    @Test
    @Transactional
    void testFindByCloudProviderId_ReturnsStacksForProvider() {
        // Tests for findByCloudProviderId and findByCloudProviderAndCreatedBy removed
        // as cloud provider field has been removed from Stack entity
    }

    @Test
    void testFindByEphemeralPrefix_ReturnsMatchingStacks() {
        // Given
        String prefix = "ephemeral-test-" + UUID.randomUUID();
        Stack stack1 = createTestStack("test-stack-eph-1", "testuser@example.com");
        stack1.setEphemeralPrefix(prefix);
        Stack stack2 = createTestStack("test-stack-eph-2", "testuser@example.com");
        stack2.setEphemeralPrefix(prefix);
        
        createdStackIds.add(stackRepository.save(stack1).getId());
        createdStackIds.add(stackRepository.save(stack2).getId());

        // When
        List<Stack> ephemeralStacks = stackRepository.findByEphemeralPrefix(prefix);

        // Then
        assertEquals(2, ephemeralStacks.size());
        assertTrue(ephemeralStacks.stream().allMatch(s -> s.getEphemeralPrefix().equals(prefix)));
    }

    @Test
    void testExistsByNameAndCreatedBy_ReturnsTrueWhenExists() {
        // Given
        String name = "test-stack-exists-" + UUID.randomUUID();
        String user = "testuser@example.com";
        Stack stack = createTestStack(name, user);
        createdStackIds.add(stackRepository.save(stack).getId());

        // When
        boolean exists = stackRepository.existsByNameAndCreatedBy(name, user);

        // Then
        assertTrue(exists);
    }

    @Test
    void testExistsByNameAndCreatedBy_ReturnsFalseWhenNotExists() {
        // When
        boolean exists = stackRepository.existsByNameAndCreatedBy(
            "non-existent-stack", "testuser@example.com");

        // Then
        assertFalse(exists);
    }

    @Test
    void testExists_ReturnsTrueWhenStackExists() {
        // Given
        Stack stack = createTestStack("test-stack-exists-id", "testuser@example.com");
        Stack savedStack = stackRepository.save(stack);
        createdStackIds.add(savedStack.getId());

        // When
        boolean exists = stackRepository.exists(savedStack.getId());

        // Then
        assertTrue(exists);
    }

    @Test
    void testExists_ReturnsFalseWhenStackNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        boolean exists = stackRepository.exists(nonExistentId);

        // Then
        assertFalse(exists);
    }

    @Test
    void testDelete_RemovesStack() {
        // Given
        Stack stack = createTestStack("test-stack-delete", "testuser@example.com");
        Stack savedStack = stackRepository.save(stack);
        UUID stackId = savedStack.getId();

        // When
        stackRepository.delete(savedStack);

        // Then
        assertFalse(stackRepository.exists(stackId));
        assertFalse(stackRepository.findById(stackId).isPresent());
    }

    @Test
    void testCount_ReturnsCorrectCount() {
        // Given
        long initialCount = stackRepository.count();
        Stack stack1 = createTestStack("test-stack-count-1", "testuser@example.com");
        Stack stack2 = createTestStack("test-stack-count-2", "testuser@example.com");
        createdStackIds.add(stackRepository.save(stack1).getId());
        createdStackIds.add(stackRepository.save(stack2).getId());

        // When
        long newCount = stackRepository.count();

        // Then
        assertEquals(initialCount + 2, newCount);
    }

    @Test
    void testSaveWithConfiguration_PersistsJsonbField() {
        // Given
        Stack stack = createTestStack("test-stack-config", "testuser@example.com");
        Map<String, Object> config = new HashMap<>();
        config.put("key1", "value1");
        config.put("key2", 123);
        config.put("nested", Map.of("nestedKey", "nestedValue"));
        stack.setConfiguration(config);

        // When
        Stack savedStack = stackRepository.save(stack);
        createdStackIds.add(savedStack.getId());

        // Then
        Stack foundStack = stackRepository.findById(savedStack.getId()).orElseThrow();
        assertNotNull(foundStack.getConfiguration());
        assertEquals("value1", foundStack.getConfiguration().get("key1"));
        assertEquals(123, foundStack.getConfiguration().get("key2"));
    }

    // Helper methods

    private Stack createTestStack(String name, String createdBy) {
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

    private Team createTestTeam(String name) {
        Team team = new Team();
        team.setName(name);
        team.setDescription("Test team");
        team.setIsActive(true);
        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());
        return team;
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
