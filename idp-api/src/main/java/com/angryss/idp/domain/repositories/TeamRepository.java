package com.angryss.idp.domain.repositories;

import com.angryss.idp.domain.entities.Team;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Team entity operations.
 * Extends the base repository with Team-specific query methods.
 */
public interface TeamRepository extends Repository<Team, UUID> {
    
    /**
     * Finds a team by its unique name.
     *
     * @param name The team name
     * @return An Optional containing the team if found
     */
    Optional<Team> findByName(String name);
    
    /**
     * Finds all active teams.
     *
     * @param isActive The active status
     * @return List of teams with the given active status
     */
    List<Team> findByIsActive(Boolean isActive);
}
