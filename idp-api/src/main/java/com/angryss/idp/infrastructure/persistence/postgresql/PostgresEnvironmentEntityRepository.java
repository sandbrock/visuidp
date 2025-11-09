package com.angryss.idp.infrastructure.persistence.postgresql;

import com.angryss.idp.domain.entities.EnvironmentEntity;
import com.angryss.idp.domain.repositories.EnvironmentEntityRepository;
import io.quarkus.arc.properties.IfBuildProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
@IfBuildProperty(name = "idp.database.provider", stringValue = "postgresql", enableIfMissing = true)
public class PostgresEnvironmentEntityRepository implements EnvironmentEntityRepository {

    @Override
    @Transactional
    public EnvironmentEntity save(EnvironmentEntity environmentEntity) {
        environmentEntity.persist();
        return environmentEntity;
    }

    @Override
    public Optional<EnvironmentEntity> findById(UUID id) {
        return Optional.ofNullable(EnvironmentEntity.findById(id));
    }

    @Override
    public List<EnvironmentEntity> findAll() {
        return EnvironmentEntity.listAll();
    }

    @Override
    public Optional<EnvironmentEntity> findByName(String name) {
        return EnvironmentEntity.find("name", name).firstResultOptional();
    }

    @Override
    public List<EnvironmentEntity> findByCloudProviderId(UUID cloudProviderId) {
        return EnvironmentEntity.find("cloudProvider.id", cloudProviderId).list();
    }

    @Override
    public List<EnvironmentEntity> findByIsActive(Boolean isActive) {
        return EnvironmentEntity.find("isActive", isActive).list();
    }

    @Override
    public List<EnvironmentEntity> findByBlueprintId(UUID blueprintId) {
        return EnvironmentEntity.find("SELECT DISTINCT e FROM EnvironmentEntity e JOIN e.blueprints b WHERE b.id = ?1", blueprintId).list();
    }

    @Override
    public List<EnvironmentEntity> findByCloudProviderIdAndIsActive(UUID cloudProviderId, Boolean isActive) {
        return EnvironmentEntity.find("cloudProvider.id = ?1 and isActive = ?2", cloudProviderId, isActive).list();
    }

    @Override
    public boolean exists(UUID id) {
        return EnvironmentEntity.count("id", id) > 0;
    }

    @Override
    @Transactional
    public void delete(EnvironmentEntity environmentEntity) {
        environmentEntity.delete();
    }

    @Override
    public long count() {
        return EnvironmentEntity.count();
    }
}
