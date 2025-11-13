package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * DynamoDB implementation of the repository contract tests.
 * 
 * <p>Runs all contract tests against the DynamoDB repository implementation
 * using DynamoDB Local. This class includes all the same tests as the PostgreSQL
 * implementation to ensure both databases behave identically.</p>
 * 
 * <p>Requirements: 8.4, 8.5</p>
 */
public class DynamoRepositoryContractTest extends DynamoDbTestBase {

    @Inject
    DynamoStackRepository stackRepository;

    @Inject
    DynamoTeamRepository teamRepository;

    @Inject
    DynamoCloudProviderRepository cloudProviderRepository;

    protected StackRepository getRepository() {
        return stackRepository;
    }

    protected Team createAndPersistTeam(String name) {
        Team team = new Team();
        team.setId(UUID.randomUUID());
        team.setName(name);
        team.setDescription("Test team for contract tests");
        team.setIsActive(true);
        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());
        return teamRepository.save(team);
    }

    protected CloudProvider createAndPersistCloudProvider(String name) {
        CloudProvider provider = new CloudProvider();
        provider.id = UUID.randomUUID();
        provider.name = name;
        provider.displayName = name;
        provider.enabled = true;
        provider.createdAt = LocalDateTime.now();
        provider.updatedAt = LocalDateTime.now();
        return cloudProviderRepository.save(provider);
    }

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

    // ========================================================================
    // CRUD Operations Tests
    // ========================================================================

    @Test
    void testSave_CreatesNewStackWithGeneratedId() {
        Stack stack = createTestStack("test-save-new", "user@example.com");
        assertNull(stack.getId());

        Stack saved = getRepository().save(stack);

        assertNotNull(saved.getId());
        assertEquals("test-save-new", saved.getName());
        assertEquals("user@example.com", saved.getCreatedBy());
        assertEquals(StackType.INFRASTRUCTURE, saved.getStackType());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    void testSave_UpdatesExistingStack() {
        Stack stack = createTestStack("test-save-update", "user@example.com");
        Stack saved = getRepository().save(stack);
        UUID originalId = saved.getId();
        LocalDateTime originalUpdatedAt = saved.getUpdatedAt();

        saved.setDescription("Updated description");
        saved.setName("test-save-updated");
        Stack updated = getRepository().save(saved);

        assertEquals(originalId, updated.getId());
        assertEquals("test-save-updated", updated.getName());
        assertEquals("Updated description", updated.getDescription());
        assertTrue(updated.getUpdatedAt().isAfter(originalUpdatedAt) || 
                   updated.getUpdatedAt().equals(originalUpdatedAt));
    }

    @Test
    void testFindById_ReturnsStackWhenExists() {
        Stack stack = createTestStack("test-findbyid-exists", "user@example.com");
        Stack saved = getRepository().save(stack);

        Optional<Stack> found = getRepository().findById(saved.getId());

        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
        assertEquals("test-findbyid-exists", found.get().getName());
        assertEquals("user@example.com", found.get().getCreatedBy());
    }

    @Test
    void testFindById_ReturnsEmptyWhenNotExists() {
        UUID nonExistentId = UUID.randomUUID();
        Optional<Stack> found = getRepository().findById(nonExistentId);
        assertFalse(found.isPresent());
    }

    @Test
    void testFindById_ReturnsEmptyForNullId() {
        Optional<Stack> found = getRepository().findById(null);
        assertFalse(found.isPresent());
    }

    @Test
    void testDelete_RemovesStack() {
        Stack stack = createTestStack("test-delete", "user@example.com");
        Stack saved = getRepository().save(stack);
        UUID stackId = saved.getId();

        assertTrue(getRepository().exists(stackId));

        getRepository().delete(saved);

        assertFalse(getRepository().exists(stackId));
        assertFalse(getRepository().findById(stackId).isPresent());
    }

    @Test
    void testDelete_HandlesNullStack() {
        assertDoesNotThrow(() -> getRepository().delete(null));
    }

    // ========================================================================
    // Query Operations Tests
    // ========================================================================

    @Test
    void testFindAll_ReturnsAllStacks() {
        long initialCount = getRepository().count();
        Stack stack1 = createTestStack("test-findall-1", "user@example.com");
        Stack stack2 = createTestStack("test-findall-2", "user@example.com");
        Stack stack3 = createTestStack("test-findall-3", "user@example.com");
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        List<Stack> all = getRepository().findAll();

        assertEquals(initialCount + 3, all.size());
        assertTrue(all.stream().anyMatch(s -> "test-findall-1".equals(s.getName())));
        assertTrue(all.stream().anyMatch(s -> "test-findall-2".equals(s.getName())));
        assertTrue(all.stream().anyMatch(s -> "test-findall-3".equals(s.getName())));
    }

    @Test
    void testFindByCreatedBy_ReturnsStacksForUser() {
        String user1 = "user1@example.com";
        String user2 = "user2@example.com";
        
        Stack stack1 = createTestStack("test-createdby-u1-1", user1);
        Stack stack2 = createTestStack("test-createdby-u1-2", user1);
        Stack stack3 = createTestStack("test-createdby-u2", user2);
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        List<Stack> user1Stacks = getRepository().findByCreatedBy(user1);

        long user1Count = user1Stacks.stream()
            .filter(s -> s.getName().startsWith("test-createdby-u1"))
            .count();
        assertEquals(2, user1Count);
        assertTrue(user1Stacks.stream().allMatch(s -> user1.equals(s.getCreatedBy())));
    }

    @Test
    void testFindByCreatedBy_ReturnsEmptyForNonExistentUser() {
        List<Stack> stacks = getRepository().findByCreatedBy("nonexistent@example.com");
        assertTrue(stacks.isEmpty());
    }

    @Test
    void testFindByCreatedBy_HandlesNullParameter() {
        List<Stack> stacks = getRepository().findByCreatedBy(null);
        assertTrue(stacks.isEmpty());
    }

    @Test
    void testFindByStackType_ReturnsStacksOfType() {
        Stack infraStack = createTestStack("test-type-infra", "user@example.com");
        infraStack.setStackType(StackType.INFRASTRUCTURE);
        
        Stack apiStack = createTestStack("test-type-api", "user@example.com");
        apiStack.setStackType(StackType.RESTFUL_SERVERLESS);
        
        Stack webStack = createTestStack("test-type-web", "user@example.com");
        webStack.setStackType(StackType.JAVASCRIPT_WEB_APPLICATION);
        
        getRepository().save(infraStack);
        getRepository().save(apiStack);
        getRepository().save(webStack);

        List<Stack> infraStacks = getRepository().findByStackType(StackType.INFRASTRUCTURE);

        assertTrue(infraStacks.stream().anyMatch(s -> "test-type-infra".equals(s.getName())));
        assertTrue(infraStacks.stream().allMatch(s -> StackType.INFRASTRUCTURE == s.getStackType()));
    }

    @Test
    void testFindByStackType_HandlesNullParameter() {
        List<Stack> stacks = getRepository().findByStackType(null);
        assertTrue(stacks.isEmpty());
    }

    @Test
    void testFindByEphemeralPrefix_ReturnsMatchingStacks() {
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

        List<Stack> ephemeralStacks = getRepository().findByEphemeralPrefix(prefix);

        assertEquals(2, ephemeralStacks.size());
        assertTrue(ephemeralStacks.stream().allMatch(s -> prefix.equals(s.getEphemeralPrefix())));
    }

    @Test
    void testFindByEphemeralPrefix_HandlesNullParameter() {
        List<Stack> stacks = getRepository().findByEphemeralPrefix(null);
        assertTrue(stacks.isEmpty());
    }

    @Test
    void testExistsByNameAndCreatedBy_ReturnsTrueWhenExists() {
        String name = "test-exists-" + UUID.randomUUID();
        String user = "user@example.com";
        
        Stack stack = createTestStack(name, user);
        getRepository().save(stack);

        boolean exists = getRepository().existsByNameAndCreatedBy(name, user);

        assertTrue(exists);
    }

    @Test
    void testExistsByNameAndCreatedBy_ReturnsFalseWhenNotExists() {
        boolean exists = getRepository().existsByNameAndCreatedBy(
            "non-existent-stack", "user@example.com");
        assertFalse(exists);
    }

    @Test
    void testExistsByNameAndCreatedBy_ReturnsFalseForDifferentUser() {
        String name = "test-exists-user-" + UUID.randomUUID();
        Stack stack = createTestStack(name, "user1@example.com");
        getRepository().save(stack);

        boolean exists = getRepository().existsByNameAndCreatedBy(name, "user2@example.com");

        assertFalse(exists);
    }

    @Test
    void testExistsByNameAndCreatedBy_HandlesNullParameters() {
        assertFalse(getRepository().existsByNameAndCreatedBy(null, "user@example.com"));
        assertFalse(getRepository().existsByNameAndCreatedBy("stack", null));
        assertFalse(getRepository().existsByNameAndCreatedBy(null, null));
    }

    @Test
    void testExists_ReturnsTrueWhenStackExists() {
        Stack stack = createTestStack("test-exists-id", "user@example.com");
        Stack saved = getRepository().save(stack);

        boolean exists = getRepository().exists(saved.getId());

        assertTrue(exists);
    }

    @Test
    void testExists_ReturnsFalseWhenStackNotExists() {
        UUID nonExistentId = UUID.randomUUID();
        boolean exists = getRepository().exists(nonExistentId);
        assertFalse(exists);
    }

    @Test
    void testCount_ReturnsCorrectCount() {
        long initialCount = getRepository().count();
        
        Stack stack1 = createTestStack("test-count-1", "user@example.com");
        Stack stack2 = createTestStack("test-count-2", "user@example.com");
        Stack stack3 = createTestStack("test-count-3", "user@example.com");
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        long newCount = getRepository().count();

        assertEquals(initialCount + 3, newCount);
    }

    // ========================================================================
    // Complex Field Tests
    // ========================================================================

    @Test
    void testSaveWithConfiguration_PersistsMapField() {
        Stack stack = createTestStack("test-config", "user@example.com");
        Map<String, Object> config = new HashMap<>();
        config.put("memory", "2GB");
        config.put("cpu", "2");
        config.put("replicas", 3);
        config.put("nested", Map.of("key", "value"));
        stack.setConfiguration(config);

        Stack saved = getRepository().save(stack);

        Stack found = getRepository().findById(saved.getId()).orElseThrow();
        assertNotNull(found.getConfiguration());
        assertEquals("2GB", found.getConfiguration().get("memory"));
        assertEquals("2", found.getConfiguration().get("cpu"));
        
        Object replicas = found.getConfiguration().get("replicas");
        assertTrue(replicas instanceof Number);
        assertEquals(3, ((Number) replicas).intValue());
    }

    @Test
    void testSaveWithAllOptionalFields_PersistsCorrectly() {
        Stack stack = createTestStack("test-optional", "user@example.com");
        stack.setDescription("Test description");
        stack.setProgrammingLanguage(ProgrammingLanguage.QUARKUS);
        stack.setIsPublic(true);
        stack.setEphemeralPrefix("test-prefix");

        Stack saved = getRepository().save(stack);

        Stack found = getRepository().findById(saved.getId()).orElseThrow();
        assertEquals("Test description", found.getDescription());
        assertEquals(ProgrammingLanguage.QUARKUS, found.getProgrammingLanguage());
        assertTrue(found.getIsPublic());
        assertEquals("test-prefix", found.getEphemeralPrefix());
    }

    @Test
    void testSaveWithNullOptionalFields_HandlesCorrectly() {
        Stack stack = createTestStack("test-null-optional", "user@example.com");
        stack.setDescription(null);
        stack.setProgrammingLanguage(null);
        stack.setIsPublic(null);
        stack.setEphemeralPrefix(null);
        stack.setConfiguration(null);

        Stack saved = getRepository().save(stack);

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
    void testFindByTeamId_ReturnsStacksForTeam() {
        Team team = createAndPersistTeam("test-team-" + UUID.randomUUID());
        
        Stack stack1 = createTestStack("test-team-stack-1", "user@example.com");
        stack1.setTeam(team);
        
        Stack stack2 = createTestStack("test-team-stack-2", "user@example.com");
        stack2.setTeam(team);
        
        Stack stack3 = createTestStack("test-team-stack-3", "user@example.com");
        
        getRepository().save(stack1);
        getRepository().save(stack2);
        getRepository().save(stack3);

        List<Stack> teamStacks = getRepository().findByTeamId(team.getId());

        assertEquals(2, teamStacks.size());
        assertTrue(teamStacks.stream().allMatch(s -> team.getId().equals(s.getTeam().getId())));
    }

    // Tests for findByCloudProviderId and findByCloudProviderAndCreatedBy removed
    // as cloud provider field has been removed from Stack entity
}
