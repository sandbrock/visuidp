package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Team;
import com.angryss.idp.domain.repositories.TeamRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresTeamRepository implements TeamRepository {

    @PersistenceContext
    EntityManager entityManager;

    @Override
    @Transactional
    public Team save(Team team) {
        if (team.getId() != null && !entityManager.contains(team)) {
            // Entity has an ID but is detached - use merge
            return entityManager.merge(team);
        } else {
            // New entity or already managed - use persist
            team.persist();
            return team;
        }
    }

    @Override
    public Optional<Team> findById(UUID id) {
        return Optional.ofNullable(Team.findById(id));
    }

    @Override
    public List<Team> findAll() {
        return Team.listAll();
    }

    @Override
    public Optional<Team> findByName(String name) {
        return Team.find("name", name).firstResultOptional();
    }

    @Override
    public List<Team> findByIsActive(Boolean isActive) {
        return Team.find("isActive", isActive).list();
    }

    @Override
    public boolean exists(UUID id) {
        return Team.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(Team team) {
        team.delete();
    }

    @Override
    public long count() {
        return Team.count();
    }
}
