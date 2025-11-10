package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.StackCollection;
import com.angryss.idp.domain.repositories.StackCollectionRepository;
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
public class PostgresStackCollectionRepository implements StackCollectionRepository {

    @PersistenceContext
    EntityManager entityManager;

    @Override
    @Transactional
    public StackCollection save(StackCollection stackCollection) {
        if (stackCollection.getId() != null && !entityManager.contains(stackCollection)) {
            // Entity has an ID but is detached - use merge
            return entityManager.merge(stackCollection);
        } else {
            // New entity or already managed - use persist
            stackCollection.persist();
            return stackCollection;
        }
    }

    @Override
    public Optional<StackCollection> findById(UUID id) {
        return Optional.ofNullable(StackCollection.findById(id));
    }

    @Override
    public List<StackCollection> findAll() {
        return StackCollection.listAll();
    }

    @Override
    public Optional<StackCollection> findByName(String name) {
        return StackCollection.find("name", name).firstResultOptional();
    }

    @Override
    public List<StackCollection> findByIsActive(Boolean isActive) {
        return StackCollection.find("isActive", isActive).list();
    }

    @Override
    public boolean exists(UUID id) {
        return StackCollection.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(StackCollection stackCollection) {
        stackCollection.delete();
    }

    @Override
    public long count() {
        return StackCollection.count();
    }
}
