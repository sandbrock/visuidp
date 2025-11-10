package com.angryss.idp.application.usecases;

import com.angryss.idp.domain.entities.Stack;
import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.StackRepository;
import com.angryss.idp.domain.repositories.TeamRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;

import java.util.List;
import java.util.UUID;

/**
 * Application service for managing teams.
 * Provides CRUD operations for teams and team-related queries.
 */
@ApplicationScoped
public class TeamService {

    @Inject
    TeamRepository teamRepository;

    @Inject
    StackRepository stackRepository;

    /**
     * Retrieves all teams.
     *
     * @return List of all teams
     */
    public List<Team> listAll() {
        return teamRepository.findAll();
    }

    /**
     * Creates a new team.
     *
     * @param team The team to create
     * @return The created team
     * @throws BadRequestException if ID is provided or team name already exists
     */
    @Transactional
    public Team create(Team team) {
        if (team.getId() != null) {
            throw new BadRequestException("ID must not be provided for new teams");
        }
        
        if (teamRepository.findByName(team.getName()).isPresent()) {
            throw new BadRequestException("Team with this name already exists");
        }
        
        return teamRepository.save(team);
    }

    /**
     * Retrieves all stacks associated with a team.
     *
     * @param teamId The team ID
     * @return List of stacks belonging to the team
     */
    public List<Stack> getTeamStacks(UUID teamId) {
        return stackRepository.findByTeamId(teamId);
    }
}
