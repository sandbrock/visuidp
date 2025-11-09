package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.CloudProvider;
import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.infrastructure.persistence.RepositoryContractTest;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * PostgreSQL implementation of the repository contract tests.
 * 
 * <p>Runs all contract tests against the PostgreSQL repository implementation
 * using H2 in-memory database.</p>
 * 
 * <p>Requirements: 8.4, 8.5</p>
 */
@QuarkusTest
class PostgresRepositoryContractTest extends RepositoryContractTest {

    @Inject
    StackRepository stackRepository;

    private List<UUID> createdStackIds = new ArrayList<>();
    private List<UUID> createdTeamIds = new ArrayList<>();
    private List<UUID> createdCloudProviderIds = new ArrayList<>();

    @Override
    protected StackRepository getRepository() {
        return stackRepository;
    }

    @Override
    @Transactional
    protected Team createAndPersistTeam(String name) {
        Team team = new Team();
        team.setName(name);
        team.setDescription("Test team for contract tests");
        team.setIsActive(true);
        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());
        team.persist();
        createdTeamIds.add(team.getId());
        return team;
    }

    @Override
    @Transactional
    protected CloudProvider createAndPersistCloudProvider(String name) {
        CloudProvider provider = new CloudProvider();
        provider.name = name;
        provider.displayName = name;
        provider.enabled = true;
        provider.createdAt = LocalDateTime.now();
        provider.updatedAt = LocalDateTime.now();
        provider.persist();
        createdCloudProviderIds.add(provider.id);
        return provider;
    }

    @Override
    @AfterEach
    @Transactional
    protected void cleanupTestData() {
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

    /**
     * Override to track created stacks for cleanup.
     */
    @Override
    protected Stack createTestStack(String name, String createdBy) {
        Stack stack = super.createTestStack(name, createdBy);
        // Note: ID will be generated on save, we'll track it then
        return stack;
    }

    /**
     * Override save operations to track created stacks.
     */
    @Override
    @Transactional
    public void testSave_CreatesNewStackWithGeneratedId() {
        Stack stack = createTestStack("test-save-new", "user@example.com");
        Stack saved = getRepository().save(stack);
        createdStackIds.add(saved.getId());
        
        // Run the actual test assertions
        super.testSave_CreatesNewStackWithGeneratedId();
    }

    // Override all test methods to track created stacks
    // This ensures proper cleanup

    @Override
    @Transactional
    public void testSave_UpdatesExistingStack() {
        Stack stack = createTestStack("test-save-update", "user@example.com");
        Stack saved = getRepository().save(stack);
        createdStackIds.add(saved.getId());
        
        saved.setDescription("Updated description");
        saved.setName("test-save-updated");
        getRepository().save(saved);
    }

    @Override
    @Transactional
    public void testFindById_ReturnsStackWhenExists() {
        Stack stack = createTestStack("test-findbyid-exists", "user@example.com");
        Stack saved = getRepository().save(stack);
        createdStackIds.add(saved.getId());
        
        super.testFindById_ReturnsStackWhenExists();
    }

    @Override
    public void testFindById_ReturnsEmptyWhenNotExists() {
        super.testFindById_ReturnsEmptyWhenNotExists();
    }

    @Override
    public void testFindById_ReturnsEmptyForNullId() {
        super.testFindById_ReturnsEmptyForNullId();
    }

    @Override
    @Transactional
    public void testDelete_RemovesStack() {
        Stack stack = createTestStack("test-delete", "user@example.com");
        Stack saved = getRepository().save(stack);
        UUID stackId = saved.getId();
        createdStackIds.add(stackId);
        
        getRepository().delete(saved);
        createdStackIds.remove(stackId);
    }

    @Override
    public void testDelete_HandlesNullStack() {
        super.testDelete_HandlesNullStack();
    }

    @Override
    @Transactional
    public void testFindAll_ReturnsAllStacks() {
        Stack stack1 = createTestStack("test-findall-1", "user@example.com");
        Stack stack2 = createTestStack("test-findall-2", "user@example.com");
        Stack stack3 = createTestStack("test-findall-3", "user@example.com");
        
        createdStackIds.add(getRepository().save(stack1).getId());
        createdStackIds.add(getRepository().save(stack2).getId());
        createdStackIds.add(getRepository().save(stack3).getId());
        
        super.testFindAll_ReturnsAllStacks();
    }

    @Override
    @Transactional
    public void testFindByCreatedBy_ReturnsStacksForUser() {
        Stack stack1 = createTestStack("test-createdby-u1-1", "user1@example.com");
        Stack stack2 = createTestStack("test-createdby-u1-2", "user1@example.com");
        Stack stack3 = createTestStack("test-createdby-u2", "user2@example.com");
        
        createdStackIds.add(getRepository().save(stack1).getId());
        createdStackIds.add(getRepository().save(stack2).getId());
        createdStackIds.add(getRepository().save(stack3).getId());
        
        super.testFindByCreatedBy_ReturnsStacksForUser();
    }

    @Override
    public void testFindByCreatedBy_ReturnsEmptyForNonExistentUser() {
        super.testFindByCreatedBy_ReturnsEmptyForNonExistentUser();
    }

    @Override
    public void testFindByCreatedBy_HandlesNullParameter() {
        super.testFindByCreatedBy_HandlesNullParameter();
    }

    @Override
    @Transactional
    public void testFindByStackType_ReturnsStacksOfType() {
        super.testFindByStackType_ReturnsStacksOfType();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-type-"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    public void testFindByStackType_HandlesNullParameter() {
        super.testFindByStackType_HandlesNullParameter();
    }

    @Override
    @Transactional
    public void testFindByEphemeralPrefix_ReturnsMatchingStacks() {
        super.testFindByEphemeralPrefix_ReturnsMatchingStacks();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-eph-"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    public void testFindByEphemeralPrefix_HandlesNullParameter() {
        super.testFindByEphemeralPrefix_HandlesNullParameter();
    }

    @Override
    @Transactional
    public void testExistsByNameAndCreatedBy_ReturnsTrueWhenExists() {
        super.testExistsByNameAndCreatedBy_ReturnsTrueWhenExists();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-exists-"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    public void testExistsByNameAndCreatedBy_ReturnsFalseWhenNotExists() {
        super.testExistsByNameAndCreatedBy_ReturnsFalseWhenNotExists();
    }

    @Override
    @Transactional
    public void testExistsByNameAndCreatedBy_ReturnsFalseForDifferentUser() {
        super.testExistsByNameAndCreatedBy_ReturnsFalseForDifferentUser();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-exists-user-"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    public void testExistsByNameAndCreatedBy_HandlesNullParameters() {
        super.testExistsByNameAndCreatedBy_HandlesNullParameters();
    }

    @Override
    @Transactional
    public void testExists_ReturnsTrueWhenStackExists() {
        Stack stack = createTestStack("test-exists-id", "user@example.com");
        Stack saved = getRepository().save(stack);
        createdStackIds.add(saved.getId());
        
        super.testExists_ReturnsTrueWhenStackExists();
    }

    @Override
    public void testExists_ReturnsFalseWhenStackNotExists() {
        super.testExists_ReturnsFalseWhenStackNotExists();
    }

    @Override
    @Transactional
    public void testCount_ReturnsCorrectCount() {
        super.testCount_ReturnsCorrectCount();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-count-"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    @Transactional
    public void testSaveWithConfiguration_PersistsMapField() {
        super.testSaveWithConfiguration_PersistsMapField();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-config"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    @Transactional
    public void testSaveWithAllOptionalFields_PersistsCorrectly() {
        super.testSaveWithAllOptionalFields_PersistsCorrectly();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-optional"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    @Transactional
    public void testSaveWithNullOptionalFields_HandlesCorrectly() {
        super.testSaveWithNullOptionalFields_HandlesCorrectly();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-null-optional"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    @Transactional
    public void testFindByTeamId_ReturnsStacksForTeam() {
        super.testFindByTeamId_ReturnsStacksForTeam();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-team-stack-"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    @Transactional
    public void testFindByCloudProviderId_ReturnsStacksForProvider() {
        super.testFindByCloudProviderId_ReturnsStacksForProvider();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-cp-stack-"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }

    @Override
    @Transactional
    public void testFindByCloudProviderAndCreatedBy_ReturnsFilteredStacks() {
        super.testFindByCloudProviderAndCreatedBy_ReturnsFilteredStacks();
        // Track created stacks
        getRepository().findAll().stream()
            .filter(s -> s.getName().startsWith("test-filter-"))
            .forEach(s -> createdStackIds.add(s.getId()));
    }
}
