package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Domain;
import com.angryss.idp.domain.repositories.DomainRepository;
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
public class PostgresDomainRepository implements DomainRepository {

    @PersistenceContext
    EntityManager entityManager;

    @Override
    @Transactional
    public Domain save(Domain domain) {
        if (domain.getId() != null && !entityManager.contains(domain)) {
            // Entity has an ID but is detached - use merge
            return entityManager.merge(domain);
        } else {
            // New entity or already managed - use persist
            domain.persist();
            return domain;
        }
    }

    @Override
    public Optional<Domain> findById(UUID id) {
        return Optional.ofNullable(Domain.findById(id));
    }

    @Override
    public List<Domain> findAll() {
        return Domain.listAll();
    }

    @Override
    public Optional<Domain> findByName(String name) {
        return Domain.find("name", name).firstResultOptional();
    }

    @Override
    public List<Domain> findByIsActive(Boolean isActive) {
        return Domain.find("isActive", isActive).list();
    }

    @Override
    public boolean exists(UUID id) {
        return Domain.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(Domain domain) {
        domain.delete();
    }

    @Override
    public long count() {
        return Domain.count();
    }
}
