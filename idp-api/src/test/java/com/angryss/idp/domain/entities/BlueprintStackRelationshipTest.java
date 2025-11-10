package com.angryss.idp.domain.entities;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class BlueprintStackRelationshipTest {

    // Track created entities for cleanup
    private List<UUID> createdStackIds = new ArrayList<>();
    private List<UUID> createdBlueprintIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        // Clean up in correct order (children first to respect foreign key constraints)
        for (UUID id : createdStackIds) {
            Stack.findByIdOptional(id).ifPresent(stack -> stack.delete());
        }
        for (UUID id : createdBlueprintIds) {
            Blueprint.findByIdOptional(id).ifPresent(blueprint -> blueprint.delete());
        }
        
        // Clear all tracking lists
        createdStackIds.clear();
        createdBlueprintIds.clear();
    }

    @Test
    @Transactional
    void testBlueprintStackOneToManyRelationship() {
        // Create a blueprint with unique name
        Blueprint blueprint = new Blueprint();
        blueprint.setName("Single Test Blueprint " + UUID.randomUUID());
        blueprint.setDescription("Test blueprint for relationship testing");
        blueprint.setIsActive(true);
        blueprint.persist();
        blueprint.flush();
        createdBlueprintIds.add(blueprint.getId());

        // Create a stack with unique name
        String uniqueId = UUID.randomUUID().toString().substring(0, 4);
        Stack stack = new Stack();
        stack.setName("Single Test Stack " + UUID.randomUUID());
        stack.setDescription("Test stack for relationship testing");
        stack.setCloudName("single-test-stack-" + UUID.randomUUID());
        stack.setRoutePath("/test-" + uniqueId + "/");
        stack.setStackType(com.angryss.idp.domain.valueobjects.StackType.JAVASCRIPT_WEB_APPLICATION);
        stack.setCreatedBy("test-user");
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        
        // Establish the relationship - set blueprint on stack (child side)
        stack.setBlueprint(blueprint);
        stack.persist();
        stack.flush();
        createdStackIds.add(stack.getId());

        // Clear the persistence context to force a fresh load from database
        Stack.getEntityManager().clear();

        // Verify the relationship exists by loading fresh from database
        Blueprint persistedBlueprint = Blueprint.findById(blueprint.getId());
        assertNotNull(persistedBlueprint);
        assertNotNull(persistedBlueprint.getStacks());
        assertEquals(1, persistedBlueprint.getStacks().size());
        
        Stack associatedStack = persistedBlueprint.getStacks().iterator().next();
        assertEquals(stack.getId(), associatedStack.getId());

        // Verify inverse relationship
        Stack persistedStack = Stack.findById(stack.getId());
        assertNotNull(persistedStack);
        
        // Check the single blueprint reference
        Blueprint associatedBlueprint = persistedStack.getBlueprint();
        assertNotNull(associatedBlueprint);
        assertEquals(blueprint.getId(), associatedBlueprint.getId());
    }

    @Test
    @Transactional
    void testOneToManyBlueprintStackRelationships() {
        // Create two blueprints with unique names
        Blueprint blueprint1 = new Blueprint();
        blueprint1.setName("Multi Blueprint 1 " + UUID.randomUUID());
        blueprint1.setDescription("First blueprint");
        blueprint1.setIsActive(true);
        blueprint1.persist();
        blueprint1.flush();
        createdBlueprintIds.add(blueprint1.getId());

        Blueprint blueprint2 = new Blueprint();
        blueprint2.setName("Multi Blueprint 2 " + UUID.randomUUID());
        blueprint2.setDescription("Second blueprint");
        blueprint2.setIsActive(true);
        blueprint2.persist();
        blueprint2.flush();
        createdBlueprintIds.add(blueprint2.getId());

        // Create two stacks with unique names
        String uniqueId1 = UUID.randomUUID().toString().substring(0, 4);
        Stack stack1 = new Stack();
        stack1.setName("Multi Stack 1 " + UUID.randomUUID());
        stack1.setDescription("First stack");
        stack1.setCloudName("multi-stack1-" + UUID.randomUUID());
        stack1.setRoutePath("/test1-" + uniqueId1 + "/");
        stack1.setStackType(com.angryss.idp.domain.valueobjects.StackType.JAVASCRIPT_WEB_APPLICATION);
        stack1.setCreatedBy("test-user");
        stack1.setCreatedAt(LocalDateTime.now());
        stack1.setUpdatedAt(LocalDateTime.now());
        
        // Create one-to-many relationships:
        // Blueprint 1 -> Stack 1, Stack 2
        // Each stack can only belong to one blueprint
        stack1.setBlueprint(blueprint1);
        stack1.persist();
        stack1.flush();
        createdStackIds.add(stack1.getId());

        String uniqueId2 = UUID.randomUUID().toString().substring(0, 4);
        Stack stack2 = new Stack();
        stack2.setName("Multi Stack 2 " + UUID.randomUUID());
        stack2.setDescription("Second stack");
        stack2.setCloudName("multi-stack2-" + UUID.randomUUID());
        stack2.setRoutePath("/test2-" + uniqueId2 + "/");
        stack2.setStackType(com.angryss.idp.domain.valueobjects.StackType.RESTFUL_API);
        stack2.setCreatedBy("test-user");
        stack2.setCreatedAt(LocalDateTime.now());
        stack2.setUpdatedAt(LocalDateTime.now());
        
        stack2.setBlueprint(blueprint1);
        stack2.persist();
        stack2.flush();
        createdStackIds.add(stack2.getId());

        // Clear the persistence context to force a fresh load from database
        Stack.getEntityManager().clear();

        // Verify Blueprint 1 has 2 stacks by loading fresh from database
        Blueprint persistedBlueprint1 = Blueprint.findById(blueprint1.getId());
        assertEquals(2, persistedBlueprint1.getStacks().size());

        // Verify Blueprint 2 has 0 stacks
        Blueprint persistedBlueprint2 = Blueprint.findById(blueprint2.getId());
        assertEquals(0, persistedBlueprint2.getStacks().size());

        // Verify Stack 1 belongs to Blueprint 1
        Stack persistedStack1 = Stack.findById(stack1.getId());
        assertNotNull(persistedStack1.getBlueprint());
        assertEquals(blueprint1.getId(), persistedStack1.getBlueprint().getId());

        // Verify Stack 2 belongs to Blueprint 1
        Stack persistedStack2 = Stack.findById(stack2.getId());
        assertNotNull(persistedStack2.getBlueprint());
        assertEquals(blueprint1.getId(), persistedStack2.getBlueprint().getId());
    }
}
