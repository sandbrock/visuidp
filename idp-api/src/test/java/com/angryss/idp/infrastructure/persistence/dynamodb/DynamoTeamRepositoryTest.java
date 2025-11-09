package com.angryss.idp.infrastructure.persistence.dynamodb;

import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.TeamRepository;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for DynamoTeamRepository.
 * Tests CRUD operations, GSI queries, and transaction behavior against DynamoDB Local.
 */
public class DynamoTeamRepositoryTest extends DynamoDbTestBase {

    @Inject
    DynamoTeamRepository teamRepository;

    @Test
    public void testSaveAndFindById() {
        // Create test team
        Team team = createTestTeam("test-team");

        // Save team
        Team saved = teamRepository.save(team);

        // Verify ID was generated
        assertNotNull(saved.getId());
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());

        // Find by ID
        Optional<Team> found = teamRepository.findById(saved.getId());

        // Verify
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
        assertEquals("test-team", found.get().getName());
        assertTrue(found.get().getIsActive());
    }

    @Test
    public void testFindById_NotFound() {
        UUID nonExistentId = UUID.randomUUID();
        Optional<Team> found = teamRepository.findById(nonExistentId);
        assertFalse(found.isPresent());
    }

    @Test
    public void testFindById_NullId() {
        Optional<Team> found = teamRepository.findById(null);
        assertFalse(found.isPresent());
    }

    @Test
    public void testUpdate() {
        // Create and save team
        Team team = createTestTeam("original-name");
        Team saved = teamRepository.save(team);
        LocalDateTime originalUpdatedAt = saved.getUpdatedAt();

        // Update team
        saved.setName("updated-name");
        saved.setDescription("Updated description");
        saved.setIsActive(false);
        Team updated = teamRepository.save(saved);

        // Verify update
        assertEquals("updated-name", updated.getName());
        assertEquals("Updated description", updated.getDescription());
        assertFalse(updated.getIsActive());
        assertTrue(updated.getUpdatedAt().isAfter(originalUpdatedAt));

        // Verify by fetching again
        Optional<Team> fetched = teamRepository.findById(saved.getId());
        assertTrue(fetched.isPresent());
        assertEquals("updated-name", fetched.get().getName());
        assertEquals("Updated description", fetched.get().getDescription());
        assertFalse(fetched.get().getIsActive());
    }

    @Test
    public void testDelete() {
        // Create and save team
        Team team = createTestTeam("to-delete");
        Team saved = teamRepository.save(team);
        UUID id = saved.getId();

        // Verify it exists
        assertTrue(teamRepository.findById(id).isPresent());

        // Delete
        teamRepository.delete(saved);

        // Verify deletion
        assertFalse(teamRepository.findById(id).isPresent());
    }

    @Test
    public void testDelete_NullTeam() {
        // Should not throw exception
        assertDoesNotThrow(() -> teamRepository.delete(null));
    }

    @Test
    public void testFindAll() {
        // Create multiple teams
        Team team1 = createTestTeam("team1");
        Team team2 = createTestTeam("team2");
        Team team3 = createTestTeam("team3");

        teamRepository.save(team1);
        teamRepository.save(team2);
        teamRepository.save(team3);

        // Find all
        List<Team> all = teamRepository.findAll();

        // Verify
        assertEquals(3, all.size());
        assertTrue(all.stream().anyMatch(t -> t.getName().equals("team1")));
        assertTrue(all.stream().anyMatch(t -> t.getName().equals("team2")));
        assertTrue(all.stream().anyMatch(t -> t.getName().equals("team3")));
    }

    @Test
    public void testFindAll_Empty() {
        List<Team> all = teamRepository.findAll();
        assertTrue(all.isEmpty());
    }

    @Test
    public void testFindByName() {
        // Create and save teams
        Team team1 = createTestTeam("unique-team");
        Team team2 = createTestTeam("another-team");

        teamRepository.save(team1);
        teamRepository.save(team2);

        // Find by name (uses GSI)
        Optional<Team> found = teamRepository.findByName("unique-team");

        // Verify
        assertTrue(found.isPresent());
        assertEquals("unique-team", found.get().getName());
    }

    @Test
    public void testFindByName_NotFound() {
        Team team = createTestTeam("existing-team");
        teamRepository.save(team);

        Optional<Team> found = teamRepository.findByName("nonexistent");
        assertFalse(found.isPresent());
    }

    @Test
    public void testFindByName_Null() {
        Optional<Team> found = teamRepository.findByName(null);
        assertFalse(found.isPresent());
    }

    @Test
    public void testFindByIsActive() {
        // Create teams with different active states
        Team active1 = createTestTeam("active1");
        active1.setIsActive(true);

        Team active2 = createTestTeam("active2");
        active2.setIsActive(true);

        Team inactive = createTestTeam("inactive");
        inactive.setIsActive(false);

        teamRepository.save(active1);
        teamRepository.save(active2);
        teamRepository.save(inactive);

        // Query by isActive (uses GSI)
        List<Team> activeTeams = teamRepository.findByIsActive(true);

        // Verify
        assertEquals(2, activeTeams.size());
        assertTrue(activeTeams.stream().allMatch(Team::getIsActive));
        assertTrue(activeTeams.stream().anyMatch(t -> t.getName().equals("active1")));
        assertTrue(activeTeams.stream().anyMatch(t -> t.getName().equals("active2")));

        // Query inactive
        List<Team> inactiveTeams = teamRepository.findByIsActive(false);
        assertEquals(1, inactiveTeams.size());
        assertEquals("inactive", inactiveTeams.get(0).getName());
    }

    @Test
    public void testFindByIsActive_Null() {
        List<Team> results = teamRepository.findByIsActive(null);
        assertTrue(results.isEmpty());
    }

    @Test
    public void testCount() {
        // Initially empty
        assertEquals(0, teamRepository.count());

        // Add teams
        teamRepository.save(createTestTeam("team1"));
        assertEquals(1, teamRepository.count());

        teamRepository.save(createTestTeam("team2"));
        assertEquals(2, teamRepository.count());

        teamRepository.save(createTestTeam("team3"));
        assertEquals(3, teamRepository.count());
    }

    @Test
    public void testExists() {
        Team team = createTestTeam("test-team");
        Team saved = teamRepository.save(team);

        assertTrue(teamRepository.exists(saved.getId()));
        assertFalse(teamRepository.exists(UUID.randomUUID()));
    }

    @Test
    public void testSaveWithDescription() {
        // Create team with description
        Team team = createTestTeam("described-team");
        team.setDescription("This is a detailed description of the team");

        // Save
        Team saved = teamRepository.save(team);

        // Retrieve and verify
        Optional<Team> found = teamRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("This is a detailed description of the team", found.get().getDescription());
    }

    @Test
    public void testSaveWithNullDescription() {
        // Create team without description
        Team team = createTestTeam("no-description");
        team.setDescription(null);

        // Save
        Team saved = teamRepository.save(team);

        // Retrieve and verify
        Optional<Team> found = teamRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertNull(found.get().getDescription());
    }

    @Test
    public void testMultipleSaveOperations() {
        // Create team
        Team team = createTestTeam("multi-save");
        
        // First save
        Team saved1 = teamRepository.save(team);
        UUID id = saved1.getId();
        LocalDateTime firstUpdatedAt = saved1.getUpdatedAt();

        // Update and save again
        saved1.setDescription("First update");
        Team saved2 = teamRepository.save(saved1);
        assertEquals(id, saved2.getId());
        assertTrue(saved2.getUpdatedAt().isAfter(firstUpdatedAt));

        // Update and save again
        saved2.setDescription("Second update");
        Team saved3 = teamRepository.save(saved2);
        assertEquals(id, saved3.getId());
        assertTrue(saved3.getUpdatedAt().isAfter(saved2.getUpdatedAt()));

        // Verify final state
        Optional<Team> found = teamRepository.findById(id);
        assertTrue(found.isPresent());
        assertEquals("Second update", found.get().getDescription());
    }

    @Test
    public void testFindByIsActive_EmptyResult() {
        // Create only active teams
        Team active = createTestTeam("active");
        active.setIsActive(true);
        teamRepository.save(active);

        // Query for inactive
        List<Team> inactive = teamRepository.findByIsActive(false);
        assertTrue(inactive.isEmpty());
    }

    @Test
    public void testSavePreservesTimestamps() {
        // Create team with specific timestamps
        Team team = createTestTeam("timestamp-test");
        LocalDateTime specificTime = LocalDateTime.of(2024, 1, 1, 12, 0);
        team.setCreatedAt(specificTime);

        // Save
        Team saved = teamRepository.save(team);

        // Verify createdAt is preserved but updatedAt is set to now
        assertEquals(specificTime, saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    public void testSaveGeneratesIdIfNull() {
        // Create team without ID
        Team team = createTestTeam("no-id-team");
        team.setId(null);

        // Save
        Team saved = teamRepository.save(team);

        // Verify ID was generated
        assertNotNull(saved.getId());
    }

    @Test
    public void testSavePreservesIdIfPresent() {
        // Create team with specific ID
        Team team = createTestTeam("with-id-team");
        UUID specificId = UUID.randomUUID();
        team.setId(specificId);

        // Save
        Team saved = teamRepository.save(team);

        // Verify ID was preserved
        assertEquals(specificId, saved.getId());
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
