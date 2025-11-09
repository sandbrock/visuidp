package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.EnvironmentConfig;
import com.angryss.idp.domain.repositories.EnvironmentConfigRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresEnvironmentConfigRepository implements EnvironmentConfigRepository {

    @Override
    @Transactional
    public EnvironmentConfig save(EnvironmentConfig environmentConfig) {
        environmentConfig.persist();
        return environmentConfig;
    }

    @Override
    public Optional<EnvironmentConfig> findById(UUID id) {
        return Optional.ofNullable(EnvironmentConfig.findById(id));
    }

    @Override
    public List<EnvironmentConfig> findAll() {
        return EnvironmentConfig.listAll();
    }

    @Override
    public Optional<EnvironmentConfig> findByEnvironmentId(UUID environmentId) {
        return EnvironmentConfig.find("environment.id", environmentId).firstResultOptional();
    }

    @Override
    public List<EnvironmentConfig> findByIsActive(Boolean isActive) {
        return EnvironmentConfig.find("isActive", isActive).list();
    }

    @Override
    public boolean exists(UUID id) {
        return EnvironmentConfig.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(EnvironmentConfig environmentConfig) {
        environmentConfig.delete();
    }

    @Override
    public long count() {
        return EnvironmentConfig.count();
    }
}
