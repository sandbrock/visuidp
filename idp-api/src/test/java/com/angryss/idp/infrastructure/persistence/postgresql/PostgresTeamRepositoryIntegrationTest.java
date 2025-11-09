package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.TeamRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for PostgresTeamRepository.
 * Tests CRUD operations, query methods, and transaction behavior using H2 in-memory database.
 */
@QuarkusTest
class PostgresTeamRepositoryIntegrationTest {

    @Inject
    TeamRepository teamRepository;

    private List<UUID> createdTeamIds = new ArrayList<>();

    @AfterEach
    @Transactional
    void cleanup() {
        for (UUID id : createdTeamIds) {
            teamRepository.findById(id).ifPresent(team -> teamRepository.delete(team));
        }
        createdTeamIds.clear();
    }

    @Test
    void testSaveTeam_CreatesNewTeam() {
        // Given
        Team team = createTestTeam("test-team-save");

        // When
        Team savedTeam = teamRepository.save(team);

        // Then
        assertNotNull(savedTeam.getId());
        createdTeamIds.add(savedTeam.getId());
        assertEquals("test-team-save", savedTeam.getName());
        assertNotNull(savedTeam.getCreatedAt());
        assertNotNull(savedTeam.getUpdatedAt());
        assertTrue(savedTeam.getIsActive());
    }

    @Test
    void testSaveTeam_UpdatesExistingTeam() {
        // Given
        Team team = createTestTeam("test-team-update");
        Team savedTeam = teamRepository.save(team);
        createdTeamIds.add(savedTeam.getId());

        // When
        savedTeam.setDescription("Updated description");
        savedTeam.setIsActive(false);
        Team updatedTeam = teamRepository.save(savedTeam);

        // Then
        assertEquals(savedTeam.getId(), updatedTeam.getId());
        assertEquals("Updated description", updatedTeam.getDescription());
        assertFalse(updatedTeam.getIsActive());
    }

    @Test
    void testFindById_ReturnsTeamWhenExists() {
        // Given
        Team team = createTestTeam("test-team-findbyid");
        Team savedTeam = teamRepository.save(team);
        createdTeamIds.add(savedTeam.getId());

        // When
        Optional<Team> foundTeam = teamRepository.findById(savedTeam.getId());

        // Then
        assertTrue(foundTeam.isPresent());
        assertEquals(savedTeam.getId(), foundTeam.get().getId());
        assertEquals("test-team-findbyid", foundTeam.get().getName());
    }

    @Test
    void testFindById_ReturnsEmptyWhenNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        Optional<Team> foundTeam = teamRepository.findById(nonExistentId);

