package com.angryss.idp.domain.entities;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class BlueprintStackRelationshipTest {
    
    @Inject
    EntityManager em;

    @Test
    @Transactional
    void testBlueprintStackOneToManyRelationship() {
        // Create a blueprint
        Blueprint blueprint = new Blueprint();
        blueprint.setName("Single Test Blueprint");
        blueprint.setDescription("Test blueprint for relationship testing");
        blueprint.setIsActive(true);
        blueprint.persist();

        // Create a stack
        Stack stack = new Stack();
        stack.setName("Single Test Stack");
        stack.setDescription("Test stack for relationship testing");
        stack.setCloudName("single-test-stack");
        stack.setRoutePath("/single-test-stack/");
        stack.setStackType(com.angryss.idp.domain.valueobjects.StackType.JAVASCRIPT_WEB_APPLICATION);
        stack.setCreatedBy("test-user");
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        stack.persist();

        // Establish the relationship - set blueprint on stack (child side)
        stack.setBlueprint(blueprint);
        stack.persist();
        
        // Force flush and clear to ensure data is persisted
        em.flush();
        em.clear();

        // Verify the relationship exists
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
        // Create two blueprints
        Blueprint blueprint1 = new Blueprint();
        blueprint1.setName("Multi Blueprint 1");
        blueprint1.setDescription("First blueprint");
        blueprint1.setIsActive(true);
        blueprint1.persist();

        Blueprint blueprint2 = new Blueprint();
        blueprint2.setName("Multi Blueprint 2");
        blueprint2.setDescription("Second blueprint");
        blueprint2.setIsActive(true);
        blueprint2.persist();

        // Create two stacks
        Stack stack1 = new Stack();
        stack1.setName("Multi Stack 1");
        stack1.setDescription("First stack");
        stack1.setCloudName("multi-stack1");
        stack1.setRoutePath("/multi-stack1/");
        stack1.setStackType(com.angryss.idp.domain.valueobjects.StackType.JAVASCRIPT_WEB_APPLICATION);
        stack1.setCreatedBy("test-user");
        stack1.setCreatedAt(LocalDateTime.now());
        stack1.setUpdatedAt(LocalDateTime.now());
        stack1.persist();

        Stack stack2 = new Stack();
        stack2.setName("Multi Stack 2");
        stack2.setDescription("Second stack");
        stack2.setCloudName("multi-stack2");
        stack2.setRoutePath("/multi-stack2/");
        stack2.setStackType(com.angryss.idp.domain.valueobjects.StackType.RESTFUL_API);
        stack2.setCreatedBy("test-user");
        stack2.setCreatedAt(LocalDateTime.now());
        stack2.setUpdatedAt(LocalDateTime.now());
        stack2.persist();

        // Create one-to-many relationships:
        // Blueprint 1 -> Stack 1, Stack 2
        // Each stack can only belong to one blueprint
        stack1.setBlueprint(blueprint1);
        stack1.persist();
        
        stack2.setBlueprint(blueprint1);
        stack2.persist();
        
        // Force flush and clear to ensure data is persisted
        em.flush();
        em.clear();

        // Verify Blueprint 1 has 2 stacks
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
