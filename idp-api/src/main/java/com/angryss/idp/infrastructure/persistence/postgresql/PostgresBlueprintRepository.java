package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Blueprint;
import com.angryss.idp.domain.repositories.BlueprintRepository;
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
public class PostgresBlueprintRepository implements BlueprintRepository {

    @PersistenceContext
    EntityManager entityManager;

    @Override
    @Transactional
    public Blueprint save(Blueprint blueprint) {
        if (blueprint.getId() != null && !entityManager.contains(blueprint)) {
            // Entity has an ID but is detached - use merge
            return entityManager.merge(blueprint);
        } else {
            // New entity or already managed - use persist
            blueprint.persist();
            return blueprint;
        }
    }

    @Override
    public Optional<Blueprint> findById(UUID id) {
        return Optional.ofNullable(Blueprint.findById(id));
    }

    @Override
    public List<Blueprint> findAll() {
        return Blueprint.listAll();
    }

    @Override
    public Optional<Blueprint> findByName(String name) {
        return Blueprint.find("name", name).firstResultOptional();
    }

    @Override
    public List<Blueprint> findByIsActive(Boolean isActive) {
        return Blueprint.find("isActive", isActive).list();
    }

    @Override
    public List<Blueprint> findBySupportedCloudProviderId(UUID cloudProviderId) {
        return Blueprint.find("SELECT DISTINCT b FROM Blueprint b JOIN b.supportedCloudProviders cp WHERE cp.id = ?1", cloudProviderId).list();
    }

    @Override
    public boolean exists(UUID id) {
        return Blueprint.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(Blueprint blueprint) {
        blueprint.delete();
    }

    @Override
    public long count() {
        return Blueprint.count();
    }
}