        // Then
        assertFalse(foundTeam.isPresent());
    }

    @Test
    void testFindAll_ReturnsAllTeams() {
        // Given
        Team team1 = createTestTeam("test-team-all-1");
        Team team2 = createTestTeam("test-team-all-2");
        Team savedTeam1 = teamRepository.save(team1);
        Team savedTeam2 = teamRepository.save(team2);
        createdTeamIds.add(savedTeam1.getId());
        createdTeamIds.add(savedTeam2.getId());

        // When
        List<Team> allTeams = teamRepository.findAll();

        // Then
        assertTrue(allTeams.size() >= 2);
        assertTrue(allTeams.stream().anyMatch(t -> t.getId().equals(savedTeam1.getId())));
        assertTrue(allTeams.stream().anyMatch(t -> t.getId().equals(savedTeam2.getId())));
    }

    @Test
    void testFindByName_ReturnsTeamWhenExists() {
        // Given
        String uniqueName = "test-team-unique-" + UUID.randomUUID();
        Team team = createTestTeam(uniqueName);
        Team savedTeam = teamRepository.save(team);
        createdTeamIds.add(savedTeam.getId());

        // When
        Optional<Team> foundTeam = teamRepository.findByName(uniqueName);

        // Then
        assertTrue(foundTeam.isPresent());
        assertEquals(uniqueName, foundTeam.get().getName());
        assertEquals(savedTeam.getId(), foundTeam.get().getId());
    }

    @Test
    void testFindByName_ReturnsEmptyWhenNotExists() {
        // When
        Optional<Team> foundTeam = teamRepository.findByName("non-existent-team");

        // Then
        assertFalse(foundTeam.isPresent());
    }

    @Test
    void testFindByIsActive_ReturnsActiveTeamsOnly() {
        // Given
        Team activeTeam = createTestTeam("test-team-active");
        activeTeam.setIsActive(true);
        Team inactiveTeam = createTestTeam("test-team-inactive");
        inactiveTeam.setIsActive(false);
        
        createdTeamIds.add(teamRepository.save(activeTeam).getId());
        createdTeamIds.add(teamRepository.save(inactiveTeam).getId());

        // When
        List<Team> activeTeams = teamRepository.findByIsActive(true);

        // Then
        assertTrue(activeTeams.stream().anyMatch(t -> t.getName().equals("test-team-active")));
        assertTrue(activeTeams.stream().allMatch(Team::getIsActive));
    }

    @Test
    void testFindByIsActive_ReturnsInactiveTeamsOnly() {
        // Given
        Team activeTeam = createTestTeam("test-team-active-2");
        activeTeam.setIsActive(true);
        Team inactiveTeam = createTestTeam("test-team-inactive-2");
        inactiveTeam.setIsActive(false);
        
        createdTeamIds.add(teamRepository.save(activeTeam).getId());
        createdTeamIds.add(teamRepository.save(inactiveTeam).getId());

        // When
        List<Team> inactiveTeams = teamRepository.findByIsActive(false);

        // Then
        assertTrue(inactiveTeams.stream().anyMatch(t -> t.getName().equals("test-team-inactive-2")));
        assertTrue(inactiveTeams.stream().noneMatch(Team::getIsActive));
    }

    @Test
    void testExists_ReturnsTrueWhenTeamExists() {
        // Given
        Team team = createTestTeam("test-team-exists");
        Team savedTeam = teamRepository.save(team);
        createdTeamIds.add(savedTeam.getId());

        // When
        boolean exists = teamRepository.exists(savedTeam.getId());

        // Then
        assertTrue(exists);
    }

    @Test
    void testExists_ReturnsFalseWhenTeamNotExists() {
        // Given
        UUID nonExistentId = UUID.randomUUID();

        // When
        boolean exists = teamRepository.exists(nonExistentId);

        // Then
        assertFalse(exists);
    }

    @Test
    void testDelete_RemovesTeam() {
        // Given
        Team team = createTestTeam("test-team-delete");
        Team savedTeam = teamRepository.save(team);
        UUID teamId = savedTeam.getId();

        // When
        teamRepository.delete(savedTeam);

        // Then
        assertFalse(teamRepository.exists(teamId));
        assertFalse(teamRepository.findById(teamId).isPresent());
    }

    @Test
    void testCount_ReturnsCorrectCount() {
        // Given
        long initialCount = teamRepository.count();
        Team team1 = createTestTeam("test-team-count-1");
        Team team2 = createTestTeam("test-team-count-2");
        createdTeamIds.add(teamRepository.save(team1).getId());
        createdTeamIds.add(teamRepository.save(team2).getId());

        // When
        long newCount = teamRepository.count();

        // Then
        assertEquals(initialCount + 2, newCount);
    }

    @Test
    void testPreUpdateHook_UpdatesTimestamp() throws InterruptedException {
        // Given
        Team team = createTestTeam("test-team-timestamp");
        Team savedTeam = teamRepository.save(team);
        createdTeamIds.add(savedTeam.getId());
        LocalDateTime originalUpdatedAt = savedTeam.getUpdatedAt();

        // Wait a bit to ensure timestamp difference
        Thread.sleep(10);

        // When
        savedTeam.setDescription("Updated to trigger preUpdate");
        Team updatedTeam = teamRepository.save(savedTeam);

        // Then
        assertTrue(updatedTeam.getUpdatedAt().isAfter(originalUpdatedAt));
    }

    @Test
    void testDefaultValues_SetCorrectly() {
        // Given
        Team team = new Team();
        team.setName("test-team-defaults-" + UUID.randomUUID());

        // When
        Team savedTeam = teamRepository.save(team);
        createdTeamIds.add(savedTeam.getId());

        // Then
        assertNotNull(savedTeam.getCreatedAt());
        assertNotNull(savedTeam.getUpdatedAt());
        assertTrue(savedTeam.getIsActive());
    }

    @Test
    void testUniqueNameConstraint_PreventsNameDuplicates() {
        // Given
        String duplicateName = "test-team-duplicate-" + UUID.randomUUID();
        Team team1 = createTestTeam(duplicateName);
        Team savedTeam1 = teamRepository.save(team1);
        createdTeamIds.add(savedTeam1.getId());

        Team team2 = createTestTeam(duplicateName);

        // When/Then
        assertThrows(Exception.class, () -> {
            teamRepository.save(team2);
        });
    }

    @Test
    void testSaveWithNullDescription_AllowsNullValues() {
        // Given
        Team team = createTestTeam("test-team-null-desc");
        team.setDescription(null);

        // When
        Team savedTeam = teamRepository.save(team);
        createdTeamIds.add(savedTeam.getId());

        // Then
        Team foundTeam = teamRepository.findById(savedTeam.getId()).orElseThrow();
        assertNull(foundTeam.getDescription());
    }

    @Test
    void testMultipleUpdates_MaintainsConsistency() {
        // Given
        Team team = createTestTeam("test-team-multi-update");
        Team savedTeam = teamRepository.save(team);
        createdTeamIds.add(savedTeam.getId());

        // When
        savedTeam.setDescription("First update");
        teamRepository.save(savedTeam);
        
        savedTeam.setDescription("Second update");
        teamRepository.save(savedTeam);
        
        savedTeam.setIsActive(false);
        Team finalTeam = teamRepository.save(savedTeam);

        // Then
        Team foundTeam = teamRepository.findById(finalTeam.getId()).orElseThrow();
        assertEquals("Second update", foundTeam.getDescription());
        assertFalse(foundTeam.getIsActive());
    }

    // Helper methods

    private Team createTestTeam(String name) {
        Team team = new Team();
        team.setName(name);
        team.setDescription("Test team: " + name);
        team.setIsActive(true);
        team.setCreatedAt(LocalDateTime.now());
        team.setUpdatedAt(LocalDateTime.now());
        return team;
    }
}
