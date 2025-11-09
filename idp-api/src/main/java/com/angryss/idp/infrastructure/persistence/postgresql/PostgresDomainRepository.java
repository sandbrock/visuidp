package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.Domain;
import com.angryss.idp.domain.repositories.DomainRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresDomainRepository implements DomainRepository {

    @Override
    @Transactional
    public Domain save(Domain domain) {
        domain.persist();
        return domain;
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
