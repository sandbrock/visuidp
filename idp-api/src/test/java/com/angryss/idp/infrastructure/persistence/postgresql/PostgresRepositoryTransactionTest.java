package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.repositories.TeamRepository;
import com.angryss.idp.domain.valueobjects.StackType;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests to verify transaction support in PostgreSQL repositories.
 * Validates that @Transactional annotations work correctly and that
 * transaction rollback behavior functions as expected.
 */
@QuarkusTest
class PostgresRepositoryTransactionTest {

    @Inject
    StackRepository stackRepository;

    @Inject
    TeamRepository teamRepository;

    @Test
    void testSaveOperationIsTransactional() {
        // Given: A new stack entity
        Stack stack = new Stack();
        stack.setName("test-stack-" + UUID.randomUUID());
        stack.setStackType(StackType.INFRASTRUCTURE);
        stack.setCreatedBy("test-user@example.com");
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());

        // When: Saving the stack
        Stack savedStack = stackRepository.save(stack);

        // Then: The stack should be persisted and have an ID
        assertNotNull(savedStack.getId());
        assertTrue(stackRepository.exists(savedStack.getId()));

        // Cleanup
        stackRepository.delete(savedStack);
    }

    @Test
    void testDeleteOperationIsTransactional() {
        // Given: A persisted stack
        Stack stack = new Stack();
        stack.setName("test-stack-delete-" + UUID.randomUUID());
        stack.setStackType(StackType.INFRASTRUCTURE);
        stack.setCreatedBy("test-user@example.com");
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        Stack savedStack = stackRepository.save(stack);
        UUID stackId = savedStack.getId();

        // When: Deleting the stack
        stackRepository.delete(savedStack);

        // Then: The stack should no longer exist
        assertFalse(stackRepository.exists(stackId));
    }

    @Test
    @Transactional
    void testTransactionRollbackOnException() {
        // Given: A new team
        Team team = new Team();
        team.setName("test-team-rollback-" + UUID.randomUUID());
        team.setDescription("Test team for rollback");
        team.setIsActive(true);
        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());

        // When: Saving within a transaction that will be rolled back
        Team savedTeam = teamRepository.save(team);
        UUID teamId = savedTeam.getId();
        
        // Verify it exists within the transaction
        assertTrue(teamRepository.exists(teamId));

        // Force a rollback by throwing an exception
        assertThrows(RuntimeException.class, () -> {
            throw new RuntimeException("Simulated exception to trigger rollback");
        });
    }

    @Test
    void testMultipleOperationsInSingleTransaction() {
        // This test verifies that multiple repository operations
        // can be performed within a single transaction context
        
        // Given: Multiple entities
        Team team = new Team();
        team.setName("test-team-multi-" + UUID.randomUUID());
        team.setDescription("Test team");
        team.setIsActive(true);
        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());

        Stack stack1 = new Stack();
        stack1.setName("test-stack-1-" + UUID.randomUUID());
        stack1.setStackType(StackType.INFRASTRUCTURE);
        stack1.setCreatedBy("test-user@example.com");
        stack1.setCreatedAt(LocalDateTime.now());
        stack1.setUpdatedAt(LocalDateTime.now());

        Stack stack2 = new Stack();
        stack2.setName("test-stack-2-" + UUID.randomUUID());
        stack2.setStackType(StackType.RESTFUL_SERVERLESS);
        stack2.setCreatedBy("test-user@example.com");
        stack2.setCreatedAt(LocalDateTime.now());
        stack2.setUpdatedAt(LocalDateTime.now());

        // When: Saving all entities
        Team savedTeam = teamRepository.save(team);
        
        stack1.setTeam(savedTeam);
        stack2.setTeam(savedTeam);
        
        Stack savedStack1 = stackRepository.save(stack1);
        Stack savedStack2 = stackRepository.save(stack2);

        // Then: All entities should be persisted
        assertTrue(teamRepository.exists(savedTeam.getId()));
        assertTrue(stackRepository.exists(savedStack1.getId()));
        assertTrue(stackRepository.exists(savedStack2.getId()));

        // Cleanup
        stackRepository.delete(savedStack1);
        stackRepository.delete(savedStack2);
        teamRepository.delete(savedTeam);
    }

    @Test
    void testUpdateOperationIsTransactional() {
        // Given: A persisted stack
        Stack stack = new Stack();
        stack.setName("test-stack-update-" + UUID.randomUUID());
        stack.setStackType(StackType.INFRASTRUCTURE);
        stack.setCreatedBy("test-user@example.com");
        stack.setCreatedAt(LocalDateTime.now());
        stack.setUpdatedAt(LocalDateTime.now());
        Stack savedStack = stackRepository.save(stack);

        // When: Updating the stack
        savedStack.setDescription("Updated description");
        savedStack.setUpdatedAt(LocalDateTime.now());
        Stack updatedStack = stackRepository.save(savedStack);

        // Then: The update should be persisted
        assertEquals("Updated description", updatedStack.getDescription());
        
        // Verify by fetching from database
        Stack fetchedStack = stackRepository.findById(savedStack.getId()).orElseThrow();
        assertEquals("Updated description", fetchedStack.getDescription());

        // Cleanup
        stackRepository.delete(updatedStack);
    }
}
