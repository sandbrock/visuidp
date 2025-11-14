package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.valueobjects.ProgrammingLanguage;
import com.angryss.idp.domain.valueobjects.StackType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoStackRepository.
 * Tests CRUD operations, GSI queries, and transaction behavior against DynamoDB Local.
 */
public class DynamoStackRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoStackRepository stackRepository;

    @Test
    public void testSaveAndFindById() {
        // Create test stack
        Stack stack = createTestStack("test-stack", "user1");

        // Save stack
        Stack saved = stackRepository.save(stack);

        // Verify ID was generated
        assertNotNull(saved.getId());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());

        // Find by ID
        Optional<Stack> found = stackRepository.findById(saved.getId());

        // Verify
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
        assertEquals("test-stack", found.get().getName());
        assertEquals("user1", found.get().getCreatedBy());
        assertEquals(StackType.INFRASTRUCTURE, found.get().getStackType());
    }

    @Test
    public void testFindById_NotFound() {
        UUID nonExistentId = UUID.randomUUID();
        Optional<Stack> found = stackRepository.findById(nonExistentId);
        assertFalse(found.isPresent());
    }

    @Test
    public void testFindById_NullId() {
        Optional<Stack> found = stackRepository.findById(null);
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        // Create and save stack
        Stack stack = createTestStack("original-name", "user1");
        Stack saved = stackRepository.save(stack);
        LocalDateTime originalUpdatedAt = saved.getUpdatedAt();

        // Update stack
        saved.setName("updated-name");
        saved.setDescription("Updated description");
        Stack updated = stackRepository.save(saved);

        // Verify update
        assertEquals("updated-name", updated.getName());
        assertEquals("Updated description", updated.getDescription());
        assertTrue(updated.getUpdatedAt().isAfter(originalUpdatedAt));

        // Verify by fetching again
        Optional<Stack> fetched = stackRepository.findById(saved.getId());
        assertTrue(fetched.isPresent());
        assertEquals("updated-name", fetched.get().getName());
        assertEquals("Updated description", fetched.get().getDescription());
    }

    @Test
    public void testDelete() {
        // Create and save stack
        Stack stack = createTestStack("to-delete", "user1");
        Stack saved = stackRepository.save(stack);
        UUID id = saved.getId();

        // Verify it exists
        assertTrue(stackRepository.findById(id).isPresent());

        // Delete
        stackRepository.delete(saved);

        // Verify deletion
        assertFalse(stackRepository.findById(id).isPresent());
    }

    @Test
    public void testDelete_NullStack() {
        // Should not throw exception
        assertDoesNotThrow(() -> stackRepository.delete(null));
    }

    @Test
    public void testFindAll() {
        // Create multiple stacks
        Stack stack1 = createTestStack("stack1", "user1");
        Stack stack2 = createTestStack("stack2", "user2");
        Stack stack3 = createTestStack("stack3", "user1");

        stackRepository.save(stack1);
        stackRepository.save(stack2);
        stackRepository.save(stack3);

        // Find all
        List<Stack> all = stackRepository.findAll();

        // Verify
        assertEquals(3, all.size());
        assertTrue(all.stream().anyMatch(s -> s.getName().equals("stack1")));
        assertTrue(all.stream().anyMatch(s -> s.getName().equals("stack2")));
        assertTrue(all.stream().anyMatch(s -> s.getName().equals("stack3")));
    }

    @Test
    public void testFindAll_Empty() {
        List<Stack> all = stackRepository.findAll();
        assertTrue(all.isEmpty());
    }

    @Test
    public void testFindByCreatedBy() {
        // Create stacks with different creators
        Stack stack1 = createTestStack("stack1", "user1");
        Stack stack2 = createTestStack("stack2", "user1");
        Stack stack3 = createTestStack("stack3", "user2");

        stackRepository.save(stack1);
        stackRepository.save(stack2);
        stackRepository.save(stack3);

        // Query by createdBy (uses GSI)
        List<Stack> user1Stacks = stackRepository.findByCreatedBy("user1");

        // Verify
        assertEquals(2, user1Stacks.size());
        assertTrue(user1Stacks.stream().allMatch(s -> s.getCreatedBy().equals("user1")));
        assertTrue(user1Stacks.stream().anyMatch(s -> s.getName().equals("stack1")));
        assertTrue(user1Stacks.stream().anyMatch(s -> s.getName().equals("stack2")));
    }

    @Test
    public void testFindByCreatedBy_NotFound() {
        Stack stack = createTestStack("stack1", "user1");
        stackRepository.save(stack);

        List<Stack> results = stackRepository.findByCreatedBy("nonexistent");
        assertTrue(results.isEmpty());
    }

    @Test
    public void testFindByCreatedBy_Null() {
        List<Stack> results = stackRepository.findByCreatedBy(null);
        assertTrue(results.isEmpty());
    }

    @Test
    public void testFindByStackType() {
        // Create stacks with different types
        Stack infra = createTestStack("infra", "user1");
        infra.setStackType(StackType.INFRASTRUCTURE);

        Stack api = createTestStack("api", "user1");
        api.setStackType(StackType.RESTFUL_SERVERLESS);

        Stack web = createTestStack("web", "user1");
        web.setStackType(StackType.JAVASCRIPT_WEB_APPLICATION);

        stackRepository.save(infra);
        stackRepository.save(api);
        stackRepository.save(web);

        // Query by stack type (uses GSI)
        List<Stack> infraStacks = stackRepository.findByStackType(StackType.INFRASTRUCTURE);

        // Verify
        assertEquals(1, infraStacks.size());
        assertEquals("infra", infraStacks.get(0).getName());
        assertEquals(StackType.INFRASTRUCTURE, infraStacks.get(0).getStackType());
    }

    @Test
    public void testFindByStackType_Null() {
        List<Stack> results = stackRepository.findByStackType(null);
        assertTrue(results.isEmpty());
    }

    @Test
    public void testExistsByNameAndCreatedBy() {
        // Create and save stack
        Stack stack = createTestStack("unique-stack", "user1");
        stackRepository.save(stack);

        // Test existence
        assertTrue(stackRepository.existsByNameAndCreatedBy("unique-stack", "user1"));
        assertFalse(stackRepository.existsByNameAndCreatedBy("unique-stack", "user2"));
        assertFalse(stackRepository.existsByNameAndCreatedBy("other-stack", "user1"));
    }

    @Test
    public void testExistsByNameAndCreatedBy_NullParameters() {
        assertFalse(stackRepository.existsByNameAndCreatedBy(null, "user1"));
        assertFalse(stackRepository.existsByNameAndCreatedBy("stack", null));
        assertFalse(stackRepository.existsByNameAndCreatedBy(null, null));
    }

    @Test
    public void testCount() {
        // Initially empty
        assertEquals(0, stackRepository.count());

        // Add stacks
        stackRepository.save(createTestStack("stack1", "user1"));
        assertEquals(1, stackRepository.count());

        stackRepository.save(createTestStack("stack2", "user1"));
        assertEquals(2, stackRepository.count());

        stackRepository.save(createTestStack("stack3", "user1"));
        assertEquals(3, stackRepository.count());
    }

    @Test
    public void testExists() {
        Stack stack = createTestStack("test-stack", "user1");
        Stack saved = stackRepository.save(stack);

        assertTrue(stackRepository.exists(saved.getId()));
        assertFalse(stackRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testSaveWithConfiguration() {
        // Create stack with configuration map
        Stack stack = createTestStack("config-stack", "user1");
        Map<String, Object> config = new HashMap<>();
        config.put("memory", "2GB");
        config.put("cpu", "2");
        config.put("replicas", 3);
        stack.setConfiguration(config);

        // Save
        Stack saved = stackRepository.save(stack);

        // Retrieve and verify
        Optional<Stack> found = stackRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertNotNull(found.get().getConfiguration());
        assertEquals("2GB", found.get().getConfiguration().get("memory"));
        assertEquals("2", found.get().getConfiguration().get("cpu"));
        assertEquals(3, ((Number) found.get().getConfiguration().get("replicas")).intValue());
    }

    @Test
    public void testSaveWithOptionalFields() {
        // Create stack with all optional fields
        Stack stack = createTestStack("full-stack", "user1");
        stack.setDescription("Full description");
        stack.setProgrammingLanguage(ProgrammingLanguage.QUARKUS);
        stack.setIsPublic(true);
        stack.setEphemeralPrefix("test-prefix");

        // Save
        Stack saved = stackRepository.save(stack);

        // Retrieve and verify
        Optional<Stack> found = stackRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("Full description", found.get().getDescription());
        assertEquals(ProgrammingLanguage.QUARKUS, found.get().getProgrammingLanguage());
        assertTrue(found.get().getIsPublic());
        assertEquals("test-prefix", found.get().getEphemeralPrefix());
    }

    @Test
    public void testFindByEphemeralPrefix() {
        // Create stacks with ephemeral prefixes
        Stack stack1 = createTestStack("stack1", "user1");
        stack1.setEphemeralPrefix("prefix1");

        Stack stack2 = createTestStack("stack2", "user1");
        stack2.setEphemeralPrefix("prefix1");

        Stack stack3 = createTestStack("stack3", "user1");
        stack3.setEphemeralPrefix("prefix2");

        stackRepository.save(stack1);
        stackRepository.save(stack2);
        stackRepository.save(stack3);

        // Query by ephemeral prefix (uses GSI)
        List<Stack> prefix1Stacks = stackRepository.findByEphemeralPrefix("prefix1");

        // Verify
        assertEquals(2, prefix1Stacks.size());
        assertTrue(prefix1Stacks.stream().allMatch(s -> s.getEphemeralPrefix().equals("prefix1")));
    }

    @Test
    public void testFindByEphemeralPrefix_Null() {
        List<Stack> results = stackRepository.findByEphemeralPrefix(null);
        assertTrue(results.isEmpty());
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
}
